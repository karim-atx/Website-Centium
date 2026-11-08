// Round K · DW "Before you start" (Database 20261226550000): the pure parts.
// The form's words come from readiness_form() by key, word for word from the
// approved files; the outcome is worked out on the server. Here: the answer
// keys, "None of these" on its own, what makes the form sendable, the
// clearance's limits, and the answers back into readable lines.

export type ReadinessOutcome = "cleared" | "start_light" | "see_doctor";
export type ReadinessLabel = ReadinessOutcome | "cleared_by_doctor";
export type ReadinessIntensity = "light_moderate" | "vigorous";

export const CONDITIONS = ["heart_vascular", "diabetes", "kidney"] as const;
export const WARNING_SIGNS = ["chest_discomfort", "breathless", "dizzy_or_faint", "breathless_lying_down", "swollen_ankles", "heartbeat", "leg_cramps", "heart_murmur", "unusual_tiredness"] as const;
export const INTENSITIES: readonly ReadinessIntensity[] = ["light_moderate", "vigorous"];
export const NONE = "none";

/** submit_readiness_form's p_note limit. */
export const NOTE_MAX = 1000;
/** record_medical_clearance's p_note limit. */
export const CLEARANCE_NOTE_MAX = 500;

export interface ReadinessAnswers {
  exercisesRegularly: boolean | null;
  conditions: string[];
  warningSigns: string[];
  intensity: ReadinessIntensity | null;
  note: string;
}

export const EMPTY_ANSWERS: ReadinessAnswers = { exercisesRegularly: null, conditions: [], warningSigns: [], intensity: null, note: "" };

/** A choose-all-that-apply tap: "None of these" stands alone, any other option clears it. */
export function toggleKey(list: readonly string[], key: string): string[] {
  if (list.includes(key)) return list.filter((k) => k !== key);
  if (key === NONE) return [NONE];
  return [...list.filter((k) => k !== NONE), key];
}

/** Every question answered (the note is optional), within the note's limit. */
export function canSend(a: ReadinessAnswers): boolean {
  return a.exercisesRegularly !== null && a.conditions.length > 0 && a.warningSigns.length > 0 && a.intensity !== null && a.note.length <= NOTE_MAX;
}

/** The call's arguments; null until canSend. */
export function submitArgs(a: ReadinessAnswers): Record<string, unknown> | null {
  if (!canSend(a)) return null;
  const note = a.note.trim();
  return { p_exercises_regularly: a.exercisesRegularly, p_conditions: a.conditions, p_warning_signs: a.warningSigns, p_intensity: a.intensity, p_note: note || null };
}

/** The clearance's date check: optional, never after today (both yyyy-mm-dd, local). */
export function clearanceDateOk(date: string, today: string): boolean {
  return !date || (/^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today);
}

/** The words for a key, or "" when the server has none (a missing key never shows the key itself). */
export const word = (texts: Readonly<Record<string, string>>, key: string): string => texts[key] ?? "";

/**
 * The member's heading: outcome.<label>.title, with the label from
 * my_readiness() (Database #84, 2026-11-08). Before a clearance the label is
 * the outcome; once cleared it's outcome.cleared_by_doctor.title, "Cleared by
 * your doctor". The professional reads pro.label.<label> instead.
 */
export function memberHeadingKey(label: ReadinessLabel): string {
  return `outcome.${label}.title`;
}

export const isOutcome = (v: unknown): v is ReadinessOutcome => v === "cleared" || v === "start_light" || v === "see_doctor";
export const isLabel = (v: unknown): v is ReadinessLabel => isOutcome(v) || v === "cleared_by_doctor";

export interface AnswerLine {
  /** The question's prompt (q1.prompt …), or the note's. */
  prompt: string;
  answer: string;
}

/** The answers as the form's own words, in the form's order. */
export function answerLines(texts: Readonly<Record<string, string>>, a: { exercisesRegularly: boolean | null; conditions: readonly string[] | null; warningSigns: readonly string[] | null; intensity: string | null; note: string | null }): AnswerLine[] {
  const list = (q: string, keys: readonly string[] | null) => (keys ?? []).map((k) => word(texts, `${q}.${k}`)).filter(Boolean).join("; ");
  const lines: AnswerLine[] = [
    { prompt: word(texts, "q1.prompt"), answer: a.exercisesRegularly === null ? "" : word(texts, a.exercisesRegularly ? "q1.yes" : "q1.no") },
    { prompt: word(texts, "q2.prompt"), answer: list("q2", a.conditions) },
    { prompt: word(texts, "q3.prompt"), answer: list("q3", a.warningSigns) },
    { prompt: word(texts, "q4.prompt"), answer: a.intensity ? word(texts, `q4.${a.intensity}`) : "" },
  ];
  const note = a.note?.trim();
  if (note) lines.push({ prompt: word(texts, "note.prompt"), answer: note });
  return lines.filter((l) => l.prompt && l.answer);
}

/** The numbers in the server's urgent_numbers line ("… on 140 or 112."), for Call buttons. */
export function callNumbers(line: string | null): string[] {
  return line ? [...line.matchAll(/\b\d{2,4}\b/g)].map((m) => m[0]) : [];
}
