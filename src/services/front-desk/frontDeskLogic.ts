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

export type ScanState = PassState | "unknown";

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

const STATES: ScanState[] = ["valid", "awaiting_payment", "expired", "cancelled", "refunded", "unknown"];

export function toPassCheck(row: VerifyRow | null | undefined): PassCheck {
  const state = (row?.pass_state && (STATES as string[]).includes(row.pass_state) ? row.pass_state : "unknown") as ScanState;
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
    default:
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
// Renewals (OP1-017 rows 7-11; formula HANDOVER 3.10: memberships ending in
// the next 7 days). Read from venue_members() (A4), active and expired.

export interface Renewal {
  membershipId: string;
  gymId: string;
  firstName: string;
  planName: string;
  expiresOn: string;
  /** Days from today: 0 = today, negative = already ended. */
  days: number;
  kind: "due" | "expired";
}

export type FrontDeskMember = VenueMember & { gymId: string };

/**
 * Due: active memberships ending today to `windowDays` ahead. Expired: ended
 * in the last 7 days (the Expired chip, sample "Expired yesterday"). Soonest
 * first, then the most recently expired.
 */
export function renewals(members: FrontDeskMember[], today: string, windowDays = 7): Renewal[] {
  const out: Renewal[] = [];
  for (const m of members) {
    if (!m.expiresOn || m.status === "cancelled" || m.passState === "refunded") continue;
    const days = daysBetween(today, m.expiresOn);
    // A membership's last day is expires_on itself: it is still due that day.
    if (days >= 0 && days <= windowDays && m.status === "active") {
      out.push({ membershipId: m.membershipId, gymId: m.gymId, firstName: m.firstName, planName: m.planName, expiresOn: m.expiresOn, days, kind: "due" });
    } else if (days < 0 && days >= -7) {
      out.push({ membershipId: m.membershipId, gymId: m.gymId, firstName: m.firstName, planName: m.planName, expiresOn: m.expiresOn, days, kind: "expired" });
    }
  }
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "due" ? -1 : 1;
    return a.kind === "due" ? a.days - b.days : b.days - a.days;
  });
}

/** OP1-017 row 9 sub: "{plan} · renews in {n} days" / "Expired {when}". */
export function renewalSub(r: Renewal): string {
  const plan = r.planName || "Membership";
  if (r.kind === "expired") {
    const ago = -r.days;
    return ago === 1 ? `${plan} · Expired yesterday` : `${plan} · Expired ${ago} days ago`;
  }
  if (r.days === 0) return `${plan} · renews today`;
  if (r.days === 1) return `${plan} · renews tomorrow`;
  return `${plan} · renews in ${r.days} days`;
}
