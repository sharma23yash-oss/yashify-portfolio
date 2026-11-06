'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Binoculars, CalendarRange, Newspaper, type LucideIcon } from 'lucide-react';
import { CARD, CARD_HOVER, FOCUS, FOCUS_ON_DARK, RULE_STYLE, cn } from '@/components/ui/tokens';
import type { Article } from '@/lib/notion';

/**
 * The articles page, as three tabs: Daily briefs, Weekly updates and Stocks to watch.
 * The open tab is kept in the address (#daily, #weekly, #watch) so each one can be linked to,
 * which is how the Newsletters panel on the home page opens a particular tab.
 */

type TabId = 'daily' | 'weekly' | 'watch';
const TABS: { id: TabId; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'daily', label: 'Daily briefs', icon: Newspaper, blurb: 'Pre-market and closing numbers for every trading day.' },
  { id: 'weekly', label: 'Weekly updates', icon: CalendarRange, blurb: "The week in review and next week's watchlist, every Friday after the close." },
  { id: 'watch', label: 'Stocks to watch', icon: Binoculars, blurb: 'News and 52-week highs and lows worth a look before the next session. Not a recommendation.' },
];
const isTab = (value: string): value is TabId => TABS.some((t) => t.id === value);

/* ------------------------------ helpers ------------------------------ */

function dayLabel(iso: string | null, opts: Intl.DateTimeFormatOptions) {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return { day, label: new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(parsed) };
}

