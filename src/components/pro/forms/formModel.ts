// Release 3 · W6 Forms and check-ins (MO29, HO20, CL10, CL11): the pure
// rules behind the screens, kept out of React so they're tested on their own.
//
// The database (DB-6, 20261124060000) has seven question types: number (+
// unit), scale (min to max), choice, multi, text, photo, date. The builder's
// ten frame types map onto them:
// - Short text → text; Single choice → choice; Multiple choice → multi;
//   Number with unit → number + unit; Scale 1 to 10 → scale 1..10; Date →
//   date; Photo or file → photo (the form-uploads bucket takes images only);
// - Yes or no → choice with ["Yes", "No"] (as create_weekly_check_in_template
//   writes its own yes / no questions);
// - Body measurements → three number questions (Weight kg, Waist cm, Hips
//   cm), one row each;
// - Long text → long_text (Round D, 20261222000000; answers up to 5,000).
// Round D (20261222050000) adds a form description, sections (a question can
// open one: section_title), one condition per question (show_if) and the
// profile field an answer is offered to the client for (profile_field).
// 20261222080000 (the approved templates) adds the conditions not_equals,
// excludes and in, and lets a question depend on one that has a condition
// itself. Its other new question columns (scale words, placeholder,
// recovery_hidden / recovery_options, pro_note, client_prompt,
// profile_hint) come with a template and are never written by the builder.

import { signedNum } from "../proRules";
import { DAY_LONG } from "../../../utils/week";
import { time12 } from "../../../utils/time12";

export type DbQuestionType = "number" | "scale" | "choice" | "multi" | "text" | "long_text" | "photo" | "date";
export type SafetyTopic = "pain" | "injury" | "illness" | "symptoms";
export type FormKind = "intake" | "check_in";

/** The add-a-question grid (gen/r18.js QT18), in the frame's order. */
export type UiType = "short" | "long" | "single" | "multi" | "number" | "scale" | "date" | "yesno" | "photo" | "body";
export const UI_TYPES: { key: UiType; label: string; available: boolean }[] = [
  { key: "short", label: "Short text", available: true },
  { key: "long", label: "Long text", available: true },
  { key: "single", label: "Single choice", available: true },
  { key: "multi", label: "Multiple choice", available: true },
  { key: "number", label: "Number with unit", available: true },
  { key: "scale", label: "Scale 1 to 10", available: true },
  { key: "date", label: "Date", available: true },
  { key: "yesno", label: "Yes or no", available: true },
  { key: "photo", label: "Photo or file", available: true },
  { key: "body", label: "Body measurements", available: true },
];

export const OPTIONS_MAX = 20;
export const PROMPT_MAX = 300;
export const TITLE_MAX = 80;
export const UNIT_MAX = 20;
export const REPLY_MAX = 1000;
export const DESCRIPTION_MAX = 1000;
export const SECTION_MAX = 80;
/** A long text answer (save_form_response refuses more). */
export const LONG_TEXT_MAX = 5000;

/**
 * One condition (form_questions.show_if): ask this question only when an
 * earlier question's answer equals / is not / is one of some values (choice,
 * yes / no, scale), or a multiple-choice answer includes / doesn't include an
 * option. The earlier question may have a condition itself (20261222080000):
 * questions are judged in order, and a hidden one hides those that depend on
 * it. The builder creates equals and includes; the others come with a
 * template and are kept as they are.
 */
export type ShowIf =
  | { questionId: string; op: "equals" | "includes" | "not_equals" | "excludes"; value: string }
  | { questionId: string; op: "in"; value: string[] };
export type ShowIfOp = ShowIf["op"];

/** form_questions.profile_field: what the client is offered to add to their profile. */
export type ProfileField = "allergies" | "dietary_restrictions" | "medications" | "injuries" | "weight";
export const PROFILE_FIELD_LABEL: Record<ProfileField, string> = {
  allergies: "Allergies",
  dietary_restrictions: "Dietary needs",
  medications: "Medications",
  injuries: "Injuries",
  weight: "Weight",
};

/** One question as the builder holds it (a form_questions row, or a new one). */
export interface QuestionDraft {
  /** The row id, or a local "new-…" key until it's saved. */
  id: string;
  saved: boolean;
  type: DbQuestionType;
  prompt: string;
  unit: string | null;
  required: boolean;
  options: string[] | null;
  scaleMin: number | null;
  scaleMax: number | null;
  safetyTopic: SafetyTopic | null;
  safetyTrigger: Record<string, unknown> | null;
  /** This question opens a section with this title ("" while being written). */
  sectionTitle: string | null;
  showIf: ShowIf | null;
  profileField: ProfileField | null;
  /**
   * Answers a rule copied from a template names (a recovery-sensitive rule,
   * a note for the professional, or what the client is shown straight away):
   * they can't be renamed or removed. Read with the question, never written.
   */
  fixedOptions?: string[];
}

