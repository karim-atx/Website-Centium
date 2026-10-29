import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  REPLY_MAX,
  chunkIds,
  groupReplyRows,
  parseReplies,
  parseReviewStates,
  replyHeading,
  replyProblem,
  replyRefusal,
  reviewStateText,
} from "./logReplyLogic.ts";

const S = "11111111-1111-4111-8111-111111111111";
const P = "22222222-2222-4222-8222-222222222222";

test("a reply is 1 to 1,000 characters once trimmed", () => {
  assert.equal(replyProblem(""), "Write a reply first.");
  assert.equal(replyProblem("   "), "Write a reply first.");
  assert.equal(replyProblem("Nice work"), null);
  assert.equal(replyProblem("a".repeat(REPLY_MAX)), null);
  assert.equal(replyProblem(` ${"a".repeat(REPLY_MAX)} `), null);
  assert.equal(replyProblem("a".repeat(REPLY_MAX + 1)), "A reply is up to 1,000 characters.");
});

test("refusals read as plain sentences", () => {
  assert.equal(replyRefusal(null, true), "You're offline. This needs a connection.");
  assert.equal(replyRefusal({ code: "ATX08" }, false), "This workout isn't shared with you any more.");
  assert.equal(replyRefusal({ code: "ATX08" }, false, "delete"), "That reply is already gone.");
  assert.equal(replyRefusal({ code: "ATX02" }, false), "You've sent a lot of replies this hour. Try again later.");
  assert.equal(replyRefusal({ code: "22023" }, false), "A reply is 1 to 1,000 characters.");
  assert.equal(replyRefusal({ code: "XX000" }, false, "review"), "Couldn't update the review. Try again.");
  assert.equal(replyRefusal(undefined, false), "Couldn't send your reply. Try again.");
});

test("the replies reader's rows, oldest first, incomplete rows dropped", () => {
  const rows = [
    { reply_id: "b", professional_id: P, professional_first_name: "Alex ", body: "Second", created_at: "2026-10-29T10:00:00Z", mine: true },
    { reply_id: "a", professional_id: P, professional_first_name: null, body: "First", created_at: "2026-10-29T09:00:00Z", mine: false },
    { reply_id: "c", professional_id: P, body: "", created_at: "2026-10-29T11:00:00Z" },
  ];
  const out = parseReplies(rows, S);
  assert.deepEqual(out.map((r) => r.id), ["a", "b"]);
  assert.equal(out[1].firstName, "Alex");
  assert.equal(out[1].mine, true);
  assert.equal(out[0].firstName, null);
  assert.equal(out[0].sessionId, S);
  assert.deepEqual(parseReplies(null, S), []);
});

test("the client's table rows group by session with the names known", () => {
  const rows = [
    { id: "r2", workout_session_id: S, professional_id: P, body: "Two", created_at: "2026-10-29T10:00:00Z" },
    { id: "r1", workout_session_id: S, professional_id: P, body: "One", created_at: "2026-10-29T09:00:00Z" },
    { id: "r3", workout_session_id: "other", professional_id: "x", body: "Three", created_at: "2026-10-28T09:00:00Z" },
  ];
  const out = groupReplyRows(rows, { [P]: "Alex" });
  assert.deepEqual(out[S].map((r) => r.id), ["r1", "r2"]);
  assert.equal(out[S][0].firstName, "Alex");
  assert.equal(out.other[0].firstName, null);
});

test("review states by session", () => {
  const out = parseReviewStates([
    { workout_session_id: S, reviewed_at: "2026-10-29T10:00:00Z", reply_count: 2 },
    { workout_session_id: "b", reviewed_at: null, reply_count: "0" },
    { reviewed_at: null },
  ]);
  assert.deepEqual(out[S], { reviewedAt: "2026-10-29T10:00:00Z", replyCount: 2 });
  assert.deepEqual(out.b, { reviewedAt: null, replyCount: 0 });
  assert.equal(Object.keys(out).length, 2);
});

test("ids go in calls of 200, without repeats", () => {
  const ids = Array.from({ length: 450 }, (_, i) => `id${i}`);
  const chunks = chunkIds([...ids, "id0", ""]);
  assert.deepEqual(chunks.map((c) => c.length), [200, 200, 50]);
  assert.deepEqual(chunkIds([]), []);
});

test("the list row's state and the reply heading", () => {
  assert.equal(reviewStateText(undefined), null);
  assert.equal(reviewStateText({ reviewedAt: null, replyCount: 0 }), null);
  assert.equal(reviewStateText({ reviewedAt: "x", replyCount: 0 }), "Reviewed");
  assert.equal(reviewStateText({ reviewedAt: "x", replyCount: 1 }), "Reviewed · 1 reply");
  assert.equal(reviewStateText({ reviewedAt: null, replyCount: 3 }), "3 replies");
  assert.equal(replyHeading("Alex"), "Reply from Alex");
  assert.equal(replyHeading(null), "Reply from your coach");
});
