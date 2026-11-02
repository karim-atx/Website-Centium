// The gym Front desk's pure rules (v6 Batch 4 · OP1-013…OP1-036 and
// OURS-OP1-front-desk-scan). No Supabase here, so node --test can load it.
//
// On the local stack (checked 15 Oct 2026): verify_gym_pass(token) (looks
// only), mark_gym_membership_paid(id), my_venues(), venue_members(...), the
// B7 renewals, and B10 (front desk): check_in_with_pass / check_in_member /
// check_in_guest (decide and record), sell_day_pass, mark_desk_sale_paid,
// desk_entries, desk_summary, venue_busy_times. A database without B10 keeps
// the verify-only scan and the pending check-in note (the pending rule).
// The Memberships tab is the plan list (pages/business-ops/plans).

import { dayMonthYear, type PassState } from "../venues/venueLogic";
import type { VenueMember } from "../venues/consoleLogic";
import { clock12 } from "../../utils/time12";
import { appLocale } from "../../i18n/format";
import { t, tk, tn, tx } from "../../i18n/core";

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
 * logged, never valid. Round F2 AB5: 'code_expired' is a real device's
 * 30-second code that is neither the current nor the previous one, said only
 * to the membership's own venue (anyone else hears 'unknown'); no member is
 * named.
 */
export type ScanState = Exclude<PassState, "unknown"> | "unknown" | "unavailable" | "code_expired";

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
  else if (raw === "code_expired" && !row?.membership_id) state = "code_expired";
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

/**
 * A pass as the member's QR carries it: the static pass_token (32 lowercase
 * hex characters, still accepted: phase one of its retirement), or Round F2
 * AB5's 30-second code "pd:<device id>:<6 digits>" (20261226070000), passed
 * to check_in_with_pass / verify_gym_pass's p_token as it is, lowercased.
 */
export function normalizePassToken(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (/^[0-9a-f]{32}$/.test(s)) return s;
  return /^pd:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9]{6}$/.test(s) ? s : null;
}

export type ResultTone = "good" | "warn" | "high" | "primary" | "soft";
export type ResultIcon = "check" | "banknote" | "x" | "scan" | "user-check" | "retry";

export interface ScanResultView {
  kind: ScanState | "already" | "error" | "other_venue" | "under_min_age";
  tone: ResultTone;
  icon: ResultIcon;
  title: string;
  body: string;
  /** The filled action. */
  primary: "scan-next" | "mark-paid" | "scan-again";
  primaryLabel: string;
  /** The text action under it. */
  secondary: "done" | "not-now" | "check-in" | "sell-day-pass";
  secondaryLabel: string;
  /** R3: the Under 18 chip and its line. */
  minor: boolean;
}

/**
 * The scan result pop-up for a verify_gym_pass row (OURS-OP1-front-desk-scan
 * R1-R8). `checkInsLive`: a recorded check-in says "{name} is checked in"
 * (R1); the verify-only fallback (a database without B10) records nothing,
 * so a valid pass says "{name}'s pass is valid" (R2), never "checked in".
 */
