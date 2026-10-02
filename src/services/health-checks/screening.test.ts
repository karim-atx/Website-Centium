import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bmiOf, screeningLastChecked, screeningRows, type ScreeningProfile } from "./screening.ts";
import {
  haemoglobinGdl,
  pregnancyBloodPressureFlag,
  pregnancyChecksDone,
  pregnancyComingUp,
  pregnancyHaemoglobinFlag,
} from "../pregnancy/checks.ts";
import type { BloodMarker } from "../../types/index.ts";

const ids = (p: Partial<ScreeningProfile>) =>
  screeningRows({ age: undefined, sex: undefined, bmi: null, recoverySensitive: false, ...p }).map((r) => r.id);

test("who sees which check, by age, sex and BMI", () => {
  assert.deepEqual(ids({ age: 16, sex: "female" }), ["hiv"]);
  assert.deepEqual(ids({ age: 14, sex: "male" }), []);
  assert.deepEqual(ids({ age: 25, sex: "female", bmi: 22 }), ["bp", "hepatitis_c", "hiv", "cervical"]);
  assert.deepEqual(ids({ age: 50, sex: "female", bmi: 27 }), ["bp", "glucose", "cholesterol", "hepatitis_c", "hiv", "bowel", "mammogram", "cervical"]);
  assert.deepEqual(ids({ age: 60, sex: "male", bmi: 24 }), ["bp", "cholesterol", "hepatitis_c", "hiv", "bowel", "psa"]);
  assert.deepEqual(ids({ age: 72, sex: "male", bmi: 30 }), ["bp", "cholesterol", "hepatitis_c", "bowel"]);
  assert.deepEqual(ids({ age: 80, sex: "female" }), ["bp"]);
  // sex-specific checks need sex on file; age checks need an age
  assert.deepEqual(ids({ age: 50, sex: "other", bmi: 20 }), ["bp", "cholesterol", "hepatitis_c", "hiv", "bowel"]);
  assert.deepEqual(ids({ sex: "female", bmi: 30 }), []);
  // the glucose check needs a BMI of 25 or more, and an age of 35–70
  assert.ok(!ids({ age: 50, sex: "male", bmi: null }).includes("glucose"));
  assert.ok(!ids({ age: 34, sex: "male", bmi: 30 }).includes("glucose"));
});

test("cervical interval by age; glucose reason never mentions BMI in recovery mode", () => {
  const r = (age: number) => screeningRows({ age, sex: "female", bmi: 20, recoverySensitive: false }).find((x) => x.id === "cervical")!;
  assert.equal(r(25).frequency, "every 3 years");
  assert.equal(r(40).frequency, "every 3–5 years depending on test");
  const g = (recoverySensitive: boolean) =>
    screeningRows({ age: 50, sex: "female", bmi: 28, recoverySensitive }).find((x) => x.id === "glucose")!.who;
  assert.equal(g(false), "suggested because you're 35–70 with a BMI of 25 or more");
  assert.equal(g(true), "suggested for your age");
  assert.ok(!/bmi/i.test(g(true)));
  assert.ok(Math.abs(bmiOf(170, 72.25)! - 25) < 0.01);
});

const m = (key: string, dates: string[]): BloodMarker => ({
  id: key,
  name: key,
  value: 10,
  unit: "g/dL",
  range: "",
  status: null,
  history: dates.map((date) => ({ date, value: 10 })),
  markerKey: key,
});

test("last checked: newest matching result; nothing said for checks the app holds no records of", () => {
  const rows = screeningRows({ age: 50, sex: "male", bmi: 28, recoverySensitive: false });
  const data = { latestBpDay: "2026-09-30", markers: [m("hba1c", ["2025-01-02"]), m("glucose", ["2026-03-04"])] };
  const by = (id: string) => screeningLastChecked(rows.find((r) => r.id === id)!, data);
  assert.equal(by("bp"), "2026-09-30");
  assert.equal(by("glucose"), "2026-03-04");
  assert.equal(by("cholesterol"), null);
  assert.equal(by("hepatitis_c"), undefined);
});

// lmp 2026-04-09: week 0 starts then; 2026-06-18 is week 10, 2026-10-08 week 26.
const preg = { lmpDate: "2026-04-09", dueDate: null };

test("pregnancy schedule: done from matching results, and what is coming up", () => {
  assert.deepEqual([...pregnancyChecksDone([], preg)], []);
  const done = pregnancyChecksDone([m("haemoglobin", ["2026-06-18"]), m("glucose", ["2026-09-24"])], preg);
  assert.deepEqual([...done].sort(), ["first", "glucose"]);
  assert.ok(pregnancyChecksDone([m("haemoglobin", ["2026-10-08"])], preg).has("week28"));
  assert.equal(pregnancyComingUp(10, new Set())?.id, "first");
  assert.equal(pregnancyComingUp(26, new Set(["first"]))?.id, "glucose");
  assert.equal(pregnancyComingUp(26, new Set(["first", "glucose"]))?.id, "week28");
  assert.equal(pregnancyComingUp(30, new Set()), null);
});

test("pregnancy blood pressure: 140/90 same day, 160/110 urgent, below that nothing", () => {
  assert.equal(pregnancyBloodPressureFlag(138, 88), null);
  assert.equal(pregnancyBloodPressureFlag(140, 80)?.level, "soon");
  assert.equal(pregnancyBloodPressureFlag(130, 90)?.label, "Same day");
  assert.equal(pregnancyBloodPressureFlag(159, 109)?.level, "soon");
  assert.equal(pregnancyBloodPressureFlag(160, 100)?.level, "urgent");
  assert.equal(pregnancyBloodPressureFlag(150, 110)?.text, "This reading is very high for pregnancy. Contact your maternity team now; if you can't, go to emergency care.");
});

test("pregnancy haemoglobin: 11.0 to week 13, 10.5 from week 14, 10.0 after birth", () => {
  const active = { active: preg, afterBirth: null };
  assert.equal(pregnancyHaemoglobinFlag(10.8, "2026-06-18", active)?.level, "discuss");
  assert.equal(pregnancyHaemoglobinFlag(11.0, "2026-06-18", active), null);
  assert.equal(pregnancyHaemoglobinFlag(10.8, "2026-10-08", active), null);
  assert.equal(pregnancyHaemoglobinFlag(10.4, "2026-10-08", active)?.level, "discuss");
  const after = { active: null, afterBirth: { endedOn: "2026-09-01", until: "2026-11-24" } };
  assert.equal(pregnancyHaemoglobinFlag(10.2, "2026-09-20", after), null);
  assert.equal(pregnancyHaemoglobinFlag(9.8, "2026-09-20", after)?.text, "Your haemoglobin is below the usual level for this stage of pregnancy. Discuss it with your maternity team.");
  // before the pregnancy, or outside the after-birth window: no pregnancy flag
  assert.equal(pregnancyHaemoglobinFlag(9, "2026-01-01", active), null);
  assert.equal(pregnancyHaemoglobinFlag(9, "2026-12-30", after), null);
  assert.equal(haemoglobinGdl(104, "g/L"), 10.4);
  assert.equal(haemoglobinGdl(10, "mg/dL"), null);
});
