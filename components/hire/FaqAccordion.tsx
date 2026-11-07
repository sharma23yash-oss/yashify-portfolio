'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { EASE, FOCUS, cn } from '@/components/ui/tokens';
import type { FaqItem } from '@/lib/hire-faq';

/**
 * WAI-ARIA accordion: each question is a heading wrapping a button with aria-expanded and
 * aria-controls; the answer is a labelled region. Several can be open at once.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const baseId = useId();

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)]">
      {items.map((item) => {
        const expanded = open.has(item.id);
        const buttonId = `${baseId}-${item.id}-q`;
        const panelId = `${baseId}-${item.id}-a`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-semibold text-[#0B1F3A] transition-colors hover:bg-slate-50 sm:px-6',
                  'first:rounded-t-2xl',
                  FOCUS,
                  'focus-visible:ring-inset focus-visible:ring-offset-0',
                )}
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300', expanded && 'rotate-180')}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-pretty leading-relaxed text-slate-700 sm:px-6">{item.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
