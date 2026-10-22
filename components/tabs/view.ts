import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Briefcase, FolderOpen, MonitorPlay, Newspaper, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * The five top-level tabs of the welcome screen, and the small router behind them.
 *
 * A tab is a URL fragment: /#drive  /#youtube  /#newsletters  /#ai. The Portfolio tab is the plain
 * page, and any other fragment (for example /#projects) also means "Portfolio", so every older
 * link keeps working. Back and forward move between tabs, and a link to a tab can be shared.
 */

export type ViewId = 'portfolio' | 'drive' | 'youtube' | 'newsletters' | 'ai';

export type ViewItem = {
  id: ViewId;
  label: string;
  /** URL fragment without the "#"; empty for the Portfolio */
  hash: string;
  Icon: LucideIcon;
};

export const VIEWS: readonly ViewItem[] = [
  { id: 'portfolio', label: 'Portfolio', hash: '', Icon: Briefcase },
  { id: 'drive', label: 'Google Drive', hash: 'drive', Icon: FolderOpen },
  { id: 'youtube', label: 'YouTube', hash: 'youtube', Icon: MonitorPlay },
  { id: 'newsletters', label: 'Newsletters', hash: 'newsletters', Icon: Newspaper },
  { id: 'ai', label: 'Yashify AI', hash: 'ai', Icon: Sparkles },
];

const VIEW_BY_HASH = new Map<string, ViewId>(VIEWS.filter((v) => v.hash).map((v) => [v.hash, v.id]));
const HASH_BY_VIEW = new Map<ViewId, string>(VIEWS.map((v) => [v.id, v.hash]));

/* -------------------------------- the router -------------------------------- */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function currentView(): ViewId {
  return VIEW_BY_HASH.get(window.location.hash.slice(1).toLowerCase()) ?? 'portfolio';
}

const serverView = (): ViewId => 'portfolio';

/** The tab the URL points at. The server (and the first client render) always say Portfolio. */
export function useView(): ViewId {
  return useSyncExternalStore(subscribe, currentView, serverView);
}

/** Opens a tab and adds it to the browser history. */
export function goToView(next: ViewId) {
  if (currentView() === next) return;
  const hash = HASH_BY_VIEW.get(next);
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`);
  listeners.forEach((notify) => notify());
}

/* ------------------------------- title + scrolling ------------------------------- */

export function viewTitle(view: ViewId, siteName: string): string {
  if (view === 'portfolio') return `${siteName} · Portfolio`;
  const label = VIEWS.find((v) => v.id === view)?.label ?? '';
  return `${label} · ${siteName}`;
}

/**
 * Keeps the browser tab title in step with the tab, and handles scrolling between tabs:
 * the other tabs open at the top, and the Portfolio reopens exactly where you left it.
 * Returns a function that forgets the remembered Portfolio position (used by the logo link).
 */
export function useViewEffects(view: ViewId, siteName: string) {
  const shown = useRef<ViewId>(view);
  const savedScroll = useRef(0);

  useEffect(() => {
    if (view !== 'portfolio') return undefined;
    const remember = () => {
      savedScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [view]);

  useLayoutEffect(() => {
    if (shown.current === view) return;
    shown.current = view;
    window.scrollTo({ top: view === 'portfolio' ? savedScroll.current : 0, behavior: 'instant' });
  }, [view]);

  useEffect(() => {
    document.title = viewTitle(view, siteName);
  }, [view, siteName]);

  return useCallback(() => {
    savedScroll.current = 0;
  }, []);
}
