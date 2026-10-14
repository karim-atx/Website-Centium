// The gym Front desk's pure rules (v6 Batch 4 · OP1-013…OP1-036 and
// OURS-OP1-front-desk-scan). No Supabase here, so node --test can load it.
//
// What exists on the local stack (checked 14 Oct 2026): verify_gym_pass(token)
// (no entry is recorded, no plan name: V6-159 adds it), mark_gym_membership_paid(id),
// my_venues(), venue_members(gym, status, limit, offset). Check-ins (B10,
// BU2-07), renewal reminders and end-at-period-end (B9, BU2-09) and day pass
// sales (BU2-10) are not there yet: each screen shows its pending state until
// they land. The Memberships tab is the plan list (pages/business-ops/plans).

import { dayMonthYear, type PassState } from "../venues/venueLogic";
import type { VenueMember } from "../venues/consoleLogic";
import { clock12 } from "../../utils/time12";

// ---------------------------------------------------------------------------
// Dates

/** A local calendar date as YYYY-MM-DD. */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

// ---------------------------------------------------------------------------
// verify_gym_pass()

export type VerifyRow = {
  valid: boolean | null;
  pass_state: string | null;
  membership_id: string | null;
  gym_id: string | null;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  expires_on: string | null;
  /** V6-159 (BU2-08 extension): not returned yet. */
  plan_name?: string | null;
};

/**
 * What a scan can say. verify_gym_pass's pass_state is gym_pass_state()
 * (20261121020000): 'upcoming' for a renewal not in force yet. 'unknown' with
 * no membership is the foreign or made-up token the reader answers by design
 * ("not recognised"); 'unknown' WITH a membership, or any value the app does
 * not know, is the terminal state that should never appear: "unavailable",
 * logged, never valid.
 */
export type ScanState = Exclude<PassState, "unknown"> | "unknown" | "unavailable";

export interface PassCheck {
  valid: boolean;
  state: ScanState;
  membershipId: string | null;
  gymId: string | null;
  /** The backend's first name; null for an unknown pass. */
  firstName: string | null;
  isMinor: boolean;
  expiresOn: string | null;
  planName: string | null;
}

const KNOWN = ["valid", "awaiting_payment", "expired", "cancelled", "refunded", "upcoming"] as const;

export function toPassCheck(row: VerifyRow | null | undefined): PassCheck {
  const raw = row?.pass_state ?? "unknown";
  let state: ScanState;
  if (raw === "valid" && row?.valid !== true) {
    // The two answers disagree: never show a pass as valid on a doubt.
    console.error("[front desk] verify_gym_pass said pass_state 'valid' with valid = false; shown as unavailable.");
    state = "unavailable";
  } else if ((KNOWN as readonly string[]).includes(raw)) state = raw as ScanState;
  else if (raw === "unknown" && !row?.membership_id) state = "unknown";
  else {
    console.error(`[front desk] verify_gym_pass returned pass_state '${raw}' for a membership; shown as unavailable.`);
    state = "unavailable";
  }
  // Valid only when the reader says so AND the state is valid: never inferred.
  return {
    valid: row?.valid === true && state === "valid",
    state,
    membershipId: row?.membership_id ?? null,
    gymId: row?.gym_id ?? null,
    firstName: row?.member_first_name?.trim() || null,
    isMinor: row?.member_is_minor === true,
    expiresOn: row?.expires_on ?? null,
    planName: row?.plan_name?.trim() || null,
  };
}

/** A pass token as the member's QR carries it: 32 lowercase hex characters. */
export function normalizePassToken(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(t) ? t : null;
}

export type ResultTone = "good" | "warn" | "high" | "primary" | "soft";
export type ResultIcon = "check" | "banknote" | "x" | "scan" | "user-check" | "retry";

export interface ScanResultView {
  kind: ScanState | "already" | "error";
  tone: ResultTone;
  icon: ResultIcon;
  title: string;
  body: string;
  /** The filled action. */
  primary: "scan-next" | "mark-paid" | "scan-again";
  primaryLabel: string;
  /** The text action under it. */
  secondary: "done" | "not-now" | "check-in" | "check-in-again" | "sell-day-pass";
  secondaryLabel: string;
  /** R3: the Under 18 chip and its line. */
  minor: boolean;
}

