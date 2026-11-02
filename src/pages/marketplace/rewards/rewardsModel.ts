// Market + Share 3.0 · W2 · pure rules for the Rewards screens (C-MO.4.4
// Rewards, C-MO.4.4.1 Showcase, C-MO.4.4.2 Offer detail, C-MO.4.4.3 Redeem).
// No Supabase import, so node:test covers it (rewardsModel.test.ts).

import { distanceKm, type Coords } from "../../../services/geo/distance";
import { distanceText } from "../../../services/marketplace/classBooking";
import { toProduct, type Row } from "../../../services/store/mapping";
import type { Product } from "../../../services/store/types";
import { t, tk, tx } from "../../../i18n/core";
import {
  REDEEM_ERROR_TEXT,
  categoryOfType,
  limitLabel,
  needMoreLine,
  validRange,
  voucherExpiryLabel,
  whereLabel,
  type OfferDetail,
  type RewardCategory,
} from "../../../services/offers/offersModel";

// ---------------------------------------------------------------------------
// Rewards › business sections (D-21: the old Businesses tab's rows, so a
// business with no offers stays findable under its chip).

/**
 * The businesses a chip lists: All = every business, a category = the
 * businesses of its type (CATEGORY_TYPES), Professionals = none (the section
 * offers "Find a professional" instead).
 */
export function businessesForCategory<T extends { venueType: string }>(list: readonly T[], category: RewardCategory): T[] {
  if (category === "professionals") return [];
  if (category === "all") return [...list];
  return list.filter((b) => categoryOfType(b.venueType) === category);
}

// ---------------------------------------------------------------------------
// Showcase (C-MO.4.4.1)

