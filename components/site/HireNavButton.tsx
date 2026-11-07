import Link from 'next/link';
import { Handshake } from 'lucide-react';
import { FOCUS, cn } from '@/components/ui/tokens';

/**
 * The highlighted "Hire me" button at the end of the top bar (portfolio and /hire).
 * Teal-700 with white text is 5.4:1, so it stands apart from the navy active tab and still passes AA.
 */
export function HireNavButton({ current = false }: { current?: boolean }) {
  return (
    <Link
      href="/hire"
      aria-current={current ? 'page' : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-700 px-3 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(15,118,110,0.8)] transition-colors duration-200 hover:bg-teal-800 sm:px-4 sm:text-sm',
        current && 'ring-2 ring-teal-700/30 ring-offset-1',
        FOCUS,
      )}
    >
      <Handshake aria-hidden="true" className="h-4 w-4" />
      Hire me
    </Link>
  );
}
