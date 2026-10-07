import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { hasEmailPassword } from "../auth/passwordChangeLogic";
import { describeLockError } from "./lockLogic";

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
  /** MO1.1.2.1's Lock (stage 3). Readable, never client-writable. */
  locked: boolean;
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
    .select("id, name, position, locked")
    .eq("owner_id", userId)
    .order("position", { ascending: true });

  if (error) {
    console.error("[journal] Could not load folders:", error.message);
    return { ok: false, message: describe(error) };
  }
  // ONE NARROW CAST: the generated types come from production, where
  // journal_folders.locked (stage 3) isn't yet, so the select parser can't
  // type this row. The shape is the four columns selected above.
  const rows = (data ?? []) as unknown as { id: string; name: string; position: number; locked: boolean | null }[];
  return {
    ok: true,
    value: rows.map((r) => ({ id: r.id, name: r.name, position: r.position, locked: r.locked === true })),
  };
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
  return { ok: true, value: { id: data.id, name: data.name, position: data.position, locked: false } };
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

// --- the folder lock (backend stage 3, Database docs/HANDOVER_API.md) --------
//
// FOUR FUNCTIONS ARE THE WHOLE INTERFACE. `locked` is not client-writable
// (the UPDATE grant covers only name and position), and the unlock windows
// live in a table no client role can read. Locking needs no password;
// opening a window and removing the lock both re-check the ACCOUNT PASSWORD
// server-side (the web stand-in for MO1.1.2.2's Face ID), share one rate
// limit (10 per 15 minutes) and answer a wrong password with
// `success = false` rather than an error, so the attempt still counts.
//
// The generated types are read from production, where this stage isn't yet,
// so the calls go through one narrow cast rather than a regenerated types
// file (as services/recoveryCodes).

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

interface UnlockRow {
  success: boolean;
  message: string;
  unlocked_until: string | null;
}

/** A lock call's outcome: `ok` with the window's end (null after removing
 *  the lock), or the sentence to show under the password field. */
export type LockOutcome = { ok: true; unlockedUntil: string | null } | { ok: false; message: string; code?: string };

/** MO1.1.2.1 Lock: no password. Also closes any open window on the server. */
export async function lockJournalFolderRemote(folderId: string): Promise<WriteResult> {
  const { error } = await rpc<null>("lock_journal_folder", { p_folder_id: folderId });
  if (error) {
    console.error("[journal] Could not lock the folder:", error.code, error.message);
    return { ok: false, message: describeLockError(error.code, error.message) };
  }
  return { ok: true };
}

async function passwordCall(
  fn: "unlock_journal_folder" | "disable_journal_folder_lock",
  folderId: string,
  password: string
): Promise<LockOutcome> {
  const { data, error } = await rpc<UnlockRow | UnlockRow[]>(fn, { p_folder_id: folderId, p_password: password });
  if (error) {
    console.error(`[journal] ${fn} failed:`, error.code);
    return { ok: false, code: error.code, message: describeLockError(error.code, error.message) };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, message: describeLockError(undefined, undefined) };
  // A wrong password: the server's sentence, safe to show verbatim.
  if (!row.success) return { ok: false, message: row.message };
  return { ok: true, unlockedUntil: row.unlocked_until };
}

/** MO1.1.2.2's unlock: a five-minute window, ending at `unlockedUntil`. */
export function unlockJournalFolderRemote(folderId: string, password: string): Promise<LockOutcome> {
  return passwordCall("unlock_journal_folder", folderId, password);
}

/** Turns the lock off for good (the second tap on MO1.1.2.1's Lock). */
export function disableJournalFolderLockRemote(folderId: string, password: string): Promise<LockOutcome> {
  return passwordCall("disable_journal_folder_lock", folderId, password);
}

/**
 * WHETHER THIS ACCOUNT CAN OPEN A LOCK AT ALL. A Google-only account has no
 * password, so it could lock a folder and never open it again (ATX77). Until
 * design picks a fix, the API doc's mitigation: hide Lock for it. Errs
 * towards hiding: a Google account that later set a password also reads
 * false here (see hasEmailPassword).
 */
export async function accountCanUseFolderLock(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data.user && hasEmailPassword(data.user);
}
