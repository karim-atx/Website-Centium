import type { Routine } from "../../types";
import { newBlockId } from "../workout/blocks";

let copyExId = 0;

/**
 * A routine copied fresh (WO1.1 Duplicate): as if it had just been created
 * with the same exercises. Copied: the exercises, their order, the number of
 * sets, each set's template weight and reps (the whole prescription) and the
 * super-set pairings (blocks, under new ids). Not copied: pinned notes, rest
 * timers, the coach's note and assignment, the template it was adopted from,
 * and its order (the caller places it). Set notes, set types and history live
 * on logged sessions, never on the template, so there is nothing to strip, and
 * the copy's new id has no previous session to prefill from.
 */
export function cleanRoutineCopy(
  original: Routine,
  name: string,
  folderId: string | null
): Omit<Routine, "id"> {
  const blockIds = new Map((original.blocks ?? []).map((b) => [b.id, newBlockId()]));
  return {
    folderId,
    name,
    color: original.color,
    estimatedDurationMin: original.estimatedDurationMin,
    blocks: (original.blocks ?? []).map((b) => ({ ...b, id: blockIds.get(b.id)! })),
    exercises: original.exercises.map((ex) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pinnedNote, restSeconds, ...template } = ex;
      return {
        ...template,
        id: `copy-ex-${Date.now()}-${copyExId++}`,
        blockId: ex.blockId ? blockIds.get(ex.blockId) ?? null : ex.blockId,
      };
    }),
  };
}
