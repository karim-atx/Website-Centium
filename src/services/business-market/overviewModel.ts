// Market + Share 3.0 · W3 · B-MA.1 Listing Overview: pure rules for the
// StatLedger and the Gym card (no Supabase import, so node:test loads it).
//
// The DB5 reader `business_marketplace_overview(p_business_id)` (Database PR
// #39, 20261214030000; the `marketing` permission): active offers (live now)
// with a COUNT change against a month ago, redemptions and points this month
// with a percent change against last month (null against an empty month).
// While it loads, fails, or for staff without marketing (not asked) the three
// rows show the quiet "–" value and no change, never a number. The gym rows
// ("Active memberships", "Class bookings this week") come from the live
// venue_dashboard, which has no previous period, so their change is "–"
// (data honesty, as VenueFigures does).

import { num, rows } from "../market/parse";

/** StatLedger's row (components/market/StatLedger), kept here so node:test needs no JSX. */
export interface StatLedgerRow {
  label: string;
  value: string;
  delta?: string | null;
  leaf?: boolean;
}

/** DB5 business_marketplace_overview, one row (the six columns 20261214030000 pins). */
export interface MarketplaceOverview {
  activeOffers: number;
  /** A count change ("+1"); null when there is nothing to compare. */
  activeOffersDelta: number | null;
  redemptionsThisMonth: number;
  redemptionsDeltaPct: number | null;
  pointsRedeemed: number;
  pointsRedeemedDeltaPct: number | null;
}

/** The first row of the reader's answer, or null when it answered nothing. */
export function parseOverview(data: unknown): MarketplaceOverview | null {
  const r = rows(data)[0];
  if (!r) return null;
  return {
    activeOffers: num(r.active_offers) ?? 0,
    activeOffersDelta: num(r.active_offers_delta),
    redemptionsThisMonth: num(r.redemptions_this_month) ?? 0,
    redemptionsDeltaPct: num(r.redemptions_delta_pct),
    pointsRedeemed: num(r.points_redeemed) ?? 0,
    pointsRedeemedDeltaPct: num(r.points_redeemed_delta_pct),
  };
}

/** The board's figures: "7,200". */
export const formatCount = (n: number): string => Math.round(n).toLocaleString("en-US");

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
