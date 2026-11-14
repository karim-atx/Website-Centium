// Round G3 · the Premium content (Centium programmes, the meditation library,
// journal prompts) and the Premium readers (the weekly review, target
// suggestions, the doctor summary, lab report comparison and biomarker
// trends): the pure half (parsers, decisions, sentences). No React and no
// Supabase, so the tests read it directly.
//
// Contract: Database Round G3 (PR #57, migrations 20261226260000-280000;
// design-handover/round-g/DB_G3_HANDOVER.md).
//
// THE TWO RULES:
//   - with the switch off (premium_on false, still loading, a call answering
//     ATXQ0, or a Database without the function), NONE OF G3 SHOWS: every
//     decision here reads a missing answer as "hidden";
//   - the content comes from the Database in the member's language
//     (app_preferences.language; G fixes 3), with the same ids, slugs and
//     numbers in either. Only the UI labels around it go through t(); the
//     parsers below never translate a content field, and the readers re-read
//     when the language changes (contentCacheKey).

import { t, tk, tn } from "../../i18n/core";
import { isMissingFunction } from "./g2";
import type { MyPremium } from "./model";
import { surgeryDate, type DatePrecision } from "../../utils/recordDates";

type Row = Record<string, unknown>;
type Err = { code?: string | null; message?: string | null; details?: string | null; status?: number | null } | null | undefined;

const rowsOf = (data: unknown): Row[] => (Array.isArray(data) ? data : []).filter((x): x is Row => !!x && typeof x === "object");
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown): number => {
  const n = num(v);
  return n === null ? 0 : Math.max(0, Math.floor(n));
};
const ymd = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

// ---- hidden while off ----

/** G3 may show at all: the switch known to be on (loading and unknown read as off). */
export const g3On = (p: Pick<MyPremium, "premiumOn"> | null | undefined): boolean => p?.premiumOn === true;

/**
 * The key a G3 answer is kept under: the account, the app language and what
 * was asked. The content answers in the member's language (G fixes 3), so
 * switching language never keeps the other language's copy.
 */
export const contentCacheKey = (userId: string | null | undefined, language: string, key = ""): string => `${userId ?? ""}|${language}|${key}`;

/** ATXQ0 from a G3 call: the switch is off for the caller. */
export function isSwitchOff(e: Err): boolean {
  if (!e) return false;
  return e.code === "ATXQ0" || /\bATXQ0\b/.test(e.message ?? "");
}

/** ATXQ1 from a G3 call: that part needs Premium. */
export function isPremiumRefusal(e: Err): boolean {
  if (!e) return false;
  return e.code === "ATXQ1" || /\bATXQ1\b/.test(e.message ?? "");
}

/**
 * What a failed G3 read means on screen: "hidden" (ATXQ0, or a Database
 * without G3: show nothing new), "premium" (ATXQ1: the locked state and the
 * prompt), or "error" (anything else: a calm retry line).
 */
export type FailKind = "hidden" | "premium" | "error";
export function failKind(e: Err): FailKind {
  if (isSwitchOff(e) || isMissingFunction(e)) return "hidden";
  if (isPremiumRefusal(e)) return "premium";
  return "error";
}

/** A G3 screen's state: hidden until the switch is known on and the call answered. */
export type G3State<T> = { kind: "hidden" } | { kind: "loading" } | { kind: "premium" } | { kind: "error"; message: string } | { kind: "ready"; value: T };

/** The state a screen renders: the switch first, then the call's answer. */
export function g3State<T>(p: Pick<MyPremium, "premiumOn"> | null | undefined, answer: G3State<T> | null): G3State<T> {
  if (!g3On(p)) return { kind: "hidden" };
  return answer ?? { kind: "loading" };
}

/**
 * Batch D GB · does a G3 route show? "no" only when the server said so: the
 * Premium switch is off for the account (my_premium answered premium_on
 * false), or premium_content_lines() answered hidden (ATXQ0, a Database
 * without G3). A read that FAILED or was offline, my_premium's or the
 * probe's, is "error": the route stays and offers Retry, so a cold start
 * from the Monday push never lands on Home because of a bad connection.
 * `content` is the probe's answer, null until it arrives.
 */
export type G3Probe = "loading" | "yes" | "no" | "error";
export function g3ProbeDecision(premium: { loading: boolean; failed: boolean; on: boolean }, content: G3State<unknown> | null): G3Probe {
  if (premium.loading) return "loading";
  if (premium.failed) return "error";
  if (!premium.on) return "no";
  if (!content || content.kind === "loading") return "loading";
  if (content.kind === "ready") return "yes";
  if (content.kind === "error") return "error";
  return "no";
}

// ---- the lines used everywhere ----

export interface ContentLines {
  programmeSafety: string | null;
  effortGuide: string | null;
  sessionOpening: string | null;
  sessionSupport: string | null;
}

/** premium_content_lines(): key, text. Content, in the member's language. */
export function parseContentLines(data: unknown): ContentLines {
  const by = new Map(rowsOf(data).map((r) => [str(r.key), str(r.text)] as const));
  return {
    programmeSafety: by.get("programme_safety") ?? null,
    effortGuide: by.get("effort_guide") ?? null,
    sessionOpening: by.get("session_opening") ?? null,
    sessionSupport: by.get("session_support") ?? null,
  };
}

// ---- Centium programmes ----

