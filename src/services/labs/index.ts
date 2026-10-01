import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { BloodMarker, ExtractedBiomarker, LabReport } from "../../types";
import { deletePrivateFile, uploadPrivateFile } from "../storage";
import { todayLocal } from "../../utils/date";
import { fetchLabCatalogue } from "./catalogue";
import { convertUnit, tidy, type CatalogueMarker } from "./catalogueLogic";

// Blood work: public.blood_panels and the blood_markers hanging off them,
// plus the lab report itself in the private `lab-reports` bucket.
//
// Gated for professionals by `lab_results` — its own category, separate from
// both `health_metrics` (vitals) and `medical_history` (medications,
// surgeries, imaging). Diagnostic lab work and clinical history are different
// disclosures and this module never touches the other two.
//
// ONLY panels/ IS EVER WRITTEN. The bucket also has an `extracted/` prefix
// for unreviewed OCR output, which extracted_biomarkers deliberately excludes
// from consent because a professional acting on a mis-parsed value is a
// clinical hazard. Nothing in this app performs real extraction — the mock
// parser is a confirmation step, and everything reaching this module has been
// confirmed by the user — so it belongs under panels/ and extracted/ stays
// untouched. services/storage refuses to write there at all.

// ---------------------------------------------------------------------------
// Reference ranges
// ---------------------------------------------------------------------------

/**
 * Splits a human reference range into the two numeric bounds the table holds.
 *
 * NOTHING IN THE APP CALLS THIS YET, and that is worth stating rather than
 * leaving to be discovered. There is no manual biomarker entry anywhere:
 * markers arrive only from the capture flow, whose ExtractedBiomarker carries
 * no range field at all, so both bounds are null in every write this app
 * currently makes. This exists because range_low/range_high are real columns
 * that a manual-entry path would have to fill, and because parsing a range is
 * the kind of thing that gets written badly in a hurry later. formatRange
 * below is the direction that does have a caller.
 *
 * FOUR SHAPES, and the separator is an EN DASH (U+2013), not a hyphen — the
 * seeded data uses "4.0 – 5.6", so a naive split("-") matches none of it. A
 * hyphen and a minus sign are accepted too, since a hand-typed range will use
 * whichever the keyboard offers.
 *
 *   "4.0 – 5.6"  -> { low: 4.0,  high: 5.6  }
 *   "< 1.90"     -> { low: null, high: 1.90 }
 *   "> 1.00"     -> { low: 1.00, high: null }
 *   "—" / "" / unparseable -> { low: null, high: null }
 *
 * Unparseable input returns both bounds null and logs. It does NOT guess and
 * does NOT throw: a reference range the app could not read is unknown, and
 * storing a half-understood bound would be worse than storing nothing, since
 * every consumer treats a present bound as authoritative.
 */
export function parseRange(range: string | null | undefined): {
  low: number | null;
  high: number | null;
} {
  const none = { low: null, high: null };
  if (!range) return none;

  // Normalise the dash family and strip spaces so the patterns below only
  // have to describe structure.
  const text = range.replace(/[‒–—−]/g, "-").trim();
  if (!text || text === "-") return none;

  const num = (s: string): number | null => {
    const n = Number(s.replace(/,/g, "."));
    return Number.isFinite(n) ? n : null;
  };

  const upper = text.match(/^<\s*=?\s*(-?[\d.,]+)$/);
  if (upper) return { low: null, high: num(upper[1]) };

  const lower = text.match(/^>\s*=?\s*(-?[\d.,]+)$/);
  if (lower) return { low: num(lower[1]), high: null };

  // Two-sided. The leading number may itself be negative, so the split point
  // is a dash with whitespace or a digit before it, never the sign position.
  const two = text.match(/^(-?[\d.,]+)\s*-\s*(-?[\d.,]+)$/);
  if (two) {
    const low = num(two[1]);
    const high = num(two[2]);
    // The table's CHECK requires low <= high when both are present. Swapping
    // silently would invent an ordering the user did not write, so a reversed
    // range is treated as unreadable.
    if (low !== null && high !== null && low > high) {
      console.warn("[labs] Reference range is reversed, storing no bounds:", range);
      return none;
    }
    return { low, high };
  }

  console.warn("[labs] Could not read reference range, storing no bounds:", range);
  return none;
}

/**
 * Rebuilds the display string from the stored bounds.
 *
 * THE DIRECTION WITH A REAL CALLER: every marker read back has bounds rather
 * than a string, and the UI renders `Range: {marker.range}`. Uses the same en
 * dash the seeded data used, so nothing about the rendering changes.
 *
 * Both bounds absent gives "—", which is exactly what recordBiomarkers has
 * always written for a marker with no known range.
 */
