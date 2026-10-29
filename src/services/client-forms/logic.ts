// Release 3 · W7 the client side of a professional's forms (CU6, CU26) and
// the Home reminders and pop-up queue (CU5, CU23): the pure rules, kept out of
// React and Supabase so node --test loads them.
//
// Backend contract (Database HANDOVER_API.md DB-6 and "Check-in schedules"):
// - answers are an object keyed by form_questions.id;
// - save_form_response(p_assignment_id, p_answers, p_submit): false saves a
//   draft ("Save, come back later"), true sends; ATXG9 once sent;
// - on submit the database sets form_responses.safety_flag / safety_topics
//   from the marked questions (form_answer_triggers_safety). Safety is decided
//   there; answerTriggersSafety below is a mirror of that documented function,
//   only ever used together with the returned flag (never on its own).
// - 20261222080000: the client reads their form through my_form_questions
//   (fromMyFormQuestion below), which applies recovery-sensitive mode and
//   carries the prompts shown the moment an answer matches.

import { clock12 } from "../../utils/time12";
import { DAY_LONG, mondayIndex } from "../../utils/week";

export type QuestionType = "number" | "scale" | "choice" | "multi" | "text" | "long_text" | "photo" | "date";
export type FormKind = "intake" | "check_in";
export type Answers = Record<string, unknown>;

/** Round D: a long text answer is at most 5,000 characters (save_form_response). */
export const LONG_TEXT_MAX = 5000;
/** A short text answer's field limit (the app's own, unchanged). */
export const SHORT_TEXT_MAX = 2000;

/**
 * form_questions.show_if (Round D): one condition on an earlier question.
 * 20261222080000 adds not_equals (answered, and not that), excludes (a
 * multiple choice answered without that option) and in (one of these).
 */
export type ShowIfRule =
  | { questionId: string; equals: string }
  | { questionId: string; includes: string }
  | { questionId: string; notEquals: string }
  | { questionId: string; excludes: string }
  | { questionId: string; in: string[] };

/**
 * A note's or a prompt's rule on one answer (20261222080000,
 * form_rule_met): any of these answers, any answer but these, or a number
 * at or below / at or above.
 */
export type AnswerRule = { answers: string[] } | { otherThan: string[] } | { max: number } | { min: number };

/** What the client is shown the moment an answer matches (form_questions.client_prompt). */
export interface ClientPrompt {
  rule: AnswerRule;
  kind: "urgent" | "support" | "recovery_and_support";
  /** The words to show; always there for urgent. */
  message: string | null;
}

export interface ClientQuestion {
  id: string;
  position: number;
  type: QuestionType;
  prompt: string;
  unit: string | null;
  required: boolean;
  options: string[] | null;
  scaleMin: number | null;
  scaleMax: number | null;
  safetyTopic: string | null;
  safetyTrigger: Record<string, unknown> | null;
  /** Round D: this question opens a section with this title. */
  sectionTitle?: string | null;
  /** Round D: asked only when this condition is met. */
  showIf?: ShowIfRule | null;
  /** Round D: the answer is offered for the client's profile after sending. */
  profileField?: string | null;
  /** 20261222080000 (my_form_questions): the words shown for each option, same order as options (reworded in recovery-sensitive mode). */
  optionLabels?: string[] | null;
  /** The words at both ends of a scale. */
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  /** The hint in an empty text box. */
  placeholder?: string | null;
  /** Shown the moment the answer matches: urgent, support, or recovery and support. */
  clientPrompt?: ClientPrompt | null;
}

// ---------------------------------------------------------------------------
// Conditions (Round D, 20261222050000): a mirror of public.form_condition_met
// ---------------------------------------------------------------------------

/** show_if as stored ({"question_id", "equals" | "includes" | "not_equals" | "excludes" | "in"}), or null. */
export function parseShowIfRule(raw: unknown): ShowIfRule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.question_id !== "string") return null;
  if (typeof r.equals === "string") return { questionId: r.question_id, equals: r.equals };
  if (typeof r.includes === "string") return { questionId: r.question_id, includes: r.includes };
  if (typeof r.not_equals === "string") return { questionId: r.question_id, notEquals: r.not_equals };
  if (typeof r.excludes === "string") return { questionId: r.question_id, excludes: r.excludes };
  if (Array.isArray(r.in)) return { questionId: r.question_id, in: r.in.filter((x): x is string => typeof x === "string") };
  return null;
}

