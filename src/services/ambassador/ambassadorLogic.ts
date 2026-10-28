// Release B · B2 Ambassador applications (PLAN S3, Database
// 20261217040000_applying_to_be_an_ambassador): the pure parts, tested
// without a database (ambassadorLogic.test.ts). The I/O lives in ./index.ts.
//
// - my_ambassador_application(): always ONE row, the latest application (or
//   nulls), next_eligible_at, is_ambassador and the checklist as booleans
//   with their counts and thresholds (Karim's 30 days and 3 friends live in
//   the server's ambassador_eligibility(), so the copy reads them from here).
// - apply_for_ambassador(p_motivation, p_link, p_accept_terms) → uuid,
//   metered 5 an hour; each refusal is its own SQLSTATE (APPLY_REFUSALS).

/** "closed" (Database 20261219000000): the application was overtaken by a
 *  grant made another way (an admin gave the status directly). Neither
 *  approved nor declined: no notice, no 90-day wait. */
export type AmbassadorApplicationState = "pending" | "approved" | "declined" | "closed";

/** One my_ambassador_application() row. */
export interface MyAmbassadorApplicationRow {
  application_id: string | null;
  status: string | null;
  motivation: string | null;
  link: string | null;
  created_at: string | null;
  decided_at: string | null;
  reason: string | null;
  next_eligible_at: string | null;
  is_ambassador: boolean | null;
  confirmed_adult: boolean | null;
  account_age_days: number | null;
  required_account_days: number | null;
  account_old_enough: boolean | null;
  successful_referrals: number | null;
  required_referrals: number | null;
  enough_referrals: boolean | null;
  no_suspension: boolean | null;
  can_apply: boolean | null;
}

export interface AmbassadorStatus {
  application: { id: string; status: AmbassadorApplicationState; createdAt: string; decidedAt: string | null; reason: string | null } | null;
  /** Set only while a decline's 90 days run. */
  nextEligibleAt: string | null;
  isAmbassador: boolean;
  confirmedAdult: boolean;
  accountAgeDays: number;
  requiredAccountDays: number;
  accountOldEnough: boolean;
  successfulReferrals: number;
  requiredReferrals: number;
  enoughReferrals: boolean;
  noSuspension: boolean;
  canApply: boolean;
}

const STATES: readonly string[] = ["pending", "approved", "declined", "closed"];
const int = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** A row to the status. A missing or unreadable row is "not eligible, nothing sent": the honest default. */
export function toAmbassadorStatus(row: MyAmbassadorApplicationRow | null | undefined): AmbassadorStatus {
  const app =
    row?.application_id && row.status && STATES.includes(row.status) && row.created_at
      ? { id: row.application_id, status: row.status as AmbassadorApplicationState, createdAt: row.created_at, decidedAt: row.decided_at ?? null, reason: row.reason?.trim() || null }
      : null;
  return {
    application: app,
    nextEligibleAt: row?.next_eligible_at ?? null,
    isAmbassador: row?.is_ambassador === true,
    confirmedAdult: row?.confirmed_adult === true,
    accountAgeDays: int(row?.account_age_days, 0),
    // The server's thresholds; Karim's figures only stand in if a row omits them.
    requiredAccountDays: int(row?.required_account_days, 30),
    accountOldEnough: row?.account_old_enough === true,
    successfulReferrals: int(row?.successful_referrals, 0),
    requiredReferrals: int(row?.required_referrals, 3),
    enoughReferrals: row?.enough_referrals === true,
    noSuspension: row?.no_suspension === true,
    canApply: row?.can_apply === true,
  };
}

/** "Jan 26": month first, as everywhere in the app (D-02; PLAN S3's "d MMM" was wrong). A bare date is that calendar day, not UTC midnight. */
export function shortDayMonth(value: string): string | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
}

/** The figure an ambassador earns per friend (PLAN S3 "What you get").
 *  Mirrors referral_terms_for() (20261217050000): no reader returns the
 *  ambassador figure to somebody who isn't one yet (referral_summary gives
 *  the caller's own, 1,500), so it is named here once. */
export const AMBASSADOR_REFERRER_POINTS = 2000;

export function whatYouGetLine(points = AMBASSADOR_REFERRER_POINTS): string {
  return `${points.toLocaleString("en-US")} points per friend who joins`;
}

export interface ChecklistRow {
  key: "adult" | "account_age" | "referrals" | "suspension";
  label: string;
  done: boolean;
}

/** "Who can apply": the server's booleans, worded with its own thresholds. */
export function checklistRows(s: AmbassadorStatus): ChecklistRow[] {
  return [
    { key: "adult", label: "18 or older", done: s.confirmedAdult },
    { key: "account_age", label: `On Centium for ${s.requiredAccountDays} days`, done: s.accountOldEnough },
    { key: "referrals", label: `${s.requiredReferrals} friends joined with your code`, done: s.enoughReferrals },
    { key: "suspension", label: "No suspensions on record", done: s.noSuspension },
  ];
}

