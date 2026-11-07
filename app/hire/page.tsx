import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CalendarDays, Mail } from 'lucide-react';
import { SubpageHeader } from '@/components/site/SubpageHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { WhatsAppMark } from '@/components/site/BrandIcons';
import { ExternalAnchor } from '@/components/ui/primitives';
import { BTN_SECONDARY, CARD, EYEBROW, FOCUS, cn } from '@/components/ui/tokens';
import { BriefForm } from '@/components/hire/BriefForm';
import { MotionRoot } from '@/components/hire/ClientBits';
import { BRIEF_SECTION_ID } from '@/components/hire/package-event';
import { CAL_URL, SITE, WHATSAPP_URL } from '@/lib/site';

/** /hire: a short page with the project brief form (posts to /api/contact) and other ways to get in touch. */

const TITLE = 'Hire Yash Sharma | DCF Models, Excel Analytics, Websites & AI Workflows';
const DESCRIPTION =
  'Send a project brief or book a free 30-min call: DCF and three-statement models, Excel analytics, website builds and AI workflow automation.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/hire' },
  openGraph: { type: 'website', url: '/hire', siteName: 'Yash Sharma · Portfolio', locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
};

/** Cal.com in a new tab; without NEXT_PUBLIC_CAL_URL it falls back to an email asking for a call. */
function BookCallLink({ className, children }: { className: string; children: ReactNode }) {
  if (CAL_URL) {
    return (
      <ExternalAnchor href={CAL_URL} label="Book a free 30-min call" className={cn(className, FOCUS)}>
        {children}
      </ExternalAnchor>
    );
  }
  return (
    <a href={`mailto:${SITE.email}?subject=${encodeURIComponent('Free 30-min call')}`} className={cn(className, FOCUS)}>
      {children}
    </a>
  );
}

export default function HirePage() {
  return (
    <MotionRoot>
      <div className="relative isolate min-h-screen w-full flex-1 bg-[#FAFAFA] text-slate-700">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(20,184,166,0.16),transparent_70%)]"
        />
        <SubpageHeader hireCurrent />

        <main>
          <section
            id={BRIEF_SECTION_ID}
            aria-labelledby="hire-heading"
            className="scroll-mt-28 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20"
          >
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <p className={EYEBROW}>Work with me</p>
                <h1
                  id="hire-heading"
                  className="mt-3 text-balance font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl"
                >
                  Tell me about your project
                </h1>
                <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-slate-700">
                  DCF models, Excel analytics, websites and AI workflows. A few lines are enough. I’ll reply within
                  1–2 working days with questions or a quote.
                </p>
                <div className="mt-8">
                  <BriefForm />
                </div>
              </div>

              <aside aria-labelledby="talk-heading" className={cn(CARD, 'h-fit p-6 lg:sticky lg:top-28')}>
                <h2 id="talk-heading" className="font-serif text-xl font-semibold text-[#0B1F3A]">
                  Prefer to talk?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">Pick whatever is easiest for you.</p>
                <ul className="mt-5 space-y-3">
                  <li>
                    <BookCallLink className={cn(BTN_SECONDARY, 'w-full')}>
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                      Book a free 30-min call
                    </BookCallLink>
                  </li>
                  {WHATSAPP_URL ? (
                    <li>
                      <ExternalAnchor
                        href={WHATSAPP_URL}
                        label="Chat on WhatsApp"
                        className={cn(BTN_SECONDARY, 'w-full', FOCUS)}
                      >
                        <WhatsAppMark className="h-4 w-4 text-[#128C4B]" />
                        Chat on WhatsApp
                      </ExternalAnchor>
                    </li>
                  ) : null}
                  <li>
                    <a href={`mailto:${SITE.email}`} className={cn(BTN_SECONDARY, 'w-full', FOCUS)}>
                      <Mail aria-hidden="true" className="h-4 w-4" />
                      Email me
                    </a>
                  </li>
                </ul>
              </aside>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </MotionRoot>
  );
}
