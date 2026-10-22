// Market + Share 3.0 · W2 · points, pure (C-MO.4.1 hero, C-MO.4.7 history,
// C-MO.4.8 how to earn). Every figure arrives from the server
// (my_points_summary, my_points_ledger, platform_settings, reward_catalog);
// this file only arranges it. The ledger's row words are the server's
// (ref_label, description); the other strings and colours are the Client
// Explore Screens script's (`TV`, `LEDGER`, `todayLine`, `daily`, `streaks`).

import { formatShortDate } from "../../utils/date";
import { num, rows, str } from "../market/parse";

// ---------------------------------------------------------------------------
// The summary's today and expiring figures

/**
 * my_points_summary()'s last four columns (Database 20261210300000):
 * earned_today (LOGGING points today, net of reversals, in the member's
 * timezone; achievements and streak milestones excluded), daily_cap (from
 * platform_settings), expiring_soon and expiring_soon_date (both null or both
 * set). A row without them parses to null, and the hero then leaves out the
 * "N of 30 today" line and the expiring row rather than guess.
 */
export interface PointsExtras {
  earnedToday: number;
  dailyCap: number;
  expiringSoon: number;
  /** YYYY-MM-DD, or null when nothing lapses within the notice window. */
  expiringSoonDate: string | null;
}

export function parsePointsExtras(row: Record<string, unknown> | null | undefined): PointsExtras | null {
  if (!row) return null;
  const earned = num(row.earned_today);
  const cap = num(row.daily_cap);
  if (earned === null || cap === null) return null;
  return {
    earnedToday: earned,
    dailyCap: cap,
    expiringSoon: num(row.expiring_soon) ?? 0,
    expiringSoonDate: str(row.expiring_soon_date),
  };
}

/** "20 of 30 today", or at the cap "30 of 30 today · limit reached" (homeCap). */
export function todayLine(x: Pick<PointsExtras, "earnedToday" | "dailyCap">): string {
  const cap = Math.max(0, Math.round(x.dailyCap));
  const earned = Math.max(0, Math.min(cap, Math.round(x.earnedToday)));
  return earned >= cap ? `${cap} of ${cap} today · limit reached` : `${earned} of ${cap} today`;
}

/** "Nov 14, 2026" (D-02 month first) from a YYYY-MM-DD or ISO string. */
export function longDay(isoDay: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoDay) ? new Date(`${isoDay}T12:00:00`) : new Date(isoDay);
  return formatShortDate(d, { month: "short", day: "numeric", year: "numeric" });
}

/** The expiring-soon row: "180 points expire on Nov 14, 2026", or null. */
export function expiringLine(x: PointsExtras | null): string | null {
  if (!x || x.expiringSoon <= 0 || !x.expiringSoonDate) return null;
  const n = Math.round(x.expiringSoon);
  return `${n.toLocaleString("en-US")} ${n === 1 ? "point expires" : "points expire"} on ${longDay(x.expiringSoonDate)}`;
}

// ---------------------------------------------------------------------------
// The hero's "next reward" line

export interface NextRewardOffer {
  headline: string;
  ownerName: string;
  pointsCost: number;
}

export interface NextRewardLine {
  /** Bold, --ink: "260 to your next reward" / "You can redeem every reward" / "760 to Gold". */
  lead: string;
  /** --faint: "15% off full-price items at Outline Activewear", or "". */
  detail: string;
  /** The bar, 0..100. */
  pct: number;
}

/**
 * TV.next / nextBiz / pct: the cheapest offer the balance doesn't reach yet.
 * With offers but none out of reach: "You can redeem every reward", 100%.
 * Without offers (reward_catalog not landed, DB2, or none listed) the bar
 * falls back to the live tier progress (the old card's), so the hero never
 * names a reward that isn't there.
 */
export function nextRewardLine(
  balance: number,
  offers: readonly NextRewardOffer[] | null,
  tier: { nextTierName: string | null; pointsToNextTier: number | null; progress: number }
): NextRewardLine {
  if (offers && offers.length > 0) {
    const ahead = offers.filter((o) => o.pointsCost > balance).sort((a, b) => a.pointsCost - b.pointsCost)[0];
    if (!ahead) return { lead: "You can redeem every reward", detail: "", pct: 100 };
    const pct = Math.round((Math.max(0, balance) / ahead.pointsCost) * 1000) / 10;
    return { lead: `${(ahead.pointsCost - balance).toLocaleString("en-US")} to your next reward`, detail: `${ahead.headline} at ${ahead.ownerName}`, pct };
  }
  if (tier.nextTierName && tier.pointsToNextTier !== null) {
    return { lead: `${tier.pointsToNextTier.toLocaleString("en-US")} to ${tier.nextTierName}`, detail: "", pct: Math.round(Math.max(0, Math.min(1, tier.progress)) * 1000) / 10 };
  }
  return { lead: "Highest tier", detail: "", pct: 100 };
}

