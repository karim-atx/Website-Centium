import type { BloodMarker } from "../../types";

/**
 * Health checks for everyone (Task Y): the checks worth asking a doctor about,
 * chosen on the device from age, sex and BMI. Nothing about which checks
 * apply, or whether they were done, is stored anywhere.
 *
 * SOURCE: "Health checks for everyone and in pregnancy: content for review"
 * and its decisions (2026-10-02), approved as written:
 * https://claude.ai/code/artifact/75106224-b293-4c5c-9a42-458ea99ae25e
 *
 * Each row's words are the document's "What the user sees" strings, split
 * into name / how often / who. The four checks the decisions added (HIV,
 * bowel, mammogram, cervical) have no "What the user sees" row of their own,
 * so theirs are taken from the decisions table's Check, How often and Who
 * columns, in the same "name · how often" shape.
 */

export const SCREENING_COPY = {
  cardTitle: "Your health checks",
  cardSubtitle: "Checks worth asking your doctor about",
  heading: "Checks worth asking your doctor about",
  intro: "Based on your age and profile. Your doctor may suggest a different schedule, and theirs comes first.",
  notYet: "Not yet",
  lastChecked: (date: string) => `Last checked ${date}`,
} as const;

export type ScreeningProfile = {
  age: number | undefined;
  sex: string | undefined;
  /** From the profile's height and weight; null when either is missing. */
  bmi: number | null;
  /** Recovery-sensitive mode (or not yet known): no reason may mention BMI. */
  recoverySensitive: boolean;
};

/** Where "Last checked" comes from, when the app holds that kind of result. */
export type ScreeningSource = { kind: "bp" } | { kind: "labs"; markers: string[] } | { kind: "none" };

export type ScreeningRow = {
  id: string;
  title: string;
  /** How often, lower case, shown after the name. */
  frequency: string;
  /** Who it is for, or why it is suggested. */
  who: string;
  source: ScreeningSource;
};

const between = (age: number | undefined, lo: number, hi: number) => typeof age === "number" && age >= lo && age <= hi;

/**
 * The checks that apply to this person, in the document's order. Sex-specific
 * checks need sex on file as male or female; age checks need an age.
 */
export function screeningRows(p: ScreeningProfile): ScreeningRow[] {
  const rows: ScreeningRow[] = [];
  const female = p.sex === "female";
  const male = p.sex === "male";

  if (typeof p.age === "number" && p.age >= 18) {
    rows.push({ id: "bp", title: "Blood pressure", frequency: "at least once a year", who: "All adults", source: { kind: "bp" } });
  }
  if (between(p.age, 35, 70) && p.bmi !== null && p.bmi >= 25) {
    rows.push({
      id: "glucose",
      title: "Blood sugar (HbA1c or fasting glucose)",
      frequency: "every 3 years",
      who: p.recoverySensitive ? "suggested for your age" : "suggested because you're 35–70 with a BMI of 25 or more",
      source: { kind: "labs", markers: ["hba1c", "glucose"] },
    });
  }
  if (between(p.age, 40, 75)) {
    rows.push({
      id: "cholesterol",
      title: "Cholesterol, as part of a heart-health check",
      frequency: "as your doctor advises, usually every 4–6 years",
      who: "Adults 40–75",
      source: { kind: "labs", markers: ["total_cholesterol", "ldl_cholesterol", "hdl_cholesterol", "triglycerides"] },
    });
  }
  if (between(p.age, 18, 79)) {
    rows.push({ id: "hepatitis_c", title: "Hepatitis C test", frequency: "once in adulthood", who: "Adults 18–79", source: { kind: "none" } });
  }
  if (between(p.age, 15, 65)) {
    rows.push({ id: "hiv", title: "HIV test", frequency: "once (more often if at higher risk)", who: "Ages 15–65", source: { kind: "none" } });
  }
  if (between(p.age, 45, 75)) {
    rows.push({
      id: "bowel",
      title: "Bowel (colorectal) cancer screening",
      frequency: "interval depends on the test your doctor offers",
      who: "Ages 45–75",
      source: { kind: "none" },
    });
  }
  if (female && between(p.age, 40, 74)) {
    rows.push({ id: "mammogram", title: "Mammogram", frequency: "every 2 years", who: "Women 40–74", source: { kind: "none" } });
  }
  if (female && between(p.age, 21, 65)) {
    rows.push({
      id: "cervical",
      title: "Cervical screening",
      frequency: (p.age as number) <= 29 ? "every 3 years" : "every 3–5 years depending on test",
      who: "Women 21–65",
      source: { kind: "none" },
    });
  }
  if (male && between(p.age, 55, 69)) {
    rows.push({
      id: "psa",
      title: "PSA test",
      frequency: "a choice to discuss with your doctor first",
      who: "Men 55–69",
      source: { kind: "labs", markers: ["psa"] },
    });
  }
  return rows;
}

/** BMI from height and weight, or null. */
export function bmiOf(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * "Last checked" for a row: the newest BP reading or the newest result for
 * one of its markers, as YYYY-MM-DD; null when there is none. Undefined when
 * the app holds no records of this kind at all (the row then says nothing
 * about when, rather than a "Not yet" the app could not know).
 */
export function screeningLastChecked(
  row: ScreeningRow,
  data: { latestBpDay: string | null; markers: BloodMarker[] }
): string | null | undefined {
  if (row.source.kind === "none") return undefined;
  if (row.source.kind === "bp") return data.latestBpDay;
  const keys = row.source.markers;
  let newest: string | null = null;
  for (const m of data.markers) {
    if (!m.markerKey || !keys.includes(m.markerKey)) continue;
    const d = m.history[m.history.length - 1]?.date ?? null;
    if (d && (!newest || d > newest)) newest = d;
  }
  return newest;
}
