import {
  APIResponseError,
  Client,
  collectPaginatedAPI,
  extractDatabaseId,
  isFullBlock,
  isFullDatabase,
  isFullPage,
  type BlockObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client';

/**
 * Reads the published articles from your Notion database.
 * This file only runs on the server. NOTION_TOKEN has no NEXT_PUBLIC_ prefix, so Next.js
 * never sends it to the browser.
 */

// These must match your Notion database exactly, including capital letters.
// lib/market-brief.ts uses the same three when it writes the daily brief.
export const STATUS_PROPERTY = 'Status'; // a "Status" column
export const DATE_PROPERTY = 'date'; // a "Date" column
export const PUBLISHED = 'Published'; // the Status option that means "show this one"

export type Article = {
  id: string;
  title: string;
  /** The date column, "2026-10-20" or "2026-10-20T09:30:00.000+05:30". When it is empty, the date in the title. */
  date: string | null;
  /** The page's public Notion address. Null unless the page is shared to the web (Share, then Publish). */
  url: string | null;
};

/** A block, plus the rows of a table (the only children this site shows). */
export type ArticleBlock = BlockObjectResponse & { rows?: BlockObjectResponse[] };

export type ArticleWithContent = Article & { blocks: ArticleBlock[] };

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  // Give up after 8 seconds (the default is 60) and do not retry. The page refreshes every minute
  // anyway, and a slow Notion must never hold up a deploy.
  timeoutMs: 8_000,
  retry: false,
});

async function dataSourceId(): Promise<string> {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!process.env.NOTION_TOKEN || !databaseId) {
    throw new Error('NOTION_TOKEN or NOTION_DATABASE_ID is missing. Add both to .env.local, then restart npm run dev.');
  }

  // Notion reads a database through its "data source", so look that up first.
  const database = await notion.databases.retrieve({
    database_id: extractDatabaseId(databaseId) ?? databaseId, // an id or the full Notion link both work
  });
  if (!isFullDatabase(database) || database.data_sources.length === 0) {
    throw new Error('Notion did not return the database. Open it in Notion, click the "..." menu, choose Connections and add your integration.');
  }
  return database.data_sources[0].id;
}

export async function getPublishedArticles(): Promise<Article[]> {
  const pages = await collectPaginatedAPI(notion.dataSources.query, {
    data_source_id: await dataSourceId(),
    // Notion applies this filter itself, so rows that are not Published never reach this site.
    filter: { property: STATUS_PROPERTY, status: { equals: PUBLISHED } },
    sorts: [{ property: DATE_PROPERTY, direction: 'descending' }], // newest first
  });

  // Sorted again here, because a row with an empty date column gets its date from the title.
  return pages
    .filter(isFullPage)
    .map(toArticle)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const normalise = (id: string) => id.replace(/-/g, '').toLowerCase();

/**
 * One article with its content, or null. Only pages that live in the articles database and are
 * Published are returned, so the address /newsletters/<id> can never show any other Notion page.
 */
export async function getArticle(id: string): Promise<ArticleWithContent | null> {
  if (!NOTION_ID.test(id)) return null;

  let page;
  try {
    page = await notion.pages.retrieve({ page_id: id });
  } catch (error) {
    // Only "no such page" means the article does not exist. Anything else (Notion busy, rate
    // limited, offline) is thrown, so the visitor sees an error that is not cached as a 404.
    if (APIResponseError.isAPIResponseError(error) && ['object_not_found', 'validation_error'].includes(error.code)) {
      return null;
    }
    throw error;
  }
  if (!isFullPage(page) || page.in_trash || page.archived) return null;

  const parent = page.parent;
  const source = await dataSourceId();
  if (parent.type !== 'data_source_id' || normalise(parent.data_source_id) !== normalise(source)) return null;

  const status = page.properties[STATUS_PROPERTY];
  const statusName = status?.type === 'status' ? status.status?.name : status?.type === 'select' ? status.select?.name : null;
  if (statusName !== PUBLISHED) return null;

  const blocks = (await collectPaginatedAPI(notion.blocks.children.list, { block_id: page.id })).filter(isFullBlock);
  const withRows: ArticleBlock[] = await Promise.all(
    blocks.map(async (block) => {
      if (block.type !== 'table') return block;
      const rows = (await collectPaginatedAPI(notion.blocks.children.list, { block_id: block.id })).filter(isFullBlock);
      return { ...block, rows };
    }),
  );

  return { ...toArticle(page), blocks: withRows };
}

function toArticle(page: PageObjectResponse): Article {
  let title = '';
  let date: string | null = null;

  for (const [name, property] of Object.entries(page.properties)) {
    // The title column is found by its type, so it works whatever you named it.
    if (property.type === 'title') title = property.title.map((part) => part.plain_text).join('');
    if (name === DATE_PROPERTY && property.type === 'date') date = property.date?.start ?? null;
  }
  // The daily briefs carry their day in the title ("YGL Daily Market Brief – 2026-10-30").
  date ??= title.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

  return { id: page.id, title: title.trim() || 'Untitled', date, url: page.public_url };
}
