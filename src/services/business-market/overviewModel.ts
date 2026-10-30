// Market + Share 3.0 · W3 · B-MA.1 Listing Overview: pure rules for the
// StatLedger and the Gym card (no Supabase import, so node:test loads it).
//
// The DB5 reader `business_marketplace_overview(p_business_id)` (Database PR
// #39, rebuilt by #40 20261215020000; the `marketing` permission): the
// measured reach this month (clients_reached) with its change against last
// month and a 30-day sparkline (the hero, heroView), active offers (live now)
// with a COUNT change against a month ago, redemptions and points this month
// with a percent change against last month (null against an empty month).
// While it loads, fails, or for staff without marketing (not asked) the three
// rows show the quiet "–" value and no change, never a number. The gym rows
// ("Active memberships", "Class bookings this week") come from the live
// venue_dashboard, which has no previous period, so their change is "–"
// (data honesty, as VenueFigures does).

import { num, rows, str } from "../market/parse";
import { appLocale } from "../../i18n/format";

/** StatLedger's row (components/market/StatLedger), kept here so node:test needs no JSX. */
export interface StatLedgerRow {
  label: string;
  value: string;
  delta?: string | null;
  leaf?: boolean;
}

/** business_marketplace_overview, one row (the nine columns of 20261215020000). */
export interface MarketplaceOverview {
  /** Measured reach this month (profile_open + offer_view), not business_profiles.members_reached. */
  clientsReached: number;
  /** Against last month; null when last month had none. */
  clientsReachedDeltaPct: number | null;
  /** The last 30 local days, oldest first. */
  sparkline: number[];
  activeOffers: number;
  /** A count change ("+1"); null when there is nothing to compare. */
  activeOffersDelta: number | null;
  redemptionsThisMonth: number;
  redemptionsDeltaPct: number | null;
  pointsRedeemed: number;
  pointsRedeemedDeltaPct: number | null;
}

/**
 * A reader's 30-day sparkline ([{ date, value }], or bare numbers) as values
 * oldest first (sorted by date when every point has one).
 */
export function sparkValues(v: unknown): number[] {
  const sp = Array.isArray(v) ? (v as unknown[]) : [];
  const points = sp
    .map((p) => (p && typeof p === "object" ? { date: str((p as Record<string, unknown>).date) ?? "", value: num((p as Record<string, unknown>).value) } : { date: "", value: num(p) }))
    .filter((p): p is { date: string; value: number } => p.value !== null);
  const sorted = points.every((p) => p.date) ? points.slice().sort((a, b) => a.date.localeCompare(b.date)) : points;
  return sorted.map((p) => p.value);
}

/** The first row of the reader's answer, or null when it answered nothing. */
export function parseOverview(data: unknown): MarketplaceOverview | null {
  const r = rows(data)[0];
  if (!r) return null;
  return {
    clientsReached: num(r.clients_reached) ?? 0,
    clientsReachedDeltaPct: num(r.clients_reached_delta_pct),
    sparkline: sparkValues(r.sparkline),
    activeOffers: num(r.active_offers) ?? 0,
    activeOffersDelta: num(r.active_offers_delta),
    redemptionsThisMonth: num(r.redemptions_this_month) ?? 0,
    redemptionsDeltaPct: num(r.redemptions_delta_pct),
    pointsRedeemed: num(r.points_redeemed) ?? 0,
    pointsRedeemedDeltaPct: num(r.points_redeemed_delta_pct),
  };
}

/** The board's figures: "7,200". */
export const formatCount = (n: number): string => Math.round(n).toLocaleString(appLocale("en-US"));

/** The quiet value of a figure that has nothing to show (loading, a failed read, not the caller's to see). */
export const QUIET = "–";

/** A count change as the board writes it: "+1", "−2" (U+2212), "0"; null is "–". */
export function countDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return QUIET;
  const v = Math.round(n);
  if (v === 0) return "0";
  return (v > 0 ? "+" : "−") + formatCount(Math.abs(v));
}

/** A percent change as the board writes it: "+15%", "−3%" (U+2212), "0%"; null is "–". */
export function pctDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return QUIET;
  const v = Math.round(n);
  if (v === 0) return "0%";
  return (v > 0 ? "+" : "−") + Math.abs(v) + "%";
}