/**
 * The scan result pop-up for a verify_gym_pass row (OURS-OP1-front-desk-scan
 * R1-R8). `checkInsLive` is B10: until it ships nothing is recorded, so a
 * valid pass says "{name}'s pass is valid" (R2), never "checked in".
 */
export function scanResultView(check: PassCheck, opts: { checkInsLive: boolean; sellsDayPass: boolean }): ScanResultView {
  const name = check.firstName ?? "This member";
  const minor = check.isMinor && check.state !== "unknown";
  const until = check.expiresOn ? dayMonthYear(check.expiresOn) : null;
  const base = { minor, primary: "scan-next" as const, primaryLabel: "Scan next" };
  switch (check.state) {
    case "valid": {
      const validLine = until ? `valid until ${until}` : "no end date";
      const body = check.planName ? `${check.planName} · ${validLine}` : until ? `Valid until ${until}` : "Valid, with no end date";
      return {
        ...base,
        kind: "valid",
        tone: "good",
        icon: "check",
        title: opts.checkInsLive ? `${name} is checked in` : `${possessive(name)} pass is valid`,
        body,
        secondary: "done",
        secondaryLabel: "Done",
      };
    }
    case "awaiting_payment":
      return {
        ...base,
        kind: "awaiting_payment",
        tone: "warn",
        icon: "banknote",
        title: "Payment due",
        body: `${possessive(name)} membership isn't paid yet. Take the payment, then mark it as paid.`,
        primary: "mark-paid",
        primaryLabel: "Mark as paid",
        secondary: "not-now",
        secondaryLabel: "Not now",
      };
    case "expired":
      return {
        ...base,
        kind: "expired",
        tone: "high",
        icon: "x",
        title: "Pass expired",
        body: until ? `${possessive(name)} pass ended on ${until}. They can renew in the app.` : `${possessive(name)} pass has ended. They can renew in the app.`,
        secondary: opts.sellsDayPass ? "sell-day-pass" : "done",
        secondaryLabel: opts.sellsDayPass ? "Sell a day pass" : "Done",
      };
    case "cancelled":
      return {
        ...base,
        kind: "cancelled",
        tone: "high",
        icon: "x",
        title: "Membership cancelled",
        body: `${possessive(name)} membership was cancelled. They can buy a new one in the app.`,
        secondary: "done",
        secondaryLabel: "Done",
      };
    case "upcoming":
      return {
        ...base,
        kind: "upcoming",
        tone: "primary",
        icon: "scan",
        title: "Pass not active yet",
        body: `This pass is for ${possessive(name)} next period, which hasn't started yet.`,
        secondary: "check-in",
        secondaryLabel: "Check someone in",
      };
    case "refunded":
      return {
        ...base,
        kind: "refunded",
        tone: "high",
        icon: "x",
        title: "Pass refunded",
        body: `${possessive(name)} membership was refunded, so this pass no longer works.`,
        secondary: "done",
        secondaryLabel: "Done",
      };
    case "unavailable":
      return {
        ...base,
        minor: false,
        kind: "unavailable",
        tone: "soft",
        icon: "scan",
        title: "Status unavailable",
        body: "This pass's status couldn't be read. Check them in by name instead.",
        secondary: "check-in",
        secondaryLabel: "Check someone in",
      };
    case "unknown":
      return {
        ...base,
        minor: false,
        kind: "unknown",
        tone: "high",
        icon: "scan",
        title: "Pass not recognised",
        body: "This isn't a pass for your gym. Check them in by name instead.",
        secondary: "check-in",
        secondaryLabel: "Check someone in",
      };
  }
}

/** R9 (B10): an entry in the last ALREADY_IN_HOURS (V6-29). */
export function alreadyInView(firstName: string | null, at: Date | string): ScanResultView {
  const name = firstName ?? "This member";
  return {
    kind: "already",
    tone: "primary",
    icon: "user-check",
    title: "Already checked in",
    body: `${name} came in at ${clock12(at)}.`,
    primary: "scan-next",
    primaryLabel: "Scan next",
    secondary: "check-in-again",
    secondaryLabel: "Check in again",
    minor: false,
  };
}

