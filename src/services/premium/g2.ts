// Round G2 · the free limits, the full export, Premium's perks and the
// counted directory reads: the pure half (decisions, parsers, sentences). No
// React and no Supabase, so the tests read it directly.
//
// Contract: Database Round G2 (PR #56, migrations 20261226220000-250000;
// design-handover/round-g/DB_G2_HANDOVER.md).
//
// THE TWO RULES:
//   - while premium_on is off, or loading, or the Database lacks G2, the app
//     behaves exactly as today: every decision here reads a missing answer
//     (null) as "off";
//   - every new call fails open: a missing function (PGRST202 / 42883 / 404)
//     means "no limit / off", and a failed claim lets the action go ahead.

import { t, tk, tn } from "../../i18n/core";
import type { PremiumFeature } from "./features";
import type { FreeLimits, MyPremium } from "./model";

type Row = Record<string, unknown>;
type Err = { code?: string | null; message?: string | null; details?: string | null; status?: number | null } | null | undefined;

// ---- fail open ----

/** A function the Database doesn't have yet (PostgREST PGRST202, Postgres 42883, or a 404). */
export function isMissingFunction(e: Err): boolean {
  if (!e) return false;
  return e.code === "PGRST202" || e.code === "42883" || e.status === 404;
}

/** A column the Database doesn't have yet (Postgres 42703, PostgREST PGRST204). */
export function isMissingColumn(e: Err): boolean {
  return !!e && (e.code === "42703" || e.code === "PGRST204");
}

/**
 * EG phase 1: read through the counting function, and fall back to today's
 * view only when the function is missing (a Database without G2). Any other
 * failure (ATX02, offline, a refusal) is the function's own answer.
 */
export const directoryFallback = (e: Err): boolean => isMissingFunction(e);

// ---- which limits apply ----

/** The limit features G2 checks before a screen opens (the free_limits() keys). */
export type CountedLimit = "own_routines" | "habits" | "recipes" | "locked_journal_folders";

/**
 * The free limits apply to me: the switch on, no Premium, a member account
 * (my_premium().limits is null whenever free_limits_apply is false).
 */
export function limitsApply(p: Pick<MyPremium, "premiumOn" | "premium" | "limits"> | null | undefined): p is Pick<MyPremium, "premiumOn" | "premium"> & { limits: FreeLimits } {
  return !!p && p.premiumOn && !p.premium && !!p.limits;
}

/**
 * Adding one more would pass the free limit. Members already over it keep
 * everything; only a new addition is checked, and only while limits apply.
 */
export function limitReached(p: Pick<MyPremium, "premiumOn" | "premium" | "limits"> | null | undefined, key: CountedLimit, count: number): boolean {
  if (!limitsApply(p)) return false;
  const n = p.limits[key];
  return typeof n === "number" && Number.isFinite(count) && count >= n;
}

/** Routines that count: your own, including adopted Centium templates; a professional's copy never does. */
export const ownRoutineCount = (routines: readonly { assignedByProfessionalId?: string | null }[]): number => routines.filter((r) => !r.assignedByProfessionalId).length;

/** Habits that count: active (the list holds active ones) and not from a professional. */
export const ownHabitCount = (habits: readonly { id: string }[], fromProfessional: (id: string) => boolean): number => habits.filter((h) => !fromProfessional(h.id)).length;

/** Locked journal folders. */
export const lockedFolderCount = (folders: readonly { locked?: boolean }[]): number => folders.filter((f) => f.locked === true).length;

// ---- refusals (ATXQ1 / ATXQ2) ----

const LIMIT_DETAILS: readonly PremiumFeature[] = ["own_routines", "habits", "recipes", "locked_journal_folders", "barcode_scans_per_day"];

export interface PremiumRefusal {
  code: "ATXQ1" | "ATXQ2";
  feature: PremiumFeature | null;
}

/**
 * ATXQ2 (detail = the limit key) or ATXQ1 from a write; `premiumOnlyFeature`
 * names the feature an ATXQ1 is about at that call. Null for anything else.
 */
