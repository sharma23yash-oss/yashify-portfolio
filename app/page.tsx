'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Welcome screen  ·  app/page.tsx  ·  Next.js App Router
 *
 * Five tabs     Portfolio · Google Drive · YouTube · Newsletters · Yashify AI
 *               A tab is a URL fragment (/#drive  /#youtube  /#newsletters  /#ai); the plain page is the
 *               Portfolio. components/tabs/ holds the tab bar and its small router (TabBar.tsx, view.ts)
 *               and one panel per tab. Everything the Portfolio shows is still in this file.
 *
 * Setup     npm i framer-motion lucide-react
 * Hero      components/hero/EquityResearchHero.tsx  (the words of the hero are in its CONTENT block;
 *           the name and the one-line headline still come from SITE below)
 * 3D        components/three/  (candlestick chart on the right of the hero, data mesh on the left)
 *           npm i --save-exact three@0.182.0 @react-three/fiber@9.8.2 @react-three/drei@10.7.9
 *           npm i -D --save-exact @types/three@0.182.0
 * Files     public/image.png (your photo)  ·  public/resume.pdf (your resume)
 *           public/logos/rbi.png · aiggpa.png · indian-railways.png (official logos;
 *           .svg / .webp / .jpg also work. Until a file exists a neutral icon shows.)
 * Content   edit the CONTENT block below: SITE, EDUCATION, INTERNSHIPS, PROJECTS ... for the Portfolio,
 *           and DRIVE, YOUTUBE and NEWSLETTERS for the other tabs. Every array and constant in this
 *           file lives at module scope, above the components, so nothing is declared inside JSX.
 * E-mail    optional: set NEXT_PUBLIC_NEWSLETTER_ENDPOINT in .env.local to turn on the sign-up box
 *           of the Newsletters tab (see components/tabs/NewsletterPanel.tsx).
 *
 * Light theme only: there are no `dark:` classes anywhere, and the page pins
 * `color-scheme: light` so an OS-level dark mode cannot leak in.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChangeEvent,
  ComponentType,
  CSSProperties,
  FocusEvent,
  MouseEvent,
  PointerEvent,
  RefObject,
} from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
} from 'framer-motion';
import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  Flag,
  GraduationCap,
  Landmark,
  Mail,
  Medal,
  Rocket,
  Send,
  ShieldCheck,
  Train,
  TrendingUp,
  Trophy,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Chip, ExternalAnchor, Reveal, SectionHeading, SpotCard } from '@/components/ui/primitives';
import {
  EASE,
  FOCUS,
  ICON_BUTTON,
  ICON_TILE,
  RULE_GRADIENT,
  RULE_STYLE,
  SPRING,
  cn,
} from '@/components/ui/tokens';
import { EquityResearchHero, HERO_ITEM } from '@/components/hero/EquityResearchHero';
import { TabBar, TabPanel } from '@/components/tabs/TabBar';
import { goToView, useView, useViewEffects, type ViewId } from '@/components/tabs/view';
import { DrivePanel, type DriveContent } from '@/components/tabs/DrivePanel';
import { YouTubePanel, type YouTubeContent } from '@/components/tabs/YouTubePanel';
import { NewsletterPanel, type NewsletterContent } from '@/components/tabs/NewsletterPanel';
import { AiPanel } from '@/components/tabs/AiPanel';

/* ============================ CONTENT (EDIT ME) ============================ */

const SITE = {
  name: 'Yash Sharma',
  headline: 'MBA Finance & Marketing | Data Analytics | Startup Builder',
  github: 'https://github.com/sharma23yash-oss',
  linkedin: 'https://www.linkedin.com/in/yaashify', // LinkedIn profile
  email: 'sharma23yash@gmail.com', // used by the Gmail button and the mailto links
  youtube: 'https://youtube.com/@YASHifyfinance',
  resumeDownloadName: 'Yash-Sharma-Resume.pdf',
};

/* ---- Google Drive tab ------------------------------------------------------------------------
 * Only files that are meant to be public belong here. In Drive: right-click the file, Share, General
 * access, "Anyone with the link", Copy link. `kind` is one of: pdf, doc, sheet, slides, video, folder, other. */
const DRIVE: DriveContent = {
  folderUrl: '', // optional: a shared Drive folder, adds an "Open the Drive folder" button
  files: [
    // {
    //   title: 'Name of the file',
    //   description: 'One line about it.',
    //   kind: 'pdf',
    //   href: 'https://drive.google.com/file/d/FILE_ID/view?usp=sharing',
    // },
  ],
};

/* ---- YouTube tab -----------------------------------------------------------------------------
 * The welcome line is the large Brush Script MT heading of the tab. Videos are optional: either set
 * channelId (it starts with UC; YouTube Studio > Settings > Channel > Advanced settings) for a
 * "Latest uploads" player that updates by itself, or list videos by hand. */
const YOUTUBE: YouTubeContent = {
  channelUrl: SITE.youtube,
  welcome: 'Welcome to world of learning and innovations',
  channelId: '',
  videos: [
    // { url: 'https://www.youtube.com/watch?v=VIDEO_ID', title: 'Title of the video' },
  ],
};

/* ---- Newsletters tab -------------------------------------------------------------------------
 * Each item is a card with a subscribe button. The e-mail box under the cards only appears when
 * NEXT_PUBLIC_NEWSLETTER_ENDPOINT is set (an https address that accepts a form POST with an `email` field). */
const NEWSLETTERS: NewsletterContent = {
  items: [
    {
      name: 'YGL Pulse',
      platform: 'LinkedIn newsletter',
      cta: 'Subscribe on LinkedIn',
      blurb: 'Equity, company and macroeconomic research, with a focus on Indian markets.',
      topics: [
        'Indian stock markets',
        'Ratio and financial analysis',
        'Learning the stock market',
        'AI in Indian finance',
      ],
      href: 'https://www.linkedin.com/newsletters/ygl-pulse-7485210121896206336/',
    },
  ],
  endpoint: process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT || undefined,
};

type EducationItem = {
  degree: string;
  field: string;
  school: string;
  year: string;
  current?: boolean;
};

const EDUCATION: EducationItem[] = [
  {
    degree: 'MBA',
    field: 'Finance & Marketing',
    school: 'MANIT Bhopal',
    year: 'Expected 2027',
    current: true,
  },
  {
    degree: 'B.Tech',
    field: 'Mechanical Engineering',
    school: 'UIT RGPV',
    year: '2022',
  },
  {
    degree: 'PGDCA',
    field: 'Post Graduate Diploma in Computer Applications',
    school: 'MCU Bhopal',
    year: '2024',
  },
];

type InternshipItem = {
  org: string;
  shortName: string; // compact label shown next to the logo
  slug: string; // logo file name: save the logo as public/logos/<slug>.png (or .svg / .webp / .jpg)
  role: string;
  focus: string;
  period: string;
  summary: string;
  Icon: LucideIcon;
};

