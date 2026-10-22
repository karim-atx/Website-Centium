// Market + Share 3.0 · W3 · the professional Marketplace (P-MA.1 Overview,
// P-MA.2 Showcase): pure rules, no Supabase import (node:test loads this).
//
// - professional_overview(): DB5 (PLAN §2.2; types.ts ProfessionalOverview:
//   clientsReached, clientsReachedDeltaPct, sparkline, activeOffers,
//   redemptionsThisMonth, pointsRedeemed, activeClients, gymsWorkingWith).
//   The ledger's per-row changes are not in the documented shape: they are
//   read when the row carries them (`*_delta` / `*_delta_pct`), else "–".
//   `marketplace_visible` is read the same way (DB3's flag; D-19 default
//   true): the overview is the only reader that could carry it without
//   selecting a column that doesn't exist yet.
// - The Showcase services are the LIVE appointment_services (Book, session
//   types) and professional_plans (Hire) (D-18), in the live order (sessions
//   by created_at, then plans by position) until DB3's `sort` exists.

import { bool, num, rows, str } from "../market/parse";
import { countDelta, formatCount, heroDelta, pctDelta, QUIET } from "../business-market/overviewModel";
import { licenceStatus, type LicenceReviewRow } from "../professional-cv/licenceStatus";
import { monthYear, planPrice, priceLabel, sessionLine } from "../../components/pro/profile/profileModel";

export { QUIET };

/** StatLedger's row (components/market/StatLedger), kept here so node:test needs no JSX. */
export interface LedgerRow {
  label: string;
  value: string;
  delta?: string | null;
  leaf?: boolean;
}

// ---------------------------------------------------------------------------
// P-MA.1 Overview
// ---------------------------------------------------------------------------

export interface ProOverview {
  clientsReached: number;
  clientsReachedDeltaPct: number | null;
  /** The 30-day series, oldest first. */
  sparkline: number[];
  activeOffers: number;
  activeOffersDelta: number | null;
  redemptionsThisMonth: number;
  redemptionsDeltaPct: number | null;
  pointsRedeemed: number;
  pointsRedeemedDeltaPct: number | null;
  activeClients: number;
  activeClientsDelta: number | null;
  gymsWorkingWith: number;
  gymsWorkingWithDelta: number | null;
  /** DB3's marketplace flag when the row carries it; null = not said (the live default, visible). */
  marketplaceVisible: boolean | null;
}

/** professional_overview()'s first row (an array or one object), or null when it answered nothing. */
export function parseProOverview(data: unknown): ProOverview | null {
  const r = rows(data)[0];
  if (!r) return null;
  const sp = Array.isArray(r.sparkline) ? (r.sparkline as unknown[]) : [];
  const points = sp
    .map((p) => (p && typeof p === "object" ? { date: str((p as Record<string, unknown>).date) ?? "", value: num((p as Record<string, unknown>).value) } : { date: "", value: num(p) }))
    .filter((p): p is { date: string; value: number } => p.value !== null);
  const sorted = points.every((p) => p.date) ? points.slice().sort((a, b) => a.date.localeCompare(b.date)) : points;
  return {
    clientsReached: num(r.clients_reached) ?? 0,
    clientsReachedDeltaPct: num(r.clients_reached_delta_pct),
    sparkline: sorted.map((p) => p.value),
    activeOffers: num(r.active_offers) ?? 0,
    activeOffersDelta: num(r.active_offers_delta),
    redemptionsThisMonth: num(r.redemptions_this_month) ?? 0,
    redemptionsDeltaPct: num(r.redemptions_delta_pct),
    pointsRedeemed: num(r.points_redeemed) ?? 0,
    pointsRedeemedDeltaPct: num(r.points_redeemed_delta_pct),
    activeClients: num(r.active_clients) ?? 0,
    activeClientsDelta: num(r.active_clients_delta),
    gymsWorkingWith: num(r.gyms_working_with) ?? 0,
    gymsWorkingWithDelta: num(r.gyms_working_with_delta),
    marketplaceVisible: "marketplace_visible" in r ? bool(r.marketplace_visible) : null,
  };
}

export type ProOverviewState = { status: "loading" } | { status: "pending" } | { status: "error" } | { status: "ok"; value: ProOverview | null };

/** The P-MA.1 Empty line under "Clients reached" (ovEmpty). */
export const EMPTY_SUB = "Shows once clients start finding you";
export const LAST_30 = "Last 30 days";

export interface OverviewView {
  hero: { value: string; delta: string | null; sub: string | null; series: number[] | null };
  rows: LedgerRow[];
  /** ovEmpty: the professional has no figures yet (zeros, the dashed flat line). */
  empty: boolean;
}

