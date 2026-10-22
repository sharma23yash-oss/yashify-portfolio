import type { CSSProperties } from 'react';

/**
 * Design tokens shared by the page and the tab panels. Class strings are written out in full
 * (never assembled from fragments) so Tailwind can see every class.
 */

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const LIFT = { type: 'spring', stiffness: 300, damping: 24 } as const;

export const CARD =
  'rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)]';
export const CARD_HOVER =
  'transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_48px_-20px_rgba(15,23,42,0.28)]';
export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]';
/** Focus ring for controls that sit on a navy surface (the offset must match that surface, not the page). */
export const FOCUS_ON_DARK =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F3A]';
export const ICON_BUTTON =
  'grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-[#0B1F3A] hover:shadow-[0_8px_18px_-10px_rgba(15,23,42,0.35)]';
export const ICON_TILE =
  'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0B1F3A] text-white shadow-[0_10px_20px_-10px_rgba(11,31,58,0.6)]';

/** Medium buttons used by the tab panels (the hero keeps its own larger ones). */
export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(11,31,58,0.65)] transition-colors duration-200 hover:bg-[#14305A] disabled:cursor-not-allowed disabled:opacity-60';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-200 hover:border-[#0B1F3A]/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Text inputs and textareas. Text stays at 16px so iOS does not zoom the page on focus, and the
 * border is slate-500 (4.8:1 on white) so the edge of the field is easy to see.
 */
export const FIELD =
  'block w-full rounded-xl border border-slate-500 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]/30';

export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.2em] text-slate-800';

export const RULE_GRADIENT = 'linear-gradient(90deg, #0B1F3A, #14B8A6 55%, #34D399)';
export const RULE_STYLE: CSSProperties = { backgroundImage: RULE_GRADIENT };

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