export interface ProgressionRow {
  weeks: string;
  effort: string | null;
  whatToDo: string;
}

export interface CentiumProgramme {
  id: string;
  slug: string;
  title: string;
  forWhom: string;
  lengthText: string;
  equipment: string;
  description: string;
  howItRuns: string | null;
  warmUp: string | null;
  progression: ProgressionRow[];
  freePreview: string;
  suggestedNext: string | null;
  weeks: number;
  sessionsPerWeek: number;
  sessions: number;
  freeSessions: number;
  /** The caller doesn't have Premium: only the free preview opens. */
  locked: boolean;
}

const progression = (v: unknown): ProgressionRow[] =>
  rowsOf(v).flatMap((r) => {
    const what = str(r.what_to_do);
    return what ? [{ weeks: str(r.weeks) ?? "", effort: str(r.effort), whatToDo: what }] : [];
  });

/** centium_programmes(), in the Database's order. */
export function parseProgrammes(data: unknown): CentiumProgramme[] {
  return rowsOf(data).flatMap((r) => {
    const id = str(r.programme_id);
    const slug = str(r.slug);
    const title = str(r.title);
    if (!id || !slug || !title) return [];
    return [
      {
        id,
        slug,
        title,
        forWhom: str(r.for_whom) ?? "",
        lengthText: str(r.length_text) ?? "",
        equipment: str(r.equipment) ?? "",
        description: str(r.description) ?? "",
        howItRuns: str(r.how_it_runs),
        warmUp: str(r.warm_up),
        progression: progression(r.progression),
        freePreview: str(r.free_preview) ?? "",
        suggestedNext: str(r.suggested_next),
        weeks: int(r.weeks),
        sessionsPerWeek: int(r.sessions_per_week),
        sessions: int(r.sessions),
        freeSessions: int(r.free_sessions),
        locked: r.locked === true,
      },
    ];
  });
}

export interface SessionItem {
  name: string;
  amount: string | null;
  rest: string | null;
  notes: string | null;
}

export interface ProgrammeSession {
  number: number;
  week: number;
  /** 0-6 within the week. */
  dayOffset: number;
  title: string;
  effort: string | null;
  note: string | null;
  warmUp: string | null;
  /** Null when locked (content null). */
  items: SessionItem[] | null;
  free: boolean;
  locked: boolean;
}

const items = (v: unknown): SessionItem[] | null =>
  Array.isArray(v)
    ? rowsOf(v).flatMap((r) => {
        const name = str(r.name);
        return name ? [{ name, amount: str(r.amount), rest: str(r.rest), notes: str(r.notes) }] : [];
      })
    : null;

/** centium_programme_sessions(p_programme_id), in order. */
export function parseSessions(data: unknown): ProgrammeSession[] {
  return rowsOf(data)
    .flatMap((r) => {
      const n = num(r.session_number);
      if (n === null) return [];
      const locked = r.locked === true;
      return [
        {
          number: Math.floor(n),
          week: Math.max(1, int(r.week)),
          dayOffset: Math.min(6, int(r.day_offset)),
          title: str(r.title) ?? "",
          effort: locked ? null : str(r.effort),
          note: locked ? null : str(r.note),
          warmUp: locked ? null : str(r.warm_up),
          items: locked ? null : items(r.items),
          free: r.free === true,
          locked,
        },
      ];
    })
    .sort((a, b) => a.number - b.number);
}

export interface MyCentiumProgramme {
  startId: string;
  programmeId: string;
  slug: string;
  title: string;
  startsOn: string;
  sessions: number;
  done: number;
  /** The session numbers done, in order (G fixes); sessions done out of order are here too. */
  doneSessions: number[];
  nextSessionNumber: number | null;
  nextOn: string | null;
  nextLocked: boolean;
}

