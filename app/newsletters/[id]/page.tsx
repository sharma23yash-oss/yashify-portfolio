import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { FOCUS, cn } from '@/components/ui/tokens';
import { NotionBlocks, hasVisibleContent } from '@/components/notion/NotionBlocks';
import { getArticle as loadArticle } from '@/lib/notion';

// One article, read from Notion. Rebuilt in the background at most every 5 minutes, so a brief
// that the morning or evening job just wrote shows up within about 5 minutes.
export const revalidate = 300;

/**
 * Nothing is built at deploy time (building every article at once runs into Notion's limit of about
 * 3 requests a second). Each article is built on its first visit and then served from the cache.
 */
export async function generateStaticParams() {
  return [];
}

// generateMetadata and the page both need the article; cache() makes that one Notion fetch per request.
const getArticle = cache(loadArticle);

type Props = { params: Promise<{ id: string }> };

function formatDay(iso: string | null) {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed);
  return { day, label };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id).catch(() => null);
  if (!article) return { title: 'Article not found · Yash Sharma' };
  // The first paragraph is the brief's one-line summary; it doubles as the description.
  const first = article.blocks.find((b) => b.type === 'paragraph' && b.paragraph.rich_text.length);
  const summary = first?.type === 'paragraph' ? first.paragraph.rich_text.map((t) => t.plain_text).join('') : '';
  return {
    title: `${article.title} · Yash Sharma`,
    description: summary.slice(0, 155) || `${article.title}, from the YGL newsletter by Yash Sharma.`,
    alternates: { canonical: `/newsletters/${article.id}` },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();
  const date = formatDay(article.date);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6 sm:py-20">
      <Link
        href="/newsletters"
        className={cn('inline-flex rounded-sm text-sm font-semibold text-[#0B1F3A] underline-offset-4 hover:underline', FOCUS)}
      >
        <span aria-hidden="true">←&nbsp;</span>
        All articles
      </Link>

      <article className="mt-10">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">YGL Market Briefs</p>
          <h1 className="mt-3 text-balance font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            {article.title}
          </h1>
          {date && (
            <p className="mt-3 text-sm font-medium text-slate-600">
              <time dateTime={date.day}>{date.label}</time> · Yash Sharma
            </p>
          )}
        </header>

        <div className="mt-10">
          {hasVisibleContent(article.blocks) ? (
            <NotionBlocks blocks={article.blocks} />
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-slate-700">
              This brief is being prepared. Please check back after 8:30 AM or 4:30 PM IST.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
