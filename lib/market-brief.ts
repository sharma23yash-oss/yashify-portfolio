/**
 * Writes the YGL Daily Market Brief into Notion. Server only. Called by app/api/market-brief/route.ts.
 *
 * Two sections per trading day, each added once to that day's page:
 *   open   "Pre-market":   the previous session's close, the overnight US close, currency and
 *                          commodities, and the morning's headlines
 *   close  "Market close": the day's closes, sectors, top Nifty 50 gainers and losers, currency and
 *                          commodities, and the day's headlines
 *
 * The page is found by its title ("YGL Daily Market Brief – 2026-10-30") and created if it does not exist.
 * A section is skipped when the page already has it, and nothing already on the page is changed, so
 * running the job twice, or writing your own notes on the page, is always safe.
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
} from '@notionhq/client';
import {
  getDaily,
  getHeadlines,
  getNifty50,
  mapLimit,
  quoteBefore,
  quoteOn,
  type Headline,
  type Quote,
  type Series,
} from './market-data';
import { DATE_PROPERTY, PUBLISHED, STATUS_PROPERTY } from './notion';

export type Session = 'open' | 'close';

export const TITLE_PREFIX = 'YGL Daily Market Brief – '; // en dash, as in the existing pages
const MARKERS: Record<Session, string> = { open: 'Pre-market', close: 'Market close' };

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
const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Today's date in India, YYYY-MM-DD. */
export function istToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

const nextDay = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/* ---------------------------- Notion blocks ---------------------------- */

type RichText = { type: 'text'; text: { content: string; link?: { url: string } }; annotations?: { bold?: boolean; italic?: boolean; color?: 'gray' } };

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

function headlineBlocks(headlines: Headline[]): BlockObjectRequest[] {
  if (!headlines.length) return [];
  return [heading3('Headlines'), ...headlines.map((h) => bullet(text(h.title, { url: h.url })))];
}