/** C4: the verify call itself failed. */
export const VERIFY_FAILED_VIEW: ScanResultView = {
  kind: "error",
  tone: "soft",
  icon: "retry",
  title: "Couldn't check this pass",
  body: "Something went wrong. Try scanning again.",
  primary: "scan-again",
  primaryLabel: "Scan again",
  secondary: "done",
  secondaryLabel: "Done",
  minor: false,
};

/** "Mina's": a plain 's, as the handover writes "{First name}'s". */
export function possessive(name: string): string {
  return `${name}'s`;
}

// ---------------------------------------------------------------------------
// Check-ins (B10 · BU2-07). V6-29: "In now" = check-ins in the last 90 minutes;
// "Already checked in" window 4 hours. Not on the stack: the helpers below are
// what the Entries tab will use once check_ins lands.

export const IN_NOW_MINUTES = 90;
export const ALREADY_IN_HOURS = 4;

export type EntryMethod = "qr" | "desk";
export type DeniedReason = "expired" | "awaiting_payment" | "cancelled" | "refunded" | "unknown";

export interface Entry {
  id: string;
  at: string;
  method: EntryMethod;
  result: "in" | "denied";
  reason: DeniedReason | null;
  /** Member name as the backend may show it (V6-27: "Member #code" until shared). */
  memberLabel: string;
}

export const DENIED_LABEL: Record<DeniedReason, string> = {
  expired: "Expired",
  awaiting_payment: "Payment due",
  cancelled: "Cancelled",
  refunded: "Refunded",
  unknown: "Not recognised",
};

/** OP1-013 row 19: "QR pass · 6:42 PM", "Checked in at desk · 6:42 PM", "Expired · 6:42 PM". */
export function entrySub(e: Entry): string {
  const t = clock12(e.at);
  if (e.result === "denied") return `${DENIED_LABEL[e.reason ?? "unknown"]} · ${t}`;
  return e.method === "qr" ? `QR pass · ${t}` : `Checked in at desk · ${t}`;
}

export interface EntryFigures {
  today: number;
  inNow: number;
  denied: number;
}

/** OP1-013 rows 7-8: entries since local midnight, admitted in the last 90 minutes, denied today. */
export function entryFigures(entries: Entry[], now: Date): EntryFigures {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const since = now.getTime() - IN_NOW_MINUTES * 60_000;
  let today = 0;
  let inNow = 0;
  let denied = 0;
  for (const e of entries) {
    const t = new Date(e.at).getTime();
    if (t < midnight || t > now.getTime()) continue;
    if (e.result === "denied") {
      denied++;
      continue;
    }
    today++;
    if (t >= since) inNow++;
  }
  return { today, inNow, denied };
}

/** OP1-013 row 11 (D1): bar height = value / max × 81; a zero hour draws nothing. */
export const BAR_AREA = 81;
export function barHeights(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? (v / max) * BAR_AREA : 0));
}

/** OP1-013 row 12: "6a", "12p". */
export function hourShort(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  const n = hh % 12 === 0 ? 12 : hh % 12;
  return `${n}${hh < 12 ? "a" : "p"}`;
}

// ---------------------------------------------------------------------------
// Renewals (OP1-017 rows 7-11) — B7 MB-05: venue_renewals_due(gym, days), the
// server's list of active memberships ending today to `days` ahead.
// already_renewed hides Renew; cancel_at_period_end means "Ending, don't chase".

export type FrontDeskMember = VenueMember & { gymId: string };

export type RenewalDueRow = {
  membership_id: string;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  expires_on: string;
  days_left: number | string | null;
  cancel_at_period_end: boolean | null;
  payment_status: "pending" | "paid" | "refunded" | null;
  already_renewed: boolean | null;
  total_count: number | string | null;
};

export interface RenewalDue {
  membershipId: string;
  gymId: string;
  firstName: string;
  isMinor: boolean;
  planName: string;
  expiresOn: string;
  /** 0 = ends today. */
  daysLeft: number;
  cancelAtPeriodEnd: boolean;
  paymentStatus: "pending" | "paid" | "refunded" | null;
  alreadyRenewed: boolean;
}

