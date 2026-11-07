import { ExternalAnchor } from '@/components/ui/primitives';
import { FOCUS, cn } from '@/components/ui/tokens';
import { WHATSAPP_URL } from '@/lib/site';
import { WhatsAppMark } from './BrandIcons';

/**
 * Floating WhatsApp chat button, bottom-left on every page (mounted in app/layout.tsx).
 * Bottom-right belongs to the home page's "Email me" button and its panel.
 * Renders nothing until NEXT_PUBLIC_WHATSAPP_NUMBER is set.
 * Green #128C4B with a white icon is 4.6:1, above the 3:1 needed for icons.
 */
export function WhatsAppButton() {
  if (!WHATSAPP_URL) return null;
  return (
    <ExternalAnchor
      href={WHATSAPP_URL}
      label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className={cn(
        'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[3] grid h-11 w-11 place-items-center rounded-full bg-[#128C4B] text-white shadow-[0_10px_24px_-10px_rgba(18,140,75,0.75)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#0F7A41] motion-reduce:hover:translate-y-0 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:left-6 sm:h-12 sm:w-12',
        FOCUS,
      )}
    >
      <WhatsAppMark className="h-6 w-6" />
    </ExternalAnchor>
  );
}
