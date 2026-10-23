// Market + Share 3.0 · W2 · point offers for clients, pure (C-MO.4.4 Rewards,
// C-MO.4.4.1 Showcase offers, C-MO.4.4.2 Offer detail, C-MO.4.4.3 Redeem).
// DB2 (Database 33c0bf5, 20261210800000; HANDOVER_API "Release 1 · Offers,
// vouchers, redemption"): there is no reward_catalog or offer_detail
// function. A signed-in member SELECTs the `offers` table under its RLS
// (offers_select_live: not paused, not hidden, inside its dates; plus every
// offer the caller owns, whatever its state). That policy does NOT check
// funding_ack_at or whether the business still takes new business, which
// offer_is_live() (the redemption gate) does, so the client applies the same
// live rule to every row it lists. quantity_left and limit_left are derived
// here as the contract defines them (not stored). The owner card is embedded
// from business_profiles (public while active); a professional's name comes
// from public_professional_directory.

import { formatShortDate } from "../../utils/date";
import { num, rows, str } from "../market/parse";

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

/** offers.category (offering_category) for a chip: null for All (gym, class and store offers show under All only, D-21). */
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
// offers rows

/** The columns every client offer read asks for (the business embedded through offers.business_id). */
export const OFFER_SELECT =
  "id,owner_kind,business_id,professional_id,title,category,points_cost,quantity_cap,per_member_limit,starts_on,ends_on,where_used,terms,paused_at,hidden_at,funding_ack_at,redeemed_count,business:business_profiles(business_name,logo_url,public_website)";

/** A professional's public name and type, from public_professional_directory. */
export interface ProName {
  first: string;
  /** "Personal trainer" (typeLabel), or null. */
  type: string | null;
}

export interface CatalogOffer {
  offerId: string;
  headline: string;
  /** offers.category (offering_category). */
  category: string;
  ownerType: "business" | "professional";
  ownerId: string;
  ownerName: string;
  /** "Rana · Personal trainer" for a professional; the business name otherwise. */
  ownerSubtitle: string;
  ownerLogoUrl: string | null;
  pointsCost: number;
  endsOn: string | null;
}

/** The date part of an ISO date or timestamp. */
export const ymdOf = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

/** A PostgREST to-one embed (an object, or a one-row array). */
export const embedded = (v: unknown): Record<string, unknown> | null => (Array.isArray(v) ? (rows(v)[0] ?? null) : v && typeof v === "object" ? (v as Record<string, unknown>) : null);

/**
 * offer_is_live() as far as the row shows it: acknowledged, not paused, not
 * hidden, started, not ended (`today` YYYY-MM-DD). A business offer also
 * needs its business row (business_profiles is readable only while active).
 */
export function offerRowIsLive(r: Record<string, unknown>, today: string): boolean {
  if (str(r.paused_at) || str(r.hidden_at) || !str(r.funding_ack_at)) return false;
  const start = ymdOf(r.starts_on);
  const end = ymdOf(r.ends_on);
  if (!start || start > today) return false;
  if (end && end < today) return false;
  if (r.owner_kind !== "professional" && !embedded(r.business)) return false;
  return true;
}

/** The owner card of an offer row (business embed, or the directory name). */
export function offerOwner(r: Record<string, unknown>, pros: ReadonlyMap<string, ProName>): Pick<CatalogOffer, "ownerType" | "ownerId" | "ownerName" | "ownerSubtitle" | "ownerLogoUrl"> {
  if (r.owner_kind === "professional") {
    const ownerId = str(r.professional_id) ?? "";
    const p = pros.get(ownerId);
    // Not in the directory (unlisted): the kind of owner only (ours).
    return { ownerType: "professional", ownerId, ownerName: p?.first ?? "", ownerSubtitle: p ? (p.type ? `${p.first} · ${p.type}` : p.first) : "Professional", ownerLogoUrl: null };
  }
  const biz = embedded(r.business);
  const name = str(biz?.business_name) ?? "";
  return { ownerType: "business", ownerId: str(r.business_id) ?? "", ownerName: name, ownerSubtitle: name, ownerLogoUrl: str(biz?.logo_url) };
}

