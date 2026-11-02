// Release 3 · W8 the client's side of share cards (CU29, CU30): the words, as
// pure functions so node --test loads them. Copy is COPY.md "### CU29" and
// "### CU30" (source/gen/r31.js clientAsk31, clientSet31, sentToast31), with
// straight apostrophes.

import { shareDate, type CardSpec, type Visibility } from "../shareCardModel";
import { t, tk, tn } from "../../../i18n/core";

export type ShareAnswerKind = "allowed" | "allowed_no_name" | "declined";
export type WinSharingValue = "always_ask" | "always_allow" | "never";

/** How the client is shown: CU30's "· by your initials", CU29's "You'd be shown by your initials". */
export function visibilityPhrase(v: Visibility): string {
  if (v === "name") return t("by your first name");
  if (v === "none") return t("without your name");
  return t("by your initials");
}

/** CU29 body: "On Instagram and other apps. You'd be shown by your initials." */
export const askBody = (v: Visibility) => t("On Instagram and other apps. You'd be shown {how}.", { how: visibilityPhrase(v) });

/** CU29 title. */
export const askTitle = (proFirstName: string) => t("{name} would like to share your win", { name: proFirstName });

/** sentToast31, one line per answer. */
export function answerToast(a: ShareAnswerKind): string {
  if (a === "allowed") return t("Allowed. Change this in Sharing your wins.");
  if (a === "allowed_no_name") return t("Allowed without your name. Change this in Sharing your wins.");
  return t("Declined. Change this in Sharing your wins.");
}

/** The Profile row's sub line and the CU30 radio titles (English keys; t() where shown). */
export const WIN_SHARING_LABEL: Record<WinSharingValue, string> = {
  always_ask: tk("Always ask"),
  always_allow: tk("Always allow"),
  never: tk("Never allow"),
};

/** CU30's three rows, verbatim from COPY. */
export const WIN_SHARING_OPTIONS: { value: WinSharingValue; title: string; desc: string; isDefault?: boolean }[] = [
  { value: "always_ask", title: tk("Always ask"), desc: tk("You see each card first and choose Allow, Allow without my name or Decline."), isDefault: true },
  { value: "always_allow", title: tk("Always allow"), desc: tk("They can share wins without asking, by your initials. You can still remove any of them.") },
  { value: "never", title: tk("Never allow"), desc: tk("They can't share your wins or ask you.") },
];

/**
 * How a stored card shows the client when the request isn't readable: no
 * name_display or "A client" is without the name, "S.R." initials, else the
 * first name.
 */
export function visibilityFromPayload(raw: unknown): Visibility {
  const shown = raw && typeof raw === "object" ? (raw as { name_display?: unknown }).name_display : undefined;
  if (typeof shown !== "string" || !shown.trim() || shown.trim() === "A client" || shown.trim() === t("A client")) return "none";
  // Initials in any script ("S.R.", or Arabic letters on a card made in Arabic).
  return /^(\p{L}\.){1,3}$/u.test(shown.trim()) ? "initials" : "name";
}

/** A card's big number as a count ("1,000" → 1000), for the plural form. */
const countOf = (big: string) => Number(big.replace(/[^\d.]/g, "")) || 0;

/** CU30's row title from the card: "New PR · Back squat", "100-day logging streak". */
export function sharedTitle(spec: CardSpec): string {
  const subject = spec.subject?.trim();
  const title = spec.title?.trim();
  switch (spec.template) {
    case "pr":
      return subject ? t("New PR · {name}", { name: subject }) : t("New PR");
    case "prog": {
      const name = spec.hero === "num" ? subject : title;
      return name ? t("Programme complete · {name}", { name }) : t("Programme complete");
    }
    case "logging":
      return spec.big ? tn(countOf(spec.big), "{n}-day logging streak", "{n}-day logging streak", { n: spec.big }) : t("Logging streak");
    case "streak":
      return spec.big ? tn(countOf(spec.big), "{n}-day habit streak", "{n}-day habit streak", { n: spec.big }) : t("Habit streak");
    case "cons":
      return spec.big ? [spec.big, spec.unit || tn(countOf(spec.big), "workouts", "workouts"), subject].filter(Boolean).join(" ") : t("Consistency");
    case "mealplan":
      return title ? t("Meal plan complete · {name}", { name: title }) : t("Meal plan complete");
    default: {
      const e = spec.eyebrow.trim();
      return e ? e[0].toUpperCase() + e.slice(1).toLowerCase() : t("Shared card");
    }
  }
}

/**
 * CU30 row date in the app's short-date convention, the same as the
 * professional's share screens: "Oct 14"; another year adds it ("Oct 14, 2025").
 */
export const sharedDate = (iso: string, now: Date = new Date()): string => shareDate(iso, now);

/** CU30 sub line: "{pro_name} · {date} · without your name". */
export const sharedSub = (proName: string, iso: string, v: Visibility, now?: Date) => [proName, sharedDate(iso, now), visibilityPhrase(v)].filter(Boolean).join(" · ");