export function toRenewalDue(r: RenewalDueRow, gymId: string): RenewalDue {
  const n = Number(r.days_left);
  return {
    membershipId: r.membership_id,
    gymId,
    firstName: r.member_first_name?.trim() || "Member",
    isMinor: r.member_is_minor === true,
    planName: r.plan_name?.trim() || "Membership",
    expiresOn: r.expires_on,
    daysLeft: Number.isFinite(n) ? n : 0,
    cancelAtPeriodEnd: r.cancel_at_period_end === true,
    paymentStatus: r.payment_status,
    alreadyRenewed: r.already_renewed === true,
  };
}

/** Who still needs doing first: not renewed and not ending, soonest first; then ending; then renewed. */
export function sortRenewals(rows: RenewalDue[]): RenewalDue[] {
  const rank = (r: RenewalDue) => (r.alreadyRenewed ? 2 : r.cancelAtPeriodEnd ? 1 : 0);
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.daysLeft - b.daysLeft || a.firstName.localeCompare(b.firstName));
}

/** The ones a desk should chase: not renewed and not ending at the period end. */
export const toChase = (rows: RenewalDue[]): RenewalDue[] => rows.filter((r) => !r.alreadyRenewed && !r.cancelAtPeriodEnd);

/** OP1-017 row 9 sub: "{plan} · renews in {n} days", or what has already been decided. */
export function renewalSub(r: RenewalDue): string {
  const plan = r.planName;
  if (r.alreadyRenewed) return `${plan} · renewed, next period from ${dayMonthYear(r.expiresOn)}`;
  if (r.cancelAtPeriodEnd) return `${plan} · ends ${dayMonthYear(r.expiresOn)}`;
  if (r.daysLeft <= 0) return `${plan} · renews today`;
  if (r.daysLeft === 1) return `${plan} · renews tomorrow`;
  return `${plan} · renews in ${r.daysLeft} days`;
}

export type RenewalStatsRow = {
  period_from: string;
  period_to: string;
  due: number | string | null;
  renewed: number | string | null;
  lapsed: number | string | null;
  cancelled: number | string | null;
  renewal_rate: number | string | null;
};

export interface RenewalStats {
  from: string;
  to: string;
  due: number;
  renewed: number;
  lapsed: number;
  cancelled: number;
  /** Null when nothing was due: a rate over no rows is not a rate. */
  rate: number | null;
}

export function toRenewalStats(r: RenewalStatsRow): RenewalStats {
  const n = (v: number | string | null) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const rate = r.renewal_rate === null || r.renewal_rate === "" || !Number.isFinite(Number(r.renewal_rate)) ? null : Number(r.renewal_rate);
  return { from: r.period_from, to: r.period_to, due: n(r.due), renewed: n(r.renewed), lapsed: n(r.lapsed), cancelled: n(r.cancelled), rate };
}

/** "84%", or "–" when nothing was due (never 0% or 100% over an empty period). */
export function renewalRateLabel(s: Pick<RenewalStats, "rate"> | null): { value: string; note: string | null } {
  if (!s || s.rate === null) return { value: "–", note: "No renewals were due" };
  return { value: `${Math.round(s.rate * 100)}%`, note: null };
}

/** Copy for renew_gym_membership / end_gym_membership refusals (ATX codes, MB-05). */
export function membershipActionMessage(code: string | undefined, action: "renew" | "end"): string {
  switch (code) {
    case "ATX10":
      return action === "renew" ? "This membership has already been renewed." : "This membership has already ended.";
    case "ATX25":
      return action === "renew"
        ? "This plan has been archived. Move the member to a current plan first."
        : "This membership has no end date, so it can't end at the period end. End it now instead.";
    case "ATXC5":
      // 20261121020000: renewing a membership set to end is refused.
      return action === "renew" ? "This membership is set to end, so it can't be renewed." : "Couldn't end the membership. Try again.";
    case "ATX09":
      return "You don't have permission to manage members.";
    case "ATX08":
      return "That membership couldn't be found.";
    default:
      return action === "renew" ? "Couldn't renew the membership. Try again." : "Couldn't end the membership. Try again.";
  }
}
