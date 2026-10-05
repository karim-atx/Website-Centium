import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// The journal, in public.journal_folders and public.journal_entries.
//
// NO UPSERTS. journal_folders grants UPDATE on (name, position) and
// journal_entries on (body, entry_date, folder_id, title); `owner_id`, `id`,
// `created_at` and `updated_at` are INSERT-only or trigger-maintained. An
// upsert writes the whole payload down its UPDATE branch and is refused 42501,
// so every write here is an explicit INSERT or an explicit UPDATE.
//
// THE CLIENT SENDS entry_date, AND THE DATABASE NOW INSISTS. The column used
// to default to `current_date` — the SERVER'S date in UTC — so an entry
// written at 9am in Auckland was filed under yesterday and at 5pm in Los
// Angeles under tomorrow. On a journal that is worse than on a chart, because
// the date IS the entry's identity: it is what the list groups by and what the
// user reads back as "the day I wrote this". 20260929000000 dropped the
// default, so omitting it is now a loud 23502 rather than a quiet wrong day.
// Every insert below takes the caller's local date.
//
// NOTHING IS TRIMMED INTO EXISTENCE. The CHECKs require 1–60 for a folder
// name, 1–200 for a title and 1–20000 for a body, measured after btrim — so a
// title of spaces is refused rather than stored as an invisible row nobody can
// point at to delete. The validators below mirror them so the user sees a
// sentence instead of a 23514.

export interface JournalFolderRow {
  id: string;
  name: string;
  position: number;
}

export interface JournalEntryRow {
  id: string;
  folderId: string;
  title: string;
  body: string;
  entryDate: string;
  createdAt: string;
}

export const JOURNAL_LIMITS = { folderMax: 60, titleMax: 200, bodyMax: 20000 } as const;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23514") return "That's either empty or too long to store.";
  if (code === "23502") return "This entry has no date. Reload and try again.";
  if (code === "42501") {
    return "You don't have permission to save this. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

export function validateFolderName(name: string): string | null {
  const t = name.trim();
  if (t.length < 1) return "Give the folder a name.";
  if (t.length > JOURNAL_LIMITS.folderMax) {
    return `Keep the folder name under ${JOURNAL_LIMITS.folderMax} characters.`;
  }
  return null;
}

export function validateEntry(title: string, body: string): string | null {
  const t = title.trim();
  const b = body.trim();
  if (t.length < 1) return "Give the entry a title.";
  if (t.length > JOURNAL_LIMITS.titleMax) {
    return `Keep the title under ${JOURNAL_LIMITS.titleMax} characters.`;
  }
  if (b.length < 1) return "Write something before saving.";
  if (body.length > JOURNAL_LIMITS.bodyMax) {
    return `That's longer than ${JOURNAL_LIMITS.bodyMax.toLocaleString()} characters.`;
  }
  return null;
}

/** Every folder this account owns, in the order it chose. */
export async function getJournalFolders(userId: string): Promise<Result<JournalFolderRow[]>> {
  const { data, error } = await supabase
    .from("journal_folders")
    .select("id, name, position")
    .eq("owner_id", userId)
    .order("position", { ascending: true });

  if (error) {
    console.error("[journal] Could not load folders:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, value: (data ?? []).map((r) => ({ id: r.id, name: r.name, position: r.position })) };
}

/**
 * Every entry, newest day first.
 *
 * NO OWNER FILTER, AND NONE POSSIBLE: journal_entries has no owner column. Its
 * RLS derives from the folder through an EXISTS, which is what makes an entry
 * unable to disagree with its folder about who owns it — so this read is
 * already scoped to the caller and adding a filter would be inventing a
 * second, weaker answer.
 */
export async function getJournalEntries(): Promise<Result<JournalEntryRow[]>> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, folder_id, title, body, entry_date, created_at")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[journal] Could not load entries:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      folderId: r.folder_id,
      title: r.title,
      body: r.body,
      entryDate: r.entry_date,
      createdAt: r.created_at,
    })),
  };
}

export async function createJournalFolder(
  userId: string,
  name: string,
  position: number
): Promise<Result<JournalFolderRow>> {
  const invalid = validateFolderName(name);
  if (invalid) return { ok: false, message: invalid };

  const { data, error } = await supabase
    .from("journal_folders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ owner_id: userId, name: name.trim(), position } as any)
    .select("id, name, position")
    .maybeSingle();

  if (error || !data) {
    console.error("[journal] Could not add the folder:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't add that folder." };
  }
  return { ok: true, value: { id: data.id, name: data.name, position: data.position } };
}

/** `entryDate` is the writer's LOCAL date — the column has no default. */
export async function createJournalEntry(entry: {
  folderId: string;
  title: string;
  body: string;
  entryDate: string;
  /** Preserved only by the one-time import; a new entry lets the default stand. */
  createdAt?: string;
}): Promise<Result<JournalEntryRow>> {
  const invalid = validateEntry(entry.title, entry.body);
  if (invalid) return { ok: false, message: invalid };

  const row: Record<string, unknown> = {
    folder_id: entry.folderId,
    title: entry.title.trim(),
    body: entry.body.trim(),
    entry_date: entry.entryDate,
  };
  if (entry.createdAt) row.created_at = entry.createdAt;

  const { data, error } = await supabase
    .from("journal_entries")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(row as any)
    .select("id, folder_id, title, body, entry_date, created_at")
    .maybeSingle();

  if (error || !data) {
    console.error("[journal] Could not save the entry:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't save that entry." };
  }
  return {
    ok: true,
    value: {
      id: data.id,
      folderId: data.folder_id,
      title: data.title,
      body: data.body,
      entryDate: data.entry_date,
      createdAt: data.created_at,
    },
  };
}

export async function updateJournalEntryRemote(
  id: string,
  patch: { title: string; body: string; folderId?: string }
): Promise<WriteResult> {
  const invalid = validateEntry(patch.title, patch.body);
  if (invalid) return { ok: false, message: invalid };

  // The DATE IS NOT TOUCHED. Editing what you wrote does not move the day you
  // wrote it, and entry_date is what the list groups by. The folder can move
  // (MO1.1.2.3's folder picker); folder_id is in the column grant, and the
  // update policy checks the new folder is the caller's own.
  const row: { title: string; body: string; folder_id?: string } = { title: patch.title.trim(), body: patch.body.trim() };
  if (patch.folderId) row.folder_id = patch.folderId;
  const { error } = await supabase
    .from("journal_entries")
    .update(row)
    .eq("id", id);

  if (error) {
    console.error("[journal] Could not update the entry:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

export async function deleteJournalEntryRemote(id: string): Promise<WriteResult> {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) {
    console.error("[journal] Could not remove the entry:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
/** Rename and/or reorder one folder. Only (name, position) are granted. */
export async function updateJournalFolderRemote(
  id: string,
  patch: { name?: string; position?: number }
): Promise<WriteResult> {
  const row: { name?: string; position?: number } = {};
  if (patch.name !== undefined) {
    const invalid = validateFolderName(patch.name);
    if (invalid) return { ok: false, message: invalid };
    row.name = patch.name.trim();
  }
  if (patch.position !== undefined) row.position = patch.position;

  const { error } = await supabase.from("journal_folders").update(row).eq("id", id);
  if (error) {
    console.error("[journal] Could not update the folder:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/** Deletes the folder AND its entries: journal_entries.folder_id cascades. */
export async function deleteJournalFolderRemote(id: string): Promise<WriteResult> {
  const { error } = await supabase.from("journal_folders").delete().eq("id", id);
  if (error) {
    console.error("[journal] Could not remove the folder:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