export function scanResultView(check: PassCheck, opts: { checkInsLive: boolean; sellsDayPass: boolean }): ScanResultView {
  const name = check.firstName ?? t("This member");
  const minor = check.isMinor && check.state !== "unknown" && check.state !== "code_expired";
  const until = check.expiresOn ? dayMonthYear(check.expiresOn) : null;
  const base = { minor, primary: "scan-next" as const, primaryLabel: t("Scan next") };
  switch (check.state) {
    case "valid": {
      const validLine = until ? t("valid until {date}", { date: until }) : t("no end date");
      const body = check.planName ? `${check.planName} · ${validLine}` : until ? t("Valid until {date}", { date: until }) : t("Valid, with no end date");
      return {
        ...base,
        kind: "valid",
        tone: "good",
        icon: "check",
        title: opts.checkInsLive ? t("{name} is checked in", { name }) : t("{name}'s pass is valid", { name }),
        body,
        secondary: "done",
        secondaryLabel: t("Done"),
      };
    }
    case "awaiting_payment":
      return {
        ...base,
        kind: "awaiting_payment",
        tone: "warn",
        icon: "banknote",
        title: t("Payment due"),
        body: t("{name}'s membership isn't paid yet. Take the payment, then mark it as paid.", { name }),
        primary: "mark-paid",
        primaryLabel: t("Mark as paid"),
        secondary: "not-now",
        secondaryLabel: t("Not now"),
      };
    case "expired":
      return {
        ...base,
        kind: "expired",
        tone: "high",
        icon: "x",
        title: t("Pass expired"),
        body: until ? t("{name}'s pass ended on {date}. They can renew in the app.", { name, date: until }) : t("{name}'s pass has ended. They can renew in the app.", { name }),
        secondary: opts.sellsDayPass ? "sell-day-pass" : "done",
        secondaryLabel: opts.sellsDayPass ? t("Sell a day pass") : t("Done"),
      };
    case "cancelled":
      return {
        ...base,
        kind: "cancelled",
        tone: "high",
        icon: "x",
        title: t("Membership cancelled"),
        body: t("{name}'s membership was cancelled. They can buy a new one in the app.", { name }),
        secondary: "done",
        secondaryLabel: t("Done"),
      };
    case "upcoming":
      return {
        ...base,
        kind: "upcoming",
        tone: "primary",
        icon: "scan",
        title: t("Pass not active yet"),
        body: t("This pass is for {name}'s next period, which hasn't started yet.", { name }),
        secondary: "check-in",
        secondaryLabel: t("Check someone in"),
      };
    case "refunded":
      return {
        ...base,
        kind: "refunded",
        tone: "high",
        icon: "x",
        title: t("Pass refunded"),
        body: t("{name}'s membership was refunded, so this pass no longer works.", { name }),
        secondary: "done",
        secondaryLabel: t("Done"),
      };
    case "unavailable":
      return {
        ...base,
        minor: false,
        kind: "unavailable",
        tone: "soft",
        icon: "scan",
        title: t("Status unavailable"),
        body: t("This pass's status couldn't be read. Check them in by name instead."),
        secondary: "check-in",
        secondaryLabel: t("Check someone in"),
      };
    case "unknown":
      return {
        ...base,
        minor: false,
        kind: "unknown",
        tone: "high",
        icon: "scan",
        title: t("Pass not recognised"),
        body: t("This isn't a pass for your gym. Check them in by name instead."),
        secondary: "check-in",
        secondaryLabel: t("Check someone in"),
      };
    case "code_expired":
      // Round F2 AB5: a screenshot, or a phone whose clock is off.
      return {
        ...base,
        minor: false,
        kind: "code_expired",
        tone: "high",
        icon: "scan",
        title: t("Code expired"),
        body: t("This code has expired. Ask the member to open their pass."),
        secondary: "check-in",
        secondaryLabel: t("Check someone in"),
      };
  }
}

/**
 * R9 (B10): the same person entered this venue in the last 4 hours. The
 * server writes no second row (HANDOVER_API B10), so the drawn text action
 * "Check in again" would record nothing: it is "Done" here (flagged). The
 * time is the earlier entry's, when today's list has it.
 */
export function alreadyInView(firstName: string | null, at: Date | string | null): ScanResultView {
  const name = firstName ?? t("This member");
  return {
    kind: "already",
    tone: "primary",
    icon: "user-check",
    title: t("Already checked in"),
    body: at ? t("{name} came in at {time}.", { name, time: clock12(at) }) : t("{name} came in within the last {n} hours.", { name, n: ALREADY_IN_HOURS }),
    primary: "scan-next",
    primaryLabel: t("Scan next"),
    secondary: "done",
    secondaryLabel: t("Done"),
    minor: false,
  };
}

/**
 * The scan result for a recorded check-in (check_in_with_pass /
 * check_in_member). Admitted: R1 "{name} is checked in". Denied: the reason
 * picks the drawn pop-up (R4-R8); `other_venue` and `under_min_age` have no
 * frame and are written in the same language (OURS, flagged).
 */
