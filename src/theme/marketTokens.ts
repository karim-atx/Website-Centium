// Market + Share 3.0 · W1 foundations: the handover's tokens
// (design-handover/market-share/handover-master/tokens.json), with the values
// the rendered screen files use where tokens.json lacks them (D-50: the
// screen files win). Light is the board, literally; the board is light only,
// so dark is the readable equivalent on the app's own dark surfaces (D-05),
// the same approach v6 took.
//
// Tiers are keyed by RANK (1 to 5: point_tiers' order), never by name: the
// names come from point_tiers (Bronze, Silver, Gold, Platinum, Diamond on the
// local stack), so a renamed tier keeps its look. Ranks 1 to 3 are the drawn
// Bronze / Silver / Gold (tokens.json "tiers"); 4 and 5 follow D-01.

import { Crown, Gem, Medal, Shield, type LucideIcon } from "lucide-react";

/** tokens.json "palette", light, verbatim (plus the screen files' extras). */
export const MARKET_LIGHT = {
  page: "#FFFFFF",
  card: "#FFFFFF",
  soft: "#F5F5F6",
  ink: "#241F1B",
  ink2: "#5B5349",
  faint: "#8C8378",
  tert: "#A79E93",
  hair: "rgba(36,31,27,0.08)",
  border: "rgba(36,31,27,0.11)",
  div: "rgba(36,31,27,0.06)",
  pale: "#F0EDF9",
  accent: "#7D67D9",
  pdark: "#7D6BB5",
  fill: "#AEA1DC",
  onfill: "#FFFFFF",
  segtrack: "#F3F3FD",
  segactive: "#A79AD5",
  segidle: "#F5F4FE",
  segink: "#6D50D3",
  subtrack: "#F4F3F9",
  subactive: "#9A8CD6",
  subink: "#5B5349",
  tealbg: "#E4F0EE",
  tealink: "#2F5F58",
  good: "#3F9165",
  goodbg: "#E3F3E9",
  caution: "#B07D16",
  cautionbg: "#F6E9C9",
  high: "#C0392B",
  highbg: "#FBE7E4",
  /** The error strip's text (Professional Calendar Screens, strip "cancelled"). */
  highink: "#9A2E22",
  gold: "#C08A1E",
  swoff: "#D9D6E3",
  teal: "#6F9993",
  leaf: "#6F9993",
  /** MasterBottomSheet / CentredDialog chrome. */
  sscrim: "rgba(36,31,27,0.4)",
  sband: "#F0EEFD",
  sborder: "#7248F8",
  stitle: "#7248F8",
  sbody: "#FFFFFF",
  srule: "#F2F2F2",
  sgrey: "#F2F3F5",
  slabel: "#575863",
  /** CentredDialog cancel (dialog.cancel). */
  cancelbg: "#F0EDF9",
  cancelink: "#5F5093",
} as const;

export type MarketPalette = { [K in keyof typeof MARKET_LIGHT]: string };

/** Dark: the same roles on the app's dark tokens (index.css .dark), every text pair at 4.5:1 or better. */
export const MARKET_DARK: MarketPalette = {
  page: "rgb(18 19 23)",
  card: "rgb(28 31 40)",
  soft: "rgb(36 39 48)",
  ink: "rgb(245 243 250)",
  ink2: "rgb(184 179 199)",
  faint: "rgb(184 179 199)",
  tert: "rgb(159 156 172)",
  hair: "rgba(245,243,250,0.08)",
  border: "rgba(245,243,250,0.12)",
  div: "rgba(245,243,250,0.08)",
  pale: "rgb(48 49 65)",
  accent: "#C3B3FB",
  pdark: "#C3B3FB",
  fill: "#A991FE",
  onfill: "#0D0B1A",
  segtrack: "rgb(36 39 48)",
  segactive: "#A991FE",
  segidle: "rgb(48 49 65)",
  segink: "#C3B3FB",
  subtrack: "rgb(36 39 48)",
  subactive: "#9A8CD6",
  subink: "rgb(184 179 199)",
  tealbg: "rgb(41 51 57)",
  tealink: "#B2D4CF",
  good: "#7FC79C",
  goodbg: "rgb(25 42 32)",
  caution: "#E0B360",
  cautionbg: "rgb(51 43 26)",
  high: "#F09A8E",
  highbg: "rgb(60 42 48)",
  highink: "#F09A8E",
  gold: "#E0B360",
  swoff: "rgb(87 81 112)",
  teal: "#A2C8C2",
  leaf: "#A2C8C2",
  sscrim: "rgba(0,0,0,0.55)",
  sband: "rgb(36 39 48)",
  sborder: "#A991FE",
  stitle: "#C3B3FB",
  sbody: "rgb(28 31 40)",
  srule: "rgba(245,243,250,0.08)",
  sgrey: "rgb(36 39 48)",
  slabel: "rgb(184 179 199)",
  cancelbg: "rgb(48 49 65)",
  cancelink: "#C3B3FB",
};

