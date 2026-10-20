import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseShareCard } from "./shareCards";

test("programme_share reads the allowlisted keys", () => {
  const c = parseShareCard([{ kind: "programme_share", payload: { template_id: "t1", name: " Strength A ", duration_weeks: 4, exercise_count: "12", note: "" } }]);
  assert.deepEqual(c, { kind: "programme_share", templateId: "t1", name: "Strength A", durationWeeks: 4, exerciseCount: 12, note: null });
});

test("session_share reads title, start, length and place", () => {
  const c = parseShareCard({ kind: "session_share", payload: { title: "Group run", starts_at: "2026-10-17T06:00:00Z", duration_min: 60, location: "Park" } });
  assert.deepEqual(c, { kind: "session_share", title: "Group run", startsAt: "2026-10-17T06:00:00Z", durationMin: 60, location: "Park", note: null });
});

test("other kinds and broken payloads are not share cards", () => {
  assert.equal(parseShareCard({ kind: "plans_offer", payload: { plans: [] } }), null);
  assert.equal(parseShareCard({ kind: "programme_share", payload: {} }), null);
  assert.equal(parseShareCard(null), null);
  assert.equal(parseShareCard([]), null);
});
