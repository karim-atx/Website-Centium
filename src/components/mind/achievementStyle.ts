import { liftTo, tintOn } from "../../data/folderColors";
import type { AchievementLevel } from "../../services/achievements";
import { Gem, Crown, Medal, Shield, Star, type LucideIcon } from "lucide-react";
import { formatShortDate } from "../../utils/date";
import { clampRank, type TierRank } from "../../theme/marketTokens";

// Mobile v5.1 MO1.1.3 / MO1.1.3.2: the hero card and the unlock pill take a
// TIER (or an achievement LEVEL) colour, fixed in every theme:
// Bronze #9C6B4A · Silver #8A9099 · Gold #B08D3C · Platinum #5F7F86 ·
// Diamond #4E6FA8. Light mode uses the handover's values as drawn (A10); dark
// mode puts each on a dark tint of itself and lifts the ink to 4.5:1.

//
// Market + Share 3.0 W1 (PLAN §3.5): keyed by RANK (point_tiers' order,
// marketTokens tierRank), no longer by name, so a renamed tier keeps its
// colour; the names shown come from point_tiers. These are the Achievements
// screen's v6 colours and icons (not redrawn by Market + Share); the market
// screens use marketTokens' tiers.

const TIER_HEX_BY_RANK: Record<TierRank, string> = {
  1: "#9C6B4A",
  2: "#8A9099",
  3: "#B08D3C",
  4: "#5F7F86",
  5: "#4E6FA8",
};

const TIER_ICON_BY_RANK: Record<TierRank, LucideIcon> = {
  1: Medal,
  2: Shield,
  3: Crown,
  4: Star,
  5: Gem,
};

const BRONZE_HEX = TIER_HEX_BY_RANK[1];

const LEVEL_HEX: Record<AchievementLevel, string> = {
  bronze: TIER_HEX_BY_RANK[1],
  silver: TIER_HEX_BY_RANK[2],
  gold: TIER_HEX_BY_RANK[3],
};

/** A tier's colour by rank (1 to 5; anything else clamps). */
export const tierHex = (rank: number): string => TIER_HEX_BY_RANK[clampRank(rank)];
/** A tier's icon by rank. */
export const tierIcon = (rank: number): LucideIcon => TIER_ICON_BY_RANK[clampRank(rank)];
/** A badge with no level (a one-off) takes Bronze's colour; the pill hides its level chip (V6-142). */
export const levelHex = (level: AchievementLevel | null | undefined): string =>
  (level && LEVEL_HEX[level]) || LEVEL_HEX.bronze;

export interface ColourSet {
  /** Text and icons in the colour. */
  ink: string;
  /** The card's fill. */
  fill: string;
  /** A hairline in the colour. */
  border: string;
  /** A filled shape (the current tier disc, the progress bar). */
  solid: string;
  /** Text on `solid`. */
  onSolid: string;
  /** An empty progress track. */
  track: string;
}

const DARK_CARD = "#1C1F28";

/** The v5.1 tier colours, still used by the Explore tier card (MO1.4). */
export function colourSet(hex: string, dark: boolean): ColourSet {
  if (!dark) {
    const fill = hex === BRONZE_HEX ? "#FBF7F4" : tintOn(hex, 0.05, "#FFFFFF");
    return {
      ink: hex,
      fill,
      border: `${hex}3D`, // 24%
      solid: hex,
      onSolid: "#FFFFFF",
      track: tintOn(hex, 0.14, fill),
    };
  }
  const fill = tintOn(hex, 0.14, DARK_CARD);
  const solid = liftTo(hex, fill, 3);
  return {
    ink: liftTo(hex, fill),
    fill,
    border: `${hex}73`, // 45%
    solid,
    onSolid: "#0D0B1A",
    track: tintOn(hex, 0.3, DARK_CARD),
  };
}

// ---------------------------------------------------------------------------
// v6 (MO1.1.3 #6-#19, MO1.1.3.2 #54-#61). Dark values marked * in the tables
// are derived from Bronze's drawn family: Bronze's dark ink is #D9A57F*, and
// every other tier or level is its colour lifted to 4.5:1 on the surface it
// sits on (#262932 the tier card, #1C1F28 the pill). Fills, borders and
// tracks are that ink at the tables' alphas.

/** The dark tier card fill (MO1.1.3 #6, every tier). */
export const DARK_TIER_CARD = "#262932";
/** The dark pill (MO1.1.3.2 #54). */
export const DARK_PILL = "#1C1F28";
const BRONZE_DARK_INK = "#D9A57F";

