import { Briefcase, MonitorPlay, Newspaper, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * The four top-level tabs of the welcome screen, as plain data. Kept apart from the router in
 * view.ts (which uses client-only hooks) so server components such as the /hire header can import it.
 */

export type ViewId = 'portfolio' | 'youtube' | 'newsletters' | 'ai';

export type ViewItem = {
  id: ViewId;
  label: string;
  /** URL fragment without the "#"; empty for the Portfolio */
  hash: string;
  Icon: LucideIcon;
};

export const VIEWS: readonly ViewItem[] = [
  { id: 'portfolio', label: 'Portfolio', hash: '', Icon: Briefcase },
  { id: 'youtube', label: 'YouTube', hash: 'youtube', Icon: MonitorPlay },
  { id: 'newsletters', label: 'YGL Market Briefs', hash: 'newsletters', Icon: Newspaper },
  { id: 'ai', label: 'Yashify AI', hash: 'ai', Icon: Sparkles },
];
