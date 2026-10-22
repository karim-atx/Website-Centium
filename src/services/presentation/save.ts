import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { PRESENTATION_PLATFORM, rowToPresentation, type Presentation, type PresentationRow } from "./mapping";

// The write half of the presentation service, with the table handed in so
// node --test can drive it without a Supabase client (index.ts passes the real
// one). The rules are index.ts's: update first, naming only the changed
// columns; insert only if nothing matched; a 23505 retries the update.
//
// "OK" MEANS THE ROW HOLDS WHAT WAS WRITTEN. usePresentationSync's flush goes
// round again for as long as the row it gets back differs from the device, so
// a success-shaped answer that is not the write landing (an empty array where
// one row was asked for, an empty object, a row without the new values) would
// send it round forever. Every such answer is a failed save instead: the
// choice is kept and retried on the documented triggers.

export const COLUMNS = "theme, color_theme, larger_text, reduce_motion, high_contrast, bigger_tap_targets";

type DbError = { code?: string; message: string };
type Rows = PromiseLike<{ data: Partial<PresentationRow>[] | null; error: DbError | null }>;
type OneRow = PromiseLike<{ data: Partial<PresentationRow> | null; error: DbError | null }>;

export type PresentationTable = {
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

export type PresentationSave = { status: "ok"; settings: Presentation } | { status: "error"; message: string };

export function describePresentationError(error: unknown): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "ATX01" || code === "PGRST301" || code === "42501") {
    return "Your session expired. Sign in again to save this.";
  }
  return "Couldn't save your display settings. Try again.";
}

/** Whether `row` is one row holding every value in `written`. */
export function holdsWritten(row: unknown, written: Partial<PresentationRow>): boolean {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return false;
  const got = row as Record<string, unknown>;
  return (Object.keys(written) as (keyof PresentationRow)[]).every((key) => got[key] === written[key]);
}

export async function saveToTable(
  table: () => PresentationTable,
  ownerId: string,
  changed: Partial<PresentationRow>,
  full: PresentationRow
): Promise<PresentationSave> {
  try {
    const update = (values: Partial<PresentationRow>) =>
      table().update(values).eq("owner_id", ownerId).eq("platform", PRESENTATION_PLATFORM).select(COLUMNS);
    const landed = (row: unknown, written: Partial<PresentationRow>): PresentationSave => {
      if (holdsWritten(row, written)) return { status: "ok", settings: rowToPresentation(row as Partial<PresentationRow>) };
      console.error("[presentation] The saved row does not hold the values written.");
      return { status: "error", message: describePresentationError(null) };
    };

    if (Object.keys(changed).length > 0) {
      const updated = await update(changed);
      if (updated.error) {
        console.error("[presentation] Could not update:", updated.error.code, updated.error.message);
        return { status: "error", message: describePresentationError(updated.error) };
      }
      if (updated.data && updated.data.length > 0) return landed(updated.data[0], changed);
    }

    const inserted = await table()
      .insert({ owner_id: ownerId, platform: PRESENTATION_PLATFORM, ...full })
      .select(COLUMNS)
      .single();
    if (!inserted.error && inserted.data) return landed(inserted.data, full);

    if (inserted.error?.code === "23505") {
      // The row now exists; every column here is in the UPDATE grant.
      const retry = await update(full);
      if (!retry.error && retry.data && retry.data.length > 0) return landed(retry.data[0], full);
    }

    console.error("[presentation] Could not insert:", inserted.error?.code, inserted.error?.message);
    return { status: "error", message: describePresentationError(inserted.error) };
  } catch (e) {
    return { status: "error", message: describePresentationError(e) };
  }
}
