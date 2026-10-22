'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { EASE, FOCUS, SPRING, cn } from '@/components/ui/tokens';
import { VIEWS, type ViewId } from './view';

const tabId = (id: ViewId) => `tab-${id}`;
const panelId = (id: ViewId) => `panel-${id}`;

/**
 * The five tabs of the welcome screen, as a WAI-ARIA tablist: Left / Right / Home / End move between
 * tabs, only the selected tab is in the Tab order. On phones the unselected tabs shrink to their
 * icon (their name is still read by screen readers) so all five fit in one row.
 */
export function TabBar({ view, onSelect }: { view: ViewId; onSelect: (id: ViewId) => void }) {
  const [hovered, setHovered] = useState<ViewId | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  // On very narrow screens the row scrolls sideways; keep the selected tab in view.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    list.scrollTo({ left: Math.max(0, tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2) });
  }, [view]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = VIEWS.findIndex((item) => item.id === view);
    const last = VIEWS.length - 1;
    let target = -1;
    if (event.key === 'ArrowRight') target = current === last ? 0 : current + 1;
    else if (event.key === 'ArrowLeft') target = current === 0 ? last : current - 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = last;
    if (target < 0) return;
    event.preventDefault();
    onSelect(VIEWS[target].id);
    tabs.current[target]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Main tabs"
      onKeyDown={onKeyDown}
      onPointerLeave={() => setHovered(null)}
      // -m-1.5 p-1.5: a scrolling row clips whatever sticks out of it, so it carries 6px of padding for the
      // 4px focus ring, and the same negative margin keeps the tabs exactly where they were.
      className="relative -m-1.5 flex min-w-0 items-center gap-0.5 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {VIEWS.map((item, index) => {
        const selected = item.id === view;
        const showHover = hovered === item.id && !selected;
        return (
          <button
            key={item.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(item.id)}
            aria-selected={selected}
            aria-controls={panelId(item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setHovered(item.id);
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible')) setHovered(item.id);
            }}
            onBlur={() => setHovered(null)}
            className={cn(
              'relative isolate flex shrink-0 items-center rounded-full py-2 text-[13px] font-medium transition-colors duration-200 sm:px-4 sm:text-sm',
              selected ? 'px-3 text-white' : 'px-2.5 text-slate-600 hover:text-[#0B1F3A]',
              FOCUS,
            )}
          >
            {showHover && (
              <motion.span
                layoutId="tab-hover"
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-full bg-slate-200/70"
              />
            )}
            {selected && (
              <motion.span
                layoutId="tab-active"
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-full bg-[#0B1F3A]"
              />
            )}
            <item.Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 motion-reduce:transition-none sm:ml-1.5 sm:max-w-[9rem] sm:opacity-100',
                selected ? 'ml-1.5 max-w-[9rem] opacity-100' : 'ml-0 max-w-0 opacity-0',
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The content area of one tab. The Portfolio stays mounted while another tab is open (so its 3D
 * scenes, scroll position and animations are exactly as you left them); the other tabs are only
 * built while they are open.
 */
export function TabPanel({
  id,
  active,
  keepMounted = false,
  children,
}: {
  id: ViewId;
  active: boolean;
  keepMounted?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      role="tabpanel"
      id={panelId(id)}
      aria-labelledby={tabId(id)}
      hidden={!active}
      initial={keepMounted ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: active ? 1 : 0, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {active || keepMounted ? children : null}
    </motion.div>
  );
}
