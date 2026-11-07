// Round K · DW "Before you start" (Database 20261226550000, HANDOVER_API
// "Round K · DW"): the member's and the professional's calls. Its own tables,
// read and written only through these functions; the outcome comes from the
// server. A read that fails (offline, or the Database not live yet) is a
// failed Read, and the screens then show nothing new.

import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "../pro/rpc";
import { getLanguage, tk } from "../../i18n/core";
import type { Read, Write } from "../pro/clients";
import { isLabel, isOutcome, submitArgs, type ReadinessAnswers, type ReadinessIntensity, type ReadinessLabel, type ReadinessOutcome } from "./model";

export interface ReadinessForm {
  language: string;
  /** The form's words by key (intro.*, q1–q4, note.*, outcome.*, urgent, pro.*, clearance.button, footer). */
  texts: Record<string, string>;
  /** The line under the urgent line for the caller's country, or null. */
  urgentNumbers: string | null;
}

export interface ReadinessResult {
  screeningId: string;
  outcome: ReadinessOutcome;
  lineKey: string;
  label: ReadinessLabel;
  urgent: boolean;
}

export interface MyReadiness extends ReadinessResult {
  completedAt: string;
  exercisesRegularly: boolean | null;
  conditions: string[];
  warningSigns: string[];
  intensity: ReadinessIntensity | null;
  note: string | null;
  clearanceOffered: boolean;
  clearedAt: string | null;
  clearedOn: string | null;
  clearanceNote: string | null;
}

export interface ReadinessRequest {
  requestId: string;
  professionalId: string;
  professionalFirstName: string;
  requestedAt: string;
}

export interface ClientReadiness {
  /** The client shares medical_history with this professional. */
  shared: boolean;
  requestId: string | null;
  requestedAt: string | null;
  requestAnsweredAt: string | null;
  requestOpen: boolean;
  /** Only when shared and filled in. */
  form: {
    screeningId: string;
    completedAt: string;
    label: ReadinessLabel;
    outcome: ReadinessOutcome;
    exercisesRegularly: boolean | null;
    conditions: string[];
    warningSigns: string[];
    intensity: string | null;
    note: string | null;
    clearedAt: string | null;
    clearedOn: string | null;
    clearanceNote: string | null;
  } | null;
}

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const intensity = (v: unknown): ReadinessIntensity | null => (v === "light_moderate" || v === "vigorous" ? v : null);
const firstRow = (data: unknown): Row | null => (Array.isArray(data) ? ((data[0] as Row | undefined) ?? null) : data && typeof data === "object" ? (data as Row) : null);
const readFail = <T,>(error: unknown): Read<T> => ({ ok: false, offline: isOffline(error) });

function message(error: unknown, fallback: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code;
  if (code === "ATX12") return tk("That person isn't your client any more.");
  if (code === "ATX02") return tk("That's the limit for today. Try again tomorrow.");
  return fallback;
}

/** The form's words in the app's language, and the caller's urgent numbers. */
export async function fetchReadinessForm(): Promise<Read<ReadinessForm>> {
  const { data, error } = await rpc("readiness_form", { p_language: getLanguage() === "ar" ? "ar" : "en" });
  if (error || !data || typeof data !== "object") return readFail(error);
  const d = data as Row;
  const texts: Record<string, string> = {};
  if (d.texts && typeof d.texts === "object") for (const [k, v] of Object.entries(d.texts as Row)) if (typeof v === "string") texts[k] = v;
  return { ok: true, data: { language: str(d.language) ?? "en", texts, urgentNumbers: str(d.urgent_numbers) } };
}

function toResult(r: Row): ReadinessResult | null {
  const id = str(r.screening_id);
  if (!id || !isOutcome(r.outcome)) return null;
  return { screeningId: id, outcome: r.outcome, lineKey: str(r.line_key) ?? "", label: isLabel(r.label) ? r.label : r.outcome, urgent: r.urgent === true };
}

export async function submitReadiness(a: ReadinessAnswers): Promise<{ ok: true; result: ReadinessResult } | { ok: false; message: string }> {
  const args = submitArgs(a);
  if (!args) return { ok: false, message: tk("Answer every question first.") };
  const { data, error } = await rpc("submit_readiness_form", args);
  const r = !error ? firstRow(data) : null;
  const result = r ? toResult(r) : null;
  if (!result) return { ok: false, message: (error as { code?: string } | null)?.code === "22023" ? tk("Something in your answers wasn't accepted. Check them and try again.") : message(error, tk("Couldn't send it. Try again.")) };
  return { ok: true, result };
}

