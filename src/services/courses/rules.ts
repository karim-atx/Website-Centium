// Courses (Database 99ec17b): the rules that need no network. Kept free of the
// Supabase client so they can be tested directly.
//
// WHAT A PRICE BUYS. Every video and reading in every course is free to watch,
// and the schema cannot express otherwise (the videos are embedded from
// YouTube). A price buys four things: quizzes, PDFs, questions answered by the
// professional, and a certificate. So "locked" only ever applies to a quiz or
// a PDF lesson, never to a video or reading.

export type LessonKind = "video" | "reading" | "quiz" | "pdf";
export type Tier = "free" | "paid";
export type AccessLevel = "none" | "free" | "paid";

export const NEEDS_DOB_COURSES_TEXT = "Add your date of birth in Profile to see courses.";
/** The forum's adults-only line, worded for the part that was opened. */
export const ADULTS_ONLY_COURSES_TEXT = "The community is for adults. You can take courses from age 18.";

/** Quizzes and PDFs are part of the full course; videos and readings never are. */
export function isPaidExtra(kind: LessonKind): boolean {
  return kind === "quiz" || kind === "pdf";
}

export function lessonOpenTo(kind: LessonKind, access: AccessLevel): boolean {
  if (access === "none") return false;
  return access === "paid" || !isPaidExtra(kind);
}

/** "Free", "$29", "$29.50". Courses are priced in USD only (courses_currency_check). */
export function formatPrice(cents: number): string {
  if (cents <= 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

const LEVELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export function levelLabel(level: string): string {
  return LEVELS[level] ?? level;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "about 2 hours a week", "about 1.5 hours a week", "about 1 hour a week". */
export function weeklyHoursLabel(hours: number | null): string | null {
  if (hours === null || !(hours > 0)) return null;
  return `about ${hours === 1 ? "1 hour" : `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`} a week`;
}

/** The card's pill, "Beginner · 6 weeks"; the course page adds the weekly hours. */
export function coursePill(level: string, weeks: number, weeklyHours?: number | null): string {
  return [levelLabel(level), weeks > 0 ? plural(weeks, "week", "weeks") : null, weeklyHoursLabel(weeklyHours ?? null)]
    .filter(Boolean)
    .join(" · ");
}

/** A week's contents for the syllabus: "4 videos, 1 reading". */
export function weekContents(kinds: LessonKind[]): string {
  const n = (k: LessonKind) => kinds.filter((x) => x === k).length;
  return [
    n("video") ? plural(n("video"), "video", "videos") : null,
    n("reading") ? plural(n("reading"), "reading", "readings") : null,
    n("quiz") ? plural(n("quiz"), "quiz", "quizzes") : null,
    n("pdf") ? plural(n("pdf"), "PDF", "PDFs") : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** "35 min", "1 hr 5 min"; null when no lesson has a length. */
export function minutesLabel(minutes: number): string | null {
  if (!(minutes > 0)) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * "1,204 learners", or null below the threshold.
 *
 * NOTHING AT ZERO, and nothing at one or two either. "0 learners" reads as a
 * verdict on a course nobody has found yet, and "1 learner" tells that learner
 * they are the only one — neither is information the card is trying to give.
 * The number itself is the server's; this only decides when it is worth saying.
 */
export function enrolledLabel(enrolled: number): string | null {
  if (enrolled < 3) return null;
  return `${enrolled.toLocaleString()} ${enrolled === 1 ? "learner" : "learners"}`;
}

export interface OrderedLesson {
  id: string;
  kind: LessonKind;
}

/**
 * How far through the course the learner is, out of the lessons open to them:
 * a free learner is measured against the videos and readings, since quizzes
 * and PDFs are not theirs to complete.
 */
export function progressPercent(lessons: OrderedLesson[], completed: ReadonlySet<string>, access: AccessLevel): number {
  const open = lessons.filter((l) => lessonOpenTo(l.kind, access));
  if (open.length === 0) return 0;
  return Math.round((open.filter((l) => completed.has(l.id)).length * 100) / open.length);
}

/**
 * Where "Continue" goes: the first open lesson not yet completed after the
 * last one opened, else the first open one not completed anywhere, else the
 * last one opened, else the first lesson.
 */
export function nextLesson(
  lessons: OrderedLesson[],
  completed: ReadonlySet<string>,
  lastLessonId: string | null,
  access: AccessLevel
): OrderedLesson | null {
  const open = lessons.filter((l) => lessonOpenTo(l.kind, access));
  const from = lastLessonId ? open.findIndex((l) => l.id === lastLessonId) : -1;
  const after = open.slice(from + 1).find((l) => !completed.has(l.id));
  return after ?? open.find((l) => !completed.has(l.id)) ?? open.find((l) => l.id === lastLessonId) ?? open[0] ?? null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The official embedded player on the privacy-enhanced domain. No autoplay,
 * nothing gating playback; rel=0 keeps suggestions to the same channel.
 * Null for anything that is not an eleven-character video id, so a bad value
 * can never become an arbitrary frame.
 */
export function youtubeEmbedUrl(videoId: string | null): string | null {
  if (!videoId || !YOUTUBE_ID.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}

export type CourseAction = "read" | "enrol" | "paid" | "complete" | "quiz" | "pdf" | "ask" | "rate";

export const PAID_OPEN_SOON = "Paid courses open soon.";

/** Words for a database refusal; null when the code is not one of the course ones. */
export function describeCourseError(error: { code?: string; message?: string }, action: CourseAction): string | null {
  switch (error.code ?? "") {
    case "ATX55":
      return "Courses are for members aged 18 and over.";
    case "ATX68":
      return PAID_OPEN_SOON;
    case "ATX69":
      return action === "quiz"
        ? "Quizzes are part of the full course."
        : action === "pdf"
        ? "Downloadable plans are part of the full course."
        : "Questions to the professional are part of the full course.";
    case "ATX67":
      return action === "complete" || action === "quiz"
        ? "Start the course first, then try again."
        : action === "rate"
        ? "Start the course before rating it."
        : "That course isn't available any more.";
    case "ATX02":
      return action === "ask"
        ? "You've asked a lot of questions today. Try again tomorrow."
        : "That's too many in a short time. Try again later.";
    default:
      return null;
  }
}
