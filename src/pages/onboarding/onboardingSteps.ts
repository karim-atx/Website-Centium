// Which onboarding steps an account type sees, and where a saved draft
// resumes. Pure (no React, no storage), so it is tested in node.

import type { AccountType } from "../../types";
import { validateDateOfBirth } from "../../utils/date";

/**
 * Step names. v6 (Batch 3): the client lane's four numbered steps are
 * "about", "gentle", "goals", "track" (BizOnboardingV10 KEYS for the client
 * lane), then "ready" (You're all set). The professional and business lanes
 * keep their own keys; their agents (OB-B, OB-C) add theirs here.
 */
export type StepKey =
  | "welcome"
  | "auth"
  | "accountType"
  // client lane (v6)
  | "about"
  | "gentle"
  | "goals"
  | "track"
  // professional lane (v6, Batch 3 · OB-B): specialty, six numbered steps
  | "proAbout"
  | "proWork"
  | "proServices"
  | "proCreds"
  | "proReview"
  // business lanes (v6, Batch 3 · OB-C): the type step, then six numbered
  // steps (BizOnboardingV10 KEYS business…review, prefixed so no key collides
  // with another lane's)
  | "bizType"
  | "bizBusiness"
  | "bizWhere"
  | "bizEssentials"
  | "bizPolicies"
  | "bizPayments"
  | "bizReview"
  // before v6 (read for old drafts)
  | "subtype"
  | "aboutYou"
  | "dateOfBirth"
  | "background"
  | "ready";

const STEP_KEYS: readonly StepKey[] = [
  "welcome",
  "auth",
  "accountType",
  "about",
  "gentle",
  "goals",
  "track",
  "proAbout",
  "proWork",
  "proServices",
  "proCreds",
  "proReview",
  "bizType",
  "bizBusiness",
  "bizWhere",
  "bizEssentials",
  "bizPolicies",
  "bizPayments",
  "bizReview",
  "subtype",
  "aboutYou",
  "dateOfBirth",
  "background",
  "ready",
];

/**
 * Names a professional draft saved before v6 used: About you is now Step 1,
 * and the old finish screen ("ready") is now Review and submit.
 */
const PRO_ALIASES: Record<string, StepKey> = {
  aboutYou: "proAbout",
  ready: "proReview",
};

/**
 * Names a business draft saved before v6 used: the type step replaced
 * "subtype" (its business name moved to Your business), the owner's date of
 * birth moved into Policies and verification, and the old finish screen
 * ("ready") is now Review and submit.
 */
const BIZ_ALIASES: Record<string, StepKey> = {
  subtype: "bizType",
  dateOfBirth: "bizPolicies",
  ready: "bizReview",
};

/** The business lane's steps after the account type, in order. */
export const BIZ_FLOW_STEPS = ["bizType", "bizBusiness", "bizWhere", "bizEssentials", "bizPolicies", "bizPayments", "bizReview"] as const;

/**
 * Names a client draft saved before v6 used, mapped to today's step: About you
 * keeps its place, the recovery question became A gentler start, goal and
 * activity merged into Goals and activity, tracking became What to track.
 */
const CLIENT_ALIASES: Record<string, StepKey> = {
  aboutYou: "about",
  recovery: "gentle",
  goal: "goals",
  activity: "goals",
  tracking: "track",
};

// V4 (QA 4.0): professionals are onboarding to add clients, not to be
// tracked themselves, and a business is not a person to profile: neither
// gets the client lane's tracking questions.
//
// V7's "a client with a valid code skips About You entirely" is GONE (the
// real client_codes table carries no client profile data to prefill from).
// `skipAboutYou` is kept as a parameter so the shape of this function does
// not change if that returns.
//
// "subtype" is the professional's specialty or the business's kind, asked on
// its own step straight after the account type.
export function stepsFor(accountType: AccountType | null, skipAboutYou: boolean): StepKey[] {
  const isProfessional = accountType === "professional";
  const isBusiness = accountType === "business";
  if (!isProfessional && !isBusiness) {
    // Client lane (OB-084…112): Step 1 of 4 About you, 2 A gentler start
    // (asked before goals so goals and tracking can read it), 3 Goals and
    // activity, 4 What to track, then You're all set.
    return ["welcome", "auth", "accountType", ...(skipAboutYou ? [] : (["about"] as StepKey[])), "gentle", "goals", "track", "ready"];
  }
  if (isProfessional) {
    // Professional lane (OB-136…215): the specialty ("Before step 1"), then
    // Step 1 of 6 About you, 2 Where you work, 3 Specialties and services,
    // 4 Credentials, 5 Your background, 6 Review and submit. The status
    // screens after submitting are the lane's own (not a flow step).
    return ["welcome", "auth", "accountType", "subtype", ...(skipAboutYou ? [] : (["proAbout"] as StepKey[])), "proWork", "proServices", "proCreds", "background", "proReview"];
  }
  // Business lanes (OB-051…083, 216…306): the type ("Before step 1"), then
  // Step 1 of 6 Your business, 2 Where and when, 3 Essentials, 4 Policies and
  // verification (with the owner's date of birth, task T), 5 Payments, 6 Review
  // and submit. After submitting the business lands on /app/business/setup.
  return ["welcome", "auth", "accountType", ...BIZ_FLOW_STEPS];
}