/** A rule as stored (the note's or prompt's object without its own keys), or null. */
export function parseAnswerRule(raw: unknown): AnswerRule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null);
  const answers = strings(r.answers);
  if (answers) return { answers };
  const otherThan = strings(r.other_than);
  if (otherThan) return { otherThan };
  if (typeof r.max === "number") return { max: r.max };
  if (typeof r.min === "number") return { min: r.min };
  return null;
}

/** client_prompt as my_form_questions returns it ({rule…, kind, message}), or null. */
export function parseClientPrompt(raw: unknown): ClientPrompt | null {
  const rule = parseAnswerRule(raw);
  if (!rule) return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind === "urgent" || r.kind === "support" || r.kind === "recovery_and_support" ? r.kind : null;
  if (!kind) return null;
  const message = typeof r.message === "string" && r.message.trim() ? r.message.trim() : null;
  if (kind === "urgent" && !message) return null;
  return { rule, kind, message };
}

const NUMBER_TEXT = /^\s*-?[0-9]+(\.[0-9]+)?\s*$/;

/**
 * A mirror of public.form_rule_met(p_rule, p_answer): "answers" is met by a
 * string answer in the list or a multiple choice with one of them;
 * "other_than" by a non-blank string not in the list, or a multiple choice
 * with an option not in it; max / min by a number (or numeric text).
 */
export function ruleMet(rule: AnswerRule | null | undefined, answer: unknown): boolean {
  if (!rule || answer === undefined || answer === null) return false;
  if ("answers" in rule) {
    if (typeof answer === "string") return rule.answers.includes(answer);
    return Array.isArray(answer) && answer.some((x) => typeof x === "string" && rule.answers.includes(x));
  }
  if ("otherThan" in rule) {
    if (typeof answer === "string") return answer.trim() !== "" && !rule.otherThan.includes(answer);
    return Array.isArray(answer) && answer.some((x) => typeof x === "string" && !rule.otherThan.includes(x));
  }
  const n = typeof answer === "number" ? answer : typeof answer === "string" && NUMBER_TEXT.test(answer) ? Number(answer) : null;
  if (n === null || !Number.isFinite(n)) return false;
  return "max" in rule ? n <= rule.max : n >= rule.min;
}

/** The prompts these answers trigger among the questions shown, in question order. */
export function promptsFor(questions: ClientQuestion[], answers: Answers): { question: ClientQuestion; prompt: ClientPrompt }[] {
  return questions.flatMap((q) => (q.clientPrompt && ruleMet(q.clientPrompt.rule, answers[q.id]) ? [{ question: q, prompt: q.clientPrompt }] : []));
}

// ---------------------------------------------------------------------------
// The client's form as my_form_questions gives it (20261222080000), with
// recovery-sensitive mode already applied by the database
// ---------------------------------------------------------------------------

/** One row of my_form_questions(p_assignment_id). */
export interface MyFormQuestionRow {
  question_id: string;
  position: number;
  section_title: string | null;
  type: QuestionType;
  prompt: string;
  unit: string | null;
  required: boolean;
  options: unknown;
  option_labels: unknown;
  scale_min: number | null;
  scale_max: number | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  placeholder: string | null;
  show_if: unknown;
  client_prompt: unknown;
  profile_field: string | null;
  safety_line: string | null;
}

const asStrings = (v: unknown): string[] | null => (Array.isArray(v) ? v.map((o) => String(o)) : null);
const trimmed = (v: string | null | undefined): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * A my_form_questions row as the sheet's question. It doesn't return
 * safety_topic or safety_trigger (the database decides the safety flag on
 * sending), so both are null and the answerTriggersSafety mirror stays quiet:
 * the done screen's follow-up then rests on the returned safety_flag alone.
 */
export function fromMyFormQuestion(r: MyFormQuestionRow): ClientQuestion {
  const options = asStrings(r.options);
  const labels = asStrings(r.option_labels);
  return {
    id: r.question_id,
    position: r.position,
    type: r.type,
    prompt: r.prompt,
    unit: r.unit,
    required: r.required,
    options,
    scaleMin: r.scale_min,
    scaleMax: r.scale_max,
    safetyTopic: null,
    safetyTrigger: null,
    sectionTitle: r.section_title,
    showIf: parseShowIfRule(r.show_if),
    profileField: r.profile_field,
    optionLabels: options && labels && labels.length === options.length ? labels : null,
    scaleMinLabel: trimmed(r.scale_min_label),
    scaleMaxLabel: trimmed(r.scale_max_label),
    placeholder: trimmed(r.placeholder),
    clientPrompt: parseClientPrompt(r.client_prompt),
  };
}

