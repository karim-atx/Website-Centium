// Market + Share 3.0 · W2 · point offers for clients, pure (C-MO.4.4 Rewards,
// C-MO.4.4.1 Showcase offers, C-MO.4.4.2 Offer detail, C-MO.4.4.3 Redeem).
// Row shapes are PLAN §2.2 DB2 / DB3 (reward_catalog, offer_detail,
// redeem_offer, public_showcase); re-check the names when the stages land.

import { formatShortDate } from "../../utils/date";
import { bool, num, rows, str } from "../market/parse";

// ---------------------------------------------------------------------------
// Categories (C-MO.4.4 chips, `cats`)

export type RewardCategory = "all" | "professionals" | "clothing" | "equipment" | "supplements" | "meal_prep" | "wellness";

/** The chips in the board's order, with their labels. */
export const REWARD_CATEGORIES: readonly { key: RewardCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "professionals", label: "Professionals" },
  { key: "clothing", label: "Clothing" },
  { key: "equipment", label: "Equipment" },
  { key: "supplements", label: "Supplements" },
  { key: "meal_prep", label: "Meal Prep" },
  { key: "wellness", label: "Wellness" },
];

/** reward_catalog's p_category: null for All (gym and studio offers show under All only, D-21). */
export const categoryParam = (c: RewardCategory): string | null => (c === "all" ? null : c);

/**
 * The business types each chip lists (PLAN §2.2 DB2 mapping), for the
 * business sections Rewards keeps (D-21: the old Businesses tab's rows, so
 * businesses with no offers stay findable). All lists every business.
 */
export const CATEGORY_TYPES: Record<Exclude<RewardCategory, "all" | "professionals">, string> = {
  clothing: "clothing_store",
  equipment: "equipment_seller",
  supplements: "supplement_store",
  meal_prep: "meal_prep_service",
  wellness: "wellness_service",
};

export function categoryOfType(venueType: string): RewardCategory | null {
  const hit = (Object.entries(CATEGORY_TYPES) as [RewardCategory, string][]).find(([, t]) => t === venueType);
  return hit ? hit[0] : null;
}

// ---------------------------------------------------------------------------
// reward_catalog rows

export interface CatalogOffer {
  offerId: string;
  headline: string;
  ownerType: "business" | "professional";
  ownerId: string;
  ownerName: string;
  /** "Rana Khoury · Trainer" for a professional; the business name otherwise. */
  ownerSubtitle: string;
  ownerLogoUrl: string | null;
  pointsCost: number;
  endsOn: string | null;
  canRedeem: boolean;
  pointsToGo: number;
}

export function parseCatalog(data: unknown): CatalogOffer[] {
  return rows(data).flatMap((r) => {
    const offerId = str(r.offer_id) ?? str(r.id);
    const headline = str(r.headline);
    const cost = num(r.points_cost);
    if (!offerId || !headline || cost === null) return [];
    const ownerType = r.owner_type === "professional" ? "professional" : "business";
    const ownerName = str(r.owner_name) ?? "";
    return [
      {
        offerId,
        headline,
        ownerType,
        ownerId: str(r.owner_id) ?? "",
        ownerName,
        ownerSubtitle: str(r.owner_subtitle) ?? ownerName,
        ownerLogoUrl: str(r.owner_logo_url),
        pointsCost: cost,
        endsOn: str(r.ends_on),
        canRedeem: bool(r.can_redeem),
        pointsToGo: num(r.points_to_go) ?? 0,
      },
    ];
  });
}

export type RewardSort = "featured" | "lowest" | "highest";

export const REWARD_SORTS: readonly { key: RewardSort; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "lowest", label: "Fewest points" },
  { key: "highest", label: "Most points" },
];

/**
 * The list as shown. "Featured" keeps the server's order (D-22: redeemable
 * first, then cost ascending); the other sorts are by cost. "Affordable now"
 * keeps only what the balance reaches (the board's toggle, `can`).
 */
export function arrangeOffers(list: readonly CatalogOffer[], sort: RewardSort, affordableOnly: boolean, balance: number): CatalogOffer[] {
  const can = (o: CatalogOffer) => o.pointsCost <= balance;
  const shown = affordableOnly ? list.filter(can) : [...list];
  if (sort === "lowest") shown.sort((a, b) => a.pointsCost - b.pointsCost);
  if (sort === "highest") shown.sort((a, b) => b.pointsCost - a.pointsCost);
  return shown;
}

