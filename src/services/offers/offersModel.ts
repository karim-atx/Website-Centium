// Market + Share 3.0 · W2 · point offers for clients, pure (C-MO.4.4 Rewards,
// C-MO.4.4.1 Showcase offers, C-MO.4.4.2 Offer detail, C-MO.4.4.3 Redeem).
// Every member read is a server reader that applies offer_is_live() (the
// redemption gate's own rule), so no live rule runs here:
// - offer_catalogue(p_category, p_limit, p_offset) (Database PR #40,
//   20261215010000): every live offer, cheapest first, with its owner card
//   (name, professional subtype, logo); an unlisted professional's offers
//   are not listed (parseCatalogue);
// - offer_detail(p_offer_id): one live offer with quantity_left, the
//   caller's own limit_left and the voucher's expiry from
//   voucher_expiry_for() (parseOfferDetail); no row = not available;
// - public_offers(p_owner_kind, p_owner_id) (PR #39): one owner's page
//   (parsePublicOffers).
// The supplement rule for under-18s (and no date of birth, lead Q3) is the
// SERVER'S since Database PR #40 20261215040000: offer_catalogue leaves the
// offers out, offer_detail answers no row and redeem_offer refuses with ATX11
// for anyone user_is_confirmed_adult() doesn't confirm (no date of birth is
// not a yes). forAge stays as a second guard (Karim, #40) on every list and
// on the detail page. public_offers (an owner's page) has no age rule, so
// there forAge is the only guard (Database gap).

import { formatShortDate } from "../../utils/date";
import { num, rows, str } from "../market/parse";
import { appLocale } from "../../i18n/format";

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
// offer rows

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
  /** Round F (AB3, 20261226040000): offer_catalogue / offer_detail is_own_business, the caller's own business's offer (redeem_offer refuses it, ATXV3). */
  isOwnBusiness?: boolean;
}

/** The date part of an ISO date or timestamp. */
export const ymdOf = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

/** The client's word for a professional subtype ("Personal trainer"); the service passes typeLabel. */
export type SubtypeLabel = (subtype: string) => string | null;

/**
 * The owner card of an offer_catalogue / offer_detail row: owner_type,
 * owner_id, owner_name (the business name or the professional's first name),
 * owner_professional_subtype, owner_logo_url.
 */
function ownerOf(r: Record<string, unknown>, label: SubtypeLabel): Pick<CatalogOffer, "ownerType" | "ownerId" | "ownerName" | "ownerSubtitle" | "ownerLogoUrl"> {
  const name = str(r.owner_name) ?? "";
  if (r.owner_type === "professional") {
    const sub = str(r.owner_professional_subtype);
    const type = sub ? label(sub) : null;
    return { ownerType: "professional", ownerId: str(r.owner_id) ?? "", ownerName: name, ownerSubtitle: type && name ? `${name} · ${type}` : name, ownerLogoUrl: null };
  }
  return { ownerType: "business", ownerId: str(r.owner_id) ?? "", ownerName: name, ownerSubtitle: name, ownerLogoUrl: str(r.owner_logo_url) };
}

function parseCard(r: Record<string, unknown>, label: SubtypeLabel): CatalogOffer | null {
  const offerId = str(r.offer_id);
  const headline = str(r.headline);
  const cost = num(r.points_cost);
  if (!offerId || !headline || cost === null) return null;
  return { offerId, headline, category: str(r.category) ?? "", ...ownerOf(r, label), pointsCost: cost, endsOn: ymdOf(r.ends_on), ...(r.is_own_business === true ? { isOwnBusiness: true } : {}) };
}

/** offer_catalogue rows, in the server's order (points_cost, then id). */
export function parseCatalogue(data: unknown, label: SubtypeLabel = () => null): CatalogOffer[] {
  return rows(data).flatMap((r) => {
    const o = parseCard(r, label);
    return o ? [o] : [];
  });
}

/**
 * public_offers(p_owner_kind, p_owner_id) rows (id, title, kind, value,
 * points_cost, where_used, terms, starts_on, ends_on, per_member_limit,
 * quantity_cap, redeemed_count, category) as cards of the owner the page
 * already shows: live by the server's rule (offer_is_live), in its order
 * (points_cost, created_at desc, id). No owner columns come back, so the
 * owner's name stays the page's own.
 */
export function parsePublicOffers(data: unknown, ownerType: "business" | "professional", ownerId: string): CatalogOffer[] {
  return rows(data).flatMap((r) => {
    const offerId = str(r.id);
    const headline = str(r.title);
    const cost = num(r.points_cost);
    if (!offerId || !headline || cost === null) return [];
    return [{ offerId, headline, category: str(r.category) ?? "", ownerType, ownerId, ownerName: "", ownerSubtitle: "", ownerLogoUrl: null, pointsCost: cost, endsOn: ymdOf(r.ends_on) }];
  });
}

/**
 * No supplement offers for under-18s (Karim; lead Q3: no date of birth counts
 * as under 18 here). The server applies the same rule at the shelf
 * (offer_catalogue), the detail (offer_detail: no row) and the till
 * (redeem_offer: ATX11) since Database PR #40 (user_is_confirmed_adult, so an
 * unknown date of birth is refused there too); this is the app's SECOND GUARD
 * (Karim, #40), kept on every list and on the detail page, and the only one
 * on an owner's page (public_offers has no age rule).
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
  /** offer_detail quantity_left (cap − redeemed); null = no cap. */
  quantityLeft: number | null;
  /** offer_detail limit_left (per_member_limit − the caller's own redemptions); null = no limit. */
  limitLeft: number | null;
  /** D-24: 90 days from issue, capped at the offer's end (voucher_days, from voucher_expiry_for). */
  voucherDays: number;
  /** The offer's last day when that cap applies (voucher_capped_on). */
  voucherCappedOn: string | null;
  /** The business's website, for "Online: enter the code at checkout on …". */
  onlineUrl: string | null;
}

export const VOUCHER_DAYS = 90;

/** One offer_detail row, or null (no row: the offer is gone, paused, unfunded, ended, or its owner stopped). */
export function parseOfferDetail(data: unknown, label: SubtypeLabel = () => null): OfferDetail | null {
  const r = rows(data)[0];
  if (!r) return null;
  const base = parseCard(r, label);
  if (!base) return null;
  return {
    ...base,
    terms: str(r.terms),
    where: whereOf(r.where_used, base.ownerType),
    startsOn: ymdOf(r.starts_on),
    perMemberLimit: num(r.per_member_limit),
    quantityLeft: num(r.quantity_left),
    limitLeft: num(r.limit_left),
    voucherDays: num(r.voucher_days) ?? VOUCHER_DAYS,
    voucherCappedOn: ymdOf(r.voucher_capped_on),
    onlineUrl: base.ownerType === "business" ? str(r.online_url) : null,
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
  return `${cost.toLocaleString(appLocale("en-US"))} points will be deducted. New balance: ${Math.max(0, balance - cost).toLocaleString(appLocale("en-US"))}.`;
}

/** "You need 1,760 more points". */
export const needMoreLine = (cost: number, balance: number): string => `You need ${Math.max(0, cost - balance).toLocaleString(appLocale("en-US"))} more points`;

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