/** "+12% vs last month" for the hero, or null (left out) when there is no change to show. */
export function heroDelta(pct: number | null | undefined): string | null {
  const d = pctDelta(pct);
  return d === QUIET ? null : `${d} vs last month`;
}

/** The hero's sub line on B-MA.1 and P-MA.1 (Karim, #40): clients_reached counts this month so far, not a rolling 30 days. */
export const THIS_MONTH = "This month so far";

/**
 * B-MA.1 HeroStatCard "Clients reached" (Karim; the board drew "Members reached") from the measured
 * clients_reached: the figure, "+12% vs last month" (left out when last month
 * had none), "This month so far" and the sparkline (all zeros draws the flat dashed
 * line). Not answered (loading, a failed read, staff without `marketing`):
 * the quiet "–" with no change, sub line or series.
 */
export function heroView(ov: OverviewState): { value: string; delta: string | null; sub: string | null; series: number[] | null } {
  const v = ov.status === "ok" ? ov.value : null;
  if (!v) return { value: QUIET, delta: null, sub: null, series: null };
  return { value: formatCount(v.clientsReached), delta: heroDelta(v.clientsReachedDeltaPct), sub: THIS_MONTH, series: v.sparkline };
}

/** "none": not asked, because the caller lacks the `marketing` permission the reader requires (42501). */
export type OverviewState = { status: "loading" } | { status: "none" } | { status: "error" } | { status: "ok"; value: MarketplaceOverview | null };

/** Live gym figures for the ledger and the Gym card (venue_dashboard + membership_plans); null fields are unknown. */
export interface GymFigures {
  activeMemberships: number | null;
  classBookingsThisWeek: number | null;
  sessionsThisWeek: number | null;
  plans: number | null;
}

/**
 * B-MA.1 StatLedger rows: Active offers · Redemptions this month · Points
 * redeemed (DB5), then for a gym Active memberships · Class bookings this
 * week (live). Anything not answered shows "–" with no change.
 */
export function ledgerRows(ov: OverviewState, gym: GymFigures | null): StatLedgerRow[] {
  const v = ov.status === "ok" ? ov.value : null;
  const live = ov.status === "ok";
  const fig = (n: number | undefined) => (live ? formatCount(n ?? 0) : QUIET);
  const out: StatLedgerRow[] = [
    { label: "Active offers", value: fig(v?.activeOffers), delta: live ? countDelta(v?.activeOffersDelta) : QUIET },
    { label: "Redemptions this month", value: fig(v?.redemptionsThisMonth), delta: live ? pctDelta(v?.redemptionsDeltaPct) : QUIET },
    { label: "Points redeemed", value: fig(v?.pointsRedeemed), delta: live ? pctDelta(v?.pointsRedeemedDeltaPct) : QUIET },
  ];
  if (gym) {
    const g = (n: number | null) => (n === null ? QUIET : formatCount(n));
    out.push({ label: "Active memberships", value: g(gym.activeMemberships), delta: QUIET });
    out.push({ label: "Class bookings this week", value: g(gym.classBookingsThisWeek), delta: QUIET });
  }
  return out;
}

const plural = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;

/** "4 plans and passes · 182 active"; a part not known yet is left out. */
export function membershipsLine(plans: number | null, active: number | null): string {
  const parts = [plans === null ? null : plural(plans, "plan or pass", "plans and passes"), active === null ? null : `${formatCount(active)} active`].filter(Boolean);
  return parts.join(" · ");
}

/** "38 sessions this week · 264 booked"; a part not known yet is left out. */
export function classesLine(sessions: number | null, booked: number | null): string {
  const parts = [sessions === null ? null : `${plural(sessions, "session", "sessions")} this week`, booked === null ? null : `${formatCount(booked)} booked`].filter(Boolean);
  return parts.join(" · ");
}

/** reorder_showcase_items refused with ATX96: an id in the list isn't the caller's to move, so nothing moved. */
export const REORDER_NOT_YOURS = "You can't change the order of these items.";
