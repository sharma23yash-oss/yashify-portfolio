/**
 * Writes the YGL market briefs into Notion. Server only. Called by app/api/market-brief/route.ts.
 *
 * Daily page "YGL Daily Market Brief – 2026-11-06", two sections:
 *   open    "Pre-market":   the previous session's close, the overnight US close, currency and
 *                           commodities, and the morning's headlines
 *   close   "Market close": the day's closes, sectors, top Nifty 50 gainers and losers, currency
 *                           and commodities, headlines, and Tomorrow's watchlist
 * Weekly page "YGL Weekly Market Strategy – 2026-11-08" (named after the Sunday that ends the week):
 *   weekly  "Week in review": the week's change for indices, sectors and Nifty 50 stocks, and
 *                           Next week's watchlist
 *
 * The watchlist is news and data, never a forecast: "stocks to watch", trade-setup and outlook
 * stories from Business Standard, Mint and The Economic Times (linked to the source), plus the Nifty 50
 * stocks that closed at a 52-week high or low.
 *
 * Each page also gets three columns the website reads for its cards: Summary, Nifty % and Watchlist.
 * They are added to the database automatically the first time.
 *
 * A page is found by its title and created if it does not exist. A section is added once and skipped
 * after that; `force` replaces a section this job wrote earlier. Text you add to a page is never changed.
 * Every figure comes from lib/market-data.ts; no text is written by AI.
 */

import {
  Client,
  collectPaginatedAPI,
  extractDatabaseId,
  isFullBlock,
  isFullDatabase,
  isFullPage,
  type BlockObjectRequest,
  type PageObjectResponse,
} from '@notionhq/client';
import {
  getDaily,
  getHeadlines,
  getNifty50,
  getWatchNews,
  mapLimit,
  quoteBefore,
  quoteOn,
  quoteSpan,
  yearExtreme,
  type Headline,
  type Quote,
  type Series,
} from './market-data';
import {
  DAILY_PREFIX,
  DATE_PROPERTY,
  NIFTY_PROPERTY,
  PUBLISHED,
  STATUS_PROPERTY,
  SUMMARY_PROPERTY,
  WATCHLIST_PROPERTY,
  WEEKLY_PREFIX,
} from './notion';

export type Session = 'open' | 'close' | 'weekly';

const MARKERS: Record<Session, string> = { open: 'Pre-market', close: 'Market close', weekly: 'Week in review' };

const notion = new Client({ auth: process.env.NOTION_TOKEN, timeoutMs: 20_000 });

/* ------------------------------- symbols ------------------------------- */

type Ticker = readonly [label: string, symbol: string];

const INDIA: Ticker[] = [
  ['Nifty 50', '^NSEI'],
  ['Sensex', '^BSESN'],
  ['Nifty Bank', '^NSEBANK'],
  ['India VIX', '^INDIAVIX'],
];
const SECTORS: Ticker[] = [
  ['Nifty IT', '^CNXIT'],
  ['Nifty Pharma', '^CNXPHARMA'],
  ['Nifty Auto', '^CNXAUTO'],
  ['Nifty FMCG', '^CNXFMCG'],
  ['Nifty Metal', '^CNXMETAL'],
  ['Nifty Realty', '^CNXREALTY'],
  ['Nifty Energy', '^CNXENERGY'],
];
const US: Ticker[] = [
  ['S&P 500', '^GSPC'],
  ['Nasdaq Composite', '^IXIC'],
  ['Dow Jones', '^DJI'],
];
const MACRO: Ticker[] = [
  ['USD/INR', 'INR=X'],
  ['Brent crude ($/bbl)', 'BZ=F'],
  ['Gold ($/oz)', 'GC=F'],
];

/* ------------------------------ formatting ----------------------------- */

const num = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number, suffix = '') => `${n >= 0 ? '+' : '−'}${num(Math.abs(n))}${suffix}`;
const pct = (n: number) => signed(n, '%');
const upDown = (n: number) => (n >= 0 ? 'up' : 'down');
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const longDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });

/** Today's date in India, YYYY-MM-DD. */
export function istToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const nextDay = (iso: string) => addDays(iso, 1);

/** Monday to Friday of the week holding `date`, and the Sunday that ends it (the weekly page's name). */
export function weekOf(date: string) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const monday = addDays(date, -((weekday + 6) % 7));
  return { monday, friday: addDays(monday, 4), sunday: addDays(monday, 6) };
}

/** "2–6 Nov 2026", or "28 Sept – 2 Oct 2026" across months. */
function weekLabel(monday: string, friday: string) {
  const sameMonth = monday.slice(0, 7) === friday.slice(0, 7);
  return sameMonth
    ? `${fmt(monday, { day: 'numeric' })}–${longDate(friday)}`
    : `${fmt(monday, { day: 'numeric', month: 'short' })} – ${longDate(friday)}`;
}

/* ---------------------------- Notion blocks ---------------------------- */

type RichText = {
  type: 'text';
  text: { content: string; link?: { url: string } };
  annotations?: { bold?: boolean; italic?: boolean; color?: 'gray' };
};

const text = (content: string, opts: { bold?: boolean; italic?: boolean; gray?: boolean; url?: string } = {}): RichText => ({
  type: 'text',
  text: { content, ...(opts.url ? { link: { url: opts.url } } : {}) },
  annotations: { bold: opts.bold, italic: opts.italic, ...(opts.gray ? { color: 'gray' as const } : {}) },
});

const heading2 = (content: string): BlockObjectRequest => ({ type: 'heading_2', heading_2: { rich_text: [text(content)] } });
const heading3 = (content: string): BlockObjectRequest => ({ type: 'heading_3', heading_3: { rich_text: [text(content)] } });
const paragraph = (...parts: RichText[]): BlockObjectRequest => ({ type: 'paragraph', paragraph: { rich_text: parts } });
const bullet = (...parts: RichText[]): BlockObjectRequest => ({
  type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: parts },
});
const divider = (): BlockObjectRequest => ({ type: 'divider', divider: {} });

function table(header: string[], rows: string[][]): BlockObjectRequest {
  return {
    type: 'table',
    table: {
      table_width: header.length,
      has_column_header: true,
      has_row_header: false,
      children: [header, ...rows].map((cells, r) => ({
        type: 'table_row' as const,
        table_row: { cells: cells.map((cell) => [text(cell, { bold: r === 0 })]) },
      })),
    },
  };
}

const quoteRows = (quotes: (Quote | null)[]) =>
  quotes.filter((q): q is Quote => q !== null).map((q) => [q.label, num(q.close), signed(q.change), pct(q.pct)]);
const QUOTE_HEADER = ['', 'Close', 'Change', '% Change'];
const stockRows = (list: Quote[]) => list.map((q) => [q.label, num(q.close), pct(q.pct)]);

function headlineBlocks(headlines: Headline[]): BlockObjectRequest[] {
  if (!headlines.length) return [];
  return [heading3('Headlines'), ...headlines.map((h) => bullet(text(h.title, { url: h.url })))];
}

/** What to keep an eye on next. News and data only; never a prediction. */
export type Watch = { news: Headline[]; highs: string[]; lows: string[] };

function watchBlocks(title: string, watch: Watch): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [
    heading3(title),
    paragraph(text('News and data worth a look before the next session. Not a prediction or a recommendation.', { italic: true, gray: true })),
  ];
  for (const h of watch.news) blocks.push(bullet(text(h.title, { url: h.url }), text(` · ${h.source}`, { gray: true })));
  if (watch.highs.length) blocks.push(bullet(text('At a 52-week high: ', { bold: true }), text(watch.highs.join(', '))));
  if (watch.lows.length) blocks.push(bullet(text('At a 52-week low: ', { bold: true }), text(watch.lows.join(', '))));
  if (!watch.news.length && !watch.highs.length && !watch.lows.length) {
    blocks.push(paragraph(text('No Nifty 50 stock closed at a 52-week high or low.')));
  }
  return blocks;
}

