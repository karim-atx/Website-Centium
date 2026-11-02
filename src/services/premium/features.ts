// Round G1 · the one table of Premium features and free limits (Karim's G5
// list, 2026-11-02). Screens never hard-code a limit: a "limit" entry names
// the free_limits() key its number comes from, and the line is filled from
// that answer. G1 only provides the table; the gates and limits are wired
// into the feature screens with the Database's G2, which enforces them.
//
// Free, always (G5): typing lab values and a full data export. They are not
// features of Premium, so they are not in this table.

import { t, tk, tn } from "../../i18n/core";
import type { FreeLimits } from "./model";

export type PremiumFeature =
  // Free up to a limit, then Premium.
  | "history_days"
  | "barcode_scans_per_day"
  | "own_routines"
  | "habits"
  | "recipes"
  | "locked_journal_folders"
  | "meditations"
  | "programme_preview_week"
  // Premium only.
  | "journal_prompts"
  | "online_food_search"
  | "lab_report_scanning"
  | "report_comparison"
  | "biomarker_trends"
  | "doctor_summary"
  | "ai_voice_food_logging";

export type FeatureKind = "limit" | "premium_only";

export interface PremiumFeatureEntry {
  key: PremiumFeature;
  kind: FeatureKind;
  /** The free_limits() key holding the free allowance (limit entries with a number). */
  limitKey?: keyof FreeLimits;
  /** The feature's name on the plan page (English key, shown through t()). */
  label: string;
  /** The prompt sheet's one line about what Premium adds there (English key). */
  prompt: string;
}

/** The three meditations that stay free (G5); every other one is Premium. */
export const FREE_MEDITATIONS = [tk("Settle in"), tk("Box breathing"), tk("Wind down for sleep")] as const;

export const PREMIUM_FEATURES: readonly PremiumFeatureEntry[] = [
  { key: "history_days", kind: "limit", limitKey: "history_days", label: tk("Your full history in charts"), prompt: tk("Premium shows your charts over your whole history, not just the last few weeks.") },
  { key: "barcode_scans_per_day", kind: "limit", limitKey: "barcode_scans_per_day", label: tk("Unlimited barcode scans"), prompt: tk("Premium lets you scan as many barcodes as you like.") },
  { key: "own_routines", kind: "limit", limitKey: "own_routines", label: tk("Unlimited routines"), prompt: tk("Premium lets you save as many of your own routines as you like.") },
  { key: "habits", kind: "limit", limitKey: "habits", label: tk("Unlimited habits"), prompt: tk("Premium lets you track as many habits as you like.") },
  { key: "recipes", kind: "limit", limitKey: "recipes", label: tk("Unlimited recipes"), prompt: tk("Premium lets you save as many recipes as you like.") },
  { key: "locked_journal_folders", kind: "limit", limitKey: "locked_journal_folders", label: tk("More locked journal folders"), prompt: tk("Premium lets you lock as many journal folders as you like.") },
  { key: "meditations", kind: "limit", label: tk("The full meditation library"), prompt: tk("Premium opens every meditation in the library.") },
  { key: "programme_preview_week", kind: "limit", label: tk("Every week of Centium programmes"), prompt: tk("Premium opens every week of the programme, not just the first.") },
  { key: "journal_prompts", kind: "premium_only", label: tk("Journal prompts"), prompt: tk("Premium gives you a prompt to write about each day.") },
  { key: "online_food_search", kind: "premium_only", label: tk("Online food search"), prompt: tk("Premium searches online food databases when a food isn't in Centium.") },
  { key: "lab_report_scanning", kind: "premium_only", label: tk("Lab report scanning"), prompt: tk("Premium reads your lab report from a photo, so you don't type each value.") },
  { key: "report_comparison", kind: "premium_only", label: tk("Report comparison"), prompt: tk("Premium puts two lab reports side by side.") },
  { key: "biomarker_trends", kind: "premium_only", label: tk("Biomarker trends"), prompt: tk("Premium shows how each marker has changed over time.") },
  { key: "doctor_summary", kind: "premium_only", label: tk("A summary for your doctor"), prompt: tk("Premium makes a summary of your records to share with your doctor.") },
  { key: "ai_voice_food_logging", kind: "premium_only", label: tk("AI voice food logging"), prompt: tk("Premium lets you log food by saying what you ate.") },
];

export const featureEntry = (key: PremiumFeature): PremiumFeatureEntry => {
  const e = PREMIUM_FEATURES.find((f) => f.key === key);
  if (!e) throw new Error(`unknown Premium feature: ${key}`);
  return e;
};

/**
 * What the free plan includes for a limit feature, from free_limits(); null
 * for a Premium-only feature, or while the numbers are unknown (never a
 * guessed number).
 */
export function freeAllowanceText(key: PremiumFeature, limits: FreeLimits | null): string | null {
  const e = featureEntry(key);
  if (e.kind !== "limit") return null;
  if (key === "meditations") return t("Free: {names}", { names: FREE_MEDITATIONS.map((n) => t(n)).join(", ") });
  if (key === "programme_preview_week") return t("Free: the first week of each programme");
  if (!e.limitKey || !limits) return null;
  const n = limits[e.limitKey];
  if (typeof n !== "number") return null;
  switch (key) {
    case "history_days":
      return tn(n, "Free: the last {n} day", "Free: the last {n} days");
    case "barcode_scans_per_day":
      return tn(n, "Free: {n} scan a day", "Free: {n} scans a day");
    case "own_routines":
      return tn(n, "Free: {n} routine", "Free: {n} routines");
    case "habits":
      return tn(n, "Free: {n} habit", "Free: {n} habits");
    case "recipes":
      return tn(n, "Free: {n} recipe", "Free: {n} recipes");
    case "locked_journal_folders":
      return tn(n, "Free: {n} locked folder", "Free: {n} locked folders");
    default:
      return null;
  }
}
