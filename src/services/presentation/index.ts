import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  PRESENTATION_PLATFORM,
  rowToPresentation,
  type Presentation,
  type PresentationRow,
} from "./mapping";

export * from "./mapping";

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
// on the insert is two tabs racing; the loser retries the update.

const COLUMNS = "theme, color_theme, larger_text, reduce_motion, high_contrast, bigger_tap_targets";

type DbError = { code?: string; message: string };
type Rows = PromiseLike<{ data: Partial<PresentationRow>[] | null; error: DbError | null }>;
type OneRow = PromiseLike<{ data: Partial<PresentationRow> | null; error: DbError | null }>;

// The generated types come from production, which has neither the two new
// columns nor the four new color_theme values yet (Stage A1). This one table
// handle is cast at the service boundary; everything above it is typed by
// PresentationRow.
const table = () =>
  supabase.from("device_presentation_settings") as unknown as {
    select: (columns: string) => { eq: (column: "platform", value: string) => { maybeSingle: () => OneRow } };
    update: (values: Partial<PresentationRow>) => {
      eq: (column: "owner_id", value: string) => {
        eq: (column: "platform", value: string) => { select: (columns: string) => Rows };
      };
    };
    insert: (values: PresentationRow & { owner_id: string; platform: string }) => {
      select: (columns: string) => { single: () => OneRow };
    };
  };

export type PresentationRead =
  | { status: "ok"; settings: Presentation | null }
  | { status: "error"; message: string };

export type PresentationSave = { status: "ok"; settings: Presentation } | { status: "error"; message: string };

export function describePresentationError(error: unknown): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "ATX01" || code === "PGRST301" || code === "42501") {
    return "Your session expired. Sign in again to save this.";
  }
  return "Couldn't save your display settings. Try again.";
}

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
 */
export async function savePresentation(
  ownerId: string,
  changed: Partial<PresentationRow>,
  full: PresentationRow
): Promise<PresentationSave> {
  try {
    const update = (values: Partial<PresentationRow>) =>
      table().update(values).eq("owner_id", ownerId).eq("platform", PRESENTATION_PLATFORM).select(COLUMNS);

    if (Object.keys(changed).length > 0) {
      const updated = await update(changed);
      if (updated.error) {
        console.error("[presentation] Could not update:", updated.error.code, updated.error.message);
        return { status: "error", message: describePresentationError(updated.error) };
      }
      if (updated.data && updated.data.length > 0) {
        return { status: "ok", settings: rowToPresentation(updated.data[0]) };
      }
    }

    const inserted = await table()
      .insert({ owner_id: ownerId, platform: PRESENTATION_PLATFORM, ...full })
      .select(COLUMNS)
      .single();
    if (!inserted.error && inserted.data) {
      return { status: "ok", settings: rowToPresentation(inserted.data) };
    }

    if (inserted.error?.code === "23505") {
      // The row now exists; every column here is in the UPDATE grant.
      const retry = await update(full);
      if (!retry.error && retry.data && retry.data.length > 0) {
        return { status: "ok", settings: rowToPresentation(retry.data[0]) };
      }
    }

    console.error("[presentation] Could not insert:", inserted.error?.code, inserted.error?.message);
    return { status: "error", message: describePresentationError(inserted.error) };
  } catch (e) {
    return { status: "error", message: describePresentationError(e) };
  }
}
