// Release 3 · W5 Insights formulas (HANDOVER section i).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aboveGoalLine,
  addDays,
  bestWorst,
  bucketsFor,
  calorieBand,
  changeFlag,
  commonWeekday,
  ewma,
  fewestMealsLine,
  heartByDay,
  hm,
  inBandLine,
  macroGrams,
  macroSplit,
  markerPattern,
  markerStatus,
  mealClockOf,
  meanByBucket,
  onPlanLine,
  rangePosition,
  streakOf,
  topFoods,
  trendPerWeek,
  weightTrend,
} from "./insightsModel";

const expect = (actual: unknown) => ({
  toBe: (v: unknown) => assert.equal(actual, v),
  toEqual: (v: unknown) => assert.deepEqual(actual, v),
  toBeNull: () => assert.equal(actual, null),
  toHaveLength: (n: number) => assert.equal((actual as unknown[]).length, n),
  toBeCloseTo: (v: number) => assert.ok(Math.abs((actual as number) - v) < 1e-6, `${String(actual)} is close to ${v}`),
});

describe("ranges and buckets", () => {
  it("W and M are one bucket per day ending today", () => {
    const w = bucketsFor("W", "2026-10-15");
    expect(w).toHaveLength(7);
    expect(w[0].start).toBe("2026-10-09");
    expect(w[6].end).toBe("2026-10-15");
    expect(bucketsFor("M", "2026-10-15")).toHaveLength(30);
  });
  it("the ghost is the previous period", () => {
    const g = bucketsFor("W", "2026-10-15", 1);
    expect(g[6].end).toBe("2026-10-08");
  });
  it("3M buckets are Monday weeks clipped to the range", () => {
    const b = bucketsFor("3M", "2026-10-15");
    expect(b[b.length - 1]).toEqual({ start: "2026-10-12", end: "2026-10-15" });
    expect(b[0].start).toBe(addDays("2026-10-15", -90));
  });
  it("Y buckets are months", () => {
    const b = bucketsFor("Y", "2026-10-15");
    expect(b[b.length - 1]).toEqual({ start: "2026-10-01", end: "2026-10-15" });
    expect(b.length).toBe(13);
  });
  it("means skip empty buckets as null", () => {
    const b = bucketsFor("W", "2026-10-15");
    const m = meanByBucket(b, [
      { day: "2026-10-15", value: 4 },
      { day: "2026-10-15", value: 6 },
    ]);
    expect(m[6]).toBe(5);
    expect(m[0]).toBeNull();
  });
});

describe("weight trend (alpha 0.25)", () => {
  it("seeds with the first value", () => {
    expect(ewma([80, 84])).toEqual([80, 81]);
  });
  it("draws no trend under 3 weigh-ins", () => {
    expect(weightTrend([{ day: "2026-10-01", kg: 80 }, { day: "2026-10-02", kg: 81 }])).toBeNull();
    expect(weightTrend([{ day: "2026-10-01", kg: 80 }, { day: "2026-10-02", kg: 84 }, { day: "2026-10-03", kg: 84 }])).toEqual([80, 81, 81.75]);
  });
  it("rate per week needs a week of span", () => {
    const w = [
      { day: "2026-10-01", kg: 84 },
      { day: "2026-10-08", kg: 83 },
      { day: "2026-10-15", kg: 82 },
    ];
    const t = weightTrend(w);
    expect(trendPerWeek(w, t)).toBeCloseTo(((t![2] - t![0]) / 14) * 7);
    expect(trendPerWeek(w.slice(0, 1), t)).toBeNull();
  });
});

