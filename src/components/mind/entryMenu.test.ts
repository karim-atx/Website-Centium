import { strict as assert } from "node:assert";
import { test } from "node:test";
import { entryMenuTarget } from "./entryMenu";

const entries = [
  { id: "e1", folderId: "a" },
  { id: "e2", folderId: "a" },
];

test("an entry in an open, unlocked folder is the menu's target", () => {
  assert.deepEqual(entryMenuTarget("e2", entries, { id: "a" }, {}), entries[1]);
  assert.deepEqual(entryMenuTarget("e1", entries, { id: "a", locked: false }, {}), entries[0]);
});

test("a locked folder with a live window is open; without one it is shut", () => {
  const f = { id: "a", locked: true };
  assert.deepEqual(entryMenuTarget("e1", entries, f, { a: "2026-10-07T12:05:00Z" }), entries[0]);
  assert.equal(entryMenuTarget("e1", entries, f, {}), undefined);
  // Another folder's window opens nothing here.
  assert.equal(entryMenuTarget("e1", entries, f, { b: "2026-10-07T12:05:00Z" }), undefined);
});

test("no entry, a gone entry, another folder's entry or no folder: no target", () => {
  assert.equal(entryMenuTarget(null, entries, { id: "a" }, {}), undefined);
  assert.equal(entryMenuTarget("gone", entries, { id: "a" }, {}), undefined);
  assert.equal(entryMenuTarget("e1", entries, { id: "b" }, {}), undefined);
  assert.equal(entryMenuTarget("e1", entries, undefined, {}), undefined);
});