export function formatRange(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low} – ${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return "—";
}

/**
 * Where a value sits against its range, or null when that cannot be known.
 *
 * NULL IS NOT A GAP TO BE FILLED. A marker with no reference range has no
 * status, and the previous code wrote "normal" for exactly that case — a
 * clinical claim nobody computed, on a screen a doctor might read. The column
 * is nullable and its own comment says status is computed by the app from
 * value against the range; with no range there is nothing to compute.
 */
export function statusFor(
  value: number,
  low: number | null,
  high: number | null
): "low" | "normal" | "high" | null {
  if (low === null && high === null) return null;
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface LabWriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save these results.";
  }
  if (code === "23514") return "Some of these results were out of the range this can store.";
  return "Couldn't save these results. Check your connection and try again.";
}

/** Rounds to numeric(12,4), the scale blood_markers.value actually holds. */
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface RecordPanelInput {
  /**
   * Confirmed markers. markerKey links a result to the standard list
   * (blood_markers.marker_key, null for "Other"); rangeLow/rangeHigh are the
   * reference range in the result's own unit, as the user confirmed it (from
   * their report, or pre-filled from the list). `range` is the older
   * printed-string form, still parsed if given.
   */
  markers: (Pick<ExtractedBiomarker, "name" | "value" | "unit"> & {
    markerKey?: string | null;
    rangeLow?: number | null;
    rangeHigh?: number | null;
    range?: string;
  })[];
  /** The lab report this came from, if it came from one. */
  file?: File;
}

/**
 * Writes one panel and its markers.
 *
 * ORDER IS FORCED BY THE SCHEMA, not chosen. blood_markers carries a COMPOSITE
 * foreign key on (blood_panel_id, user_id) pointing at blood_panels
 * (id, user_id), so the panel must exist first, and every marker must carry
 * the SAME user_id the panel was written with. Re-deriving that id per marker
 * would be the bug the composite key exists to make impossible: a marker whose
 * user_id disagrees with its parent's is rejected outright rather than
 * silently mis-scoping a health record.
 *
 * ONE PANEL PER SAVE. A panel is one lab report, which is exactly what a
 * capture session is. Markers land in a single batched insert, so a partial
 * write is not possible at the marker level — the batch either lands whole or
 * fails whole.
 *
 * NOT A TRANSACTION ACROSS THE TWO, though. If the marker batch fails, the
 * panel is deleted, which is both the compensating action and a cascade:
 * ON DELETE CASCADE means any marker that did land goes with it. That is
 * cheaper and more reliable than deleting markers individually, and it leaves
 * no half-populated panel claiming to be a lab report.
 *
 * The uploaded file is cleaned up on failure too, since Storage does not
 * cascade and an orphan under panels/ stays readable by any professional
 * holding lab_results consent.
 */
export async function recordPanel(
  userId: string,
  input: RecordPanelInput
): Promise<LabWriteResult & { panelId?: string }> {
  if (input.markers.length === 0) {
    return { ok: false, message: "Select at least one result to save." };
  }

  let filePath: string | undefined;
  if (input.file) {
    const upload = await uploadPrivateFile({ bucket: "lab-reports", userId, file: input.file });
    if (!upload.ok) return { ok: false, message: upload.message };
    filePath = upload.path;
  }

  const cleanUpFile = async (why: string) => {
    if (!filePath) return;
    const removed = await deletePrivateFile("lab-reports", filePath);
    if (!removed.ok) {
      console.error("[labs] ORPHANED OBJECT after", why, "-", filePath);
    }
  };

  const { data: panel, error: panelError } = await supabase
    .from("blood_panels")
    .insert({
      user_id: userId,
      panel_date: todayLocal(),
      source_image_url: filePath ?? null,
    })
    .select("id")
    .single();

  if (panelError) {
    console.error("[labs] Could not create panel:", panelError.message);
    await cleanUpFile("panel insert failure");
    return { ok: false, message: describe(panelError) };
  }

  const rows = input.markers.map((m) => {
    const parsed = parseRange(m.range);
    const low = m.rangeLow ?? parsed.low;
    const high = m.rangeHigh ?? parsed.high;
    return {
      blood_panel_id: panel.id,
      // The SAME id the panel was written with. Not re-read, not re-derived.
      user_id: userId,
      name: m.name,
      marker_key: m.markerKey ?? null,
      value: round4(m.value),
      unit: m.unit,
      range_low: low,
      range_high: high,
      // Worked out here, on the device, from the range the user confirmed.
      // The database never judges a value (Database 20261011000000).
      status: statusFor(m.value, low, high),
    };
  });

  const { error: markerError } = await supabase.from("blood_markers").insert(rows);
  if (markerError) {
    console.error("[labs] Could not save markers:", markerError.message);
    // Deleting the panel cascades to any marker that did land.
    const { error: rollbackError } = await supabase
      .from("blood_panels")
      .delete()
      .eq("id", panel.id);
    if (rollbackError) {
      console.error("[labs] ORPHANED PANEL: markers failed and cleanup failed:", panel.id);
    }
    await cleanUpFile("marker insert failure");
    return { ok: false, message: describe(markerError) };
  }

  return { ok: true, panelId: panel.id };
}

