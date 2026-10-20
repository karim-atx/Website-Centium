// Release 3 · W6 HO20 / CL11 / CL10: what a response shows, from its own
// answers and the earlier responses to the same form (decision 6: each
// submitted response is shared with the professional it was sent to; nothing
// else about the client is read here). Pure.

import { answerFor, deltaText, isAnswered, numericAnswer, photoPaths, type QuestionDraft } from "./formModel";

export type PositionedQuestion = QuestionDraft & { position: number };

export interface ResponseLike {
  id: string;
  answers: Record<string, unknown>;
  submittedAt: string;
}

export interface NumberBox {
  questionId: string;
  label: string;
  value: string;
  unit: string;
  delta: string | null;
  was: number | null;
  spark: number[] | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * HO20 boxes (nboxes16): one per number or scale question this response
 * answered; the delta and "Was" against the previous response that answered
 * it; the spark over the last six answers, oldest first. `history` is every
 * response to the same form by the same client, newest first, this one
 * included.
 */
export function numberBoxes(questions: PositionedQuestion[], current: ResponseLike, history: ResponseLike[]): NumberBox[] {
  const older = history.filter((h) => h.submittedAt < current.submittedAt);
  const out: NumberBox[] = [];
  for (const q of questions) {
    if (q.type !== "number" && q.type !== "scale") continue;
    const v = numericAnswer(answerFor(current.answers, q));
    if (v == null) continue;
    const prevs = older.map((h) => numericAnswer(answerFor(h.answers, q))).filter((x): x is number => x != null);
    const was = prevs.length ? prevs[0] : null;
    const series = [...prevs.slice(0, 5).reverse(), v];
    out.push({
      questionId: q.id,
      label: q.prompt,
      value: String(round1(v)),
      unit: q.type === "scale" ? `/${q.scaleMax ?? 10}` : q.unit ?? "",
      delta: was == null ? null : deltaText(v, was),
      was,
      spark: series.length >= 2 ? series : null,
    });
  }
  return out;
}

/** The week number of a response: its place among this client's responses to the form, oldest = 1. */
export function weekNumber(current: ResponseLike, history: ResponseLike[]): number {
  return history.filter((h) => h.submittedAt <= current.submittedAt).length || 1;
}

/** Photo answers of a response, by question. */
export function photoAnswers(questions: PositionedQuestion[], r: ResponseLike): { q: PositionedQuestion; paths: string[] }[] {
  return questions.filter((q) => q.type === "photo").map((q) => ({ q, paths: photoPaths(answerFor(r.answers, q)) })).filter((x) => x.paths.length > 0);
}

/** The rest (text, choices, dates; unanswered numbers too) as label and value rows. */
export function textQuestions(questions: PositionedQuestion[], r: ResponseLike): PositionedQuestion[] {
  return questions.filter((q) => {
    if (q.type === "photo") return false;
    if (q.type === "number" || q.type === "scale") return numericAnswer(answerFor(r.answers, q)) == null;
    return true;
  });
}

/** CL11: one series per number / scale question across responses (oldest first), with x labels. */
export interface AnswerSeries {
  key: string;
  label: string;
  unit: string;
  max: number | null;
  points: { at: string; value: number | null; responseId: string }[];
}

export function seriesOverTime(questions: PositionedQuestion[], responses: ResponseLike[]): AnswerSeries[] {
  const oldestFirst = responses.slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const byPrompt = new Map<string, AnswerSeries>();
  for (const q of questions) {
    if (q.type !== "number" && q.type !== "scale") continue;
    const key = `${q.type}:${q.prompt.trim().toLowerCase()}:${q.unit ?? ""}`;
    if (!byPrompt.has(key)) byPrompt.set(key, { key, label: q.prompt, unit: q.type === "scale" ? `/${q.scaleMax ?? 10}` : q.unit ?? "", max: q.type === "scale" ? q.scaleMax ?? 10 : null, points: [] });
  }
  for (const s of byPrompt.values()) {
    for (const r of oldestFirst) {
      const q = questions.find((x) => (x.type === "number" || x.type === "scale") && `${x.type}:${x.prompt.trim().toLowerCase()}:${x.unit ?? ""}` === s.key && isAnswered(answerFor(r.answers, x)));
      s.points.push({ at: r.submittedAt, value: q ? numericAnswer(answerFor(r.answers, q)) : null, responseId: r.id });
    }
  }
  return [...byPrompt.values()].filter((s) => s.points.some((p) => p.value != null));
}