const INTERNSHIPS: InternshipItem[] = [
  {
    org: 'Reserve Bank of India (RBI)',
    shortName: 'RBI',
    slug: 'rbi',
    role: 'Summer Intern',
    focus: 'FEMA Research',
    period: 'May – Jul 2026',
    summary:
      'Regulatory research on the Foreign Exchange Management Act (FEMA), including a study of Authorized Persons, at the Regional Office in Bhopal.',
    Icon: Landmark,
  },
  {
    org: 'AIGGPA',
    shortName: 'AIGGPA',
    slug: 'aiggpa',
    role: 'Research Intern',
    focus: 'Peri-urban regions study',
    period: 'Jun – Aug 2026',
    summary:
      'Policy and data-analytics research for a study of peri-urban regions, carried out at AIGGPA in Bhopal.',
    Icon: Building2,
  },
  {
    org: 'Indian Railways',
    shortName: 'Indian Railways',
    slug: 'indian-railways',
    role: 'Mechanical Engineering Internship',
    focus: 'Mechanical Engineering',
    period: '1 month',
    summary: 'A one-month mechanical engineering internship with Indian Railways.',
    Icon: Train,
  },
];

type ProjectItem = {
  title: string;
  tagline: string;
  summary: string;
  tags: string[];
  Icon: LucideIcon;
  href?: string; // optional: makes the title a link
  linkLabel?: string;
};

const PROJECTS: ProjectItem[] = [
  {
    title: 'YASH Growth Labs',
    tagline: 'AI & financial research startup',
    summary:
      'An AI and financial research startup, and the umbrella brand for my ventures, research and content.',
    tags: ['AI', 'Financial Research', 'Startup'],
    Icon: Rocket,
  },
  {
    title: 'useYARI',
    tagline: 'Campus fintech ecosystem',
    summary:
      'A campus fintech platform with a virtual stock market simulator for Indian markets, incubated at MANIT.',
    tags: ['Fintech', 'Virtual Stock Market', 'Campus'],
    Icon: Wallet,
    href: 'https://useyari.me',
    linkLabel: 'Visit useYARI',
  },
  {
    title: 'SPY UPI / Aegis Pay',
    tagline: 'AI-driven payment system',
    summary: 'An AI-driven payment system built around UPI, developed as an open-source fintech project.',
    tags: ['UPI', 'Payments', 'AI'],
    Icon: ShieldCheck,
    href: 'https://github.com/sharma23yash-oss/spy-upi',
    linkLabel: 'View the SPY UPI repository',
  },
  {
    title: 'Excel DCF Modeling & Data Analytics',
    tagline: 'Power BI, SQL, Python',
    summary:
      'Discounted cash flow models in Excel and analytics workflows that turn raw financial data into decisions.',
    tags: ['Excel', 'DCF', 'Power BI', 'SQL', 'Python'],
    Icon: TrendingUp,
  },
];

type AchievementItem = {
  title: string;
  badge: string;
  summary: string;
  Icon: LucideIcon;
};

const ACHIEVEMENTS: AchievementItem[] = [
  {
    title: 'Unstop Hackathons',
    badge: 'Multiple hackathons',
    summary: 'Competed in hackathons on Unstop, building and pitching solutions against tight deadlines.',
    Icon: Trophy,
  },
  {
    title: 'Empresario, IIT Kharagpur',
    badge: 'Semi-finalist',
    summary: 'Semi-finalist at Empresario, hosted by IIT Kharagpur.',
    Icon: Medal,
  },
  {
    title: 'SSB Conference Stages',
    badge: 'Conference stage',
    summary:
      'Reached the Conference stage of the Services Selection Board (SSB) interview process on multiple occasions.',
    Icon: Flag,
  },
];

/* --------------------------- LOGOS + GMAIL CONTACT --------------------------- */

/** Official logos are not bundled: save each file in public/logos, named after its slug above. */
const LOGO_DIR = '/logos';
const LOGO_FORMATS = ['png', 'svg', 'webp', 'jpg'] as const; // tried in this order

type ContactTopic = { id: string; label: string; subject: string };

const CONTACT_TOPICS: ContactTopic[] = [
  { id: 'opportunity', label: 'Opportunity', subject: 'An opportunity for you' },
  { id: 'collaboration', label: 'Collaboration', subject: 'Collaboration idea' },
  { id: 'question', label: 'Question', subject: 'A question for you' },
  { id: 'hello', label: 'Say hello', subject: 'Hello from your portfolio' },
];

const CONTACT_GREETING = `Hi ${SITE.name.split(' ')[0]},\n\n`;
const CONTACT_PANEL_ID = 'contact-panel';
const CONTACT_TITLE_ID = 'contact-panel-title';
const CONTACT_MAX_LENGTH = 1000; // keeps the compose link well under browser URL limits

function composeBody(message: string) {
  return `${CONTACT_GREETING}${message.trim()}`.trimEnd() + '\n\n';
}

/** Opens a Gmail compose window addressed to SITE.email, subject and body pre-filled. */
function gmailUrl(subject: string, message: string) {
  return (
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(SITE.email)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(composeBody(message))}`
  );
}

/** Same message for visitors who use another mail app. */
function mailtoUrl(subject: string, message: string) {
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeBody(message))}`;
}

/* ============================== DESIGN TOKENS =============================== */

const YEAR = new Date().getFullYear();
const SPY_OFFSET = 168; // the two-row floating bar plus breathing room (matches scroll-mt-36)

const TIMELINE_GRADIENT = 'linear-gradient(180deg, #0B1F3A, #14B8A6 60%, #34D399)';

/** Organisation logo tile: a navy icon tile underneath, the official logo fades in on top once it loads. */
const MARK_BASE =
  'relative grid shrink-0 place-items-center overflow-hidden border bg-[#0B1F3A] text-white shadow-[0_10px_20px_-12px_rgba(11,31,58,0.55)] transition-colors duration-500';
const MARK_SIZES = {
  sm: 'h-9 w-9 rounded-full',
  md: 'h-12 w-12 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl sm:h-16 sm:w-16',
} as const;
const MARK_ICONS = {
  sm: 'h-[18px] w-[18px]',
  md: 'h-6 w-6',
  lg: 'h-7 w-7 sm:h-8 sm:w-8',
} as const;

/* ============================ MOTION + FX STYLES ============================ */
/* Small CSS effects that are easier to express as CSS than as utility classes.
 * Ideas adapted (rewritten, not copied) from MIT-licensed libraries:
 *   Magic UI (github.com/magicuidesign/magicui): shimmer button sheen, magic-card
 *     spotlight, border beam, animated gradient text, blur-fade reveal
 *   Motion Primitives (github.com/ibelick/motion-primitives): the popover morph spring
 * Everything switches off under prefers-reduced-motion. */