let seq = 0;
export const newKey = () => `new-${Date.now().toString(36)}-${(seq += 1)}`;

const blank = (type: DbQuestionType, prompt: string, extra: Partial<QuestionDraft> = {}): QuestionDraft => ({
  id: newKey(),
  saved: false,
  type,
  prompt,
  unit: null,
  required: false,
  options: null,
  scaleMin: null,
  scaleMax: null,
  safetyTopic: null,
  safetyTrigger: null,
  sectionTitle: null,
  showIf: null,
  profileField: null,
  ...extra,
});

/** New questions for a frame type: empty prompts, the type's own defaults. */
export function questionsFor(ui: UiType): QuestionDraft[] {
  switch (ui) {
    case "short":
      return [blank("text", "")];
    case "single":
      return [blank("choice", "", { options: ["", ""] })];
    case "multi":
      return [blank("multi", "", { options: ["", ""] })];
    case "number":
      return [blank("number", "", { unit: "" })];
    case "scale":
      return [blank("scale", "", { scaleMin: 1, scaleMax: 10 })];
    case "date":
      return [blank("date", "")];
    case "yesno":
      return [blank("choice", "", { options: ["Yes", "No"] })];
    case "photo":
      return [blank("photo", "")];
    case "body":
      return [blank("number", "Weight", { unit: "kg" }), blank("number", "Waist", { unit: "cm" }), blank("number", "Hips", { unit: "cm" })];
    case "long":
      return [blank("long_text", "")];
  }
}

/** The card's caps label for a stored question. */
export function typeLabel(q: Pick<QuestionDraft, "type" | "options" | "scaleMin" | "scaleMax">): string {
  switch (q.type) {
    case "text":
      return "Short text";
    case "long_text":
      return "Long text";
    case "choice":
      return isYesNo(q.options) ? "Yes or no" : "Single choice";
    case "multi":
      return "Multiple choice";
    case "number":
      return "Number with unit";
    case "scale":
      return `Scale ${q.scaleMin ?? 1} to ${q.scaleMax ?? 10}`;
    case "date":
      return "Date";
    case "photo":
      return "Photo or file";
  }
}

export const isYesNo = (o: string[] | null) => !!o && o.length === 2 && o[0] === "Yes" && o[1] === "No";

/** Which frame type's icon a stored question uses. */
export function uiTypeOf(q: Pick<QuestionDraft, "type" | "options">): UiType {
  switch (q.type) {
    case "text":
      return "short";
    case "long_text":
      return "long";
    case "choice":
      return isYesNo(q.options) ? "yesno" : "single";
    case "multi":
      return "multi";
    case "number":
      return "number";
    case "scale":
      return "scale";
    case "date":
      return "date";
    case "photo":
      return "photo";
  }
}

