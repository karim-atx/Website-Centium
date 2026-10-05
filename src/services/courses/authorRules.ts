// The author side's rules that need no network. Kept free of the Supabase
// client so they can be tested directly, like ./rules.ts for the learner side.

export type CourseStatus = "draft" | "submitted" | "published" | "changes_requested" | "unpublished";
export type RevisionStatus = "draft" | "submitted" | "applied" | "changes_requested" | "withdrawn";

/** The schema's own limits (courses_*_check), mirrored so a refusal is rare. */
export const LIMITS = {
  title: { min: 4, max: 120 },
  subtitle: { min: 4, max: 200 },
  moduleTitle: { min: 2, max: 120 },
  lessonTitle: { min: 2, max: 160 },
  body: { min: 1, max: 20000 },
  learnPoints: 8,
  learnPointsChars: 800,
  /** A price is zero (free) or up to five hundred dollars. */
  priceCents: { min: 0, max: 50_000 },
  minutes: { min: 1, max: 600 },
  weeklyHours: { min: 0.5, max: 40 },
  passMark: { min: 1, max: 100 },
  quizOptions: { min: 2, max: 8 },
} as const;

export const COURSE_LEVELS = ["beginner", "intermediate", "advanced", "all_levels"] as const;

/**
 * The eight cover colours offered.
 *
 * The schema takes any #rrggbb, so this is the app's palette rather than a
 * constraint — picked from the course cards already in the catalogue so a new
 * course looks like it belongs beside them.
 */
export const COVER_COLOURS = [
  "#E4F0EE",
  "#ECE9F4",
  "#FBF1DC",
  "#F2E6EC",
  "#E6EEF6",
  "#EFEBE4",
  "#E8F0E4",
  "#F6E9E4",
] as const;

// ---------------------------------------------------------------------------
// What the status means on screen
// ---------------------------------------------------------------------------

export interface StatusLook {
  label: string;
  /** One sentence saying what is true now, and what happens next. */
  detail: string;
  tone: "neutral" | "waiting" | "live" | "attention";
}

export function courseStatusLook(status: CourseStatus): StatusLook {
  switch (status) {
    case "draft":
      return { label: "Draft", detail: "Only you can see this. Submit it when you're ready.", tone: "neutral" };
    case "submitted":
      return { label: "In review", detail: "We're reading it. You can't edit it while it's with us.", tone: "waiting" };
    case "published":
      return { label: "Published", detail: "Live in the catalogue. Edit it by opening a revision.", tone: "live" };
    case "changes_requested":
      return { label: "Changes requested", detail: "Make the changes below, then submit it again.", tone: "attention" };
    case "unpublished":
      return { label: "Unpublished", detail: "Taken down by a reviewer. It isn't in the catalogue.", tone: "neutral" };
  }
}

export function revisionStatusLook(status: RevisionStatus): StatusLook {
  switch (status) {
    case "draft":
      return { label: "Revision in progress", detail: "Your course stays live while you edit this copy.", tone: "neutral" };
    case "submitted":
      return { label: "Revision in review", detail: "Your course stays live until we approve the changes.", tone: "waiting" };
    case "changes_requested":
      return { label: "Changes requested", detail: "Make the changes below, then submit the revision again.", tone: "attention" };
    case "applied":
      return { label: "Revision applied", detail: "Your changes are live.", tone: "live" };
    case "withdrawn":
      return { label: "Revision withdrawn", detail: "Those draft changes were discarded.", tone: "neutral" };
  }
}

/** A revision is open — and therefore editable — in these three states. */
export function revisionIsOpen(status: RevisionStatus): boolean {
  return status === "draft" || status === "submitted" || status === "changes_requested";
}

/** The tree the builder should be editing, or null for the live one. */
export function editingRevisionId(revision: { id: string; status: RevisionStatus } | null): string | null {
  return revision && revisionIsOpen(revision.status) ? revision.id : null;
}

/**
 * Whether the builder's fields accept typing right now.
 *
 * THE SAME RULE course_content_is_editable ASKS, so the UI disables what the
 * database would refuse rather than letting somebody type into a field whose
 * save will fail. A submitted course or revision is with a reviewer and is
 * frozen for both of them.
 */
export function canEditNow(status: CourseStatus, revision: { status: RevisionStatus } | null): boolean {
  if (revision && revisionIsOpen(revision.status)) return revision.status !== "submitted";
  return status === "draft" || status === "changes_requested";
}