/** The latest form; null: never filled in. */
export async function fetchMyReadiness(): Promise<Read<MyReadiness | null>> {
  const { data, error } = await rpc("my_readiness");
  if (error) return readFail(error);
  const r = firstRow(data);
  const base = r ? toResult(r) : null;
  if (!r || !base) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      ...base,
      completedAt: str(r.completed_at) ?? "",
      exercisesRegularly: bool(r.exercises_regularly),
      conditions: strs(r.conditions),
      warningSigns: strs(r.warning_signs),
      intensity: intensity(r.intensity),
      note: str(r.note),
      clearanceOffered: r.clearance_offered === true,
      clearedAt: str(r.cleared_at),
      clearedOn: str(r.cleared_on),
      clearanceNote: str(r.clearance_note),
    },
  };
}

export async function recordClearance(clearedOn: string | null, note: string | null): Promise<Write> {
  const { error } = await rpc("record_medical_clearance", { p_cleared_on: clearedOn || null, p_note: note?.trim() || null });
  return error ? { ok: false, message: message(error, tk("Couldn't save that. Try again.")) } : { ok: true };
}

export async function removeClearance(): Promise<Write> {
  const { error } = await rpc("remove_medical_clearance");
  return error ? { ok: false, message: message(error, tk("Couldn't remove it. Try again.")) } : { ok: true };
}

/** The professionals waiting on a form (the next one answers them all). */
export async function fetchMyReadinessRequests(): Promise<Read<ReadinessRequest[]>> {
  const { data, error } = await rpc("my_readiness_requests");
  if (error) return readFail(error);
  const rows = Array.isArray(data) ? (data as Row[]) : [];
  return {
    ok: true,
    data: rows
      .map((r) => ({ requestId: str(r.request_id) ?? "", professionalId: str(r.professional_id) ?? "", professionalFirstName: str(r.professional_first_name) ?? "", requestedAt: str(r.requested_at) ?? "" }))
      .filter((r) => r.requestId && r.professionalId),
  };
}

// --- The professional ---

/** "Send Before you start" and "Ask for a fresh one" are the same call. */
export async function requestReadiness(clientId: string): Promise<Write> {
  const { error } = await rpc("request_readiness_form", { p_client_id: clientId });
  if (!error) return { ok: true };
  if ((error as { code?: string }).code === "22023") return { ok: false, message: tk("You've already asked. It's waiting for them.") };
  return { ok: false, message: message(error, tk("Couldn't send it. Try again.")) };
}

export async function withdrawReadiness(requestId: string): Promise<Write> {
  const { error } = await rpc("withdraw_readiness_request", { p_request_id: requestId });
  if (!error) return { ok: true };
  if ((error as { code?: string }).code === "ATX08") return { ok: false, message: tk("This request isn't open any more.") };
  return { ok: false, message: message(error, tk("Couldn't withdraw it. Try again.")) };
}

export async function fetchClientReadiness(clientId: string): Promise<Read<ClientReadiness>> {
  const { data, error } = await rpc("client_readiness", { p_client_id: clientId });
  if (error) return readFail(error);
  const r = firstRow(data);
  if (!r) return { ok: false, offline: false };
  const shared = r.shared === true;
  const id = str(r.screening_id);
  const outcome = r.outcome;
  return {
    ok: true,
    data: {
      shared,
      requestId: str(r.request_id),
      requestedAt: str(r.requested_at),
      requestAnsweredAt: str(r.request_answered_at),
      requestOpen: r.request_open === true,
      form:
        shared && id && isOutcome(outcome)
          ? {
              screeningId: id,
              completedAt: str(r.completed_at) ?? "",
              label: isLabel(r.label) ? r.label : outcome,
              outcome,
              exercisesRegularly: bool(r.exercises_regularly),
              conditions: strs(r.conditions),
              warningSigns: strs(r.warning_signs),
              intensity: str(r.intensity),
              note: str(r.note),
              clearedAt: str(r.cleared_at),
              clearedOn: str(r.cleared_on),
              clearanceNote: str(r.clearance_note),
            }
          : null,
    },
  };
}
