import type { ColorTheme } from "../../types";
import { normalizeColorTheme } from "../../theme/colorThemes";

// Pure half of the presentation sync (Stage A1, HANDOVER_API.md "Colour
// themes" and "Accessibility"): the app's values against the columns of
// public.device_presentation_settings. No Supabase import, so node --test can
// load it.

/** This app's row. app_platform is ('web', 'mobile'); the website is 'web'. */
export const PRESENTATION_PLATFORM = "web" as const;

/** theme_mode: light / dark / auto ('auto' follows the operating system). */
export type ThemeMode = "light" | "dark" | "auto";

/** The five color_theme values the contract says to offer. Never ocean, sunset or berry. */
export type DbColorTheme = "centium" | "sky_slate" | "rose_blush" | "gold_amber" | "coral_terracotta";

/** Everything this device shows, as the app holds it. */
export interface Presentation {
  theme: ThemeMode;
  colorTheme: ColorTheme;
  largerText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  biggerTargets: boolean;
}

/** The writable columns, as the table holds them. */
export interface PresentationRow {
  theme: ThemeMode;
  color_theme: DbColorTheme;
  larger_text: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
  bigger_tap_targets: boolean;
}

/**
 * What this website shows before anything is chosen: light, Centium, every
 * toggle off (the app's default since before the sync, kept). The table's own
 * default theme is 'auto'; a device still on these values writes nothing.
 */
export const APP_DEFAULT: Presentation = {
  theme: "light",
  colorTheme: "centium",
  largerText: false,
  reduceMotion: false,
  highContrast: false,
  biggerTargets: false,
};

const TO_DB: Record<ColorTheme, DbColorTheme> = {
  centium: "centium",
  sky: "sky_slate",
  rose: "rose_blush",
  gold: "gold_amber",
  coral: "coral_terracotta",
};

/** The app's theme id as the color_theme enum value. */
export function toDbColorTheme(theme: ColorTheme): DbColorTheme {
  return TO_DB[theme] ?? "centium";
}

/**
 * A stored color_theme as one of the app's five. The retired ocean, sunset
 * and berry still exist on the enum (PostgreSQL cannot drop a value) and are
 * read through the same retired-theme mapping as an old local value (D2);
 * they are never written.
 */
export function fromDbColorTheme(value: unknown): ColorTheme {
  const hit = (Object.keys(TO_DB) as ColorTheme[]).find((k) => TO_DB[k] === value);
  return hit ?? normalizeColorTheme(value);
}

function toThemeMode(value: unknown): ThemeMode {
  return value === "light" || value === "dark" ? value : "auto";
}

export function rowToPresentation(row: Partial<Record<keyof PresentationRow, unknown>>): Presentation {
  return {
    theme: toThemeMode(row.theme),
    colorTheme: fromDbColorTheme(row.color_theme),
    largerText: row.larger_text === true,
    reduceMotion: row.reduce_motion === true,
    highContrast: row.high_contrast === true,
    biggerTargets: row.bigger_tap_targets === true,
  };
}

export function presentationToRow(p: Presentation): PresentationRow {
  return {
    theme: p.theme,
    color_theme: toDbColorTheme(p.colorTheme),
    larger_text: p.largerText,
    reduce_motion: p.reduceMotion,
    high_contrast: p.highContrast,
    bigger_tap_targets: p.biggerTargets,
  };
}

/**
 * Only the columns that differ. UPDATE on this table is granted column by
 * column, so the write names exactly what changed and nothing else.
 */
export function changedColumns(from: Presentation, to: Presentation): Partial<PresentationRow> {
  const a = presentationToRow(from);
  const b = presentationToRow(to);
  const out: Partial<PresentationRow> = {};
  for (const key of Object.keys(b) as (keyof PresentationRow)[]) {
    if (a[key] !== b[key]) (out as Record<string, unknown>)[key] = b[key];
  }
  return out;
}

/** Whether two settings would store the same row. */
export function samePresentation(a: Presentation, b: Presentation): boolean {
  return Object.keys(changedColumns(a, b)).length === 0;
}