// ---------------------------------------------------------------------------
// The ledger

export interface LedgerEntry {
  id: string;
  /** points_source: log_food, log_workout, log_metric, water_goal, streak_milestone, achievement, streak, referral, redemption, expiry, reversal, manual_adjustment. */
  source: string;
  amount: number;
  /** The server's words for the row ("Daily logging", "Reversed · Logging"); an achievement's key on achievement rows. */
  description: string | null;
  /** my_points_ledger ref_label: the display word for the row's kind ("Food log", "Achievement", "Reward"); a reversal carries the kind it reversed. */
  refLabel: string | null;
  /** The member's local day the award belongs to; null for sources that aren't day-scoped. */
  day: string | null;
  createdAt: string;
  expiresAt: string | null;
  /** On a reversal row, the logging source it reversed; null elsewhere. */
  reversedSource: string | null;
}

export function parseLedgerRows(data: unknown): LedgerEntry[] {
  return rows(data).flatMap((r) => {
    const id = str(r.id);
    const amount = num(r.amount);
    const createdAt = str(r.created_at);
    if (!id || amount === null || !createdAt) return [];
    return [
      {
        id,
        source: str(r.source) ?? "other",
        amount,
        description: str(r.description),
        refLabel: str(r.ref_label),
        day: str(r.day),
        createdAt,
        expiresAt: str(r.expires_at),
        reversedSource: str(r.reversed_source),
      },
    ];
  });
}

/** streak_7 → 7 (the streak achievements are the milestones, D-08). */
export function streakDays(key: string | null): number | null {
  const m = key ? /^streak_(\d+)$/.exec(key) : null;
  return m ? Number(m[1]) : null;
}

/**
 * A row's two lines (`l.src` 13.5 / 700, `l.kind` 11 --faint). The words are
 * the server's (my_points_ledger, Database 20261210300000), never a client
 * mapping of `source`:
 * - an achievement row: its title (my_achievements, by the key in
 *   `description`; "7-day streak" for a streak rung the list doesn't name)
 *   over "Earned · {ref_label}";
 * - every other row: `ref_label` ("Food log", "Water goal", "Referral",
 *   "Reward", "Expired"; a reversal carries the kind it reversed) over
 *   `description` ("Daily logging", "Reversed · Logging", "Referral redeemed
 *   by a new member"), or "Earned" / "Spent" by the sign when it has none.
 * `achievementTitle` turns an achievement key into its title.
 */
export function ledgerLines(e: LedgerEntry, achievementTitle: (key: string) => string | null): { title: string; kind: string } {
  const label = e.refLabel ?? "Points";
  if (e.source === "achievement") {
    const days = streakDays(e.description);
    const title = (e.description ? achievementTitle(e.description) : null) ?? (days !== null ? `${days}-day streak` : label);
    return { title, kind: `Earned · ${label}` };
  }
  return { title: label, kind: e.description ?? (e.amount > 0 ? "Earned" : "Spent") };
}

/**
 * The cursor for the next my_points_ledger page: the last row shown, as
 * (p_before, p_before_id). The server orders by created_at desc, id desc and
 * pages on that pair (Database f470909), so rows sharing a created_at are
 * neither repeated nor skipped. `before` is the row's created_at exactly as
 * the server sent it (microseconds; a JS Date would round to milliseconds).
 */
export interface LedgerCursor {
  before: string;
  beforeId: string;
}

export function ledgerCursor(entries: readonly LedgerEntry[]): LedgerCursor | null {
  const last = entries[entries.length - 1];
  return last ? { before: last.createdAt, beforeId: last.id } : null;
}

