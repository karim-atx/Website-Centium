import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MEDITATION_KINDS,
  formatMeditationTime,
  isEmptySummary,
  meditationKind,
  sessionSeconds,
} from "./logic.ts";

const KIND = /^[a-z][a-z0-9_]{1,38}[a-z0-9]$/;

test("every kind matches the table's CHECK", () => {
  for (const k of [...Object.values(MEDITATION_KINDS), meditationKind("something-new")]) assert.match(k, KIND);
  assert.equal(meditationKind("box"), "box_breathing");
  assert.equal(meditationKind("478"), "breathing_4_7_8");
});

test("time spent, floored to whole seconds, from 10 seconds up", () => {
  const t0 = 1_000_000;
  assert.equal(sessionSeconds(t0, t0 + 9_999), null);
  assert.equal(sessionSeconds(t0, t0 + 10_000), 10);
  assert.equal(sessionSeconds(t0, t0 + 480_900), 480);
  assert.equal(sessionSeconds(t0, t0 + 5 * 3600 * 1000), 14400);
  assert.equal(sessionSeconds(t0, t0 - 5000), null);
});

test("formats from seconds, rounding like the database", () => {
  assert.equal(formatMeditationTime(0), "0 min");
  assert.equal(formatMeditationTime(45), "45 sec");
  assert.equal(formatMeditationTime(60), "1 min");
  assert.equal(formatMeditationTime(750), "13 min");
  assert.equal(formatMeditationTime(3600), "1 h");
  assert.equal(formatMeditationTime(7500), "2 h 5 min");
});

test("empty only when there is nothing at all", () => {
  const zero = { secondsToday: 0, secondsThisWeek: 0, sessionsThisWeek: 0, streakDays: 0 };
  assert.equal(isEmptySummary(zero), true);
  assert.equal(isEmptySummary({ ...zero, streakDays: 1 }), false);
  assert.equal(isEmptySummary({ ...zero, secondsThisWeek: 120, sessionsThisWeek: 1 }), false);
});