export function checkInView(c: CheckIn, opts: { sellsDayPass: boolean; alreadyAt?: string | null }): ScanResultView {
  if (c.alreadyIn) return { ...alreadyInView(c.firstName, opts.alreadyAt ?? null), minor: c.isMinor };
  const asCheck = (state: ScanState, valid = false): PassCheck => ({
    valid,
    state,
    membershipId: c.membershipId,
    gymId: null,
    firstName: c.firstName,
    isMinor: c.isMinor,
    expiresOn: c.expiresOn,
    planName: c.planName,
  });
  const live = { checkInsLive: true, sellsDayPass: opts.sellsDayPass };
  if (c.result === "in") return scanResultView(asCheck("valid", true), live);
  const name = c.firstName ?? t("This member");
  switch (c.denyReason) {
    case "unpaid":
      return scanResultView(asCheck(c.passState === "refunded" ? "refunded" : "awaiting_payment"), live);
    case "expired":
      return scanResultView(asCheck("expired"), live);
    case "not_started":
      return scanResultView(asCheck("upcoming"), live);
    case "other_venue":
      return {
        kind: "other_venue",
        tone: "high",
        icon: "x",
        title: t("Pass for another venue"),
        body: t("{name}'s pass is for another of your venues.", { name }),
        primary: "scan-next",
        primaryLabel: t("Scan next"),
        secondary: opts.sellsDayPass ? "sell-day-pass" : "done",
        secondaryLabel: opts.sellsDayPass ? t("Sell a day pass") : t("Done"),
        minor: c.isMinor,
      };
    case "under_min_age":
      return {
        kind: "under_min_age",
        tone: "high",
        icon: "x",
        title: t("Under the minimum age"),
        body: t("{name} is under this venue's minimum entry age.", { name }),
        primary: "scan-next",
        primaryLabel: t("Scan next"),
        secondary: "done",
        secondaryLabel: t("Done"),
        minor: false,
      };
    default: {
      // Round F2 AB5: a stale 30-second code at its own venue (denied no_pass, nobody named).
      if (!c.membershipId && c.passState === "code_expired") return scanResultView({ ...asCheck("code_expired"), membershipId: null }, live);
      // no_pass: a cancelled or refunded membership keeps its own pop-up; an
      // unknown, foreign or made-up token reads "not recognised" (R8).
      const st = c.membershipId && (c.passState === "cancelled" || c.passState === "refunded") ? c.passState : "unknown";
      return scanResultView({ ...asCheck(st), membershipId: st === "unknown" ? null : c.membershipId }, live);
    }
  }
}

/** C4: the verify call itself failed. */
export const VERIFY_FAILED_VIEW: ScanResultView = {
  kind: "error",
  tone: "soft",
  icon: "retry",
  title: t("Couldn't check this pass"),
  body: t("Something went wrong. Try scanning again."),
  primary: "scan-again",
  primaryLabel: t("Scan again"),
  secondary: "done",
  secondaryLabel: t("Done"),
  minor: false,
};

/** "Mina's": a plain 's, as the handover writes "{First name}'s". */
export function possessive(name: string): string {
  return `${name}'s`;
}

// ---------------------------------------------------------------------------
// Check-ins (B10, migration 20261121250000). check_in_with_pass /
// check_in_member decide AND record (denials included); desk_entries is the
// day's list with first names (the check-in screen, Q-05); desk_summary the
// boxes; venue_busy_times the 7 × 24 averages. V6-29: "In now" = people with
// an entry in the last 90 minutes, counted by the server; "Already checked
// in" = the same person at this venue in the last 4 hours.

export const ALREADY_IN_HOURS = 4;

export type CheckInMethod = "qr" | "manual" | "nfc" | "bluetooth";
export type DenyReason = "no_pass" | "other_venue" | "expired" | "unpaid" | "not_started" | "under_min_age" | "guest_limit";

export type CheckInRow = {
  check_in_id: string | null;
  result: "in" | "denied";
  deny_reason: DenyReason | null;
  already_in: boolean | null;
  membership_id: string | null;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  expires_on: string | null;
  pass_state: string | null;
};

