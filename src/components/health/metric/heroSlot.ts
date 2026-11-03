import type React from "react";
import { createContext, useContext } from "react";

// Website viewport v1: what the web metric page (MetricKit.web.tsx) hands
// its hero: the page's stats, its source name and its freshness lines; and
// the ink of the hero's source row, read by FreshnessLine's web branch.

export type HeroStat = { icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>; value: React.ReactNode; label: string };

export interface HeroSlot {
  stats: HeroStat[] | null;
  source: string | null;
  lines: React.ReactNode[];
}
export const HeroSlotContext = createContext<HeroSlot | null>(null);
/** Inside the hero's source row: FreshnessLine draws inline (no top margin) in the row's ink. */
export const HeroRowContext = createContext<string | null>(null);
export const useHeroRowInk = () => useContext(HeroRowContext);
