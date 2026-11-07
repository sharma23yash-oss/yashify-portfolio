import { ArrowUpRight, Check, Clock, MessagesSquare, PackageCheck, Quote, Ruler, Hammer } from 'lucide-react';
import { ExternalAnchor, Reveal, SectionHeading } from '@/components/ui/primitives';
import { CARD, EYEBROW, FOCUS, ICON_TILE, cn } from '@/components/ui/tokens';
import { formatStartingPrice, type Service } from '@/lib/services';
import type { CaseStudy } from '@/lib/case-studies';
import type { Testimonial } from '@/lib/testimonials';
import { RequestPackageButton } from './ClientBits';

/* The sections of /hire. Server components; the few interactive bits are in ClientBits.tsx. */

const SECTION = 'scroll-mt-28 py-16 sm:py-20';
const WRAP = 'mx-auto max-w-6xl px-4 sm:px-6';

/* ------------------------------- Services ------------------------------- */

function ServiceCard({ service }: { service: Service }) {
  return (
    <article className={cn(CARD, 'flex h-full flex-col p-6 sm:p-7')}>
      <h3 className="font-serif text-xl font-semibold leading-snug text-[#0B1F3A]">{service.title}</h3>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-700">{service.summary}</p>

      <p className={cn(EYEBROW, 'mt-6 text-[11px]')}>Who it’s for</p>
      <p className="mt-1.5 text-pretty text-sm leading-relaxed text-slate-700">{service.forWho}</p>

      <p className={cn(EYEBROW, 'mt-6 text-[11px]')}>What you get</p>
      <ul className="mt-2 space-y-2">
        {service.deliverables.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <dl className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-slate-200 pt-5">
          <div>
            <dt className="sr-only">Typical timeline</dt>
            <dd className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Clock aria-hidden="true" className="h-4 w-4 text-slate-500" />
              {service.timeline}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Price</dt>
            <dd className="text-base font-semibold text-[#0B1F3A]">{formatStartingPrice(service)}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <RequestPackageButton packageId={service.id} title={service.title} />
        </div>
      </div>
    </article>
  );
}

export function ServicesSection({ services }: { services: readonly Service[] }) {
  return (
    <section id="services" aria-labelledby="services-heading" className={SECTION}>
      <div className={WRAP}>
        <SectionHeading
          id="services-heading"
          eyebrow="Services"
          title="Three ways I can help"
          blurb="Fixed scope, fixed quote, and a clear timeline before any work starts."
        />
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.map((service, i) => (
            <li key={service.id}>
              <Reveal delay={i * 0.08} className="h-full">
                <ServiceCard service={service} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------- Process -------------------------------- */

const STEPS = [
  {
    Icon: MessagesSquare,
    title: 'Brief',
    text: 'Tell me what you need, through the form below or a free 30-minute call.',
  },
  {
    Icon: Ruler,
    title: 'Scope and quote',
    text: 'Within 1–2 working days you get a written scope, a fixed price and a timeline.',
  },
  {
    Icon: Hammer,
    title: 'Build with updates',
    text: 'I build in short cycles and share progress, so you can steer before anything is final.',
  },
  {
    Icon: PackageCheck,
    title: 'Delivery and support',
    text: 'You get the files, a walkthrough and a support window for fixes after handover.',
  },
];

export function ProcessSection() {
  return (
    <section id="process" aria-labelledby="process-heading" className={cn(SECTION, 'border-t border-slate-900/[0.07]')}>
      <div className={WRAP}>
        <SectionHeading id="process-heading" eyebrow="Process" title="How a project runs" />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 0.08} className={cn(CARD, 'h-full p-6')}>
                <div className="flex items-center gap-3">
                  <span className={ICON_TILE}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-teal-800">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#0B1F3A]">{title}</h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-700">{text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- Proof --------------------------------- */

function CaseStudyCard({ study }: { study: CaseStudy }) {
  const rows: Array<[string, string]> = [
    ['Problem', study.problem],
    ['What I built', study.built],
    ['Result', study.result],
  ];
  return (
    <article className={cn(CARD, 'flex h-full flex-col p-6 sm:p-7', study.draft && 'border-dashed border-amber-400')}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn(EYEBROW, 'text-[11px]')}>{study.category}</p>
        {study.draft ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            Draft (hidden on the live site)
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 font-serif text-xl font-semibold text-[#0B1F3A]">{study.title}</h3>
      {study.metric ? (
        <p className="mt-4">
          <span className="block font-serif text-4xl font-semibold text-teal-800">{study.metric.value}</span>
          <span className="mt-1 block text-sm text-slate-700">{study.metric.label}</span>
        </p>
      ) : null}
      <dl className="mt-5 space-y-4">
        {rows.map(([label, text]) => (
          <div key={label}>
            <dt className="text-sm font-semibold text-slate-800">{label}</dt>
            <dd className="mt-1 text-pretty text-sm leading-relaxed text-slate-700">{text}</dd>
          </div>
        ))}
      </dl>
      {study.href ? (
        <ExternalAnchor
          href={study.href}
          label={`See ${study.title}`}
          className={cn('mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-teal-800 hover:underline', FOCUS)}
        >
          See the work
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </ExternalAnchor>
      ) : null}
    </article>
  );
}

export function ProofSection({ studies }: { studies: CaseStudy[] }) {
  if (studies.length === 0) return null;
  return (
    <section id="proof" aria-labelledby="proof-heading" className={cn(SECTION, 'border-t border-slate-900/[0.07]')}>
      <div className={WRAP}>
        <SectionHeading id="proof-heading" eyebrow="Proof" title="Recent work" />
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {studies.map((study, i) => (
            <li key={study.id}>
              <Reveal delay={(i % 2) * 0.08} className="h-full">
                <CaseStudyCard study={study} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------ Testimonials ------------------------------ */

/** Renders nothing until lib/testimonials.ts has at least one quote. */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-heading" className={cn(SECTION, 'border-t border-slate-900/[0.07]')}>
      <div className={WRAP}>
        <SectionHeading id="testimonials-heading" eyebrow="Testimonials" title="What clients say" />
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={`${t.name}-${t.role}`}>
              <figure className={cn(CARD, 'flex h-full flex-col p-6')}>
                <Quote aria-hidden="true" className="h-6 w-6 text-teal-700" />
                <blockquote className="mt-3 flex-1 text-pretty leading-relaxed text-slate-800">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-sm">
                  {t.href ? (
                    <ExternalAnchor href={t.href} label={t.name} className={cn('font-semibold text-[#0B1F3A] hover:underline', FOCUS)}>
                      {t.name}
                    </ExternalAnchor>
                  ) : (
                    <span className="font-semibold text-[#0B1F3A]">{t.name}</span>
                  )}
                  <span className="block text-slate-600">{t.role}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