export interface CheckIn {
  checkInId: string | null;
  result: "in" | "denied";
  denyReason: DenyReason | null;
  /** An entry in the last 4 hours: nothing new was written. */
  alreadyIn: boolean;
  membershipId: string | null;
  /** A first name: the person is at the desk (Q-05). */
  firstName: string | null;
  isMinor: boolean;
  planName: string | null;
  expiresOn: string | null;
  passState: string | null;
}

/** A row as the server sent it; never "in" unless it says exactly "in". */
export function toCheckIn(row: CheckInRow | null | undefined): CheckIn | null {
  if (!row) return null;
  const result = row.result === "in" ? "in" : "denied";
  return {
    checkInId: row.check_in_id ?? null,
    result,
    denyReason: result === "denied" ? row.deny_reason ?? "no_pass" : null,
    alreadyIn: row.already_in === true,
    membershipId: row.membership_id ?? null,
    firstName: row.member_first_name?.trim() || null,
    isMinor: row.member_is_minor === true,
    planName: row.plan_name?.trim() || null,
    expiresOn: row.expires_on ?? null,
    passState: row.pass_state ?? null,
  };
}

/** The reason as the Entries row sub says it ("{reason} · {time}", OP1-013 row 19). */
export const DENIED_LABEL: Record<DenyReason, string> = {
  no_pass: tk("Not recognised"),
  other_venue: tk("Another venue's pass"),
  expired: tk("Expired"),
  unpaid: tk("Payment due"),
  not_started: tk("Not started yet"),
  under_min_age: tk("Under the minimum age"),
  guest_limit: tk("Guest limit reached"),
};

/** The check-in sheet's line for a refusal it recorded (OP1-015 O4 slot). */
export function deniedLine(reason: DenyReason): string {
  switch (reason) {
    case "expired":
      return t("Not checked in: the pass has expired.");
    case "unpaid":
      return t("Not checked in: the membership isn't paid yet. Take the payment, then mark it as paid.");
    case "not_started":
      return t("Not checked in: this pass hasn't started yet.");
    case "other_venue":
      return t("Not checked in: this pass is for another of your venues.");
    case "under_min_age":
      return t("Not checked in: they're under this venue's minimum entry age.");
    case "guest_limit":
      return t("Not checked in: no guest passes left this month.");
    default:
      return t("Not checked in: there's no valid pass.");
  }
}

export type EntryRow = {
  check_in_id: string;
  at: string;
  result: "in" | "denied";
  deny_reason: DenyReason | null;
  method: CheckInMethod;
  person_id: string | null;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  guest_label: string | null;
  host_first_name: string | null;
  plan_name: string | null;
  is_day_pass: boolean | null;
  total_count: number | string | null;
};

export interface Entry {
  id: string;
  at: string;
  method: CheckInMethod;
  result: "in" | "denied";
  reason: DenyReason | null;
  /** The member (null for a guest or an unknown pass): screens other than the desk mask by it. */
  personId: string | null;
  /** The first name (desk_entries, Q-05), the guest's label, or "Unknown pass". */
  title: string;
  /** A guest let in on a member's allowance: the host's first name. */
  hostName: string | null;
  isGuest: boolean;
  isDayPass: boolean;
  planName: string | null;
}

export function toEntry(r: EntryRow): Entry {
  const guest = !r.person_id && !!r.guest_label?.trim();
  const title = r.member_first_name?.trim() || r.guest_label?.trim() || (r.person_id ? t("Member") : t("Unknown pass"));
  return {
    id: r.check_in_id,
    at: r.at,
    method: r.method,
    result: r.result === "in" ? "in" : "denied",
    reason: r.result === "in" ? null : r.deny_reason ?? "no_pass",
    personId: r.person_id ?? null,
    title,
    hostName: guest ? r.host_first_name?.trim() || null : null,
    isGuest: guest && r.is_day_pass !== true,
    isDayPass: r.is_day_pass === true,
    planName: r.plan_name?.trim() || null,
  };
}

/** A desk entry (staff hand: user-check) or a reader (QR, NFC, Bluetooth: scan-line). */
export const isDeskMethod = (m: CheckInMethod): boolean => m === "manual";

