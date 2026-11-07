import Image from 'next/image';
import Link from 'next/link';
import { VIEWS } from '@/components/tabs/view-list';
import { FOCUS, cn } from '@/components/ui/tokens';
import { SITE } from '@/lib/site';
import { HireNavButton } from './HireNavButton';

/**
 * The portfolio's floating top bar, for pages outside the home page (such as /hire). Same pill,
 * photo and tab icons, but each tab is a plain link back to that tab of the home page.
 */
export function SubpageHeader({ hireCurrent = false }: { hireCurrent?: boolean }) {
  return (
    <header className="pointer-events-none sticky top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <nav
        aria-label="Main"
        className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_14px_36px_-14px_rgba(15,23,42,0.28)] backdrop-blur-xl"
      >
        <Link href="/" aria-label={`${SITE.name}, home`} className={cn('shrink-0 rounded-full', FOCUS)}>
          <Image
            src="/image.png"
            alt="YS"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border border-slate-200 object-cover object-top"
          />
        </Link>
        <ul className="flex min-w-0 items-center gap-0.5">
          {VIEWS.map(({ id, label, hash, Icon }) => (
            <li key={id}>
              <Link
                href={hash ? `/#${hash}` : '/'}
                aria-label={label}
                title={label}
                className={cn(
                  'flex items-center rounded-full px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-200/70 hover:text-[#0B1F3A] sm:px-3 sm:text-sm',
                  FOCUS,
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {/* Labels from lg up only: on smaller screens the four icons keep the bar on one line. */}
                <span className="ml-1.5 hidden whitespace-nowrap lg:inline">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <HireNavButton current={hireCurrent} />
      </nav>
    </header>
  );
}