/** The sentence the form ends with (the same on every row), or null. */
export const safetyLineOf = (rows: Pick<MyFormQuestionRow, "safety_line">[]): string | null => trimmed(rows.find((r) => trimmed(r.safety_line))?.safety_line);

/** A choice's buttons: the option stored, and the words shown for it (option_labels, else the option). */
export function optionChoices(q: Pick<ClientQuestion, "options" | "optionLabels">): { value: string; label: string }[] {
  return (q.options ?? []).map((value, i) => ({ value, label: q.optionLabels?.[i] ?? value }));
}

/**
 * A saved draft's choices without any option the form no longer offers (one
 * recovery-sensitive mode hides), so a required question answered only with
 * a hidden option reads as unanswered here as save_form_response reads it.
 */
export function keepOfferedOptions(answers: Answers, questions: ClientQuestion[]): Answers {
  const out: Answers = { ...answers };
  for (const q of questions) {
    if (!q.options || !(q.id in out)) continue;
    const v = out[q.id];
    if (q.type === "choice" && typeof v === "string" && !q.options.includes(v)) delete out[q.id];
    if (q.type === "multi" && Array.isArray(v)) {
      const kept = v.filter((x) => typeof x === "string" && q.options!.includes(x));
      if (kept.length) out[q.id] = kept;
      else delete out[q.id];
    }
  }
  return out;
}

/** "None" or "Nothing" in a multiple choice clears the other options, and picking another clears it. */
export const isNoneOption = (o: string) => /^(none|nothing)$/i.test(o.trim());
export function toggleMulti(current: string[], option: string): string[] {
  if (current.includes(option)) return current.filter((x) => x !== option);
  if (isNoneOption(option)) return [option];
  return [...current.filter((x) => !isNoneOption(x)), option];
}

