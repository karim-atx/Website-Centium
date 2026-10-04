import { FOLDER_SWATCHES } from "../../data/folderColors";

// Helpers for the shared folder pieces (FolderParts.tsx), kept out of the
// component file so it exports components only.

export const folderColorOptions = FOLDER_SWATCHES.map((s) => s.color);
export const swatchName = (c: string) => FOLDER_SWATCHES.find((s) => s.color === c)?.name ?? c;

/**
 * A sibling group as rendered while dragging: the placeholder at the drop
 * index (counted without the dragged item), and the dragged item kept in its
 * original place, hidden (see useRoutineDrag).
 */
export function withPlaceholder<T extends { id: string }>(items: T[], draggedId: string | null, at: number | null) {
  const rest = items.filter((x) => x.id !== draggedId);
  const out: ({ kind: "item"; item: T; hidden: boolean } | { kind: "placeholder" })[] = rest.map((item) => ({
    kind: "item" as const,
    item,
    hidden: false,
  }));
  if (at !== null) out.splice(Math.min(at, out.length), 0, { kind: "placeholder" });
  const dragged = items.findIndex((x) => x.id === draggedId);
  if (dragged !== -1) out.splice(Math.min(dragged, out.length), 0, { kind: "item", item: items[dragged], hidden: true });
  return out;
}
