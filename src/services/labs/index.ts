import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { BloodMarker, ExtractedBiomarker } from "../../types";
import { deletePrivateFile, uploadPrivateFile } from "../storage";
import { todayLocal } from "../../utils/date";

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
  /** Confirmed markers. Range is optional and absent in every current path. */
  markers: (Pick<ExtractedBiomarker, "name" | "value" | "unit"> & { range?: string })[];
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
    const { low, high } = parseRange(m.range);
    return {
      blood_panel_id: panel.id,
      // The SAME id the panel was written with. Not re-read, not re-derived.
      user_id: userId,
      name: m.name,
      value: round4(m.value),
      unit: m.unit,
      range_low: low,
      range_high: high,
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
export async function getBloodMarkers(userId: string): Promise<BloodMarkerResult> {
  const { data, error } = await supabase
    .from("blood_panels")
    .select("id, panel_date, blood_markers(id, name, value, unit, range_low, range_high, status)")
    .eq("user_id", userId)
    .order("panel_date", { ascending: true });

  if (error) {
    console.error("[labs] Could not load lab results:", error.message);
    return { ok: false, message: "Could not load your lab results." };
  }

  const byName = new Map<string, BloodMarker>();
  for (const panel of data ?? []) {
    for (const m of panel.blood_markers ?? []) {
      const key = m.name.toLowerCase();
      const value = Number(m.value);
      const low = m.range_low === null ? null : Number(m.range_low);
      const high = m.range_high === null ? null : Number(m.range_high);
      const existing = byName.get(key);
      if (existing) {
        existing.history.push({ date: panel.panel_date, value });
        // Newest panel wins for the headline figures.
        existing.value = value;
        existing.unit = m.unit;
        existing.range = formatRange(low, high);
        existing.status = m.status;
        existing.id = m.id;
      } else {
        byName.set(key, {
          id: m.id,
          name: m.name,
          value,
          unit: m.unit,
          range: formatRange(low, high),
          status: m.status,
          history: [{ date: panel.panel_date, value }],
        });
      }
    }
  }

  return { ok: true, markers: [...byName.values()] };
}