export function premiumRefusalOf(e: Err, premiumOnlyFeature: PremiumFeature | null = null): PremiumRefusal | null {
  if (!e) return null;
  const code = e.code === "ATXQ1" || e.code === "ATXQ2" ? e.code : (/\bATXQ[12]\b/.exec(e.message ?? "")?.[0] as "ATXQ1" | "ATXQ2" | undefined);
  if (code === "ATXQ2") {
    const d = (e.details ?? "").trim();
    return { code, feature: (LIMIT_DETAILS as readonly string[]).includes(d) ? (d as PremiumFeature) : null };
  }
  if (code === "ATXQ1") return { code, feature: premiumOnlyFeature };
  return null;
}

const LIMIT_REACHED: Partial<Record<PremiumFeature, string>> = {
  own_routines: tk("You've reached the free plan's routines."),
  habits: tk("You've reached the free plan's habits."),
  recipes: tk("You've reached the free plan's recipes."),
  locked_journal_folders: tk("You've reached the free plan's locked folders."),
  barcode_scans_per_day: tk("You've used today's free barcode scans. You can still enter the food by hand."),
};

/**
 * ATXQ2's sentence, the limit named by its detail. Plain, never an upgrade
 * line, so it also reads right in recovery-sensitive mode.
 */
export function limitReachedText(feature: PremiumFeature | null | undefined): string {
  const k = feature ? LIMIT_REACHED[feature] : undefined;
  return k ? t(k) : t("You've reached a free plan limit.");
}

/** The free plan's number for a limit, in a sentence ("The free plan keeps 3 routines."), or null while unknown. */
export function limitKeepsText(feature: PremiumFeature, limits: FreeLimits | null | undefined): string | null {
  if (!limits) return null;
  switch (feature) {
    case "own_routines":
      return tn(limits.own_routines, "The free plan keeps {n} routine of your own.", "The free plan keeps {n} routines of your own.");
    case "habits":
      return tn(limits.habits, "The free plan keeps {n} habit.", "The free plan keeps {n} habits.");
    case "recipes":
      return tn(limits.recipes, "The free plan keeps {n} recipe.", "The free plan keeps {n} recipes.");
    case "locked_journal_folders":
      return tn(limits.locked_journal_folders, "The free plan keeps {n} locked journal folder.", "The free plan keeps {n} locked journal folders.");
    case "barcode_scans_per_day":
      return tn(limits.barcode_scans_per_day, "The free plan has {n} barcode scan a day.", "The free plan has {n} barcode scans a day.");
    default:
      return null;
  }
}

// ---- what a Premium ask opens (the host) ----

/**
 * How a Premium moment reached the host:
 *   - "limit": a screen checked a free limit before opening (counts G6's once a day);
 *   - "refusal": a write came back ATXQ1 / ATXQ2 (the screen already shows the sentence);
 *   - "tap": the member tapped an entry point labelled Premium (asking, so once a day doesn't apply).
 */
export type AskVia = "limit" | "refusal" | "tap";
export type AskOutcome = "sheet" | "notice" | "none";

/**
 * `allowed` is promptAllowed (switch on, no Premium, may_prompt_upgrade,
 * adult, not on Get support); `shownToday` is G6's once-a-day memory. When the
 * sheet may not open, a limit check and a tap still say why, plainly (the
 * notice); a refusal's sentence is already on screen.
 */
export function askOutcome(via: AskVia, allowed: boolean, shownToday: boolean): AskOutcome {
  if (via === "tap") return allowed ? "sheet" : "notice";
  if (allowed && !shownToday) return "sheet";
  return via === "limit" ? "notice" : "none";
}

/** The notice's sentence: the limit plainly, or that a feature is part of Premium. */
export function noticeText(feature: PremiumFeature, limits: FreeLimits | null | undefined): string {
  return limitKeepsText(feature, limits) ?? (LIMIT_REACHED[feature] ? limitReachedText(feature) : t("That's part of Centium Premium."));
}

