// Batch B · FQ: "Other" allergies in the member's own words (decisions 9 to
// 25). Pure rules only (no Supabase), so they are unit tested. The Database's
// shape (feature/fq-custom-allergies, 20261227020000):
//   custom_allergies (id, user_id, label 1-60 trimmed, severity, note <= 200),
//   own rows by RLS, a professional reads under allergies_dietary;
//   a trigger raises ATXK3 (empty or over 60), ATXK4 (a control or bidi
//   character), ATXK5 (a duplicate ignoring case), ATXK6 (a 21st, on insert);
//   the note's check is 23514.
// The Website merges BEFORE that migration: until it lands, the table read
// answers "relation does not exist" (PGRST205 / 42P01) and the Other section
// stays hidden (`otherAllergiesMissing`).

import { t, tk } from "../../i18n/core";
import { OFFLINE_MESSAGE } from "../network-error";
import type { AllergySeverity } from "./clientNutritionModel";

/** decision 11: 1 to 60 characters, one line, trimmed. */
export const OTHER_LABEL_MAX = 60;
/** decision 12: at most 20 per member. */
export const OTHER_MAX = 20;
/** decision 15: an optional note of up to 200 characters. */
export const OTHER_NOTE_MAX = 200;

export interface OtherAllergy {
  id: string;
  label: string;
  severity: AllergySeverity;
  note: string | null;
}

/** One row in the sheet's draft: `id` null until it is saved. `key` is stable across renames. */
export interface OtherDraft {
  key: string;
  id: string | null;
  label: string;
  severity: AllergySeverity;
  note: string | null;
}

// ---------------------------------------------------------------------------
// The member's text, shown as data
// ---------------------------------------------------------------------------

/**
 * decision 25: the member's own words keep their own direction inside a line
 * in the other language. First-strong isolate (U+2068) to pop directional
 * isolate (U+2069). The label itself never carries either: the Database
 * refuses bidi characters (ATXK4).
 */
export const isolate = (text: string): string => `⁨${text}⁩`;

/** The label as the Database stores it: trimmed at both ends. */
export const cleanLabel = (raw: string): string => raw.replace(/^\s+|\s+$/g, "");

// The Database's ATXK4: [[:cntrl:]] and U+202A-202E, U+2066-2069.
// eslint-disable-next-line no-control-regex -- control and bidi characters are exactly what the rule refuses
const NOT_ALLOWED = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;

// ---------------------------------------------------------------------------
// Errors: one line per rule (decision 17)
// ---------------------------------------------------------------------------

export type OtherProblem = "ATXK3" | "ATXK4" | "ATXK5" | "ATXK6" | "23514";

const PROBLEM_TEXT: Record<OtherProblem, string> = {
  ATXK3: tk("Use 1 to 60 characters."),
  ATXK4: tk("Use letters, numbers and punctuation on one line."),
  ATXK5: tk("You've already added this allergy."),
  ATXK6: tk("You can add up to 20 of your own."),
  "23514": tk("Keep the note to 200 characters."),
};

/** The English key of a rule's line (for pure code that hands a key to a screen's t()). */
export const otherProblemKey = (p: OtherProblem): string => PROBLEM_TEXT[p];

export const isOtherProblem =(code: unknown): code is OtherProblem => typeof code === "string" && code in PROBLEM_TEXT;

/** The line for a rule the label or note broke (the app's language). */
export const otherProblemText = (p: OtherProblem): string => t(PROBLEM_TEXT[p]);

/**
 * What a custom_allergies write's error says, inline on its row or field:
 * each rule its own line, then the offline line, then the generic one.
 */
export function otherAllergyError(error: { code?: string } | null | undefined, offline: boolean): string {
  if (offline) return t(OFFLINE_MESSAGE);
  if (error && isOtherProblem(error.code)) return otherProblemText(error.code);
  return t("Couldn't save your allergies. Try again.");
}

/** Today's database has no custom_allergies: PostgREST answers PGRST205, Postgres 42P01. */
export function otherAllergiesMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return /relation .*custom_allergies.* does not exist|could not find the table .*custom_allergies/i.test(error.message ?? "");
}

/**
 * The rule a label breaks before it is sent, or null. The Database checks
 * the same rules (the trigger); checking first means a typo never costs a
 * Save. `others` are the other rows' labels (a rename skips its own).
 */
export function labelProblem(raw: string, others: string[]): OtherProblem | null {
  const label = cleanLabel(raw);
  if (label.length < 1 || [...label].length > OTHER_LABEL_MAX) return "ATXK3";
  if (NOT_ALLOWED.test(label)) return "ATXK4";
  const low = label.toLowerCase();
  if (others.some((o) => cleanLabel(o).toLowerCase() === low)) return "ATXK5";
  return null;
}

/** Whether another one can be added (decision 12). */
export const canAddOther = (count: number): boolean => count < OTHER_MAX;

// ---------------------------------------------------------------------------
// Saving: what Save allergies writes to custom_allergies
// ---------------------------------------------------------------------------

/**
 * Deletes first (a freed slot or name can be reused in the same Save), then
 * updates (label or severity changed), then inserts (no id yet).
 */
export function otherDiff(before: OtherAllergy[], after: OtherDraft[]): { remove: string[]; update: OtherDraft[]; insert: OtherDraft[] } {
  const was = new Map(before.map((b) => [b.id, b]));
  const keep = new Set(after.filter((a) => a.id).map((a) => a.id as string));
  return {
    remove: before.filter((b) => !keep.has(b.id)).map((b) => b.id),
    update: after.filter((a) => {
      const b = a.id ? was.get(a.id) : undefined;
      return !!b && (b.label !== cleanLabel(a.label) || b.severity !== a.severity);
    }),
    insert: after.filter((a) => !a.id),
  };
}

/** A member's own allergies in the order they added them is the Database's; the sheet keeps its own. */
export const draftsFrom = (rows: OtherAllergy[]): OtherDraft[] => rows.map((r) => ({ key: r.id, id: r.id, label: r.label, severity: r.severity, note: r.note }));