/**
 * OP1-013 row 19: "QR pass · 6:42 PM", "Checked in at desk · 6:42 PM",
 * "{reason} · 6:42 PM"; OURS for the B10 kinds: "Day pass · 6:42 PM",
 * "Guest of {host} · 6:42 PM".
 */
export function entrySub(e: Entry): string {
  const at = clock12(e.at);
  if (e.result === "denied") return `${t(DENIED_LABEL[e.reason ?? "no_pass"])} · ${at}`;
  if (e.isDayPass) return `${t("Day pass")} · ${at}`;
  if (e.isGuest) return e.hostName ? `${t("Guest of {host}", { host: e.hostName })} · ${at}` : `${t("Guest")} · ${at}`;
  return isDeskMethod(e.method) ? `${t("Checked in at desk")} · ${at}` : `${t("QR pass")} · ${at}`;
}

export type SummaryRow = {
  entries_today: number | string | null;
  denied_today: number | string | null;
  in_now: number | string | null;
  last_hour: number | string | null;
  typical_hour: number | string | null;
  right_now: string | null;
  day_passes_this_week: number | string | null;
  guest_passes_this_month: number | string | null;
};

export type RightNow = "quiet" | "steady" | "busy";

export interface DeskSummary {
  entriesToday: number;
  deniedToday: number;
  inNow: number;
  lastHour: number;
  /** The 4-week median of this hour; null with no history. */
  typicalHour: number | null;
  /** Null with no history: "Not enough data yet", never "Quiet". */
  rightNow: RightNow | null;
  dayPassesThisWeek: number;
  guestPassesThisMonth: number;
}

const num = (v: number | string | null | undefined): number => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v));

export function toDeskSummary(r: SummaryRow | null | undefined): DeskSummary {
  const rn = r?.right_now;
  const typ = r?.typical_hour;
  return {
    entriesToday: num(r?.entries_today),
    deniedToday: num(r?.denied_today),
    inNow: num(r?.in_now),
    lastHour: num(r?.last_hour),
    typicalHour: typ === null || typ === undefined || typ === "" || !Number.isFinite(Number(typ)) ? null : Number(typ),
    rightNow: rn === "quiet" || rn === "steady" || rn === "busy" ? rn : null,
    dayPassesThisWeek: num(r?.day_passes_this_week),
    guestPassesThisMonth: num(r?.guest_passes_this_month),
  };
}

/** DA1-007 row 3: Quiet / Steady / Busy; null → "Not enough data yet" (HANDOVER_API B10). */
export function rightNowLabel(r: RightNow | null): string {
  return r === "quiet" ? t("Quiet") : r === "steady" ? tx("Steady", "busyness") : r === "busy" ? t("Busy") : t("Not enough data yet");
}

export type BusyRow = { weekday: number | string; hour: number | string; average_entries: number | string | null };

/** venue_busy_times: weekday 1 (Monday) … 7 × hour 0-23 → grid[weekday - 1][hour]; a missing cell is 0. */
export function toBusyGrid(rows: BusyRow[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of rows) {
    const d = Number(r.weekday);
    const h = Number(r.hour);
    if (d >= 1 && d <= 7 && h >= 0 && h <= 23) grid[d - 1][h] = num(r.average_entries);
  }
  return grid;
}

/** The busiest hour of a weekday's 24 averages, or null when every hour is 0. */
export function peakHour(row: number[]): number | null {
  let best = 0;
  let at: number | null = null;
  row.forEach((v, h) => {
    if (v > best) {
      best = v;
      at = h;
    }
  });
  return at;
}

/** Monday = 1 … Sunday = 7, as venue_busy_times numbers them. */
export const isoWeekday = (d: Date): number => ((d.getDay() + 6) % 7) + 1;

/**
 * OP1-013 D3: one bar per opening hour. `day` is today's gym_hours row; with
 * no published hours (or closed today) the bars run from the earliest entry
 * to now. Open 24 hours draws 24 bars. An entry outside the published hours
 * still gets its bar.
 */
