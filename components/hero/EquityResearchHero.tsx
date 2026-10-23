'use client';

/**
 * Hero  ·  components/hero/EquityResearchHero.tsx
 *
 * The top of the Portfolio, written for finance recruiters: the name, what the work is (equity
 * research and financial modeling), two proof cards, then the resume and contact buttons.
 *
 * Words    everything you read in the hero is in the CONTENT block below, except the name and the
 *          one-line headline, which come from SITE in app/page.tsx. The lines are taken from the
 *          resume (public/resume.pdf). If one stops being true, change or delete it here.
 * Needs    the .ys-* classes of PAGE_CSS in app/page.tsx, the 3D scenes in components/three/,
 *          and, for the animation, being rendered inside the page's <MotionConfig>.
 * Slot     children are shown under the cards (app/page.tsx puts the internship logos there).
 */

import Image from 'next/image';
import type { MouseEvent, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  ChartCandlestick,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import { Chip, ExternalAnchor, SpotCard } from '@/components/ui/primitives';
import { EASE, FOCUS, ICON_TILE, cn } from '@/components/ui/tokens';
import { MarketTrend } from '@/components/three/MarketTrend';
import { DataMesh } from '@/components/three/DataMesh';

/* ============================ CONTENT (EDIT ME) ============================ */

/** The parts of the page the hero can scroll to (the ids that goTo in app/page.tsx knows). */
export type HeroSection = 'education' | 'projects';

type Pillar = {
  id: string;
  title: string;
  Icon: LucideIcon;
  points: string[]; // keep each one short: a line or two
  chips: string[]; // tools and sources
  /** `#projects` or `#education` jump to that part of the page; an https address opens in a new tab. */
  action: { label: string; href: `#${HeroSection}` | `https://${string}` };
};

const CONTENT = {
  /** Shown in the page heading, under the name. */
  role: 'Equity research & financial modeling',
  lead: 'I research Indian companies through annual reports and concalls, and build three-statement and DCF models to test what the numbers say.',
  pillars: [
    {
      id: 'research',
      title: 'Equity research',
      Icon: ChartCandlestick,
      points: [
        'YGL Pulse, my newsletter on equity, company and macro research: 1,000+ subscribers',
        'Self-initiated research across banking, pharma and mutual funds',
      ],
      chips: ['Screener.in', 'CMIE Prowess', 'Annual reports'],
      // the same address as the YGL Pulse card in NEWSLETTERS (app/page.tsx)
      action: {
        label: 'Read YGL Pulse',
        href: 'https://www.linkedin.com/newsletters/ygl-pulse-7485210121896206336/',
      },
    },
    {
      id: 'modeling',
      title: 'Financial modeling',
      Icon: FileSpreadsheet,
      points: [
        'Three-statement model of ICICI Bank: P&L, balance sheet and cash flow, with forecasts',
        'DCF valuation models in Excel',
      ],
      chips: ['Excel', 'Python', 'SQL', 'Power BI'],
      action: { label: 'See the projects', href: '#projects' },
    },
  ] satisfies Pillar[],
};

/* ================================= LAYOUT ================================== */

/** The two 3D scenes in the hero. Each fades out towards the text, so it never competes with it.
 *  Chart: a band along the bottom of the hero on small screens (a fixed height, so it stays clear of
 *  the cards above it), in the right-hand gutter from xl (1280px) up.
 *  Mesh: left-hand gutter, wide screens only (the `minWidth` on the component matches `xl`). */
const HERO_CHART =
  'inset-x-0 bottom-0 h-80 [mask-image:linear-gradient(to_bottom,transparent,#000_35%)] xl:inset-y-0 xl:left-[58%] xl:right-0 xl:h-auto xl:[mask-image:linear-gradient(to_right,transparent,#000_30%)] 2xl:left-[54%]';
const HERO_MESH =
  'inset-y-0 left-0 w-[36%] [mask-image:linear-gradient(to_left,transparent,#000_30%)] 2xl:w-[42%]';

/** Exported because the children (the logo pills) animate with the same variants. */
export const HERO_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
export const HERO_ITEM: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const ACTION_LINK = cn(
  'inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] underline-offset-4 hover:underline',
  FOCUS,
);

type EquityResearchHeroProps = {
  /** The page's main heading, e.g. "Yash Sharma". */
  name: string;
  /** A one-line description under the heading; parts separated by " | " are shown with dividers. */
  headline?: string;
  photoSrc?: string;
  photoAlt?: string;
  resumeHref?: string;
  /** The file name the resume is saved under when downloaded. */
  resumeFileName: string;
  onContact: () => void;
  onNavigate: (id: HeroSection) => void;
  children?: ReactNode;
};

function PillarCard({
  pillar,
  onNavigate,
}: {
  pillar: Pillar;
  onNavigate: (id: HeroSection) => void;
}) {
  const { title, Icon, points, chips, action } = pillar;
  const inPage = action.href.startsWith('#');
  return (
    <SpotCard className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3.5">
        <span className={ICON_TILE}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        <h2 className="font-serif text-xl font-semibold tracking-tight text-[#0B1F3A]">{title}</h2>
      </div>

      <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-slate-800">
        {points.map((point) => (
          <li key={point} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#14B8A6]"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <ul aria-label={`${title}: tools and sources`} className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip}>
              <Chip>{chip}</Chip>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          {inPage ? (
            <a
              href={action.href}
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                onNavigate(action.href.slice(1) as HeroSection);
              }}
              className={ACTION_LINK}
            >
              {action.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : (
            <ExternalAnchor href={action.href} label={action.label} className={ACTION_LINK}>
              {action.label}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </ExternalAnchor>
          )}
        </div>
      </div>
    </SpotCard>
  );
}

export function EquityResearchHero({
  name,
  headline,
  photoSrc = '/image.png',
  photoAlt,
  resumeHref = '/resume.pdf',
  resumeFileName,
  onContact,
  onNavigate,
  children,
}: EquityResearchHeroProps) {
  const headlineParts = headline ? headline.split(' | ') : [];
  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className="relative isolate scroll-mt-36 overflow-hidden"
    >
      <MarketTrend className={HERO_CHART} />
      <DataMesh className={HERO_MESH} minWidth={1280} />
      <motion.div
        variants={HERO_CONTAINER}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-24 pt-12 text-center sm:px-6 sm:pt-16 md:pb-32"
      >
        <motion.div variants={HERO_ITEM}>
          <div className="relative mx-auto w-fit">
            <span aria-hidden="true" className="ys-glow" />
            <span aria-hidden="true" className="ys-ring" />
            <Image
              src={photoSrc}
              alt={photoAlt ?? name}
              width={128}
              height={128}
              sizes="128px"
              loading="eager"
              fetchPriority="high"
              className="mx-auto mb-6 h-32 w-32 rounded-full border-4 border-white object-cover object-top shadow-lg"
            />
          </div>
        </motion.div>

        <motion.h1 id="hero-heading" variants={HERO_ITEM} className="flex flex-col items-center">
          <span className="ys-name text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {name}
          </span>
          <span className="sr-only">, </span>
          <span className="mt-4 text-balance text-xl font-semibold tracking-tight text-[#0B1F3A] sm:text-2xl lg:text-3xl">
            {CONTENT.role}
          </span>
        </motion.h1>

        {headlineParts.length > 0 && (
          <motion.p
            variants={HERO_ITEM}
            className="mt-5 flex flex-col items-center gap-1 text-base font-medium text-slate-800 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:text-lg"
          >
            {headlineParts.map((part, i) => (
              <span key={part} className="inline-flex items-center gap-3">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
                    |
                  </span>
                )}
                {part}
              </span>
            ))}
          </motion.p>
        )}

        <motion.p
          variants={HERO_ITEM}
          className="mt-5 max-w-[44rem] text-balance text-base leading-relaxed text-slate-800 sm:text-lg"
        >
          {CONTENT.lead}
        </motion.p>

        <motion.div
          variants={HERO_ITEM}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <motion.a
            href={resumeHref}
            download={resumeFileName}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'ys-sheen group inline-flex items-center gap-2.5 rounded-full bg-[#0B1F3A] px-8 py-4 text-base font-semibold text-white shadow-[0_14px_28px_-12px_rgba(11,31,58,0.65)] transition-colors duration-200 hover:bg-[#14305A]',
              FOCUS,
            )}
          >
            <Download className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-0.5" />
            Download Resume
          </motion.a>
          <motion.button
            type="button"
            onClick={onContact}
            aria-haspopup="dialog"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'group inline-flex items-center gap-2.5 rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-200 hover:border-[#0B1F3A]/40 hover:bg-slate-50',
              FOCUS,
            )}
          >
            <Mail className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6" />
            Get in touch
          </motion.button>
        </motion.div>

        <div className="mt-14 grid w-full gap-4 text-left sm:grid-cols-2">
          {CONTENT.pillars.map((pillar) => (
            <motion.div key={pillar.id} variants={HERO_ITEM} className="h-full">
              <PillarCard pillar={pillar} onNavigate={onNavigate} />
            </motion.div>
          ))}
        </div>

        {children}

        <motion.div variants={HERO_ITEM} className="mt-14">
          <a
            href="#education"
            aria-label="Scroll to Education"
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              onNavigate('education');
            }}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:text-[#0B1F3A]',
              FOCUS,
            )}
          >
            <motion.span
              aria-hidden="true"
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.span>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