/** A Premium-only entry point shows the "Premium" label (and opens the prompt) only with the switch on and no Premium. */
export const premiumOnlyLocked = (p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined): boolean => !!p && p.premiumOn && !p.premium;

// ---- barcode scans ----

/** claim_barcode_scan(): the scans left today, or null (no limit, or an answer that isn't a number). */
export function parseScansLeft(data: unknown): number | null {
  const v = Array.isArray(data) ? data[0] : data;
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** "2 free scans left today"; null shows nothing. */
export const scansLeftText = (n: number | null): string | null => (n === null ? null : tn(n, "{n} free scan left today", "{n} free scans left today"));

/** An Edge Function's 403 body code: free_limit_reached or premium_required. */
export type EdgeRefusal = "free_limit_reached" | "premium_required";
export function edgeRefusalOf(status: number, code: string | null | undefined): EdgeRefusal | null {
  if (status !== 403) return null;
  return code === "free_limit_reached" || code === "premium_required" ? code : null;
}

// ---- 14 days of history ----

/** my_history_from(): the first local day shown (YYYY-MM-DD), or null (no cap). */
export function parseHistoryFrom(data: unknown): string | null {
  const v = Array.isArray(data) ? data[0] : data;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}

/**
 * The quiet history line: nothing while the switch is off or loading, or
 * with no cap; the plain date line where no upgrade prompt may show
 * (recovery-sensitive mode, under-18s, Get support); the Premium sentence,
 * with the prompt on tap, otherwise.
 */
export function historyLine(
  p: Pick<MyPremium, "premiumOn"> | null | undefined,
  from: string | null,
  promptAllowed: boolean,
  formatDay: (ymd: string) => string
): { text: string; asks: boolean } | null {
  if (!p || !p.premiumOn || !from) return null;
  const date = formatDay(from);
  return promptAllowed
    ? { text: t("Showing from {date}. Older history comes with Premium.", { date }), asks: true }
    : { text: t("Showing from {date}.", { date }), asks: false };
}

// ---- the full export ----

/** "centium-export-2026-11-02.json", the member's local day. */
export const exportFileName = (d: Date): string => `centium-export-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;

/** export_my_data()'s refusals, in words. ATX02: 3 a day. */
export function exportErrorText(code: string | null | undefined): string {
  if (code === "ATX02") return t("You can export 3 times a day. Try again tomorrow.");
  return t("Couldn't export your data. Try again.");
}

// ---- 2x points ----

/** my_points_ledger.multiplier (G fixes): 2 on a Premium day, else 1; anything else, or a database without it, is 1. */
export const parseMultiplier = (v: unknown): 1 | 2 => (v === 2 || v === "2" ? 2 : 1);

/** "2x with Premium" on a row: the switch on and the row made at 2x. */
export const showDoubled = (p: Pick<MyPremium, "premiumOn"> | null | undefined, multiplier: number | null | undefined): boolean => !!p && p.premiumOn && multiplier === 2;

/** The quiet line that Premium doubles points: a free member with the switch on, never in recovery-sensitive mode. */
export const showDoublePointsLine = (p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined, hideNumbers: boolean): boolean => !hideNumbers && premiumOnlyLocked(p);

// ---- streak shields ----

export interface StreakShields {
  shieldsOn: boolean;
  shieldsLeft: number | null;
  used: { day: string; streaks: string[] }[];
}

/** my_streak_shields(): one row. Unreadable or shields_on false is "nothing to show" (null). */
export function parseStreakShields(data: unknown): StreakShields | null {
  const r = (Array.isArray(data) ? data[0] : data) as Row | null | undefined;
  if (!r || typeof r !== "object" || r.shields_on !== true) return null;
  const left = typeof r.shields_left === "number" && Number.isFinite(r.shields_left) ? Math.max(0, Math.floor(r.shields_left)) : null;
  const used = (Array.isArray(r.used) ? r.used : []).flatMap((x) => {
    const u = x && typeof x === "object" ? (x as Row) : null;
    const day = typeof u?.day === "string" ? u.day.slice(0, 10) : null;
    if (!u || !day) return [];
    return [{ day, streaks: Array.isArray(u.streaks) ? u.streaks.filter((s): s is string => typeof s === "string") : [] }];
  });
  return { shieldsOn: true, shieldsLeft: left, used };
}

/** "2 streak shields left this month". */
export const shieldsLeftText = (n: number): string => tn(n, "{n} streak shield left this month", "{n} streak shields left this month");

const STREAK_NAMES: Record<string, string> = {
  logging: tk("Logging"),
  movement: tk("Movement"),
  workout: tk("Workout"),
  nutrition: tk("Nutrition"),
};

/** "Logging, Workout": the streaks a shield saved, in the app's words. */
export const shieldStreaksText = (streaks: readonly string[]): string => streaks.map((s) => (STREAK_NAMES[s] ? t(STREAK_NAMES[s]) : s)).join(", ");

// ---- Premium-only offers ----

/** offer_catalogue / offer_detail premium_only (true only while the switch is on for the caller). */
export const parsePremiumOnly = (v: unknown): boolean => v === true;

/** A free member meets "Premium members only" and the prompt instead of Redeem. */
export const offerNeedsPremium = (premiumOnly: boolean | undefined, p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined): boolean => premiumOnly === true && premiumOnlyLocked(p);

// ---- early booking and waitlist priority ----

export interface PremiumBooking {
  earlyDays: number;
  waitlistPriority: boolean;
}

/** business_profiles.premium_early_booking_days / premium_waitlist_priority (or set_business_premium_booking's row). */
export function parsePremiumBooking(data: unknown): PremiumBooking | null {
  const r = (Array.isArray(data) ? data[0] : data) as Row | null | undefined;
  if (!r || typeof r !== "object") return null;
  const d = typeof r.premium_early_booking_days === "number" ? r.premium_early_booking_days : NaN;
  if (!Number.isFinite(d)) return null;
  return { earlyDays: Math.min(7, Math.max(0, Math.floor(d))), waitlistPriority: r.premium_waitlist_priority === true };
}

const DAY_MS = 86_400_000;

/**
 * When Premium members may book a class that isn't open to everyone yet, as
 * book_class decides: everyone from `starts − window days`, Premium
 * `earlyDays` sooner. Null when there's nothing to say: the switch off, no
 * early days, no start, or the class already open to everyone.
 */
export function premiumBookingOpensAt(
  p: Pick<MyPremium, "premiumOn"> | null | undefined,
  startsAt: string | null | undefined,
  windowDays: number | null | undefined,
  earlyDays: number | null | undefined,
  now: Date = new Date()
): Date | null {
  if (!p || !p.premiumOn || !startsAt || !earlyDays || earlyDays <= 0 || windowDays == null || !Number.isFinite(windowDays)) return null;
  const starts = new Date(startsAt).getTime();
  if (!Number.isFinite(starts)) return null;
  const everyone = starts - windowDays * DAY_MS;
  if (everyone <= now.getTime()) return null;
  return new Date(everyone - earlyDays * DAY_MS);
}

/** The waitlist line, where the business turned priority on (switch on). */
export const showWaitlistPriority = (p: Pick<MyPremium, "premiumOn"> | null | undefined, b: PremiumBooking | null | undefined): boolean => !!p && p.premiumOn && !!b && b.waitlistPriority;

// ---- the directory's limit (EG) ----

/** ATX02 from a directory function: "too many directory requests -- try again in N minutes". */
export function directoryLimitText(message: string | null | undefined): string {
  const n = Number(/in (\d+) minutes?/i.exec(message ?? "")?.[1]);
  return Number.isFinite(n) && n > 0
    ? tn(n, "The directory is busy for you right now. Try again in {n} minute.", "The directory is busy for you right now. Try again in {n} minutes.")
    : t("The directory is busy for you right now. Try again in a few minutes.");
}