/** A live offer row → the client card, or null (not live, or a required column missing). */
export function parseOfferRow(r: Record<string, unknown>, today: string, pros: ReadonlyMap<string, ProName> = new Map()): CatalogOffer | null {
  const offerId = str(r.id);
  const headline = str(r.title);
  const cost = num(r.points_cost);
  if (!offerId || !headline || cost === null || !offerRowIsLive(r, today)) return null;
  return { offerId, headline, category: str(r.category) ?? "", ...offerOwner(r, pros), pointsCost: cost, endsOn: ymdOf(r.ends_on) };
}

/** The catalogue: the live rows, in the read's order (points_cost, then id). */
export function parseCatalog(data: unknown, today: string, pros: ReadonlyMap<string, ProName> = new Map()): CatalogOffer[] {
  return rows(data).flatMap((r) => {
    const o = parseOfferRow(r, today, pros);
    return o ? [o] : [];
  });
}

/** The professional owners a set of offer rows needs names for. */
export const professionalIds = (data: unknown): string[] => [
  ...new Set(rows(data).flatMap((r) => (r.owner_kind === "professional" && str(r.professional_id) ? [str(r.professional_id) as string] : []))),
];

/**
 * No supplement offers for under-18s (Karim; lead Q3: no date of birth counts
 * as under 18 here). redeem_offer is the gate (ATX11, and it reads an unknown
 * date of birth as an adult); hiding them from the lists is the courtesy.
 */
export function forAge<T extends { category: string }>(list: readonly T[], adult: boolean): T[] {
  return adult ? [...list] : list.filter((o) => o.category !== "supplements");
}

export type RewardSort = "featured" | "lowest" | "highest";

export const REWARD_SORTS: readonly { key: RewardSort; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "lowest", label: "Fewest points" },
  { key: "highest", label: "Most points" },
];

/**
 * The list as shown. "Featured" (D-22): redeemable first, then the read's
 * order (cost ascending); the other sorts are by cost. "Affordable now" keeps
 * only what the balance reaches (the board's toggle, `can`).
 */
export function arrangeOffers(list: readonly CatalogOffer[], sort: RewardSort, affordableOnly: boolean, balance: number): CatalogOffer[] {
  const can = (o: CatalogOffer) => o.pointsCost <= balance;
  const shown = affordableOnly ? list.filter(can) : [...list];
  if (sort === "featured") shown.sort((a, b) => Number(can(b)) - Number(can(a)));
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
// Offer detail

export type OfferWhere = "in_store" | "online" | "both" | "in_person";

/**
 * offers.where_used is in_person | online | both. For a business "in person"
 * is the counter, which the board words "In store"; a professional keeps "In
 * person".
 */
export function whereOf(whereUsed: unknown, ownerType: "business" | "professional"): OfferWhere | null {
  const w = str(whereUsed);
  if (w === "in_person") return ownerType === "business" ? "in_store" : "in_person";
  return w === "online" || w === "both" ? w : null;
}

export interface OfferDetail extends CatalogOffer {
  terms: string | null;
  where: OfferWhere | null;
  startsOn: string | null;
  perMemberLimit: number | null;
  /** quantity_cap − redeemed_count (derived, HANDOVER_API); null = no cap. */
  quantityLeft: number | null;
  /** per_member_limit − this member's redemptions (derived); null = not known. */
  limitLeft: number | null;
  /** D-24: 90 days from issue, capped at the offer's end. */
  voucherDays: number;
  /** The offer's last day when that cap applies (the voucher then runs until it). */
  voucherCappedOn: string | null;
  /** The business's website, for "Online: enter the code at checkout on …". */
  onlineUrl: string | null;
}

/** Whole calendar days from `a` to `b` (YYYY-MM-DD). */
function daysBetween(a: string, b: string): number {
  const t = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}

export const VOUCHER_DAYS = 90;

/**
 * One offer row (or null when it isn't live), with the member's own
 * redemption count for limit_left (null when it couldn't be read).
 */
export function parseOfferDetail(data: unknown, today: string, pros: ReadonlyMap<string, ProName> = new Map(), mine: number | null = null): OfferDetail | null {
  const r = rows(data)[0];
  if (!r) return null;
  const base = parseOfferRow(r, today, pros);
  if (!base) return null;
  const cap = num(r.quantity_cap);
  const limit = num(r.per_member_limit);
  const redeemed = num(r.redeemed_count) ?? 0;
  // redeem_offer: expires_at = least(now + 90 days, (ends_on + 1)::timestamptz).
  const capped = base.endsOn !== null && daysBetween(today, base.endsOn) + 1 < VOUCHER_DAYS;
  return {
    ...base,
    terms: str(r.terms),
    where: whereOf(r.where_used, base.ownerType),
    startsOn: ymdOf(r.starts_on),
    perMemberLimit: limit,
    quantityLeft: cap === null ? null : Math.max(0, cap - redeemed),
    limitLeft: limit === null || mine === null ? null : Math.max(0, limit - mine),
    voucherDays: capped && base.endsOn ? daysBetween(today, base.endsOn) + 1 : VOUCHER_DAYS,
    voucherCappedOn: capped ? base.endsOn : null,
    onlineUrl: base.ownerType === "business" ? str(embedded(r.business)?.public_website) : null,
  };
}

/** "Where to use" (`offerRows`): In store / Online / In store and online / In person. */
export function whereLabel(w: OfferWhere | null): string | null {
  return w === "in_store" ? "In store" : w === "online" ? "Online" : w === "both" ? "In store and online" : w === "in_person" ? "In person" : null;
}

const day = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);

