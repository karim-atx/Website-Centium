import { supabase } from "../../../lib/supabase/client";
import { statusFor } from "./index";
import { fileTypeOf, type FileMeta } from "../storage/fileMeta";
import { tk } from "../../i18n/core";

// HE1.9 (Biomarkers & imaging): one row per RESULT, with the report it came
// from, on the Database B2 model (HANDOVER_API.md "B2 · Health records and
// cycle"):
// - blood_panels gains name (1-120 in the DB; the app allows 1-60) and the
//   file description (file_name, file_type, file_pages, file_bytes);
// - a result can stand alone: blood_markers.blood_panel_id null with
//   result_date set; `source` is GENERATED and never sent;
// - save_lab_report(p_panel, p_markers) saves a report and its results in
//   one transaction (ATXA6 on a bad payload).
// Every UPDATE below stays inside the column grants: blood_markers (value,
// unit, range_low, range_high, status, name, marker_key, result_date) and
// blood_panels (panel_date, name, source_image_url, file_*). blood_panel_id
// is not updatable, so a panel result moved to another date becomes a
// standalone copy and the original row is deleted.
const db = supabase;

export interface LabResult {
  id: string;
  /** null for a standalone result (B2). */
  panelId: string | null;
  /** yyyy-mm-dd: the report's date, or the result's own date when standalone. */
  date: string;
  /** Object path of the report file in lab-reports, or null. */
  filePath: string | null;
  /** The report's name (null = unnamed; standalone results have none). */
  reportName: string | null;
  name: string;
  markerKey: string | null;
  value: number;
  unit: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  status: "low" | "normal" | "high" | null;
}

export interface LabPanel {
  id: string;
  date: string;
  name: string | null;
  filePath: string | null;
  fileName: string | null;
  fileType: "pdf" | "image" | null;
  filePages: number | null;
  fileBytes: number | null;
}

export type LabResultsRead = { ok: true; results: LabResult[]; panels: LabPanel[] } | { ok: false; message: string };

type MarkerRow = {
  id: string;
  name: string;
  marker_key: string | null;
  value: number | string;
  unit: string;
  range_low: number | string | null;
  range_high: number | string | null;
  status: "low" | "normal" | "high" | null;
  result_date?: string | null;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

/** Every result the user has (oldest first) and every report. */
export async function getLabResults(userId: string): Promise<LabResultsRead> {
  const [panels, alone] = await Promise.all([
    db
      .from("blood_panels")
      .select("id, panel_date, name, source_image_url, file_name, file_type, file_pages, file_bytes, blood_markers(id, name, marker_key, value, unit, range_low, range_high, status)")
      .eq("user_id", userId)
      .order("panel_date", { ascending: true }),
    db
      .from("blood_markers")
      .select("id, name, marker_key, value, unit, range_low, range_high, status, result_date")
      .eq("user_id", userId)
      .is("blood_panel_id", null),
  ]);
  if (panels.error || alone.error) {
    console.error("[labs] Could not load results:", (panels.error ?? alone.error)?.message);
    return { ok: false, message: "Couldn't load your results." };
  }
  const results: LabResult[] = [];
  const out: LabPanel[] = [];
  const toResult = (m: MarkerRow, panel: { id: string | null; date: string; file: string | null; name: string | null }): LabResult => ({
    id: m.id,
    panelId: panel.id,
    date: panel.date,
    filePath: panel.file,
    reportName: panel.name,
    name: m.name,
    markerKey: m.marker_key ?? null,
    value: Number(m.value),
    unit: m.unit,
    rangeLow: num(m.range_low),
    rangeHigh: num(m.range_high),
    status: m.status,
  });
  for (const p of panels.data ?? []) {
    out.push({
      id: p.id,
      date: p.panel_date,
      name: p.name ?? null,
      filePath: p.source_image_url ?? null,
      fileName: p.file_name ?? null,
      fileType: fileTypeOf(p.file_type),
      filePages: p.file_pages ?? null,
      fileBytes: p.file_bytes === null || p.file_bytes === undefined ? null : Number(p.file_bytes),
    });
    for (const m of (p.blood_markers ?? []) as MarkerRow[]) {
      results.push(toResult(m, { id: p.id, date: p.panel_date, file: p.source_image_url ?? null, name: p.name ?? null }));
    }
  }
  for (const m of (alone.data ?? []) as MarkerRow[]) {
    if (m.result_date) results.push(toResult(m, { id: null, date: m.result_date, file: null, name: null }));
  }
  results.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { ok: true, results, panels: out };
}

/** The key a result groups under: its catalogue marker, else its name. */
export const resultKey = (r: { markerKey?: string | null; name: string }) =>
  r.markerKey ? `key:${r.markerKey}` : r.name.toLowerCase();

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface ResultInput {
  name: string;
  value: number;
  unit: string;
  markerKey: string | null;
  rangeLow: number | null;
  rangeHigh: number | null;
}

const markerPayload = (m: ResultInput) => ({
  name: m.name.trim(),
  value: round4(m.value),
  unit: m.unit.trim(),
  range_low: m.rangeLow,
  range_high: m.rangeHigh,
  status: statusFor(m.value, m.rangeLow, m.rangeHigh),
  marker_key: m.markerKey,
});

/**
 * HE1.9.2.2 Save: the report and its ticked results in ONE transaction
 * (save_lab_report). Name 1-60 (empty = unnamed), panel date, the uploaded
 * object path and its description.
 */
export async function saveLabReport(input: {
  name: string | null;
  date: string;
  filePath: string | null;
  meta: FileMeta | null;
  results: ResultInput[];
  /** Round E: the results were read off the report on the device. */
  scanned?: boolean;
}): Promise<{ ok: boolean; panelId?: string; message?: string }> {
  const p_panel = {
    panel_date: input.date,
    name: input.name?.trim() || null,
    source_image_url: input.filePath,
    ...(input.filePath && input.meta ? input.meta : {}),
  };
  // Round E (Database 20261224010000): each result says how it was entered.
  // A scanned report carries no file (ATXN3), which the scan flow never sends.
  const entry_method = input.scanned ? "scanned" : "typed";
  const { data, error } = await db.rpc("save_lab_report", { p_panel, p_markers: input.results.map((m) => ({ ...markerPayload(m), entry_method })) });
  if (error) {
    console.error("[labs] save_lab_report failed:", error.code, error.message);
    return { ok: false, message: tk("Couldn't save. Try again.") };
  }
  return { ok: true, panelId: data as string };
}

/** A typed single result: a standalone row with its own date (no panel). */
export async function addStandaloneResult(userId: string, m: ResultInput, date: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await db.from("blood_markers").insert({ user_id: userId, result_date: date, ...markerPayload(m) });
  if (error) {
    console.error("[labs] Could not add the result:", error.message);
    return { ok: false, message: tk("Couldn't save. Try again.") };
  }
  return { ok: true };
}

/** Edits one result (value, unit, printed range); the status is worked out again here. */
export async function updateLabResult(id: string, patch: Omit<ResultInput, "name" | "markerKey">): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await db
    .from("blood_markers")
    .update({
      value: round4(patch.value),
      unit: patch.unit,
      range_low: patch.rangeLow,
      range_high: patch.rangeHigh,
      status: statusFor(patch.value, patch.rangeLow, patch.rangeHigh),
    })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    if (error) console.error("[labs] Could not update result:", error.message);
    return { ok: false, message: tk("Couldn't save. Try again.") };
  }
  return { ok: true };
}

