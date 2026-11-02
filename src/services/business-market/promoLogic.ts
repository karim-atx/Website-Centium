// B13 MK-05 / MK-06 (Database 20261121290000 + 20261121300000, HANDOVER_API
// "# B13 · Marketplace and promotions"): the pure half of the promotion and
// featured-week services. No client import, so node:test can load it.
//
// Promotions are RECORDED, not applied: the price is whatever the business
// charged; a redemption only says "this payment used that offer". Featuring
// is a CENTIUM CHARGE to the business (centium_charges, B8); nothing here
// moves members' money.

/** business_payment_for()'s source kinds (Follow-up 20261121390000; day_pass takes the desk sale id). */
export type PaymentSourceKind = "class_booking" | "membership" | "order" | "appointment" | "day_pass";

/** promo_type (the DB enum). */
export type DbPromoType = "percent_off" | "first_free" | "first_n_free" | "bring_friend" | "free_delivery";
/** promo_target. */
export type DbPromoTarget = "any" | "class" | "plan" | "product" | "day_pass" | "intro_offer";
export type PromoAudience = "new" | "everyone";
/** promotion_status(row). */
export type PromoStatus = "scheduled" | "live" | "paused" | "ended";

/** One promotions row as the business (an insider) reads it. */
export interface PromotionRow {
  id: string;
  business_id: string;
  name: string;
  target_kind: DbPromoTarget;
  target_id: string | null;
  type: DbPromoType;
  value: number | string | null;
  code: string | null;
  use_limit: number | null;
  starts_on: string;
  ends_on: string | null;
  audience: PromoAudience;
  show_on_listing: boolean;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  targetKind: DbPromoTarget;
  targetId: string | null;
  type: DbPromoType;
  value: number | null;
  code: string | null;
  useLimit: number | null;
  startsOn: string;
  endsOn: string | null;
  audience: PromoAudience;
  showOnListing: boolean;
  pausedAt: string | null;
  endedAt: string | null;
}

export function toPromotion(r: PromotionRow): Promotion {
  const v = r.value === null || r.value === undefined ? null : Number(r.value);
  return {
    id: r.id,
    name: r.name,
    targetKind: r.target_kind,
    targetId: r.target_id,
    type: r.type,
    value: v !== null && Number.isFinite(v) ? v : null,
    code: r.code,
    useLimit: r.use_limit,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    audience: r.audience,
    showOnListing: r.show_on_listing,
    pausedAt: r.paused_at,
    endedAt: r.ended_at,
  };
}

/** The same order of checks as promotion_status(row) (ended, paused, scheduled, live). */
export function promotionStatus(p: Pick<Promotion, "startsOn" | "endsOn" | "pausedAt" | "endedAt">, today: string): PromoStatus {
  if (p.endedAt || (p.endsOn && p.endsOn < today)) return "ended";
  if (p.pausedAt) return "paused";
  if (p.startsOn > today) return "scheduled";
  return "live";
}

/** The columns liveOnListing reads (promotions, any insider). */
export const LISTING_PROMO_COLS = "starts_on, ends_on, paused_at, ended_at, show_on_listing";

/**
 * How many promotions are live and shown on the listing: the dashboard's and
 * Analytics' "Live discounts · On listing" (B16 phase two: these figures
 * came from business_discounts).
 */
export function liveOnListing(rows: readonly Pick<PromotionRow, "starts_on" | "ends_on" | "paused_at" | "ended_at" | "show_on_listing">[], today: string): number {
  return rows.filter((r) => r.show_on_listing && promotionStatus({ startsOn: r.starts_on, endsOn: r.ends_on, pausedAt: r.paused_at, endedAt: r.ended_at }, today) === "live").length;
}

/**
 * ATX10: once a promotion has started (live, paused or ended) its offer
 * (target, type, value, audience) can't change. Dates, pause and end can.
 */
export const offerLocked = (status: PromoStatus): boolean => status !== "scheduled";

/**
 * Chart markers for promotion starts (V6-104 kind "discount"; AN14-001 7d,
 * MA1-005 / MA1-054 7d): each promotion that started inside the chart's
 * buckets marks the bucket holding its starts_on (one tag per bucket, the
 * first promotion's text). `buckets` are the chart's
 * days or week starts (YYYY-MM-DD, ascending); `last` is the last day the
 * final bucket covers. Scheduled promotions (not started) are left out.
 */
export function promoStartMarkers<T extends Pick<Promotion, "startsOn">>(
  rows: readonly T[],
  buckets: readonly string[],
  last: string,
  text: (p: T) => string,
  today: string,
): { i: number; t: string; kind: "discount" }[] {
  if (!buckets.length) return [];
  const out: { i: number; t: string; kind: "discount" }[] = [];
  for (const p of rows) {
    if (p.startsOn > today || p.startsOn < buckets[0] || p.startsOn > last) continue;
    let i = 0;
    while (i + 1 < buckets.length && buckets[i + 1] <= p.startsOn) i++;
    out.push({ i, t: text(p), kind: "discount" });
  }
  // One tag per bucket (tags on the same bucket would sit on top of each other).
  return out.sort((a, b) => a.i - b.i).filter((m, k, a) => !k || a[k - 1].i !== m.i);
}

