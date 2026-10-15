// Release 3 · W6 Courses (MO18 v3, MO28): the pure rules behind the screens,
// kept apart from the components so they can be tested directly.

import type { CourseStatus } from "../../../services/courses/authorRules";

export type CourseTab = "Published" | "Drafts" | "Archived";
export const COURSE_TABS: CourseTab[] = ["Published", "Drafts", "Archived"];

/** Published = live; Drafts = draft, in review, sent back; Archived = unpublished. */
export function tabOf(status: CourseStatus): CourseTab {
  if (status === "published") return "Published";
  if (status === "unpublished") return "Archived";
  return "Drafts";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "{n} weeks · {n} lessons" (COPY MO18 v3, plural rule). */
export function sizeLine(weeks: number, lessons: number): string {
  return `${plural(weeks, "week", "weeks")} · ${plural(lessons, "lesson", "lessons")}`;
}

/** The status dot's label on a Drafts or Archived card. */
export function statusLabel(status: CourseStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "In review";
    case "changes_requested":
      return "Changes requested";
    case "unpublished":
      return "Unpublished";
    default:
      return "Published";
  }
}

/** The steps of Create course (stepBar18 CSTEPS18). */
export const STEPS = ["Basics", "Structure", "Lessons", "Access", "Review"] as const;
export type Step = 0 | 1 | 2 | 3 | 4;

/** MO28 1 Basics, validation: "At least 8 characters." (the frame's rule; the database's own floor is 4). */
export const TITLE_MIN = 8;

export function titleError(title: string): string | null {
  return title.trim().length < TITLE_MIN ? `Use at least ${TITLE_MIN} characters` : null;
}

/**
 * MO28 4 Access, "One week at a time · The next week opens 7 days after the
 * last": week n (0-based) opens 7 × n days after enrolment; all at once opens
 * every week at once (0). course_module_opens_at reads opens_after_days only
 * while drip_mode is weekly, so the days are written either way.
 */
export const DRIP_EVERY_DAYS = 7;

export function dripPlan(moduleIds: string[], mode: "all_at_once" | "weekly"): { moduleId: string; days: number }[] {
  return moduleIds.map((moduleId, i) => ({ moduleId, days: mode === "weekly" ? Math.min(365, i * DRIP_EVERY_DAYS) : 0 }));
}

/** Whether the stored offsets already match the plan (nothing to write). */
export function dripMatches(plan: { moduleId: string; days: number }[], stored: Map<string, number>): boolean {
  return plan.every((p) => (stored.get(p.moduleId) ?? 0) === p.days);
}

/** Ratings 5 to 1 with their counts (MO28 Ratings open). */
export function ratingBars(stars: number[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: stars.filter((x) => Math.round(x) === s).length }));
}

export function ratingsLine(average: number | null, count: number): string {
  if (!count || average === null) return "No ratings yet";
  return `${average.toFixed(1)} from ${plural(count, "rating", "ratings")}`;
}

/** "Public · $19 · one week at a time" (MO28 5 Review › Access). */
export function accessLine(priceLabel: string, mode: "all_at_once" | "weekly"): string {
  return `Public · ${priceLabel} · ${mode === "weekly" ? "one week at a time" : "all at once"}`;
}

/** Dollars typed in the price field → cents, or null when it isn't a price (0 to 500). */
export function parsePrice(text: string): number | null {
  const t = text.replace(/[^0-9.]/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return cents >= 0 && cents <= 50_000 ? cents : null;
}

/** "Week 1 · Reading · 4 min" (the preview's eyebrow). */
export function lessonEyebrow(weekIndex: number, kindLabel: string, minutes: number | null): string {
  return [`Week ${weekIndex + 1}`, kindLabel, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ");
}

/** "Video · 6 min", "Quiz · 4 questions", "PDF" (the Structure rows' meta). */
export function lessonMeta(kind: string, minutes: number | null, questions?: number): string {
  const label = kind === "video" ? "Video" : kind === "reading" ? "Reading" : kind === "pdf" ? "PDF" : "Quiz";
  if (kind === "quiz") return questions === undefined ? label : `${label} · ${plural(questions, "question", "questions")}`;
  return minutes ? `${label} · ${minutes} min` : label;
}
