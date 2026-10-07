// The shared forum's rules that need no network: who may enter, what a
// nickname may be, which categories recovery-sensitive mode hides, and the
// words for each refusal the database can raise (Database 630f2cd, 27141fa,
// df67bd8). Kept free of the Supabase client so it can be tested directly.

import { ageFromDateOfBirth } from "../../utils/date";

/** Design screen 1, and the brief's wording for an under-18 who opens the link. */
export const ADULTS_ONLY_TEXT = "The community is for adults. You can join the forum from age 18.";
/**
 * An older account with no date of birth on file. The server refuses it too
 * (user_is_confirmed_adult needs a date to do the arithmetic on), so the page
 * says what would let them in rather than calling them a minor.
 */
export const NEEDS_DOB_TEXT = "Add your date of birth in Profile to join the forum.";

export type ForumAccess = "adult" | "minor" | "unknown-age";

/** The device's view of the age gate. The server's own gate (ATX55) is the authority. */
export function forumAccess(dateOfBirth: string | null | undefined): ForumAccess {
  const age = ageFromDateOfBirth(dateOfBirth);
  if (age === undefined) return "unknown-age";
  return age >= 18 ? "adult" : "minor";
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface ForumCategory {
  key: string;
  name: string;
  /** forum_categories.sensitivity: general | diet | weight. */
  sensitivity: string;
  sortOrder: number;
}

/**
 * The sensitivities recovery-sensitive mode hides: Nutrition (diet) and
 * Progress (weight). Read from the category's own sensitivity rather than its
 * name, so a renamed category keeps its treatment.
 */
const RECOVERY_HIDDEN = new Set(["diet", "weight"]);

export function hiddenInRecovery(category: Pick<ForumCategory, "sensitivity"> | undefined): boolean {
  return !!category && RECOVERY_HIDDEN.has(category.sensitivity);
}

/** The filter chips on the main screen: every category but General, in sort order (design screen 1). */
export function filterChips(categories: ForumCategory[], recoveryOn: boolean): ForumCategory[] {
  return [...categories]
    .filter((c) => c.key !== "general")
    .filter((c) => !(recoveryOn && hiddenInRecovery(c)))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The composer's chips: all five (design screen 3), less the hidden ones in recovery mode. */
export function composeChips(categories: ForumCategory[], recoveryOn: boolean): ForumCategory[] {
  return [...categories]
    .filter((c) => !(recoveryOn && hiddenInRecovery(c)))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ---------------------------------------------------------------------------
// Nicknames
// ---------------------------------------------------------------------------

export const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export type NicknameProblem = "format" | "reserved" | "real-name" | null;

/**
 * The checks the device can make before asking the server. The format is the
 * table's own CHECK; "reserved" is an exact match against
 * forum_reserved_nicknames, like the server's guard (ATX56); "real-name" is
 * the design's first rule, which only the device can apply because only the
 * device knows the name it is looking at.
 */
export function nicknameProblem(
  nickname: string,
  reserved: ReadonlySet<string>,
  ownNames: string[]
): NicknameProblem {
  const n = nickname.trim();
  if (!NICKNAME_PATTERN.test(n)) return "format";
  const lower = n.toLowerCase();
  if (reserved.has(lower)) return "reserved";
  const squashed = lower.replace(/_/g, "");
  // Each word of the name on its own, so "Mary Ann" catches "MaryRuns".
  for (const word of ownNames.flatMap((n) => n.split(/\s+/))) {
    const own = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (own.length >= 3 && squashed.includes(own)) return "real-name";
  }
  return null;
}

export const NICKNAME_PROBLEM_TEXT: Record<Exclude<NicknameProblem, null>, string> = {
  format: "Use 3 to 20 letters, numbers or underscores.",
  reserved: "That sounds like an official account. Choose a different nickname.",
  "real-name": "That looks like your real name. Choose a nickname that isn't.",
};

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

export type ForumAction =
  | "post"
  | "reply"
  | "report"
  | "photo"
  | "nickname"
  | "block"
  | "like"
  | "read"
  | "edit"
  | "withdraw";

/**
 * The words for a database refusal. Null when the code is not one of the
 * forum's own, so the caller falls back to its generic sentence.
 *
 * ATX57 carries the date in the server's message ("... paused until Friday 09
 * Oct"), which is the only place the member can learn it: forum_suspensions
 * has no client policy.
 */
export function describeForumError(
  error: { code?: string; message?: string },
  action: ForumAction
): string | null {
  const message = error.message ?? "";
  switch (error.code ?? "") {
    case "ATX55":
      return ADULTS_ONLY_TEXT;
    case "ATX56":
      return NICKNAME_PROBLEM_TEXT.reserved;
    case "ATX57": {
      const until = /paused until (.+)$/i.exec(message)?.[1]?.trim();
      return until
        ? `Your access to the community forum is paused until ${until}.`
        : "Your access to the community forum is paused for now.";
    }
    case "ATX58":
      return "Choose a forum nickname before posting under one.";
    case "ATX59":
      return "Professionals post under their own name.";
    case "ATX60":
      return "That contains a word this community doesn't allow. Edit it and try again.";
    // One refusal for every reason, on purpose (it does not say whether the
    // post exists or whose it is). From the author's own menu, the only
    // ordinary cause is the 30-minute edit window.
    case "ATX62":
      return action === "edit"
        ? "This can no longer be edited. Posts can be edited for 30 minutes after posting."
        : "This couldn't be withdrawn. It may already have been removed.";
    case "ATX63":
      return "That nickname is taken. Choose a different one.";
    case "ATX64":
      return "That photo couldn't be attached. Add it again.";
    case "ATX65":
      return "That post isn't available any more.";
    case "ATX08":
      return "That post isn't available any more.";
    case "ATX02":
      switch (action) {
        case "post":
          return "You've reached the limit of 5 posts an hour. Try again later.";
        case "reply":
          return "You've reached the limit of 20 replies an hour. Try again later.";
        case "report":
          return "You've sent a lot of reports in the last hour. Try again later.";
        case "photo":
          return "Too many photos were started in the last hour. Try again later.";
        default:
          return "That's too many in a short time. Try again later.";
      }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * "2h", "40m", "Yesterday", "3d": the design's meta line. Older ages stay a
 * day count ("40d"), as MO1.3 draws "Pinned · 40d" and "38d ago".
 */
export function forumAge(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d`;
}

/** The initial in an author circle. Never an avatar: a nickname post would otherwise show a face. */
export function initialOf(label: string): string {
  const ch = Array.from(label.trim())[0];
  return ch ? ch.toUpperCase() : "?";
}

/**
 * Two initials for a name ("Elie S." → "ES", MO1.3 `MO1.3.es`): the first
 * letter of the first two words, or one letter for a one-word name.
 */
export function initialsOf(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((w) => Array.from(w).find((c) => /\p{L}|\p{N}/u.test(c)) ?? "")
    .join("");
  return letters ? letters.toUpperCase() : initialOf(label);
}

export type ReportReasonKey =
  | "harmful_health_advice"
  | "harassment"
  | "inappropriate_content"
  | "impersonation"
  | "spam";

/** Design screen 5's five reasons, in its order, mapped to report_reason values. */
export const FORUM_REPORT_REASONS: { value: ReportReasonKey; label: string }[] = [
  { value: "harmful_health_advice", label: "Harmful or unsafe health advice" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "spam", label: "Spam" },
];