/** Why a question can't be saved yet, or null. */
export function questionProblem(q: QuestionDraft): string | null {
  const p = q.prompt.trim();
  if (!p) return "Write the question.";
  if (p.length > PROMPT_MAX) return `Keep the question under ${PROMPT_MAX} characters.`;
  if (q.type === "choice" || q.type === "multi") {
    const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return "Add at least two answers.";
    if (opts.length > OPTIONS_MAX) return `Up to ${OPTIONS_MAX} answers.`;
    if (new Set(opts).size !== opts.length) return "Each answer once.";
  }
  if (q.type === "number" && (q.unit ?? "").trim().length > UNIT_MAX) return `Keep the unit under ${UNIT_MAX} characters.`;
  if (q.type === "scale" && (q.scaleMin == null || q.scaleMax == null || q.scaleMin >= q.scaleMax)) return "The scale needs a low and a high end.";
  if (q.sectionTitle != null) {
    const t = q.sectionTitle.trim();
    if (!t) return "Give the section a title.";
    if (t.length > SECTION_MAX) return `Keep the section title under ${SECTION_MAX} characters.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Conditions ("Only ask if…") and profile fields (Round D, 20261222050000)
// ---------------------------------------------------------------------------

/** The kinds a condition can depend on: single choice and yes / no, multiple choice, scale. */
const CONDITION_TYPES: DbQuestionType[] = ["choice", "multi", "scale"];

/** The condition the builder creates: "equals" for a single answer, "includes" for a multiple-choice one. */
export const conditionOp = (parent: Pick<QuestionDraft, "type">): "equals" | "includes" => (parent.type === "multi" ? "includes" : "equals");

/** Every condition a parent of this kind can carry (the database's pairs), in the order the builder offers them. */
export const opsFor = (parent: Pick<QuestionDraft, "type">): ShowIfOp[] => (parent.type === "multi" ? ["includes", "excludes"] : ["equals", "not_equals", "in"]);

/** The builder's words for each kind ("is not none" is Doesn't include None). */
export const OP_LABEL: Record<ShowIfOp, string> = { equals: "Is", not_equals: "Is not", in: "Is either of", includes: "Includes", excludes: "Doesn't include" };

/** The answers a condition names (one, or the list of "in"). */
export const conditionAnswers = (c: ShowIf): string[] => (c.op === "in" ? c.value : [c.value]);

/**
 * Where the builder's sheet starts for this parent: the stored condition when
 * it names this parent (any kind), else "is" / "includes" with nothing picked.
 */
export function sheetCondition(c: ShowIf | null, parent: Pick<QuestionDraft, "id" | "type">): { op: ShowIfOp; picked: string[] } {
  if (c && c.questionId === parent.id && opsFor(parent).includes(c.op)) return { op: c.op, picked: conditionAnswers(c) };
  return { op: conditionOp(parent), picked: [] };
}

/** The condition the sheet saves: one answer, or the list for "is either of"; null with nothing picked. */
export function sheetShowIf(parentId: string, op: ShowIfOp, picked: string[]): ShowIf | null {
  if (!picked.length) return null;
  return op === "in" ? { questionId: parentId, op, value: [...picked] } : { questionId: parentId, op, value: picked[0] };
}

/** The answers a condition can name: the options, or a scale's numbers. */
export function conditionValues(parent: Pick<QuestionDraft, "type" | "options" | "scaleMin" | "scaleMax">): string[] {
  if (parent.type === "scale") {
    const lo = parent.scaleMin ?? 1;
    const hi = parent.scaleMax ?? 10;
    return hi > lo ? Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i)) : [];
  }
  return [...new Set((parent.options ?? []).map((o) => o.trim()).filter(Boolean))];
}

/**
 * The questions the one at `index` can depend on: earlier, a choice, yes /
 * no, multiple choice or scale question, and written. A parent may have a
 * condition itself, and a question others depend on may take one (chains,
 * 20261222080000): a parent always comes earlier, so a chain can't loop.
 */
export function conditionParents(draft: QuestionDraft[], index: number): QuestionDraft[] {
  if (!draft[index]) return [];
  return draft.slice(0, index).filter((p) => CONDITION_TYPES.includes(p.type) && !!p.prompt.trim() && conditionValues(p).length > 0);
}

/** Why the condition on the question at `index` can't be saved, or null. */
export function conditionProblem(draft: QuestionDraft[], index: number): string | null {
  const c = draft[index]?.showIf;
  if (!c) return null;
  const at = draft.findIndex((p) => p.id === c.questionId);
  if (at === -1) return "The question this depends on was removed. Choose another.";
  if (at >= index) return "Move this below the question it depends on.";
  const parent = draft[at];
  if (!CONDITION_TYPES.includes(parent.type) || !opsFor(parent).includes(c.op)) return "Choose the condition again.";
  const named = conditionAnswers(c);
  const values = conditionValues(parent);
  if (!named.length || named.some((v) => !values.includes(v))) return "The answer this depends on changed. Choose it again.";
  return null;
}

/** "A or B", "A, B or C". */
const orList = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

/** A condition in plain words: "is Yes", "is not 0", "includes Home", "doesn't include None", "is Some days or Not this week". */
export function conditionWords(c: ShowIf): string {
  switch (c.op) {
    case "equals":
      return `is ${c.value}`;
    case "not_equals":
      return `is not ${c.value}`;
    case "includes":
      return `includes ${c.value}`;
    case "excludes":
      return `doesn't include ${c.value}`;
    case "in":
      return `is ${orList(c.value)}`;
  }
}

/** 'Only ask if "Any allergies?" is Yes' / '… includes Peanuts' / '… is not 0'; null without a condition. */
export function conditionLine(draft: Pick<QuestionDraft, "id" | "prompt">[], q: Pick<QuestionDraft, "showIf">): string | null {
  const c = q.showIf;
  if (!c) return null;
  const parent = draft.find((p) => p.id === c.questionId);
  const what = parent?.prompt.trim() ? `"${parent.prompt.trim()}"` : "an earlier question";
  return `Only ask if ${what} ${conditionWords(c)}`;
}

