// Which onboarding steps an account type sees, and where a saved draft
// resumes. Pure (no React, no storage), so it is tested in node.

import type { AccountType } from "../../types";
import { validateDateOfBirth } from "../../utils/date";

export type StepKey =
  | "welcome"
  | "auth"
  | "accountType"
  | "subtype"
  | "aboutYou"
  | "dateOfBirth"
  | "background"
  | "goal"
  | "activity"
  | "recovery"
  | "tracking"
  | "ready";

const STEP_KEYS: readonly StepKey[] = [
  "welcome",
  "auth",
  "accountType",
  "subtype",
  "aboutYou",
  "dateOfBirth",
  "background",
  "goal",
  "activity",
  "recovery",
  "tracking",
  "ready",
];

// V4 (QA 4.0): professionals are onboarding to add clients, not to be
// tracked themselves — the goal/activity-level/tracking-preference steps
// are customer-only questions, so professionals skip straight from About
// You to the finish screen (coaching-app style onboarding, not a client
// health-tracking wizard).
//
// V7's "a client with a valid code skips About You entirely" is GONE, and
// deliberately so: it depended on the professional having pre-entered the
// client's name/age/height/sex/weight onto the code. The real `client_codes`
// table has no such columns and `preview_client_code` returns none — only
// the professional's own name, avatar, subtype and expiry. With no data to
// prefill from, skipping the step would have left the client defaulted to
// "Friend", 28 years, 170cm, 70kg. Every client now fills in About You.
// Restoring the shortcut needs those columns added on the database side
// first. `skipAboutYou` is kept as a parameter so the shape of this
// function doesn't change if that happens.
//
// "subtype" is the professional's specialty or the business's kind, asked on
// its own step straight after the account type. Customers skip it: their
// "General / Client of a professional" choice stays on the account-type step.
export function stepsFor(accountType: AccountType | null, skipAboutYou: boolean): StepKey[] {
  const isProfessional = accountType === "professional";
  // V7 (QA 7.0): a business isn't a person to profile/track either — same
  // "land straight past the personal-tracking questions" treatment as a
  // professional.
  const isBusiness = accountType === "business";
  return [
    "welcome",
    "auth",
    "accountType",
    ...(isProfessional || isBusiness ? (["subtype"] as StepKey[]) : []),
    ...(skipAboutYou || isBusiness ? [] : (["aboutYou"] as StepKey[])),
    // Task T: a date of birth is required for every account type. Clients and
    // professionals give it on About You; a business has no About You, so it
    // gets this one-field step for the person who runs the account.
    ...(isBusiness ? (["dateOfBirth"] as StepKey[]) : []),
    // The optional CV step, straight after the name + certificate step.
    ...(isProfessional ? (["background"] as StepKey[]) : []),
    // QA 13.0: recovery-sensitive is asked before goal and activity so those
    // two steps can already read `draft.recoverySensitive` when they render.
    ...(isProfessional || isBusiness ? [] : (["recovery", "goal", "activity", "tracking"] as StepKey[])),
    "ready",
  ];
}

/**
 * The step list BEFORE the subtype step existed. A draft saved then stored a
 * position in this list, so it is read through it to find the step by name.
 */
function legacyStepsFor(accountType: AccountType | null): StepKey[] {
  return stepsFor(accountType, false).filter((k) => k !== "subtype" && k !== "dateOfBirth");
}

export interface ResumeDraft {
  accountType: AccountType | null;
  professionalSubtype: string | null;
  businessType: string | null;
  businessName: string;
  dateOfBirth: string;
}

/** Whether the step after the account type has what it needs. */
export function subtypeComplete(d: ResumeDraft): boolean {
  if (d.accountType === "professional") return !!d.professionalSubtype;
  if (d.accountType === "business") return !!d.businessType && d.businessName.trim().length > 0;
  return true;
}

/** Whether the draft has a date of birth the server will accept (16+). */
export function dateOfBirthComplete(d: Pick<ResumeDraft, "dateOfBirth">): boolean {
  return !!d.dateOfBirth && validateDateOfBirth(d.dateOfBirth) === null;
}

/** The step that asks for the date of birth for this account type. */
export function dateOfBirthStep(accountType: AccountType | null): StepKey {
  return accountType === "business" ? "dateOfBirth" : "aboutYou";
}

/**
 * Where a saved draft resumes, as an index into stepsFor(draft).
 *
 * THE STEP IS SAVED BY NAME now ("aboutYou"), not by position, because a new
 * step shifts every position after it. An older draft saved a number; that is
 * read against the old list to recover the name. Either way the name is then
 * found in today's list, so nobody resumes one step off.
 *
 * Never past an unanswered subtype: someone saved beyond it without a
 * specialty or business type lands on the subtype step first. And never past
 * a missing date of birth (task T): it lands on the step that asks for it.
 */
export function resumeIndex(stored: string | null, draft: ResumeDraft, skipAboutYou: boolean): number {
  const steps = stepsFor(draft.accountType, skipAboutYou);
  let key: StepKey | null = null;
  if (stored && (STEP_KEYS as readonly string[]).includes(stored)) {
    key = stored as StepKey;
  } else if (stored !== null && stored.trim() !== "") {
    const n = Number(stored);
    if (Number.isInteger(n) && n >= 0) {
      const legacy = legacyStepsFor(draft.accountType);
      key = legacy[Math.min(n, legacy.length - 1)];
    }
  }
  if (!key) return 0;
  let at = steps.indexOf(key);
  // A key this account type does not have (e.g. "subtype" for a customer):
  // back to choosing the account type.
  if (at < 0) at = steps.indexOf("accountType");
  const sub = steps.indexOf("subtype");
  if (sub >= 0 && at > sub && !subtypeComplete(draft)) at = sub;
  const dob = steps.indexOf(dateOfBirthStep(draft.accountType));
  if (dob >= 0 && at > dob && !dateOfBirthComplete(draft)) at = dob;
  return at;
}