export const marketPalette = (dark: boolean): MarketPalette => (dark ? MARKET_DARK : MARKET_LIGHT);

/** The handover's motion (ConfirmationStrip, HANDOVER §4 Shared chrome). */
export const MARKET_MOTION = {
  slideUp: "cmSlideUp 420ms cubic-bezier(0.22,1,0.36,1) 1 both",
  pressedScale: 0.97,
  pressedMs: 140,
} as const;

// ---------------------------------------------------------------------------
// Tiers by rank

export type TierRank = 1 | 2 | 3 | 4 | 5;

export interface TierStyle {
  rank: TierRank;
  /** The board's name for the rank, only a fallback: show point_tiers' name. */
  fallbackName: string;
  fill: string;
  ink: string;
  icon: string;
  border: string;
  pill: string;
  track: string;
  Icon: LucideIcon;
}

/** "rgba(r,g,b,a)" from a #RRGGBB hex. */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The drawn alpha recipe (tokens.json tiers: border 0.24, pill 0.12, track 0.16 of the ink). */
function tier(rank: TierRank, fallbackName: string, fill: string, ink: string, icon: string, Icon: LucideIcon): TierStyle {
  return { rank, fallbackName, fill, ink, icon, border: alpha(ink, 0.24), pill: alpha(ink, 0.12), track: alpha(ink, 0.16), Icon };
}

/**
 * Light. 1 to 3 are tokens.json "tiers" verbatim (the hero icon as the markup
 * draws it, Client Explore Screens lines 38 to 40: medal for Bronze, shield
 * for Silver, crown for Gold; HANDOVER §4's prose says shield for Bronze, the
 * markup wins). 4 and 5 are
 * D-01: Platinum fill #EEF0F8 ink #4F5B85 icon #8C96C2 crown; Diamond fill
 * #E6F4F7 ink #2F6F80 icon #5FB7CC gem. Both inks clear 4.5:1 on their fill
 * (tierRanks.test.ts).
 */
export const TIERS_LIGHT: Record<TierRank, TierStyle> = {
  1: tier(1, "Bronze", "#F3E8DD", "#8B5A2B", "#8B5A2B", Medal),
  2: tier(2, "Silver", "#EEF1F5", "#64748B", "#94A3B8", Shield),
  3: tier(3, "Gold", "#FDF3D6", "#9A7414", "#F6C445", Crown),
  4: tier(4, "Platinum", "#EEF0F8", "#4F5B85", "#8C96C2", Crown),
  5: tier(5, "Diamond", "#E6F4F7", "#2F6F80", "#5FB7CC", Gem),
};

/**
 * Dark (not drawn, D-05): each tier's ink lifted to read on the dark card
 * (#1C1F28), its fill a dark tint of itself, the same alpha recipe.
 */
export const TIERS_DARK: Record<TierRank, TierStyle> = {
  1: tier(1, "Bronze", "#2E2620", "#D9A57F", "#D9A57F", Medal),
  2: tier(2, "Silver", "#252A33", "#B4C0D0", "#B4C0D0", Shield),
  3: tier(3, "Gold", "#332C1A", "#E6C066", "#F6C445", Crown),
  4: tier(4, "Platinum", "#272A38", "#B3BCE0", "#B3BCE0", Crown),
  5: tier(5, "Diamond", "#1F3036", "#8FD0DF", "#8FD0DF", Gem),
};

