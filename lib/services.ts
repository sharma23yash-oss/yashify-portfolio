/**
 * The service packages on /hire. Edit freely: the cards, the package dropdown in the brief form,
 * and the server-side check of that dropdown all read this list.
 *
 * Price: set `startingAtINR` to a number (e.g. 15000) to show "Starting at ₹15,000".
 * While it is null the card says "Custom quote", so a placeholder price never goes live.
 */

export type ServiceId = 'financial-model' | 'web-build' | 'ai-workflow';

export type Service = {
  id: ServiceId;
  title: string;
  /** One line under the title. */
  summary: string;
  /** Who the package is for. */
  forWho: string;
  /** 4 to 5 concrete things the client gets. */
  deliverables: readonly string[];
  /** Typical timeline, e.g. "5–10 working days". */
  timeline: string;
  /** TODO(prices): starting price in rupees, or null for "Custom quote". */
  startingAtINR: number | null;
};

export const SERVICES: readonly Service[] = [
  {
    id: 'financial-model',
    title: 'Financial Model, DCF & Excel Analysis',
    summary: 'Investor-ready models built from annual reports and concalls, not templates.',
    forWho:
      'Founders raising a round, investors and analysts screening a stock, and SMEs that need clean Excel reporting.',
    deliverables: [
      'Three-statement model (P&L, balance sheet, cash flow) with linked schedules',
      'DCF valuation with WACC build-up and sensitivity tables',
      'Scenario toggles (base, bull, bear) on one assumptions sheet',
      'Dashboard of the key ratios and charts, ready to paste into a deck',
      'A walkthrough call and a notes tab explaining every assumption',
    ],
    timeline: '5–10 working days',
    startingAtINR: null, // TODO(prices)
  },
  {
    id: 'web-build',
    title: 'Website or Web App Build',
    summary: 'Vibe-coded with AI, reviewed by hand, live fast on a modern stack.',
    forWho:
      'Founders, creators and small businesses who need a fast, good-looking site or a simple app without an agency budget.',
    deliverables: [
      'Responsive site or app in Next.js and Tailwind, deployed on Vercel',
      'Up to 5 pages or core screens, with copy help',
      'Contact form, analytics and basic SEO (metadata, sitemap, share images)',
      'Your own domain connected, with HTTPS',
      'A handover guide so you can edit content yourself',
    ],
    timeline: '1–2 weeks',
    startingAtINR: null, // TODO(prices)
  },
  {
    id: 'ai-workflow',
    title: 'AI Workflow & Automation Setup',
    summary: 'Hand the repetitive work to AI: research, reports, inboxes and data entry.',
    forWho: 'Teams and solo operators losing hours each week to copy-paste, reporting or manual research.',
    deliverables: [
      'A short audit of where your hours go and what to automate first',
      'One or two working automations (e.g. report generation, lead research, inbox triage)',
      'Prompts and tools set up in your accounts (Claude, ChatGPT, Zapier, Google Workspace)',
      'Guardrails: human review steps and cost limits',
      'A recorded walkthrough and two weeks of fixes',
    ],
    timeline: '1–3 weeks',
    startingAtINR: null, // TODO(prices)
  },
];

/** The ids the brief form accepts, plus "not sure yet". */
export const PACKAGE_OPTIONS = [
  ...SERVICES.map((s) => ({ value: s.id as string, label: s.title })),
  { value: 'not-sure', label: 'Not sure yet' },
];

export function serviceTitle(id: string): string {
  return PACKAGE_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

export function formatStartingPrice(service: Service): string {
  if (service.startingAtINR === null) return 'Custom quote';
  return `Starting at ₹${service.startingAtINR.toLocaleString('en-IN')}`;
}
