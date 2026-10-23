import {
  Client,
  collectPaginatedAPI,
  extractDatabaseId,
  isFullDatabase,
  isFullPage,
  type PageObjectResponse,
} from '@notionhq/client';

/**
 * Reads the published articles from your Notion database.
 * This file only runs on the server. NOTION_TOKEN has no NEXT_PUBLIC_ prefix, so Next.js
 * never sends it to the browser.
 */

// These must match your Notion database exactly, including capital letters.
const STATUS_PROPERTY = 'Status'; // a "Select" column
const DATE_PROPERTY = 'date'; // a "Date" column
const PUBLISHED = 'Published'; // the Status option that means "show this one"

export type Article = {
  id: string;
  title: string;
  /** What the date column holds, "2026-10-20" or "2026-10-20T09:30:00.000+05:30". Null when it is empty. */
  date: string | null;
  /** The page's public Notion address. Null unless the page is shared to the web (Share, then Publish). */
  url: string | null;
};

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  // Give up after 8 seconds (the default is 60) and do not retry. The page refreshes every minute
  // anyway, and a slow Notion must never hold up a deploy.
  timeoutMs: 8_000,
  retry: false,
});

export async function getPublishedArticles(): Promise<Article[]> {
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

  const pages = await collectPaginatedAPI(notion.dataSources.query, {
    data_source_id: database.data_sources[0].id,
    // Notion applies this filter itself, so rows that are not Published never reach this site.
    // (If Status is Notion's own "Status" property type rather than "Select", write status instead of select.)
    filter: { property: STATUS_PROPERTY, status: { equals: PUBLISHED } },
    sorts: [{ property: DATE_PROPERTY, direction: 'descending' }], // newest first
  });

  return pages.filter(isFullPage).map(toArticle);
}

function toArticle(page: PageObjectResponse): Article {
  let title = '';
  let date: string | null = null;

  for (const [name, property] of Object.entries(page.properties)) {
    // The title column is found by its type, so it works whatever you named it.
    if (property.type === 'title') title = property.title.map((part) => part.plain_text).join('');
    if (name === DATE_PROPERTY && property.type === 'date') date = property.date?.start ?? null;
  }

  return { id: page.id, title: title.trim() || 'Untitled', date, url: page.public_url };
}