export const tierStyle = (rank: number, dark: boolean): TierStyle => (dark ? TIERS_DARK : TIERS_LIGHT)[clampRank(rank)];

export function clampRank(rank: number): TierRank {
  const r = Math.round(Number.isFinite(rank) ? rank : 1);
  return (r < 1 ? 1 : r > 5 ? 5 : r) as TierRank;
}

/**
 * A tier's rank from point_tiers (ordered by sort_order): its 1-based place.
 * An unknown name (or no tiers yet) is rank 1, as the old name maps fell back
 * to Bronze.
 */
export function tierRank(tiers: readonly { name: string; sortOrder: number }[], name: string | null | undefined): TierRank {
  if (!name) return 1;
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const i = sorted.findIndex((t) => t.name === name);
  return clampRank(i < 0 ? 1 : i + 1);
}

/** The board's tier as CSS variables (the screens' --tierfill, --tierink, ...). */
export const tierVars = (t: TierStyle): Record<string, string> => ({
  "--tierfill": t.fill,
  "--tierink": t.ink,
  "--tiericon": t.icon,
  "--tierborder": t.border,
  "--tierpill": t.pill,
  "--tiertrack": t.track,
});

// ---------------------------------------------------------------------------
// Fixed identity colours (tokens.json): the same in every theme, as the app's
// metric colours are.

/** metricIdentity: [tint, ink]. */
export const METRIC_IDENTITY = {
  workout: ["#EDEFF3", "#5F6878"],
  steps: ["#EAF1E4", "#55733F"],
  sleep: ["#E8F2F0", "#3E716D"],
  water: ["#EEF5FB", "#3F6F98"],
  food: ["#F2F0FA", "#7D6BB5"],
  streak: ["#F0EDF9", "#5F5093"],
  gold: ["#FDF3D6", "#9A7414"],
} as const;

/** segmentSteps 1 to 4: [bg, ink]. */
export const SEGMENT_STEPS = [
  ["#EEEAF8", "#7D67D9"],
  ["#ECEFF5", "#667BB1"],
  ["#EBF2F4", "#5A859E"],
  ["#E6F1EF", "#4F8F8A"],
] as const;

/** statusSteps: [bg, ink]. */
export const STATUS_STEPS = {
  APPLIED: ["#EEEAF8", "#7D67D9"],
  SHORTLISTED: ["#ECEFF5", "#667BB1"],
  OFFERED: ["#EBF2F4", "#5A859E"],
  HIRED: ["#E6F1EF", "#4F8F8A"],
  DECLINED: ["#F5F5F6", "#8C8378"],
} as const;

/** tokens.json "share". */
export const SHARE_TOKENS = {
  brandGradient: "linear-gradient(150deg, #7D6BB5 0%, #66709F 52%, #4F7F78 100%)",
  photoScrim: "linear-gradient(to top, rgba(18,19,23,0.9) 0%, rgba(18,19,23,0.5) 46%, rgba(18,19,23,0.25) 100%)",
  overlayTextShadow: "0 1px 2px rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.35), 0 2px 18px rgba(0,0,0,0.3)",
  checkerDark: "repeating-conic-gradient(#2A2B31 0% 25%, #34353C 0% 50%) 0 0 / 16px 16px",
  checkerLight: "repeating-conic-gradient(#A9A6B6 0% 25%, #C4C1CF 0% 50%) 0 0 / 14px 14px",
  snapGuide: "#AEA1DC",
  safeMargin: 10,
  scaleMin: 0.5,
  scaleMax: 2,
} as const;

/** tokens.json "chart". */
export const CHART_TOKENS = {
  line: "#AEA1DC",
  lineWidth: 2,
  area: "rgba(174,161,220,0.22)",
  scrub: "#7D6BB5",
  barIdle: "#AEA1DC",
  barActive: "#7D6BB5",
  grid: "rgba(36,31,27,0.06)",
  tooltipBg: "#241F1B",
  tooltipInk: "#FFFFFF",
  compare: "#6F9993",
} as const;