function sourceNote(withNews: boolean): BlockObjectRequest {
  return paragraph(
    text(
      `Prices: Yahoo Finance (may differ slightly from NSE's official closes).${withNews ? ' News: Business Standard, Mint and The Economic Times.' : ''} Compiled automatically; not investment advice.`,
      { italic: true, gray: true },
    ),
  );
}

/* ------------------------------ the data ------------------------------- */

/** Yahoo history long enough to reach `date`. */
function rangeFor(date: string): string {
  const days = (Date.now() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000;
  return days < 20 ? '1mo' : days < 80 ? '3mo' : days < 170 ? '6mo' : '1y';
}

async function loadSeries(tickers: Ticker[], range: string): Promise<Map<string, Series>> {
  const results = await mapLimit([...tickers], 6, ([, symbol]) => getDaily(symbol, range));
  const map = new Map<string, Series>();
  results.forEach((series, i) => {
    if (series) map.set(tickers[i][0], series);
  });
  return map;
}

function quotes(tickers: Ticker[], series: Map<string, Series>, pick: (label: string, s: Series) => Quote | null) {
  return tickers.map(([label]) => {
    const s = series.get(label);
    return s ? pick(label, s) : null;
  });
}

/** Every Nifty 50 member with a year of daily closes (a year, so 52-week highs and lows can be read). */
async function loadStocks(): Promise<{ name: string; series: Series }[]> {
  const members = await getNifty50().catch((error: Error) => {
    console.warn(`market-brief: Nifty 50 list skipped: ${error.message}`);
    return [];
  });
  const loaded = await mapLimit(members, 8, async (m) => ({ name: m.name, series: await getDaily(`${m.symbol}.NS`, '1y') }));
  return loaded.filter((s): s is { name: string; series: Series } => s !== null);
}

function extremes(stocks: { name: string; series: Series }[], date: string) {
  const highs: string[] = [];
  const lows: string[] = [];
  for (const s of stocks) {
    const mark = yearExtreme(s.series, date);
    if (mark === 'high') highs.push(s.name);
    if (mark === 'low') lows.push(s.name);
  }
  return { highs, lows };
}

async function quietly<T>(what: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.warn(`market-brief: ${what} skipped: ${(error as Error).message}`);
    return [];
  }
}

export type Built = { blocks: BlockObjectRequest[]; summary: string; niftyPct: number | null; watch: Watch | null };

