import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";

// The folder tree, once, for both tables that have one.
//
// routine_folders and workout_template_folders are the same shape down to the
// column list — owner_id, name, parent_id, color, position — the same grants,
// the same four own-row policies, and THE SAME TRIGGER: folder_validate_parent
// is attached to both and dispatches on TG_TABLE_NAME precisely so they cannot
// drift apart. The migration says so in its own comment.
//
// So this module is parameterised by table rather than copied per table. A
// second copy would be a second place for ATX16/ATX17 to be worded differently,
// and a second place to forget that `position` is NOT NULL.

/** The two tables that carry a folder tree. Nothing else may be passed. */
export type FolderTable = "routine_folders" | "workout_template_folders";

/** The client-side shape both folder types already use. */
export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string;
}

export interface FoldersResult {
  /**
   * False means the read FAILED, not "no folders" — the distinction every
   * hydration in this app draws, because the caller replaces state with the
   * result and a dropped connection must not empty a screen.
   */
  ok: boolean;
  folders: Folder[];
  message?: string;
}

export interface FolderResult {
  ok: boolean;
  folder?: Folder;
  message?: string;
}

export interface FolderWriteResult {
  ok: boolean;
  message?: string;
}

/**
 * ATX16 AND ATX17 ARE REAL ANSWERS, not failures to report as "something went
 * wrong". Both come from folder_validate_parent(), a BEFORE INSERT OR UPDATE
 * trigger on both folder tables:
 *
 *   ATX17  the named parent belongs to a different account
 *   ATX16  the write would close a loop — a folder inside itself, or inside
 *          one of its own descendants
 *
 * Neither is retryable and neither is a bug to hide. The raised message names
 * folder uuids, which is why it is replaced here rather than shown.
 */
export function describeFolderError(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "ATX16") {
    return "A folder can't be filed inside itself or one of its own subfolders.";
  }
  if (code === "ATX17") {
    return "That folder belongs to a different account, so it can't be used as a parent.";
  }
  if (code === "42501") return "You don't have permission to do that.";
  if (code === "23503") return "Something this refers to no longer exists. Try again.";
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

const COLUMNS = "id, name, parent_id, color, position";

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  position: number;
}

const toFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  parentId: r.parent_id,
  color: r.color ?? undefined,
});

/**
 * Ordered by position, which is what the reorder controls write.
 *
 * Position is per sibling group in the client's model — "move up" swaps two
 * folders sharing a parent — but a single ascending sort still reproduces the
 * tree correctly, because the UI renders each parent's children in the order
 * they appear in this flat list.
 */
export async function getFolders(table: FolderTable, userId: string): Promise<FoldersResult> {
  const { data, error } = await supabase
    .from(table)
    .select(COLUMNS)
    .eq("owner_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`[folders] Could not read ${table}:`, error.message);
    return { ok: false, folders: [], message: describeFolderError(error) };
  }
  return { ok: true, folders: (data ?? []).map((r) => toFolder(r as FolderRow)) };
}

export async function createFolder(
  table: FolderTable,
  userId: string,
  folder: { name: string; parentId: string | null; color?: string; position: number }
): Promise<FolderResult> {
  const { data, error } = await supabase
    .from(table)
    .insert({
      owner_id: userId,
      name: folder.name.trim(),
      parent_id: folder.parentId,
      color: folder.color ?? null,
      position: folder.position,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error(`[folders] Could not create in ${table}:`, error?.message);
    return {
      ok: false,
      message: error ? describeFolderError(error) : "Something went wrong. Please try again.",
    };
  }
  return { ok: true, folder: toFolder(data as FolderRow) };
}

/**
 * Name, colour, parent and position — every column the UPDATE grant covers.
 *
 * owner_id is deliberately not among them, on either table or in this payload:
 * it is not updatable, and naming it would be refused with 42501 for an
 * identical value. `parentId` is the one that can raise ATX16 or ATX17.
 */
export async function updateFolder(
  table: FolderTable,
  id: string,
  patch: { name?: string; color?: string | null; parentId?: string | null; position?: number }
): Promise<FolderWriteResult> {
  // Typed rather than a loose record: the generated Update type rejects an
  // index signature outright, which is the schema refusing a payload it cannot
  // check column by column.
  const payload: {
    name?: string;
    color?: string | null;
    parent_id?: string | null;
    position?: number;
  } = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.parentId !== undefined) payload.parent_id = patch.parentId;
  if (patch.position !== undefined) payload.position = patch.position;
  if (Object.keys(payload).length === 0) return { ok: true };

  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) {
    console.error(`[folders] Could not update in ${table}:`, error.message);
    return { ok: false, message: describeFolderError(error) };
  }
  return { ok: true };
}

/** Reorders siblings. Separate calls because PostgREST cannot write two different values in one statement. */
export async function setFolderPositions(
  table: FolderTable,
  positions: { id: string; position: number }[]
): Promise<FolderWriteResult> {
  for (const p of positions) {
    const { error } = await supabase.from(table).update({ position: p.position }).eq("id", p.id);
    if (error) {
      console.error(`[folders] Could not reorder ${table}:`, error.message);
      return { ok: false, message: describeFolderError(error) };
    }
  }
  return { ok: true };
}

/**
 * Deletes one folder, and ONLY that folder.
 *
 * parent_id is ON DELETE CASCADE on both tables, so a plain delete would take
 * the whole subtree with it — which is not what this app does. Subfolders of a
 * deleted folder have always been promoted to the top level, and whatever was
 * filed in it unfiled; the local comment calls that "never silently deletes a
 * routine", and it stays true here. So the children are re-parented FIRST and
 * the folder is deleted second.
 *
 * The contents need no such step: routines.folder_id and
 * workout_templates.folder_id are both ON DELETE SET NULL, so the database
 * unfiles them itself.
 */
export async function deleteFolder(table: FolderTable, id: string): Promise<FolderWriteResult> {
  const { error: promoteError } = await supabase
    .from(table)
    .update({ parent_id: null })
    .eq("parent_id", id);

  if (promoteError) {
    console.error(`[folders] Could not promote subfolders in ${table}:`, promoteError.message);
    return { ok: false, message: describeFolderError(promoteError) };
  }

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`[folders] Could not delete from ${table}:`, error.message);
    return { ok: false, message: describeFolderError(error) };
  }
  return { ok: true };
}
