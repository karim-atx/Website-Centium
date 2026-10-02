import type { BloodMarker } from "../../types";
import { gestationOn } from "./weeks";
/** The two dates a pregnancy is counted from; at least one is present. */
type Pregnancy = { lmpDate: string | null; dueDate: string | null };

/**
 * Pregnancy health checks (Task Y): the blood tests usually offered, by week,
 * and the two values that mean something different in pregnancy. Worked out
 * on the device from the pregnancy's dates and the user's own results;
 * nothing new is stored.
 *
 * SOURCE: "Health checks for everyone and in pregnancy: content for review"
 * and its decisions (2026-10-02), approved as written:
 * https://claude.ai/code/artifact/75106224-b293-4c5c-9a42-458ea99ae25e
 *
 * INTERNATIONAL, NOT ONE COUNTRY'S: the WHO 2016 antenatal care model is the
 * frame (first contact by 12 weeks, then 20, 26, 30, 34, 36, 38 and 40) and
 * NICE's blood tests are the usual content. No country is named on screen.
 *
 * The schedule rows are the document's table, with "she" made "you": the
 * table was written about the user, and the screen speaks to her.
 */

export const PREGNANCY_CHECKS_COPY = {
  heading: "Blood tests usually offered in pregnancy",
  intro: "This is the usual schedule. Your clinic's own schedule comes first.",
  comingUp: (week: string, test: string) => `At about ${week} weeks: ${test}`,
  /** The WHO 2016 contacts, as the frame. Written from the decision; not a quoted string. */
  contacts: "Appointments are usually at about 12, 20, 26, 30, 34, 36, 38 and 40 weeks.",
  done: "Done",
} as const;

export type PregnancyCheckId = "first" | "glucose" | "week28" | "every";

export type PregnancyCheck = {
  id: PregnancyCheckId;
  /** When, as the schedule shows it. */
  when: string;
  /** What is usually offered. */
  what: string;
  /** The test, as "Coming up" names it. */
  short: string;
  /** The "Coming up" week label, and the last week it can be coming up. */
  weekLabel: string;
  upToWeek: number;
};

export const PREGNANCY_SCHEDULE: PregnancyCheck[] = [
  {
    id: "first",
    // WHO 2016: first contact by 12 weeks (the decision; the draft said 10, after NICE).
    when: "First appointment, by about 12 weeks",
    what:
      "Full blood count, blood group and rhesus D status, red-cell antibodies; screening for HIV, syphilis and hepatitis B; screening for sickle cell and thalassaemia",
    short: "your first blood tests",
    weekLabel: "12",
    upToWeek: 12,
  },
  {
    id: "glucose",
    when: "24–28 weeks",
    what:
      "Glucose tolerance test for gestational diabetes, if you have a risk factor (including a family background from the Middle East, South Asia or the Caribbean, a BMI above 30, a previous large baby or gestational diabetes, or a close relative with diabetes)",
    short: "a glucose test, if you have a risk factor",
    weekLabel: "24–28",
    upToWeek: 28,
  },
  {
    id: "week28",
    when: "28 weeks",
    what: "Full blood count and red-cell antibodies; anti-D offered if you are rhesus negative",
    short: "a blood count and antibody check",
    weekLabel: "28",
    upToWeek: 28,
  },
  {
    id: "every",
    when: "Every appointment",
    what: "Blood pressure (and urine test)",
    short: "",
    weekLabel: "",
    upToWeek: 99,
  },
];

const BLOOD_COUNT = ["haemoglobin", "haematocrit", "red_cell_count", "white_cell_count", "platelets"];

/** Every gestation week a result for one of `keys` was dated in. */
function resultWeeks(markers: BloodMarker[], keys: string[], pregnancy: Pick<Pregnancy, "lmpDate" | "dueDate">): number[] {
  const weeks: number[] = [];
  for (const m of markers) {
    if (!m.markerKey || !keys.includes(m.markerKey)) continue;
    for (const h of m.history) {
      const g = gestationOn(h.date, pregnancy);
      if (g && !g.implausible) weeks.push(g.week);
    }
  }
  return weeks;
}

