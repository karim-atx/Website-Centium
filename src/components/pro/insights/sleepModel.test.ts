// Release 3 · W9 sleep charts arithmetic (sleepModel.ts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { asleepByDay, bedtimeAxis, bedtimeByBucket, bedtimeLine, hypnogramLine, hypnogramNight, hypnogramOf, nightMinute, nightStats, stagesByBucket, stagesLine } from "./sleepModel";
import type { SleepNight } from "./sleepModel";

// Local timestamps (no zone): parsed in the device's own time, as the charts do.
const night = (over: Partial<SleepNight>): SleepNight => ({
  id: "n",
  date: "2026-10-08",
  bedStart: null,
  wakeEnd: null,
  asleepMin: null,
  inBedMin: null,
  deepMin: null,
  remMin: null,
  lightMin: null,
  awakeMin: null,
  segments: [],
  ...over,
});
const seg = (stage: "awake" | "light" | "deep" | "rem", s: string, e: string) => ({ stage, startsAt: s, endsAt: e });
const hm = (m: number) => `${Math.round(m)}m`;

describe("nightStats", () => {
  it("prefers the stage columns and asleep_min", () => {
    const n = nightStats(night({ deepMin: 54, remMin: 72, lightMin: 264, awakeMin: 42, asleepMin: 390, bedStart: "2026-10-08T23:50:00", wakeEnd: "2026-10-09T06:30:00" }));
    assert.deepEqual([n.deep, n.rem, n.light, n.awake, n.asleep], [54, 72, 264, 42, 390]);
    assert.equal(n.hasStages, true);
    assert.equal(n.bed, 23 * 60 + 50);
    assert.equal(n.wake, 23 * 60 + 50 + 400);
  });
  it("sums the timeline when the columns are empty, and takes times from it", () => {
    const n = nightStats(
      night({
        segments: [seg("light", "2026-10-09T00:20:00", "2026-10-09T01:00:00"), seg("deep", "2026-10-09T01:00:00", "2026-10-09T02:00:00"), seg("rem", "2026-10-09T02:00:00", "2026-10-09T02:30:00"), seg("awake", "2026-10-09T02:30:00", "2026-10-09T02:40:00")],
      })
    );
    assert.deepEqual([n.deep, n.rem, n.light, n.awake, n.asleep], [60, 30, 40, 10, 130]);
    assert.equal(n.bed, 20 + 1440, "after midnight counts as the night before");
    assert.equal(n.wake, 20 + 1440 + 140);
  });
  it("has no stages for a duration-only night", () => {
    const n = nightStats(night({ asleepMin: 420 }));
    assert.equal(n.hasStages, false);
    assert.equal(n.asleep, 420);
    assert.equal(n.bed, null);
  });
});

describe("buckets", () => {
  const a = nightStats(night({ date: "2026-10-08", deepMin: 60, remMin: 60, lightMin: 240, awakeMin: 20, bedStart: "2026-10-08T23:00:00", wakeEnd: "2026-10-09T07:00:00" }));
  const b = nightStats(night({ date: "2026-10-09", deepMin: 40, remMin: 80, lightMin: 200, awakeMin: 40, bedStart: "2026-10-10T00:00:00", wakeEnd: "2026-10-10T07:00:00" }));
  it("averages stage minutes per bucket and leaves empty buckets null", () => {
    const r = stagesByBucket([{ start: "2026-10-08", end: "2026-10-09" }, { start: "2026-10-10", end: "2026-10-10" }], [a, b]);
    assert.deepEqual(r[0], { deep: 50, rem: 70, light: 220, awake: 30, asleep: 340, n: 2 });
    assert.equal(r[1], null);
  });
  it("averages bed and wake on the night axis", () => {
    const r = bedtimeByBucket([{ start: "2026-10-08", end: "2026-10-09" }], [a, b]);
    assert.deepEqual(r[0], { bed: (1380 + 1440) / 2, wake: (1860 + 1860) / 2, n: 2 });
  });
});

