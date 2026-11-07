/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { ExternalAnchor } from '@/components/ui/primitives';
import { FOCUS, ICON_BUTTON, cn } from '@/components/ui/tokens';
import { CAL_URL, SITE } from '@/lib/site';
import { GithubMark, LinkedinMark, YoutubeMark, type IconType } from './BrandIcons';

/** The footer of every page that has one (the portfolio and /hire). Moved here from app/page.tsx. */

const YEAR = new Date().getFullYear();

const SOCIALS: ReadonlyArray<{ label: string; href: string; Icon: IconType; newTab: boolean }> = [
  { label: 'GitHub', href: SITE.github, Icon: GithubMark, newTab: true },
  { label: 'LinkedIn', href: SITE.linkedin, Icon: LinkedinMark, newTab: true },
  { label: 'Email', href: `mailto:${SITE.email}`, Icon: Mail, newTab: false },
  { label: 'YouTube', href: SITE.youtube, Icon: YoutubeMark, newTab: true },
];

const FOOTER_LINK =
  'rounded-sm text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#0B1F3A] hover:decoration-[#0B1F3A]';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-900/[0.07] bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pb-28 pt-14 text-center sm:px-6 sm:pb-24">
        <p className="font-serif text-xl font-semibold text-[#0B1F3A]">{SITE.name}</p>

        <nav aria-label="Work with me">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <li>
              <Link href="/hire" className={cn(FOOTER_LINK, FOCUS)}>
                Hire me
              </Link>
            </li>
            <li>
              <Link href="/hire#services" className={cn(FOOTER_LINK, FOCUS)}>
                Services
              </Link>
            </li>
            <li>
              <Link href="/hire#brief" className={cn(FOOTER_LINK, FOCUS)}>
                Send a project brief
              </Link>
            </li>
            {CAL_URL ? (
              <li>
                <ExternalAnchor href={CAL_URL} label="Book a free 30-min call" className={cn(FOOTER_LINK, FOCUS)}>
                  Book a call
                </ExternalAnchor>
              </li>
            ) : null}
          </ul>
        </nav>

        <ul className="flex items-center gap-3">
          {SOCIALS.map(({ label, href, Icon, newTab }) => (
            <li key={label}>
              {newTab ? (
                <ExternalAnchor href={href} label={label} title={label} className={cn(ICON_BUTTON, FOCUS)}>
                  <Icon className="h-[18px] w-[18px]" />
                </ExternalAnchor>
              ) : (
                <a href={href} aria-label={label} title={label} className={cn(ICON_BUTTON, FOCUS)}>
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center">
          <img
            src="https://visitor-badge.laobi.icu/badge?page_id=yashify.tech"
            alt="Visitor Count"
            className="rounded shadow-sm mt-2"
          />
        </div>

        <p className="text-sm text-slate-600">
          © <span suppressHydrationWarning>{YEAR}</span> {SITE.name}
        </p>
      </div>
    </footer>
  );
}