/** A report's name, date or file (OURS-lab-report-edit). */
export async function updatePanel(
  panelId: string,
  patch: { name?: string | null; panel_date?: string; source_image_url?: string } & Partial<FileMeta>
): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await db.from("blood_panels").update(patch).eq("id", panelId).select("id");
  if (error || !data || data.length === 0) {
    if (error) console.error("[labs] Could not update the report:", error.message);
    return { ok: false, message: tk("Couldn't save. Try again.") };
  }
  return { ok: true };
}

/**
 * Moves one result to another date. Standalone: its result_date changes.
 * On a report: a standalone copy on the new date is written, then the
 * original row goes (the copy is removed again if that delete fails).
 */
export async function moveLabResult(userId: string, result: LabResult, all: LabResult[], date: string): Promise<{ ok: boolean; message?: string }> {
  if (result.date === date) return { ok: true };
  if (!result.panelId) {
    const { data, error } = await db.from("blood_markers").update({ result_date: date }).eq("id", result.id).select("id");
    if (error || !data || data.length === 0) return { ok: false, message: tk("Couldn't save. Try again.") };
    return { ok: true };
  }
  const { data: copy, error: insertError } = await db
    .from("blood_markers")
    .insert({ user_id: userId, result_date: date, ...markerPayload(result) })
    .select("id")
    .single();
  if (insertError || !copy) {
    if (insertError) console.error("[labs] Could not copy the result:", insertError.message);
    return { ok: false, message: tk("Couldn't save. Try again.") };
  }
  const removed = await deleteLabResults([result], all);
  if (!removed.ok) {
    await db.from("blood_markers").delete().eq("id", copy.id);
    return removed;
  }
  return { ok: true };
}

/**
 * Deletes results (one, or every result of a marker). A typed report left
 * with no results goes too; a report with a file stays under Labs.
 * `all` is every result the user has, to know what each report keeps.
 */
export async function deleteLabResults(remove: LabResult[], all: LabResult[]): Promise<{ ok: boolean; message?: string }> {
  if (remove.length === 0) return { ok: true };
  const ids = remove.map((r) => r.id);
  const { data, error } = await db.from("blood_markers").delete().in("id", ids).select("id");
  if (error || !data || data.length !== ids.length) {
    if (error) console.error("[labs] Could not delete results:", error.message);
    return { ok: false, message: tk("Couldn't delete. Try again.") };
  }
  const gone = new Set(ids);
  const panelIds = [...new Set(remove.map((r) => r.panelId).filter((x): x is string => !!x))];
  for (const panelId of panelIds) {
    const left = all.some((r) => r.panelId === panelId && !gone.has(r.id));
    const typed = !remove.find((r) => r.panelId === panelId)?.filePath;
    if (!left && typed) await db.from("blood_panels").delete().eq("id", panelId);
  }
  return { ok: true };
}