/** "{n} more friend(s) to go." under the list while the friends row is open. */
export function friendsToGoLine(s: AmbassadorStatus): string | null {
  if (s.enoughReferrals) return null;
  const n = Math.max(1, s.requiredReferrals - s.successfulReferrals);
  return n === 1 ? "1 more friend to go." : `${n} more friends to go.`;
}

export type StatusCard =
  | { kind: "pending"; heading: string; line: string }
  | { kind: "approved"; heading: string; line: string }
  | { kind: "declined"; heading: string; line: string };

/**
 * The Referral popup's status card (PLAN S3), or null when the entry row
 * shows instead:
 * - pending: "Application under review" / "Sent {MMM d}. We'll let you know.";
 * - approved while the status holds: "You're a Centium Ambassador" / "Your
 *   new rewards apply to friends who join from now on.";
 * - declined while the 90 days run: "Not this time" / "{reason} You can apply
 *   again from {MMM d}." Once they've passed, the entry row is back;
 * - closed (made an ambassador another way while it was open): the approved
 *   card while the status holds. Closed after a revoke shows no card: a
 *   closed application doesn't block a new one, so the entry row is back.
 */
export function statusCard(s: AmbassadorStatus): StatusCard | null {
  const a = s.application;
  if (a?.status === "pending") {
    const sent = shortDayMonth(a.createdAt);
    return { kind: "pending", heading: "Application under review", line: `${sent ? `Sent ${sent}. ` : ""}We'll let you know.` };
  }
  if ((a?.status === "approved" || a?.status === "closed") && s.isAmbassador) {
    return { kind: "approved", heading: "You're a Centium Ambassador", line: "Your new rewards apply to friends who join from now on." };
  }
  if (a?.status === "declined" && s.nextEligibleAt) {
    const again = shortDayMonth(s.nextEligibleAt);
    const reason = a.reason ? (/[.!?]$/.test(a.reason) ? a.reason : `${a.reason}.`) : null;
    const parts = [reason, again ? `You can apply again from ${again}.` : null].filter(Boolean);
    return { kind: "declined", heading: "Not this time", line: parts.join(" ") };
  }
  return null;
}

/** The entry row ("Share Centium often? Apply to be an ambassador"): hidden for ambassadors and while a status card shows. */
export function showEntryRow(s: AmbassadorStatus): boolean {
  return !s.isAmbassador && statusCard(s) === null;
}

// ---- the form ----

export const MOTIVATION_MAX = 500;
/** The server's link rule: http(s), no spaces, 300 at most. */
export const LINK_MAX = 300;

export function linkProblem(link: string): string | null {
  const v = link.trim();
  if (!v) return null;
  if (v.length > LINK_MAX || !/^https?:\/\/\S+$/i.test(v)) return "Start the link with https:// (or http://).";
  return null;
}

/** Send is offered once every checklist row is green, why is written, the link is fine and the terms are ticked. */
export function canSend(s: AmbassadorStatus, form: { motivation: string; link: string; terms: boolean }): boolean {
  const why = form.motivation.trim();
  return s.canApply && why.length > 0 && why.length <= MOTIVATION_MAX && !linkProblem(form.link) && form.terms;
}

/**
 * apply_for_ambassador's refusals, each its own code (the migration's table),
 * to plain lines. ATXJ2 carries the date in its HINT ("YYYY-MM-DD").
 */
export const APPLY_REFUSALS: Readonly<Record<string, string>> = {
  ATX10: "You're already a Centium Ambassador.",
  ATXJ1: "You've already applied. We'll let you know.",
  ATXJ2: "You can apply again later.",
  ATX47: "Ambassadors need to be 18 or older.",
  ATX48: "Add your date of birth to your profile before you apply.",
  ATXJ3: "You can apply once you've been on Centium for 30 days.",
  ATXJ4: "You can apply once 3 friends have joined with your code.",
  ATXJ5: "Accounts with a suspension on record can't apply.",
  ATXJ0: "Agree to the Ambassador terms to send your application.",
  "22023": "Check your answer: up to 500 characters, and a link that starts with https://.",
  ATX02: "Please wait a little before trying again.",
};

export const APPLY_FALLBACK = "Couldn't send your application. Try again.";

export function applyRefusalLine(error: { code?: string; hint?: string | null }): string {
  const code = error.code ?? "";
  if (code === "ATXJ2") {
    const again = error.hint ? shortDayMonth(error.hint.trim()) : null;
    return again ? `You can apply again from ${again}.` : APPLY_REFUSALS.ATXJ2;
  }
  if (code === "ATX06" || code === "42501" || code === "PGRST301") return "You need to be signed in to apply. Sign in and try again.";
  return Object.prototype.hasOwnProperty.call(APPLY_REFUSALS, code) ? APPLY_REFUSALS[code] : APPLY_FALLBACK;
}
