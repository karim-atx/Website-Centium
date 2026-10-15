// Release 3 W2: the trend ring's numbers from hub_trend rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { periodModel, stripCounts, todayModel } from "./trendModel";

const hour = (pct: number | null, planned: number) => ({ pct, previousPct: null, planned });

test("today: cumulative pct becomes per-hour counts, headline by lane (Karim's answer 6)", () => {
  // Dietitian fixture shape: 6 meals planned, 2 by 9 AM, 4 by 2 PM.
  const rows = Array.from({ length: 24 }, (_, h) => hour(h < 8 ? 0 : h < 13 ? 33 : 67, 6));
  const m = todayModel(rows, "nutrition", 15);
  assert.equal(m.headline.big, "4");
  assert.equal(m.headline.caption, "meals logged so far");
  assert.equal(m.headline.line, "of 6 main meals today");
  assert.equal(m.bars.length, 14);
  assert.equal(m.bars[1].value, 2); // 8 AM
  assert.equal(m.bars[6].value, 2); // 1 PM
  assert.equal(m.bars[9].value, null); // 4 PM is in the future
  assert.equal(todayModel(rows, "clinical_overview", 15).headline.caption, "appointments and follow-ups done");
  assert.equal(todayModel(rows.map(() => hour(0, 0)), "full_coaching", 10).headline.line, "Nothing planned today");
});

test("week: planned-weighted mean, delta in points, early and no shared data", () => {
  const day = (pct: number | null, prev: number | null, planned: number) => ({ pct, previousPct: prev, planned });
  const full = periodModel([day(100, 80, 2), day(50, 60, 2), day(75, 70, 4), day(null, null, 0), day(null, null, 0), day(null, null, 0), day(null, null, 0)], "full_coaching", 3);
  assert.equal(full.headline.big, "75%");
  assert.equal(full.headline.delta, 75 - 70);
  assert.equal(full.headline.caption, "workouts on plan");
  const early = periodModel([day(100, null, 1), day(null, null, 0), day(0, null, 1), day(null, null, 0), day(null, null, 0), day(null, null, 0), day(null, null, 0)], "full_coaching", 3);
  assert.equal(early.headline.big, "–");
  assert.equal(early.headline.early, true);
  const none = periodModel(Array.from({ length: 7 }, () => day(null, null, 0)), "nutrition", 2);
  assert.equal(none.headline.noData, true);
  assert.equal(none.headline.caption, "No shared data yet");
});

test("strip counts", () => {
  assert.equal(stripCounts(["up", "up", "down", "flat", null]), "2 up · 1 down · 1 steady");
  assert.equal(stripCounts(["new", "new"], "patient"), "2 new patients");
});
