import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  blockRange,
  canGroup,
  checkBlock,
  groupExercises,
  moveExercise,
  normalizeBlock,
  pruneBlocks,
  reorderByDrag,
  ungroupBlock,
} from "./blocks.ts";
import type { Exercise, WorkoutBlock } from "../../types";

// The contiguity rule is enforced by a DEFERRED trigger, so breaking it costs
// a whole routine's prescriptions at COMMIT with a SQLSTATE nobody can act on.
// These cases are the reason the UI cannot get there.

const ex = (id: string, blockId?: string): Exercise => ({
  id,
  name: id.toUpperCase(),
  sets: 3,
  reps: 10,
  weightKg: 0,
  classification: "barbell",
  ...(blockId ? { blockId } : {}),
});

const ids = (list: Exercise[]) => list.map((e) => e.id).join(" ");
const groups = (list: Exercise[]) => list.map((e) => e.blockId ?? "-").join(" ");

test("canGroup wants two or more", () => {
  const list = [ex("a"), ex("b")];
  assert.match(canGroup(list, ["a"]).ok ? "" : (canGroup(list, ["a"]) as { message: string }).message, /at least two/);
});

test("canGroup refuses a selection with a hole", () => {
  const list = [ex("a"), ex("b"), ex("c")];
  const result = canGroup(list, ["a", "c"]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /unbroken run/);
});

test("canGroup refuses rows already in a block", () => {
  const list = [ex("a", "b1"), ex("b", "b1"), ex("c")];
  const result = canGroup(list, ["a", "b"]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /Ungroup/);
});

test("canGroup accepts a consecutive free run, in any click order", () => {
  const list = [ex("a"), ex("b"), ex("c")];
  assert.equal(canGroup(list, ["c", "b"]).ok, true);
});

test("grouping and ungrouping leave the order alone", () => {
  const list = [ex("a"), ex("b"), ex("c")];
  const block: WorkoutBlock = { id: "b1", kind: "superset" };
  const grouped = groupExercises(list, ["b", "c"], block);
  assert.equal(ids(grouped), "a b c");
  assert.equal(groups(grouped), "- b1 b1");
  const loose = ungroupBlock(grouped, "b1");
  assert.equal(ids(loose), "a b c");
  assert.equal(groups(loose), "- - -");
});

// --- moving ----------------------------------------------------------------

test("a solo swaps with a solo", () => {
  const list = [ex("a"), ex("b")];
  assert.equal(ids(moveExercise(list, "b", "up")), "b a");
  assert.equal(ids(moveExercise(list, "a", "down")), "b a");
});

test("a member moves inside its own block", () => {
  const list = [ex("a", "b1"), ex("b", "b1"), ex("c", "b1")];
  const moved = moveExercise(list, "c", "up");
  assert.equal(ids(moved), "a c b");
  assert.equal(groups(moved), "b1 b1 b1");
});

test("a member cannot walk out of its block — that is Ungroup", () => {
  const list = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d")];
  assert.equal(moveExercise(list, "b", "up"), list, "the first member stays put");
  assert.equal(moveExercise(list, "c", "down"), list, "the last member stays put");
});

test("a solo steps over a WHOLE block, never into it", () => {
  const list = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d", "b1")];
  const down = moveExercise(list, "a", "down");
  assert.equal(ids(down), "b c d a", "a lands after the block, not between b and c");
  assert.equal(groups(down), "b1 b1 b1 -");
});

test("a solo steps back over a whole block the other way", () => {
  const list = [ex("b", "b1"), ex("c", "b1"), ex("d", "b1"), ex("a")];
  const up = moveExercise(list, "a", "up");
  assert.equal(ids(up), "a b c d");
  assert.equal(groups(up), "- b1 b1 b1");
});

test("moving at either end of the list is a no-op", () => {
  const list = [ex("a"), ex("b")];
  assert.equal(moveExercise(list, "a", "up"), list);
  assert.equal(moveExercise(list, "b", "down"), list);
});

test("every block stays contiguous through a run of moves", () => {
  let list = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d"), ex("e", "b2"), ex("f", "b2")];
  const moves: [string, "up" | "down"][] = [
    ["a", "down"], ["d", "up"], ["d", "down"], ["a", "up"], ["c", "up"], ["f", "up"],
  ];
  for (const [id, dir] of moves) {
    list = moveExercise(list, id, dir);
    for (const blockId of ["b1", "b2"]) {
      const range = blockRange(list, blockId);
      assert.ok(range, blockId);
      const members = list.filter((e) => e.blockId === blockId).length;
      assert.equal(
        range!.end - range!.start + 1,
        members,
        `${blockId} broke apart after ${id} ${dir}: ${ids(list)} / ${groups(list)}`
      );
    }
  }
});