/** "Dec 31, 2026". */
export const dayText = (iso: string): string => formatShortDate(day(iso), { month: "short", day: "numeric", year: "numeric" });

/** "Valid": "Oct 1 to Dec 31, 2026" (D-02; the board's "1 Oct to 31 Dec 2026"). */
export function validRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!endsOn) return null;
  const end = day(endsOn);
  const endText = dayText(endsOn);
  if (!startsOn) return `Until ${endText}`;
  const start = day(startsOn);
  const startText = formatShortDate(start, start.getFullYear() === end.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startText} to ${endText}`;
}

/** "1 per member". */
export const limitLabel = (n: number | null): string | null => (n && n > 0 ? `${n} per member` : null);

/** "90 days after it is issued", or "Until Dec 31, 2026" when the offer ends first (D-24). */
export const voucherExpiryLabel = (days: number, cappedOn: string | null = null): string => (cappedOn ? `Until ${dayText(cappedOn)}` : `${days} days after it is issued`);

/** The redeem sheet's line: "900 points will be deducted. New balance: 340." */
export function deductionLine(cost: number, balance: number): string {
  return `${cost.toLocaleString("en-US")} points will be deducted. New balance: ${Math.max(0, balance - cost).toLocaleString("en-US")}.`;
}

/** "You need 1,760 more points". */
export const needMoreLine = (cost: number, balance: number): string => `You need ${Math.max(0, cost - balance).toLocaleString("en-US")} more points`;

// ---------------------------------------------------------------------------
// redeem_offer refusals: HANDOVER_API "Offers, vouchers, redemption" and the
// function comment, by SQLSTATE. ATX02 is check_rate_limit's (20 an hour).

export type RedeemError = "offer_not_found" | "offer_not_active" | "not_available_to_minors" | "insufficient_points" | "sold_out" | "limit_reached" | "rate_limited";

const REDEEM_CODES: Record<string, RedeemError> = {
  ATX08: "offer_not_found",
  ATX10: "offer_not_active",
  ATX11: "not_available_to_minors",
  ATX12: "insufficient_points",
  ATX13: "sold_out",
  ATX14: "limit_reached",
  ATX02: "rate_limited",
};

export const redeemErrorOf = (e: { code?: string | null }): RedeemError | null => (e.code ? (REDEEM_CODES[e.code] ?? null) : null);

/** Our words for each refusal (not drawn on the board). */
export const REDEEM_ERROR_TEXT: Record<RedeemError, string> = {
  offer_not_found: "This offer isn't available any more.",
  offer_not_active: "This offer isn't available any more.",
  not_available_to_minors: "Supplement offers are for members 18 and over.",
  insufficient_points: "You don't have enough points for this reward yet.",
  sold_out: "This offer has run out.",
  limit_reached: "You've already redeemed this offer.",
  rate_limited: "Too many tries in a short time. Try again later.",
};

