import { test } from "node:test";
import assert from "node:assert/strict";
import { canAnswer, threadReplies } from "./threading";

const r = (id: string, at: string, parentReplyId: string | null = null) => ({ id, createdAt: `2026-11-05T${at}:00Z`, parentReplyId });

test("answers follow their comment, oldest first; comments keep their order", () => {
  const out = threadReplies([r("a", "09:00"), r("b", "09:05"), r("a2", "09:10", "a"), r("a1", "09:06", "a"), r("c", "09:20"), r("b1", "09:30", "b")]);
  assert.deepEqual(
    out.map((x) => `${x.reply.id}:${x.depth}`),
    ["a:0", "a1:1", "a2:1", "b:0", "b1:1", "c:0"]
  );
});

test("an answer whose comment isn't shown stands on its own, in time order", () => {
  const out = threadReplies([r("a", "09:00"), r("x1", "09:05", "gone"), r("b", "09:10")]);
  assert.deepEqual(out.map((x) => `${x.reply.id}:${x.depth}`), ["a:0", "x1:0", "b:0"]);
});

test("only a comment on the post itself can be answered (one level)", () => {
  assert.equal(canAnswer({ parentReplyId: null }), true);
  assert.equal(canAnswer({ parentReplyId: "a" }), false);
});
