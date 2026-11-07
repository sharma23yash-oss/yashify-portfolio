/**
 * The address people should land on when they open a shared link or a search result.
 * The share tags, the canonical tag, the sitemap and robots.txt all read it from here,
 * so change this one line if the site moves.
 */
export const SITE_URL = 'https://yashify.tech';

/** Who the site is about. Shared by the portfolio, the /hire page and the footer. */
export const SITE = {
  name: 'Yash Sharma',
  headline: 'MBA Finance & Marketing | Data Analytics | Startup Builder',
  github: 'https://github.com/sharma23yash-oss',
  linkedin: 'https://www.linkedin.com/in/yaashify', // LinkedIn profile
  email: 'sharma23yash@gmail.com', // used by the Gmail button and the mailto links
  youtube: 'https://youtube.com/@YASHifyfinance',
  resumeDownloadName: 'Yash-Sharma-Resume.pdf',
};

/* ---- Hire Me: booking and WhatsApp ------------------------------------------------------------
 * Both come from env vars so they can change without a code edit. Without the variable, the
 * button that needs it simply doesn't render. */

/** Your Cal.com booking page, e.g. https://cal.com/yash/30min. Opens in a new tab. */
export const CAL_URL = safeHttpsUrl(process.env.NEXT_PUBLIC_CAL_URL);

/** WhatsApp number in international format, digits only (e.g. 919876543210). */
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

const WHATSAPP_MESSAGE = 'Hi Yash, I found you on yashify.tech and would like to talk about a project.';

/** A wa.me link that opens a chat with a message already typed, or null when no number is set. */
export const WHATSAPP_URL =
  WHATSAPP_NUMBER.length >= 8
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;

function safeHttpsUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
