import { test } from "node:test";
import assert from "node:assert/strict";
import { shareLocks } from "../shareLocks.ts";
import {
  EXPORT_K,
  achievementCard,
  arcDash,
  barHeights,
  barValues,
  cardColours,
  cardDate,
  cardH,
  cardMetrics,
  cardStats,
  clientPayload,
  exportSize,
  fmtDuration,
  foodCard,
  initialOn,
  macroShares,
  prCard,
  previewRadius,
  shortDate,
  sleepCard,
  statRows,
  stepsCard,
  streakCard,
  templateAllowed,
  waterAmount,
  waterCard,
  workoutCard,
  type WorkoutFacts,
} from "./clientCardModel.ts";

const adult = shareLocks({ recovery: false, age: "adult" });
const recovery = shareLocks({ recovery: true, age: "adult" });
const minor = shareLocks({ recovery: false, age: "minor" });

const W: WorkoutFacts = { name: "Push day", date: "2026-10-16", durationSec: 52 * 60, volumeKg: 8450, sets: 18, exercises: 6, prs: 1, exerciseVolumes: [550, 800, 700, 1000, 600, 450], bodyWeightKg: 74.2 };

test("geometry: card() for the client formats, exported at 1080", () => {
  assert.equal(cardH("post"), 375);
  assert.ok(Math.abs(cardH("story") - 533.33) < 0.01);
  assert.equal(EXPORT_K, 3.6);
  assert.deepEqual(exportSize("story"), { w: 1080, h: 1920 });
  assert.deepEqual(exportSize("post"), { w: 1080, h: 1350 });
  assert.deepEqual(exportSize("sticker"), { w: 1080, h: 1920 });
  assert.equal(Math.round(cardH("story") * EXPORT_K), 1920);
  assert.equal(cardH("post") * EXPORT_K, 1350);
  const s = cardMetrics("story");
  assert.equal(s.bigFs, 90);
  assert.equal(s.unitFs, 27);
  assert.equal(cardMetrics("post").bigFs, 72);
  assert.equal(cardMetrics("post").unitFs, 21.6);
  assert.equal(cardMetrics("sticker").svFs, 19.8);
  assert.equal(cardMetrics("story").svFs, 18);
  assert.equal(previewRadius(150), 10);
  assert.equal(previewRadius(300), 12);
});