const PAGE_CSS = `
@property --ys-angle{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes ys-spin{to{transform:rotate(360deg)}}
@keyframes ys-angle{to{--ys-angle:360deg}}
@keyframes ys-breathe{0%,100%{opacity:.7;transform:scale(.96)}50%{opacity:1;transform:scale(1.06)}}
@keyframes ys-sheen{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
@keyframes ys-text{0%,55%{background-position:100% 0}100%{background-position:0 0}}
@keyframes ys-ping{0%{box-shadow:0 0 0 0 rgba(13,148,136,.45)}70%,100%{box-shadow:0 0 0 16px rgba(13,148,136,0)}}
@keyframes ys-ping-sm{0%{box-shadow:0 0 0 0 rgba(13,148,136,.4)}70%,100%{box-shadow:0 0 0 9px rgba(13,148,136,0)}}

.ys-ring{position:absolute;inset:-9px;border-radius:9999px;pointer-events:none;
  background:conic-gradient(#0B1F3A,#14B8A6,#34D399,#3054A8,#0B1F3A);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px));
  will-change:transform;animation:ys-spin 9s linear infinite}
.ys-glow{position:absolute;inset:-26px;border-radius:9999px;pointer-events:none;
  background:radial-gradient(closest-side,rgba(45,212,191,.4),rgba(52,211,153,.16) 60%,transparent);
  will-change:transform,opacity;animation:ys-breathe 6s ease-in-out infinite}

.ys-name{color:#0B1F3A}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
  .ys-name{background-image:linear-gradient(100deg,#0B1F3A 0%,#0B1F3A 40%,#0B4842 50%,#0B1F3A 60%,#0B1F3A 100%);
    background-size:260% 100%;background-position:100% 0;-webkit-background-clip:text;background-clip:text;
    -webkit-text-fill-color:transparent;color:transparent;animation:ys-text 7s linear infinite}
}

.ys-sheen{position:relative;overflow:hidden;isolation:isolate}
.ys-sheen::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.3) 50%,transparent 62%);
  transform:translateX(-130%);will-change:transform;animation:ys-sheen 4.8s ease-in-out infinite}

.ys-spot{position:relative;isolation:isolate}
.ys-spot::before,.ys-spot::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  opacity:0;transition:opacity .35s ease}
.ys-spot::before{z-index:-1;
  background:radial-gradient(340px circle at var(--mx,50%) var(--my,50%),rgba(45,212,191,.13),transparent 70%)}
.ys-spot::after{padding:1px;
  background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%),rgba(13,148,136,.55),transparent 70%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude}
@media (hover:hover){.ys-spot:hover::before,.ys-spot:hover::after{opacity:1}}

.ys-beam{position:relative}
.ys-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;
  background:conic-gradient(from var(--ys-angle),transparent 0 70%,#14B8A6 88%,#34D399 96%,transparent 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  animation:ys-angle 7s linear infinite}

.ys-ping{position:absolute;inset:0;border-radius:inherit;pointer-events:none;animation:ys-ping 2.8s cubic-bezier(.22,1,.36,1) infinite}
.ys-pulse{animation:ys-ping-sm 3.2s ease-out infinite}

.ys-script{font-family:'Brush Script MT','Brush Script Std','Snell Roundhand','Apple Chancery','Segoe Script','Lucida Handwriting',cursive;
  font-weight:700;letter-spacing:.01em}

@keyframes ys-marquee{to{transform:translateX(-50%)}}
.ys-marquee{display:flex;width:max-content;will-change:transform;animation:ys-marquee 38s linear infinite}
.ys-marquee:hover,.ys-marquee[data-paused='true']{animation-play-state:paused}
.ys-orb{will-change:transform,opacity;animation:ys-breathe 9s ease-in-out infinite}

@media (prefers-reduced-motion:reduce){
  .ys-ring,.ys-glow,.ys-name,.ys-sheen::after,.ys-beam::before,.ys-ping,.ys-pulse,.ys-marquee,.ys-orb{animation:none!important}
  .ys-name{background-position:50% 0}
  .ys-sheen::after{display:none}
}
`;

/* ============================ BRAND ICONS (SVG) ============================= */
/* lucide-react v1 no longer ships brand icons, so these three are inlined. */

type IconProps = { className?: string };
type IconType = ComponentType<IconProps>;

function GithubMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedinMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const SOCIALS: ReadonlyArray<{ label: string; href: string; Icon: IconType; newTab: boolean }> = [
  { label: 'GitHub', href: SITE.github, Icon: GithubMark, newTab: true },
  { label: 'LinkedIn', href: SITE.linkedin, Icon: LinkedinMark, newTab: true },
  { label: 'Email', href: `mailto:${SITE.email}`, Icon: Mail, newTab: false },
  { label: 'YouTube', href: SITE.youtube, Icon: YoutubeMark, newTab: true },
];

/* =============================== SMALL PIECES =============================== */

type SectionId = 'home' | 'education' | 'internships' | 'projects' | 'achievements';

const NAV_ITEMS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'education', label: 'Education' },
  { id: 'internships', label: 'Internships' },
  { id: 'projects', label: 'Projects' },
  { id: 'achievements', label: 'Achievements' },
];

/**
 * Logo tile for an organisation. The neutral icon tile is always underneath; the logo file
 * (public/logos/<slug>.png, then .svg / .webp / .jpg) fades in on top once it has loaded, and
 * if no file exists the icon simply stays. Official logos are supplied by the site owner.
 */
function OrgMark({
  item,
  size = 'md',
}: {
  item: InternshipItem;
  size?: keyof typeof MARK_SIZES;
}) {
  const [format, setFormat] = useState(0); // index into LOGO_FORMATS; past the end means "no file found"
  const [loaded, setLoaded] = useState(false);

  // Idempotent, so a late error event and the check below can never skip a format.
  const advance = useCallback((from: number) => setFormat((f) => (f === from ? f + 1 : f)), []);

  // The server-rendered <img> may finish or fail before React attaches onLoad/onError,
  // and those events never fire twice. decode() settles either way.
  const watch = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !img.complete) return; // still loading: onLoad / onError will report
      const from = Number(img.dataset.format);
      img.decode().then(
        () => setLoaded(true),
        () => advance(from),
      );
    },
    [advance],
  );

  return (
    <span
      className={cn(MARK_BASE, MARK_SIZES[size], loaded ? 'border-slate-200' : 'border-[#0B1F3A]')}
    >
      <item.Icon className={MARK_ICONS[size]} />
      {format < LOGO_FORMATS.length && (
        <img
          key={format}
          ref={watch}
          data-format={format}
          src={`${LOGO_DIR}/${item.slug}.${LOGO_FORMATS[format]}`}
          alt={`${item.shortName} logo`}
          onLoad={() => setLoaded(true)}
          onError={() => advance(format)}
          className={cn(
            'absolute inset-0 h-full w-full bg-white object-contain p-1.5 transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  );
}

/** Pins the page to a light palette even if globals.css ships a dark-mode media query. */
function ForceLightTheme() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html:
          ':root{color-scheme:light only;--background:#FAFAFA;--foreground:#0F172A}' +
          '@media (prefers-color-scheme:dark){:root{--background:#FAFAFA;--foreground:#0F172A}}' +
          'html,body{background-color:#FAFAFA!important;color:#0F172A}',
      }}
    />
  );
}

/** The effect styles from PAGE_CSS, injected once for the whole page. */
function PageStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />;
}

