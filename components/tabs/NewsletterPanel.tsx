'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Binoculars, CalendarRange, Check, Copy, Mail, Newspaper, type LucideIcon } from 'lucide-react';
import { Chip, ExternalAnchor, Reveal, SectionHeading, SpotCard } from '@/components/ui/primitives';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FIELD, FOCUS, FOCUS_ON_DARK, ICON_TILE, RULE_STYLE, cn } from '@/components/ui/tokens';
import { copySuffix, useCopy } from './copy';

export type Newsletter = {
  name: string;
  /** where it is published, for example "LinkedIn newsletter" */
  platform: string;
  /** the label on the subscribe button */
  cta: string;
  blurb: string;
  topics: string[];
  /** the page where visitors subscribe */
  href: string;
};

export type NewsletterContent = {
  items: Newsletter[];
  /**
   * Optional. An https:// address that accepts a form POST with an `email` field (a Google Apps Script
   * web app, Formspree and similar). While it is empty the e-mail box is not shown at all.
   */
  endpoint?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REQUEST_TIMEOUT_MS = 12000;
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/** The sign-up address, if it is one we are willing to post to: https, or http on this computer. */
function usableEndpoint(endpoint?: string): string | null {
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol === 'https:') return url.toString();
    if (url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname)) return url.toString();
  } catch {
    // not a web address
  }
  return null;
}

/** Some services answer 200 with a JSON body that says the sign-up failed. */
function isRejection(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const body = data as Record<string, unknown>;
  return body.ok === false || body.success === false || Boolean(body.error);
}

type SignupStatus = 'idle' | 'sending' | 'done' | 'error' | 'invalid';

function EmailSignup({ endpoint }: { endpoint: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SignupStatus>('idle');
  const fieldId = useId();
  const messageId = useId();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setStatus('invalid');
      return;
    }
    // People never see the "ys_extra" box. If it has text, a bot filled it in: pretend it worked.
    if (new FormData(event.currentTarget).get('ys_extra')) {
      setStatus('done');
      return;
    }

    setStatus('sending');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: value }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if ((response.headers.get('content-type') ?? '').includes('json')) {
        const data: unknown = await response.json();
        if (isRejection(data)) throw new Error('The service rejected the address');
      }
      setEmail('');
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      clearTimeout(timer);
    }
  };

  return (
    <Reveal delay={0.1} className="mx-auto mt-14 max-w-2xl">
      <div className={cn(CARD, 'p-6 sm:p-8')}>
        <div className="flex items-start gap-4">
          <span className={ICON_TILE}>
            <Mail className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#0B1F3A]">Prefer email?</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">Leave your address to subscribe.</p>
          </div>
        </div>

        <form onSubmit={submit} noValidate className="mt-6">
          <label htmlFor={fieldId} className="block text-sm font-semibold text-[#0B1F3A]">
            Email address
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id={fieldId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status === 'invalid' || status === 'error') setStatus('idle');
              }}
              aria-invalid={status === 'invalid'}
              aria-describedby={messageId}
              placeholder="you@example.com"
              className={cn(FIELD, 'sm:flex-1')}
            />
            {/* a trap for bots: hidden from people, from the keyboard and from screen readers */}
            <input
              name="ys_extra"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            <button type="submit" disabled={status === 'sending'} className={cn(BTN_PRIMARY, 'px-7 py-3', FOCUS)}>
              {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <div id={messageId} className="mt-3 min-h-5 text-sm">
            <p role="status" className="flex items-center gap-2 font-medium text-emerald-800">
              {status === 'done' ? (
                <>
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Thank you. Your subscription request was received.
                </>
              ) : null}
            </p>
            <p role="alert" className="font-medium text-red-700">
              {status === 'invalid' ? 'Please enter a valid email address.' : null}
              {status === 'error' ? 'That did not work. Please try again in a moment.' : null}
            </p>
          </div>
        </form>
      </div>
    </Reveal>
  );
}