/**
 * Removes a panel, the markers it recorded, and the report file behind it.
 *
 * SAME ORDER AS deleteImagingRecordRemote, for the same reason: the row goes
 * first, then the object, because Storage does not cascade. An orphan left
 * under `panels/` stays readable by any professional holding lab_results
 * consent — a file the client believes they deleted. Deleting the object first
 * would risk the opposite, a report still listed and pointing at nothing.
 *
 * WHAT MAKES THIS BIGGER THAN AN IMAGING DELETE, and the reason it is worth
 * reading before calling: blood_markers is tied to its panel by ON DELETE
 * CASCADE, so this single row takes every marker the panel recorded with it.
 * That is the correct behaviour — a panel IS the lab report, and keeping its
 * readings after deleting the document they came from would leave measurements
 * whose provenance the user just asked to remove — but it means a caller
 * cannot patch local state by filtering one id out of a list. See
 * removeLabReport, which re-reads instead.
 */
export async function deleteLabPanel(id: string, filePath?: string): Promise<LabWriteResult> {
  // Row count, not absence of error: a policy refusal on DELETE returns zero
  // rows with error === null.
  const { data, error } = await supabase
    .from("blood_panels")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[labs] Could not remove panel:", error.message);
    return { ok: false, message: "That lab report couldn't be removed." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That lab report couldn't be removed." };
  }

  if (filePath) {
    const cleanup = await deletePrivateFile("lab-reports", filePath);
    if (!cleanup.ok) {
      console.error("[labs] ORPHANED OBJECT: panel deleted, file remains:", filePath);
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Read — the shape inversion
// ---------------------------------------------------------------------------

export type BloodMarkerResult =
  | { ok: true; markers: BloodMarker[] }
  | { ok: false; message: string };

/**
 * Reads every panel and turns them back into the flat, name-keyed list with an
 * inline history that the UI has always consumed.
 *
 * A GENUINE SHAPE INVERSION, and it lives here so no screen has to know. The
 * database models blood work as panels-with-markers, which is what it is: one
 * report, taken on one day, carrying several results. The app models it as one
 * entry per marker NAME carrying its own history, which is what a reader wants:
 * "show me my HbA1c over time". Neither is wrong; they are the same facts
 * indexed differently.
 *
 * Panels come back oldest-first, so appending as we go builds each marker's
 * history in chronological order and leaves the newest reading as the one that
 * overwrites value/unit/range/status. That makes "current" mean the most
 * recent panel that measured it, per marker — a marker absent from the latest
 * panel keeps the last value that did measure it, rather than vanishing.
 *
 * History dates are the PANEL's date, not the marker row's created_at: a
 * backfilled report describes the day the blood was drawn, and created_at
 * would order a late-entered old panel as though it were recent.
 *
 * Reports ok:false rather than an empty list on failure — an empty lab history
 * and an unreadable one are opposite claims.
 */
/** One panel's worth of rows, as both callers select them. */
export interface PanelRow {
  panel_date: string;
  blood_markers: {
    id: string;
    name: string;
    marker_key?: string | null;
    value: number;
    unit: string;
    range_low: number | null;
    range_high: number | null;
    status: "low" | "normal" | "high" | null;
  }[];
}

/**
 * THE INVERSION ITSELF, extracted so it has exactly one definition.
 *
 * Two callers need it and they read different rows: getBloodMarkers reads the
 * signed-in user's own panels, and the professional-side fetchClientLabs reads
 * a whole roster's in one batched query. Writing the grouping twice would mean
 * getting "newest wins" right twice, which is the same trap recordBiomarkers
 * avoided by re-reading rather than merging.
 *
 * PANELS MUST ARRIVE OLDEST-FIRST. Appending as we go then builds each
 * marker's history in chronological order and leaves the newest reading as the
 * one that overwrites value/unit/range/status — so "current" means the most
 * recent panel that measured it, per marker, and a marker absent from the
 * latest panel keeps the last value that did measure it rather than vanishing.
 */
export function groupPanelsByMarkerName(panels: PanelRow[], catalogue?: CatalogueMarker[] | null): BloodMarker[] {
  const byName = new Map<string, BloodMarker>();
  // Each history point's unit, so readings taken in another unit can be
  // converted into the current one (below). Same order as history.
  const units = new Map<string, string[]>();
  const keyOf = new Map<string, string | null>();
  for (const panel of panels) {
    for (const m of panel.blood_markers ?? []) {
      // A result linked to the standard list groups by that marker, so
      // "HbA1c" and "Glycated haemoglobin" are one history; "Other" by name.
      const key = m.marker_key ? `key:${m.marker_key}` : m.name.toLowerCase();
      keyOf.set(key, m.marker_key ?? null);
      units.set(key, [...(units.get(key) ?? []), m.unit]);
      const value = Number(m.value);
      const low = m.range_low === null ? null : Number(m.range_low);
      const high = m.range_high === null ? null : Number(m.range_high);
      const existing = byName.get(key);
      if (existing) {
        existing.previous = {
          date: existing.history[existing.history.length - 1].date,
          value: existing.value,
          unit: existing.unit,
          low: existing.rangeLow ?? null,
          high: existing.rangeHigh ?? null,
        };
        existing.history.push({ date: panel.panel_date, value });
        existing.value = value;
        existing.unit = m.unit;
        existing.range = formatRange(low, high);
        existing.status = m.status;
        existing.id = m.id;
        existing.markerKey = m.marker_key ?? null;
        existing.rangeLow = low;
        existing.rangeHigh = high;
      } else {
        byName.set(key, {
          id: m.id,
          name: m.name,
          value,
          unit: m.unit,
          range: formatRange(low, high),
          status: m.status,
          history: [{ date: panel.panel_date, value }],
          markerKey: m.marker_key ?? null,
          rangeLow: low,
          rangeHigh: high,
          previous: null,
        });
      }
    }
  }
  // UNIT CONVERSION BY THE LIST'S FACTORS. A marker measured in mmol/L one
  // year and mg/dL the next would chart two different scales as one line.
  // Earlier readings are converted into the current unit when both units are
  // ones the list accepts; anything unknown is left exactly as entered.
  if (catalogue) {
    for (const [key, marker] of byName) {
      const markerKey = keyOf.get(key);
      const entry = markerKey ? catalogue.find((c) => c.key === markerKey) : undefined;
      const seen = units.get(key) ?? [];
      if (!entry) continue;
      marker.history = marker.history.map((h, i) => {
        const from = seen[i];
        if (!from || from === marker.unit) return h;
        const converted = convertUnit(entry, h.value, from, marker.unit);
        return converted === null ? h : { ...h, value: tidy(converted) };
      });
    }
  }
  return [...byName.values()];
}

export type LabReportResult =
  | { ok: true; reports: LabReport[] }
  | { ok: false; message: string };

/**
 * The lab reports a user has uploaded, newest first.
 *
 * SEPARATE FROM getBloodMarkers ON PURPOSE. That function answers "what are my
 * numbers over time", which is grouped by marker name and has no room for a
 * panel's identity; this answers "which reports do I have", which is grouped
 * by panel. Folding the second into the first would have meant changing its
 * return contract for every caller to serve one surface.
 *
 * Filters to panels that actually carry a file: a panel recorded without one
 * has nothing to open.
 */
export async function getLabReports(userId: string): Promise<LabReportResult> {
  const { data, error } = await supabase
    .from("blood_panels")
    .select("id, panel_date, source_image_url")
    .eq("user_id", userId)
    .not("source_image_url", "is", null)
    .order("panel_date", { ascending: false });

  if (error) {
    console.error("[labs] Could not load lab reports:", error.message);
    return { ok: false, message: "Could not load your lab reports." };
  }

  return {
    ok: true,
    reports: (data ?? []).map((p) => ({
      id: p.id,
      date: p.panel_date,
      filePath: p.source_image_url!,
    })),
  };
}

export async function getBloodMarkers(userId: string): Promise<BloodMarkerResult> {
  const { data, error } = await supabase
    .from("blood_panels")
    .select("id, panel_date, blood_markers(id, name, marker_key, value, unit, range_low, range_high, status)")
    .eq("user_id", userId)
    .order("panel_date", { ascending: true });

  if (error) {
    console.error("[labs] Could not load lab results:", error.message);
    return { ok: false, message: "Could not load your lab results." };
  }

  return { ok: true, markers: groupPanelsByMarkerName(data ?? [], await fetchLabCatalogue()) };
}
