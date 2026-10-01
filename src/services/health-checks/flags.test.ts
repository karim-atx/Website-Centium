import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { BloodMarker } from "../../types/index.ts";
import { bloodPressureFlag, haematocritFraction, labFlag } from "./flags.ts";
import { checkInDue, checkInEveryDays, lastChecked, planRowsFor } from "./plan.ts";
import { PLAN } from "./guidance.ts";

const m = (key: string | null, value: number, low: number | null, high: number | null, extra: Partial<BloodMarker> = {}): BloodMarker => ({
  id: "x",
  name: key ?? "Other",
  value,
  unit: key === "haematocrit" ? "%" : "U/L",
  range: "",
  status: null,
  history: [{ date: "2026-09-20", value }],
  markerKey: key,
  rangeLow: low,
  rangeHigh: high,
  previous: null,
  ...extra,
});
const man = { sex: "male" as const, phase: "ongoing" as const };
const woman = { sex: "female" as const, phase: "ongoing" as const };

const bp = (level: string) => ({ level, bloodPressure: true });

test("blood pressure: existing bands map to the three levels", () => {
  assert.equal(bloodPressureFlag({ systolic: 115, diastolic: 75 }), null);
  assert.deepEqual(bloodPressureFlag({ systolic: 125, diastolic: 75 }), bp("discuss"));
  assert.deepEqual(bloodPressureFlag({ systolic: 132, diastolic: 82 }), bp("discuss"));
  assert.deepEqual(bloodPressureFlag({ systolic: 140, diastolic: 85 }), bp("soon"));
  assert.deepEqual(bloodPressureFlag({ systolic: 180, diastolic: 120 }), bp("soon"));
  assert.deepEqual(bloodPressureFlag({ systolic: 181, diastolic: 100 }), bp("urgent"));
  assert.deepEqual(bloodPressureFlag({ systolic: 150, diastolic: 121 }), bp("urgent"));
});

test("haematocrit: fixed thresholds for men and women; otherwise the report's range", () => {
  assert.equal(haematocritFraction(52, "%"), 0.52);
  assert.equal(haematocritFraction(0.53, "L/L"), 0.53);
  assert.equal(labFlag(m("haematocrit", 48, 40, 50), man), null);
  assert.deepEqual(labFlag(m("haematocrit", 52, 40, 50), man), { level: "discuss" });
  assert.deepEqual(labFlag(m("haematocrit", 53, 40, 50), man), { level: "soon", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 61, 40, 50), man), { level: "urgent", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 49, 36, 46), woman), { level: "soon", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 0.57, 0.36, 0.46, { unit: "L/L" }), woman), { level: "urgent", haematocrit: true });
  // no fixed threshold when sex is not male or female: the report's range only
  assert.deepEqual(labFlag(m("haematocrit", 70, 40, 50), { ...man, sex: "other" }), { level: "discuss" });
  assert.equal(labFlag(m("haematocrit", 70, null, null), { ...man, sex: "other" }), null);
});

test("ALT/AST: outside the report's range = discuss, 3x its upper limit or more = soon", () => {
  assert.equal(labFlag(m("alt", 40, 0, 41), man), null);
  assert.deepEqual(labFlag(m("alt", 42, 0, 41), man), { level: "discuss" });
  assert.deepEqual(labFlag(m("ast", 123, 0, 41), man), { level: "soon" });
  assert.equal(labFlag(m("alt", 500, null, null), man), null);
});

test("any other result outside the report's printed range = discuss, linked or not", () => {
  assert.deepEqual(labFlag(m("creatinine", 1.5, 0.7, 1.3), man), { level: "discuss" });
  assert.deepEqual(labFlag(m("ferritin", 10, 30, 400), man), { level: "discuss" });
  assert.deepEqual(labFlag(m(null, 999, 0, 1), man), { level: "discuss" });
  assert.equal(labFlag(m(null, 0.5, 0, 1), man), null);
  assert.equal(labFlag(m(null, 999, null, null), man), null);
});