/** done_sessions (integer[]): whole positive numbers only, in the Database's order, no repeats. */
const sessionNumbers = (v: unknown): number[] => {
  const out: number[] = [];
  for (const x of Array.isArray(v) ? v : []) {
    const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
};

/** my_centium_programmes(): the programmes the member follows. */
export function parseMyProgrammes(data: unknown): MyCentiumProgramme[] {
  return rowsOf(data).flatMap((r) => {
    const startId = str(r.start_id);
    const programmeId = str(r.programme_id);
    const startsOn = ymd(r.starts_on);
    if (!startId || !programmeId || !startsOn) return [];
    const next = num(r.next_session_number);
    return [
      {
        startId,
        programmeId,
        slug: str(r.slug) ?? "",
        title: str(r.title) ?? "",
        startsOn,
        sessions: int(r.sessions),
        done: int(r.done),
        doneSessions: sessionNumbers(r.done_sessions),
        nextSessionNumber: next === null ? null : Math.floor(next),
        nextOn: ymd(r.next_on),
        nextLocked: r.next_locked === true,
      },
    ];
  });
}

const DAY_MS = 86_400_000;
const toUtc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A local day plus n days (YYYY-MM-DD in, YYYY-MM-DD out). */
export const addDays = (day: string, n: number): string => fromUtc(toUtc(day) + n * DAY_MS);

/** start_centium_programme's window: today to 30 days ahead. */
export const startWindow = (today: string): { min: string; max: string } => ({ min: today, max: addDays(today, 30) });

/** A start date the Database will take. */
export const startDateValid = (day: string, today: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= today && day <= addDays(today, 30);

/** A session's day when following from starts_on: starts_on + (week - 1) × 7 + day offset (my_centium_programmes' next_on). */
export const sessionDate = (startsOn: string, s: Pick<ProgrammeSession, "week" | "dayOffset">): string => addDays(startsOn, (s.week - 1) * 7 + s.dayOffset);

export interface ProgrammeWeek {
  week: number;
  sessions: ProgrammeSession[];
  /** Every session in the week is past the free preview and locked. */
  locked: boolean;
}

/** The sessions by week, in order. */
export function groupByWeek(sessions: readonly ProgrammeSession[]): ProgrammeWeek[] {
  const by = new Map<number, ProgrammeSession[]>();
  for (const s of sessions) by.set(s.week, [...(by.get(s.week) ?? []), s]);
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => {
      const sorted = [...list].sort((a, b) => a.dayOffset - b.dayOffset || a.number - b.number);
      return { week, sessions: sorted, locked: sorted.length > 0 && sorted.every((s) => s.locked) };
    });
}

/**
 * What a session offers the member following the programme: "open" (its
 * exercises, and Mark done / undo), or "locked" (past the free preview
 * without Premium: the title, the Premium label, and the prompt on tap).
 */
export type SessionAccess = "open" | "locked";
export const sessionAccess = (s: Pick<ProgrammeSession, "locked">): SessionAccess => (s.locked ? "locked" : "open");

/** "3 of 24 done". */
export const programmeProgressText = (done: number, sessions: number): string => tn(sessions, "{done} of {n} session done", "{done} of {n} sessions done", { done });

/** "Week {n}". */
export const weekLabel = (week: number): string => t("Week {n}", { n: week });

// ---- the meditation library ----

export interface BreathPhase {
  label: string;
  seconds: number;
}

export interface LibrarySession {
  contentId: string;
  slug: string;
  title: string;
  type: "meditation" | "breathing";
  minutes: number;
  access: "free" | "premium";
  locked: boolean;
  /** Breathing counts for the circle (null when locked, or a meditation). */
  phases: BreathPhase[] | null;
  /** Null when locked. */
  script: string | null;
}

const phases = (v: unknown): BreathPhase[] | null => {
  if (!Array.isArray(v)) return null;
  const out = rowsOf(v).flatMap((r) => {
    const label = str(r.label);
    const s = num(r.seconds);
    return label && s !== null && s > 0 ? [{ label, seconds: s }] : [];
  });
  return out.length ? out : null;
};

/** mind_library(), in order. */
export function parseLibrary(data: unknown): LibrarySession[] {
  return rowsOf(data).flatMap((r) => {
    const contentId = str(r.content_id);
    const slug = str(r.slug);
    const title = str(r.title);
    if (!contentId || !slug || !title) return [];
    const locked = r.locked === true;
    return [
      {
        contentId,
        slug,
        title,
        type: r.content_type === "breathing" ? "breathing" : "meditation",
        minutes: Math.max(1, int(r.minutes)),
        access: r.access === "free" ? "free" : "premium",
        locked,
        phases: locked ? null : phases(r.phases),
        script: locked ? null : str(r.script),
      },
    ];
  });
}

/**
 * meditation_sessions.kind for a library session: its slug as a key
 * (box-breathing → box_breathing, the same kind the app already writes for
 * box breathing). The table checks the shape only; anything that doesn't fit
 * falls back to one library kind.
 */
export function libraryKind(slug: string): string {
  const k = slug.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z][a-z0-9_]{1,38}[a-z0-9]$/.test(k) ? k : "meditation_library";
}

export interface ScriptStep {
  text: string;
  seconds: number;
}

/**
 * A meditation's script, step by step (its sentences; a quotation stays one
 * step), each with its share of the session's minutes by its length in
 * words, at least 5 seconds, adding up to the whole session.
 */
export function scriptSteps(script: string, minutes: number): ScriptStep[] {
  const parts: string[] = [];
  let buf = "";
  let quoted = false;
  for (let i = 0; i < script.length; i++) {
    const c = script[i];
    if (c === '"') quoted = !quoted;
    if (/\s/.test(c) && !quoted) {
      const prev = buf[buf.length - 1];
      const prev2 = buf[buf.length - 2];
      if (prev && (/[.!?]/.test(prev) || (prev === '"' && prev2 && /[.!?]/.test(prev2)))) {
        if (buf.trim()) parts.push(buf.trim());
        buf = "";
        continue;
      }
    }
    buf += c;
  }
  if (buf.trim()) parts.push(buf.trim());
  if (parts.length === 0) return [];
  const total = Math.max(parts.length * 5, Math.round(minutes * 60));
  const words = parts.map((p) => Math.max(1, p.split(/\s+/).length));
  const sum = words.reduce((a, b) => a + b, 0);
  const steps = parts.map((text, i) => ({ text, seconds: Math.max(5, Math.round((total * words[i]) / sum)) }));
  // The rounding settles on the longest step, so the steps add up to the session.
  const diff = total - steps.reduce((a, s) => a + s.seconds, 0);
  if (diff !== 0) {
    const longest = steps.reduce((best, s, i) => (s.seconds > steps[best].seconds ? i : best), 0);
    steps[longest].seconds = Math.max(5, steps[longest].seconds + diff);
  }
  return steps;
}

