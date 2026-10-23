// Market + Share 3.0 · W2 · client vouchers, pure (C-MO.4.4.4 Voucher,
// C-MO.4.6 My rewards). DB2 (Database 33c0bf5, 20261210800000): there is no
// my_vouchers function; the member SELECTs `vouchers` (vouchers_select_own)
// with the offer embedded through vouchers.offer_id. The embed is the
// `offers` table under ITS policy, so once an offer is paused, hidden or past
// its end the member can no longer read it: the voucher keeps its code,
// status and dates but loses the offer's title and owner (a Database gap,
// reported; the row then reads "Reward"). Status is the voucher_status enum:
// issued | used | expired | void.

import { formatShortDate } from "../../utils/date";
import { rows, str } from "../market/parse";
import { embedded, offerOwner, whereOf, type ProName } from "../offers/offersModel";

export type VoucherStatus = "issued" | "used" | "expired" | "void";

/** The voucher read: the row and its offer (+ the business) where the member can still read it. */
export const VOUCHER_SELECT =
  "id,offer_id,code,status,points_paid,issued_at,expires_at,used_at,offer:offers(title,owner_kind,business_id,professional_id,where_used,business:business_profiles(business_name,logo_url,public_website))";

export interface Voucher {
  id: string;
  code: string;
  /**
   * What the QR carries: the code. check_voucher(p_code) is the only desk
   * reader, and it matches the code; vouchers.qr_token has no reader yet
   * (Database gap), so a QR of the token couldn't be checked.
   */
  qrPayload: string;
  offerId: string | null;
  /** The offer's title; "Reward" when the offer is no longer readable. */
  offerHeadline: string;
  ownerType: "business" | "professional";
  ownerId: string | null;
  ownerName: string;
  /** in_store | online | both | in_person */
  where: string | null;
  /** The business's website, for the "Online: …" how-to line. */
  onlineUrl: string | null;
  pointsPaid: number | null;
  /** ISO date-time the voucher expires (D-24: 90 days, capped at the offer's end). */
  expiresAt: string;
  status: VoucherStatus;
  usedAt: string | null;
}

const STATUSES: readonly VoucherStatus[] = ["issued", "used", "expired", "void"];

/** A vouchers row (redeem_offer's answer, or the table read with its offer embed). */
export function parseVoucherRow(r: unknown, pros: ReadonlyMap<string, ProName> = new Map()): Voucher | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const id = str(o.id);
  const code = str(o.code);
  const expiresAt = str(o.expires_at);
  if (!id || !code || !expiresAt) return null;
  const s = str(o.status);
  const offer = embedded(o.offer);
  const owner = offer ? offerOwner(offer, pros) : null;
  const points = typeof o.points_paid === "number" ? o.points_paid : null;
  return {
    id,
    code,
    qrPayload: code,
    offerId: str(o.offer_id),
    offerHeadline: str(offer?.title) ?? "Reward",
    ownerType: owner?.ownerType ?? "business",
    ownerId: owner?.ownerId || null,
    ownerName: owner ? (owner.ownerType === "professional" ? owner.ownerSubtitle : owner.ownerName) : "",
    where: offer && owner ? whereOf(offer.where_used, owner.ownerType) : null,
    onlineUrl: owner?.ownerType === "business" ? str(embedded(offer?.business)?.public_website) : null,
    pointsPaid: points,
    expiresAt,
    status: STATUSES.includes(s as VoucherStatus) ? (s as VoucherStatus) : "issued",
    usedAt: str(o.used_at),
  };
}

export const parseVouchers = (data: unknown, pros: ReadonlyMap<string, ProName> = new Map()): Voucher[] =>
  rows(data).flatMap((r) => {
    const v = parseVoucherRow(r, pros);
    return v ? [v] : [];
  });

/** The professional owners a set of voucher rows needs names for. */
export const voucherProfessionalIds = (data: unknown): string[] => [
  ...new Set(
    rows(data).flatMap((r) => {
      const o = embedded(r.offer);
      return o && o.owner_kind === "professional" && str(o.professional_id) ? [str(o.professional_id) as string] : [];
    })
  ),
];

/** The status a voucher shows now: an issued voucher past its expiry reads as expired (nothing flips the column). */
export function liveStatus(v: Pick<Voucher, "status" | "expiresAt">, now: Date = new Date()): VoucherStatus {
  if (v.status === "issued" && new Date(v.expiresAt).getTime() <= now.getTime()) return "expired";
  return v.status;
}

export type VoucherTab = "active" | "used" | "expired";

export const VOUCHER_TABS: readonly { key: VoucherTab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "used", label: "Used" },
  { key: "expired", label: "Expired" },
];

/** A void voucher (cancelled and refunded by Centium) sits with the expired ones. */
export const tabOf = (s: VoucherStatus): VoucherTab => (s === "issued" ? "active" : s === "used" ? "used" : "expired");

const date = (iso: string) => formatShortDate(new Date(iso), { month: "short", day: "numeric", year: "numeric" });

/** Whole days until `iso` (0 = today). */
export function daysLeft(iso: string, now: Date = new Date()): number {
  const end = new Date(iso);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

/**
 * The My rewards row (C-MO.4.6 `stub`): the meta line and the 46 stub.
 * Active: "Valid until Jan 15, 2027", stub "Active" (teal); a week or less
 * left: stub "3 days" (pale, the board's soon state); used "Used on …" and
 * expired "Expired on …" with a muted stub; void (ours) "Cancelled · points
 * refunded", stub "Void".
 */
export function voucherRow(v: Voucher, now: Date = new Date()): { meta: string; stub: string; tone: "teal" | "pale" | "muted" } {
  const s = liveStatus(v, now);
  if (s === "used") return { meta: v.usedAt ? `Used on ${date(v.usedAt)}` : "Used", stub: "Used", tone: "muted" };
  if (s === "void") return { meta: "Cancelled · points refunded", stub: "Void", tone: "muted" };
  if (s === "expired") return { meta: `Expired on ${date(v.expiresAt)}`, stub: "Expired", tone: "muted" };
  const left = daysLeft(v.expiresAt, now);
  const meta = `Valid until ${date(v.expiresAt)}`;
  if (left <= 7) return { meta, stub: left <= 0 ? "Today" : `${left} ${left === 1 ? "day" : "days"}`, tone: "pale" };
  return { meta, stub: "Active", tone: "teal" };
}

/**
 * "How to use" (C-MO.4.4.4): "In store: show this screen at the counter." and
 * "Online: enter the code at checkout on {site}." by where it's valid; in
 * person (a professional) "Show this screen at your session."
 */
export function howToUse(where: string | null, onlineUrl: string | null): string[] {
  const site = onlineUrl ? onlineUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  const online = site ? `Online: enter the code at checkout on ${site}.` : "Online: enter the code at checkout.";
  if (where === "in_person") return ["Show this screen at your session."];
  if (where === "online") return [online];
  if (where === "in_store") return ["In store: show this screen at the counter."];
  return ["In store: show this screen at the counter.", online];
}