/* ================= PAGE BACKDROP (GRID + GLOW + LIVE CANVAS) =================
 * Everything the background needs lives in this block: no tailwind.config or
 * CSS-file changes. It is drawn on a fixed layer behind the page, so it stays put
 * while content scrolls and never affects layout or clicks. Layers, bottom to top:
 *   1. soft glowing orbs that drift slowly
 *   2. LiveGrid, an interactive canvas: cells light up like a live data feed, the
 *      mouse behaves like an Excel "active cell", and clicks send a ripple
 *   3. the graph-paper lines
 * ===========================================================================*/

const GRID_MINOR = 'rgba(15,23,42,0.04)'; // 32px cells
const GRID_MAJOR = 'rgba(15,23,42,0.075)'; // a stronger line every 160px
const GRID_DOT = 'rgba(15,23,42,0.2)'; // a dot where major lines cross
const GRID_FADE = 'radial-gradient(ellipse 90% 80% at 50% 28%, #000 30%, transparent 100%)';

/** The fixed layer everything below is drawn on. Inline, so it can never disturb the page layout. */
const BACKDROP_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: -10,
  overflow: 'hidden',
  pointerEvents: 'none',
};

/** Graph paper that fades out toward the edges of the screen. */
const GRID_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: [
    `radial-gradient(circle at 50% 50%, ${GRID_DOT} 1.5px, transparent 2px)`,
    `linear-gradient(to right, ${GRID_MAJOR} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${GRID_MAJOR} 1px, transparent 1px)`,
    `linear-gradient(to right, ${GRID_MINOR} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${GRID_MINOR} 1px, transparent 1px)`,
  ].join(', '),
  backgroundSize: '160px 160px, 160px 160px, 160px 160px, 32px 32px, 32px 32px',
  backgroundPosition: '-80px -80px, 0 0, 0 0, 0 0, 0 0',
  maskImage: GRID_FADE,
  WebkitMaskImage: GRID_FADE,
};

const RGB_TEAL = '45,212,191';
const RGB_EMERALD = '52,211,153';
const RGB_COBALT = '48,84,168';
const RGB_CURSOR = '13,148,136'; // a deeper teal, for the crisp active-cell outline

/** A soft glow that fades smoothly to nothing: rgb is "r,g,b", peak is the centre opacity. */
const glow = (rgb: string, peak: number) =>
  `radial-gradient(closest-side, rgba(${rgb},${peak}) 0%, rgba(${rgb},${+(peak * 0.55).toFixed(3)}) 35%, rgba(${rgb},${+(peak * 0.2).toFixed(3)}) 65%, rgba(${rgb},0) 100%)`;

type Orb = {
  key: string;
  position: string; // Tailwind classes: where it sits and how big it is
  glow: string;
  drift: { x: number[]; y: number[]; scale: number[] };
  seconds: number;
};

const ORBS: Orb[] = [
  {
    key: 'teal-top-left',
    position: '-left-[16%] -top-[22%] h-[28rem] w-[28rem] sm:h-[46rem] sm:w-[46rem]',
    glow: glow(RGB_TEAL, 0.44),
    drift: { x: [0, 70, -20, 0], y: [0, 50, 90, 0], scale: [1, 1.08, 0.96, 1] },
    seconds: 28,
  },
  {
    key: 'emerald-right',
    position: '-right-[8%] top-[22%] h-[24rem] w-[24rem] sm:h-[38rem] sm:w-[38rem]',
    glow: glow(RGB_EMERALD, 0.32),
    drift: { x: [0, -60, 20, 0], y: [0, 70, -40, 0], scale: [1, 0.95, 1.1, 1] },
    seconds: 34,
  },
  {
    key: 'navy-bottom-left',
    position: '-bottom-[26%] left-[6%] h-[30rem] w-[30rem] sm:h-[48rem] sm:w-[48rem]',
    glow: glow(RGB_COBALT, 0.24),
    drift: { x: [0, 80, 30, 0], y: [0, -50, -90, 0], scale: [1, 1.06, 0.97, 1] },
    seconds: 32,
  },
  {
    key: 'teal-bottom-right',
    position: 'hidden -bottom-[18%] -right-[8%] sm:block sm:h-[34rem] sm:w-[34rem]', // desktop only
    glow: glow(RGB_TEAL, 0.28),
    drift: { x: [0, -40, 10, 0], y: [0, -60, 20, 0], scale: [1, 1.1, 0.95, 1] },
    seconds: 30,
  },
];

/* ------------------------------- LIVE GRID --------------------------------
 * The idea (a canvas grid of softly flickering cells) comes from Magic UI's
 * FlickeringGrid: https://github.com/magicuidesign/magicui (MIT License,
 * Copyright (c) Magic UI). This version is rewritten to react to the pointer, to
 * line up with the graph paper, and to do almost no work while nothing happens.
 * It listens on the window (so the page stays fully clickable) and holds still for
 * visitors who prefer reduced motion.
 * --------------------------------------------------------------------------*/

const CELL = 32; // the graph-paper squares are 32px, so lit cells line up with them

/** Ambient cells: [colour, share of the cells, strongest opacity]. */
const PULSE_COLORS: ReadonlyArray<readonly [rgb: string, share: number, peak: number]> = [
  [RGB_TEAL, 0.5, 0.17],
  [RGB_EMERALD, 0.3, 0.15],
  [RGB_COBALT, 0.2, 0.09],
];

/** Tuning knobs for the live grid. */
const LIVE = {
  pulsesPerCellPerSecond: 0.018, // how busy the grid is (0 turns the ambient cells off)
  minLife: 1.6, // seconds a lit cell takes to fade away
  maxLife: 3.4,
  hoverRadius: 150, // px of glow the mouse leaves on the grid
  trailSeconds: 0.9, // how long that glow lingers
  spotlightRadius: 260, // px, the soft light that follows the mouse
  rippleSpeed: 540, // px per second
  rippleWidth: 60,
  rippleMax: 560,
} as const;

type Pulse = { col: number; row: number; born: number; life: number; peak: number; rgb: string };
type Ripple = { x: number; y: number; born: number };
type PointerMove = WindowEventMap['pointermove'];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** The same soft edge as GRID_FADE, so ambient cells fade out where the grid lines do. */
const edgeFade = (x: number, y: number, w: number, h: number) => {
  const t = Math.hypot((x - w * 0.5) / (w * 0.9), (y - h * 0.28) / (h * 0.8));
  return t <= 0.3 ? 1 : clamp01(1 - (t - 0.3) / 0.7);
};

function pickPulseColor() {
  let r = Math.random();
  for (const color of PULSE_COLORS) {
    r -= color[1];
    if (r <= 0) return color;
  }
  return PULSE_COLORS[0];
}

/** Quick fade in, slower eased fade out. Age and life are in seconds. */
const pulseOpacity = (age: number, life: number, peak: number) => {
  const attack = 0.18;
  if (age < attack) return peak * (age / attack);
  const t = (age - attack) / (life - attack);
  return peak * (1 - t) * (1 - t);
};

const LIVE_CANVAS_STYLE: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

function LiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0); // glow the mouse leaves behind, one value (0 to 1) per cell
    const pulses: Pulse[] = [];
    const ripples: Ripple[] = [];
    // x/y: the mouse. sx/sy: the eased position of the glow. cx/cy: the eased top-left of the active cell.
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, cx: 0, cy: 0, active: false, moved: -1e9 };
    let raf = 0;
    let last = 0;

    const fillCell = (col: number, row: number, rgb: string, alpha: number) => {
      if (alpha < 0.004) return;
      ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 1, CELL - 1); // leave the grid line visible
    };

    /** Light up the cells around a point; the closer to it, the brighter. */
    const stamp = (x: number, y: number, radius: number) => {
      const c0 = Math.max(0, Math.floor((x - radius) / CELL));
      const c1 = Math.min(cols - 1, Math.floor((x + radius) / CELL));
      const r0 = Math.max(0, Math.floor((y - radius) / CELL));
      const r1 = Math.min(rows - 1, Math.floor((y + radius) / CELL));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const d = Math.hypot((c + 0.5) * CELL - x, (r + 0.5) * CELL - y) / radius;
          if (d >= 1) continue;
          const v = (1 - d) * (1 - d);
          const i = r * cols + c;
          if (v > heat[i]) heat[i] = v;
        }
      }
    };

    const addPulse = (now: number) => {
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * rows);
      if (Math.random() > edgeFade((col + 0.5) * CELL, (row + 0.5) * CELL, w, h)) return;
      const [rgb, , strongest] = pickPulseColor();
      pulses.push({
        col,
        row,
        born: now,
        life: LIVE.minLife + Math.random() * (LIVE.maxLife - LIVE.minLife),
        peak: strongest * (0.45 + Math.random() * 0.55),
        rgb,
      });
    };

    /** One still picture, for visitors who prefer reduced motion. */
    const paintStill = () => {
      ctx.clearRect(0, 0, w, h);
      const count = Math.round(cols * rows * 0.035);
      for (let i = 0; i < count; i++) {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * rows);
        if (Math.random() > edgeFade((col + 0.5) * CELL, (row + 0.5) * CELL, w, h)) continue;
        const [rgb, , strongest] = pickPulseColor();
        fillCell(col, row, rgb, strongest * (0.3 + Math.random() * 0.5));
      }
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(box.width));
      const nextH = Math.max(1, Math.round(box.height));
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (nextW === w && nextH === h && nextDpr === dpr) return;
      w = nextW;
      h = nextH;
      dpr = nextDpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      heat = new Float32Array(cols * rows);
      pulses.length = 0;
      if (reduced.matches) paintStill();
    };

    const paint = (now: number, dt: number) => {
      // ---- update ----
      const density = coarse.matches ? 0.6 : 1; // calmer on phones
      const spawn = cols * rows * LIVE.pulsesPerCellPerSecond * density * dt;
      for (let n = Math.floor(spawn) + (Math.random() < spawn % 1 ? 1 : 0); n > 0; n--) addPulse(now);

      const decay = Math.exp(-dt / LIVE.trailSeconds);
      for (let i = 0; i < heat.length; i++) heat[i] *= decay;

      if (pointer.active) {
        const follow = 1 - Math.exp(-dt * 14);
        pointer.sx += (pointer.x - pointer.sx) * follow;
        pointer.sy += (pointer.y - pointer.sy) * follow;
        const snap = 1 - Math.exp(-dt * 26);
        pointer.cx += (Math.floor(pointer.x / CELL) * CELL - pointer.cx) * snap;
        pointer.cy += (Math.floor(pointer.y / CELL) * CELL - pointer.cy) * snap;
        stamp(pointer.sx, pointer.sy, LIVE.hoverRadius);
      }

      // ---- draw ----
      ctx.clearRect(0, 0, w, h);

      if (pointer.active) {
        const reach = LIVE.spotlightRadius;
        const light = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, reach);
        light.addColorStop(0, `rgba(${RGB_TEAL},0.13)`);
        light.addColorStop(1, `rgba(${RGB_TEAL},0)`);
        ctx.fillStyle = light;
        ctx.fillRect(pointer.sx - reach, pointer.sy - reach, reach * 2, reach * 2);
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const age = (now - p.born) / 1000;
        if (age >= p.life) {
          pulses[i] = pulses[pulses.length - 1];
          pulses.pop();
          continue;
        }
        fillCell(p.col, p.row, p.rgb, pulseOpacity(age, p.life, p.peak));
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = heat[r * cols + c];
          if (v > 0.02) fillCell(c, r, RGB_TEAL, v * 0.22);
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const radius = ((now - ripple.born) / 1000) * LIVE.rippleSpeed;
        if (radius > LIVE.rippleMax) {
          ripples.splice(i, 1);
          continue;
        }
        const reach = radius + LIVE.rippleWidth;
        const fade = 1 - radius / LIVE.rippleMax;
        const c0 = Math.max(0, Math.floor((ripple.x - reach) / CELL));
        const c1 = Math.min(cols - 1, Math.floor((ripple.x + reach) / CELL));
        const r0 = Math.max(0, Math.floor((ripple.y - reach) / CELL));
        const r1 = Math.min(rows - 1, Math.floor((ripple.y + reach) / CELL));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const d = Math.abs(Math.hypot((c + 0.5) * CELL - ripple.x, (r + 0.5) * CELL - ripple.y) - radius);
            if (d >= LIVE.rippleWidth) continue;
            const v = 1 - d / LIVE.rippleWidth;
            fillCell(c, r, RGB_EMERALD, v * v * 0.26 * fade);
          }
        }
      }

      if (pointer.active) {
        // Like the active cell in a spreadsheet: a filled square, a crisp outline, and a fill handle.
        // The outline and handle stay translucent on purpose, so text that sits under them stays readable.
        ctx.fillStyle = `rgba(${RGB_TEAL},0.1)`;
        ctx.fillRect(pointer.cx + 1, pointer.cy + 1, CELL - 1, CELL - 1);
        ctx.strokeStyle = `rgba(${RGB_CURSOR},0.5)`;
        ctx.lineWidth = 1.25;
        ctx.strokeRect(pointer.cx + 1.25, pointer.cy + 1.25, CELL - 1.5, CELL - 1.5);
        ctx.fillStyle = `rgba(${RGB_CURSOR},0.55)`;
        ctx.fillRect(pointer.cx + CELL - 3, pointer.cy + CELL - 3, 6, 6);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const awake = ripples.length > 0 || (pointer.active && now - pointer.moved < 1500);
      if (!awake && now - last < 32) return; // about 30 frames a second while nothing happens near the mouse
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(now, dt);
    };

    const sync = () => {
      if (reduced.matches) {
        cancelAnimationFrame(raf);
        raf = 0;
        paintStill();
      } else if (!raf) {
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e: PointerMove) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.active) {
        pointer.sx = e.clientX;
        pointer.sy = e.clientY;
        pointer.cx = Math.floor(e.clientX / CELL) * CELL;
        pointer.cy = Math.floor(e.clientY / CELL) * CELL;
      }
      pointer.active = true;
      pointer.moved = performance.now();
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = (e: PointerMove) => {
      if (reduced.matches) return;
      if (ripples.length < 4) ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
      stamp(e.clientX, e.clientY, LIVE.hoverRadius * 0.6);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('mouseleave', onLeave);
    reduced.addEventListener('change', sync);

    resize();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('mouseleave', onLeave);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" style={LIVE_CANVAS_STYLE} />;
}

