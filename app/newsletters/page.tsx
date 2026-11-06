import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsletterTabs } from '@/components/newsletter/NewsletterTabs';
import { FOCUS, cn } from '@/components/ui/tokens';
import { getPublishedArticles, type Article } from '@/lib/notion';

// Next.js rebuilds this page in the background at most once a minute. A new article shows up
// within about a minute, and Notion is not called on every visit.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Newsletters · Yash Sharma',
  description: 'Daily Indian market briefs, weekly updates and stocks to watch, by Yash Sharma.',
  alternates: { canonical: '/newsletters' },
};

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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6 sm:py-20">
      <Link
        href="/#newsletters"
        className={cn('inline-flex rounded-sm text-sm font-semibold text-[#0B1F3A] underline-offset-4 hover:underline', FOCUS)}
      >
        <span aria-hidden="true">←&nbsp;</span>
        Back to portfolio
      </Link>

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">Newsletters</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">Latest articles</h1>
      <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-slate-700">
        The YGL market briefs: every trading day&apos;s numbers, a weekly review each Friday, and the news worth a look before
        the next session. Compiled from market data; not investment advice.
      </p>

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
        <NewsletterTabs articles={articles} />
      )}
    </main>
  );
}