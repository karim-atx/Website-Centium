// Market + Share 3.0 · W2 · client vouchers, pure (C-MO.4.4.4 Voucher,
// C-MO.4.6 My rewards). The member SELECTs `vouchers` (vouchers_select_own).
// A voucher is a receipt (Database PR #40, 20261215000000): the offer's
// title, owner and where-used are copied onto the row as it is issued
// (offer_title, offer_owner_kind, offer_business_id, offer_professional_id,
// offer_owner_name, offer_owner_subtype, offer_where_used, offer_online_url;
// every older voucher backfilled), so pausing, ending, hiding or renaming the
// offer afterwards changes nothing the member sees, and nothing here reads
// the offer. offer_owner_subtype (20261215000000 as amended by ebe72d6) is the
// professional's type at issue, the enum: the services pass typeLabel, so a
// professional's owner line reads "Rami · Coach or instructor" even after
// they unlist. Status is the voucher_status enum: issued | used | expired |
// void.

import { formatShortDate } from "../../utils/date";
import { rows, str } from "../market/parse";
import { t, tk, tn } from "../../i18n/core";
import { whereOf, type SubtypeLabel } from "../offers/offersModel";

export type VoucherStatus = "issued" | "used" | "expired" | "void";

/** The voucher read: the row and its own snapshot of the offer it was bought from. */
export const VOUCHER_SELECT =
  "id,offer_id,code,status,points_paid,issued_at,expires_at,used_at,offer_title,offer_owner_kind,offer_business_id,offer_professional_id,offer_owner_name,offer_owner_subtype,offer_where_used,offer_online_url";

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
  /** The offer's title when the voucher was issued (offer_title). */
  offerHeadline: string;
  ownerType: "business" | "professional";
  ownerId: string | null;
  /** The business name, or the professional's first name, at issue (offer_owner_name). */
  ownerName: string;
  /**
   * The owner line: the business name, or "{first name} · {type}" for a
   * professional (offer_owner_subtype through typeLabel); the first name
   * alone when the subtype is null.
   */
  ownerSubtitle: string;
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

/** A vouchers row (redeem_offer's answer, or the member's table read); `label` is typeLabel (the service passes it). */
export function parseVoucherRow(r: unknown, label: SubtypeLabel = () => null): Voucher | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const id = str(o.id);
  const code = str(o.code);
  const expiresAt = str(o.expires_at);
  if (!id || !code || !expiresAt) return null;
  const s = str(o.status);
  const ownerType = o.offer_owner_kind === "professional" ? "professional" : "business";
  const points = typeof o.points_paid === "number" ? o.points_paid : null;
  const ownerName = str(o.offer_owner_name) ?? "";
  const sub = ownerType === "professional" ? str(o.offer_owner_subtype) : null;
  const type = sub ? label(sub) : null;
  return {
    id,
    code,
    qrPayload: code,
    offerId: str(o.offer_id),
    offerHeadline: str(o.offer_title) ?? "",
    ownerType,
    ownerId: str(ownerType === "professional" ? o.offer_professional_id : o.offer_business_id),
    ownerName,
    ownerSubtitle: type && ownerName ? `${ownerName} · ${type}` : ownerName,
    where: whereOf(o.offer_where_used, ownerType),
    onlineUrl: ownerType === "business" ? str(o.offer_online_url) : null,
    pointsPaid: points,
    expiresAt,
    status: STATUSES.includes(s as VoucherStatus) ? (s as VoucherStatus) : "issued",
    usedAt: str(o.used_at),
  };
}

export const parseVouchers = (data: unknown, label: SubtypeLabel = () => null): Voucher[] =>
  rows(data).flatMap((r) => {
    const v = parseVoucherRow(r, label);
    return v ? [v] : [];
  });

/** The status a voucher shows now: an issued voucher past its expiry reads as expired (nothing flips the column). */
export function liveStatus(v: Pick<Voucher, "status" | "expiresAt">, now: Date = new Date()): VoucherStatus {
  if (v.status === "issued" && new Date(v.expiresAt).getTime() <= now.getTime()) return "expired";
  return v.status;
}

export type VoucherTab = "active" | "used" | "expired";

export const VOUCHER_TABS: readonly { key: VoucherTab; label: string }[] = [
  { key: "active", label: tk("Active") },
  { key: "used", label: tk("Used") },
  { key: "expired", label: tk("Expired") },
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
  if (s === "used") return { meta: v.usedAt ? t("Used on {date}", { date: date(v.usedAt) }) : t("Used"), stub: t("Used"), tone: "muted" };
  if (s === "void") return { meta: t("Cancelled · points refunded"), stub: t("Void"), tone: "muted" };
  if (s === "expired") return { meta: t("Expired on {date}", { date: date(v.expiresAt) }), stub: t("Expired"), tone: "muted" };
  const left = daysLeft(v.expiresAt, now);
  const meta = t("Valid until {date}", { date: date(v.expiresAt) });
  if (left <= 7) return { meta, stub: left <= 0 ? t("Today") : tn(left, "{n} day", "{n} days"), tone: "pale" };
  return { meta, stub: t("Active"), tone: "teal" };
}

/**
 * "How to use" (C-MO.4.4.4): "In store: show this screen at the counter." and
 * "Online: enter the code at checkout on {site}." by where it's valid; in
 * person (a professional) "Show this screen at your session."
 */
export function howToUse(where: string | null, onlineUrl: string | null): string[] {
  const site = onlineUrl ? onlineUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  const online = site ? t("Online: enter the code at checkout on {site}.", { site }) : t("Online: enter the code at checkout.");
  if (where === "in_person") return [t("Show this screen at your session.")];
  if (where === "online") return [online];
  if (where === "in_store") return [t("In store: show this screen at the counter.")];
  return [t("In store: show this screen at the counter."), online];
}