function sourceNote(withHeadlines: boolean): BlockObjectRequest {
  return paragraph(
    text(
      `Prices: Yahoo Finance (may differ slightly from NSE's official closes).${withHeadlines ? ' Headlines: The Economic Times.' : ''} Compiled automatically; not investment advice.`,
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

async function safeHeadlines(withinHours: number): Promise<Headline[]> {
  try {
    return await getHeadlines(5, withinHours);
  } catch (error) {
    console.warn(`market-brief: headlines skipped: ${(error as Error).message}`);
    return [];
  }
}

export type Built = { blocks: BlockObjectRequest[]; summary: string; traded: boolean };

/** The "Market close" section for `date`. `withHeadlines` is false when filling in past days. */
export async function buildClose(date: string, withHeadlines: boolean): Promise<Built> {
  const range = rangeFor(date);
  const [india, sectors, macro, members, headlines] = await Promise.all([
    loadSeries(INDIA, range),
    loadSeries(SECTORS, range),
    loadSeries(MACRO, range),
    getNifty50().catch((error: Error) => {
      console.warn(`market-brief: Nifty 50 list skipped: ${error.message}`);
      return [];
    }),
    withHeadlines ? safeHeadlines(10) : Promise.resolve([]),
  ]);

  const indiaQ = quotes(INDIA, india, (label, s) => quoteOn(label, s, date));
  const nifty = indiaQ[0];
  if (!nifty) {
    const summary = `NSE did not trade on ${longDate(date)}, so there is no closing data.`;
    return { blocks: [heading2(`${MARKERS.close} · ${longDate(date)}`), paragraph(text(summary)), divider()], summary, traded: false };
  }

  const sectorQ = quotes(SECTORS, sectors, (label, s) => quoteOn(label, s, date)).filter((q): q is Quote => q !== null);
  // Currencies and commodities trade on other calendars: take their latest close on or before the day.
  const macroQ = quotes(MACRO, macro, (label, s) => quoteBefore(label, s, nextDay(date)));

  const stockQ = (
    await mapLimit(members, 8, async (m) => quoteOn(m.name, await getDaily(`${m.symbol}.NS`, range), date))
  ).filter((q): q is Quote => q !== null);
  const byPct = [...stockQ].sort((a, b) => b.pct - a.pct);
  const gainers = byPct.filter((q) => q.pct > 0).slice(0, 5);
  const losers = byPct.filter((q) => q.pct < 0).reverse().slice(0, 5);
  const advancers = stockQ.filter((q) => q.pct > 0).length;

  const sensex = indiaQ[1];
  const sectorsSorted = [...sectorQ].sort((a, b) => b.pct - a.pct);
  const parts = [
    `Nifty 50 closed at ${num(nifty.close)}, ${upDown(nifty.change)} ${num(Math.abs(nifty.pct))}% (${signed(nifty.change)} points)`,
    sensex ? `, and the Sensex ended at ${num(sensex.close)} (${pct(sensex.pct)}).` : '.',
    stockQ.length ? ` ${advancers} of ${stockQ.length} Nifty 50 stocks rose.` : '',
    sectorsSorted.length > 1
      ? ` Best sector: ${sectorsSorted[0].label} (${pct(sectorsSorted[0].pct)}); weakest: ${sectorsSorted.at(-1)!.label} (${pct(sectorsSorted.at(-1)!.pct)}).`
      : '',
  ];
  const summary = parts.join('');

  const stockRows = (list: Quote[]) => list.map((q) => [q.label, num(q.close), pct(q.pct)]);
  const blocks: BlockObjectRequest[] = [
    heading2(`${MARKERS.close} · ${longDate(date)}`),
    paragraph(text(summary)),
    heading3('Indices'),
    table(QUOTE_HEADER, quoteRows(indiaQ)),
  ];
  if (sectorsSorted.length) blocks.push(heading3('Sectors'), table(QUOTE_HEADER, quoteRows(sectorsSorted)));
  if (gainers.length) blocks.push(heading3('Top Nifty 50 gainers'), table(['Stock', 'Close (₹)', '% Change'], stockRows(gainers)));
  if (losers.length) blocks.push(heading3('Top Nifty 50 losers'), table(['Stock', 'Close (₹)', '% Change'], stockRows(losers)));
  const macroRows = quoteRows(macroQ);
  if (macroRows.length) blocks.push(heading3('Currency & commodities'), table(QUOTE_HEADER, macroRows));
  blocks.push(...headlineBlocks(headlines), sourceNote(headlines.length > 0), divider());
  return { blocks, summary, traded: true };
}

/** The "Pre-market" section for the morning of `date`. */
export async function buildOpen(date: string): Promise<Built> {
  const range = rangeFor(date);
  const [india, us, macro, headlines] = await Promise.all([
    loadSeries(INDIA, range),
    loadSeries(US, range),
    loadSeries(MACRO, range),
    safeHeadlines(14),
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
  return { blocks, summary, traded: true };
}

/* ---------------------------- writing to Notion ---------------------------- */

async function dataSourceId(): Promise<string> {
  const id = process.env.NOTION_DATABASE_ID;
  if (!process.env.NOTION_TOKEN || !id) throw new Error('NOTION_TOKEN or NOTION_DATABASE_ID is missing.');
  const database = await notion.databases.retrieve({ database_id: extractDatabaseId(id) ?? id });
  if (!isFullDatabase(database) || !database.data_sources.length) throw new Error('Notion did not return the database.');
  return database.data_sources[0].id;
}

/** The brief page for `date`, created (Published, dated) if it does not exist. Fills in an empty date. */
async function pageFor(date: string, dryRun: boolean): Promise<{ id: string | null; created: boolean }> {
  const source = await dataSourceId();
  const title = `${TITLE_PREFIX}${date}`;
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
    return { id: page.id, created: false };
  }
  if (dryRun) return { id: null, created: true };
  const createdPage = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: source },
    properties: {
      title: { title: [{ type: 'text', text: { content: title } }] },
      [STATUS_PROPERTY]: { status: { name: PUBLISHED } },
      [DATE_PROPERTY]: { date: { start: date } },
    },
  });
  return { id: createdPage.id, created: true };
}

async function hasSection(pageId: string, session: Session): Promise<boolean> {
  const blocks = await collectPaginatedAPI(notion.blocks.children.list, { block_id: pageId });
  return blocks.filter(isFullBlock).some((b) => {
    if (b.type !== 'heading_2') return false;
    return b.heading_2.rich_text.map((r) => r.plain_text).join('').startsWith(MARKERS[session]);
  });
}

export type WriteResult = {
  date: string;
  session: Session;
  status: 'written' | 'skipped' | 'dry-run';
  pageCreated: boolean;
  summary: string;
  blocks?: BlockObjectRequest[];
};

/**
 * Adds one section to the brief for `date`.
 * `withHeadlines` defaults to true only for today: past headlines cannot be recovered.
 * With `dryRun`, nothing is written and the blocks are returned instead.
 */
export async function writeSection(
  session: Session,
  date: string,
  { dryRun = false, withHeadlines = date === istToday() }: { dryRun?: boolean; withHeadlines?: boolean } = {},
): Promise<WriteResult> {
  const page = await pageFor(date, dryRun);
  if (page.id && (await hasSection(page.id, session))) {
    return { date, session, status: 'skipped', pageCreated: false, summary: `${MARKERS[session]} is already on the page.` };
  }
  const built = session === 'open' ? await buildOpen(date) : await buildClose(date, withHeadlines);
  if (dryRun || !page.id) {
    return { date, session, status: 'dry-run', pageCreated: page.created, summary: built.summary, blocks: built.blocks };
  }
  await notion.blocks.children.append({ block_id: page.id, children: built.blocks });
  return { date, session, status: 'written', pageCreated: page.created, summary: built.summary };
}
