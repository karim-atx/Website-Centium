import { strict as assert } from "node:assert";
import { test } from "node:test";
import { chipColors, kiloTick, mondayOf, pointStats, trainingFrequency, volumePoints, volumeTicks } from "./metrics";
import type { LoggedSet, WorkoutSession } from "../../types";

const set = (weightKg: number, reps: number, extra: Partial<LoggedSet> = {}) =>
  ({ weightKg, reps, completed: true, ...extra }) as LoggedSet;
const session = (id: string, date: string, volume: number, sets: LoggedSet[] = [], seconds?: number) =>
  ({
    id,
    date,
    startedAt: `${date}T10:00:00Z`,
    totalVolumeKg: volume,
    exercises: [{ name: "Leg Press", sets, enduranceResult: seconds ? { duration_seconds: seconds } : undefined }],
  }) as unknown as WorkoutSession;

test("By week sums Monday to Sunday", () => {
  assert.equal(mondayOf("2026-09-27"), "2026-09-21", "Sunday belongs to the week before");
  assert.equal(mondayOf("2026-09-28"), "2026-09-28");
  const pts = volumePoints(
    [session("a", "2026-09-22", 100), session("b", "2026-09-27", 50), session("c", "2026-09-28", 70)],
    "week"
  );
  assert.deepEqual(pts.map((p) => [p.day, p.volumeKg]), [["2026-09-21", 150], ["2026-09-28", 70]]);
  assert.equal(volumePoints([session("c", "2026-09-28", 70), session("a", "2026-09-22", 100)], "workout")[0].day, "2026-09-22");
});

test("point stats: Leg Press 140 × 10 is a 187 kg 1RM; warm-ups and skips don't count; no timed sets is null", () => {
  const st = pointStats([
    session("a", "2026-09-26", 1440, [set(140, 10), set(160, 2, { setType: "warmup" }), set(100, 8, { outcome: "skipped" }), set(120, 12)]),
  ]);
  assert.equal(Math.round(st.oneRmKg!), 187);
  assert.equal(st.maxWeightKg, 140);
  assert.equal(st.sets, 3, "the warm-up still counts toward sets; the skip doesn't");
  assert.equal(st.reps, 24);
  assert.equal(st.seconds, null);
  assert.equal(pointStats([session("b", "2026-09-26", 0, [], 600)]).seconds, 600);
});

test("training frequency: the last 8 weeks, this week last, averaged", () => {
  const f = trainingFrequency(
    [session("a", "2026-09-28", 1), session("b", "2026-09-30", 1), session("c", "2026-08-10", 1), session("d", "2026-08-09", 1)],
    "2026-09-30"
  );
  assert.equal(f.weeks.length, 8);
  assert.equal(f.weeks[7], 2);
  assert.equal(f.weeks[0], 1, "the week of Aug 10 is the eighth; Aug 9 is outside");
  assert.equal(f.perWeek, 0.4);
});

test("hero ticks and the balance chip match the frame", () => {
  assert.deepEqual(volumeTicks(2100), [0, 1000, 2000]);
  assert.deepEqual(volumeTicks(3000), [0, 1500, 3000]);
  assert.deepEqual(volumeTicks(0), [0, 1000, 2000]);
  assert.equal(kiloTick(1000), "1k");
  assert.equal(kiloTick(2500), "2.5k");
  assert.deepEqual(chipColors("#D9A441"), { background: "#F8EFDD", color: "#896930" });
});
