import type { BlockKind, Exercise, WorkoutBlock } from "../../types";

// Grouping exercises into blocks, and moving them without breaking one.
//
// THE FLAT LIST IS THE TRUTH. `position` is the order, and a block's members
// must occupy a CONTIGUOUS run of it — enforced by a deferred trigger, so a
// save that breaks it fails at COMMIT with ATX27 and takes the whole routine's
// prescriptions with it. Every operation here is written to make that
// unreachable rather than to recover from it.
//
// NO ACCIDENTS, WHICH IS THE WHOLE DESIGN. A plain up/down arrow that moved an
// exercise one slot would sooner or later drop it in the middle of somebody's
// superset — silently changing what they are being asked to do. So a solo
// exercise steps over a WHOLE block rather than into it, and a member moves
// only inside its own block. Leaving a block is Ungroup, a named action.

/**
 * The default EMOM interval. One minute, as the name says.
 *
 * Here rather than with the endurance plans, where it first landed: an EMOM is
 * a BLOCK and its interval is a block parameter. Keeping it there also gave
 * this module its only runtime import, and the modules under services/workout
 * that take nothing but types are the ones node:test can run directly.
 */
export const DEFAULT_EMOM_INTERVAL_SECONDS = 60;

/** A local id for a block the user has just drawn. Replaced by a uuid on save. */
export const newBlockId = (): string =>
  `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** The parameters a kind requires, as the database's CHECK defines them. */
export function defaultBlockParams(kind: BlockKind): Omit<WorkoutBlock, "id" | "kind" | "label"> {
  switch (kind) {
    case "superset":
      return {};
    case "amrap":
      return { timeCapSeconds: 12 * 60 };
    case "emom":
      return { intervalSeconds: DEFAULT_EMOM_INTERVAL_SECONDS, rounds: 10 };
    case "for_time":
      return { rounds: 5 };
  }
}

/**
 * Strips the parameters a kind forbids.
 *
 * routine_exercise_blocks_kind_shape_check rejects a superset carrying rounds
 * as firmly as an EMOM missing them, so switching kind in the editor has to
 * drop what no longer applies rather than leave it in state.
 */
export function normalizeBlock(block: WorkoutBlock): WorkoutBlock {
  const base = { id: block.id, kind: block.kind, label: block.label };
  switch (block.kind) {
    case "superset":
      return base;
    case "amrap":
      return { ...base, timeCapSeconds: block.timeCapSeconds ?? 12 * 60 };
    case "emom":
      return {
        ...base,
        intervalSeconds: block.intervalSeconds ?? DEFAULT_EMOM_INTERVAL_SECONDS,
        rounds: block.rounds ?? 10,
      };
    case "for_time":
      return {
        ...base,
        rounds: block.rounds ?? 5,
        ...(block.timeCapSeconds ? { timeCapSeconds: block.timeCapSeconds } : {}),
      };
  }
}

/** Mirrors the membership rule, so a refusal is named before the save. */
export function checkBlock(block: WorkoutBlock, memberCount: number): string | null {
  if (memberCount === 0) return null; // memberless is legal, and transient
  if (block.kind === "superset" && memberCount < 2) {
    return "A superset needs at least two exercises.";
  }
  if (block.kind === "amrap" && !block.timeCapSeconds) return "Set how long the AMRAP runs for.";
  if (block.kind === "emom" && (!block.intervalSeconds || !block.rounds)) {
    return "An EMOM needs an interval and a number of rounds.";
  }
  if (block.kind === "for_time" && !block.rounds) return "Set how many rounds.";
  return null;
}

/**
 * Whether a set of exercises can become one block.
 *
 * CONSECUTIVE, AND NOT ALREADY SPOKEN FOR. Grouping a selection that skips
 * over something would produce exactly the non-contiguous arrangement the
 * trigger refuses, and grouping rows that already belong to another block
 * would silently steal them from it.
 */
export function canGroup(
  exercises: Exercise[],
  selectedIds: string[]
): { ok: true } | { ok: false; message: string } {
  if (selectedIds.length < 2) return { ok: false, message: "Pick at least two exercises." };
  const indices = selectedIds
    .map((id) => exercises.findIndex((e) => e.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length !== selectedIds.length) {
    return { ok: false, message: "Something in that selection is no longer here." };
  }
  if (indices[indices.length - 1] - indices[0] + 1 !== indices.length) {
    return { ok: false, message: "Pick exercises that sit next to each other." };
  }
  if (indices.some((i) => exercises[i].blockId)) {
    return { ok: false, message: "Ungroup those first — they're already in a block." };
  }
  return { ok: true };
}

/** Puts a run of exercises into a new block, leaving the order untouched. */
export function groupExercises(
  exercises: Exercise[],
  selectedIds: string[],
  block: WorkoutBlock
): Exercise[] {
  const chosen = new Set(selectedIds);
  return exercises.map((ex) => (chosen.has(ex.id) ? { ...ex, blockId: block.id } : ex));
}

/** Releases every member of a block. The order does not change. */
export function ungroupBlock(exercises: Exercise[], blockId: string): Exercise[] {
  return exercises.map((ex) => (ex.blockId === blockId ? { ...ex, blockId: null } : ex));
}

/** The half-open range a block occupies, or null when it has no members. */
export function blockRange(exercises: Exercise[], blockId: string): { start: number; end: number } | null {
  const indices = exercises
    .map((e, i) => (e.blockId === blockId ? i : -1))
    .filter((i) => i >= 0);
  if (indices.length === 0) return null;
  return { start: indices[0], end: indices[indices.length - 1] };
}

/**
 * Moves one exercise up or down, and never across a block boundary.
 *
 * FOUR CASES, and the third is the one that matters:
 *
 *   a member moving inside its own block   swap with its neighbour
 *   a member at the edge of its block      refused — leaving is Ungroup
 *   a solo stepping past another solo      swap
 *   a solo stepping past a block           jump the WHOLE block
 *
 * Returns the list unchanged when the move is not available, so a caller can
 * compare by reference to decide whether to disable the control.
 */
export function moveExercise(
  exercises: Exercise[],
  exerciseId: string,
  direction: "up" | "down"
): Exercise[] {
  const index = exercises.findIndex((e) => e.id === exerciseId);
  if (index < 0) return exercises;
  const step = direction === "up" ? -1 : 1;
  const neighbourIndex = index + step;
  if (neighbourIndex < 0 || neighbourIndex >= exercises.length) return exercises;

  const self = exercises[index];
  const neighbour = exercises[neighbourIndex];
  const swap = (a: number, b: number): Exercise[] => {
    const next = [...exercises];
    [next[a], next[b]] = [next[b], next[a]];
    return next;
  };

  if (self.blockId) {
    // Inside a block: only among its own members. The edge is a wall, and
    // Ungroup is the door.
    return neighbour.blockId === self.blockId ? swap(index, neighbourIndex) : exercises;
  }

  if (!neighbour.blockId) return swap(index, neighbourIndex);

  // Stepping past a whole block. Lifting self out and splicing it on the far
  // side keeps every member adjacent, which a one-slot swap would not.
  const range = blockRange(exercises, neighbour.blockId);
  if (!range) return swap(index, neighbourIndex);
  const without = exercises.filter((_, i) => i !== index);
  // The block's own indices shift by one when self sat before it.
  const target = direction === "down" ? range.end : range.start;
  const insertAt = direction === "down" ? target : target;
  const next = [...without];
  next.splice(insertAt, 0, self);
  return next;
}

/** Drops blocks nothing points at, so a save never sends an orphan. */
export function pruneBlocks(exercises: Exercise[], blocks: WorkoutBlock[]): WorkoutBlock[] {
  const used = new Set(exercises.map((e) => e.blockId).filter(Boolean));
  return blocks.filter((b) => used.has(b.id));
}

/**
 * Walks a flat exercise list into the runs that share a block.
 *
 * THE FLAT LIST STAYS THE TRUTH, which is what `position` means and what the
 * contiguity rule protects. This groups for rendering only, and it groups
 * CONSECUTIVE members rather than gathering by id — so a list the database
 * would refuse (a block split by an outsider) renders as two groups rather
 * than silently looking correct.
 */
export interface RenderRun {
  block: WorkoutBlock | null;
  ordinal: number;
  members: Exercise[];
}

export function groupIntoRuns(exercises: Exercise[], blocks: WorkoutBlock[]): RenderRun[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const seenPerKind = new Map<BlockKind, number>();
  const ordinalById = new Map<string, number>();

  const runs: RenderRun[] = [];
  for (const ex of exercises) {
    const block = ex.blockId ? byId.get(ex.blockId) ?? null : null;
    const last = runs[runs.length - 1];
    if (block && last?.block?.id === block.id) {
      last.members.push(ex);
      continue;
    }
    if (block && !ordinalById.has(block.id)) {
      const n = seenPerKind.get(block.kind) ?? 0;
      ordinalById.set(block.id, n);
      seenPerKind.set(block.kind, n + 1);
    }
    runs.push({ block, ordinal: block ? ordinalById.get(block.id) ?? 0 : 0, members: [ex] });
  }
  return runs;
}