test("the nine threshold markers never get a flag", () => {
  for (const k of ["total_cholesterol", "ldl_cholesterol", "hdl_cholesterol", "triglycerides", "egfr", "glucose", "hba1c", "vitamin_d", "psa"]) {
    assert.equal(labFlag(m(k, 999, 0, 1), man), null);
  }
});

test("hormones: outside the range = discuss; after stopping, still low on a repeat = soon", () => {
  const low = m("testosterone_total", 150, 300, 1000);
  assert.deepEqual(labFlag(low, man), { level: "discuss" });
  const stopped = { sex: "male" as const, phase: "stopped" as const };
  assert.deepEqual(labFlag(low, stopped), { level: "discuss" });
  const repeat = m("testosterone_total", 150, 300, 1000, {
    history: [{ date: "2026-07-01", value: 120 }, { date: "2026-09-20", value: 150 }],
    previous: { date: "2026-07-01", value: 120, unit: "ng/dL", low: 300, high: 1000 },
  });
  assert.deepEqual(labFlag(repeat, stopped), { level: "soon" });
  assert.deepEqual(labFlag(repeat, man), { level: "discuss" });
  assert.equal(labFlag(m("testosterone_total", 400, 300, 1000, { previous: { date: "2026-07-01", value: 120, unit: "ng/dL", low: 300, high: 1000 } }), stopped), null);
});

test("plan rows by phase and sex; after stopping, the repeat and PSA timings", () => {
  const ids = (p: Parameters<typeof planRowsFor>[0], s: string) => planRowsFor(p, s).map((r) => r.id);
  assert.deepEqual(ids("ongoing", "male"), ["bp", "fbc", "lipids", "liver", "kidney", "psa", "mood"]);
  assert.deepEqual(ids("stopped", "female"), ["bp", "fbc", "lipids", "liver", "kidney", "hormones", "pregnancy", "mood"]);
  assert.deepEqual(ids("stopped", "male"), ["bp", "fbc", "lipids", "liver", "kidney", "hormones", "psa", "mood"]);
  const stoppedTimings = Object.fromEntries(planRowsFor("stopped", "male").filter((r) => r.stoppedTiming).map((r) => [r.id, r.stoppedTiming]));
  assert.deepEqual(stoppedTimings, {
    lipids: "One repeat about 3 months after stopping",
    liver: "One repeat about 3 months after stopping",
    kidney: "One repeat about 3 months after stopping",
    psa: "As your doctor advises",
  });
  assert.equal(planRowsFor(null, "male").length, PLAN.length - 1);
});

test("last checked comes from the newest matching record", () => {
  const fbc = PLAN.find((r) => r.id === "fbc")!;
  const markers = [m("haematocrit", 45, 40, 50, { history: [{ date: "2026-08-01", value: 45 }] }), m("alt", 30, 0, 41)];
  assert.equal(lastChecked(fbc, { latestBpDay: null, markers, lastCheckIn: null }), "2026-08-01");
  assert.equal(lastChecked(PLAN.find((r) => r.id === "kidney")!, { latestBpDay: null, markers, lastCheckIn: null }), null);
  assert.equal(lastChecked(PLAN[0], { latestBpDay: "2026-09-30", markers, lastCheckIn: null }), "2026-09-30");
});

test("check-ins: every 2 weeks, weekly for 3 months after stopping", () => {
  assert.equal(checkInEveryDays("ongoing", null, "2026-10-02"), 14);
  assert.equal(checkInEveryDays("stopped", "2026-08-01", "2026-10-02"), 7);
  assert.equal(checkInEveryDays("stopped", "2026-06-01", "2026-10-02"), 14);
  assert.equal(checkInDue(null, "ongoing", null, "2026-10-02"), true);
  assert.equal(checkInDue("2026-09-25", "ongoing", null, "2026-10-02"), false);
  assert.equal(checkInDue("2026-09-18", "ongoing", null, "2026-10-02"), true);
  assert.equal(checkInDue("2026-09-25", "stopped", "2026-09-01", "2026-10-02"), true);
});