function NewsletterCard({
  item,
  copied,
  failed,
  onCopy,
}: {
  item: Newsletter;
  copied: boolean;
  failed: boolean;
  onCopy: () => void;
}) {
  return (
    <SpotCard className="flex h-full flex-col p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <span className={ICON_TILE}>
          <Newspaper className="h-6 w-6" aria-hidden="true" />
        </span>
        <Chip>{item.platform}</Chip>
      </div>
      <h2 className="mt-5 font-serif text-2xl font-semibold text-[#0B1F3A]">{item.name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.blurb}</p>
      <ul aria-label={`Topics in ${item.name}`} className="mt-5 flex flex-1 flex-wrap content-start gap-2">
        {item.topics.map((topic) => (
          <li key={topic}>
            <Chip>{topic}</Chip>
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
        <ExternalAnchor
          href={item.href}
          label={`${item.cta}: ${item.name}`}
          className={cn(BTN_PRIMARY, 'px-6 py-3', FOCUS)}
        >
          {item.cta}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </ExternalAnchor>
        <button type="button" onClick={onCopy} className={cn(BTN_SECONDARY, 'px-4 py-3', FOCUS)}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy link'}
          <span className="sr-only">
            {copySuffix(copied, failed)}
            {item.name}
          </span>
        </button>
      </div>
    </SpotCard>
  );
}

/** Each tile opens one tab of the articles page (components/newsletter/NewsletterTabs.tsx). */
const ARTICLE_TABS: { href: string; icon: LucideIcon; title: string; text: string }[] = [
  { href: '/newsletters#daily', icon: Newspaper, title: 'Daily briefs', text: 'Pre-market and closing numbers for every trading day.' },
  { href: '/newsletters#weekly', icon: CalendarRange, title: 'Weekly updates', text: "Every Friday: the week in review and next week's watchlist." },
  { href: '/newsletters#watch', icon: Binoculars, title: 'Stocks to watch', text: 'News and 52-week highs and lows to check before the next session.' },
];

/** The large "Read the latest articles" block: a navy feature with a drawn chart and three ways in. */
function ArticlesFeature() {
  return (
    <section
      aria-labelledby="latest-articles-heading"
      className="relative isolate mt-12 overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-6 py-10 text-white shadow-[0_40px_80px_-40px_rgba(11,31,58,0.8)] sm:px-10 sm:py-14"
    >
      {/* Decoration only: a glow, a faint grid and a rising price line. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_90%_0%,rgba(20,184,166,0.4),transparent_50%),radial-gradient(circle_at_0%_100%,rgba(52,211,153,0.2),transparent_45%)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]"
      />
      <svg aria-hidden="true" viewBox="0 0 600 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 w-full sm:h-56">
        <defs>
          <linearGradient id="articles-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 170 L60 150 L110 160 L170 120 L230 132 L290 95 L350 105 L410 70 L470 82 L530 40 L600 30 L600 200 L0 200 Z" fill="url(#articles-area)" />
        <path d="M0 170 L60 150 L110 160 L170 120 L230 132 L290 95 L350 105 L410 70 L470 82 L530 40 L600 30" fill="none" stroke="#34D399" strokeWidth="2" strokeOpacity="0.7" />
      </svg>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
            <span className="h-px w-8" style={RULE_STYLE} aria-hidden="true" />
            YGL market briefs
          </p>
          <h3 id="latest-articles-heading" className="mt-4 text-balance font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            Read the latest articles
          </h3>
          <p className="mt-4 text-pretty leading-relaxed text-slate-200">
            Indian markets in numbers, written up after every session: indices, sectors, the biggest Nifty 50 moves and what
            to watch next. Updated every weekday.
          </p>
        </div>
        <Link
          href="/newsletters"
          className={cn(
            'group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B1F3A] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] transition-colors hover:bg-teal-50 lg:self-auto',
            FOCUS_ON_DARK,
          )}
        >
          Open all articles
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
        </Link>
      </div>

      <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-3">
        {ARTICLE_TABS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'group flex h-full flex-col rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-teal-300/50 hover:bg-white/[0.1] motion-reduce:transform-none',
                FOCUS_ON_DARK,
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 text-[#0B1F3A] shadow-[0_10px_24px_-10px_rgba(20,184,166,0.8)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-4 flex items-center gap-1.5 text-lg font-semibold">
                {title}
                <ArrowRight className="h-4 w-4 opacity-60 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
              </span>
              <span className="mt-1.5 text-sm leading-relaxed text-slate-300">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewsletterPanel({ content }: { content: NewsletterContent }) {
  const { state, copy } = useCopy();
  const endpoint = usableEndpoint(content.endpoint);
  const { items } = content;

  return (
    <section aria-labelledby="newsletters-title" className="py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          level={1}
          id="newsletters-title"
          eyebrow="Newsletters"
          title="Stay in the loop"
          blurb="Subscribe to get new editions as soon as they are published."
        />

        <div className={cn('mt-12 grid gap-6', items.length > 1 ? 'sm:grid-cols-2' : 'mx-auto max-w-2xl')}>
          {items.map((item, index) => (
            <Reveal key={item.href} delay={Math.min(index, 3) * 0.1} className="h-full">
              <NewsletterCard
                item={item}
                copied={state?.key === item.href && state.ok}
                failed={state?.key === item.href && !state.ok}
                onCopy={() => void copy(item.href, item.href)}
              />
            </Reveal>
          ))}
        </div>
        <ArticlesFeature />
        {endpoint ? <EmailSignup endpoint={endpoint} /> : null}

        <p role="status" aria-live="polite" className="sr-only">
          {state ? (state.ok ? 'Link copied to the clipboard' : 'Could not copy the link') : ''}
        </p>
      </div>
    </section>
  );
}
