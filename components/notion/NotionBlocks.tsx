/**
 * Renders the content of a Notion page (as loaded by getArticle in lib/notion.ts) with the site's
 * own styles. Server component: no JavaScript is sent for it.
 * Shown: paragraphs, headings, bulleted and numbered lists, tables, dividers, quotes, callouts,
 * code and images. Anything else is skipped rather than shown broken.
 */

import type { ReactNode } from 'react';
import type { RichTextItemResponse } from '@notionhq/client';
import type { ArticleBlock } from '@/lib/notion';
import { FOCUS, cn } from '@/components/ui/tokens';

function RichText({ items }: { items: RichTextItemResponse[] }) {
  return (
    <>
      {items.map((item, i) => {
        const a = item.annotations;
        let node: ReactNode = item.plain_text;
        if (a.code) node = <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800">{node}</code>;
        if (a.bold) node = <strong className="font-semibold text-[#0B1F3A]">{node}</strong>;
        if (a.italic) node = <em>{node}</em>;
        if (a.strikethrough) node = <s>{node}</s>;
        if (a.underline) node = <u>{node}</u>;
        if (a.color === 'gray') node = <span className="text-slate-500">{node}</span>;
        const href = item.href;
        if (href && /^https?:\/\//.test(href)) {
          node = (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'rounded-sm font-medium text-[#0B1F3A] underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-[#0B1F3A]',
                FOCUS,
              )}
            >
              {node}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

/** A cell that holds a signed change ("+1.25%" / "−0.40") is coloured green or red. */
function cellTone(text: string): string | undefined {
  if (/^\+\d/.test(text)) return 'text-emerald-700';
  if (/^[−-]\d/.test(text)) return 'text-red-700';
  return undefined;
}

function Table({ block }: { block: Extract<ArticleBlock, { type: 'table' }> }) {
  const rows = (block.rows ?? []).filter((r): r is Extract<typeof r, { type: 'table_row' }> => r.type === 'table_row');
  if (!rows.length) return null;
  const hasHeader = block.table.has_column_header;
  const [head, ...body] = hasHeader ? rows : [null, ...rows];
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        {head && (
          <thead className="bg-slate-50">
            <tr>
              {head.table_row.cells.map((cell, c) => (
                <th
                  key={c}
                  scope="col"
                  className={cn('px-4 py-2.5 font-semibold text-[#0B1F3A]', c === 0 ? 'text-left' : 'text-right')}
                >
                  <RichText items={cell} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((row) =>
            row ? (
              <tr key={row.id} className="border-t border-slate-100">
                {row.table_row.cells.map((cell, c) => {
                  const plain = cell.map((t) => t.plain_text).join('');
                  return c === 0 ? (
                    <th key={c} scope="row" className="px-4 py-2.5 text-left font-medium text-slate-800">
                      <RichText items={cell} />
                    </th>
                  ) : (
                    <td key={c} className={cn('px-4 py-2.5 text-right tabular-nums text-slate-700', cellTone(plain))}>
                      <RichText items={cell} />
                    </td>
                  );
                })}
              </tr>
            ) : null,
          )}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'paragraph':
      return block.paragraph.rich_text.length ? (
        <p className="my-4 leading-relaxed text-slate-700">
          <RichText items={block.paragraph.rich_text} />
        </p>
      ) : null;
    case 'heading_1':
      return (
        <h2 className="mt-12 font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A]">
          <RichText items={block.heading_1.rich_text} />
        </h2>
      );
    case 'heading_2':
      return (
        <h2 className="mt-12 font-serif text-2xl font-semibold tracking-tight text-[#0B1F3A] first:mt-0">
          <RichText items={block.heading_2.rich_text} />
        </h2>
      );
    case 'heading_3':
      return (
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
          <RichText items={block.heading_3.rich_text} />
        </h3>
      );
    case 'quote':
      return (
        <blockquote className="my-5 border-l-4 border-[#14B8A6] pl-4 italic text-slate-700">
          <RichText items={block.quote.rich_text} />
        </blockquote>
      );
    case 'callout':
      return (
        <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          <RichText items={block.callout.rich_text} />
        </div>
      );
    case 'code':
      return (
        <pre className="my-5 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
          <code>{block.code.rich_text.map((t) => t.plain_text).join('')}</code>
        </pre>
      );
    case 'divider':
      return <hr className="my-10 border-slate-200" />;
    case 'table':
      return <Table block={block} />;
    case 'image': {
      const src = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
      const caption = block.image.caption.map((t) => t.plain_text).join('');
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- Notion file links expire, so they are not run through next/image */}
          <img src={src} alt={caption} className="w-full rounded-xl border border-slate-200" loading="lazy" />
          {caption && <figcaption className="mt-2 text-center text-sm text-slate-500">{caption}</figcaption>}
        </figure>
      );
    }
    default:
      return null;
  }
}

type ListKind = 'bulleted_list_item' | 'numbered_list_item';

/** Notion stores each list item as its own block; consecutive items are grouped into one list here. */
export function NotionBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; ) {
    const kind = blocks[i].type;
    if (kind === 'bulleted_list_item' || kind === 'numbered_list_item') {
      const listKind: ListKind = kind;
      const items: ArticleBlock[] = [];
      while (i < blocks.length && blocks[i].type === listKind) items.push(blocks[i++]);
      const List = listKind === 'numbered_list_item' ? 'ol' : 'ul';
      out.push(
        <List
          key={items[0].id}
          className={cn('my-4 space-y-2 pl-6 text-slate-700', listKind === 'numbered_list_item' ? 'list-decimal' : 'list-disc')}
        >
          {items.map((item) => (
            <li key={item.id} className="pl-1 leading-relaxed marker:text-[#14B8A6]">
              <RichText
                items={
                  item.type === 'bulleted_list_item'
                    ? item.bulleted_list_item.rich_text
                    : item.type === 'numbered_list_item'
                      ? item.numbered_list_item.rich_text
                      : []
                }
              />
            </li>
          ))}
        </List>,
      );
      continue;
    }
    out.push(<Block key={blocks[i].id} block={blocks[i]} />);
    i++;
  }
  return <>{out}</>;
}

/** True when the page has at least one block this renderer shows. */
export function hasVisibleContent(blocks: ArticleBlock[]): boolean {
  return blocks.some((b) => b.type !== 'paragraph' || b.paragraph.rich_text.length > 0);
}