/** The "Market close" section for `date`. `withNews` is false when filling in past days (old news is gone). */
export async function buildClose(date: string, withNews: boolean): Promise<Built> {
  const range = rangeFor(date);
  const [india, sectors, macro, stocks, headlines, watchNews] = await Promise.all([
    loadSeries(INDIA, range),
    loadSeries(SECTORS, range),
    loadSeries(MACRO, range),
    loadStocks(),
    withNews ? quietly('headlines', () => getHeadlines(5, 10)) : Promise.resolve([]),
    withNews ? quietly('watchlist news', () => getWatchNews(6, 20)) : Promise.resolve([]),
  ]);

  const indiaQ = quotes(INDIA, india, (label, s) => quoteOn(label, s, date));
  const nifty = indiaQ[0];
  if (!nifty) {
    const summary = `NSE did not trade on ${longDate(date)}, so there is no closing data.`;
    return {
      blocks: [heading2(`${MARKERS.close} · ${longDate(date)}`), paragraph(text(summary)), divider()],
      summary,
      niftyPct: null,
      watch: null,
    };
  }

  const sectorQ = quotes(SECTORS, sectors, (label, s) => quoteOn(label, s, date))
    .filter((q): q is Quote => q !== null)
    .sort((a, b) => b.pct - a.pct);
  // Currencies and commodities trade on other calendars: take their latest close on or before the day.
  const macroQ = quotes(MACRO, macro, (label, s) => quoteBefore(label, s, nextDay(date)));

  const stockQ = stocks.map((s) => quoteOn(s.name, s.series, date)).filter((q): q is Quote => q !== null);
  const byPct = [...stockQ].sort((a, b) => b.pct - a.pct);
  const gainers = byPct.filter((q) => q.pct > 0).slice(0, 5);
  const losers = byPct.filter((q) => q.pct < 0).reverse().slice(0, 5);
  const advancers = stockQ.filter((q) => q.pct > 0).length;
  const watch: Watch = { news: watchNews, ...extremes(stocks, date) };

  const sensex = indiaQ[1];
  const summary = [
    `Nifty 50 closed at ${num(nifty.close)}, ${upDown(nifty.change)} ${num(Math.abs(nifty.pct))}% (${signed(nifty.change)} points)`,
    sensex ? `, and the Sensex ended at ${num(sensex.close)} (${pct(sensex.pct)}).` : '.',
    stockQ.length ? ` ${advancers} of ${stockQ.length} Nifty 50 stocks rose.` : '',
    sectorQ.length > 1
      ? ` Best sector: ${sectorQ[0].label} (${pct(sectorQ[0].pct)}); weakest: ${sectorQ.at(-1)!.label} (${pct(sectorQ.at(-1)!.pct)}).`
      : '',
  ].join('');

  const blocks: BlockObjectRequest[] = [
    heading2(`${MARKERS.close} · ${longDate(date)}`),
    paragraph(text(summary)),
    heading3('Indices'),
    table(QUOTE_HEADER, quoteRows(indiaQ)),
  ];
  if (sectorQ.length) blocks.push(heading3('Sectors'), table(QUOTE_HEADER, quoteRows(sectorQ)));
  if (gainers.length) blocks.push(heading3('Top Nifty 50 gainers'), table(['Stock', 'Close (₹)', '% Change'], stockRows(gainers)));
  if (losers.length) blocks.push(heading3('Top Nifty 50 losers'), table(['Stock', 'Close (₹)', '% Change'], stockRows(losers)));
  const macroRows = quoteRows(macroQ);
  if (macroRows.length) blocks.push(heading3('Currency & commodities'), table(QUOTE_HEADER, macroRows));
  blocks.push(...headlineBlocks(headlines), ...watchBlocks("Tomorrow's watchlist", watch));
  blocks.push(sourceNote(headlines.length + watchNews.length > 0), divider());
  return { blocks, summary, niftyPct: nifty.pct, watch };
}

/** The "Pre-market" section for the morning of `date`. */
export async function buildOpen(date: string): Promise<Built> {
  const range = rangeFor(date);
  const [india, us, macro, headlines] = await Promise.all([
    loadSeries(INDIA, range),
    loadSeries(US, range),
    loadSeries(MACRO, range),
    quietly('headlines', () => getHeadlines(5, 14)),
  ]);
  const indiaQ = quotes(INDIA, india, (label, s) => quoteBefore(label, s, date));
  const usQ = quotes(US, us, (label, s) => quoteBefore(label, s, date));
  const macroQ = quotes(MACRO, macro, (label, s) => quoteBefore(label, s, nextDay(date)));

  const nifty = indiaQ[0];
  const sp = usQ[0];
  const nasdaq = usQ[1];
  const summary = [
    nifty
      ? `In the previous session (${longDate(nifty.date)}), Nifty 50 closed at ${num(nifty.close)}, ${upDown(nifty.change)} ${num(Math.abs(nifty.pct))}%.`
      : '',
    sp && nasdaq ? ` Overnight in the US, the S&P 500 moved ${pct(sp.pct)} and the Nasdaq ${pct(nasdaq.pct)}.` : '',
  ]
    .join('')
    .trim();

  const blocks: BlockObjectRequest[] = [heading2(`${MARKERS.open} · ${longDate(date)}`)];
  if (summary) blocks.push(paragraph(text(summary)));
  const indiaRows = quoteRows(indiaQ);
  if (indiaRows.length) blocks.push(heading3('India: previous close'), table(QUOTE_HEADER, indiaRows));
  const usRows = quoteRows(usQ);
  if (usRows.length) blocks.push(heading3('US markets overnight'), table(QUOTE_HEADER, usRows));
  const macroRows = quoteRows(macroQ);
  if (macroRows.length) blocks.push(heading3('Currency & commodities (latest)'), table(QUOTE_HEADER, macroRows));
  blocks.push(...headlineBlocks(headlines), sourceNote(headlines.length > 0), divider());
  return { blocks, summary, niftyPct: null, watch: null };
}