/** Two-letter initials for an owner tile ("Outline Activewear" → "OA"). */
export function ownerInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// offer_detail

export type OfferWhere = "in_store" | "online" | "both" | "in_person";

export interface OfferDetail extends CatalogOffer {
  terms: string | null;
  where: OfferWhere | null;
  startsOn: string | null;
  perMemberLimit: number | null;
  /** Vouchers left under the quantity cap; null = no cap. */
  quantityLeft: number | null;
  /** How many more this member may redeem; null = not said. */
  limitLeft: number | null;
  /** The voucher's validity in days from issue (D-24: 90, capped at the offer's end). */
  voucherDays: number | null;
  /** The owner's online shop, for "Online: enter the code at checkout on …". */
  onlineUrl: string | null;
}

export function parseOfferDetail(data: unknown): OfferDetail | null {
  const r = rows(data)[0];
  if (!r) return null;
  const base = parseCatalog([r])[0];
  if (!base) return null;
  const where = str(r.where_used) ?? str(r.where);
  return {
    ...base,
    terms: str(r.terms),
    where: where === "in_store" || where === "online" || where === "both" || where === "in_person" ? where : null,
    startsOn: str(r.starts_on),
    perMemberLimit: num(r.per_member_limit),
    quantityLeft: num(r.quantity_left),
    limitLeft: num(r.limit_left) ?? num(r.per_member_limit_left),
    voucherDays: num(r.voucher_days) ?? num(r.voucher_valid_days),
    onlineUrl: str(r.online_url),
  };
}

/** "Where to use" (`offerRows`): In store / Online / In store and online / In person. */
export function whereLabel(w: OfferWhere | null): string | null {
  return w === "in_store" ? "In store" : w === "online" ? "Online" : w === "both" ? "In store and online" : w === "in_person" ? "In person" : null;
}

const day = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);

/** "Valid": "Oct 1 to Dec 31, 2026" (D-02; the board's "1 Oct to 31 Dec 2026"). */
export function validRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!endsOn) return null;
  const end = day(endsOn);
  const endText = formatShortDate(end, { month: "short", day: "numeric", year: "numeric" });
  if (!startsOn) return `Until ${endText}`;
  const start = day(startsOn);
  const startText = formatShortDate(start, start.getFullYear() === end.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startText} to ${endText}`;
}

/** "1 per member". */
export const limitLabel = (n: number | null): string | null => (n && n > 0 ? `${n} per member` : null);

/** "90 days after it is issued". */
export const voucherExpiryLabel = (days: number | null): string | null => (days && days > 0 ? `${days} days after it is issued` : null);

/** The redeem sheet's line: "900 points will be deducted. New balance: 340." */
export function deductionLine(cost: number, balance: number): string {
  return `${cost.toLocaleString("en-US")} points will be deducted. New balance: ${Math.max(0, balance - cost).toLocaleString("en-US")}.`;
}

/** "You need 1,760 more points". */
export const needMoreLine = (cost: number, balance: number): string => `You need ${Math.max(0, cost - balance).toLocaleString("en-US")} more points`;

// ---------------------------------------------------------------------------
// redeem_offer errors (api.md: insufficient_points, offer_not_active,
// sold_out, limit_reached). The ATX codes aren't documented yet (DB2), so the
// error name is looked for in the code, message, details and hint.

export type RedeemError = "insufficient_points" | "offer_not_active" | "sold_out" | "limit_reached";

export function redeemErrorOf(e: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null }): RedeemError | null {
  const hay = [e.code, e.message, e.details, e.hint].filter(Boolean).join(" ").toLowerCase();
  for (const k of ["insufficient_points", "offer_not_active", "sold_out", "limit_reached"] as const) if (hay.includes(k)) return k;
  return null;
}

/** Our words for each refusal (not drawn on the board). */
export const REDEEM_ERROR_TEXT: Record<RedeemError, string> = {
  insufficient_points: "You don't have enough points for this reward yet.",
  offer_not_active: "This offer isn't available any more.",
  sold_out: "This offer has run out.",
  limit_reached: "You've already redeemed this offer.",
};

// ---------------------------------------------------------------------------
// public_showcase (DB3): the offers part only; the rest of the showcase is
// read live (business_profiles, business_offerings, gyms).

export function parseShowcaseOffers(data: unknown): CatalogOffer[] {
  const r = rows(data)[0];
  if (!r) return [];
  return parseCatalog(Array.isArray(r.offers) ? r.offers : []);
}