export function hourBins(
  day: { closed: boolean; open_24h: boolean; opens_at: string | null; closes_at: string | null } | null,
  entryHours: number[],
  nowHour: number
): number[] {
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  if (day && !day.closed) {
    if (day.open_24h) return range(0, 23);
    const h = (t: string | null) => (t ? Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60 : NaN);
    const o = h(day.opens_at);
    let c = h(day.closes_at);
    if (Number.isFinite(o) && Number.isFinite(c)) {
      if (c <= o) c = 24; // closes at midnight (or after it)
      const lo = Math.min(Math.floor(o), ...entryHours);
      const hi = Math.max(Math.ceil(c) - 1, ...entryHours);
      return range(lo, Math.min(hi, 23));
    }
  }
  if (entryHours.length === 0) return [];
  return range(Math.min(...entryHours), Math.max(nowHour, ...entryHours));
}

/** Today's admitted entries per bin hour (the device's clock). */
export function hourCounts(entries: Entry[], bins: number[]): { hour: number; count: number }[] {
  const by = new Map<number, number>();
  for (const e of entries) {
    if (e.result !== "in") continue;
    const h = new Date(e.at).getHours();
    by.set(h, (by.get(h) ?? 0) + 1);
  }
  return bins.map((hour) => ({ hour, count: by.get(hour) ?? 0 }));
}

// ---------------------------------------------------------------------------
// Day passes (OP-02): sell_day_pass sells an active day-pass plan
// (plan_type 'day_pass', billing 'daily' or valid_for_days 1) to a known
// member or to a named guest (40 characters); the sale is the entry.

export type PlanRow = { id: string; name: string; price: number | string; billing: string | null; plan_type: string | null; status: string | null; valid_for_days: number | null };

export interface DayPassPlan {
  id: string;
  name: string;
  price: number;
}