/**
 * The step list BEFORE the subtype step existed. A draft saved then stored a
 * position in this list, so it is read through it to find the step by name.
 */
function legacyStepsFor(accountType: AccountType | null): string[] {
  if (accountType !== "professional" && accountType !== "business") {
    return ["welcome", "auth", "accountType", "aboutYou", "recovery", "goal", "activity", "tracking", "ready"];
  }
  if (accountType === "professional") return ["welcome", "auth", "accountType", "aboutYou", "background", "ready"];
  return ["welcome", "auth", "accountType", "ready"];
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
  // v6: the business name is asked on Your business, after the type.
  if (d.accountType === "business") return !!d.businessType;
  return true;
}

/** Whether the draft has a date of birth the server will accept (16+). */
export function dateOfBirthComplete(d: Pick<ResumeDraft, "dateOfBirth">): boolean {
  return !!d.dateOfBirth && validateDateOfBirth(d.dateOfBirth) === null;
}

/** The step that asks for the date of birth for this account type. */
export function dateOfBirthStep(accountType: AccountType | null): StepKey {
  if (accountType === "business") return "bizPolicies";
  if (accountType === "professional") return "proAbout";
  return "about";
}

/** The draft lane a step belongs to (onboarding_drafts.lane). */
export function laneOf(accountType: AccountType | null): "client" | "professional" | "business" | null {
  if (accountType === "customer") return "client";
  if (accountType === "professional") return "professional";
  if (accountType === "business") return "business";
  return null;
}

/**
 * Where a saved draft resumes, as an index into stepsFor(draft).
 *
 * THE STEP IS SAVED BY NAME ("about"), not by position, because a new step
 * shifts every position after it. An older draft saved a number; that is read
 * against the old list to recover the name. A client draft from before v6
 * carries an old name, mapped through CLIENT_ALIASES. Either way the name is
 * then found in today's list, so nobody resumes one step off.
 *
 * Never past an unanswered subtype, and never past a missing date of birth
 * (task T): it lands on the step that asks for it.
 */
export function resumeIndex(stored: string | null, draft: ResumeDraft, skipAboutYou: boolean): number {
  const steps = stepsFor(draft.accountType, skipAboutYou);
  const isClient = draft.accountType !== "professional" && draft.accountType !== "business";
  const isPro = draft.accountType === "professional";
  const isBiz = draft.accountType === "business";
  let key: string | null = null;
  if (
    stored &&
    ((STEP_KEYS as readonly string[]).includes(stored) ||
      (isClient && stored in CLIENT_ALIASES) ||
      (isPro && stored in PRO_ALIASES) ||
      (isBiz && stored in BIZ_ALIASES))
  ) {
    key = stored;
  } else if (stored !== null && stored.trim() !== "") {
    const n = Number(stored);
    if (Number.isInteger(n) && n >= 0) {
      const legacy = legacyStepsFor(draft.accountType);
      key = legacy[Math.min(n, legacy.length - 1)];
    }
  }
  if (!key) return 0;
  if (isClient && key in CLIENT_ALIASES) key = CLIENT_ALIASES[key];
  if (isPro && key in PRO_ALIASES) key = PRO_ALIASES[key];
  if (isBiz && key in BIZ_ALIASES) key = BIZ_ALIASES[key];
  let at = steps.indexOf(key as StepKey);
  // A key this account type does not have (e.g. "subtype" for a customer):
  // back to choosing the account type.
  if (at < 0) at = steps.indexOf("accountType");
  const sub = steps.indexOf(isBiz ? "bizType" : "subtype");
  if (sub >= 0 && at > sub && !subtypeComplete(draft)) at = sub;
  // A business never resumes past Your business without its name.
  const named = steps.indexOf("bizBusiness");
  if (named >= 0 && at > named && !draft.businessName.trim()) at = named;
  const dob = steps.indexOf(dateOfBirthStep(draft.accountType));
  if (dob >= 0 && at > dob && !dateOfBirthComplete(draft)) at = dob;
  return at;
}