/** An answer as Postgres's `#>> '{}'` reads it: a string itself, a number or boolean as text, nothing as "". */
function answerAsText(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

/**
 * A mirror of public.form_condition_met(p_condition, p_answers): no
 * condition is met; "equals" compares the answer as text (a scale's 3 is
 * "3"); "includes" looks for the option in a multiple-choice answer (a
 * list). 20261222080000: "not_equals" needs a single answer that isn't that
 * one; "excludes" a multiple choice answered without that option; "in" a
 * string answer in the list.
 */
export function conditionMet(rule: ShowIfRule | null | undefined, answers: Answers): boolean {
  if (!rule) return true;
  const v = answers[rule.questionId];
  if ("equals" in rule) return answerAsText(v) === rule.equals;
  if ("includes" in rule) return Array.isArray(v) && v.some((x) => typeof x === "string" && x === rule.includes);
  if ("notEquals" in rule) {
    if (v === undefined || v === null || Array.isArray(v) || typeof v === "object") return false;
    const t = answerAsText(v);
    return t.trim() !== "" && t !== rule.notEquals;
  }
  if ("excludes" in rule) return Array.isArray(v) && v.length > 0 && !v.some((x) => x === rule.excludes);
  return typeof v === "string" && rule.in.includes(v);
}

/**
 * The questions asked with these answers, judged in order (a mirror of
 * form_hidden_question_ids): a question is hidden when the question it
 * depends on is hidden, or when its condition isn't met by the answers that
 * aren't hidden. Hidden is not required and not sent.
 */
export function shownQuestions(questions: ClientQuestion[], answers: Answers): ClientQuestion[] {
  const hidden = new Set<string>();
  const live: Answers = { ...answers };
  const out: ClientQuestion[] = [];
  for (const q of [...questions].sort((a, b) => a.position - b.position)) {
    if (q.showIf && (hidden.has(q.showIf.questionId) || !conditionMet(q.showIf, live))) {
      hidden.add(q.id);
      delete live[q.id];
      continue;
    }
    out.push(q);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** The same "answered" rule as save_form_response's required check (null, missing or blank text). */
export function isAnswered(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function missingRequired(questions: ClientQuestion[], answers: Answers): string[] {
  return questions.filter((q) => q.required && !isAnswered(answers[q.id])).map((q) => q.id);
}

/** Only the answers to questions this person is shown; anything else is never sent. */
export function visibleAnswers(answers: Answers, visible: ClientQuestion[]): Answers {
  const out: Answers = {};
  for (const q of visible) if (q.id in answers && answers[q.id] !== undefined) out[q.id] = answers[q.id];
  return out;
}

// ---------------------------------------------------------------------------
// J12: recovery-sensitive mode skips the body-measure and photo questions
// ---------------------------------------------------------------------------

/**
 * The units of public.form_question_is_body_measure (migration
 * 20261124180000), exactly as the database lists them.
 */
export const BODY_MEASURE_UNITS: readonly string[] = ["kg", "g", "lb", "lbs", "st", "cm", "mm", "m", "in", "inch", "inches", "ft"];

/**
 * A mirror of public.form_question_is_body_measure(p_type, p_unit), the
 * measurement predicate (HANDOVER_API "Client-side readers"): a number
 * question whose unit, lower-cased with spaces trimmed (btrim), is a body
 * unit. It keeps that meaning and is never true for a photo; it is one arm of
 * the recovery rule (isHiddenInRecovery below). Not the prompt's wording, and
 * not a question's safety topic.
 */
export function isBodyMeasure(type: QuestionType | string, unit: string | null | undefined): boolean {
  return type === "number" && BODY_MEASURE_UNITS.includes((unit ?? "").replace(/^ +| +$/g, "").toLowerCase());
}

/**
 * A mirror of public.form_question_hidden_in_recovery(p_type, p_unit)
 * (migration 20261124190000), THE recovery-sensitive rule (J12): a body
 * measure or a progress photo. Recovery-sensitive mode hides exactly these,
 * and save_form_response doesn't require them of that client. A
 * safety-marked body measure is hidden too (the rule has no exception).
 * Text, scale, choice, date and a number without a body unit stay.
 */
export function isHiddenInRecovery(type: QuestionType | string, unit: string | null | undefined): boolean {
  return isBodyMeasure(type, unit) || type === "photo";
}

/** The questions to render, in order. Recovery-sensitive: body measures and photos are not rendered, not required, not sent. */
export function visibleQuestions(questions: ClientQuestion[], recoverySensitive: boolean): ClientQuestion[] {
  const sorted = [...questions].sort((a, b) => a.position - b.position);
  return recoverySensitive ? sorted.filter((q) => !isHiddenInRecovery(q.type, q.unit)) : sorted;
}

// ---------------------------------------------------------------------------
// Items and parts (CU6: "part 1 of 3")
// ---------------------------------------------------------------------------

/** A body-measure question (the same rule), drawn in the measurements row. */
export const isMeasureField = (q: ClientQuestion) => isBodyMeasure(q.type, q.unit);

/** One numbered entry: a run of measurement fields shares one number ("This week's measurements"). */
export interface FormItem {
  kind: "measures" | "single";
  questions: ClientQuestion[];
}

export function itemsOf(questions: ClientQuestion[]): FormItem[] {
  const items: FormItem[] = [];
  for (const q of questions) {
    const last = items[items.length - 1];
    if (isMeasureField(q) && last?.kind === "measures" && last.questions.length < 3) last.questions.push(q);
    else items.push({ kind: isMeasureField(q) ? "measures" : "single", questions: [q] });
  }
  return items;
}

export const ITEMS_PER_PART = 4;

/**
 * The parts of the sheet. forms has no section column, so: the leading
 * measurements and photos are part 1 (CU6 part 1, "measurements and photos"),
 * then at most four entries a part. A form of four entries or fewer is one part.
 */
export function partsOf(items: FormItem[]): FormItem[][] {
  if (items.length === 0) return [[]];
  if (items.length <= ITEMS_PER_PART) return [items];
  const parts: FormItem[][] = [];
  let i = 0;
  const lead: FormItem[] = [];
  while (i < items.length && lead.length < ITEMS_PER_PART && (items[i].kind === "measures" || items[i].questions[0].type === "photo")) lead.push(items[i++]);
  if (lead.length && i < items.length) parts.push(lead);
  else i = 0;
  for (; i < items.length; i += ITEMS_PER_PART) parts.push(items.slice(i, i + ITEMS_PER_PART));
  return parts;
}

export const partQuestions = (part: FormItem[]) => part.flatMap((it) => it.questions);

export interface FormParts {
  parts: FormItem[][];
  /** Each part's section title (null: an untitled part, or a form without sections). */
  titles: (string | null)[];
  /** The form has sections: "Section 1 of 3" rather than "part 1 of 3". */
  sectioned: boolean;
}

/**
 * The sheet's parts for these answers (Round D). A form with sections is one
 * part per section (a question opens one with section_title; questions
 * before the first form an untitled part), each section's questions those
 * shown by their conditions, and a section with nothing shown is left out.
 * A form without sections keeps the four-a-part rule (partsOf). Parts are
 * worked out from the recovery-visible questions, so a section keeps its
 * title even when the question that opens it is hidden.
 */
export function formParts(visible: ClientQuestion[], answers: Answers): FormParts {
  const sorted = [...visible].sort((a, b) => a.position - b.position);
  if (!sorted.some((q) => q.sectionTitle?.trim())) return { parts: partsOf(itemsOf(shownQuestions(sorted, answers))), titles: [], sectioned: false };
  const sections: { title: string | null; questions: ClientQuestion[] }[] = [];
  for (const q of sorted) {
    const title = q.sectionTitle?.trim() || null;
    if (title || !sections.length) sections.push({ title, questions: [] });
    sections[sections.length - 1].questions.push(q);
  }
  const kept = sections.map((s) => ({ title: s.title, items: itemsOf(shownQuestions(s.questions, answers)) })).filter((s) => s.items.length > 0);
  if (!kept.length) return { parts: [[]], titles: [null], sectioned: true };
  return { parts: kept.map((s) => s.items), titles: kept.map((s) => s.title), sectioned: true };
}

/**
 * Where a saved draft picks up (CU6 "Part 2 of 3 · saved"): the last part
 * with an answer, or the one after it once its required answers are in.
 */
export function resumePart(parts: FormItem[][], answers: Answers): number {
  let last = -1;
  parts.forEach((p, i) => {
    if (partQuestions(p).some((q) => isAnswered(answers[q.id]))) last = i;
  });
  if (last === -1) return 0;
  const done = missingRequired(partQuestions(parts[last]), answers).length === 0;
  return Math.min(done ? last + 1 : last, parts.length - 1);
}

/** The first part holding a required question with no answer, or -1. */
export function firstPartMissing(parts: FormItem[][], answers: Answers): number {
  return parts.findIndex((p) => missingRequired(partQuestions(p), answers).length > 0);
}

/** CU6 v3 "Add your hips measurement to continue". */
export function missingMessage(q: ClientQuestion): string {
  if (isMeasureField(q)) return `Add your ${q.prompt.trim().toLowerCase()} measurement to continue`;
  if (q.type === "photo") return "Add a photo to continue";
  return "Answer this question to continue";
}

/** The answer buttons of a scale question, low to high. */
export function scaleValues(q: Pick<ClientQuestion, "scaleMin" | "scaleMax">): number[] {
  const lo = q.scaleMin ?? 1;
  const hi = q.scaleMax ?? 10;
  if (!(hi > lo) || hi - lo > 20) return [];
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** Columns for a scale's buttons: one row up to 6, else rows of 5 (1 to 10) or 6 (0 to 10). */
export const scaleColumns = (n: number) => (n <= 6 ? Math.max(n, 1) : n % 5 === 0 ? 5 : 6);

/** A typed number as stored: a JSON number, or null while empty or unreadable. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Safety (DECISIONS_PROFESSIONAL "Safety"; HANDOVER_API DB-6)
// ---------------------------------------------------------------------------

const NOT_A_SIGN = new Set(["", "no", "none", "n/a"]);

/** A mirror of public.form_answer_triggers_safety(p_q, p_answer). */
export function answerTriggersSafety(q: Pick<ClientQuestion, "safetyTopic" | "safetyTrigger">, answer: unknown): boolean {
  if (!q.safetyTopic || answer === undefined || answer === null) return false;
  const trig = q.safetyTrigger ?? {};
  if ("min" in trig && typeof answer === "number") return answer >= Number(trig.min);
  if ("answers" in trig) {
    const list = Array.isArray(trig.answers) ? trig.answers.map(String) : [];
    if (typeof answer === "string") return list.includes(answer);
    if (Array.isArray(answer)) return answer.some((a) => list.includes(String(a)));
    return false;
  }
  if (typeof answer === "string") return !NOT_A_SIGN.has(answer.trim().toLowerCase());
  if (Array.isArray(answer)) return answer.some((a) => !["", "no", "none"].includes(String(a).trim().toLowerCase()));
  if (typeof answer === "number") return answer > 0;
  return true;
}

/**
 * Whether the sent sheet shows the "talk to a doctor" follow-up. The
 * response the database returns decides (safety_flag); the mirror only adds
 * to it, so a flag the database set is never hidden.
 */
export function showDoctorFollowUp(saved: { safety_flag: boolean } | null, questions: ClientQuestion[], answers: Answers): boolean {
  if (saved?.safety_flag) return true;
  if (!saved) return false;
  return questions.some((q) => answerTriggersSafety(q, answers[q.id]));
}

// ---------------------------------------------------------------------------
// Dates and lines (12-hour clock, Monday-first names)
// ---------------------------------------------------------------------------

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
export const weekdayName = (d: Date) => DAY_LONG[mondayIndex(d.getDay())];

/** "today", "tomorrow", "yesterday", a weekday within the week either side, else "Oct 25". */
export function dayWord(at: Date, now: Date): string {
  const diff = dayDiff(at, now);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (Math.abs(diff) < 7) return weekdayName(at);
  return `${MONTH_SHORT[at.getMonth()]} ${at.getDate()}`;
}

/** CU5 "Due today 8:00 PM"; "Due tomorrow 2:14 PM"; once past, "Was due Friday 2:14 PM". */
export function dueLine(dueAt: string | null, now: Date): string {
  if (!dueAt) return "";
  const at = new Date(dueAt);
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getTime() < now.getTime() ? "Was due" : "Due"} ${dayWord(at, now)} ${clock12(at)}`;
}

/** The lower-case form for "Part 2 of 3 · saved · due 8:00 PM". */
export function dueShort(dueAt: string | null, now: Date): string {
  if (!dueAt) return "";
  const at = new Date(dueAt);
  if (Number.isNaN(at.getTime())) return "";
  const word = dayWord(at, now);
  return `due ${word === "today" ? "" : `${word} `}${clock12(at)}`;
}

export const minutesFor = (questionCount: number) => Math.max(1, Math.round(questionCount / 4));
export const minutesText = (n: number) => (n === 1 ? "1 minute" : `${n} minutes`);

/** "Sunday, Oct 25" (CU6 "Next check-in: Sunday, Oct 25"). */
export const longDate = (d: Date) => `${weekdayName(d)}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;

/** The next check-in of a schedule (daily@HH:MM, weekly: / every2weeks: / every4weeks:<1-7>@HH:MM) after this one, or null. */
export function nextOccurrence(schedule: string | null, dueAt: string | null): Date | null {
  if (!schedule || !dueAt) return null;
  const m = /^(daily|(weekly|every2weeks|every4weeks):[1-7])@([01][0-9]|2[0-3]):[0-5][0-9]$/.exec(schedule);
  const at = new Date(dueAt);
  if (!m || Number.isNaN(at.getTime())) return null;
  const days = m[1] === "daily" ? 1 : m[2] === "every2weeks" ? 14 : m[2] === "every4weeks" ? 28 : 7;
  return new Date(at.getFullYear(), at.getMonth(), at.getDate() + days, at.getHours(), at.getMinutes());
}

// ---------------------------------------------------------------------------
// Home reminders (CU5, CU26) and the pop-up queue (CU23 priority rules)
// ---------------------------------------------------------------------------

/**
 * Levels from the CU23 close-up: 1 starting within the hour (pop-up), 2 needs
 * an answer (pop-up after level 1), 3 due (the card only). Kinds are open, so
 * later batches (CU29's share-win permission) add theirs with a level.
 */
export type ReminderLevel = 1 | 2 | 3;
export type ReminderTone = "pr" | "teal" | "gold";

export interface Reminder {
  /** Stable across loads: "form:<assignment>", "referral:<id>", "session:<appointment>". */
  key: string;
  kind: string;
  level: ReminderLevel;
  /** Sort time within a level (ms). */
  at: number;
  proId: string;
  proName: string;
  tone: ReminderTone;
  title: string;
  detail: string;
  action: string;
}

const byUrgency = (a: Reminder, b: Reminder) => a.level - b.level || a.at - b.at || a.key.localeCompare(b.key);

export interface ReminderGroup {
  proId: string;
  proName: string;
  items: Reminder[];
}

/** One card per professional, most urgent first; one item is a single card, two or more "{n} from {pro}". */
export function groupReminders(reminders: Reminder[]): ReminderGroup[] {
  const by = new Map<string, ReminderGroup>();
  for (const r of [...reminders].sort(byUrgency)) {
    const g = by.get(r.proId) ?? { proId: r.proId, proName: r.proName, items: [] };
    g.items.push(r);
    by.set(r.proId, g);
  }
  return [...by.values()].sort((a, b) => byUrgency(a.items[0], b.items[0]));
}

export const MAX_POPUPS_PER_OPEN = 2;

/**
 * The pop-ups for this app open: levels 1 and 2 only, by level then time, at
 * most two per open (counting those already shown), never one shown before
 * in this open, and never a session the person already acknowledged.
 */
export function popupQueue(reminders: Reminder[], shownThisOpen: ReadonlySet<string>, acknowledged: ReadonlySet<string>, max = MAX_POPUPS_PER_OPEN): Reminder[] {
  const left = Math.max(0, max - shownThisOpen.size);
  return reminders
    .filter((r) => r.level <= 2 && !shownThisOpen.has(r.key) && !acknowledged.has(r.key))
    .sort(byUrgency)
    .slice(0, left);
}

export const HOUR_MS = 3600000;

/** Today's booked session: level 1 inside the hour before it starts, else 3; null once it's over or not today. */
export function sessionLevel(startsAt: string, endsAt: string, now: Date): ReminderLevel | null {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  if (e.getTime() <= now.getTime() || dayDiff(s, now) !== 0) return null;
  return s.getTime() - now.getTime() <= HOUR_MS ? 1 : 3;
}

/** "Session with Rami in 30 min" / "Session with Rami now" / "Session with Rami at 6:00 PM". */
export function sessionTitle(proName: string, startsAt: string, now: Date): string {
  const s = new Date(startsAt);
  const mins = Math.round((s.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return `Session with ${proName} now`;
  if (mins <= 60) return `Session with ${proName} in ${mins} min`;
  return `Session with ${proName} at ${clock12(s)}`;
}

export interface OpenForm {
  assignmentId: string;
  kind: FormKind;
  title: string;
  dueAt: string | null;
  proId: string;
  proName: string;
  /** Visible questions (recovery filter applied). */
  questions: ClientQuestion[];
  answers: Answers;
  /** A draft is saved (a form_responses row exists). */
  hasDraft: boolean;
}

/** CU5 / CU6 / CU26 card lines for an open form. */
export function formReminder(f: OpenForm, now: Date): Reminder {
  const { parts, sectioned } = formParts(f.questions, f.answers);
  const asked = shownQuestions(f.questions, f.answers);
  const total = asked.length;
  const done = asked.filter((q) => isAnswered(f.answers[q.id])).length;
  const due = f.dueAt ? new Date(f.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const base = { key: `form:${f.assignmentId}`, kind: f.kind, level: 3 as const, at: due, proId: f.proId, proName: f.proName };
  const short = dueShort(f.dueAt, now);
  if (f.kind === "intake") {
    return f.hasDraft
      ? { ...base, tone: "gold", title: `Finish your intake for ${f.proName}`, detail: `${done} of ${total} done · saved`, action: "Continue" }
      : { ...base, tone: "gold", title: `Your intake for ${f.proName}`, detail: [`${total} ${total === 1 ? "question" : "questions"}`, minutesText(minutesFor(total))].join(" · "), action: "Start" };
  }
  if (f.hasDraft) {
    const where = parts.length > 1 ? `${sectioned ? "Section" : "Part"} ${resumePart(parts, f.answers) + 1} of ${parts.length}` : `${done} of ${total} done`;
    return { ...base, tone: "pr", title: "Continue your check-in", detail: [where, "saved", short].filter(Boolean).join(" · "), action: "Continue" };
  }
  const dueAt = f.dueAt ? new Date(f.dueAt) : null;
  const title = dueAt && !Number.isNaN(dueAt.getTime()) ? `${weekdayName(dueAt)} check-in is due` : "Your check-in is ready";
  return { ...base, tone: "pr", title, detail: [dueLine(f.dueAt, now), minutesText(minutesFor(total))].filter(Boolean).join(" · "), action: "Start" };
}

export interface PendingReferral {
  id: string;
  fromId: string;
  fromName: string;
  /** The receiving professional's first name (public_profile_summary), or null when unreadable. */
  toName: string | null;
  reason: string;
  createdAt: string;
}

/** CU23 "{pro} wants to refer you to {pro_name}": level 2, needs an answer. */
export function referralReminder(r: PendingReferral): Reminder {
  return {
    key: `referral:${r.id}`,
    kind: "referral",
    level: 2,
    at: new Date(r.createdAt).getTime() || 0,
    proId: r.fromId,
    proName: r.fromName,
    tone: "pr",
    title: referralTitle(r),
    detail: r.reason,
    action: "Review",
  };
}

/**
 * CU23 "{pro} wants to refer you to {pro_name}": one title for the Home
 * card, the pop-up and the sheet (W9: they used to differ).
 */
export function referralTitle(r: PendingReferral): string {
  return r.toName ? `${r.fromName} wants to refer you to ${r.toName}` : `${r.fromName} wants to refer you`;
}

/**
 * The referral pop-up's and sheet's body, under referralTitle (which already
 * names who it goes to). Agreeing sends the referral; no health data moves with it.
 */
export function referralBody(r: PendingReferral): string {
  if (r.toName) return `If you agree, ${r.toName} gets ${r.fromName}'s referral and the reason for it. Nothing else is shared.`;
  return `To another professional. If you agree, they get ${r.fromName}'s referral and the reason for it. Nothing else is shared.`;
}

/**
 * Release A (20261216060000): a referral the receiving professional accepted.
 * Accepting connects nobody; connecting is the client's own second decision
 * (connect_from_referral), where they pick what to share. Not drawn: worded
 * from CU23's referral pop-up, one level-2 item like it.
 */
export interface ConnectReferral {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  /** The receiving professional's first name, or null when unreadable. */
  toName: string | null;
  respondedAt: string;
}

export function connectTitle(r: ConnectReferral): string {
  return r.toName ? `${r.toName} accepted ${r.fromName}'s referral` : `Your referral from ${r.fromName} was accepted`;
}

export function connectBody(r: ConnectReferral): string {
  const who = r.toName ?? "they";
  return r.toName
    ? `Connect to become ${r.toName}'s client. You choose what ${who} can see. Nothing is shared until you do.`
    : "Connect to become their client. You choose what they can see. Nothing is shared until you do.";
}

/** CU23 level 2 (needs an answer), on the referring professional's card like the referral was. */
export function connectReminder(r: ConnectReferral): Reminder {
  return {
    key: `connect:${r.id}`,
    kind: "referral_connect",
    level: 2,
    at: new Date(r.respondedAt).getTime() || 0,
    proId: r.fromId,
    proName: r.fromName,
    tone: "pr",
    title: connectTitle(r),
    detail: "Connect and choose what to share",
    action: "Review",
  };
}

export interface TodaySession {
  id: string;
  proId: string;
  proName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
}

/** CU5 "Session with {pro} in {n} min" / "Today {time} · {session}". */
export function sessionReminder(s: TodaySession, now: Date): Reminder | null {
  const level = sessionLevel(s.startsAt, s.endsAt, now);
  if (!level) return null;
  return {
    key: `session:${s.id}`,
    kind: "session",
    level,
    at: new Date(s.startsAt).getTime(),
    proId: s.proId,
    proName: s.proName,
    tone: "teal",
    title: sessionTitle(s.proName, s.startsAt, now),
    detail: `Today ${clock12(s.startsAt)} · ${s.serviceName}`,
    action: "View",
  };
}

export interface PendingShareAsk {
  id: string;
  proId: string;
  proName: string;
  createdAt: string;
  /** The win in a few words ("New PR · Back squat"), from the card. */
  winTitle: string;
}

/** Release 3 · W8 CU29 "{pro} would like to share your win": level 2, needs an answer. */
export function shareReminder(s: PendingShareAsk): Reminder {
  return {
    key: `share:${s.id}`,
    kind: "share_request",
    level: 2,
    at: new Date(s.createdAt).getTime() || 0,
    proId: s.proId,
    proName: s.proName,
    tone: "pr",
    title: `${s.proName} would like to share your win`,
    detail: s.winTitle,
    action: "Review",
  };
}
