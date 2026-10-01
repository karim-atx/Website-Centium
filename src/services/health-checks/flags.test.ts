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

test("blood pressure: existing bands map to the three levels", () => {
  assert.equal(bloodPressureFlag({ systolic: 115, diastolic: 75 }), null);
  assert.deepEqual(bloodPressureFlag({ systolic: 125, diastolic: 75 }), { level: "discuss" });
  assert.deepEqual(bloodPressureFlag({ systolic: 132, diastolic: 82 }), { level: "discuss" });
  assert.deepEqual(bloodPressureFlag({ systolic: 140, diastolic: 85 }), { level: "soon" });
  assert.deepEqual(bloodPressureFlag({ systolic: 180, diastolic: 120 }), { level: "soon" });
  assert.deepEqual(bloodPressureFlag({ systolic: 181, diastolic: 100 }), { level: "urgent" });
  assert.deepEqual(bloodPressureFlag({ systolic: 150, diastolic: 121 }), { level: "urgent" });
});

test("haematocrit: fixed thresholds by sex, in % or L/L, never the report range", () => {
  assert.equal(haematocritFraction(52, "%"), 0.52);
  assert.equal(haematocritFraction(0.53, "L/L"), 0.53);
  assert.equal(labFlag(m("haematocrit", 52, 40, 50), man), null);
  assert.deepEqual(labFlag(m("haematocrit", 53, 40, 50), man), { level: "soon", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 61, 40, 50), man), { level: "urgent", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 49, 36, 46), woman), { level: "soon", haematocrit: true });
  assert.deepEqual(labFlag(m("haematocrit", 0.57, 0.36, 0.46, { unit: "L/L" }), woman), { level: "urgent", haematocrit: true });
  assert.equal(labFlag(m("haematocrit", 70, 40, 50), { ...man, sex: "other" }), null);
});

test("ALT/AST: above the report's range = discuss, 3x its upper limit or more = soon", () => {
  assert.equal(labFlag(m("alt", 40, 0, 41), man), null);
  assert.deepEqual(labFlag(m("alt", 42, 0, 41), man), { level: "discuss" });
  assert.deepEqual(labFlag(m("ast", 123, 0, 41), man), { level: "soon" });
  assert.equal(labFlag(m("alt", 500, null, null), man), null);
});

test("creatinine/eGFR: outside the report's range = discuss only", () => {
  assert.deepEqual(labFlag(m("creatinine", 1.5, 0.7, 1.3), man), { level: "discuss" });
  assert.deepEqual(labFlag(m("egfr", 55, 60, null), man), { level: "discuss" });
  assert.equal(labFlag(m("egfr", 95, 60, null), man), null);
});

test("hormones: only after stopping; still low on a repeat test = soon", () => {
  const low = m("testosterone_total", 150, 300, 1000);
  assert.equal(labFlag(low, man), null);
  const stopped = { sex: "male" as const, phase: "stopped" as const };
  assert.deepEqual(labFlag(low, stopped), { level: "discuss" });
  const repeat = m("testosterone_total", 150, 300, 1000, {
    history: [{ date: "2026-07-01", value: 120 }, { date: "2026-09-20", value: 150 }],
    previous: { date: "2026-07-01", value: 120, unit: "ng/dL", low: 300, high: 1000 },
  });
  assert.deepEqual(labFlag(repeat, stopped), { level: "soon" });
  // a repeat that is back in range is only the latest result's own flag
  assert.equal(labFlag(m("testosterone_total", 400, 300, 1000, { previous: { date: "2026-07-01", value: 120, unit: "ng/dL", low: 300, high: 1000 } }), stopped), null);
});

test("lipids, PSA, HbA1c and unlinked results get no flag", () => {
  for (const k of ["ldl_cholesterol", "hdl_cholesterol", "psa", "hba1c"]) assert.equal(labFlag(m(k, 999, 0, 1), man), null);
  assert.equal(labFlag(m(null, 999, 0, 1), man), null);
});

test("plan rows by phase and sex", () => {
  const ids = (p: Parameters<typeof planRowsFor>[0], s: string) => planRowsFor(p, s).map((r) => r.id);
  assert.deepEqual(ids("ongoing", "male"), ["bp", "fbc", "lipids", "liver", "kidney", "psa", "mood"]);
  assert.deepEqual(ids("stopped", "female"), ["bp", "fbc", "lipids", "hormones", "pregnancy", "mood"]);
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