describe("leaf streak", () => {
  const today = "2026-10-15"; // a Thursday
  it("counts back from today, or from yesterday while today is open", () => {
    const done = new Set(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(streakOf(done, today).current).toBe(3);
    done.add(today);
    expect(streakOf(done, today).current).toBe(4);
  });
  it("a missed day breaks it; best is kept", () => {
    const done = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-14"]);
    const s = streakOf(done, today);
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });
  it("the grid is 28 days, Monday first, ending this week", () => {
    const s = streakOf(new Set([today]), today);
    expect(s.days).toHaveLength(28);
    // Thursday of the last week is today (index 21 + 3).
    expect(s.days[24]).toBe(2);
    expect(s.days[25]).toBeNull();
    expect(s.days[23]).toBe(0);
  });
});

describe("meal timing clock", () => {
  const e = (day: string, h: number, meal: "breakfast" | "lunch" | "snack" | "dinner", kcal: number) => ({ day, minute: h * 60, meal, kcal });
  it("is early data under 3 days", () => {
    expect(mealClockOf([e("2026-10-01", 8, "breakfast", 300), e("2026-10-02", 8, "breakfast", 300)]).early).toBe(true);
  });
  it("window, fast, shares and late entries", () => {
    const c = mealClockOf([
      e("2026-10-01", 8, "breakfast", 400),
      e("2026-10-01", 20, "dinner", 600),
      e("2026-10-02", 8, "breakfast", 400),
      e("2026-10-02", 20, "dinner", 600),
      e("2026-10-03", 8, "breakfast", 400),
      e("2026-10-03", 22.5, "snack", 200),
    ]);
    expect(c.early).toBe(false);
    expect(c.windowStart).toBe(480);
    expect(c.windowMinutes).toBe((720 + 720 + 870) / 3);
    expect(c.fastMinutes).toBe(1440 - c.windowMinutes);
    expect(c.late).toBe(1);
    expect(c.afterSixShare).toBeCloseTo(1400 / 2600);
    expect(c.meals.find((m) => m.meal === "dinner")!.share).toBeCloseTo(1200 / 2600);
  });
  it("formats h and m", () => {
    expect(hm(850)).toBe("14h 10m");
    expect(hm(42)).toBe("42m");
  });
});

describe("macros", () => {
  it("split sums to 100", () => {
    const s = macroSplit(100, 250, 70)!;
    expect(s[0] + s[1] + s[2]).toBe(100);
    expect(macroSplit(0, 0, 0)).toBeNull();
  });
  it("grams from kcal and split", () => {
    expect(macroGrams(1800, [20, 50, 30])).toEqual([90, 225, 60]);
  });
  it("best and worst days", () => {
    const t: [number, number, number] = [90, 225, 60];
    const r = bestWorst(
      [
        { day: "2026-10-01", kcal: 1800, p: 90, c: 225, f: 60, meals: 3 },
        { day: "2026-10-02", kcal: 2600, p: 50, c: 300, f: 110, meals: 3 },
        { day: "2026-10-03", kcal: 1900, p: 80, c: 240, f: 65, meals: 3 },
      ],
      t
    )!;
    expect(r.best.day).toBe("2026-10-01");
    expect(r.bestOnTarget).toBe(true);
    expect(r.worst.day).toBe("2026-10-02");
  });
  it("calorie band", () => {
    expect(calorieBand(1900)).toEqual({ low: 1800, high: 2000 });
  });
  it("top foods", () => {
    const t = topFoods([
      { name: "Chicken", p: 40, c: 0, f: 5 },
      { name: "Cheese", p: 10, c: 1, f: 30 },
    ]);
    expect(t.protein!.name).toBe("Chicken");
    expect(t.fat!.name).toBe("Cheese");
  });
});

describe("heart rate", () => {
  it("resting from rest readings, else the wearable day", () => {
    const m = heartByDay(
      [
        { day: "a", bpm: 60, rest: true },
        { day: "a", bpm: 120, rest: false },
      ],
      [
        { day: "a", restingBpm: 58 },
        { day: "b", restingBpm: 62 },
      ]
    );
    expect(m.get("a")).toEqual({ resting: 60, min: 60, max: 120 });
    expect(m.get("b")!.resting).toBe(62);
  });
});

describe("biomarkers", () => {
  it("status: out, borderline within 10% of a limit, in", () => {
    expect(markerStatus(3.1, 0, 3)).toBe("out");
    expect(markerStatus(2.8, 0, 3)).toBe("border");
    expect(markerStatus(2, 0, 3)).toBe("in");
    expect(markerStatus(4, 3.9, 5.5)).toBe("border");
    expect(markerStatus(4, null, null)).toBe("none");
  });
  it("patterns", () => {
    expect(markerPattern([{ value: 1 }], 0, 3)).toBe("one");
    expect(markerPattern([{ value: 4.4 }, { value: 4.0 }, { value: 2.8 }], 0, 3)).toBe("returning");
    expect(markerPattern([{ value: 5.4 }, { value: 5.8 }, { value: 6.1 }], 3.9, 5.5)).toBe("rising_out");
    expect(markerPattern([{ value: 1.2 }, { value: 1.1 }, { value: 1.2 }], 1, null)).toBe("stable");
  });
  it("change flag over 50%", () => {
    expect(changeFlag([{ value: 2 }, { value: 3.1 }])).toBe(true);
    expect(changeFlag([{ value: 2 }, { value: 2.9 }])).toBe(false);
  });
  it("position in range", () => {
    expect(rangePosition(1.5, 0, 3)).toBe(50);
    expect(rangePosition(3, 1, 3)).toBe(100);
  });
});

describe("insight lines (facts only)", () => {
  it("common weekday needs 2 and half", () => {
    expect(commonWeekday(["2026-10-03", "2026-10-10"])).toBe("Saturday");
    expect(commonWeekday(["2026-10-03"])).toBeNull();
    expect(commonWeekday(["2026-10-03", "2026-10-05", "2026-10-06"])).toBeNull();
  });
  it("above goal with dips", () => {
    expect(
      aboveGoalLine(
        [
          { day: "2026-10-03", value: 3000 },
          { day: "2026-10-10", value: 3000 },
          { day: "2026-10-11", value: 9000 },
        ],
        7000
      )
    ).toBe("1 of 3 days above goal. Dips fall on Saturdays.");
  });
  it("on plan and in band", () => {
    const band = { low: 1800, high: 2000 };
    const days = [
      { day: "2026-10-03", kcal: 2600 },
      { day: "2026-10-10", kcal: 2700 },
      { day: "2026-10-07", kcal: 1900 },
    ];
    expect(onPlanLine(days, band)).toBe("On plan 1 of 3 logged days. 2 misses, most on Saturdays.");
    expect(inBandLine(days, band)).toBe("1 of 3 days in the band; Saturdays run 700 to 800 over.");
  });
  it("fewest meals needs two weeks", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({ day: addDays("2026-10-01", i), meals: i % 7 === 2 ? 1 : 3 }));
    expect(fewestMealsLine(days)).toBe("Saturdays have the fewest logged meals (1 on average).");
    expect(fewestMealsLine(days.slice(0, 7))).toBeNull();
  });
});