function Backdrop() {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: EASE }}
      style={BACKDROP_STYLE}
    >
      {ORBS.map((orb) => (
        <motion.div
          key={orb.key}
          className={cn('absolute will-change-transform', orb.position)}
          style={{ backgroundImage: orb.glow }}
          animate={orb.drift}
          transition={{ duration: orb.seconds, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <LiveGrid />
      <div style={GRID_STYLE} />
    </motion.div>
  );
}

/* ============================ NAV + SCROLL SPY ============================== */

function motionBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** The section whose top edge most recently passed under the floating bar. */
function currentSection(): SectionId {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight > window.innerHeight + 80;
  if (scrollable && window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
    return NAV_ITEMS[NAV_ITEMS.length - 1].id; // bottom of the page
  }
  let current = NAV_ITEMS[0].id;
  for (const item of NAV_ITEMS) {
    const el = document.getElementById(item.id);
    if (el && el.getBoundingClientRect().top - SPY_OFFSET <= 0) current = item.id;
  }
  return current;
}

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<SectionId>('home');
  const pending = useRef<SectionId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The spy only runs while the Portfolio is the open tab; the other tabs have no sections to follow.
  useEffect(() => {
    if (!enabled) return undefined;
    const sync = () => {
      const next = currentSection();
      if (pending.current) {
        if (next !== pending.current) return; // still travelling to the clicked tab
        pending.current = null;
      }
      setActive(next);
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled]);

  const goTo = useCallback((id: SectionId) => {
    setActive(id);
    // Hold the indicator on the clicked tab while smooth-scrolling past other sections.
    pending.current = currentSection() === id ? null : id;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
    }, 1600);

    const behavior = motionBehavior();
    if (id === 'home') window.scrollTo({ top: 0, behavior });
    else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  }, []);

  return { active, goTo };
}

/** The links to the parts of the Portfolio. A second, smaller bar under the tab bar, shown on the Portfolio tab only. */
function SectionNav({
  active,
  onNavigate,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}) {
  const [hovered, setHovered] = useState<SectionId | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // On narrow screens the bar scrolls sideways; keep the active tab in view.
  useEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !tab) return;
    const left = tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: motionBehavior() });
  }, [active]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="pointer-events-auto max-w-full rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_26px_-14px_rgba(15,23,42,0.25)] backdrop-blur-xl"
    >
      <nav
        ref={navRef}
        aria-label="Portfolio sections"
        onPointerLeave={() => setHovered(null)}
        // -m-1.5 p-1.5: room for the 4px focus ring inside the scrolling row (it would be clipped otherwise)
        className="relative -m-1.5 flex min-w-0 items-center gap-0.5 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          const showHover = hovered === item.id && !isActive;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
                if (e.pointerType === 'mouse') setHovered(item.id);
              }}
              onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
                if (e.currentTarget.matches(':focus-visible')) setHovered(item.id);
              }}
              onBlur={() => setHovered(null)}
              className={cn(
                'relative isolate shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 sm:px-3.5 sm:text-[13px]',
                isActive ? 'text-white' : 'text-slate-600 hover:text-[#0B1F3A]',
                FOCUS,
              )}
            >
              {showHover && (
                <motion.span
                  layoutId="nav-hover"
                  transition={SPRING}
                  className="absolute inset-0 -z-10 rounded-full bg-slate-200/70"
                />
              )}
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  transition={SPRING}
                  className="absolute inset-0 -z-10 rounded-full bg-[#0B1F3A]"
                />
              )}
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </motion.div>
  );
}

function Header({
  view,
  onSelectView,
  onLogo,
  section,
  onSelectSection,
}: {
  view: ViewId;
  onSelectView: (id: ViewId) => void;
  onLogo: () => void;
  section: SectionId;
  onSelectSection: (id: SectionId) => void;
}) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <>
      {/* Scroll progress */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress, backgroundImage: RULE_GRADIENT }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
      />

      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="pointer-events-none sticky top-0 z-50 flex flex-col items-center gap-1.5 px-3 pt-3 sm:pt-4"
      >
        <div className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_14px_36px_-14px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <a
            href="#home"
            aria-label={`${SITE.name}, back to top`}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              onLogo();
            }}
            className={cn('shrink-0 rounded-full', FOCUS)}
          >
            <img
              src="/image.png"
              alt="YS"
              className="h-9 w-9 rounded-full object-cover object-top border border-slate-200"
            />
          </a>

          <TabBar view={view} onSelect={onSelectView} />
        </div>

        {view === 'portfolio' ? <SectionNav active={section} onNavigate={onSelectSection} /> : null}
      </motion.header>
    </>
  );
}

/* ================================= SECTIONS ================================= */

/**
 * What a screen reader says for a logo pill. The printed short name leads, so the spoken name starts
 * with the words on screen: "Reserve Bank of India (RBI)" becomes "RBI, Reserve Bank of India: see the internship".
 */
function pillLabel(item: InternshipItem): string {
  const full = item.org.replace(/\s*\([^)]*\)/g, '').trim();
  const lead = full === item.shortName ? full : `${item.shortName}, ${full}`;
  return `${lead}: see the internship`;
}

