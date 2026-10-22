import { supabase } from "../../../lib/supabase/client";
import { PRESENTATION_PLATFORM, rowToPresentation, type Presentation, type PresentationRow } from "./mapping";
import {
  COLUMNS,
  describePresentationError,
  saveToTable,
  type PresentationSave,
  type PresentationTable,
} from "./save";

export * from "./mapping";
export { describePresentationError, type PresentationSave };

// This device's presentation settings: light / dark / auto, the colour theme
// and the four MO1.8.6 accessibility switches, in
// public.device_presentation_settings (Stage A1, HANDOVER_API.md "Colour
// themes" and "Accessibility").
//
// ONE ROW PER OWNER PER PLATFORM, and this website's is 'web'. The phone has
// its own 'mobile' row and neither ever touches the other: these settings
// follow the device, not the person. RLS is owner-only, so no owner_id filter
// is needed to read; the platform filter is what picks this surface's row.
//
// MOST ACCOUNTS HAVE NO ROW. Nothing creates one at signup, so "no row" reads
// as "nothing chosen yet", never as an error.
//
// UPDATE FIRST, NAMING ONLY THE CHANGED COLUMNS; INSERT ONLY IF NOTHING
// MATCHED; never upsert. UPDATE on this table is granted column by column
// (theme, color_theme, larger_text, reduce_motion, and since 20261030010000
// high_contrast and bigger_tap_targets), and PostgREST's upsert would name
// owner_id and platform in its ON CONFLICT DO UPDATE, which the grant refuses
// at plan time (the app_preferences lesson in services/preferences). A 23505
// on the insert is two tabs racing; the loser retries the update. The write
// itself is in save.ts, so node --test can drive it.

// The generated types come from production, which has neither the two new
// columns nor the four new color_theme values yet (Stage A1). This one table
// handle is cast at the service boundary; everything above it is typed by
// PresentationRow.
const table = () => supabase.from("device_presentation_settings") as unknown as PresentationTable;

export type PresentationRead =
  | { status: "ok"; settings: Presentation | null }
  | { status: "error"; message: string };

/** This website's row for the signed-in account, or null if there is none yet. */
export async function fetchPresentation(): Promise<PresentationRead> {
  try {
    const { data, error } = await table().select(COLUMNS).eq("platform", PRESENTATION_PLATFORM).maybeSingle();
    if (error) {
      console.error("[presentation] Could not read:", error.code, error.message);
      return { status: "error", message: describePresentationError(error) };
    }
    return { status: "ok", settings: data ? rowToPresentation(data) : null };
  } catch (e) {
    return { status: "error", message: describePresentationError(e) };
  }
}

/**
 * Saves `changed` (only the columns that differ from what the server holds).
 * `full` is the whole current state, used only when there is no row yet.
 * "ok" only when the row that comes back holds what was written.
 */
export function savePresentation(
  ownerId: string,
  changed: Partial<PresentationRow>,
  full: PresentationRow
): Promise<PresentationSave> {
  return saveToTable(table, ownerId, changed, full);
}