/** Removing a question clears the conditions that named it. */
export function withoutQuestion(draft: QuestionDraft[], id: string): QuestionDraft[] {
  return draft.filter((x) => x.id !== id).map((x) => (x.showIf?.questionId === id ? { ...x, showIf: null } : x));
}

/**
 * The profile fields a question's answer can be offered for (the database's
 * pairs, 20261222080000): allergies and dietary needs from a choice, short
 * or long text question (a long text one per line), medications and injuries
 * from short or long text, weight from a number. A yes / no question names
 * nothing to carry, so it offers none.
 */
export function profileFieldsFor(q: Pick<QuestionDraft, "type" | "options">): ProfileField[] {
  const out: ProfileField[] = [];
  if ((q.type === "choice" && !isYesNo(q.options)) || q.type === "multi" || q.type === "text" || q.type === "long_text") out.push("allergies", "dietary_restrictions");
  if (q.type === "text" || q.type === "long_text") out.push("medications", "injuries");
  if (q.type === "number") out.push("weight");
  return out;
}

/** "Section 2" for the question at `index` that opens it (1-based count of section openers so far). */
export const sectionNumber = (draft: QuestionDraft[], index: number) => draft.slice(0, index + 1).filter((x) => x.sectionTitle != null).length;

/**
 * The form_questions columns a draft writes (position from its index): the
 * builder's own. The template-only columns (scale words, placeholder,
 * recovery_hidden / recovery_options, pro_note, client_prompt, profile_hint)
 * are never sent, so an update leaves them as they are.
 */
export function toRow(q: QuestionDraft, position: number, ids: ReadonlyMap<string, string> = new Map()) {
  const opts = q.type === "choice" || q.type === "multi" ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : null;
  return {
    position,
    type: q.type,
    prompt: q.prompt.trim(),
    unit: q.type === "number" ? (q.unit ?? "").trim() || null : null,
    required: q.required,
    options: opts,
    scale_min: q.type === "scale" ? q.scaleMin : null,
    scale_max: q.type === "scale" ? q.scaleMax : null,
    safety_topic: q.safetyTopic,
    safety_trigger: q.safetyTrigger,
    section_title: q.sectionTitle?.trim() || null,
    show_if: showIfRow(q.showIf, ids),
    profile_field: q.profileField,
  };
}

export const isLocalKey = (id: string) => id.startsWith("new-");

/**
 * show_if as stored: {"question_id", and one of "equals", "includes",
 * "not_equals", "excludes" (an answer) or "in" (a list)}, written back exactly
 * as read. A condition on a question that isn't saved yet has no row id to
 * name: `ids` maps local keys to the new ids; without one it's null, and
 * saveForm writes it in a second pass.
 */
export function showIfRow(c: ShowIf | null, ids: ReadonlyMap<string, string> = new Map()): Record<string, string | string[]> | null {
  if (!c) return null;
  const id = isLocalKey(c.questionId) ? ids.get(c.questionId) : c.questionId;
  return id ? { question_id: id, [c.op]: c.value } : null;
}

export function parseShowIf(raw: unknown): ShowIf | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.question_id !== "string") return null;
  if (typeof r.equals === "string") return { questionId: r.question_id, op: "equals", value: r.equals };
  if (typeof r.includes === "string") return { questionId: r.question_id, op: "includes", value: r.includes };
  if (typeof r.not_equals === "string") return { questionId: r.question_id, op: "not_equals", value: r.not_equals };
  if (typeof r.excludes === "string") return { questionId: r.question_id, op: "excludes", value: r.excludes };
  if (Array.isArray(r.in)) return { questionId: r.question_id, op: "in", value: r.in.filter((x): x is string => typeof x === "string") };
  return null;
}

const PROFILE_FIELDS = Object.keys(PROFILE_FIELD_LABEL) as ProfileField[];
export const asProfileField = (v: unknown): ProfileField | null => (PROFILE_FIELDS.includes(v as ProfileField) ? (v as ProfileField) : null);

