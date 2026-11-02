// Round G3 · the Database calls (DB_G3_HANDOVER.md). The pure decisions are
// in ./g3.
//
// HIDDEN WHILE OFF: every read answers ATXQ0 while the Premium switch is off
// for the caller, and a Database without G3 has no such function; both read
// as "hidden" (failKind), so the screen shows nothing new. ATXQ1 is the
// locked state (the prompt), never an error line.
//
// These are G3's own tables (centium_programmes, mind_library, ...), not coach
// programmes: nothing here goes through services/programmes.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t, tk } from "../../i18n/core";
import { premiumRefusalMessage } from "./asks";
import type { PremiumFeature } from "./features";
import {
  compareErrorText,
  failKind,
  parseCompare,
  parseContentLines,
  parseDoctorSummary,
  parseLibrary,
  parseMyProgrammes,
  parsePromptLibrary,
  parsePromptOfTheDay,
  parseProgrammes,
  parseSessions,
  parseSuggestions,
  parseTrend,
  parseWeeklyReview,
  startErrorText,
  summaryErrorText,
  type CompareRow,
  type ContentLines,
  type DoctorSummary,
  type G3State,
  type JournalPrompt,
  type LibrarySession,
  type MyCentiumProgramme,
  type CentiumProgramme,
  type ProgrammeSession,
  type TargetSuggestion,
  type TrendPoint,
  type WeeklyReview,
} from "./g3";

type Err = { code?: string; message?: string; details?: string | null };
type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: Err | null }>;
// The functions are hand-typed in database.types; one untyped door keeps one shape here.
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

const LOAD_FAILED = tk("Couldn't load this. Try again.");

/** A G3 read as the screen's state (never "loading"). */
async function read<T>(fn: string, args: Record<string, unknown> | undefined, parse: (d: unknown) => T, fallback: string = LOAD_FAILED): Promise<G3State<T>> {
  try {
    const { data, error } = await rpc(fn, args);
    if (error) {
      if (isOffline(error)) return { kind: "error", message: OFFLINE_MESSAGE };
      const k = failKind(error);
      if (k === "hidden") return { kind: "hidden" };
      if (k === "premium") return { kind: "premium" };
      console.error(`[premium] ${fn}:`, error.code, error.message);
      return { kind: "error", message: t(fallback) };
    }
    return { kind: "ready", value: parse(data) };
  } catch (e) {
    return { kind: "error", message: isOffline(e) ? OFFLINE_MESSAGE : t(fallback) };
  }
}

export type G3Write<T> = { ok: true; value: T } | { ok: false; code: string | null; message: string; premium: boolean };

/**
 * A G3 write. ATXQ1 asks the host for the prompt (what was entered stays on
 * screen) and says so plainly; any other refusal is worded by `words`.
 */
async function write<T>(fn: string, args: Record<string, unknown>, parse: (d: unknown) => T, feature: PremiumFeature | null, words: (code: string | null) => string): Promise<G3Write<T>> {
  try {
    const { data, error } = await rpc(fn, args);
    if (error) {
      if (isOffline(error)) return { ok: false, code: null, message: OFFLINE_MESSAGE, premium: false };
      const premium = premiumRefusalMessage(error, feature);
      if (premium) return { ok: false, code: error.code ?? "ATXQ1", message: premium, premium: true };
      console.error(`[premium] ${fn}:`, error.code, error.message);
      return { ok: false, code: error.code ?? null, message: words(error.code ?? null), premium: false };
    }
    return { ok: true, value: parse(data) };
  } catch (e) {
    return { ok: false, code: null, message: isOffline(e) ? OFFLINE_MESSAGE : words(null), premium: false };
  }
}

const saveFailed = () => t("Couldn't save. Try again.");

// ---- the content ----

export const fetchContentLines = (): Promise<G3State<ContentLines>> => read("premium_content_lines", undefined, parseContentLines);

export const fetchCentiumProgrammes = (): Promise<G3State<CentiumProgramme[]>> => read("centium_programmes", undefined, parseProgrammes);

export const fetchProgrammeSessions = (programmeId: string): Promise<G3State<ProgrammeSession[]>> =>
  read("centium_programme_sessions", { p_programme_id: programmeId }, parseSessions);

