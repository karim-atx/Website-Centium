// How deep routine folders may nest (2026-09-30): five levels, a top-level
// folder being level 1. The database walks parents to refuse cycles but sets
// no depth (Database 20260916170000 declined one on purpose), so this is where
// the limit lives: "Add subfolder" is disabled at level 5, and a drag or move
// that would put any folder below level 5 is refused.

export const MAX_FOLDER_DEPTH = 5;

interface FolderLike {
  id: string;
  parentId?: string | null;
}

/** A folder's level: 1 at the top, 2 inside that, and so on. 0 for "no folder" (the top of the tree). */
export function folderDepth(folderId: string | null, folders: FolderLike[]): number {
  let depth = 0;
  const seen = new Set<string>();
  for (let id = folderId; id && !seen.has(id); id = folders.find((f) => f.id === id)?.parentId ?? null) {
    seen.add(id);
    depth++;
  }
  return depth;
}

/** Levels a folder occupies with everything inside it: 1 for a folder with no subfolders. */
export function subtreeHeight(folderId: string, folders: FolderLike[], seen = new Set<string>()): number {
  if (seen.has(folderId)) return 0;
  seen.add(folderId);
  const children = folders.filter((f) => (f.parentId ?? null) === folderId);
  return 1 + Math.max(0, ...children.map((c) => subtreeHeight(c.id, folders, seen)));
}

/** Whether `candidateId` is `rootId` or somewhere inside it. */
export function isInside(candidateId: string | null, rootId: string, folders: FolderLike[]): boolean {
  const seen = new Set<string>();
  for (let id = candidateId; id && !seen.has(id); id = folders.find((f) => f.id === id)?.parentId ?? null) {
    if (id === rootId) return true;
    seen.add(id);
  }
  return false;
}

/** Whether a new subfolder can be added inside this folder. */
export function canAddSubfolder(folderId: string, folders: FolderLike[]): boolean {
  return folderDepth(folderId, folders) < MAX_FOLDER_DEPTH;
}

/**
 * Whether a folder (with everything inside it) can move under `newParentId`
 * (null = the top level): never into itself or its own subfolders, and never
 * so deep that any folder in it would sit below level 5.
 */
export function canMoveFolder(folderId: string, newParentId: string | null, folders: FolderLike[]): boolean {
  if (newParentId !== null && isInside(newParentId, folderId, folders)) return false;
  return folderDepth(newParentId, folders) + subtreeHeight(folderId, folders) <= MAX_FOLDER_DEPTH;
}

/** The short reason shown on a disabled "Add subfolder". */
export const MAX_DEPTH_NOTE = `Folders go ${MAX_FOLDER_DEPTH} levels deep at most`;
