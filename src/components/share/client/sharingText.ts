// Release 3 · W8 the client's side of share cards (CU29, CU30): the words, as
// pure functions so node --test loads them. Copy is COPY.md "### CU29" and
// "### CU30" (source/gen/r31.js clientAsk31, clientSet31, sentToast31), with
// straight apostrophes.

import type { CardSpec, Visibility } from "../shareCardModel";

export type ShareAnswerKind = "allowed" | "allowed_no_name" | "declined";
export type WinSharingValue = "always_ask" | "always_allow" | "never";

/** How the client is shown: CU30's "· by your initials", CU29's "You'd be shown by your initials". */
export function visibilityPhrase(v: Visibility): string {
  if (v === "name") return "by your first name";
  if (v === "none") return "without your name";
  return "by your initials";
}

/** CU29 body: "On Instagram and other apps. You'd be shown by your initials." */
export const askBody = (v: Visibility) => `On Instagram and other apps. You'd be shown ${visibilityPhrase(v)}.`;

/** CU29 title. */
export const askTitle = (proFirstName: string) => `${proFirstName} would like to share your win`;

/** sentToast31, one line per answer. */
export function answerToast(a: ShareAnswerKind): string {
  if (a === "allowed") return "Allowed. Change this in Sharing your wins.";
  if (a === "allowed_no_name") return "Allowed without your name. Change this in Sharing your wins.";
  return "Declined. Change this in Sharing your wins.";
}

/** The Profile row's sub line and the CU30 radio titles. */
export const WIN_SHARING_LABEL: Record<WinSharingValue, string> = {
  always_ask: "Always ask",
  always_allow: "Always allow",
  never: "Never allow",
};

/** CU30's three rows, verbatim from COPY. */
export const WIN_SHARING_OPTIONS: { value: WinSharingValue; title: string; desc: string; isDefault?: boolean }[] = [
  { value: "always_ask", title: "Always ask", desc: "You see each card first and choose Allow, Allow without my name or Decline.", isDefault: true },
  { value: "always_allow", title: "Always allow", desc: "They can share wins without asking, by your initials. You can still remove any of them." },
  { value: "never", title: "Never allow", desc: "They can't share your wins or ask you." },
];

/**
 * How a stored card shows the client when the request isn't readable: no
 * name_display or "A client" is without the name, "S.R." initials, else the
 * first name.
 */
export function visibilityFromPayload(raw: unknown): Visibility {
  const shown = raw && typeof raw === "object" ? (raw as { name_display?: unknown }).name_display : undefined;
  if (typeof shown !== "string" || !shown.trim() || shown.trim() === "A client") return "none";
  return /^([A-Z]\.){1,3}$/.test(shown.trim()) ? "initials" : "name";
}

/** CU30's row title from the card: "New PR · Back squat", "100-day logging streak". */
export function sharedTitle(spec: CardSpec): string {
  const subject = spec.subject?.trim();
  const title = spec.title?.trim();
  switch (spec.template) {
    case "pr":
      return subject ? `New PR · ${subject}` : "New PR";
    case "prog": {
      const name = spec.hero === "num" ? subject : title;
      return name ? `Programme complete · ${name}` : "Programme complete";
    }
    case "logging":
      return spec.big ? `${spec.big}-day logging streak` : "Logging streak";
    case "streak":
      return spec.big ? `${spec.big}-day habit streak` : "Habit streak";
    case "cons":
      return spec.big ? [spec.big, spec.unit || "workouts", subject].filter(Boolean).join(" ") : "Consistency";
    case "mealplan":
      return title ? `Meal plan complete · ${title}` : "Meal plan complete";
    default: {
      const e = spec.eyebrow.trim();
      return e ? e[0].toUpperCase() + e.slice(1).toLowerCase() : "Shared card";
    }
  }
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** CU30 "14 Oct"; another year adds it ("14 Oct 2025"). */
export function sharedDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** CU30 sub line: "{pro_name} · {date} · without your name". */
export const sharedSub = (proName: string, iso: string, v: Visibility, now?: Date) => [proName, sharedDate(iso, now), visibilityPhrase(v)].filter(Boolean).join(" · ");
