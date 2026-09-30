import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MAX_FOLDER_DEPTH, canAddSubfolder, canMoveFolder, folderDepth, isInside, subtreeHeight } from "./folderDepth";

// A chain five deep (L1 > L2 > L3 > L4 > L5), a sibling top-level folder T,
// and a two-level folder P > Q.
const folders = [
  { id: "L1", parentId: null },
  { id: "L2", parentId: "L1" },
  { id: "L3", parentId: "L2" },
  { id: "L4", parentId: "L3" },
  { id: "L5", parentId: "L4" },
  { id: "T", parentId: null },
  { id: "P", parentId: null },
  { id: "Q", parentId: "P" },
];

test("levels count from 1 at the top; the top of the tree is 0", () => {
  assert.equal(MAX_FOLDER_DEPTH, 5);
  assert.equal(folderDepth(null, folders), 0);
  assert.equal(folderDepth("L1", folders), 1);
  assert.equal(folderDepth("L5", folders), 5);
  assert.equal(subtreeHeight("L1", folders), 5);
  assert.equal(subtreeHeight("P", folders), 2);
  assert.equal(subtreeHeight("T", folders), 1);
});

test("Add subfolder stops at level 5", () => {
  assert.equal(canAddSubfolder("L4", folders), true);
  assert.equal(canAddSubfolder("L5", folders), false);
});

test("a move is refused when anything would end up below level 5", () => {
  assert.equal(canMoveFolder("T", "L4", folders), true, "a leaf to level 5");
  assert.equal(canMoveFolder("T", "L5", folders), false, "a leaf to level 6");
  assert.equal(canMoveFolder("P", "L3", folders), true, "P at 4, Q at 5");
  assert.equal(canMoveFolder("P", "L4", folders), false, "Q would be level 6");
  assert.equal(canMoveFolder("L2", null, folders), true, "out to the top level");
});

test("a folder never moves into itself or its own subfolders", () => {
  assert.equal(isInside("L3", "L1", folders), true);
  assert.equal(isInside("T", "L1", folders), false);
  assert.equal(canMoveFolder("L1", "L1", folders), false);
  assert.equal(canMoveFolder("L2", "L4", folders), false);
});
