// Round I · FH: Help for members and professionals, from the database
// (Database 20261226480000, HANDOVER_API "Round I · FH"). Pure: the parser,
// the on-device search and the "questions viewed" the person takes with them
// to "Still need help?". Tested without a server.

export interface HelpQuestion {
  id: string;
  key: string;
  question: string;
  answer: string;
}
export interface HelpTopic {
  id: string;
  key: string;
  title: string;
  questions: HelpQuestion[];
}
export interface HelpCenter {
  language: string;
  audience: string;
  topics: HelpTopic[];
  /** support_hours.text (Database 20261226500000), in the language asked for; null from an older database. */
  supportHoursText: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

/** help_center()'s jsonb, or null when it isn't one. Topics or questions missing a field are left out. */
export function parseHelpCenter(data: unknown): HelpCenter | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.topics)) return null;
  const topics: HelpTopic[] = [];
  for (const raw of d.topics) {
    const tp = (raw ?? {}) as Record<string, unknown>;
    const id = str(tp.id);
    const key = str(tp.key);
    const title = str(tp.title);
    if (!id || !key || !title) continue;
    const questions: HelpQuestion[] = [];
    for (const rq of Array.isArray(tp.questions) ? tp.questions : []) {
      const q = (rq ?? {}) as Record<string, unknown>;
      const qid = str(q.id);
      const qkey = str(q.key);
      const question = str(q.question);
      const answer = str(q.answer);
      if (qid && qkey && question && answer) questions.push({ id: qid, key: qkey, question, answer });
    }
    if (questions.length) topics.push({ id, key, title, questions });
  }
  const hours = (d.support_hours ?? {}) as Record<string, unknown>;
  return { language: str(d.language) ?? "en", audience: str(d.audience) ?? "member", topics, supportHoursText: str(hours.text) };
}

/**
 * Text as search compares it: lower case, without accents, Arabic short vowels
 * and the tatweel, and with the Arabic letter variants that are typed
 * interchangeably made one (أ إ آ → ا, ى → ي, ة → ه).
 */
export function foldForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** The questions whose question or answer contains every word typed, in Help's order. */
export function searchHelp(topics: readonly HelpTopic[], query: string): { topic: HelpTopic; question: HelpQuestion }[] {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: { topic: HelpTopic; question: HelpQuestion }[] = [];
  for (const topic of topics)
    for (const question of topic.questions) {
      const hay = foldForSearch(`${question.question} ${question.answer} ${topic.title}`);
      if (words.every((w) => hay.includes(w))) out.push({ topic, question });
    }
  return out;
}

/** The server keeps up to 20 questions viewed per request. */
export const MAX_VIEWED = 20;

export interface Viewed {
  topicId: string;
  topicKey: string;
  questionId: string;
  questionKey: string;
}

/** The questions opened so far, the latest last, each once, the most recent 20. */
export function noteViewed(viewed: readonly Viewed[], next: Viewed): Viewed[] {
  return [...viewed.filter((v) => v.questionId !== next.questionId), next].slice(-MAX_VIEWED);
}

/**
 * What "Still need help?" sends (as data, never posted in the chat): the topic
 * of the last question opened, and every question opened. Null when nothing
 * was opened.
 */
export function helpContext(viewed: readonly Viewed[]): { topicId: string; topicKey: string; questionIds: string[]; questionKeys: string[] } | null {
  const last = viewed[viewed.length - 1];
  if (!last) return null;
  return { topicId: last.topicId, topicKey: last.topicKey, questionIds: viewed.map((v) => v.questionId), questionKeys: viewed.map((v) => v.questionKey) };
}