/**
 * The hero and ledger for a state. Answered: the DB5 figures (ovVisible), or
 * ovEmpty when nobody has been reached yet (zeros, "–" changes, the empty
 * line). Not answered (loading, the stage pending, a failed read): every
 * figure is the quiet "–", except "Active clients", which the LIVE roster
 * (active_professional_clients, `roster`) answers when it is known.
 */
export function overviewView(state: ProOverviewState, roster: number | null): OverviewView {
  const v = state.status === "ok" ? state.value : null;
  if (v) {
    const empty = v.clientsReached === 0;
    const d = (s: string) => (empty ? QUIET : s);
    return {
      empty,
      hero: {
        value: formatCount(v.clientsReached),
        delta: empty ? null : heroDelta(v.clientsReachedDeltaPct),
        sub: empty ? EMPTY_SUB : LAST_30,
        series: empty ? null : v.sparkline,
      },
      rows: [
        { label: "Active offers", value: formatCount(v.activeOffers), delta: d(countDelta(v.activeOffersDelta)) },
        { label: "Redemptions this month", value: formatCount(v.redemptionsThisMonth), delta: d(pctDelta(v.redemptionsDeltaPct)) },
        { label: "Points redeemed", value: formatCount(v.pointsRedeemed), delta: d(pctDelta(v.pointsRedeemedDeltaPct)), leaf: true },
        { label: "Active clients", value: formatCount(v.activeClients), delta: d(countDelta(v.activeClientsDelta)) },
        { label: "Gyms working with", value: formatCount(v.gymsWorkingWith), delta: d(countDelta(v.gymsWorkingWithDelta)) },
      ],
    };
  }
  return {
    empty: false,
    hero: { value: QUIET, delta: null, sub: null, series: null },
    rows: [
      { label: "Active offers", value: QUIET, delta: QUIET },
      { label: "Redemptions this month", value: QUIET, delta: QUIET },
      { label: "Points redeemed", value: QUIET, delta: QUIET, leaf: true },
      { label: "Active clients", value: roster === null ? QUIET : formatCount(roster), delta: QUIET },
      { label: "Gyms working with", value: QUIET, delta: QUIET },
    ],
  };
}

/** Visible unless the overview says hidden (D-19: every professional is visible today). */
export function visibleFrom(state: ProOverviewState): boolean {
  return !(state.status === "ok" && state.value?.marketplaceVisible === false);
}

// ---------------------------------------------------------------------------
// P-MA.2 Showcase · Services
// ---------------------------------------------------------------------------

export type LocationKind = "in_person" | "online" | "home_visit" | "phone" | null;

/** A live appointment_services row (a professional's own session type). */
export interface SessionService {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  currency: string;
  bufferMin: number;
  colour: string | null;
  /** null = in person or online ("Both"). */
  locationKind: LocationKind;
  createdAt: string;
}

/** A live professional_plans row (a hire plan: package or programme). */
export interface PlanService {
  id: string;
  name: string;
  price: number;
  billing: string;
  features: string[];
  active: boolean;
  position: number;
  sessionCount: number | null;
  createdAt: string;
}

export type ServiceRef = { kind: "session"; item: SessionService } | { kind: "plan"; item: PlanService };

export interface ServiceCard {
  key: string;
  ref: ServiceRef;
  name: string;
  /** "60 min · In person", "4 sessions · Monthly". */
  meta: string;
  description: string | null;
  price: string;
  /** Drawn at 0.5 (a plan not offered; a service hidden from the Showcase once DB3 lands). */
  dim: boolean;
  /** The chip under a dimmed card. */
  chip: string | null;
}

const BILLING_WORD: Record<string, string> = { daily: "Daily", monthly: "Monthly", quarterly: "Every 3 months", semiannually: "Every 6 months", annually: "Yearly" };

/** The plan card's meta line: the package size, then how it is billed. */
export function planMeta(sessionCount: number | null, billing: string): string {
  const parts = [sessionCount !== null ? `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}` : null, BILLING_WORD[billing] ?? null].filter(Boolean);
  return parts.join(" · ");
}

export const serviceKey = (r: ServiceRef): string => `${r.kind}:${r.item.id}`;

/** Book (session types, created order) then Hire (plans, position order), as cards. */
export function serviceCards(sessions: SessionService[], plans: PlanService[]): ServiceCard[] {
  const s = sessions
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((x): ServiceCard => {
      const ref: ServiceRef = { kind: "session", item: x };
      return { key: serviceKey(ref), ref, name: x.name, meta: sessionLine(x.durationMin, x.locationKind), description: x.description?.trim() || null, price: priceLabel(x.price, x.currency), dim: false, chip: null };
    });
  const p = plans
    .slice()
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
    .map((x): ServiceCard => {
      const ref: ServiceRef = { kind: "plan", item: x };
      const included = x.features.map((f) => f.trim()).filter(Boolean);
      return {
        key: serviceKey(ref),
        ref,
        name: x.name,
        meta: planMeta(x.sessionCount, x.billing),
        description: included.length ? included.join(" · ") : null,
        price: planPrice(x.price, x.billing),
        dim: !x.active,
        chip: x.active ? null : "Not offered",
      };
    });
  return [...s, ...p];
}