/** The Monday-to-Friday span of a weekly page, whose date is the Sunday that ends the week. */
function weekSpan(sunday: string | null) {
  if (!sunday) return null;
  const end = Date.parse(`${sunday.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(end)) return null;
  const f = (ms: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { ...o, timeZone: 'UTC' }).format(new Date(ms));
  return `${f(end - 6 * 86_400_000, { day: 'numeric', month: 'short' })} – ${f(end - 2 * 86_400_000, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;

function PctChip({ value, label, onDark = false }: { value: number | null; label: string; onDark?: boolean }) {
  if (value === null) return null;
  const up = value >= 0;
  const tone = onDark
    ? up
      ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30'
      : 'bg-rose-400/15 text-rose-100 ring-1 ring-rose-300/30'
    : up
      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
      : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold normal-case tracking-normal tabular-nums', tone)}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      {label} {signedPct(value)}
    </span>
  );
}

/** A decorative row of candles for the lead card. */
function Candles() {
  const bars = [
    [30, 52, 36, 46], [40, 60, 44, 56], [34, 58, 52, 40], [38, 66, 42, 62], [52, 74, 58, 70],
    [48, 70, 66, 52], [54, 82, 56, 78], [64, 88, 74, 84], [60, 86, 80, 66], [66, 94, 70, 90],
  ];
  return (
    <svg viewBox="0 0 220 100" className="h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      {[20, 45, 70].map((y) => (
        <line key={y} x1="0" x2="220" y1={y} y2={y} stroke="white" strokeOpacity="0.08" strokeDasharray="3 5" />
      ))}
      {bars.map(([low, high, open, close], i) => {
        const x = 12 + i * 21;
        const color = close >= open ? '#34D399' : '#FB7185';
        return (
          <g key={i} opacity={0.3 + i * 0.06}>
            <line x1={x} x2={x} y1={100 - high} y2={100 - low} stroke={color} strokeWidth="1.4" />
            <rect x={x - 4} y={100 - Math.max(open, close)} width="8" height={Math.max(3, Math.abs(close - open))} rx="1.5" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- cards ------------------------------- */

function LeadCard({ article, kicker }: { article: Article; kicker: string }) {
  const weekly = article.kind === 'weekly';
  const span = weekly ? weekSpan(article.date) : null;
  const date = weekly ? null : dayLabel(article.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Link
      href={`/newsletters/${article.id}`}
      className={cn(
        'group relative isolate col-span-full block overflow-hidden rounded-3xl bg-[#0B1F3A] p-6 text-white shadow-[0_30px_60px_-30px_rgba(11,31,58,0.75)] sm:p-9',
        FOCUS,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(20,184,166,0.35),transparent_55%),radial-gradient(circle_at_10%_110%,rgba(52,211,153,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute -right-4 bottom-0 -z-10 h-28 w-64 opacity-70 sm:h-40 sm:w-96 sm:opacity-90">
        <Candles />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          {kicker}
        </span>
        <PctChip value={article.niftyPct} label={weekly ? 'Nifty this week' : 'Nifty'} onDark />
      </div>
      <h3 className="mt-4 max-w-2xl text-balance font-serif text-2xl font-semibold leading-tight sm:text-4xl">
        {span ? `Week of ${span}` : (date?.label ?? article.title)}
      </h3>
      {article.summary ? <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-slate-200">{article.summary}</p> : null}
      <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1F3A] transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none">
        Read the {weekly ? 'weekly update' : 'brief'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const weekly = article.kind === 'weekly';
  const other = article.kind === 'other';
  const date = dayLabel(article.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const span = weekly ? weekSpan(article.date) : null;
  const heading = other ? article.title : span ? `Week of ${span}` : (date?.label ?? article.title);
  return (
    <Link
      href={`/newsletters/${article.id}`}
      className={cn(
        CARD,
        CARD_HOVER,
        'group relative flex h-full flex-col overflow-hidden p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none sm:p-6',
        FOCUS,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={RULE_STYLE} aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {weekly ? 'Weekly update' : other ? 'Article' : 'Daily brief'}
        </span>
        <PctChip value={article.niftyPct} label={weekly ? 'Week' : 'Nifty'} />
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-[#0B1F3A]">
        {date && !weekly && !other ? <time dateTime={date.day}>{heading}</time> : heading}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-700">
        {article.summary ?? (other ? (date?.label ?? '') : 'Open the brief for the full numbers.')}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A]">
        Read
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

function WatchCard({ article }: { article: Article }) {
  const weekly = article.kind === 'weekly';
  const date = dayLabel(article.date, { weekday: 'short', day: 'numeric', month: 'short' });
  const news = article.watchlist.filter((item) => item.href);
  const flags = article.watchlist.filter((item) => !item.href);
  return (
    <article className={cn(CARD, 'flex h-full flex-col p-5 sm:p-6')}>
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{weekly ? 'For next week' : 'For the next session'}</span>
        <PctChip value={article.niftyPct} label={weekly ? 'Week' : 'Nifty'} />
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-[#0B1F3A]">
        {weekly ? `After the week of ${weekSpan(article.date) ?? ''}` : `After the close, ${date?.label ?? ''}`}
      </h3>
      {news.length ? (
        <ul role="list" className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {news.map((item) => {
            const at = item.text.lastIndexOf(' · ');
            const title = at > 0 ? item.text.slice(0, at) : item.text;
            const source = at > 0 ? item.text.slice(at + 3) : null;
            return (
              <li key={item.href} className="text-sm leading-snug">
                <a
                  href={item.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('rounded-sm font-medium text-slate-900 underline-offset-2 hover:text-[#0B1F3A] hover:underline', FOCUS)}
                >
                  {title}
                  <ArrowUpRight className="ml-0.5 inline h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {source ? <span className="mt-0.5 block text-xs text-slate-600">{source}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {flags.length ? (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {flags.map((flag) => {
            const at = flag.text.indexOf(': ');
            const label = at > 0 ? flag.text.slice(0, at) : flag.text;
            const names = at > 0 ? flag.text.slice(at + 2) : '';
            const high = /high/i.test(label);
            return (
              <p key={flag.text} className="text-sm leading-snug text-slate-800">
                <span
                  className={cn(
                    'mr-2 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                    high ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800',
                  )}
                >
                  {label}
                </span>
                {names}
              </p>
            );
          })}
        </div>
      ) : null}
      <div className="flex-1" />
      <Link
        href={`/newsletters/${article.id}`}
        className={cn('mt-5 inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-[#0B1F3A] hover:underline', FOCUS)}
      >
        Full {weekly ? 'weekly update' : 'brief'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={cn(CARD, 'col-span-full px-5 py-6 text-slate-700')}>{children}</p>;
}

/* -------------------------------- tabs -------------------------------- */

export function NewsletterTabs({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState<TabId>('daily');
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const base = useId();

  // Open the tab named in the address, and follow it when it changes (for example the back button).
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (isTab(hash)) setActive(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const select = (id: TabId, focus = false) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
  };

  // Arrow keys move between tabs, as screen-reader users expect of a tab list.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === active);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(TABS[moves[event.key]].id, true);
  };

  const daily = articles.filter((a) => a.kind !== 'weekly');
  const weekly = articles.filter((a) => a.kind === 'weekly');
  // Daily watchlists only: the weekly one repeats Friday's news and is on the weekly page.
  const watch = articles.filter((a) => a.kind === 'daily' && a.watchlist.length > 0).slice(0, 12);
  const counts: Record<TabId, number> = { daily: daily.length, weekly: weekly.length, watch: watch.length };
  const current = TABS.find((t) => t.id === active)!;

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Article types"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-${tab.id}-tab`}
              aria-selected={selected}
              aria-controls={`${base}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={onKeyDown}
              className={cn(
                'inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200',
                selected
                  ? cn('bg-[#0B1F3A] text-white shadow-[0_8px_18px_-10px_rgba(11,31,58,0.7)]', FOCUS_ON_DARK)
                  : cn('text-slate-700 hover:bg-slate-100 hover:text-[#0B1F3A]', FOCUS),
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600')}>
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <section role="tabpanel" id={`${base}-${active}-panel`} aria-labelledby={`${base}-${active}-tab`} tabIndex={0} className={cn('mt-8 rounded-2xl', FOCUS)}>
        <p className="text-sm text-slate-700">{current.blurb}</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active === 'daily' &&
            (daily.length ? (
              <>
                <LeadCard article={daily[0]} kicker="Latest brief" />
                {daily.slice(1).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </>
            ) : (
              <Empty>No daily briefs yet.</Empty>
            ))}

          {active === 'weekly' &&
            (weekly.length ? (
              <>
                <LeadCard article={weekly[0]} kicker="This week" />
                {weekly.slice(1).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </>
            ) : (
              <Empty>The first weekly update is written on Friday after the close.</Empty>
            ))}

          {active === 'watch' &&
            (watch.length ? (
              watch.map((a) => <WatchCard key={a.id} article={a} />)
            ) : (
              <Empty>The watchlist is added to each brief after the close.</Empty>
            ))}
        </div>
      </section>
    </div>
  );
}
