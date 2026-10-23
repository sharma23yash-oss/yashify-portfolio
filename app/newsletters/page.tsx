import type { Metadata } from 'next';
import Link from 'next/link';
import { CARD, FOCUS, cn } from '@/components/ui/tokens';
import { getPublishedArticles, type Article } from '@/lib/notion';

// Next.js rebuilds this page in the background at most once a minute. A new article shows up
// within about a minute, and Notion is not called on every visit.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Newsletters · Yash Sharma',
  description: 'Latest newsletter articles by Yash Sharma.',
};

/** "2026-10-20" or "2026-10-20T09:30:00.000+05:30" becomes { day: "2026-10-20", label: "20 Oct 2026" }. */
function describeDate(iso: string | null) {
  if (!iso) return null;
  const day = iso.slice(0, 10); // the calendar day exactly as written in Notion
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const label = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
  return { day, label };
}

function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul role="list" aria-label="Published articles" className={cn(CARD, 'mt-10 divide-y divide-slate-200 overflow-hidden')}>
      {articles.map((article) => {
        const date = describeDate(article.date);
        return (
          <li key={article.id} className="flex flex-col gap-1 px-5 py-5 sm:flex-row sm:items-baseline sm:gap-8 sm:px-7">
            <span className="shrink-0 text-sm font-medium tabular-nums text-slate-600 sm:w-28">
              {date ? <time dateTime={date.day}>{date.label}</time> : null}
            </span>
            <h2 className="text-lg font-semibold leading-snug text-[#0B1F3A]">
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'rounded-sm underline decoration-slate-300 decoration-2 underline-offset-4 transition-colors hover:decoration-[#0B1F3A]',
                    FOCUS,
                  )}
                >
                  {article.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                article.title
              )}
            </h2>
          </li>
        );
      })}
    </ul>
  );
}

export default async function NewslettersPage() {
  let articles: Article[] = [];
  let error: Error | null = null;

  try {
    articles = await getPublishedArticles();
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error(String(caught));
    console.error(`Could not load the articles from Notion: ${error.message}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6 sm:py-20">
      <Link
        href="/#newsletters"
        className={cn('inline-flex rounded-sm text-sm font-semibold text-[#0B1F3A] underline-offset-4 hover:underline', FOCUS)}
      >
        <span aria-hidden="true">←&nbsp;</span>
        Back to portfolio
      </Link>

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">Newsletters</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">Latest articles</h1>

      {error ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-slate-700">
          <p>The articles could not be loaded right now. Please check back soon.</p>
          {/* The reason is shown only while you work on the site (npm run dev), never to visitors. */}
          {process.env.NODE_ENV === 'development' ? (
            <p className="mt-3 text-sm font-medium text-amber-900">{error.message}</p>
          ) : null}
        </div>
      ) : articles.length === 0 ? (
        <p className="mt-10 text-slate-700">No articles have been published yet.</p>
      ) : (
        <ArticleList articles={articles} />
      )}
    </main>
  );
}