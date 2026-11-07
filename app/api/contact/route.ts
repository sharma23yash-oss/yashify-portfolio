import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { HONEYPOT_FIELD, briefSchema, type Brief, type ContactResponse } from '@/lib/contact-schema';
import { rateLimit } from '@/lib/rate-limit';
import { serviceTitle } from '@/lib/services';
import { SITE } from '@/lib/site';

/**
 * POST /api/contact  ·  the project-brief form on /hire.
 *
 * Order of checks: same-site origin → rate limit (5 per IP per 10 min) → size → validation (zod)
 * → honeypot → Cloudflare Turnstile → send. Then two emails via Resend: the brief to you
 * (Reply-To is the sender), and a short confirmation to the sender.
 *
 * Nothing is stored. The brief exists only in the email, and logs never include its contents.
 *
 * Env: RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL (a sender on a domain verified in
 * Resend, e.g. "Yash Sharma <hello@yashify.tech>"), TURNSTILE_SECRET_KEY.
 */

const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type FieldErrors = NonNullable<Extract<ContactResponse, { ok: false }>['fieldErrors']>;

function reply(body: ContactResponse, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Blocks posts made from other websites. Browsers always send Origin on a cross-site POST. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients: still rate-limited and Turnstile-checked
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip !== 'unknown') form.set('remoteip', ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

function ownerEmail(brief: Brief) {
  const pkg = serviceTitle(brief.package);
  const rows: Array<[string, string]> = [
    ['Name', brief.name],
    ['Email', brief.email],
    ['Package', pkg],
    ['Budget', brief.budget],
    ['Timeline', brief.timeline],
  ];
  const text =
    `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMessage:\n${brief.message}\n\n` +
    `Reply to this email to answer ${brief.name} directly.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0F172A;max-width:600px">
  <h2 style="color:#0B1F3A;margin:0 0 16px">New project brief</h2>
  <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
    ${rows.map(([k, v]) => `<tr><td style="color:#475569;padding-right:16px"><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  <h3 style="color:#0B1F3A;margin:24px 0 8px">Message</h3>
  <p style="white-space:pre-wrap;font-size:14px;line-height:1.6;margin:0">${escapeHtml(brief.message)}</p>
  <p style="color:#64748B;font-size:12px;margin-top:24px">Sent from the /hire form on yashify.tech. Reply to this email to answer ${escapeHtml(brief.name)} directly.</p>
</div>`;
  return { subject: `New brief: ${pkg} from ${brief.name}`, text, html };
}

/**
 * The confirmation to the sender. It deliberately repeats none of their free text (name or
 * message), only the options they picked, so the form can't be used to send a stranger an email
 * carrying someone else's words.
 */
function autoReply(brief: Brief) {
  const firstName = SITE.name.split(' ')[0];
  const rows: Array<[string, string]> = [
    ['Package', serviceTitle(brief.package)],
    ['Budget', brief.budget],
    ['Timeline', brief.timeline],
  ];
  const text =
    `Hi,\n\nThanks for your project brief. It reached me and I'll reply within 1–2 working days.\n\n` +
    `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n` +
    `If anything is urgent, just reply to this email.\n\n${firstName}\n${SITE.name} · yashify.tech`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0F172A;max-width:600px;font-size:15px;line-height:1.6">
  <p>Hi,</p>
  <p>Thanks for your project brief. It reached me and I'll reply within <strong>1–2 working days</strong>.</p>
  <table cellpadding="4" style="border-collapse:collapse;font-size:14px;margin:8px 0 16px">
    ${rows.map(([k, v]) => `<tr><td style="color:#475569;padding-right:16px">${k}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  <p>If anything is urgent, just reply to this email.</p>
  <p>${firstName}<br><span style="color:#64748B">${SITE.name} · <a href="https://yashify.tech" style="color:#0F766E">yashify.tech</a></span></p>
</div>`;
  return { subject: 'Got your project brief', text, html };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ ok: false, error: 'Forbidden.' }, 403);

  const ip = clientIp(request);
  const limited = rateLimit(`contact:${ip}`, RATE_LIMIT);
  if (!limited.ok) {
    return reply(
      {
        ok: false,
        error: 'Too many messages from your network. Please try again in a few minutes, or email me directly.',
      },
      429,
      { 'Retry-After': String(limited.retryAfterSeconds) },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ ok: false, error: 'That message is too long.' }, 413);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return reply({ ok: false, error: 'The form could not be read. Please try again.' }, 400);
  }

  const parsed = briefSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof FieldErrors;
      fieldErrors[field] ??= issue.message;
    }
    return reply({ ok: false, error: 'Please fix the highlighted fields.', fieldErrors }, 400);
  }
  const brief = parsed.data;

  // Honeypot filled in: almost certainly a bot. Say "sent" so it learns nothing, and send nothing.
  if (brief[HONEYPOT_FIELD]) return reply({ ok: true });

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, TURNSTILE_SECRET_KEY } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL || !TURNSTILE_SECRET_KEY) {
    console.error(
      'Contact form is not configured: set RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL and TURNSTILE_SECRET_KEY.',
    );
    return reply({ ok: false, error: `The form isn't available right now. Please email ${SITE.email} instead.` }, 503);
  }

  if (!(await verifyTurnstile(brief.turnstileToken, TURNSTILE_SECRET_KEY, ip))) {
    return reply(
      {
        ok: false,
        error: 'The “I’m human” check failed or expired. Please try it again.',
        fieldErrors: { turnstileToken: 'Please complete the check again.' },
      },
      400,
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  const toOwner = ownerEmail(brief);
  const sent = await resend.emails.send({
    from: CONTACT_FROM_EMAIL,
    to: CONTACT_TO_EMAIL,
    replyTo: brief.email,
    subject: toOwner.subject,
    text: toOwner.text,
    html: toOwner.html,
  });
  if (sent.error) {
    console.error(`Contact form: Resend rejected the brief email (${sent.error.name}).`);
    return reply(
      { ok: false, error: `Sorry, your brief could not be sent. Please try again, or email ${SITE.email}.` },
      502,
    );
  }

  // The brief reached you; a failed confirmation shouldn't turn that into an error for the sender.
  const toSender = autoReply(brief);
  const confirmed = await resend.emails.send({
    from: CONTACT_FROM_EMAIL,
    to: brief.email,
    replyTo: CONTACT_TO_EMAIL,
    subject: toSender.subject,
    text: toSender.text,
    html: toSender.html,
  });
  if (confirmed.error) console.error(`Contact form: the confirmation email failed (${confirmed.error.name}).`);

  return reply({ ok: true });
}