/** "+5" / "−800" (a true minus, U+2212, as the board). */
export const signedPoints = (n: number): string => `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** The amount's ink (`l.ink`): earned #4F8F8A, spent / reversed / expired #7D67D9. */
export const amountTone = (n: number): "earned" | "spent" => (n > 0 ? "earned" : "spent");

/** The row's local day: the server's `day`, else the created_at's local date. */
export function entryDay(e: LedgerEntry): string {
  if (e.day) return e.day;
  const d = new Date(e.createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The group heading: "Today", "Yesterday", "Oct 14", or "Aug 16, 2025" in another year (D-02). */
export function dayHeading(day: string, now: Date = new Date()): string {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (day === today) return "Today";
  if (day === dayKey(y)) return "Yesterday";
  const d = new Date(`${day}T12:00:00`);
  return d.getFullYear() === now.getFullYear()
    ? formatShortDate(d, { month: "short", day: "numeric" })
    : formatShortDate(d, { month: "short", day: "numeric", year: "numeric" });
}

export type LedgerItem = { kind: "head"; key: string; label: string } | { kind: "row"; key: string; entry: LedgerEntry; balanceAfter: number };

/**
 * The list as drawn: a heading per day, then its rows newest first, each with
 * the balance after it. `balance` is my_points_summary()'s balance now (the
 * ledger's sum): the balance after a row is it minus every newer row.
 */
export function groupLedger(entries: readonly LedgerEntry[], balance: number, now: Date = new Date()): LedgerItem[] {
  const sorted = [...entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const out: LedgerItem[] = [];
  let running = balance;
  let last: string | null = null;
  for (const e of sorted) {
    const day = entryDay(e);
    if (day !== last) {
      out.push({ kind: "head", key: `h-${day}`, label: dayHeading(day, now) });
      last = day;
    }
    out.push({ kind: "row", key: e.id, entry: e, balanceAfter: running });
    running -= e.amount;
  }
  return out;
}

/** Today's logging sources that earned and stand (not reversed): the How to earn ticks. */
export function earnedToday(entries: readonly LedgerEntry[], now: Date = new Date()): Set<string> {
  const today = dayKey(now);
  const net = new Map<string, number>();
  for (const e of entries) {
    if (entryDay(e) !== today) continue;
    const src = e.reversedSource ?? e.source;
    if (DAILY_SOURCES.has(src)) net.set(src, (net.get(src) ?? 0) + e.amount);
  }
  return new Set([...net].filter(([, v]) => v > 0).map(([k]) => k));
}

// ---------------------------------------------------------------------------
// How to earn (C-MO.4.8): the board's rules, HANDOVER §9.

/** `daily`: [source, label]. The board's labels; the points are platform_settings' (PointsRules). */
export const DAILY_RULES: readonly [string, string][] = [
  ["log_food", "Food logged"],
  ["log_workout", "Workout logged"],
  ["log_metric", "Health metric logged or synced"],
  ["water_goal", "Water goal reached"],
];

const DAILY_SOURCES: ReadonlySet<string> = new Set(DAILY_RULES.map(([s]) => s));

/**
 * The rules How to earn states, as the server pays them: platform_settings
 * (Database 20261210100000) points_value_food / _workout / _metric /
 * _water_goal, points_daily_cap and points_expiry_months, the columns
 * points_award_value and points_recount_day read when they award.
 */
export interface PointsRules {
  /** Points per DAILY_RULES source. */
  values: Record<string, number>;
  dailyCap: number;
  expiryMonths: number;
}

export function parsePointsRules(row: Record<string, unknown> | null | undefined): PointsRules | null {
  if (!row) return null;
  const food = num(row.points_value_food);
  const workout = num(row.points_value_workout);
  const metric = num(row.points_value_metric);
  const water = num(row.points_value_water_goal);
  const cap = num(row.points_daily_cap);
  const months = num(row.points_expiry_months);
  if (food === null || workout === null || metric === null || water === null || cap === null || months === null) return null;
  return { values: { log_food: food, log_workout: workout, log_metric: metric, water_goal: water }, dailyCap: cap, expiryMonths: months };
}

/** The streak milestones (D-08: the streak achievements streak_7 / 30 / 100 / 365). */
export const STREAK_MILESTONES: readonly number[] = [7, 30, 100, 365];

/**
 * "Next: 100 days" / "68 days to go · +750" and the bar's fill: the first
 * milestone past the current streak. All reached: null.
 */
export function nextMilestone(streak: number, points: (days: number) => number | null): { days: number; toGo: number; points: number | null; pct: number } | null {
  const next = STREAK_MILESTONES.find((d) => d > streak);
  if (next === undefined) return null;
  return { days: next, toGo: next - Math.max(0, streak), points: points(next), pct: Math.round((Math.max(0, streak) / next) * 100) };
}