export const fetchMyCentiumProgrammes = (): Promise<G3State<MyCentiumProgramme[]>> => read("my_centium_programmes", undefined, parseMyProgrammes);

export const startCentiumProgramme = (programmeId: string, startsOn: string): Promise<G3Write<string>> =>
  write("start_centium_programme", { p_programme_id: programmeId, p_starts_on: startsOn }, (d) => (typeof d === "string" ? d : String(d ?? "")), null, startErrorText);

export const endCentiumProgramme = (startId: string): Promise<G3Write<true>> =>
  write("end_centium_programme", { p_start_id: startId }, () => true as const, null, () => t("Couldn't end the programme. Try again."));

/** A session past the free preview needs Premium: ATXQ1 → the prompt. */
export const markCentiumSessionDone = (startId: string, sessionNumber: number, done: boolean): Promise<G3Write<true>> =>
  write("mark_centium_session_done", { p_start_id: startId, p_session_number: sessionNumber, p_done: done }, () => true as const, "programme_preview_week", saveFailed);

export const fetchMindLibrary = (): Promise<G3State<LibrarySession[]>> => read("mind_library", undefined, parseLibrary);

export const fetchPromptLibrary = (): Promise<G3State<JournalPrompt[]>> => read("journal_prompt_library", undefined, parsePromptLibrary);

/** Premium (ATXQ1 → "premium", which shows nothing for a free member). */
export const fetchPromptOfTheDay = (): Promise<G3State<{ number: number; groupTitle: string; text: string } | null>> =>
  read("journal_prompt_of_the_day", undefined, parsePromptOfTheDay);

// ---- the readers ----

export const fetchWeeklyReview = (weekStart: string | null): Promise<G3State<WeeklyReview | null>> =>
  read("my_weekly_review", weekStart ? { p_week_start: weekStart } : {}, parseWeeklyReview);

export const fetchTargetSuggestions = (): Promise<G3State<TargetSuggestion[]>> => read("my_target_suggestions", undefined, parseSuggestions);

export const acceptTargetSuggestion = (kind: "steps" | "water"): Promise<G3Write<number | null>> =>
  write("accept_target_suggestion", { p_kind: kind }, (d) => (typeof d === "number" ? d : typeof d === "string" && d.trim() ? Number(d) : null), "weekly_review", (code) =>
    code === "ATX08" ? t("That suggestion has changed. Look again next week.") : saveFailed()
  );

export async function fetchDoctorSummary(from: string, to: string): Promise<G3State<DoctorSummary | null> | { kind: "refused"; message: string }> {
  try {
    const { data, error } = await rpc("my_doctor_summary", { p_from: from, p_to: to });
    if (error) {
      if (isOffline(error)) return { kind: "error", message: OFFLINE_MESSAGE };
      const k = failKind(error);
      if (k === "hidden") return { kind: "hidden" };
      if (k === "premium") return { kind: "premium" };
      return { kind: "refused", message: summaryErrorText(error.code) };
    }
    return { kind: "ready", value: parseDoctorSummary(data) };
  } catch (e) {
    return { kind: "error", message: isOffline(e) ? OFFLINE_MESSAGE : summaryErrorText(null) };
  }
}

export async function compareLabReports(a: string, b: string): Promise<G3State<CompareRow[]> | { kind: "refused"; message: string }> {
  try {
    const { data, error } = await rpc("compare_my_lab_reports", { p_panel_a: a, p_panel_b: b });
    if (error) {
      if (isOffline(error)) return { kind: "error", message: OFFLINE_MESSAGE };
      const k = failKind(error);
      if (k === "hidden") return { kind: "hidden" };
      if (k === "premium") return { kind: "premium" };
      return { kind: "refused", message: compareErrorText(error.code) };
    }
    return { kind: "ready", value: parseCompare(data) };
  } catch (e) {
    return { kind: "error", message: isOffline(e) ? OFFLINE_MESSAGE : compareErrorText(null) };
  }
}

export const fetchBiomarkerTrend = (markerKey: string): Promise<G3State<TrendPoint[]>> => read("my_biomarker_trend", { p_marker_key: markerKey }, parseTrend);