/** The server's own test (sell_day_pass): a day pass, and on sale. */
export function dayPassPlans(rows: PlanRow[]): DayPassPlan[] {
  return rows
    .filter((p) => (p.status ?? "active") === "active" && (p.plan_type === "day_pass" || p.billing === "daily" || p.valid_for_days === 1))
    .map((p) => ({ id: p.id, name: p.name.trim() || t("Day pass"), price: num(p.price) }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

export const GUEST_LABEL_MAX = 40;

/** "$15", "$42.50", "$1,240" (OP1-017 row 13 draws whole dollars: "$465"). */
export function deskMoney(n: number): string {
  return "$" + (Number.isInteger(n) ? n.toLocaleString(appLocale("en-US")) : n.toLocaleString(appLocale("en-US"), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

export type DeskSaleRow = {
  id: string;
  gym_id: string | null;
  plan_name: string;
  person_id: string | null;
  guest_label: string | null;
  amount: number | string;
  payment_status: string;
  sold_at: string;
  sold_on: string;
};

export interface DeskSale {
  id: string;
  planName: string;
  personId: string | null;
  /** The guest's label; a member's sale reads "Member" until the screen maps it to their masked label. */
  who: string;
  amount: number;
  paid: boolean;
  soldAt: string;
  soldOn: string;
}

export function toDeskSale(r: DeskSaleRow): DeskSale {
  return {
    id: r.id,
    planName: r.plan_name?.trim() || t("Day pass"),
    personId: r.person_id ?? null,
    who: r.guest_label?.trim() || t("Member"),
    amount: num(r.amount),
    paid: r.payment_status === "paid",
    soldAt: r.sold_at,
    soldOn: r.sold_on,
  };
}

/** OP1-017 row 13: Sold (every sale this week) and Revenue (the paid ones' total). */
export function weekSales(sales: DeskSale[]): { sold: number; revenue: number } {
  return { sold: sales.length, revenue: sales.filter((s) => s.paid).reduce((a, s) => a + s.amount, 0) };
}

/** The Monday of `d`'s week (DECIDED: weeks start Monday), YYYY-MM-DD. */
export function mondayOf(d: Date): string {
  return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (isoWeekday(d) - 1)));
}

// ---------------------------------------------------------------------------
// Desk refusals (B10 codes) as the desk reads them.

export function deskMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "ATXE6":
      return t("Check-in at the desk is turned off for this venue.");
    case "ATXE7":
      return t("They're under this venue's minimum entry age.");
    case "ATXC4":
      return t("This day pass is paused, so it can't be sold.");
    case "ATX82":
      return t("That day pass isn't offered at this venue.");
    case "ATX03":
      return t("You don't have access to the front desk here.");
    case "ATX10":
      return t("This sale is already paid.");
    case "ATX08":
      return t("That couldn't be found. Reload and try again.");
    default:
      return fallback;
  }
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
  return `${n}${hh < 12 ? tx("a", "hour short") : tx("p", "hour short")}`;
}

// ---------------------------------------------------------------------------
// Renewals (OP1-017 rows 7-11) — B7 MB-05: venue_renewals_due(gym, days), the
// server's list of active memberships ending today to `days` ahead.
// already_renewed hides Renew; cancel_at_period_end means "Ending, don't chase".

export type FrontDeskMember = VenueMember & { gymId: string };

// ---------------------------------------------------------------------------
// Check-in search (Q-05, Database 0587c8a): desk_find_member(gym, search,
// limit). The act of checking somebody in is the one place a first name is
// shown (the user's rule); the members LIST is masked. It matches a first
// name or the member number ("42", "0042", "#42"), valid passes first, and
// carries no price, method or paid date.
// ---------------------------------------------------------------------------

export type DeskMemberRow = {
  membership_id: string;
  person_id: string | null;
  member_number: number | null;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  status: string;
  payment_status: "pending" | "paid" | "refunded" | null;
  expires_on: string | null;
  pass_state: string | null;
};

export interface DeskMember {
  membershipId: string;
  personId: string | null;
  memberNumber: number | null;
  /** A first name: the desk may see it (desk_find_member). */
  firstName: string;
  isMinor: boolean;
  planName: string;
  status: string;
  paymentStatus: "pending" | "paid" | "refunded" | null;
  expiresOn: string | null;
  passState: string | null;
}

export function toDeskMember(r: DeskMemberRow): DeskMember {
  return {
    membershipId: r.membership_id,
    personId: r.person_id ?? null,
    memberNumber: r.member_number ?? null,
    firstName: r.member_first_name?.trim() || t("Member"),
    isMinor: r.member_is_minor === true,
    planName: r.plan_name?.trim() || t("Membership"),
    status: r.status,
    paymentStatus: r.payment_status ?? null,
    expiresOn: r.expires_on ?? null,
    passState: r.pass_state ?? null,
  };
}

export type RenewalDueRow = {
  membership_id: string;
  /** B7 (Database 65e0311): who, for Remind (start_member_thread). */
  person_id?: string | null;
  member_number?: number | null;
  /** Q-05: masked ("Member #0042") unless the member shared their name. */
  member_label: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  expires_on: string;
  days_left: number | string | null;
  cancel_at_period_end: boolean | null;
  payment_status: "pending" | "paid" | "refunded" | null;
  already_renewed: boolean | null;
  /** CN (20261203000000): granted by a member code. Absent on an older stack. */
  granted?: boolean | null;
  /**
   * Batch 2 (251ab70): what renewing would charge, the plan's price now (not
   * price_agreed, which is 0.00 on a grant). NULL without a plan price; absent
   * on an older stack.
   */
  renewal_price?: number | string | null;
  total_count: number | string | null;
};

export interface RenewalDue {
  membershipId: string;
  gymId: string;
  /** Null on a database without B7's columns: Remind stays unavailable. */
  personId: string | null;
  memberNumber: number | null;
  /** Q-05: the server's label, masked unless shared. */
  label: string;
  isMinor: boolean;
  planName: string;
  expiresOn: string;
  /** 0 = ends today. */
  daysLeft: number;
  cancelAtPeriodEnd: boolean;
  paymentStatus: "pending" | "paid" | "refunded" | null;
  alreadyRenewed: boolean;
  /**
   * CN: granted by a member code. Kept in the list (Karim) and labelled:
   * renewing it charges the plan price, it is not another free period.
   */
  granted?: boolean;
  /**
   * venue_renewals_due.renewal_price: what renewing charges (the plan's price,
   * for a grant too). Null when the plan has no price; undefined on a stack
   * without the column, where the screens fall back as before.
   */
  renewalPrice?: number | null;
}

/**
 * CN: the label on a granted membership that is due to renew. With
 * renewal_price it names the amount; without one it says "the plan price",
 * never $0.
 */
export function grantedRenewal(price: number | null | undefined, fmt: (n: number) => string = deskMoney): string {
  return price != null ? t("granted with a code, renewing charges {price}", { price: fmt(price) }) : t("granted with a code, renewing charges the plan price");
}

/** renewal_price: undefined when the column is absent, null when it is NULL. */
function renewalPriceOf(v: number | string | null | undefined): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toRenewalDue(r: RenewalDueRow, gymId: string): RenewalDue {
  const n = Number(r.days_left);
  return {
    membershipId: r.membership_id,
    gymId,
    personId: r.person_id ?? null,
    memberNumber: r.member_number ?? null,
    label: r.member_label?.trim() || t("Member"),
    isMinor: r.member_is_minor === true,
    planName: r.plan_name?.trim() || t("Membership"),
    expiresOn: r.expires_on,
    daysLeft: Number.isFinite(n) ? n : 0,
    cancelAtPeriodEnd: r.cancel_at_period_end === true,
    paymentStatus: r.payment_status,
    alreadyRenewed: r.already_renewed === true,
    granted: r.granted === true,
    renewalPrice: renewalPriceOf(r.renewal_price),
  };
}

/** Who still needs doing first: not renewed and not ending, soonest first; then ending; then renewed. */
export function sortRenewals(rows: RenewalDue[]): RenewalDue[] {
  const rank = (r: RenewalDue) => (r.alreadyRenewed ? 2 : r.cancelAtPeriodEnd ? 1 : 0);
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.daysLeft - b.daysLeft || a.label.localeCompare(b.label));
}

/** The ones a desk should chase: not renewed and not ending at the period end. */
export const toChase = (rows: RenewalDue[]): RenewalDue[] => rows.filter((r) => !r.alreadyRenewed && !r.cancelAtPeriodEnd);

/** OP1-017 row 9 sub: "{plan} · renews in {n} days", or what has already been decided. */
export function renewalSub(r: RenewalDue): string {
  const plan = r.planName;
  if (r.alreadyRenewed) return `${plan} · ${t("renewed, next period from {date}", { date: dayMonthYear(r.expiresOn) })}`;
  if (r.cancelAtPeriodEnd) return `${plan} · ${t("ends {date}", { date: dayMonthYear(r.expiresOn) })}`;
  const grant = r.granted ? ` · ${grantedRenewal(r.renewalPrice)}` : "";
  if (r.daysLeft <= 0) return `${plan} · ${t("renews today")}${grant}`;
  if (r.daysLeft === 1) return `${plan} · ${t("renews tomorrow")}${grant}`;
  return `${plan} · ${tn(r.daysLeft, "renews in {n} day", "renews in {n} days")}${grant}`;
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
  if (!s || s.rate === null) return { value: "–", note: t("No renewals were due") };
  return { value: `${Math.round(s.rate * 100)}%`, note: null };
}

/** Copy for renew_gym_membership / end_gym_membership refusals (ATX codes, MB-05). */
export function membershipActionMessage(code: string | undefined, action: "renew" | "end"): string {
  switch (code) {
    case "ATX10":
      return action === "renew" ? t("This membership has already been renewed.") : t("This membership has already ended.");
    case "ATX25":
      return action === "renew"
        ? t("This plan has been archived. Move the member to a current plan first.")
        : t("This membership has no end date, so it can't end at the period end. End it now instead.");
    case "ATXC5":
      // 20261121020000: renewing a membership set to end is refused.
      return action === "renew" ? t("This membership is set to end, so it can't be renewed.") : t("Couldn't end the membership. Try again.");
    case "ATX09":
      return t("You don't have permission to manage members.");
    case "ATX08":
      return t("That membership couldn't be found.");
    default:
      return action === "renew" ? t("Couldn't renew the membership. Try again.") : t("Couldn't end the membership. Try again.");
  }
}