/** promotion_stats(p_business_id) row. */
export interface PromoStatRow {
  promotion_id: string;
  name: string;
  status: PromoStatus;
  uses: number;
  use_limit: number | null;
  people: number;
  recorded_revenue: number | string | null;
}

export interface PromoStats {
  uses: number;
  useLimit: number | null;
  people: number;
  /** What the redeemed payments recorded, net of refunds (the business's own ledger). */
  recorded: number;
}

export function toStats(rows: PromoStatRow[]): Map<string, PromoStats> {
  const m = new Map<string, PromoStats>();
  for (const r of rows) {
    const rec = Number(r.recorded_revenue ?? 0);
    m.set(r.promotion_id, { uses: Number(r.uses) || 0, useLimit: r.use_limit, people: Number(r.people) || 0, recorded: Number.isFinite(rec) ? rec : 0 });
  }
  return m;
}

// ---------------------------------------------------------------------------
// Featured weeks (MK-06)

export type PlacementTarget = "business" | "class" | "product";
export type PlacementArea = "classes" | "gyms" | "shops";
export type PlacementStatus = "requested" | "scheduled" | "live" | "ended" | "cancelled" | "payment_not_received";
export type ChargeStatus = "pending" | "paid" | "failed" | "waived" | "cancelled" | "payment_not_received";

/** my_featured_placements(p_business_id) row. */
export interface PlacementRow {
  placement_id: string;
  target_kind: PlacementTarget;
  target_id: string;
  area: PlacementArea;
  starts_on: string;
  ends_on: string;
  status: PlacementStatus;
  charge_status: ChargeStatus | null;
  amount: number | string | null;
}

export interface Placement {
  id: string;
  targetKind: PlacementTarget;
  targetId: string;
  area: PlacementArea;
  startsOn: string;
  endsOn: string;
  status: PlacementStatus;
  chargeStatus: ChargeStatus | null;
  amount: number | null;
}

export function toPlacement(r: PlacementRow): Placement {
  const a = r.amount === null || r.amount === undefined ? null : Number(r.amount);
  return {
    id: r.placement_id,
    targetKind: r.target_kind,
    targetId: r.target_id,
    area: r.area,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    status: r.status,
    chargeStatus: r.charge_status,
    amount: a !== null && Number.isFinite(a) ? a : null,
  };
}

/**
 * What the app shows for a placement. `requested` is a week whose Centium
 * charge is still open (OURS-MA1-feature-payment-cash row 9); `scheduled` is
 * paid and not started; cancelled weeks are not shown.
 */
export type PlacementView = "awaiting" | "scheduled" | "featured" | "ended" | "unpaid" | null;

export function placementView(p: Pick<Placement, "status">): PlacementView {
  switch (p.status) {
    case "requested":
      return "awaiting";
    case "scheduled":
      return "scheduled";
    case "live":
      return "featured";
    case "ended":
      return "ended";
    case "payment_not_received":
      return "unpaid";
    default:
      return null;
  }
}

/** request_featured_week takes a business, one of its classes or one of its offerings (products). */
export function placementTarget(itemKind: string, itemId: string, businessId: string): { kind: PlacementTarget; id: string } {
  if (itemKind === "class") return { kind: "class", id: itemId };
  if (itemKind === "offering") return { kind: "product", id: itemId };
  return { kind: "business", id: businessId };
}

// ---------------------------------------------------------------------------
// Errors in plain sentences

export const OFFER_LOCKED_MESSAGE = "This promotion has started, so its offer can't change. End it and create another.";

export function promoErrorMessage(e: { code?: string; message?: string }, fallback = "Couldn't save. Try again."): string {
  const msg = e.message ?? "";
  switch (e.code) {
    case "23505":
      return "You already have a promotion with that code.";
    case "ATX10":
      return OFFER_LOCKED_MESSAGE;
    case "ATXF8":
      return "That promotion can't be used now. It has ended, is paused, is used up, or is for new people only.";
    case "23514":
      if (msg.includes("promotions_dates")) return "The end date must be after the start date.";
      if (msg.includes("promotions_value")) return "Check the offer's amount.";
      if (msg.includes("promotions_name_len")) return "The promotion's name is too long.";
      if (msg.includes("promotions_limit")) return "Choose a use limit between 1 and 100,000.";
      if (msg.includes("promotions_code")) return "Codes use 3 to 20 letters or numbers.";
      return "Check the details and try again.";
    case "42501":
    case "ATX03":
      return "You don't have permission to change promotions.";
    case "ATX08":
      return "That promotion is no longer there. Refresh and try again.";
    default:
      return fallback;
  }
}

export function featureErrorMessage(e: { code?: string; message?: string }, fallback = "Couldn't send your request. Try again."): string {
  const msg = e.message ?? "";
  switch (e.code) {
    case "ATXF7":
      return msg.includes("not on sale") ? "Featuring isn't on sale for that week." : "That week is fully booked. Pick another start day.";
    case "ATX03":
      return "Only the owner can feature your business.";
    case "ATX10":
      return "Only a week that wasn't paid for can get new dates.";
    case "ATX08":
      return "That's no longer available. Refresh and try again.";
    case "22023":
      if (msg.includes("on Explore")) return "Turn on your listing first. Only businesses on Explore can be featured.";
      if (msg.includes("90 days")) return "Pick a start day in the next 90 days.";
      return fallback;
    default:
      return fallback;
  }
}
