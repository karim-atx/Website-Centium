import type { TemplateLevel } from "../types";

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

/** A program with no level takes Intermediate's colours (the Primary Lavender). */
export const levelColors = (level: TemplateLevel | null | undefined): LevelColors =>
  (level && LEVEL_COLORS[level]) || INTERMEDIATE;

export const levelName = (level: TemplateLevel): string => level[0].toUpperCase() + level.slice(1);
