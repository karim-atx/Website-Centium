import { test } from "node:test";
import assert from "node:assert/strict";
import { addDay, dayChunks, DAYS_MAX, HOURS_MAX, hourSamples, isSynced, parseActivityDay, parseActivityHour, parseSleepNight, parseSources, syncedActivitySource } from "./readersModel";

test("dayChunks: every piece within the reader's limit (to - from ≤ max), joined end to end", () => {
  assert.deepEqual(dayChunks("2026-01-01", "2026-01-01", HOURS_MAX), [["2026-01-01", "2026-01-01"]]);
  assert.deepEqual(dayChunks("2026-01-02", "2026-01-01", HOURS_MAX), []);
  const parts = dayChunks("2025-01-01", "2026-11-05", DAYS_MAX);
  assert.equal(parts[0][0], "2025-01-01");
  assert.equal(parts[parts.length - 1][1], "2026-11-05");
  for (let i = 0; i < parts.length; i++) {
    const [f, t] = parts[i];
    const span = (Date.parse(t) - Date.parse(f)) / 864e5;
    assert.ok(span >= 0 && span <= DAYS_MAX, `${f}..${t}`);
    if (i > 0) assert.equal(f, addDay(parts[i - 1][1], 1));
  }
  // 60 days of hours: two calls, the first exactly 31 days apart.
  const hours = dayChunks("2026-09-01", "2026-10-30", HOURS_MAX);
  assert.deepEqual(hours, [["2026-09-01", "2026-10-02"], ["2026-10-03", "2026-10-30"]]);
});

test("addDay crosses months and leap days on the calendar, not the clock", () => {
  assert.equal(addDay("2028-02-28", 1), "2028-02-29");
  assert.equal(addDay("2026-12-31", 1), "2027-01-01");
  assert.equal(addDay("2026-03-01", -1), "2026-02-28");
});

test("parseSources keeps known sources only", () => {
  assert.deepEqual(parseSources({ steps: "manual", resting_bpm: "apple_health", x: "fitbit", y: 3 }), { steps: "manual", resting_bpm: "apple_health" });
  assert.deepEqual(parseSources(null), {});
  assert.deepEqual(parseSources(["manual"]), {});
});

test("parseActivityDay: each field as sent; kcal null stays null (recovery-sensitive mode)", () => {
  const d = parseActivityDay({ local_date: "2026-11-05", steps: 8123, distance_m: null, active_minutes: 41, floors: null, resting_bpm: 58, kcal_burned: null, sources: { steps: "android_health", resting_bpm: "manual" } });
  assert.deepEqual(d, { day: "2026-11-05", steps: 8123, distanceM: null, activeMinutes: 41, floors: null, restingBpm: 58, kcalBurned: null, sources: { steps: "android_health", resting_bpm: "manual" } });
});

test("parseActivityHour carries the hour's heart rate", () => {
  const h = parseActivityHour({ local_date: "2026-11-05", hour: 9, steps: 900, kcal: 70, hr_min: 61, hr_avg: 74, hr_max: 102, sources: { hr_avg: "android_health" } });
  assert.equal(h.hour, 9);
  assert.equal(h.hrMin, 61);
  assert.equal(h.hrAvg, 74);
  assert.equal(h.hrMax, 102);
  assert.equal(h.sources.hr_avg, "android_health");
});

test("parseSleepNight: segments in order, unknown stages dropped, other_sources counted", () => {
  const n = parseSleepNight({
    id: "n1",
    sleep_date: "2026-11-05",
    source: "android_health",
    bed_start: "2026-11-04T22:40:00Z",
    wake_end: "2026-11-05T06:10:00Z",
    asleep_min: 410,
    in_bed_min: 450,
    score: "82",
    rem_min: 90,
    deep_min: 70,
    light_min: 250,
    awake_min: 40,
    summary: null,
    segments: [
      { stage: "deep", starts_at: "2026-11-04T23:30:00Z", ends_at: "2026-11-05T00:10:00Z" },
      { stage: "light", starts_at: "2026-11-04T22:50:00Z", ends_at: "2026-11-04T23:30:00Z" },
      { stage: "snoring", starts_at: "2026-11-05T01:00:00Z", ends_at: "2026-11-05T01:05:00Z" },
    ],
    other_sources: 1,
  });
  assert.equal(n.score, 82);
  assert.equal(n.source, "android_health");
  assert.deepEqual(n.segments.map((s) => s.stage), ["light", "deep"]);
  assert.equal(n.otherSources, 1);
});

test("hourSamples: hand-logged readings, then each synced hour's min, max and average, oldest first", () => {
  const day = "2026-11-05";
  const at = (h: number, m = 0) => new Date(2026, 10, 5, h, m).toISOString();
  const hour = (h: number, min: number | null, avg: number | null, max: number | null) => ({ day, hour: h, steps: null, kcal: null, hrMin: min, hrAvg: avg, hrMax: max, sources: {} });
  const v = hourSamples([{ at: at(7, 10), value: 66 }], [hour(9, 60, 75, 110), hour(8, null, 70, null), hour(10, null, null, null)]);
  assert.deepEqual(v, [66, 70, 70, 70, 60, 110, 75]);
  // The day's range and its last value.
  assert.equal(Math.min(...v), 60);
  assert.equal(Math.max(...v), 110);
  assert.equal(v[v.length - 1], 75);
});

test("isSynced: anything but manual", () => {
  assert.equal(isSynced("manual"), false);
  assert.equal(isSynced(null), false);
  assert.equal(isSynced("android_health"), true);
});

test("syncedActivitySource: the page's own figure decides, from the day's row else its hours", () => {
  const days = [
    { day: "2026-11-01", sources: { steps: "android_health" as const, resting_bpm: "manual" as const } },
    { day: "2026-11-02", sources: { steps: "manual" as const } },
  ];
  const hours = [
    { day: "2026-11-02", sources: { hr_avg: "android_health" as const, kcal: "apple_health" as const } },
    { day: "2026-11-03", sources: { steps: "manual" as const } },
  ];
  assert.equal(syncedActivitySource("steps", "2026-11-01", days, hours), "android_health");
  assert.equal(syncedActivitySource("heart_rate", "2026-11-01", days, hours), null);
  assert.equal(syncedActivitySource("steps", "2026-11-02", days, hours), null);
  assert.equal(syncedActivitySource("heart_rate", "2026-11-02", days, hours), "android_health");
  assert.equal(syncedActivitySource("calories", "2026-11-02", days, hours), "apple_health");
  assert.equal(syncedActivitySource("steps", "2026-11-03", days, hours), null);
  // Recovery-sensitive mode leaves kcal out of `sources`: nothing to offer.
  assert.equal(syncedActivitySource("calories", "2026-11-01", days, hours), null);
  assert.equal(syncedActivitySource("steps", "2026-11-04", days, hours), null);
});
