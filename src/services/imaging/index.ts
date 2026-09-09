import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ImagingRecord } from "../../types";
import { deletePrivateFile, uploadPrivateFile } from "../storage";

// Imaging and other tests: public.imaging_records, plus the scan or report
// itself in the private `medical-imaging` bucket.
//
// Gated for professionals by `medical_history`, the same category as
// medications and surgeries — not by `lab_results`, which covers blood work.
// The two are separate grants and this module never touches the lab side.
//
// INSERT AND DELETE, NEVER UPSERT, for the fourth time: the UPDATE grant is
// column-scoped to (imaging_type, imaging_date, note, file_url) and excludes
// user_id, so upsert would write the identifying column and raise 42501.
//
// A DATE IS REQUIRED, exactly as it is for surgeries. imaging_date is
// `date NOT NULL`, so the "Not dated" sentinel this app used locally has
// nowhere to go, and inventing a placeholder date would put a false fact in a
// medical record. Same resolution, same README follow-up asking for the
// column to become nullable — one request covering both columns rather than
// two.
//
// NO DATE ARITHMETIC. imaging_date is a plain `date`: a historical fact the
// user asserts, not a record of when they logged it.

export interface ImagingWriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23502") return "That record is missing something required.";
  return "Couldn't save that record. Check your connection and try again.";
}

/**
 * Creates one imaging record, optionally with the file it came from.
 *
 * UPLOAD FIRST, THEN INSERT, with a compensating delete. The alternative —
 * insert then upload — would leave a record whose file_url is null after a
 * failed upload, which is indistinguishable from a manually-typed record that
 * never had a file. This ordering fails in the direction where the wrong
 * outcome is recoverable and visible: an orphaned object, which the
 * compensating delete then removes.
 *
 * NOT A TRANSACTION, and worth stating plainly. Storage and Postgres are
 * separate systems with no shared commit. If the compensating delete itself
 * fails, the object stays in the bucket with no row pointing at it — logged,
 * because for `medical-imaging` that file remains readable by any
 * professional holding `medical_history` consent even though the record it
 * belonged to was never created.
 */
export async function addImagingRecordRemote(
  userId: string,
  record: Omit<ImagingRecord, "id" | "filePath">,
  file?: File
): Promise<ImagingWriteResult & { id?: string; filePath?: string }> {
  if (!record.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return { ok: false, message: "Add the date of this scan or test before saving." };
  }
  if (!record.type.trim()) {
    return { ok: false, message: "Give this record a type before saving." };
  }

  let filePath: string | undefined;
  if (file) {
    const upload = await uploadPrivateFile({ bucket: "medical-imaging", userId, file });
    if (!upload.ok) return { ok: false, message: upload.message };
    filePath = upload.path;
  }

  const { data, error } = await supabase
    .from("imaging_records")
    .insert({
      user_id: userId,
      imaging_type: record.type.trim(),
      imaging_date: record.date,
      note: record.note ?? null,
      file_url: filePath ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[imaging] Could not save record:", error.message);
    if (filePath) {
      const cleanup = await deletePrivateFile("medical-imaging", filePath);
      if (!cleanup.ok) {
        console.error(
          "[imaging] ORPHANED OBJECT: upload succeeded, row insert failed, cleanup failed:",
          filePath
        );
      }
    }
    return { ok: false, message: describe(error) };
  }

  return { ok: true, id: data.id, filePath };
}

/**
 * Removes a record and the file behind it.
 *
 * BOTH, IN THAT ORDER, because Storage does not cascade. Deleting only the row
 * would leave the scan in the bucket, still readable by whoever the path says
 * may read it — which for a consented professional means a file the client
 * believes they deleted.
 *
 * The row goes first: if the object delete then fails, the record is gone from
 * the user's view and an orphan is logged. Deleting the object first would
 * risk the opposite — a record still listed, pointing at a file that no longer
 * exists.
 */
export async function deleteImagingRecordRemote(
  id: string,
  filePath?: string
): Promise<ImagingWriteResult> {
  // Row count, not absence of error: a policy refusal on DELETE returns zero
  // rows with error === null.
  const { data, error } = await supabase
    .from("imaging_records")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[imaging] Could not remove record:", error.message);
    return { ok: false, message: "That record couldn't be removed." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That record couldn't be removed." };
  }

  if (filePath) {
    const cleanup = await deletePrivateFile("medical-imaging", filePath);
    if (!cleanup.ok) {
      console.error("[imaging] ORPHANED OBJECT: row deleted, file remains:", filePath);
    }
  }
  return { ok: true };
}

export type ImagingReadResult =
  | { ok: true; records: ImagingRecord[] }
  | { ok: false; message: string };

/**
 * Reads the user's own imaging records, newest first.
 *
 * Returns the stored object path rather than a URL. Signing happens at the
 * moment of viewing, not at load: a URL minted here would start its short life
 * immediately and be dead by the time anyone tapped it, and signing every file
 * on every load would mint links nobody opens.
 */
export async function getImagingRecords(userId: string): Promise<ImagingReadResult> {
  const { data, error } = await supabase
    .from("imaging_records")
    .select("id, imaging_type, imaging_date, note, file_url")
    .eq("user_id", userId)
    .order("imaging_date", { ascending: false });

  if (error) {
    console.error("[imaging] Could not load records:", error.message);
    return { ok: false, message: "Could not load your imaging records." };
  }

  return {
    ok: true,
    records: (data ?? []).map((r) => ({
      id: r.id,
      type: r.imaging_type,
      date: r.imaging_date,
      ...(r.note ? { note: r.note } : {}),
      ...(r.file_url ? { filePath: r.file_url } : {}),
    })),
  };
}
