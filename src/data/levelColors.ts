import type { TemplateLevel } from "../types";
import { liftTo, tintOn } from "./folderColors";

/**
 * Level colour map (handover 2026-09-29, 02 "Level colour map"), shared by the
 * starter-program tiles (WO20) and the program detail sheet (WO21): one
 * program attribute, the level, gives every colour.
 *
 * Measured from the frames: WO20 tiles (tint, level label, legend dot) for all
 * three levels; WO21 (header band, body, exercise row, value block, deep
 * shade) for Beginner and Intermediate. 02 gives Advanced the same deep shade
 * as Intermediate (#7D67D9) and there is no Advanced WO21 frame, so its sheet
 * colours are Intermediate's (unspecified; flagged).
 */
export interface LevelColors {
  /** WO20 tile fill. */
  tile: string;
  /** WO20 level label ("the deeper shade of the tile colour"). */
  label: string;
  /** WO20 legend dot. */
  dot: string;
  /** WO21 title, back link, section label, value text, close ring, button. */
  deep: string;
  /** WO21 header band. */
  band: string;
  /** WO21 body. */
  body: string;
  /** WO21 exercise row (name side). */
  row: string;
  /** WO21 value block ("row-strong"). */
  value: string;
  /**
   * WO21 "Add to my routines" fill, under white text: `deep` in light mode
   * (the board's), and a 4.5:1 shade of it in dark mode (see darkLevel).
   */
  fill: string;
}

const BEGINNER: LevelColors = {
  tile: "rgba(162,200,194,0.26)",
  label: "#3B7570",
  dot: "#A2C8C2",
  deep: "#4F8F8A",
  band: "#D3E7E3",
  body: "#EEF6F4",
  row: "#DDEDEA",
  value: "#C3DFDA",
  fill: "#4F8F8A",
};

const INTERMEDIATE: LevelColors = {
  tile: "rgba(174,161,220,0.24)",
  label: "#5F5093",
  dot: "#AEA1DC",
  deep: "#7D67D9",
  band: "#DDD6F3",
  body: "#F1EEFA",
  row: "#E4DEF5",
  value: "#D3CAEF",
  fill: "#7D67D9",
};

const ADVANCED: LevelColors = {
  ...INTERMEDIATE,
  tile: "rgba(125,103,217,0.16)",
  label: "#5B45B8",
  dot: "#7D67D9",
};

export const LEVEL_COLORS: Record<TemplateLevel, LevelColors> = {
  beginner: BEGINNER,
  intermediate: INTERMEDIATE,
  advanced: ADVANCED,
};

export const LEVEL_ORDER: TemplateLevel[] = ["beginner", "intermediate", "advanced"];

/**
 * Mobile v5.1 R3, dark mode (no light islands). The handover has no dark level
 * colours, so they are DERIVED from the level's hue (its legend dot; Advanced's
 * sheet colours follow Intermediate's, as in light) as tints on the dark card:
 * body 8%, exercise row and tile 16%, value block 24%, header band 26%. `deep`
 * (title, back link, section label, value text, close ring) is lifted toward
 * white until it reads at 4.5:1 on the band, the strongest tint it sits on;
 * the tile label likewise on the tile. `fill` is not lifted (white reads only
 * about 2:1 on the lifted deep); its dark values are set below.
 */
const darkLevel = (c: LevelColors, sheetHue: string): LevelColors => {
  const band = tintOn(sheetHue, 0.26);
  const tile = tintOn(c.dot, 0.16);
  return {
    ...c,
    tile,
    label: liftTo(c.label, tile),
    deep: liftTo(c.deep, band),
    band,
    body: tintOn(sheetHue, 0.08),
    row: tintOn(sheetHue, 0.16),
    value: tintOn(sheetHue, 0.24),
  };
};

// Dark mode's button fills: white reads 3.73:1 on #4F8F8A and 4.36:1 on
// #7D67D9, so dark mode uses secondary.deep #4F7F78 (4.53:1) and primary.deep
// #7D6BB5 (4.52:1). Light mode keeps the board's deep.
const DARK_LEVEL_COLORS: Record<TemplateLevel, LevelColors> = {
  beginner: { ...darkLevel(BEGINNER, BEGINNER.dot), fill: "#4F7F78" },
  intermediate: { ...darkLevel(INTERMEDIATE, INTERMEDIATE.dot), fill: "#7D6BB5" },
  advanced: { ...darkLevel(ADVANCED, INTERMEDIATE.dot), fill: "#7D6BB5" },
};

/** The level colour map for the current mode. */
export const levelColorsMap = (dark: boolean): Record<TemplateLevel, LevelColors> =>
  dark ? DARK_LEVEL_COLORS : LEVEL_COLORS;

/** A program with no level takes Intermediate's colours (the Primary Lavender). */
export const levelColors = (level: TemplateLevel | null | undefined, dark = false): LevelColors => {
  const map = levelColorsMap(dark);
  return (level && map[level]) || map.intermediate;
};

export const levelName = (level: TemplateLevel): string => level[0].toUpperCase() + level.slice(1);