/** The step showing at `elapsed` seconds, and how far through it (0-1). Past the end: the last step, done. */
export function stepAt(steps: readonly ScriptStep[], elapsed: number): { index: number; progress: number; finished: boolean } {
  let at = 0;
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < at + steps[i].seconds) return { index: i, progress: (elapsed - at) / steps[i].seconds, finished: false };
    at += steps[i].seconds;
  }
  return { index: Math.max(0, steps.length - 1), progress: 1, finished: true };
}

/** A library session's type in words. */
export const libraryTypeLabel = (s: Pick<LibrarySession, "type">): string => (s.type === "breathing" ? t("Breathing") : t("Meditation"));

/** "3 min". */
export const minutesLabel = (n: number): string => tn(n, "{n} min", "{n} min");

// ---- journal prompts ----

export interface JournalPrompt {
  number: number;
  groupKey: string;
  groupTitle: string;
  position: number;
  /** Null without Premium. */
  text: string | null;
  locked: boolean;
}

/** journal_prompt_library(), by group and position. */
export function parsePromptLibrary(data: unknown): JournalPrompt[] {
  return rowsOf(data).flatMap((r) => {
    const n = num(r.number);
    const key = str(r.group_key);
    if (n === null || !key) return [];
    const locked = r.locked === true;
    return [{ number: Math.floor(n), groupKey: key, groupTitle: str(r.group_title) ?? key, position: int(r.prompt_position), text: locked ? null : str(r.text), locked }];
  });
}

/** journal_prompt_of_the_day(): one prompt, or null. */
export function parsePromptOfTheDay(data: unknown): { number: number; groupTitle: string; text: string } | null {
  const r = rowsOf(data)[0] ?? (data && typeof data === "object" && !Array.isArray(data) ? (data as Row) : null);
  const n = num(r?.number);
  const text = str(r?.text);
  return r && n !== null && text ? { number: Math.floor(n), groupTitle: str(r.group_title) ?? "", text } : null;
}

export interface PromptGroup {
  key: string;
  title: string;
  prompts: JournalPrompt[];
}

/** The library grouped by group_title, in the Database's order. */
export function groupPrompts(prompts: readonly JournalPrompt[]): PromptGroup[] {
  const out: PromptGroup[] = [];
  for (const p of prompts) {
    let g = out.find((x) => x.key === p.groupKey);
    if (!g) {
      g = { key: p.groupKey, title: p.groupTitle, prompts: [] };
      out.push(g);
    }
    g.prompts.push(p);
  }
  for (const g of out) g.prompts.sort((a, b) => a.position - b.position);
  return out;
}

/** A prompt opens a new entry with the prompt as its heading (the title keeps the journal's 200 limit). */
export const promptHeading = (text: string): string => (text.length > 200 ? text.slice(0, 200).trimEnd() : text);

// ---- the weekly review ----

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  numbersHidden: boolean;
  daysLogged: number;
  workouts: number;
  habitCheckIns: number;
  meditationSessions: number;
  journalEntries: number;
  waterGoalDays: number;
  averageSteps: number | null;
  averageSleepMinutes: number | null;
  meditationMinutes: number | null;
}

/** my_weekly_review(p_week_start) (jsonb). Null when it isn't the review. */
export function parseWeeklyReview(data: unknown): WeeklyReview | null {
  const r = (Array.isArray(data) ? data[0] : data) as Row | null | undefined;
  if (!r || typeof r !== "object") return null;
  const weekStart = ymd(r.week_start);
  const weekEnd = ymd(r.week_end);
  if (!weekStart || !weekEnd) return null;
  const hidden = r.numbers_hidden === true;
  return {
    weekStart,
    weekEnd,
    numbersHidden: hidden,
    daysLogged: int(r.days_logged),
    workouts: int(r.workouts),
    habitCheckIns: int(r.habit_check_ins),
    meditationSessions: int(r.meditation_sessions),
    journalEntries: int(r.journal_entries),
    waterGoalDays: int(r.water_goal_days),
    // Numbers only outside recovery-sensitive mode, whatever arrives.
    averageSteps: hidden ? null : num(r.average_steps),
    averageSleepMinutes: hidden ? null : num(r.average_sleep_minutes),
    meditationMinutes: hidden ? null : num(r.meditation_minutes),
  };
}

export interface ReviewLine {
  key: string;
  label: string;
  value: string;
}

/** "7 h 20 min". */
export function sleepText(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return t("{h} h {m} min", { h: Math.floor(m / 60), m: m % 60 });
}

/**
 * The review's lines: the counts always; the numbers (average steps, average
 * sleep, meditation minutes) only when the review isn't hiding them and the
 * Database gave one.
 */
export function reviewLines(r: WeeklyReview, formatNumber: (n: number) => string = (n) => String(n)): { counts: ReviewLine[]; numbers: ReviewLine[] } {
  const counts: ReviewLine[] = [
    { key: "days_logged", label: t("Days with something logged"), value: formatNumber(r.daysLogged) },
    { key: "workouts", label: t("Workouts"), value: formatNumber(r.workouts) },
    { key: "habit_check_ins", label: t("Habit check-ins"), value: formatNumber(r.habitCheckIns) },
    { key: "meditation_sessions", label: t("Meditation sessions"), value: formatNumber(r.meditationSessions) },
    { key: "journal_entries", label: t("Journal entries"), value: formatNumber(r.journalEntries) },
    { key: "water_goal_days", label: t("Days you reached your water goal"), value: formatNumber(r.waterGoalDays) },
  ];
  if (r.numbersHidden) return { counts, numbers: [] };
  const numbers: ReviewLine[] = [];
  if (r.averageSteps !== null) numbers.push({ key: "average_steps", label: t("Average steps"), value: formatNumber(Math.round(r.averageSteps)) });
  if (r.averageSleepMinutes !== null) numbers.push({ key: "average_sleep", label: t("Average sleep"), value: sleepText(r.averageSleepMinutes) });
  if (r.meditationMinutes !== null) numbers.push({ key: "meditation_minutes", label: t("Meditation minutes"), value: formatNumber(Math.round(r.meditationMinutes)) });
  return { counts, numbers };
}