/** The "Week in review" for the week holding `date` (Monday to Friday, up to today). */
export async function buildWeekly(date: string, withNews: boolean): Promise<Built> {
  const { monday, friday } = weekOf(date);
  const end = friday < istToday() ? friday : istToday();
  const range = rangeFor(monday);
  const label = weekLabel(monday, friday);
  const [india, sectors, macro, stocks, watchNews] = await Promise.all([
    loadSeries(INDIA, range),
    loadSeries(SECTORS, range),
    loadSeries(MACRO, range),
    loadStocks(),
    withNews ? quietly('watchlist news', () => getWatchNews(6, 72)) : Promise.resolve([]),
  ]);

  const span = (label: string, s: Series) => quoteSpan(label, s, monday, end);
  const indiaQ = quotes(INDIA, india, span);
  const nifty = indiaQ[0];
  if (!nifty) {
    const summary = `NSE did not trade in the week of ${label}.`;
    return { blocks: [heading2(`${MARKERS.weekly} · ${label}`), paragraph(text(summary)), divider()], summary, niftyPct: null, watch: null };
  }

  const sectorQ = quotes(SECTORS, sectors, span)
    .filter((q): q is Quote => q !== null)
    .sort((a, b) => b.pct - a.pct);
  const macroQ = quotes(MACRO, macro, span);
  const stockQ = stocks.map((s) => span(s.name, s.series)).filter((q): q is Quote => q !== null);
  const byPct = [...stockQ].sort((a, b) => b.pct - a.pct);
  const gainers = byPct.filter((q) => q.pct > 0).slice(0, 5);
  const losers = byPct.filter((q) => q.pct < 0).reverse().slice(0, 5);
  const advancers = stockQ.filter((q) => q.pct > 0).length;
  // 52-week highs and lows as of the week's last session.
  const watch: Watch = { news: watchNews, ...extremes(stocks, nifty.date) };

  const sensex = indiaQ[1];
  const summary = [
    `In the week of ${label}, Nifty 50 ${nifty.change >= 0 ? 'rose' : 'fell'} ${num(Math.abs(nifty.pct))}% to ${num(nifty.close)}`,
    sensex ? `, and the Sensex ${sensex.change >= 0 ? 'rose' : 'fell'} ${num(Math.abs(sensex.pct))}% to ${num(sensex.close)}.` : '.',
    stockQ.length ? ` ${advancers} of ${stockQ.length} Nifty 50 stocks gained over the week.` : '',
    sectorQ.length > 1
      ? ` Best sector: ${sectorQ[0].label} (${pct(sectorQ[0].pct)}); weakest: ${sectorQ.at(-1)!.label} (${pct(sectorQ.at(-1)!.pct)}).`
      : '',
  ].join('');

  const WEEK_HEADER = ['', 'Week close', 'Change', '% Change'];
  const blocks: BlockObjectRequest[] = [
    heading2(`${MARKERS.weekly} · ${label}`),
    paragraph(text(summary)),
    heading3('Indices this week'),
    table(WEEK_HEADER, quoteRows(indiaQ)),
  ];
  if (sectorQ.length) blocks.push(heading3('Sectors this week'), table(WEEK_HEADER, quoteRows(sectorQ)));
  if (gainers.length) blocks.push(heading3('Top Nifty 50 gainers this week'), table(['Stock', 'Close (₹)', '% Change'], stockRows(gainers)));
  if (losers.length) blocks.push(heading3('Top Nifty 50 losers this week'), table(['Stock', 'Close (₹)', '% Change'], stockRows(losers)));
  const macroRows = quoteRows(macroQ);
  if (macroRows.length) blocks.push(heading3('Currency & commodities this week'), table(WEEK_HEADER, macroRows));
  blocks.push(...watchBlocks("Next week's watchlist", watch), sourceNote(watchNews.length > 0), divider());
  return { blocks, summary, niftyPct: nifty.pct, watch };
}

