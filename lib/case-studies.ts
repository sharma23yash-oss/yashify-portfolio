/**
 * Case studies for the "Proof" section of /hire.
 *
 * Every entry below is a placeholder. Fill in each TODO, then set `draft: false`.
 * Drafts show (with a "Draft" badge) when you run the site locally and on Vercel preview
 * deployments, but never on the live site, so half-written proof can't go public by accident.
 * If no entry is ready, the whole Proof section is left out of the live page.
 */

export type CaseStudy = {
  id: string;
  title: string;
  /** Short label above the title, e.g. "Financial model". */
  category: string;
  /** What was wrong or missing before. */
  problem: string;
  /** What you built. */
  built: string;
  /** The outcome in one sentence. */
  result: string;
  /** The headline number for the card, e.g. { value: '40%', label: 'faster month-end close' }. */
  metric?: { value: string; label: string };
  /** Optional link to a demo, repo or write-up. */
  href?: string;
  /** true until every TODO is replaced. Drafts never appear on the live site. */
  draft: boolean;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'icici-excel-model',
    category: 'Financial model',
    title: 'ICICI Bank Excel model',
    problem: 'TODO: what question the model had to answer (e.g. valuing ICICI Bank against its private-bank peers).',
    built: 'TODO: what you built (e.g. three-statement model, NIM and credit-cost drivers, DCF / P/B valuation).',
    result: 'TODO: the result, with a real number (e.g. target price ₹X, Y% upside, used in Z).',
    metric: { value: 'TODO', label: 'TODO: what the number measures' },
    draft: true,
  },
  {
    id: 'nse-nifty-book',
    category: 'Research & writing',
    title: 'NSE NIFTY book',
    problem: 'TODO: the gap the book fills (e.g. no beginner-friendly guide to how the NIFTY 50 works).',
    built: 'TODO: what you wrote and how (chapters, data, charts, tools).',
    result: 'TODO: the result, with a real number (e.g. copies sold, readers, rating).',
    metric: { value: 'TODO', label: 'TODO: what the number measures' },
    draft: true,
  },
  {
    id: 'yari-virtual-stock-market',
    category: 'Web app',
    title: 'YARI virtual stock market',
    problem: 'TODO: the problem (e.g. students had no risk-free way to practise trading).',
    built: 'TODO: what you built (stack, features: live prices, portfolios, leaderboards).',
    result: 'TODO: the result, with a real number (e.g. N participants, N trades in an event).',
    metric: { value: 'TODO', label: 'TODO: what the number measures' },
    draft: true,
  },
  {
    id: 'ai-teacher-app',
    category: 'AI app',
    title: 'AI Teacher app',
    problem: 'TODO: the problem (who needed help learning what, and why existing tools fell short).',
    built: 'TODO: what you built (models, prompts, features, how it is delivered).',
    result: 'TODO: the result, with a real number (e.g. N users, N lessons, time saved).',
    metric: { value: 'TODO', label: 'TODO: what the number measures' },
    draft: true,
  },
];