/** Whether "Edit course" should offer to open a revision instead. */
export function needsRevisionToEdit(status: CourseStatus, revision: { status: RevisionStatus } | null): boolean {
  return status === "published" && !(revision && revisionIsOpen(revision.status));
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** "$29", "$29.50", "Free" — the learner-side formatPrice, for whole dollars. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export interface PriceBreakdown {
  priceCents: number;
  commissionCents: number;
  netCents: number;
}

/**
 * What one sale leaves the author, at a given commission.
 *
 * ROUNDED THE WAY THE DATABASE ROUNDS IT. course_net_earnings computes
 * `round(price * percent / 100)` per sale and subtracts that, so the estimate
 * shown before a sale and the total shown after it agree. Doing the division
 * the other way round — net = price * (1 - pct/100) — differs by a cent at
 * plenty of prices, and a professional who notices has no way to tell which
 * number is wrong.
 */
export function priceBreakdown(priceCents: number, commissionPercent: number): PriceBreakdown {
  const commission = Math.round((priceCents * commissionPercent) / 100);
  return { priceCents, commissionCents: commission, netCents: priceCents - commission };
}

// ---------------------------------------------------------------------------
// What is not ready to submit
// ---------------------------------------------------------------------------

export interface TreeForCheck {
  modules: { id: string; title: string }[];
  lessons: { moduleId: string; kind: string }[];
}

/**
 * Everything standing between this course and the review queue, in the order a
 * builder would fix them.
 *
 * ONLY WHAT THE DATABASE ACTUALLY REFUSES, plus the two things it cannot see.
 * submit_course_for_review checks the licence and "at least one lesson"; a week
 * with no lessons and a missing subtitle are not refusals, so they are not
 * listed as blockers — the caller shows them as advice and still allows submit.
 */
export function submitBlockers(tree: TreeForCheck): string[] {
  const blockers: string[] = [];
  if (tree.lessons.length === 0) blockers.push("Add at least one lesson before submitting.");
  return blockers;
}

/** Advice, not refusals: things a reviewer will probably send it back for. */
export function submitWarnings(course: { subtitle: string | null; learnPoints: string[] }, tree: TreeForCheck): string[] {
  const out: string[] = [];
  const empty = tree.modules.filter((m) => !tree.lessons.some((l) => l.moduleId === m.id));
  if (empty.length === 1) out.push(`“${empty[0].title}” has no lessons yet.`);
  else if (empty.length > 1) out.push(`${empty.length} weeks have no lessons yet.`);
  if (!course.subtitle) out.push("There's no subtitle. It's the line under the title in the catalogue.");
  if (course.learnPoints.length === 0) out.push("“What you'll learn” is empty.");
  return out;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

export type AuthorAction = "read" | "create" | "save" | "submit" | "video" | "pdf" | "options" | "revision";

/**
 * THE ONE THAT NEEDS SAYING OUT LOUD. Renaming a lesson is not a cosmetic
 * edit: when a revision is approved, learners' progress is carried across by
 * lesson TITLE and kind, so a renamed lesson is a NEW lesson and everybody who
 * had completed the old one has not completed this one. Reordering weeks,
 * renaming weeks and editing a lesson's contents all cost nothing.
 */
export const RENAME_RESETS_PROGRESS =
  "Renaming a lesson resets it for learners who have already completed it. Editing what's inside it doesn't.";

export const REVISION_EXPLAINER =
  "Your course stays live and unchanged while you edit this copy. Learners see the changes only once we've approved them.";

export const WITHDRAW_EXPLAINER = "Your published course isn't affected. Only these draft changes are lost.";

/** Words for a database refusal. Always returns something. */
export function describeAuthorError(error: { code?: string; message?: string }, action: AuthorAction): string {
  switch (error.code ?? "") {
    case "ATX66":
      return "Only professionals with a verified licence can publish courses. Check your licence in Profile.";
    case "ATX70":
      return "That isn't a link to a single YouTube video. Paste a youtube.com/watch, youtu.be or /embed link, not a playlist.";
    case "ATX64":
      return "That file wasn't uploaded by you. Try choosing it again.";
    case "ATX67":
      return action === "revision"
        ? "This course already has a revision open, or it isn't published yet."
        : action === "submit"
        ? "This course isn't in a state that can be submitted."
        : "You can't edit this right now. A published course is edited through a revision, and one that's in review is frozen until we've read it.";
    case "ATX02":
      return action === "create"
        ? "You've started a lot of courses today. Try again tomorrow."
        : action === "pdf"
        ? "That's a lot of uploads at once. Give it a minute."
        : "You've submitted a lot today. Try again tomorrow.";
    case "ATX08":
      return "That course no longer exists.";
    case "22023":
      return action === "options"
        ? "A question needs between 2 and 8 answers, with exactly one marked correct."
        : action === "submit"
        ? "Add at least one lesson before submitting."
        : "That isn't a value this field accepts.";
    case "23514":
      return "That doesn't fit. Check the lengths and numbers, and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
