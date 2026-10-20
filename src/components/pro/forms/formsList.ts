// Release 3 · W6 MO29 the Forms list lines (gen/r18.js forms18, FTPL18) and
// the "Templates from Centium" per lane. Pure, for the list and its test.

import type { ProLane } from "../subtypeLanes";
import { parseSchedule, scheduleLine, type FormAssignment, type FormKind, type FormSummary } from "./formModel";

export interface LaneTemplate {
  kind: FormKind;
  title: string;
  meta: string;
  /** The one template the database holds (create_weekly_check_in_template). */
  weekly?: boolean;
}

/**
 * FTPL18 by lane. Only the Weekly check-in exists as a template in the
 * database (9 questions, the safety ones marked); the others are listed as
 * the frames draw them, without question counts, and show Coming soon.
 * Clinical overview has no check-ins (can_write_form).
 */
const WEEKLY: LaneTemplate = { kind: "check_in", title: "Weekly check-in", meta: "Weight, energy, sleep, photos · 9 questions", weekly: true };
export const LANE_TEMPLATES: Record<ProLane, LaneTemplate[]> = {
  full_coaching: [
    { kind: "intake", title: "Coaching intake", meta: "Goals, training history, injuries, availability" },
    { kind: "intake", title: "PAR-Q health check", meta: "Readiness for exercise" },
    WEEKLY,
  ],
  nutrition: [
    { kind: "intake", title: "Nutrition intake", meta: "Diet history, restrictions and allergies, eating habits" },
    { kind: "intake", title: "Food habits questionnaire", meta: "Meals, cravings, hunger" },
    WEEKLY,
  ],
  clinical_overview: [
    { kind: "intake", title: "Health history", meta: "Conditions, medications, allergies, family history" },
    { kind: "intake", title: "Medication review", meta: "Current medicines and how they are taken" },
  ],
};

const questions = (n: number) => `${n} question${n === 1 ? "" : "s"}`;
const clients = (n: number) => `${n} client${n === 1 ? "" : "s"}`;

/** COPY MO29: "Sent manually · {n} questions" (nothing is sent on hire yet). */
export const intakeLine = (f: FormSummary) => `Sent manually · ${questions(f.questionCount)}`;

/** COPY MO29: "Every week · {weekday} {time} · {n} clients", from the live schedules. */
export function checkInLine(f: FormSummary, all: FormAssignment[]): string {
  const series = all.filter((a) => a.formId === f.id && a.status === "series" && a.schedule);
  if (!series.length) return `Not scheduled · ${questions(f.questionCount)}`;
  const people = new Set(series.map((a) => a.clientId)).size;
  const kinds = [...new Set(series.map((a) => a.schedule))];
  const s = kinds.length === 1 ? parseSchedule(kinds[0]) : null;
  return s ? `${scheduleLine(s)} · ${clients(people)}` : `On a schedule · ${clients(people)}`;
}

/** /app/more/forms (MoreRoutes "forms/*"). */
export const FORMS_PATH = "/app/more/forms";