test("colours: Centium gradient, the metric pattern and the white sticker (cc)", () => {
  const b = cardColours("workout", "story", "B");
  assert.equal(b.ink, "#FFFFFF");
  assert.equal(b.sub, "rgba(255,255,255,0.92)");
  assert.equal(b.line, "rgba(255,255,255,0.3)");
  assert.equal(b.barIdle, "rgba(255,255,255,0.45)");
  assert.equal(b.ts, "none");
  const i = cardColours("steps", "post", "I");
  assert.equal(i.acc, "#55733F");
  assert.equal(i.vis, "#55733F");
  assert.equal(i.barIdle, "#55733F66");
  assert.equal(i.track, "rgba(36,31,27,0.08)");
  assert.match(i.bg, /^radial-gradient\(85% 55% at 100% 0%, #55733F2E 0%, transparent 62%\), repeating-linear-gradient\(135deg, #55733F0F 0 2px, transparent 2px 13px\), #EAF1E4$/);
  const k = cardColours("workout", "sticker", "I");
  assert.equal(k.bg, "transparent");
  assert.equal(k.sub, "rgba(255,255,255,0.94)");
  assert.equal(k.line, "rgba(255,255,255,0.4)");
  assert.match(k.ts, /0 1px 2px rgba\(0,0,0,0.55\)/);
});

test("visual maths: bars, arc dash", () => {
  assert.deepEqual(barHeights([0.55, 0.8, 0.7, 1, 0.6, 0.45]), [24, 35, 31, 44, 26, 20]);
  assert.deepEqual(barValues([550, 800, 700, 1000, 600, 450]), [0.55, 0.8, 0.7, 1, 0.6, 0.45]);
  assert.equal(barValues([1, 2, 3, 4, 5, 6, 7, 8]).length, 6);
  assert.deepEqual(barValues([0, 0]), []);
  assert.equal(arcDash(96), "96 100");
  assert.equal(arcDash(140), "100 100");
});

test("formatting: month-first dates, durations", () => {
  assert.equal(cardDate("2026-10-16"), "Fri, Oct 16");
  assert.equal(shortDate("2026-09-17"), "Sep 17");
  assert.equal(fmtDuration(52 * 60), "52 min");
  assert.equal(fmtDuration(3 * 3600 + 26 * 60), "3 h 26");
  assert.equal(fmtDuration(3600 + 5 * 60), "1 h 05");
});

test("workout: headline always on, weight off by default (D-28)", () => {
  const spec = workoutCard(W);
  assert.equal(spec.eyebrow, "Strength workout");
  assert.equal(spec.big, "8,450");
  assert.equal(spec.line, "Total volume · 6 exercises");
  assert.equal(spec.sheetTitle, "Share your workout");
  const on = initialOn(spec);
  assert.deepEqual([...on], ["duration", "sets", "personal_bests"]);
  const rows = statRows(spec, on, adult);
  assert.deepEqual(rows[0], { key: "headline", title: "Volume", sub: "8,450 kg · the headline", kind: "headline", on: true });
  const weight = rows.find((r) => r.key === "body_weight")!;
  assert.equal(weight.kind, "switch");
  assert.equal(weight.on, false);
  assert.equal(weight.sub, "74.2 kg · off by default");
  assert.deepEqual(cardStats(spec, on, adult).map((s) => s.label), ["duration", "sets", "personal best"]);
});

test("toggling a stat removes it from the card and the payload (the export)", () => {
  const spec = workoutCard(W);
  const on = initialOn(spec);
  on.delete("sets");
  assert.deepEqual(cardStats(spec, on, adult).map((s) => s.key), ["duration", "personal_bests"]);
  const p = clientPayload(spec, "story", "B", on, adult);
  assert.deepEqual(p.stats.map((s) => s.key), ["duration", "personal_bests"]);
  on.add("body_weight");
  assert.deepEqual(clientPayload(spec, "post", "I", on, adult).stats.map((s) => s.key), ["duration", "personal_bests", "body_weight"]);
});

test("recovery mode and under-18s: weight locked, no switch, the lock line; never on the card", () => {
  const spec = workoutCard(W);
  const all = new Set(spec.stats.map((s) => s.key));
  for (const l of [recovery, minor]) {
    const w = statRows(spec, all, l).find((r) => r.key === "body_weight")!;
    assert.equal(w.kind, "locked");
    assert.equal(w.on, false);
    assert.equal(w.sub, l.lockLine);
    assert.ok(!cardStats(spec, all, l).some((s) => s.key === "body_weight"));
    assert.ok(!clientPayload(spec, "story", "B", all, l).stats.some((s) => s.key === "body_weight"));
  }
  assert.equal(statRows(spec, all, recovery).find((r) => r.key === "body_weight")!.sub, "Not shared while recovery-sensitive mode is on.");
  assert.equal(statRows(spec, all, minor).find((r) => r.key === "body_weight")!.sub, "Not available on cards for under-18s.");
});

test("no body weight on record: no row", () => {
  assert.ok(!workoutCard({ ...W, bodyWeightKg: null }).stats.some((s) => s.key === "body_weight"));
});

test("at most four stats on a card (cc max 4)", () => {
  const spec = workoutCard(W);
  const all = new Set(spec.stats.map((s) => s.key));
  assert.equal(cardStats(spec, all, adult).length, 4);
});

test("templates the locks remove: food day and streak in recovery mode", () => {
  for (const t of ["workout", "pr", "achievement", "steps", "sleep", "water"] as const) assert.equal(templateAllowed(t, recovery), true, t);
  assert.equal(templateAllowed("food", recovery), false);
  assert.equal(templateAllowed("streak", recovery), false);
  assert.equal(templateAllowed("food", minor), true);
  assert.equal(templateAllowed("streak", minor), true);
});

test("the other seven templates, from real facts", () => {
  const pr = prCard({ lift: "Back squat", oneRmKg: 120, date: "2026-10-16", best: { weightKg: 110, reps: 3 }, change30: 5, since: "2026-09-16", history: [100, 110, 120] });
  assert.equal(pr.eyebrow, "Personal best");
  assert.equal(pr.line, "Estimated 1RM");
  assert.deepEqual(pr.stats.map((s) => [s.value, s.label]), [["110 kg × 3", "best set"], ["+5 kg", "since Sep 16"]]);

  const st = streakCard({ days: 30, today: "2026-10-16", since: "2026-09-17", workouts: 14, meals: 86 });
  assert.equal(st.unit, "days");
  assert.equal(st.subject, "Logged every day");
  assert.equal(st.line, "Since Sep 17");
  assert.equal(st.leaves, true);

  const ac = achievementCard({ title: "Two hundred", level: "Gold", threshold: 200, points: 400, earnedAt: "2026-10-16" });
  assert.equal(ac.subject, "Two hundred · Gold");
  assert.equal(ac.line, "Gold tier reached");
  assert.equal(ac.vis?.kind, "badge");
  assert.deepEqual(ac.stats.map((s) => s.value), ["+400", "Gold"]);

  const steps = stepsCard({ date: "2026-10-16", steps: 11204, goal: 10000, distanceM: 8100, activeMin: 94 });
  assert.equal(steps.subject, "steps · goal 10,000");
  assert.deepEqual(steps.stats.map((s) => s.value), ["8.1 km", "94 min"]);
  assert.equal(stepsCard({ date: "2026-10-16", steps: 11204, goal: 10000, distanceM: null, activeMin: null }).stats.length, 0);

  const sl = sleepCard({ date: "2026-10-15", asleepMin: 462, deepMin: 96, remMin: 108, score: 96, times: "10:58 PM to 6:52 AM" });
  assert.equal(sl.line, "10:58 PM to 6:52 AM");
  assert.equal(sl.big, "7 h 42");
  assert.deepEqual(sl.stats.map((s) => s.value), ["1 h 36", "1 h 48"]);

  const wa = waterCard({ date: "2026-10-16", ml: 2500, goalMl: 2500, drinks: 10, unit: "ml" });
  assert.equal(wa.big, "2.5");
  assert.equal(wa.unit, "L");
  assert.equal(wa.subject, "Daily goal 2.5 L");
  assert.deepEqual(waterAmount(2500, "floz"), { big: "85", unit: "fl oz" });

  const fo = foodCard({ date: "2026-10-16", kcal: 1980, goalKcal: 2100, protein: 142, carbs: 210, fat: 62 });
  assert.equal(fo.subject, "of a 2,100 goal");
  assert.deepEqual(macroShares(142, 210, 62), [29, 43, 28]);
  assert.equal(fo.vis?.kind, "macro");
  assert.deepEqual(fo.stats.map((s) => s.value), ["142 g", "210 g", "62 g"]);
});

test("a one-off achievement puts its points in the hero", () => {
  const a = achievementCard({ title: "Dawn to dusk", level: null, threshold: 1, points: 50, earnedAt: "2026-10-21" });
  assert.equal(a.big, "+50");
  assert.equal(a.unit, "points");
  assert.equal(a.stats.length, 0);
  assert.equal(a.line, "");
});