/** "5 services" (the caps header), "1 service". */
export const servicesHeader = (n: number): string => `${n} ${n === 1 ? "service" : "services"}`;

/** The Format chips (DB3 `format` for plans; for a session type, its live location_kind). */
export type Format = "in_person" | "online" | "both";
export const FORMATS: { key: Format; label: string }[] = [
  { key: "in_person", label: "In person" },
  { key: "online", label: "Online" },
  { key: "both", label: "Both" },
];

/** A session type's Format from location_kind: null is both (CA16); home visit and phone have no chip. */
export function formatOfLocation(k: LocationKind): Format | null {
  return k === "in_person" ? "in_person" : k === "online" ? "online" : k === null ? "both" : null;
}

/** The location_kind a chip writes; no chip keeps the current kind (a home visit or phone type). */
export function locationOfFormat(f: Format | null, current: LocationKind): LocationKind {
  if (f === null) return current;
  return f === "both" ? null : f;
}

// ---------------------------------------------------------------------------
// P-MA.2 Showcase · About
// ---------------------------------------------------------------------------

export interface AboutRow {
  title: string;
  sub: string;
  value: string;
  tone: "good" | "faint";
}

export interface LicenceLike {
  id: string;
  name: string | null;
  expires: string | null;
  noExpiry: boolean;
  documentPath: string | null;
  showWhenExpired: boolean;
}

/** The about rows: each credential (Verified when approved), the languages, and the contact line (D-27). */
export function aboutRows(licences: LicenceLike[], reviews: LicenceReviewRow[], languages: string[], nowMonth: string): AboutRow[] {
  const out: AboutRow[] = [];
  for (const l of licences) {
    const name = l.name?.trim();
    if (!name) continue;
    const expired = !l.noExpiry && !!l.expires && l.expires < nowMonth;
    if (expired && !l.showWhenExpired) continue;
    const status = licenceStatus(l, reviews);
    const when = !l.noExpiry && l.expires ? monthYear(l.expires) : null;
    out.push({
      title: name,
      sub: when ? `Credential · ${expired ? "expired" : "renews"} ${when}` : "Credential",
      value: status.kind === "verified" ? "Verified" : status.kind === "pending" ? "In review" : "",
      tone: status.kind === "verified" ? "good" : "faint",
    });
  }
  const langs = languages.map((x) => x.trim()).filter(Boolean);
  if (langs.length) out.push({ title: langs.join(", "), sub: "Languages", value: "", tone: "faint" });
  out.push({ title: "Phone, email and social links", sub: "Share them in Messages if you choose", value: "Not shown", tone: "faint" });
  return out;
}

/** "4.8 · 38 reviews · Hamra, Beirut": the average from three reviews (as the public listing), the count, the area. */
export function ratingLine(average: number | null, count: number, area: string | null): { text: string; star: boolean } {
  const showAvg = count >= 3 && average !== null;
  const parts = [showAvg ? average.toFixed(1) : null, count > 0 ? `${count} ${count === 1 ? "review" : "reviews"}` : "No reviews yet", area?.trim() || null].filter(Boolean);
  return { text: parts.join(" · "), star: showAvg };
}

/** "RK" from "Rana Khoury"; one name gives one letter. */
export function initials(name: string | null | undefined): string {
  const w = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

// ---------------------------------------------------------------------------
// P-MA.2 Showcase · Availability
// ---------------------------------------------------------------------------

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface HoursRow {
  /** ISO weekday 1..7. */
  weekday: number;
  start: string;
  end: string;
  businessId: string | null;
}

/**
 * The weekly hours, Monday first: the professional's own practice hours
 * (business rows are the businesses' and show on Availability), each day's
 * ranges by start time, `fmt` formatting a range; "Off" for a day without.
 */
export function weeklyHours(rowsIn: HoursRow[], fmt: (start: string, end: string) => string): { day: string; hours: string; off: boolean }[] {
  const own = rowsIn.filter((r) => r.businessId === null);
  return DAYS.map((day, i) => {
    const list = own
      .filter((r) => r.weekday === i + 1)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((r) => fmt(r.start, r.end));
    const uniq = list.filter((x, k) => list.indexOf(x) === k);
    return uniq.length ? { day, hours: uniq.join(" · "), off: false } : { day, hours: "Off", off: true };
  });
}

// ---------------------------------------------------------------------------
// Delete in flight (P-MA.2 "Service deleted")
// ---------------------------------------------------------------------------

/** The cards without the ones being deleted (a failed delete brings them back). */
export function withoutPending<T extends { key: string }>(cards: T[], pending: ReadonlySet<string>): T[] {
  return pending.size ? cards.filter((c) => !pending.has(c.key)) : cards;
}
