// Routine order (WO1.1). routines.position is 0-based within (owner, folder);
// Unfiled (folder null) is its own group. Positions are not unique mid-reorder,
// so the order is (position, created_at). A routine this device holds that has
// no row yet (a template mirror) has no position and sorts last.

export interface Orderable {
  id: string;
  folderId: string | null;
  position?: number;
  createdAt?: string;
}

/** One row whose folder or position a placement changes. */
export interface Placement {
  id: string;
  folderId: string | null;
  position: number;
}

export function compareRoutineOrder(a: Orderable, b: Orderable): number {
  const pa = a.position ?? Number.MAX_SAFE_INTEGER;
  const pb = b.position ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

/** A folder's routines (or Unfiled's, for null) in display order. */
export function routinesIn<T extends Orderable>(routines: T[], folderId: string | null): T[] {
  return routines.filter((r) => (r.folderId ?? null) === folderId).sort(compareRoutineOrder);
}

/** Where a new routine goes: after the last one in its folder. */
export function nextPosition(routines: Orderable[], folderId: string | null): number {
  const group = routines.filter((r) => (r.folderId ?? null) === folderId && r.position !== undefined);
  return group.length === 0 ? 0 : Math.max(...group.map((r) => r.position!)) + 1;
}

/** The rows of a group renumbered 0..n-1 in the given order, keeping only the ones that change. */
function renumber(ordered: Orderable[], folderId: string | null): Placement[] {
  return ordered
    .map((r, position) => ({ r, position }))
    .filter(({ r, position }) => r.position !== position || (r.folderId ?? null) !== folderId)
    .map(({ r, position }) => ({ id: r.id, folderId, position }));
}

/**
 * Moves one routine to `index` in folder `folderId` (null = Unfiled; an index
 * past the end appends). Both the group it lands in and, when it changes
 * folder, the group it left are renumbered; only rows that change are returned.
 */
export function placeRoutine(
  routines: Orderable[],
  id: string,
  folderId: string | null,
  index: number
): Placement[] {
  const moving = routines.find((r) => r.id === id);
  if (!moving) return [];
  const from = moving.folderId ?? null;
  const target = routinesIn(routines, folderId).filter((r) => r.id !== id);
  target.splice(Math.max(0, Math.min(index, target.length)), 0, moving);
  const out = renumber(target, folderId);
  if (from !== folderId) out.push(...renumber(routinesIn(routines, from).filter((r) => r.id !== id), from));
  return out;
}

/** A copy placed directly below its original: the copy and every row after it. */
export function placeBelow(routines: Orderable[], originalId: string, copy: Orderable): Placement[] {
  const original = routines.find((r) => r.id === originalId);
  const folderId = original?.folderId ?? null;
  const group = routinesIn(
    routines.filter((r) => r.id !== copy.id),
    folderId
  );
  const at = group.findIndex((r) => r.id === originalId);
  group.splice(at === -1 ? group.length : at + 1, 0, copy);
  return renumber(group, folderId);
}

/** A list of ids with `id` moved to `index` (siblings reorder only among themselves). */
export function moveId(ids: string[], id: string, index: number): string[] {
  const rest = ids.filter((x) => x !== id);
  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id);
  return rest;
}

/** Applies placements to a local list. */
export function applyPlacements<T extends Orderable>(routines: T[], placements: Placement[]): T[] {
  const by = new Map(placements.map((p) => [p.id, p]));
  return routines.map((r) => {
    const p = by.get(r.id);
    return p ? { ...r, folderId: p.folderId, position: p.position } : r;
  });
}
