import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CalendarDays, FileText, Mail } from 'lucide-react';
import { SubpageHeader } from '@/components/site/SubpageHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { WhatsAppMark } from '@/components/site/BrandIcons';
import { ExternalAnchor, SectionHeading } from '@/components/ui/primitives';
import { BTN_SECONDARY, CARD, EYEBROW, FOCUS, cn } from '@/components/ui/tokens';
import { BriefForm } from '@/components/hire/BriefForm';
import { MotionRoot } from '@/components/hire/ClientBits';
import { FaqAccordion } from '@/components/hire/FaqAccordion';
import { ProcessSection, ProofSection, ServicesSection, Testimonials } from '@/components/hire/Sections';
import { BRIEF_SECTION_ID } from '@/components/hire/package-event';
import { CASE_STUDIES } from '@/lib/case-studies';
import { HIRE_FAQ } from '@/lib/hire-faq';
import { SERVICES } from '@/lib/services';
import { CAL_URL, SITE, WHATSAPP_URL } from '@/lib/site';
import { TESTIMONIALS } from '@/lib/testimonials';

/**
 * /hire  ·  the "Hire Me" page. Content lives in lib/: services.ts (packages and prices),
 * case-studies.ts (proof), testimonials.ts and hire-faq.ts. The brief form posts to /api/contact.
 */

const TITLE = 'Hire Yash Sharma | DCF Models, Excel Analytics, Websites & AI Workflows';
const DESCRIPTION =
  'AI-powered financial analyst and builder: DCF and three-statement models, Excel analytics, fast website builds and AI workflow automation. Book a free 30-min call.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/hire' },
  openGraph: { type: 'website', url: '/hire', siteName: 'Yash Sharma · Portfolio', locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
};

// Draft case studies show locally and on Vercel previews, never on the live site.
const SHOW_DRAFTS = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production';
const STUDIES = CASE_STUDIES.filter((s) => SHOW_DRAFTS || !s.draft);

const HERO_PRIMARY =
  'inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0B1F3A] px-7 py-4 text-base font-semibold text-white shadow-[0_14px_28px_-12px_rgba(11,31,58,0.65)] transition-colors duration-200 hover:bg-[#14305A]';
const HERO_SECONDARY =
  'inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-200 hover:border-[#0B1F3A]/40 hover:bg-slate-50';

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
          {/* Hero */}
          <section aria-labelledby="hire-heading" className="px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20">
            <div className="mx-auto max-w-3xl">
              <p className={EYEBROW}>Work with me</p>
              <h1
                id="hire-heading"
                className="mt-4 text-balance font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-[#0B1F3A] sm:text-5xl"
              >
                AI-powered financial analyst and builder: DCF models, Excel analytics, websites and AI workflows
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-700">
                I’m {SITE.name}, an MBA (Finance & Marketing) student at MANIT Bhopal. I build models from annual
                reports, ship websites fast with AI, and automate the busywork, with a fixed quote up front.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <BookCallLink className={HERO_PRIMARY}>
                  <CalendarDays aria-hidden="true" className="h-5 w-5" />
                  Book a free 30-min call
                </BookCallLink>
                <a href={`#${BRIEF_SECTION_ID}`} className={cn(HERO_SECONDARY, FOCUS)}>
                  <FileText aria-hidden="true" className="h-5 w-5" />
                  Send a project brief
                </a>
              </div>
            </div>
          </section>

          <ServicesSection services={SERVICES} />
          <ProcessSection />
          <ProofSection studies={STUDIES} />
          <Testimonials items={TESTIMONIALS} />

          {/* FAQ */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-28 border-t border-slate-900/[0.07] py-16 sm:py-20"
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <SectionHeading id="faq-heading" eyebrow="FAQ" title="Questions clients ask" />
              <div className="mt-10">
                <FaqAccordion items={HIRE_FAQ} />
              </div>
            </div>
          </section>

          {/* Brief */}
          <section
            id={BRIEF_SECTION_ID}
            aria-labelledby="brief-heading"
            className="scroll-mt-28 border-t border-slate-900/[0.07] py-16 sm:py-20"
          >
            <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <p className={EYEBROW}>Project brief</p>
                <h2
                  id="brief-heading"
                  className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl"
                >
                  Tell me about your project
                </h2>
                <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-slate-700">
                  A few lines are enough. I’ll reply within 1–2 working days with questions or a quote.
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
