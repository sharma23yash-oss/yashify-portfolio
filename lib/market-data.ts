/**
 * Market data for the daily brief. Server only. No API keys:
 *   prices     Yahoo Finance chart API (free, unofficial; closes can differ a little from NSE's official ones)
 *   Nifty 50   the official constituent list published by NSE
 *   headlines  The Economic Times markets RSS feed
 * Every number in a brief comes from here; nothing is estimated or written by AI.
 */

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; yashify-market-brief/1.0)' };
const TIMEOUT_MS = 10_000;

/** One trading day: `date` is the exchange's own calendar day (YYYY-MM-DD). */
export type Bar = { date: string; close: number };
export type Series = { symbol: string; bars: Bar[] };

export type Quote = {
  label: string;
  close: number;
  prevClose: number;
  change: number;
  pct: number;
  /** The trading day the close belongs to. */
  date: string;
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).hostname}`);
  return res.json();
}

type ChartResponse = {
  chart: {
    result:
      | {
          meta: { symbol: string; gmtoffset: number };
          timestamp?: number[];
          indicators: { quote: { close: (number | null)[] }[] };
        }[]
      | null;
  };
};

// The daily and the weekly brief ask for the same prices minutes apart; reuse them for 10 minutes.
const SERIES_TTL_MS = 10 * 60_000;
const seriesCache = new Map<string, { at: number; series: Promise<Series> }>();

/** Daily closes for a Yahoo symbol, oldest first. `range` is a Yahoo range such as 1mo, 3mo or 1y. */
export function getDaily(symbol: string, range = '1mo'): Promise<Series> {
  const key = `${symbol}|${range}`;
  const hit = seriesCache.get(key);
  if (hit && Date.now() - hit.at < SERIES_TTL_MS) return hit.series;
  const series = fetchDaily(symbol, range);
  seriesCache.set(key, { at: Date.now(), series });
  series.catch(() => seriesCache.delete(key)); // never keep a failure
  return series;
}

async function fetchDaily(symbol: string, range: string): Promise<Series> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  const data = (await getJson(url)) as ChartResponse;
  const result = data.chart.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  const closes = result.indicators.quote[0]?.close ?? [];
  const bars: Bar[] = [];
  (result.timestamp ?? []).forEach((ts, i) => {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) return;
    // The timestamp is the session start; shifting by the exchange's offset gives its local date.
    const date = new Date((ts + result.meta.gmtoffset) * 1000).toISOString().slice(0, 10);
    // Yahoo can repeat today's row while the market is open; keep the latest value per day.
    if (bars.length && bars[bars.length - 1].date === date) bars[bars.length - 1].close = close;
    else bars.push({ date, close });
  });
  return { symbol, bars };
}

function quoteFrom(label: string, bars: Bar[], index: number): Quote | null {
  if (index < 1 || index >= bars.length) return null;
  const close = bars[index].close;
  const prevClose = bars[index - 1].close;
  const change = close - prevClose;
  return { label, close, prevClose, change, pct: (change / prevClose) * 100, date: bars[index].date };
}

/** The close on exactly `date` against the session before it, or null if there was no session that day. */
export function quoteOn(label: string, series: Series, date: string): Quote | null {
  return quoteFrom(label, series.bars, series.bars.findIndex((b) => b.date === date));
}

/** The latest close strictly before `date` (the previous session), against the session before that. */
export function quoteBefore(label: string, series: Series, date: string): Quote | null {
  let index = -1;
  series.bars.forEach((b, i) => {
    if (b.date < date) index = i;
  });
  return quoteFrom(label, series.bars, index);
}

/**
 * The change over a span of days (for the weekly brief): the last close from `start` to `end`
 * against the last close before `start`. Null if there was no session in the span.
 */
export function quoteSpan(label: string, series: Series, start: string, end: string): Quote | null {
  let last = -1;
  series.bars.forEach((b, i) => {
    if (b.date >= start && b.date <= end) last = i;
  });
  const before = series.bars.findLastIndex((b) => b.date < start);
  if (last < 0 || before < 0) return null;
  const close = series.bars[last].close;
  const prevClose = series.bars[before].close;
  const change = close - prevClose;
  return { label, close, prevClose, change, pct: (change / prevClose) * 100, date: series.bars[last].date };
}

/**
 * Whether the close on `date` is the highest or lowest of the year before it (the last 250 sessions,
 * about one trading year). Null when there is no close that day or not enough history to say.
 */
export function yearExtreme(series: Series, date: string): 'high' | 'low' | null {
  const i = series.bars.findIndex((b) => b.date === date);
  if (i < 120) return null; // under ~6 months of history the comparison means little
  const prior = series.bars.slice(Math.max(0, i - 250), i).map((b) => b.close);
  const close = series.bars[i].close;
  if (close >= Math.max(...prior)) return 'high';
  if (close <= Math.min(...prior)) return 'low';
  return null;
}

/** Runs `fn` over `items`, at most `limit` at a time. Failures become null instead of stopping the rest. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch (error) {
        console.warn(`market-data: ${String(items[i])} failed: ${(error as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export type Constituent = { name: string; symbol: string };

/** The current Nifty 50 members, from NSE's own list. */
export async function getNifty50(): Promise<Constituent[]> {
  const res = await fetch('https://archives.nseindia.com/content/indices/ind_nifty50list.csv', {
    headers: UA,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status} from NSE`);
  const rows = (await res.text()).trim().split(/\r?\n/).slice(1);
  return rows
    .map((row) => row.split(','))
    .filter((cells) => cells.length >= 3 && cells[2])
    .map((cells) => ({ name: cells[0].replace(/ Ltd\.?$/, '').trim(), symbol: cells[2].trim() }));
}

export type Headline = { title: string; url: string; source: string; published: Date };

type Feed = { source: string; url: string };

/** The Economic Times "Stocks" feed: Indian companies and markets (its wider Markets feed mixes in world news). */
const ET_STOCKS: Feed = { source: 'The Economic Times', url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms' };
/** Feeds that carry the daily "stocks to watch", trade-setup and outlook stories. */
const WATCH_FEEDS: Feed[] = [
  { source: 'Business Standard', url: 'https://www.business-standard.com/rss/markets-106.rss' },
  { source: 'Mint', url: 'https://www.livemint.com/rss/markets' },
  ET_STOCKS,
];
/** What a "what to watch next" story is called in Indian market news. */
const WATCH_WORDS =
  /stocks? to watch|stocks in (the )?news|to watch (today|tomorrow|on)|tomorrow|trade set-?up|market outlook|outlook for|week ahead|next week|stocks? to buy|buy or sell|picks?\b|technical view|f&o|what to expect/i;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

async function readFeed(feed: Feed): Promise<Headline[]> {
  const res = await fetch(feed.url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} from ${feed.source}`);
  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items
    .map((item) => ({
      title: decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      url: decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''),
      source: feed.source,
      published: new Date(decode(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '')),
    }))
    .filter((h) => h.title && h.url.startsWith('https://') && Number.isFinite(h.published.getTime()));
}

/** Newest first, recent only, and the same story (often repeated as "Live Updates: <headline>") kept once. */
function pick(headlines: Headline[], limit: number, withinHours: number): Headline[] {
  const since = Date.now() - withinHours * 3_600_000;
  const key = (t: string) => t.replace(/^[^:]{0,40}:\s*/, '').toLowerCase();
  return headlines
    .filter((h) => h.published.getTime() >= since)
    .sort((a, b) => b.published.getTime() - a.published.getTime())
    .filter((h, i, all) => all.findIndex((other) => key(other.title) === key(h.title)) === i)
    .slice(0, limit);
}

/** Market headlines from The Economic Times published in the last `withinHours` hours. */
export async function getHeadlines(limit = 5, withinHours = 18): Promise<Headline[]> {
  return pick(await readFeed(ET_STOCKS), limit, withinHours);
}

/**
 * Stories about what to watch next (stocks to watch, trade setups, outlooks, analyst picks) from
 * Business Standard, Mint and The Economic Times. A feed that fails is skipped.
 */
export async function getWatchNews(limit = 6, withinHours = 20): Promise<Headline[]> {
  const feeds = await Promise.all(
    WATCH_FEEDS.map((feed) =>
      readFeed(feed).catch((error: Error) => {
        console.warn(`market-data: ${feed.source} skipped: ${error.message}`);
        return [];
      }),
    ),
  );
  // At most 3 stories from any one outlet, so a busy feed cannot crowd out the others.
  const perSource = new Map<string, number>();
  return pick(feeds.flat().filter((h) => WATCH_WORDS.test(h.title)), 50, withinHours)
    .filter((h) => {
      const n = (perSource.get(h.source) ?? 0) + 1;
      perSource.set(h.source, n);
      return n <= 3;
    })
    .slice(0, limit);
}
