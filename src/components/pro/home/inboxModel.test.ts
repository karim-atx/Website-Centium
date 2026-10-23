// Market + Share 3.0 · Release 2 live updates: the hub's member-inbox half.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withMemberRows } from "./inboxModel";

const row = (id: string, createdAt: string, memberKind: string | null = null) => ({ id, createdAt, memberKind });

test("withMemberRows replaces the member rows, keeps the console's, newest first", () => {
  const list = [row("c2", "2026-10-22T10:00:00Z"), row("m1", "2026-10-21T10:00:00Z", "hired"), row("c1", "2026-10-20T10:00:00Z")];
  const fresh = [row("m3", "2026-10-23T09:00:00Z", "hire_offer_received"), row("m1", "2026-10-21T10:00:00Z", "hired")];
  assert.deepEqual(
    withMemberRows(list, fresh).map((n) => n.id),
    ["m3", "c2", "m1", "c1"]
  );
  // A member row gone from the fresh read (cleared elsewhere) leaves the hub.
  assert.deepEqual(
    withMemberRows(list, []).map((n) => n.id),
    ["c2", "c1"]
  );
  // No console rows yet: the member rows alone, sorted.
  assert.deepEqual(
    withMemberRows([], [row("a", "2026-10-01T00:00:00Z", "hired"), row("b", "2026-10-02T00:00:00Z", "hired")]).map((n) => n.id),
    ["b", "a"]
  );
});