// --- shape -----------------------------------------------------------------

test("normalizeBlock drops what the kind forbids", () => {
  const messy = {
    id: "b",
    kind: "superset",
    rounds: 5,
    timeCapSeconds: 600,
    intervalSeconds: 60,
  } as WorkoutBlock;
  assert.deepEqual(normalizeBlock(messy), { id: "b", kind: "superset", label: undefined });

  const emom = normalizeBlock({ id: "b", kind: "emom" });
  assert.equal(emom.intervalSeconds, 60);
  assert.equal(emom.rounds, 10);
  assert.equal(emom.timeCapSeconds, undefined);

  const amrap = normalizeBlock({ id: "b", kind: "amrap", rounds: 9 });
  assert.equal(amrap.rounds, undefined, "an AMRAP's round count is the result, not the plan");
  assert.equal(amrap.timeCapSeconds, 720);
});

test("checkBlock mirrors the membership rule", () => {
  assert.equal(checkBlock({ id: "b", kind: "superset" }, 0), null, "memberless is legal");
  assert.match(checkBlock({ id: "b", kind: "superset" }, 1) ?? "", /at least two/);
  assert.equal(checkBlock({ id: "b", kind: "superset" }, 2), null);
  assert.match(checkBlock({ id: "b", kind: "amrap" }, 1) ?? "", /how long/);
  assert.match(checkBlock({ id: "b", kind: "emom", intervalSeconds: 60 }, 1) ?? "", /rounds/);
  assert.equal(checkBlock({ id: "b", kind: "for_time", rounds: 3 }, 1), null);
});

test("pruneBlocks drops the ones nothing points at", () => {
  const list = [ex("a", "b1"), ex("b")];
  const blocks: WorkoutBlock[] = [
    { id: "b1", kind: "superset" },
    { id: "b2", kind: "amrap", timeCapSeconds: 600 },
  ];
  assert.deepEqual(pruneBlocks(list, blocks).map((b) => b.id), ["b1"]);
});

// --- dragging --------------------------------------------------------------

test("a solo dropped into a block snaps to the nearer edge", () => {
  const list = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d", "b1")];
  // Dropped on `b`, the first member — nearer the start, so it lands before it.
  assert.equal(ids(reorderByDrag(list, 0, 1)), "a b c d", "no visible move: it was already there");
  // Dropped on `d`, the last member — nearer the end, so it lands after.
  assert.equal(ids(reorderByDrag(list, 0, 3)), "b c d a");
});

test("a solo dragged past a solo lands where it was dropped", () => {
  const list = [ex("a"), ex("b"), ex("c")];
  assert.equal(ids(reorderByDrag(list, 0, 2)), "b c a");
  assert.equal(ids(reorderByDrag(list, 2, 0)), "c a b");
});

test("a member can be dragged only inside its own block", () => {
  const list = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d", "b1")];
  assert.equal(ids(reorderByDrag(list, 3, 1)), "a d b c", "within the block, fine");
  assert.equal(reorderByDrag(list, 1, 0), list, "out of the block, refused");
});

test("a member cannot be dragged into a different block", () => {
  const list = [ex("a", "b1"), ex("b", "b1"), ex("c", "b2"), ex("d", "b2")];
  assert.equal(reorderByDrag(list, 0, 3), list);
});

test("every block survives a storm of drags", () => {
  const start = [ex("a"), ex("b", "b1"), ex("c", "b1"), ex("d"), ex("e", "b2"), ex("f", "b2"), ex("g")];
  let list = start;
  for (let from = 0; from < 7; from++) {
    for (let to = 0; to < 7; to++) {
      const next = reorderByDrag(list, from, to);
      for (const blockId of ["b1", "b2"]) {
        const range = blockRange(next, blockId);
        const members = next.filter((e) => e.blockId === blockId).length;
        assert.ok(range, blockId);
        assert.equal(
          range!.end - range!.start + 1,
          members,
          `${blockId} broke after drag ${from}->${to}: ${ids(next)} / ${groups(next)}`
        );
      }
      assert.equal(next.length, 7, "nothing lost or duplicated");
      list = next;
    }
  }
});