/* ---------------------------- writing to Notion ---------------------------- */

let sourceId: string | null = null;

/** The database's data source, with the three card columns added if they are missing. */
async function dataSource(): Promise<string> {
  if (sourceId) return sourceId;
  const id = process.env.NOTION_DATABASE_ID;
  if (!process.env.NOTION_TOKEN || !id) throw new Error('NOTION_TOKEN or NOTION_DATABASE_ID is missing.');
  const database = await notion.databases.retrieve({ database_id: extractDatabaseId(id) ?? id });
  if (!isFullDatabase(database) || !database.data_sources.length) throw new Error('Notion did not return the database.');
  const source = database.data_sources[0].id;

  const current = await notion.dataSources.retrieve({ data_source_id: source });
  const have = 'properties' in current ? Object.keys(current.properties) : [];
  const missing = {
    ...(have.includes(SUMMARY_PROPERTY) ? {} : { [SUMMARY_PROPERTY]: { rich_text: {} } }),
    ...(have.includes(NIFTY_PROPERTY) ? {} : { [NIFTY_PROPERTY]: { number: { format: 'number' as const } } }),
    ...(have.includes(WATCHLIST_PROPERTY) ? {} : { [WATCHLIST_PROPERTY]: { rich_text: {} } }),
  };
  if (Object.keys(missing).length) await notion.dataSources.update({ data_source_id: source, properties: missing });
  sourceId = source;
  return source;
}

/** The page called `title`, created (Published, dated `date`) if it does not exist. Fills in an empty date. */
async function pageFor(title: string, date: string, dryRun: boolean): Promise<{ page: PageObjectResponse | null; created: boolean }> {
  const source = await dataSource();
  const found = await notion.dataSources.query({
    data_source_id: source,
    filter: { property: 'title', title: { equals: title } },
    page_size: 5,
  });
  const page = found.results.filter(isFullPage)[0];
  if (page) {
    const dateProp = page.properties[DATE_PROPERTY];
    if (!dryRun && dateProp?.type === 'date' && !dateProp.date) {
      await notion.pages.update({ page_id: page.id, properties: { [DATE_PROPERTY]: { date: { start: date } } } });
    }
    return { page, created: false };
  }
  if (dryRun) return { page: null, created: true };
  const created = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: source },
    properties: {
      title: { title: [{ type: 'text', text: { content: title } }] },
      [STATUS_PROPERTY]: { status: { name: PUBLISHED } },
      [DATE_PROPERTY]: { date: { start: date } },
    },
  });
  if (!isFullPage(created)) throw new Error('Notion did not return the new page.');
  return { page: created, created: true };
}