/**
 * Which schedule items a logged result already covers: the first blood tests
 * by a blood count before week 20; the glucose test by a glucose result in
 * weeks 23–29; the 28-week check by a blood count from week 26 (the
 * document's own example: a haemoglobin result after week 26).
 */
export function pregnancyChecksDone(
  markers: BloodMarker[],
  pregnancy: Pick<Pregnancy, "lmpDate" | "dueDate">
): Set<PregnancyCheckId> {
  const done = new Set<PregnancyCheckId>();
  const count = resultWeeks(markers, BLOOD_COUNT, pregnancy);
  const glucose = resultWeeks(markers, ["glucose"], pregnancy);
  if (count.some((w) => w < 20)) done.add("first");
  if (glucose.some((w) => w >= 23 && w <= 29)) done.add("glucose");
  if (count.some((w) => w >= 26)) done.add("week28");
  return done;
}

/** The next item not yet done whose time has not passed, or null. */
export function pregnancyComingUp(week: number, done: Set<PregnancyCheckId>): PregnancyCheck | null {
  return PREGNANCY_SCHEDULE.find((c) => c.id !== "every" && !done.has(c.id) && week <= c.upToWeek) ?? null;
}

// ---------------------------------------------------------------- Flags

export type PregnancyFlag = { level: "discuss" | "soon" | "urgent"; label: string; text: string };

export const PREGNANCY_FLAG_COPY = {
  haemoglobinLabel: "Discuss with your maternity team",
  haemoglobin: "Your haemoglobin is below the usual level for this stage of pregnancy. Discuss it with your maternity team.",
  bpSameDayLabel: "Same day",
  bpSameDay: "This reading is high for pregnancy. Contact your maternity team today.",
  bpUrgentLabel: "Urgent",
  bpUrgent: "This reading is very high for pregnancy. Contact your maternity team now; if you can't, go to emergency care.",
} as const;

/** Haemoglobin thresholds in g/dL (BSH 2019): below these is flagged. */
export const HB_THRESHOLDS = { firstTrimester: 11.0, fromWeek14: 10.5, afterBirth: 10.0 } as const;

/** Blood pressure in pregnancy (NICE NG133, ACOG): 140/90 same day, 160/110 urgent. */
export function pregnancyBloodPressureFlag(systolic: number, diastolic: number): PregnancyFlag | null {
  if (systolic >= 160 || diastolic >= 110) {
    return { level: "urgent", label: PREGNANCY_FLAG_COPY.bpUrgentLabel, text: PREGNANCY_FLAG_COPY.bpUrgent };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { level: "soon", label: PREGNANCY_FLAG_COPY.bpSameDayLabel, text: PREGNANCY_FLAG_COPY.bpSameDay };
  }
  return null;
}

/** A haemoglobin value in g/dL, from g/dL, g/L or mmol/L; null for any other unit. */
export function haemoglobinGdl(value: number, unit: string): number | null {
  const u = unit.trim().toLowerCase();
  if (u === "g/dl") return value;
  if (u === "g/l") return value / 10;
  if (u === "mmol/l") return value * 1.611;
  return null;
}

/**
 * The haemoglobin flag for a result dated `on`, or null: below 11.0 g/dL in
 * weeks 0–13, below 10.5 from week 14, and below 10.0 for a result taken
 * after birth within the after-birth window. A result from before the
 * pregnancy is judged by none of these.
 */
export function pregnancyHaemoglobinFlag(
  valueGdl: number,
  on: string,
  ctx: {
    active: Pick<Pregnancy, "lmpDate" | "dueDate"> | null;
    afterBirth: { endedOn: string; until: string } | null;
  }
): PregnancyFlag | null {
  let threshold: number | null = null;
  if (ctx.active) {
    const g = gestationOn(on, ctx.active);
    if (g && !g.implausible) threshold = g.week < 14 ? HB_THRESHOLDS.firstTrimester : HB_THRESHOLDS.fromWeek14;
  } else if (ctx.afterBirth && on >= ctx.afterBirth.endedOn && on <= ctx.afterBirth.until) {
    threshold = HB_THRESHOLDS.afterBirth;
  }
  if (threshold === null || valueGdl >= threshold) return null;
  return { level: "discuss", label: PREGNANCY_FLAG_COPY.haemoglobinLabel, text: PREGNANCY_FLAG_COPY.haemoglobin };
}
