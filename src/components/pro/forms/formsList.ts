// Release 3 · W6 MO29 the Forms list lines (gen/r18.js forms18, FTPL18) and
// the "Templates from Centium" rows. Pure, for the list and its test.
//
// Round D (20261222060000): the templates come from the Database
// (list_form_templates: the caller's lane and the any-lane ones, each with
// `available`); only the available ones can be used, the rest say Coming soon.

import { t, tn } from "../../../i18n/core";
import { parseSchedule, scheduleLine, type FormAssignment, type FormKind, type FormSummary, type FormTemplate } from "./formModel";

const questions = (n: number) => tn(n, "{n} question", "{n} questions");
const clients = (n: number) => tn(n, "{n} client", "{n} clients");

/** COPY MO29: "Sent manually · {n} questions", or "Sent automatically when someone hires you" (send_on_hire). */
export const intakeLine = (f: FormSummary) => `${f.sendOnHire ? t("Sent automatically when someone hires you") : t("Sent manually")} · ${questions(f.questionCount)}`;

/** COPY MO29: "Every week · {weekday} {time} · {n} clients", from the live schedules. */
export function checkInLine(f: FormSummary, all: FormAssignment[]): string {
  const series = all.filter((a) => a.formId === f.id && a.status === "series" && a.schedule);
  if (!series.length) return `${t("Not scheduled")} · ${questions(f.questionCount)}`;
  const people = new Set(series.map((a) => a.clientId)).size;
  const kinds = [...new Set(series.map((a) => a.schedule))];
  const s = kinds.length === 1 ? parseSchedule(kinds[0]) : null;
  return s ? `${scheduleLine(s)} · ${clients(people)}` : `${t("On a schedule")} · ${clients(people)}`;
}

/** The templates for one tab, available first (the Database's order kept within each). */
export function templatesFor(all: FormTemplate[], kind: FormKind): FormTemplate[] {
  const mine = all.filter((t) => t.kind === kind);
  return [...mine.filter((t) => t.available), ...mine.filter((t) => !t.available)];
}

/** A template row's line: its description, and the question count once it's ready. */
export function templateMetaLine(t: FormTemplate): string {
  return [t.description?.trim() || null, t.available && t.questionCount > 0 ? questions(t.questionCount) : null].filter(Boolean).join(" · ");
}

/** /app/more/forms (MoreRoutes "forms/*"). */
export const FORMS_PATH = "/app/more/forms";