/** The ids of a section this job wrote: from its heading to the divider that closes it. */
async function sectionBlocks(pageId: string, session: Session): Promise<string[] | null> {
  const blocks = (await collectPaginatedAPI(notion.blocks.children.list, { block_id: pageId })).filter(isFullBlock);
  const start = blocks.findIndex(
    (b) => b.type === 'heading_2' && b.heading_2.rich_text.map((r) => r.plain_text).join('').startsWith(MARKERS[session]),
  );
  if (start < 0) return null;
  let end = start + 1;
  while (end < blocks.length && blocks[end].type !== 'divider' && blocks[end].type !== 'heading_2') end++;
  if (end < blocks.length && blocks[end].type === 'divider') end++; // the divider belongs to the section
  return blocks.slice(start, end).map((b) => b.id);
}

const richText = (content: string, url?: string) => ({ type: 'text' as const, text: { content: content.slice(0, 2000), ...(url ? { link: { url } } : {}) } });

/** The Watchlist column: one line per item, news linked to its source. */
function watchProperty(watch: Watch | null) {
  if (!watch) return [];
  const parts = watch.news.flatMap((h) => [richText(h.title, h.url), richText(` · ${h.source}\n`)]);
  if (watch.highs.length) parts.push(richText(`52-week high: ${watch.highs.join(', ')}\n`));
  if (watch.lows.length) parts.push(richText(`52-week low: ${watch.lows.join(', ')}\n`));
  return parts.slice(0, 100);
}

function plainText(page: PageObjectResponse, name: string): string {
  const prop = page.properties[name];
  return prop?.type === 'rich_text' ? prop.rich_text.map((t) => t.plain_text).join('') : '';
}

export type WriteResult = {
  title: string;
  session: Session;
  status: 'written' | 'skipped' | 'dry-run';
  pageCreated: boolean;
  summary: string;
  blocks?: BlockObjectRequest[];
};

/**
 * Adds one section for `date` (for `weekly`, any day of that week).
 * News is added only for the current day or week, because old news cannot be recovered.
 * `dryRun` writes nothing and returns the blocks; `force` replaces a section this job wrote before.
 */
export async function writeSection(
  session: Session,
  date: string,
  { dryRun = false, force = false, withNews }: { dryRun?: boolean; force?: boolean; withNews?: boolean } = {},
): Promise<WriteResult> {
  const today = istToday();
  const week = weekOf(date);
  const isCurrent = session === 'weekly' ? week.monday <= today && today <= week.sunday : date === today;
  const news = withNews ?? isCurrent;
  const title = session === 'weekly' ? `${WEEKLY_PREFIX}${week.sunday}` : `${DAILY_PREFIX}${date}`;
  const pageDate = session === 'weekly' ? week.sunday : date;

  const { page, created } = await pageFor(title, pageDate, dryRun);
  const existing = page ? await sectionBlocks(page.id, session) : null;
  if (existing && !force) {
    return { title, session, status: 'skipped', pageCreated: false, summary: `${MARKERS[session]} is already on the page.` };
  }

  const built =
    session === 'open' ? await buildOpen(date) : session === 'close' ? await buildClose(date, news) : await buildWeekly(date, news);
  if (dryRun || !page) {
    return { title, session, status: 'dry-run', pageCreated: created, summary: built.summary, blocks: built.blocks };
  }

  if (existing) for (const id of existing) await notion.blocks.delete({ block_id: id });
  await notion.blocks.children.append({ block_id: page.id, children: built.blocks });

  // The card columns. The morning summary only fills an empty Summary; the close or weekly one replaces it.
  const properties: Parameters<typeof notion.pages.update>[0]['properties'] = {};
  if (session !== 'open' || !plainText(page, SUMMARY_PROPERTY)) properties[SUMMARY_PROPERTY] = { rich_text: [richText(built.summary)] };
  if (built.niftyPct !== null) properties[NIFTY_PROPERTY] = { number: Math.round(built.niftyPct * 100) / 100 };
  if (session !== 'open') properties[WATCHLIST_PROPERTY] = { rich_text: watchProperty(built.watch) };
  if (Object.keys(properties).length) await notion.pages.update({ page_id: page.id, properties });

  return { title, session, status: 'written', pageCreated: created, summary: built.summary };
}