describe("helpers", () => {
  it("nightMinute moves morning times past midnight", () => {
    assert.equal(nightMinute(30), 1470);
    assert.equal(nightMinute(1380), 1380);
  });
  it("widens the 9 PM to 9 AM axis by 3-hour steps", () => {
    assert.deepEqual(bedtimeAxis([{ bed: 1380, wake: 1860 }]), { from: 1260, to: 1980 });
    assert.deepEqual(bedtimeAxis([{ bed: 1230, wake: 2050 }]), { from: 1080, to: 2160 });
  });
  it("asleepByDay prefers sleep_details over the duration rows", () => {
    const m = asleepByDay([nightStats(night({ date: "2026-10-08", asleepMin: 400 }))], [{ day: "2026-10-08", value: 7 }, { day: "2026-10-07", value: 6.5 }]);
    assert.equal(m.get("2026-10-08"), 400);
    assert.equal(m.get("2026-10-07"), 390);
  });
  it("bedtimeLine needs two nights", () => {
    assert.equal(bedtimeLine([1400]), null);
    assert.equal(bedtimeLine([1390, 1480, 1420]), "Bedtime varies by 90 minutes.");
  });
  it("stagesLine compares deep sleep by bedtime, else gives the averages", () => {
    const mk = (date: string, bed: string, deep: number) => nightStats(night({ date, deepMin: deep, remMin: 60, lightMin: 200, bedStart: bed, wakeEnd: `${date.slice(0, 8)}${String(Number(date.slice(8)) + 1).padStart(2, "0")}T07:00:00` }));
    const late = [mk("2026-10-05", "2026-10-06T00:30:00", 40), mk("2026-10-06", "2026-10-07T00:20:00", 45)];
    const early = [mk("2026-10-07", "2026-10-07T23:00:00", 70), mk("2026-10-08", "2026-10-08T22:50:00", 80)];
    assert.equal(stagesLine([...late, ...early], hm), "Deep sleep is shortest on the nights with a bedtime after midnight.");
    assert.equal(stagesLine(early, hm), "Deep 75m and REM 60m a night on average.");
    assert.equal(stagesLine([], hm), null);
  });
});

describe("hypnogram", () => {
  const segs = [
    seg("awake", "2026-10-08T23:50:00", "2026-10-09T00:02:00"),
    seg("light", "2026-10-09T00:02:00", "2026-10-09T00:25:00"),
    seg("deep", "2026-10-09T00:25:00", "2026-10-09T01:10:00"),
    seg("awake", "2026-10-09T03:00:00", "2026-10-09T03:10:00"),
    seg("deep", "2026-10-09T04:00:00", "2026-10-09T04:30:00"),
    seg("awake", "2026-10-09T05:00:00", "2026-10-09T05:05:00"),
    seg("light", "2026-10-09T05:05:00", "2026-10-09T06:30:00"),
  ];
  it("places blocks on the levels in minutes from the first start", () => {
    const h = hypnogramOf(segs);
    assert.ok(h);
    assert.equal(h.total, 400);
    assert.deepEqual(h.blocks[2], { level: 3, stage: "deep", from: 35, to: 80 });
    assert.equal(h.blocks[0].level, 0);
  });
  it("counts wake-ups inside the night and late deep blocks", () => {
    assert.equal(hypnogramLine(hypnogramOf(segs)), "Woke twice; only one deep block in the second half of the night.");
    assert.equal(hypnogramLine(null), null);
  });
  it("picks the latest night with a timeline in the bucket, else overall", () => {
    const a = nightStats(night({ date: "2026-10-07", segments: segs }));
    const b = nightStats(night({ date: "2026-10-08", segments: segs }));
    const c = nightStats(night({ date: "2026-10-09", asleepMin: 400 }));
    assert.equal(hypnogramNight([a, b, c], { start: "2026-10-07", end: "2026-10-07" })?.date, "2026-10-07");
    assert.equal(hypnogramNight([a, b, c], { start: "2026-10-09", end: "2026-10-09" })?.date, "2026-10-08");
    assert.equal(hypnogramNight([c], null), null);
  });
});