/** The showcase's type line, the business_type enum in words: "clothing_store" → "Clothing Store" (the board's). */
const SHOWCASE_TYPES: Record<string, string> = {
  gym: tk("Gym"),
  studio: tk("Studio"),
  store: tk("Store"),
  supplement_store: tk("Supplement Store"),
  equipment_seller: tk("Equipment Seller"),
  wellness_service: tk("Wellness Service"),
  clothing_store: tk("Clothing Store"),
  meal_prep_service: tk("Meal Prep Service"),
};
export function showcaseTypeLabel(venueType: string): string {
  if (SHOWCASE_TYPES[venueType]) return t(SHOWCASE_TYPES[venueType]);
  return venueType
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** A website as the board writes it: "https://www.outlineactive.com/" → "outlineactive.com". */
export function websiteHost(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  const bare = u.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^www\./i, "");
  const host = bare.split(/[/?#]/)[0];
  return host || null;
}

/** An https link for the Online panel ("outlineactive.com" → "https://outlineactive.com"). */
export function websiteHref(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
  return `https://${u}`;
}

/** The nearest of a business's places to the device, as "1.4 km from you"; null without a position or coordinates. */
export function distanceLine(here: Coords | null, places: readonly { lat: number | null; lng: number | null }[]): string | null {
  if (!here) return null;
  const kms = places.filter((p) => p.lat !== null && p.lng !== null).map((p) => distanceKm(here, { lat: p.lat as number, lng: p.lng as number }));
  if (kms.length === 0) return null;
  const d = distanceText(Math.min(...kms));
  return d ? t("{distance} from you", { distance: d }) : null;
}

export type ShowcaseSegKey = "shop" | "loc" | "web";

export interface ShowcaseSegment {
  key: ShowcaseSegKey;
  label: string;
  /** segmentSteps: Shop 1, Location 2, Online 4 (the board's SEGS). */
  step: 1 | 2 | 4;
  /** The panel: the value 14 / 700 and the line 12 / 17. */
  value: string;
  line: string | null;
  /** The Online panel's link. */
  href?: string;
}

/**
 * Shop · Location · Online (the board's SEGS), from what the business has:
 * - Shop is always there. With a website it is the board's "In store and
 *   online" / "Vouchers work at the counter and at online checkout."; without
 *   one only the counter is true, so "In store" / "Vouchers work at the
 *   counter." (ours);
 * - Location: business_profiles.location, with the device distance to the
 *   nearest of its places when known. Hidden without a location;
 * - Online: business_profiles.public_website as its host, "Enter your voucher
 *   code at checkout." Hidden without a website.
 */
export function showcaseSegments(p: { website: string | null; location: string | null; distance: string | null }): ShowcaseSegment[] {
  const host = websiteHost(p.website);
  const out: ShowcaseSegment[] = [
    host
      ? { key: "shop", label: t("Shop"), step: 1, value: t("In store and online"), line: t("Vouchers work at the counter and at online checkout.") }
      : { key: "shop", label: t("Shop"), step: 1, value: t("In store"), line: t("Vouchers work at the counter.") },
  ];
  const loc = p.location?.trim();
  if (loc) out.push({ key: "loc", label: t("Location"), step: 2, value: loc, line: p.distance });
  if (host) out.push({ key: "web", label: tx("Online", "shop"), step: 4, value: host, line: t("Enter your voucher code at checkout."), href: websiteHref(p.website) ?? undefined });
  return out;
}

/** The Products header's note: the board's "Display prices. Buy in store or online.", or "… Buy in store." without a website (ours). */
export const productsNote = (website: string | null): string => (websiteHost(website) ? t("Display prices. Buy in store or online.") : t("Display prices. Buy in store."));

// ---------------------------------------------------------------------------
// Offer detail (C-MO.4.4.2 `offerRows` / `offer.cells`)

export interface OfferCell {
  key: string;
  value: string;
  /** 0..3: the cell's step tint / icon (#EEEAF8/#7D67D9, #ECEFF5/#667BB1, #EBF2F4/#5A859E, #E6F1EF/#4F8F8A). */
  i: 0 | 1 | 2 | 3;
}

/**
 * Valid · Where to use · Limit · Voucher expires, as offersModel words them.
 * A value the server leaves out reads (ours): "While it lasts", "See terms",
 * "No limit"; the voucher line is D-24's 90 days, or "Until {the offer's end}"
 * when the offer ends first (redeem_offer caps expires_at there).
 */
export function offerCells(d: Pick<OfferDetail, "startsOn" | "endsOn" | "where" | "perMemberLimit" | "voucherDays" | "voucherCappedOn">): OfferCell[] {
  return [
    // `key` is the English label (shown through t()); the values are already words.
    { key: tk("Valid"), value: validRange(d.startsOn, d.endsOn) ?? t("While it lasts"), i: 0 },
    { key: tk("Where to use"), value: whereLabel(d.where) ?? t("See terms"), i: 1 },
    { key: tk("Limit"), value: limitLabel(d.perMemberLimit) ?? t("No limit"), i: 2 },
    { key: tk("Voucher expires"), value: voucherExpiryLabel(d.voucherDays, d.voucherCappedOn), i: 3 },
  ];
}

/**
 * Whether the pinned Redeem can be used, and the line above it when not:
 * short of points → "You need 1,760 more points" (the board's offerLocked);
 * nothing left under the cap, or the member's limit used → the refusal's
 * words (REDEEM_ERROR_TEXT), so the button never leads to a sure refusal.
 */
export function redeemGate(d: Pick<OfferDetail, "pointsCost" | "quantityLeft" | "limitLeft">, balance: number): { locked: boolean; line: string | null } {
  if (d.quantityLeft !== null && d.quantityLeft <= 0) return { locked: true, line: REDEEM_ERROR_TEXT.sold_out };
  if (d.limitLeft !== null && d.limitLeft <= 0) return { locked: true, line: REDEEM_ERROR_TEXT.limit_reached };
  if (balance < d.pointsCost) return { locked: true, line: needMoreLine(d.pointsCost, balance) };
  return { locked: false, line: null };
}

/** One request id per open redeem sheet (redeem_offer ⟳): a retry reuses it, a new opening makes a new one. */
export function newRequestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback (old browsers): an RFC 4122 v4 shape from Math.random.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 3) | 8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// C-MO.4.4.1 Products: public_showcase rows (Database 73ea87b) as products.

/** public_showcase's rows (id, title, description, category, price, image_url, format, duration_label, bookable, sort), in the reader's order. */
export const parseShelf = (data: unknown): Product[] => (Array.isArray(data) ? (data as Row[]) : []).filter((r) => r && typeof r === "object" && r.id).map((r) => toProduct(r));