export interface QuestionRow {
  id: string;
  position: number;
  type: DbQuestionType;
  prompt: string;
  unit: string | null;
  required: boolean;
  options: unknown;
  scale_min: number | null;
  scale_max: number | null;
  safety_topic: string | null;
  safety_trigger: unknown;
  section_title?: string | null;
  show_if?: unknown;
  profile_field?: string | null;
  /** 20261222080000, read only: the rules that can name this question's answers. */
  recovery_options?: unknown;
  pro_note?: unknown;
  client_prompt?: unknown;
}

/**
 * The answers a question's rules name (Karim, 2026-10-29: renaming one is
 * locked only then). recovery_options names them by key (the database
 * refuses a rename while it does); a note's or a prompt's "answers" /
 * "other_than" list names them (a rename would quietly stop it matching,
 * and the prompt is what shows "call 112"). Only the question's own
 * options, in their order.
 */
export function optionsNamedByRules(r: Pick<QuestionRow, "options" | "recovery_options" | "pro_note" | "client_prompt">): string[] {
  const options = Array.isArray(r.options) ? r.options.map((o) => String(o)) : [];
  const named = new Set<string>();
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  for (const k of Object.keys(obj(r.recovery_options) ?? {})) named.add(k);
  for (const rule of [obj(r.pro_note), obj(r.client_prompt)]) {
    for (const key of ["answers", "other_than"]) {
      const list = rule?.[key];
      if (Array.isArray(list)) for (const x of list) if (typeof x === "string") named.add(x);
    }
  }
  return options.filter((o) => named.has(o));
}

export function fromRow(r: QuestionRow): QuestionDraft {
  const topic = r.safety_topic === "pain" || r.safety_topic === "injury" || r.safety_topic === "illness" || r.safety_topic === "symptoms" ? r.safety_topic : null;
  return {
    id: r.id,
    saved: true,
    type: r.type,
    prompt: r.prompt,
    unit: r.unit,
    required: r.required,
    options: Array.isArray(r.options) ? r.options.map((o) => String(o)) : null,
    scaleMin: r.scale_min,
    scaleMax: r.scale_max,
    safetyTopic: topic,
    safetyTrigger: r.safety_trigger && typeof r.safety_trigger === "object" && !Array.isArray(r.safety_trigger) ? (r.safety_trigger as Record<string, unknown>) : null,
    sectionTitle: r.section_title ?? null,
    showIf: parseShowIf(r.show_if),
    profileField: asProfileField(r.profile_field),
    fixedOptions: optionsNamedByRules(r),
  };
}

/** What changed between the saved questions and the draft: rows to insert, update and delete. */
export function diffQuestions(saved: QuestionDraft[], draft: QuestionDraft[]) {
  const before = new Map(saved.map((q) => [q.id, q]));
  const insert: { index: number; q: QuestionDraft }[] = [];
  const update: { id: string; index: number; q: QuestionDraft }[] = [];
  draft.forEach((q, index) => {
    const old = before.get(q.id);
    if (!old) return insert.push({ index, q });
    const a = toRow(old, saved.indexOf(old));
    const b = toRow(q, index);
    if (JSON.stringify(a) !== JSON.stringify(b)) update.push({ id: q.id, index, q });
  });
  const keep = new Set(draft.map((q) => q.id));
  const remove = saved.filter((q) => !keep.has(q.id)).map((q) => q.id);
  return { insert, update, remove };
}

// ---------------------------------------------------------------------------
// Safety (DECISIONS_PROFESSIONAL "Safety"; FINAL_PLAN 2.5 and 3 §6.2)
// ---------------------------------------------------------------------------

export const SAFETY_LABEL: Record<SafetyTopic, string> = { pain: "pain", injury: "an injury", illness: "illness", symptoms: "worrying symptoms" };