/** A tier or level colour as dark-mode ink on `surface`. */
export function darkInk(hex: string, surface: string): string {
  return hex === BRONZE_HEX ? BRONZE_DARK_INK : liftTo(hex, surface);
}

export interface TierCardColours {
  /** Tier label, current tier name, other tiers' icons. */
  ink: string;
  fill: string;
  /** The card's 0.5 px border (24%). */
  border: string;
  /** The rewards line rule (16%). */
  rule: string;
  /** The empty bar track (14%). */
  track: string;
  /** Bar fill, current disc, the rail's stub. */
  solid: string;
  /** The Medal on the current disc: #FFFFFF in both modes (MO1.1.3 #17). */
  onSolid: string;
  /** The light current disc's soft ring (the drawn shadow); none in dark (#16). */
  halo: string | null;
}

/** MO1.1.3 #6-#19 (Bronze drawn; K6: every other tier the same recipe). */
export function tierCardColours(hex: string, dark: boolean): TierCardColours {
  if (!dark) {
    const fill = hex === BRONZE_HEX ? "#FBF7F4" : tintOn(hex, 0.05, "#FFFFFF");
    const track = tintOn(hex, 0.14, fill);
    return { ink: hex, fill, border: `${hex}3D`, rule: `${hex}29`, track, solid: hex, onSolid: "#FFFFFF", halo: track };
  }
  const ink = darkInk(hex, DARK_TIER_CARD);
  return {
    ink,
    fill: DARK_TIER_CARD,
    border: `${ink}3D`, // 24%
    rule: `${ink}29`, // 16%
    track: `${ink}24`, // 14%
    solid: ink,
    onSolid: "#FFFFFF",
    halo: null,
  };
}

export interface PillColours {
  /** Label, level chip text, points, the coin's ring. */
  ink: string;
  /** The pill's 0.5 px border (55%). */
  border: string;
  /** The level chip (12%). */
  chip: string;
  /** The sheen's coloured stops (7%) and its bright middle. */
  sheen: string;
  sheenMid: string;
}

/** MO1.1.3.2 #54-#61 (Bronze drawn; O-4: Silver and Gold the same recipe). */
export function pillColours(level: AchievementLevel | null | undefined, dark: boolean): PillColours {
  const hex = levelHex(level);
  const ink = dark ? darkInk(hex, DARK_PILL) : hex;
  return {
    ink,
    border: `${ink}8C`,
    chip: `${ink}1F`,
    sheen: `${ink}12`,
    // Light: the table's "rgba(255,2…" stop (alpha truncated; 0.5). Dark is
    // not drawn: a faint white, so the sweep does not flash on #1C1F28.
    sheenMid: dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.5)",
  };
}

// ---------------------------------------------------------------------------
// MO1.1.3.3 O-1: the key tint and ink map. The handover draws five keys; the
// other 53 take the neutral fallback (V6-142: ask the designer, neutral until
// then). [light, dark]. Fixed in every colour theme (they belong to the icons).

type Pair = readonly [string, string];
const KEY_TINT: Record<string, Pair> = {
  onboarded: ["#FDF9F1", "#3A342C"],
  notifications_on: ["#FDF9F0", "#3A342C"],
  mind_journal: ["#F8F5FC", "#303141"],
  workouts_bronze: ["#F2F7F4", "#293339"],
  explore_page: ["#F1F7FC", "#1A2939"],
};
const KEY_INK: Record<string, Pair> = {
  mind_journal: ["#7D56AE", "#C3B3FB"],
  workouts_bronze: ["#327451", "#7FC79C"],
  explore_page: ["#2E72AE", "#96C4EC"],
};
const FALLBACK_TINT: Pair = ["#F7F6FA", "#262932"];
/** A locked badge's grid tile, every key (MO1.1.3 #46). */
const LOCKED_TILE: Pair = ["#F6F4F1", "#262932"];

/** The tile behind a key's medallion. `locked` gives the grid's locked tile. */
export const keyTint = (key: string, dark: boolean, locked = false): string =>
  (locked ? LOCKED_TILE : KEY_TINT[key] ?? FALLBACK_TINT)[dark ? 1 : 0];

/** A key's ink (points on Recently unlocked, the earned rung). Fallback #8C8378 / #B8B3C7 (High contrast: the strong ink). */
export const keyInk = (key: string, dark: boolean): string => {
  const pair = KEY_INK[key];
  return pair ? pair[dark ? 1 : 0] : "rgb(var(--c-charcoal-faint))";
};

/** MO1.1.3.1 S3: "Earned Oct 2"; the year only when it is not this year. */
export function formatEarnedAt(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return formatShortDate(d, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : null),
  });
}
