// Release 3 · W6 Courses (MO18 v3, MO28): the pure rules behind the screens,
// kept apart from the components so they can be tested directly.

import type { CourseAudience, CourseStatus } from "../../../services/courses/authorRules";
import { t, tk, tn, tx } from "../../../i18n/core";

export type CourseTab = "Published" | "Drafts" | "Archived";
/** English keys (tk), compared as values; show them with t(). */
export const COURSE_TABS: CourseTab[] = [tk("Published"), tk("Drafts"), tk("Archived")];

/** Published = live; Drafts = draft, in review, sent back; Archived = unpublished. */
export function tabOf(status: CourseStatus): CourseTab {
  if (status === "published") return "Published";
  if (status === "unpublished") return "Archived";
  return "Drafts";
}

/** "{n} weeks · {n} lessons" (COPY MO18 v3, plural rule); list: "{n} weeks, {n} lessons" (the Review and Edit rows). */
export function sizeLine(weeks: number, lessons: number, list = false): string {
  const w = tn(weeks, "{n} week", "{n} weeks");
  const l = tn(lessons, "{n} lesson", "{n} lessons");
  return list ? t("{weeks}, {lessons}", { weeks: w, lessons: l }) : `${w} · ${l}`;
}

/** The status dot's label on a Drafts or Archived card. */
export function statusLabel(status: CourseStatus): string {
  switch (status) {
    case "draft":
      return t("Draft");
    case "submitted":
      return t("In review");
    case "changes_requested":
      return t("Changes requested");
    case "unpublished":
      return t("Unpublished");
    default:
      return t("Published");
  }
}

/** The steps of Create course (stepBar18 CSTEPS18). English keys (tk); StepBar shows them with t(). */
export const STEPS = [tk("Basics"), tk("Structure"), tk("Lessons"), tk("Access"), tk("Review")] as const;

/** MO28 1 Basics, validation: "At least 8 characters." (the frame's rule; the database's own floor is 4). */
export const TITLE_MIN = 8;

export function titleError(title: string): string | null {
  return title.trim().length < TITLE_MIN ? t("Use at least {n} characters", { n: TITLE_MIN }) : null;
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
  if (!count || average === null) return t("No ratings yet");
  return tn(count, "{average} from {n} rating", "{average} from {n} ratings", { average: average.toFixed(1) });
}

/** "Public · $19 · one week at a time" (MO28 5 Review › Access). */
export function accessLine(priceLabel: string, mode: "all_at_once" | "weekly"): string {
  return mode === "weekly" ? t("Public · {price} · one week at a time", { price: priceLabel }) : t("Public · {price} · all at once", { price: priceLabel });
}

/** The Access row's meta: the audience in words (authorRules' audienceLabel, as shown text). */
export function audienceText(audience: CourseAudience, selected?: number): string {
  if (audience === "my_clients") return t("All your clients");
  if (audience === "selected") return selected ? tn(selected, "{n} selected client", "{n} selected clients") : t("Selected clients");
  return t("Public");
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

/** "Week 1 · Reading · 4 min" (the preview's eyebrow); kindLabel is already shown text. */
export function lessonEyebrow(weekIndex: number, kindLabel: string, minutes: number | null): string {
  return [t("Week {n}", { n: weekIndex + 1 }), kindLabel, minutes ? t("{n} min", { n: minutes }) : null].filter(Boolean).join(" · ");
}

/** The lesson kind's shown label (LessonSteps' KIND_LABEL and the Structure rows). */
export function lessonKindLabel(kind: string): string {
  return kind === "video" ? t("Video") : kind === "reading" ? t("Reading") : kind === "pdf" ? "PDF" : kind === "image" ? t("Image") : kind === "check_in" ? tx("Check-in", "lesson kind") : t("Quiz");
}

/** "Video · 6 min", "Quiz · 4 questions", "PDF" (the Structure rows' meta). */
export function lessonMeta(kind: string, minutes: number | null, questions?: number): string {
  const label = lessonKindLabel(kind);
  if (kind === "quiz") return questions === undefined ? label : `${label} · ${tn(questions, "{n} question", "{n} questions")}`;
  return minutes ? `${label} · ${t("{n} min", { n: minutes })}` : label;
}