/** "pain", "pain and an injury", "pain, an injury and illness". */
export function topicsPhrase(topics: string[]): string {
  const words = topics.map((t) => SAFETY_LABEL[t as SafetyTopic] ?? t);
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** FINAL_PLAN 3 §6.2: "Answers mention {safety_topic}. Suggest {client_first_name} talks to a doctor." */
export const safetyBanner = (topics: string[], firstName: string) => `Answers mention ${topicsPhrase(topics)}. Suggest ${firstName} talks to a doctor.`;

// ---------------------------------------------------------------------------
// Schedules (form_assignments.schedule: daily@HH:MM, weekly:<1-7>@HH:MM, and
// since Round D every2weeks:<1-7>@HH:MM / every4weeks:<1-7>@HH:MM, ISO weekday;
// the database counts whole weeks from the series' first week)
// ---------------------------------------------------------------------------

export type ScheduleEvery = 1 | 2 | 4;

export interface Schedule {
  /** null = every day; 1 Monday to 7 Sunday. */
  isoDay: number | null;
  /** "HH:MM", 24-hour (stored as written). */
  time: string;
  /** Every week (the default), every 2 or every 4 weeks; ignored for every day. */
  every?: ScheduleEvery;
}

const EVERY_KEY: Record<ScheduleEvery, string> = { 1: "weekly", 2: "every2weeks", 4: "every4weeks" };

export function scheduleString(s: Schedule): string {
  return s.isoDay == null ? `daily@${s.time}` : `${EVERY_KEY[s.every ?? 1]}:${s.isoDay}@${s.time}`;
}

export function parseSchedule(v: string | null | undefined): Schedule | null {
  if (!v) return null;
  const m = /^(daily|(weekly|every2weeks|every4weeks):([1-7]))@([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(v);
  if (!m) return null;
  const time = `${m[4]}:${m[5]}`;
  if (!m[3]) return { isoDay: null, time };
  return { isoDay: Number(m[3]), time, every: m[2] === "every2weeks" ? 2 : m[2] === "every4weeks" ? 4 : 1 };
}

/** "Every week · Sunday 6:00 PM" / "Every 2 weeks · Monday 9:00 AM" / "Every day · 8:00 AM". */
export function scheduleLine(s: Schedule): string {
  if (s.isoDay == null) return `Every day · ${time12(s.time)}`;
  const every = (s.every ?? 1) === 1 ? "Every week" : `Every ${s.every} weeks`;
  return `${every} · ${DAY_LONG[s.isoDay - 1]} ${time12(s.time)}`;
}

/** Times offered in the schedule sheet: every 30 minutes, 6 AM to 10 PM. */
export const SCHEDULE_TIMES: string[] = Array.from({ length: 33 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** One answer by question: answers are keyed by question id (save_form_response). */
export function answerFor(answers: Record<string, unknown>, q: { id: string }): unknown {
  return q.id in answers ? answers[q.id] : undefined;
}

export const isAnswered = (v: unknown) => v != null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && v.length === 0);

/** Paths of photo answers (a string or a list of strings). */
export function photoPaths(v: unknown): string[] {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && !!x.trim());
  return [];
}

const fmtDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** An answer as text (photos are drawn, not written). */
export function answerText(q: Pick<QuestionDraft, "type" | "unit" | "scaleMax">, v: unknown): string {
  if (!isAnswered(v)) return "Not answered";
  switch (q.type) {
    case "number": {
      const n = Number(v);
      return Number.isFinite(n) ? `${n}${q.unit ? ` ${q.unit}` : ""}` : String(v);
    }
    case "scale":
      return `${String(v)} of ${q.scaleMax ?? 10}`;
    case "multi":
      return Array.isArray(v) ? v.map(String).join(", ") : String(v);
    case "date":
      return typeof v === "string" ? fmtDate(v) : String(v);
    case "photo": {
      const n = photoPaths(v).length;
      return n === 1 ? "1 photo" : `${n} photos`;
    }
    default:
      return Array.isArray(v) ? v.map(String).join(", ") : String(v);
  }
}

export const numericAnswer = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** "+2", "-0.5", "0": a change, rounded to one decimal. */
export function deltaText(now: number, was: number): string {
  const d = Math.round((now - was) * 10) / 10;
  return signedNum(d);
}

/** Count of answered questions, for "{n} of {n} answered". */
export function answeredCount(questions: { id: string; position: number }[], answers: Record<string, unknown>): number {
  return questions.filter((q) => isAnswered(answerFor(answers, q))).length;
}

// ---------------------------------------------------------------------------
// Row shapes the services return (kept here so the pure files need no service)
// ---------------------------------------------------------------------------

export interface FormAssignment {
  id: string;
  formId: string;
  clientId: string;
  /** Set on a schedule's series row. */
  schedule: string | null;
  dueAt: string | null;
  status: "series" | "due" | "submitted" | "missed" | "cancelled";
  seriesId: string | null;
}

export interface FormSummary {
  id: string;
  kind: FormKind;
  title: string;
  questionCount: number;
  updatedAt: string;
  /** forms.send_on_hire: assigned when someone hires the professional. */
  sendOnHire?: boolean;
}

/** A row of list_form_templates (Round D, 20261222060000). */
export interface FormTemplate {
  key: string;
  lane: string;
  kind: FormKind;
  title: string;
  description: string | null;
  questionCount: number;
  /** false: not ready yet (Coming soon). */
  available: boolean;
}
