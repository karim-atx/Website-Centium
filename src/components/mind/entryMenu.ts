import { isFolderOpen, type UnlockWindows } from "../../services/journal/lockLogic";

/**
 * D12 (restore round, 2026-10-07): the Journal entry an Edit / Delete menu
 * may act on. Only an entry that is a card on screen counts: in the selected
 * folder, with that folder open. A shut folder (locked, no live unlock
 * window) shows placeholders, not cards, so its entries are never a target,
 * and a menu whose folder shuts while it is open stops acting.
 *
 * `windows` only ever holds live windows (AppContext drops each one when it
 * lapses), so the check reads it with "now" at -Infinity, as JournalTab does.
 */
export function entryMenuTarget<E extends { id: string; folderId: string }>(
  entryId: string | null | undefined,
  visible: E[],
  folder: { id: string; locked?: boolean } | undefined,
  windows: UnlockWindows,
): E | undefined {
  if (!entryId || !folder) return undefined;
  if (!isFolderOpen(folder, windows, Number.NEGATIVE_INFINITY)) return undefined;
  const entry = visible.find((e) => e.id === entryId);
  return entry && entry.folderId === folder.id ? entry : undefined;
}