/** The three organisations, as logo pills under the hero buttons; each one jumps to Internships. */
function HeroLogos({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  return (
    <motion.div variants={HERO_ITEM} className="mt-12 w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
        Internships at
      </p>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {INTERNSHIPS.map((item) => (
          <li key={item.slug}>
            <a
              href="#internships"
              aria-label={pillLabel(item)}
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                onNavigate('internships');
              }}
              className={cn(
                'inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/90 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_22px_-12px_rgba(15,23,42,0.35)]',
                FOCUS,
              )}
            >
              <OrgMark item={item} size="sm" />
              {item.shortName}
            </a>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function EducationSection() {
  return (
    <section id="education" className="scroll-mt-36 border-t border-slate-900/[0.07] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Background"
          title="Education"
          blurb="Management, engineering and computer applications."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {EDUCATION.map((item, i) => (
            <Reveal key={`${item.degree}-${item.school}`} delay={i * 0.1} className="h-full">
              <SpotCard className="flex h-full flex-col p-7">
                <div className="flex items-start justify-between gap-3">
                  <span className={ICON_TILE}>
                    <GraduationCap className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      item.current
                        ? 'bg-[#0B1F3A] text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600',
                    )}
                  >
                    {item.year}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-3xl font-semibold text-[#0B1F3A]">
                  {item.degree}
                </h3>
                <p className="mt-1 flex-1 text-base font-medium leading-snug text-slate-700">
                  {item.field}
                </p>
                <p className="mt-6 border-t border-slate-100 pt-4 text-sm font-medium text-slate-600">
                  {item.school}
                </p>
              </SpotCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function InternshipsSection() {
  const listRef = useRef<HTMLOListElement | null>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 55%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section
      id="internships"
      className="scroll-mt-36 border-t border-slate-900/[0.07] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Experience"
          title="Internships"
          blurb="Hands-on exposure to financial regulation, policy research and engineering."
        />

        <ol
          ref={listRef}
          className="relative mx-auto mt-14 max-w-3xl space-y-6 border-l border-slate-300 pl-6 sm:pl-10"
        >
          {/* the line fills in as the section scrolls into view */}
          <motion.span
            aria-hidden="true"
            style={{ scaleY: fill, backgroundImage: TIMELINE_GRADIENT }}
            className="absolute -left-[1.5px] top-0 h-full w-0.5 origin-top"
          />
          {INTERNSHIPS.map((item, i) => (
            <li key={item.org} className="relative">
              <span
                aria-hidden="true"
                style={{ animationDelay: `${i * 0.7}s` }}
                className="ys-pulse absolute -left-[31px] top-9 h-3 w-3 rounded-full border-2 border-[#0B1F3A] bg-[#FAFAFA] sm:-left-[47px]"
              />
              <Reveal delay={i * 0.1}>
                <SpotCard className="p-6 sm:p-7" lift={4}>
                  <div className="flex items-start gap-4">
                    <OrgMark item={item} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div>
                          <h3 className="font-serif text-xl font-semibold text-[#0B1F3A]">
                            {item.org}
                          </h3>
                          <p className="mt-0.5 text-sm font-medium text-slate-600">{item.role}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {item.period}
                        </span>
                      </div>
                      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-600">
                        {item.summary}
                      </p>
                      <div className="mt-4">
                        <Chip>{item.focus}</Chip>
                      </div>
                    </div>
                  </div>
                </SpotCard>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="scroll-mt-36 border-t border-slate-900/[0.07] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Selected work"
          title="Projects"
          blurb="Ventures and analytics work at the intersection of finance, AI and data."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.title} delay={(i % 2) * 0.1} className="h-full">
              <SpotCard className="group flex h-full flex-col p-7" lift={6}>
                <div className="flex items-start justify-between">
                  <span className={ICON_TILE}>
                    <project.Icon className="h-6 w-6" />
                  </span>
                  <span aria-hidden="true" className="font-serif text-2xl text-slate-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mt-6 font-serif text-xl font-semibold text-[#0B1F3A]">
                  {project.href ? (
                    <ExternalAnchor
                      href={project.href}
                      label={project.linkLabel ?? project.title}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md underline-offset-4 hover:underline',
                        FOCUS,
                      )}
                    >
                      {project.title}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1F3A]"
                      />
                    </ExternalAnchor>
                  ) : (
                    project.title
                  )}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-600">{project.tagline}</p>
                <p className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-slate-600">
                  {project.summary}
                </p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <li key={tag}>
                      <Chip>{tag}</Chip>
                    </li>
                  ))}
                </ul>
              </SpotCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AchievementsSection() {
  return (
    <section
      id="achievements"
      className="scroll-mt-36 border-t border-slate-900/[0.07] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Recognition"
          title="Achievements"
          blurb="Competitions and milestones along the way."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ACHIEVEMENTS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1} className="h-full">
              <SpotCard className="flex h-full flex-col p-7">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-[#0B1F3A]">
                  <item.Icon className="h-7 w-7" />
                </span>
                <span className="mt-6 inline-flex w-fit rounded-full bg-[#0B1F3A] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {item.badge}
                </span>
                <h3 className="mt-3 font-serif text-xl font-semibold text-[#0B1F3A]">
                  {item.title}
                </h3>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                  {item.summary}
                </p>
              </SpotCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const BAND_GLOW: CSSProperties = { backgroundImage: glow(RGB_TEAL, 0.3) };

/** Closing call to action: a card with a slow light travelling around its border. */
function ContactBand({ onContact }: { onContact: () => void }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-36 border-t border-slate-900/[0.07] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          <div className="ys-beam relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_30px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur sm:px-12">
            <span
              aria-hidden="true"
              style={BAND_GLOW}
              className="pointer-events-none absolute -top-28 left-1/2 h-60 w-[34rem] max-w-none -translate-x-1/2 rounded-full"
            />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
              Get in touch
            </p>
            <h2
              id="contact-heading"
              className="relative mt-3 font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl"
            >
              Let’s connect
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-700">
              Have an opportunity, a collaboration idea or a question? Send a note straight to my
              inbox.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <motion.button
                type="button"
                onClick={onContact}
                aria-haspopup="dialog"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'ys-sheen group inline-flex items-center gap-2.5 rounded-full bg-[#0B1F3A] px-8 py-4 text-base font-semibold text-white shadow-[0_14px_28px_-12px_rgba(11,31,58,0.65)] transition-colors duration-200 hover:bg-[#14305A]',
                  FOCUS,
                )}
              >
                <Mail className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6" />
                Write an email
              </motion.button>
              <a
                href={`mailto:${SITE.email}`}
                className={cn(
                  'rounded-full px-4 py-3 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#0B1F3A] hover:decoration-[#0B1F3A]',
                  FOCUS,
                )}
              >
                {SITE.email}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-900/[0.07] bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pb-28 pt-14 text-center sm:px-6 sm:pb-24">
        <p className="font-serif text-xl font-semibold text-[#0B1F3A]">{SITE.name}</p>

        <ul className="flex items-center gap-3">
          {SOCIALS.map(({ label, href, Icon, newTab }) => (
            <li key={label}>
              {newTab ? (
                <ExternalAnchor
                  href={href}
                  label={label}
                  title={label}
                  className={cn(ICON_BUTTON, FOCUS)}
                >
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

/* ========================== FLOATING GMAIL CONTACT =========================== */
/* The panel opens with the spring Motion Primitives uses for its MorphingPopover
 * (github.com/ibelick/motion-primitives, MIT): duration 0.4, bounce 0.1. */

const PANEL_SPRING = { type: 'spring', duration: 0.4, bounce: 0.1 } as const;
const PANEL_SHADOW = 'shadow-[0_2px_4px_rgba(15,23,42,0.05),0_30px_60px_-20px_rgba(15,23,42,0.4)]';
const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-[0.14em] text-slate-700';

type ContactPanelProps = {
  topic: string;
  message: string;
  onTopic: (id: string) => void;
  onMessage: (text: string) => void;
  onClose: () => void;
  fabRef: RefObject<HTMLButtonElement | null>;
};

function ContactPanel({ topic, message, onTopic, onMessage, onClose, fabRef }: ContactPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const subject = (CONTACT_TOPICS.find((t) => t.id === topic) ?? CONTACT_TOPICS[0]).subject;

  // Escape, or a press anywhere outside, closes the panel. The page behind stays usable.
  useEffect(() => {
    const onKey = (e: WindowEventMap['keydown']) => {
      if (e.key === 'Escape') onClose();
    };
    const onPress = (e: WindowEventMap['pointerdown']) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      // the buttons that open the panel handle their own clicks
      if (panelRef.current?.contains(target) || target.closest('[aria-haspopup="dialog"]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPress);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPress);
    };
  }, [onClose]);

  // Focus moves into the panel, and returns to whatever opened it unless the visitor went elsewhere.
  // The opener is read once, while the panel first renders: by the time an effect runs, focus has moved.
  const [opener] = useState(() => document.activeElement);
  useEffect(() => {
    const fab = fabRef.current;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const back = opener instanceof HTMLElement && opener !== document.body ? opener : fab;
      back?.focus({ preventScroll: true });
    };
  }, [fabRef, opener]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false); // the address below is select-all, so it can still be copied by hand
    }
  };

  return (
    <motion.div
      ref={panelRef}
      id={CONTACT_PANEL_ID}
      role="dialog"
      aria-labelledby={CONTACT_TITLE_ID}
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.92, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, y: 8, filter: 'blur(4px)' }}
      transition={PANEL_SPRING}
      className={cn(
        'pointer-events-auto relative max-h-[calc(100dvh-7.5rem)] w-[min(22rem,calc(100vw-2rem))] origin-bottom-right overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-slate-200 bg-white focus:outline-none',
        PANEL_SHADOW,
      )}
    >
      <div aria-hidden="true" className="h-1 w-full" style={RULE_STYLE} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <img
            src="/image.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <h2
              id={CONTACT_TITLE_ID}
              className="font-serif text-lg font-semibold leading-tight text-[#0B1F3A]"
            >
              Get in touch
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
              Opens a Gmail draft addressed to {SITE.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact panel"
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B1F3A]',
              FOCUS,
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className={FIELD_LABEL}>What is it about?</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {CONTACT_TOPICS.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="contact-topic"
                  value={t.id}
                  checked={topic === t.id}
                  onChange={() => onTopic(t.id)}
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white peer-checked:border-[#0B1F3A] peer-checked:bg-[#0B1F3A] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#0B1F3A] peer-focus-visible:ring-offset-2">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="contact-message" className={cn('mt-4 block', FIELD_LABEL)}>
          Message{' '}
          <span className="font-medium normal-case tracking-normal text-slate-600">(optional)</span>
        </label>
        <textarea
          id="contact-message"
          rows={4}
          maxLength={CONTACT_MAX_LENGTH}
          value={message}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onMessage(e.target.value)}
          placeholder="Write a few lines…"
          className="mt-2 block w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base leading-relaxed text-slate-800 placeholder:text-slate-500 focus:border-[#0B1F3A]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]/15 sm:text-sm"
        />

        <ExternalAnchor
          href={gmailUrl(subject, message)}
          label="Open in Gmail"
          className={cn(
            'ys-sheen mt-4 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0B1F3A] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_28px_-14px_rgba(11,31,58,0.7)] transition-colors hover:bg-[#14305A]',
            FOCUS,
          )}
        >
          <Send className="h-4 w-4" />
          Open in Gmail
        </ExternalAnchor>

        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <a
            href={mailtoUrl(subject, message)}
            className={cn(
              'rounded-md px-1 py-1 font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#0B1F3A] hover:decoration-[#0B1F3A]',
              FOCUS,
            )}
          >
            Use another mail app
          </a>
          <button
            type="button"
            onClick={copyAddress}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-[#0B1F3A]',
              FOCUS,
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied' : 'Copy address'}
          </button>
        </div>

        <p className="mt-3 select-all break-all rounded-lg bg-slate-50 px-3 py-2 text-center text-[13px] font-medium text-slate-700">
          {SITE.email}
        </p>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? 'Email address copied' : ''}
        </span>
      </div>
    </motion.div>
  );
}

/** The floating button. Its panel keeps the draft while closed, so an accidental Esc loses nothing. */
function ContactFab({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const [topic, setTopic] = useState(CONTACT_TOPICS[0].id);
  const [message, setMessage] = useState('');
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:right-6">
      <AnimatePresence>
        {open && (
          <ContactPanel
            key="contact-panel"
            topic={topic}
            message={message}
            onTopic={setTopic}
            onMessage={setMessage}
            onClose={close}
            fabRef={fabRef}
          />
        )}
      </AnimatePresence>

      <motion.button
        ref={fabRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? CONTACT_PANEL_ID : undefined}
        onClick={() => onOpenChange(!open)}
        initial={{ opacity: 0, y: 24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.6, ease: EASE }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'pointer-events-auto relative inline-flex items-center gap-2.5 rounded-full bg-[#0B1F3A] py-3.5 pl-4 pr-5 text-sm font-semibold text-white shadow-[0_18px_36px_-14px_rgba(11,31,58,0.75)] transition-colors duration-200 hover:bg-[#14305A]',
          FOCUS,
        )}
      >
        {!open && <span aria-hidden="true" className="ys-ping" />}
        <span className="relative grid h-5 w-5 place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? 'close' : 'mail'}
              initial={{ rotate: -80, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 80, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 grid place-items-center"
            >
              {open ? <X className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="inline-block min-w-[3.9rem] text-left">{open ? 'Close' : 'Email me'}</span>
      </motion.button>
    </div>
  );
}

/* ================================== PAGE =================================== */

export default function Page() {
  const view = useView();
  const inPortfolio = view === 'portfolio';
  const { active, goTo } = useActiveSection(inPortfolio);
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = useCallback(() => setContactOpen(true), []);
  const forgetScroll = useViewEffects(view, SITE.name);

  // The photo in the bar: to the top of the Portfolio, from wherever you are.
  const goHome = useCallback(() => {
    if (inPortfolio) {
      goTo('home');
      return;
    }
    forgetScroll();
    goToView('portfolio');
  }, [inPortfolio, goTo, forgetScroll]);

  return (
    <MotionConfig reducedMotion="user">
      <ForceLightTheme />
      <PageStyles />
      <div className="relative isolate min-h-screen bg-[#FAFAFA] text-slate-700 antialiased selection:bg-[#0B1F3A] selection:text-white">
        <Backdrop />
        <Header
          view={view}
          onSelectView={goToView}
          onLogo={goHome}
          section={active}
          onSelectSection={goTo}
        />
        <main>
          {/* The Portfolio stays in the page while another tab is open, so it comes back exactly as you left it. */}
          <TabPanel id="portfolio" active={inPortfolio} keepMounted>
            <EquityResearchHero
              name={SITE.name}
              headline={SITE.headline}
              resumeFileName={SITE.resumeDownloadName}
              onContact={openContact}
              onNavigate={goTo}
            >
              <HeroLogos onNavigate={goTo} />
            </EquityResearchHero>
            <EducationSection />
            <InternshipsSection />
            <ProjectsSection />
            <AchievementsSection />
            <ContactBand onContact={openContact} />
          </TabPanel>
          <TabPanel id="drive" active={view === 'drive'}>
            <DrivePanel content={DRIVE} />
          </TabPanel>
          <TabPanel id="youtube" active={view === 'youtube'}>
            <YouTubePanel content={YOUTUBE} />
          </TabPanel>
          <TabPanel id="newsletters" active={view === 'newsletters'}>
            <NewsletterPanel content={NEWSLETTERS} />
          </TabPanel>
          <TabPanel id="ai" active={view === 'ai'}>
            <AiPanel contactEmail={SITE.email} />
          </TabPanel>
        </main>
        <Footer />
        <ContactFab open={contactOpen} onOpenChange={setContactOpen} />
      </div>
    </MotionConfig>
  );
}
