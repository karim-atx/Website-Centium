import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecommendation } from "./recommendation.ts";

test("a recommendation as CU9 draws it: title, a bold line, bullets", () => {
  const r = parseRecommendation({
    kind: "recommendation",
    payload: { title: "Easy 30 min walk on rest days", body: "Tuesday and Thursday\nHelps recovery before your ski trip", category: "habit" },
  });
  assert.deepEqual(r, {
    kind: "recommendation",
    title: "Easy 30 min walk on rest days",
    lead: "Tuesday and Thursday",
    points: ["Helps recovery before your ski trip"],
    category: "habit",
    refKind: null,
    refId: null,
  });
});

test("no body, a course reference, a one-row array", () => {
  const r = parseRecommendation([{ kind: "recommendation", payload: { title: " Mobility basics ", category: "course", ref_kind: "course", ref_id: "c1" } }]);
  assert.equal(r?.title, "Mobility basics");
  assert.equal(r?.lead, null);
  assert.deepEqual(r?.points, []);
  assert.equal(r?.refKind, "course");
  assert.equal(r?.refId, "c1");
});

test("blank lines and bullet marks are dropped", () => {
  const r = parseRecommendation({ kind: "recommendation", payload: { title: "T", body: "Lead\n\n- one\n• two\n  " } });
  assert.equal(r?.lead, "Lead");
  assert.deepEqual(r?.points, ["one", "two"]);
});

test("other kinds and unreadable payloads are not recommendations", () => {
  assert.equal(parseRecommendation(null), null);
  assert.equal(parseRecommendation({ kind: "plans_offer", payload: { title: "x" } }), null);
  assert.equal(parseRecommendation({ kind: "recommendation", payload: { title: "  " } }), null);
  assert.equal(parseRecommendation({ kind: "recommendation" }), null);
});
