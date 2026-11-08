// The shared forum's rules that need no network: who may enter, what a
// nickname may be, which categories recovery-sensitive mode hides, and the
// words for each refusal the database can raise (Database 630f2cd, 27141fa,
// df67bd8). Kept free of the Supabase client so it can be tested directly.

import { ageFromDateOfBirth, detailDate, formatShortDate } from "../../utils/date";
import { t, tk } from "../../i18n/core";
import { ACCOUNT_HELD } from "../account-standing/model";

/** Design screen 1, and the brief's wording for an under-18 who opens the link. */
export const ADULTS_ONLY_TEXT = tk("The community is for adults. You can join the forum from age 18.");
/**
 * An older account with no date of birth on file. The server refuses it too
 * (user_is_confirmed_adult needs a date to do the arithmetic on), so the page
 * says what would let them in rather than calling them a minor.
 */
export const NEEDS_DOB_TEXT = tk("Add your date of birth in Profile to join the forum.");

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

/**
 * ATXK1's DETAIL, the next allowed change as an ISO-8601 UTC time, as the
 * person's own calendar day ("Nov 27", with the year when it isn't this
 * year). Read as the full instant, not the UTC date: a change allowed at
 * 23:00 UTC is already the next day in Beirut.
 */
export function nicknameNextChange(details: string | null | undefined, now: Date = new Date()): string | null {
  if (!details || !/^\d{4}-\d{2}-\d{2}T/.test(details)) return null;
  const d = new Date(details);
  if (Number.isNaN(d.getTime())) return null;
  const sameYear = d.getFullYear() === now.getFullYear();
  return formatShortDate(d, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export const NICKNAME_PROBLEM_TEXT: Record<Exclude<NicknameProblem, null>, string> = {
  format: tk("Use 3 to 20 letters, numbers or underscores."),
  reserved: tk("That sounds like an official account. Choose a different nickname."),
  "real-name": tk("That looks like your real name. Choose a nickname that isn't."),
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
 * ATX57 carries the date the pause ends, the only place the member can learn
 * it (forum_suspensions has no client policy). The server sends it as
 * ISO-8601 in DETAIL, shown month first ("Oct 9"); an older server put it in
 * the message ("... paused until Friday 09 Oct"), which is still read.
 */
export function describeForumError(
  error: { code?: string; message?: string; details?: string | null },
  action: ForumAction
): string | null {
  const message = error.message ?? "";
  switch (error.code ?? "") {
    // Round I · FG: ATXR1, the account is under review (any action it guards).
    case "ATXR1":
      return t(ACCOUNT_HELD);
    case "ATX55":
      return t(ADULTS_ONLY_TEXT);
    case "ATX56":
      return t(NICKNAME_PROBLEM_TEXT.reserved);
    case "ATX57": {
      const until = detailDate(error.details) ?? /paused until (.+)$/i.exec(message)?.[1]?.trim();
      return until
        ? t("Your access to the community forum is paused until {date}.", { date: until })
        : t("Your access to the community forum is paused for now.");
    }
    case "ATX58":
      return t("Choose a forum nickname before posting under one.");
    case "ATX59":
      return t("Professionals post under their own name.");
    case "ATX60":
      return t("That contains a word this community doesn't allow. Edit it and try again.");
    // One refusal for every reason, on purpose (it does not say whether the
    // post exists or whose it is). From the author's own menu, the only
    // ordinary cause is the 30-minute edit window.
    case "ATX62":
      return action === "edit"
        ? t("This can no longer be edited. Posts can be edited for 30 minutes after posting.")
        : t("This couldn't be withdrawn. It may already have been removed.");
    case "ATX63":
      return t("That nickname is taken. Choose a different one.");
    // Release 1 (Database 20261220030000): one change in 30 days, the next
    // allowed time in DETAIL; and no contact details, links or digit runs.
    case "ATXK1": {
      const on = nicknameNextChange(error.details);
      return on ? t("You can change your nickname again on {date}.", { date: on }) : t("You can change your nickname once every 30 days.");
    }
    case "ATXK2":
      return t("A nickname can't contain a phone number or other contact details.");
    case "ATX64":
      return t("That photo couldn't be attached. Add it again.");
    case "ATX65":
      return t("That post isn't available any more.");
    case "ATX08":
      return t("That post isn't available any more.");
    case "ATX02":
      switch (action) {
        case "post":
          return t("You've reached the limit of 5 posts an hour. Try again later.");
        case "reply":
          return t("You've reached the limit of 20 replies an hour. Try again later.");
        case "report":
          return t("You've sent a lot of reports in the last hour. Try again later.");
        case "photo":
          return t("Too many photos were started in the last hour. Try again later.");
        default:
          return t("That's too many in a short time. Try again later.");
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

/**
 * Round K (K-DEL), Karim 2026-11-08: the ONE place a forum author's label becomes the
 * shown words, in the reader's language. Used for forum_author_labels, my_forum_blocks
 * and the forum inbox payloads (forum_reply, forum_comment_reply, forum_mention).
 *
 * Database 20261226590000 sends a key in its OWN column, label_key, with label null:
 *   deleted_member  the author erased their account  -> "Deleted member"
 *   member          there is no name to show         -> "Member"
 * An unknown key says "Member". The key is never read from label: a nickname may be
 * any [A-Za-z0-9_]{3,20}, so "deleted_member" and "member" are nicknames people can pick.
 *
 * Before that migration the server sent English in label and no label_key at all. Only
 * when label_key is ABSENT (undefined), "Deleted account" (a null author; no nickname
 * holds a space) and "Member" (no nickname or first name) are read as those two.
 * The old "Member" was ambiguous: a nickname spelled Member gave the same label, so
 * such a member reads «عضو» in Arabic on old data, as the migration's own conversion
 * of stored copies does. When label_key is present (even null), label is shown as typed.
 */
const LABEL_KEYS: ReadonlyMap<string, string> = new Map([
  ["deleted_member", tk("Deleted member")],
  ["member", tk("Member")],
]);
const LEGACY_LABELS: ReadonlyMap<string, string> = new Map([
  ["Deleted account", tk("Deleted member")],
  ["Member", tk("Member")],
]);
export function shownAuthorLabel(label: string | null | undefined, labelKey?: string | null): string {
  if (typeof labelKey === "string" && labelKey !== "") return t(LABEL_KEYS.get(labelKey) ?? "Member");
  if (typeof label === "string" && label.trim() !== "") {
    if (labelKey === undefined) {
      const legacy = LEGACY_LABELS.get(label);
      if (legacy) return t(legacy);
    }
    return label;
  }
  return t("Member");
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
  { value: "harmful_health_advice", label: tk("Harmful or unsafe health advice") },
  { value: "harassment", label: tk("Harassment or bullying") },
  { value: "inappropriate_content", label: tk("Inappropriate content") },
  { value: "impersonation", label: tk("Pretending to be someone else") },
  { value: "spam", label: tk("Spam") },
];