/** The Monday of a local day's week (my_weekly_review takes any day and rounds to its Monday). */
export function mondayOf(day: string): string {
  const dow = new Date(toUtc(day)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** The review's default: last week's Monday. */
export const lastWeekStart = (today: string): string => addDays(mondayOf(today), -7);

/** Week navigation: back any number of weeks, forward no further than last week (the newest whole week). */
export function canGoToWeek(weekStart: string, today: string): boolean {
  return weekStart <= lastWeekStart(today);
}

// ---- target suggestions ----

export type SuggestionKind = "steps" | "water" | "calories" | "protein";
export type SuggestionReason = "met_5_of_7" | "met_2_or_fewer" | "check_your_target";

export interface TargetSuggestion {
  kind: SuggestionKind;
  current: number | null;
  /** Null for calories and protein (never a number). */
  suggested: number | null;
  reason: SuggestionReason | null;
}

const KINDS: SuggestionKind[] = ["steps", "water", "calories", "protein"];
const REASONS: SuggestionReason[] = ["met_5_of_7", "met_2_or_fewer", "check_your_target"];

/** my_target_suggestions(): nothing in recovery-sensitive mode (the Database returns no rows). */
export function parseSuggestions(data: unknown): TargetSuggestion[] {
  return rowsOf(data).flatMap((r) => {
    const kind = r.kind as SuggestionKind;
    if (!KINDS.includes(kind)) return [];
    const reason = REASONS.includes(r.reason as SuggestionReason) ? (r.reason as SuggestionReason) : null;
    const nutrition = kind === "calories" || kind === "protein";
    return [{ kind, current: num(r.current_target), suggested: nutrition ? null : num(r.suggested), reason }];
  });
}

/** Steps and water can be accepted (it becomes the goal from today); calories and protein are the member's to review. */
export const canAccept = (s: TargetSuggestion): boolean => (s.kind === "steps" || s.kind === "water") && s.suggested !== null;

/** The suggested goal in words: "9,000 steps", "2,750 ml". */
export function suggestedValueText(s: TargetSuggestion, formatNumber: (n: number) => string = (n) => String(n)): string | null {
  if (s.suggested === null) return null;
  return s.kind === "steps" ? t("{n} steps", { n: formatNumber(s.suggested) }) : s.kind === "water" ? t("{n} ml", { n: formatNumber(s.suggested) }) : null;
}

// note: health wording (Round G3, ours): the reason lines are neutral and
// never judge; calories and protein never carry a number. For Karim's review.
const REASON_LINES: Record<string, string> = {
  // note: health wording
  "steps:met_5_of_7": tk("You reached your step goal on 5 or more days last week."),
  // note: health wording
  "steps:met_2_or_fewer": tk("Your step goal fitted 2 days or fewer last week. A different goal might suit your weeks better."),
  // note: health wording
  "water:met_5_of_7": tk("You reached your water goal on 5 or more days last week."),
  // note: health wording
  "calories:check_your_target": tk("Your calories were quite far from your target on most days last week. You might check that your target still suits you."),
  // note: health wording
  "protein:check_your_target": tk("Your protein was quite far from your target on most days last week. You might check that your target still suits you."),
};

/** The suggestion's reason line, by kind and reason. Null for a pair the Database doesn't send. */
export function suggestionLine(s: Pick<TargetSuggestion, "kind" | "reason">): string | null {
  const k = REASON_LINES[`${s.kind}:${s.reason}`];
  return k ? t(k) : null;
}

/** The accept button: "Make 9,000 steps my goal". Only for steps and water. */
export function acceptLabel(s: TargetSuggestion, formatNumber?: (n: number) => string): string | null {
  const v = canAccept(s) ? suggestedValueText(s, formatNumber) : null;
  return v ? t("Make {suggested} my goal", { suggested: v }) : null;
}

// ---- the doctor summary ----

export interface DoctorSummary {
  generatedAt: string | null;
  from: string | null;
  to: string | null;
  numbersHidden: boolean;
  person: { firstName: string | null; age: number | null; sex: string | null } | null;
  medications: { name: string; dose: string | null; route: string | null; times: string | null; notes: string | null }[];
  allergies: { allergen: string; severity: string | null; note: string | null }[];
  /** FQ (20261227020000 other_allergies): the member's own "Other" allergies, in their words. Empty before the Database sends them. */
  otherAllergies: { label: string; severity: string | null; note: string | null }[];
  conditions: string[];
  surgeries: { name: string; date: string | null; datePrecision: DatePrecision }[];
  bloodPressure: {
    readings: number;
    averageSystolic: number | null;
    averageDiastolic: number | null;
    latest: { systolic: number | null; diastolic: number | null; pulse: number | null; at: string | null } | null;
  } | null;
  /** Null in recovery-sensitive mode: the section is left out. */
  weight: { first: { kg: number; on: string | null } | null; latest: { kg: number; on: string | null } | null } | null;
  labResults: { marker: string; value: number | null; unit: string | null; rangeLow: number | null; rangeHigh: number | null; status: string | null; on: string | null }[];
  cycle: { typicalCycleLength: number | null; typicalPeriodLength: number | null; conditions: string[] } | null;
}

const asObj = (v: unknown): Row | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap((x) => (typeof x === "string" && x.trim() ? [x] : [])) : typeof v === "string" && v.trim() ? [v] : []);
const timesText = (v: unknown): string | null => {
  const l = strList(v);
  return l.length ? l.join(", ") : null;
};
const weightPoint = (v: unknown) => {
  const o = asObj(v);
  const kg = num(o?.kg);
  return o && kg !== null ? { kg, on: ymd(o.on) } : null;
};

/** my_doctor_summary(p_from, p_to) (jsonb). Null when it isn't the summary. */
export function parseDoctorSummary(data: unknown): DoctorSummary | null {
  const r = asObj(Array.isArray(data) ? data[0] : data);
  if (!r) return null;
  const period = asObj(r.period);
  const person = asObj(r.person);
  const bp = asObj(r.blood_pressure);
  const latest = asObj(bp?.latest);
  const weight = asObj(r.weight);
  const cycle = asObj(r.cycle);
  return {
    generatedAt: str(r.generated_at),
    from: ymd(period?.from),
    to: ymd(period?.to),
    numbersHidden: r.numbers_hidden === true,
    person: person ? { firstName: str(person.first_name), age: num(person.age), sex: str(person.sex) } : null,
    medications: rowsOf(r.medications).flatMap((m) => {
      const name = str(m.name);
      return name ? [{ name, dose: str(m.dose), route: str(m.route), times: timesText(m.times), notes: str(m.notes) }] : [];
    }),
    allergies: rowsOf(r.allergies).flatMap((a) => {
      const allergen = str(a.allergen);
      return allergen ? [{ allergen, severity: str(a.severity), note: str(a.note) }] : [];
    }),
    otherAllergies: rowsOf(r.other_allergies).flatMap((a) => {
      const label = str(a.label);
      return label ? [{ label, severity: str(a.severity), note: str(a.note) }] : [];
    }),
    conditions: strList(r.conditions),
    surgeries: rowsOf(r.surgeries).flatMap((s) => {
      const name = str(s.name);
      // date_precision (Database #62): "day" when missing or unknown, so a
      // summary from before it was added still prints its full date.
      const datePrecision: DatePrecision = s.date_precision === "month" || s.date_precision === "year" ? s.date_precision : "day";
      return name ? [{ name, date: ymd(s.date), datePrecision }] : [];
    }),
    bloodPressure: bp
      ? {
          readings: int(bp.readings),
          averageSystolic: num(bp.average_systolic),
          averageDiastolic: num(bp.average_diastolic),
          latest: latest ? { systolic: num(latest.systolic), diastolic: num(latest.diastolic), pulse: num(latest.pulse), at: str(latest.at) } : null,
        }
      : null,
    weight: weight ? { first: weightPoint(weight.first), latest: weightPoint(weight.latest) } : null,
    labResults: rowsOf(r.lab_results).flatMap((l) => {
      const marker = str(l.marker);
      return marker ? [{ marker, value: num(l.value), unit: str(l.unit), rangeLow: num(l.range_low), rangeHigh: num(l.range_high), status: str(l.status), on: ymd(l.on) }] : [];
    }),
    cycle: cycle ? { typicalCycleLength: num(cycle.typical_cycle_length), typicalPeriodLength: num(cycle.typical_period_length), conditions: strList(cycle.conditions) } : null,
  };
}

export interface SummarySection {
  key: "person" | "medications" | "allergies" | "conditions" | "surgeries" | "blood_pressure" | "weight" | "lab_results" | "cycle";
  title: string;
  /** One line each; empty sections say so with `empty`. */
  lines: string[];
  empty: string | null;
}

/** The doctor summary's period: default the last 90 days, up to two years (730 days). */
export function summaryPeriodValid(from: string, to: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return false;
  if (from > to || to > today) return false;
  return (toUtc(to) - toUtc(from)) / DAY_MS <= 730;
}
export const defaultSummaryPeriod = (today: string): { from: string; to: string } => ({ from: addDays(today, -90), to: today });

const STATUS_WORD: Record<string, string> = {
  // note: health wording
  low: tk("below range"),
  // note: health wording
  normal: tk("in range"),
  // note: health wording
  high: tk("above range"),
};

const join = (parts: (string | null | undefined)[]) => parts.filter((p): p is string => !!p && p.trim() !== "").join(" · ");
const rangeOf = (low: number | null, high: number | null): string | null =>
  low !== null && high !== null ? `${low}–${high}` : low !== null ? `≥ ${low}` : high !== null ? `≤ ${high}` : null;

/**
 * The summary's sections, in the order a doctor reads them. Health wording
 * throughout is ours (decision G11: Karim reviews it). The member's own
 * entries (medication names, conditions, markers) are shown as they wrote
 * them; only the labels around them are translated.
 */
export function summarySections(s: DoctorSummary, formatDay: (ymd: string) => string = (d) => d): SummarySection[] {
  const out: SummarySection[] = [];
  const day = (d: string | null) => (d ? formatDay(d) : null);
  const p = s.person;
  out.push({
    key: "person",
    title: t("About you"),
    lines: p
      ? [p.firstName ? t("Name: {name}", { name: p.firstName }) : null, p.age !== null ? t("Age: {n}", { n: p.age }) : null, p.sex ? t("Sex: {sex}", { sex: p.sex }) : null].filter((x): x is string => !!x)
      : [],
    empty: t("Nothing recorded."),
  });
  // note: health wording
  out.push({ key: "medications", title: t("Medications"), lines: s.medications.map((m) => join([m.name, m.dose, m.route, m.times, m.notes])), empty: t("No medications recorded.") });
  // note: health wording
  out.push({ key: "allergies", title: t("Allergies"), lines: [...s.allergies.map((a) => join([a.allergen, a.severity, a.note])), ...s.otherAllergies.map((a) => join([t("“{label}”", { label: `⁨${a.label}⁩` }), a.severity, a.note]))], empty: t("No allergies recorded.") });
  // note: health wording
  out.push({ key: "conditions", title: t("Conditions"), lines: [...s.conditions], empty: t("No conditions recorded.") });
  out.push({ key: "surgeries", title: t("Surgeries"), lines: s.surgeries.map((x) => join([x.name, x.date ? surgeryDate({ date: x.date, datePrecision: x.datePrecision }, formatDay) : null])), empty: t("No surgeries recorded.") });
  const bp = s.bloodPressure;
  const bpLines: string[] = [];
  if (bp && bp.readings > 0) {
    bpLines.push(tn(bp.readings, "{n} reading in this period", "{n} readings in this period"));
    // note: health wording
    if (bp.averageSystolic !== null && bp.averageDiastolic !== null) bpLines.push(t("Average: {sys}/{dia} mmHg", { sys: bp.averageSystolic, dia: bp.averageDiastolic }));
    const l = bp.latest;
    if (l && l.systolic !== null && l.diastolic !== null) {
      // note: health wording
      bpLines.push(join([t("Latest: {sys}/{dia} mmHg", { sys: l.systolic, dia: l.diastolic }), l.pulse !== null ? t("pulse {n}", { n: l.pulse }) : null, l.at ? day(l.at.slice(0, 10)) : null]));
    }
  }
  out.push({ key: "blood_pressure", title: t("Blood pressure"), lines: bpLines, empty: t("No readings in this period.") });
  // WEIGHT: left out entirely when null (recovery-sensitive mode).
  if (s.weight) {
    const w = s.weight;
    const lines: string[] = [];
    if (w.first && w.latest && (w.first.on !== w.latest.on || w.first.kg !== w.latest.kg)) lines.push(t("First: {kg} kg", { kg: w.first.kg }) + (w.first.on ? ` · ${day(w.first.on)}` : ""));
    if (w.latest) lines.push(t("Latest: {kg} kg", { kg: w.latest.kg }) + (w.latest.on ? ` · ${day(w.latest.on)}` : ""));
    out.push({ key: "weight", title: t("Weight"), lines, empty: t("No weight readings in this period.") });
  }
  out.push({
    key: "lab_results",
    // note: health wording
    title: t("Lab results (latest of each)"),
    lines: s.labResults.map((l) =>
      join([
        l.value !== null ? `${l.marker}: ${l.value}${l.unit ? ` ${l.unit}` : ""}` : l.marker,
        l.status && STATUS_WORD[l.status] ? t(STATUS_WORD[l.status]) : null,
        rangeOf(l.rangeLow, l.rangeHigh) ? t("range {range}", { range: rangeOf(l.rangeLow, l.rangeHigh)! }) : null,
        day(l.on),
      ])
    ),
    empty: t("No lab results in this period."),
  });
  if (s.cycle) {
    const c = s.cycle;
    out.push({
      key: "cycle",
      title: t("Cycle"),
      lines: [
        c.typicalCycleLength !== null ? tn(c.typicalCycleLength, "Typical cycle: {n} day", "Typical cycle: {n} days") : null,
        c.typicalPeriodLength !== null ? tn(c.typicalPeriodLength, "Typical period: {n} day", "Typical period: {n} days") : null,
        ...c.conditions,
      ].filter((x): x is string => !!x),
      empty: t("Nothing recorded."),
    });
  }
  return out;
}

// note: health wording (decision G11)
/** The line the summary always carries. */
export const notADiagnosisLine = (): string => t("For your doctor. Not a diagnosis.");

/** "centium-doctor-summary-2026-11-02.pdf". */
export const summaryFileName = (day: string): string => `centium-doctor-summary-${day}.pdf`;

/** my_doctor_summary's refusals. */
export function summaryErrorText(code: string | null | undefined): string {
  if (code === "22023") return t("Choose a period of up to two years.");
  return t("Couldn't make your summary. Try again.");
}

// ---- lab report comparison ----

export type MarkerStatus = "low" | "normal" | "high" | null;

export interface CompareRow {
  markerKey: string;
  name: string;
  unit: string | null;
  valueA: number | null;
  valueB: number | null;
  change: number | null;
  changePct: number | null;
  statusA: MarkerStatus;
  statusB: MarkerStatus;
}

const status = (v: unknown): MarkerStatus => (v === "low" || v === "normal" || v === "high" ? v : null);

/** compare_my_lab_reports(a, b). */
export function parseCompare(data: unknown): CompareRow[] {
  return rowsOf(data).flatMap((r) => {
    const name = str(r.name);
    if (!name) return [];
    return [
      {
        markerKey: str(r.marker_key) ?? name.toLowerCase(),
        name,
        unit: str(r.unit),
        valueA: num(r.value_a),
        valueB: num(r.value_b),
        change: num(r.change),
        changePct: num(r.change_pct),
        statusA: status(r.status_a),
        statusB: status(r.status_b),
      },
    ];
  });
}

export interface CompareRowView {
  key: string;
  name: string;
  unit: string | null;
  a: string;
  b: string;
  /** "+1.2", "−0.4", "0", or null (no change given: the units differ, or a marker in one report only). */
  change: string | null;
  /** "+12.5%", only when the Database gave it. */
  changePct: string | null;
  statusA: MarkerStatus;
  statusB: MarkerStatus;
}

const signed = (n: number, suffix = ""): string => {
  const v = Math.round(n * 100) / 100;
  return v === 0 ? `0${suffix}` : `${v > 0 ? "+" : "−"}${Math.abs(v)}${suffix}`;
};

/** The comparison's rows as shown: both values, the change, and the change in % only when given. */
export function compareRowsView(rows: readonly CompareRow[]): CompareRowView[] {
  return rows.map((r) => ({
    key: r.markerKey,
    name: r.name,
    unit: r.unit,
    a: r.valueA === null ? "–" : String(r.valueA),
    b: r.valueB === null ? "–" : String(r.valueB),
    change: r.change === null ? null : signed(r.change),
    changePct: r.changePct === null ? null : signed(r.changePct, "%"),
    statusA: r.statusA,
    statusB: r.statusB,
  }));
}

/** compare_my_lab_reports' refusals. ATX08: not both the member's own. */
export function compareErrorText(code: string | null | undefined): string {
  if (code === "ATX08") return t("Choose two of your own reports.");
  return t("Couldn't compare the reports. Try again.");
}

/** Two different reports chosen. */
export const comparePairReady = (a: string | null, b: string | null): boolean => !!a && !!b && a !== b;

// ---- biomarker trends ----

export interface TrendPoint {
  date: string;
  value: number;
  unit: string | null;
  status: MarkerStatus;
  panelId: string | null;
}

/** my_biomarker_trend(p_marker_key): every result, oldest first. */
export function parseTrend(data: unknown): TrendPoint[] {
  return rowsOf(data)
    .flatMap((r) => {
      const date = ymd(r.result_date);
      const value = num(r.value);
      return date && value !== null ? [{ date, value, unit: str(r.unit), status: status(r.status), panelId: str(r.panel_id) }] : [];
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Decision G5: with the switch on and no Premium, the trend view (the chart
 * and its stats) is Premium; a single reading, and typing values, stay free.
 * With the switch off, or Premium, today's chart shows.
 */
export function trendLocked(p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined, results: number): boolean {
  return !!p && p.premiumOn && !p.premium && results > 1;
}

/** The marker key my_biomarker_trend reads: the key, or the name when a value has none. */
export const trendKey = (m: { markerKey?: string | null; name: string }): string => (m.markerKey && m.markerKey.trim() ? m.markerKey : m.name).trim().toLowerCase();

/**
 * The trend reader's points onto the page's own results (which carry the
 * report names for the tooltip): a point matches a result on its report,
 * date and value; a point with no match keeps the reader's own values.
 */
export function trendResults<R extends { id: string; panelId: string | null; date: string; value: number; unit: string; status: MarkerStatus }>(points: readonly TrendPoint[], results: readonly R[]): R[] {
  if (points.length === 0 || results.length === 0) return [...results];
  const used = new Set<string>();
  const template = results[results.length - 1];
  return points.map((p, i) => {
    const hit = results.find((r) => !used.has(r.id) && r.date === p.date && r.value === p.value && (r.panelId ?? null) === (p.panelId ?? null));
    if (hit) {
      used.add(hit.id);
      return hit;
    }
    return { ...template, id: `trend-${i}`, panelId: p.panelId, date: p.date, value: p.value, unit: p.unit ?? template.unit, status: p.status };
  });
}

// ---- the codes ----

/** start_centium_programme's refusals. */
export function startErrorText(code: string | null | undefined): string {
  if (code === "ATX10") return t("You're already following this programme.");
  if (code === "22023") return t("Choose a day from today to 30 days ahead.");
  return t("Couldn't start the programme. Try again.");
}

/**
 * Whether a session reads as done: what the member marked here wins, else
 * my_centium_programmes().done_sessions (G fixes), the sessions actually
 * done, so one done out of order reads as done.
 */
export function sessionDone(n: number, p: Pick<MyCentiumProgramme, "doneSessions"> | null, marked: ReadonlyMap<number, boolean>): boolean {
  const m = marked.get(n);
  if (m !== undefined) return m;
  return !!p && p.doneSessions.includes(n);
}

/** A lab status in words ("below range", "in range", "above range"); null for none. */
export function statusWord(s: string | null | undefined): string | null {
  return s && STATUS_WORD[s] ? t(STATUS_WORD[s]) : null;
}
