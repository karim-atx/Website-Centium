// Market + Share 3.0 · W2 · client vouchers, pure (C-MO.4.4.4 Voucher,
// C-MO.4.6 My rewards). Row shape: PLAN §2.2 DB2 my_vouchers / redeem_offer
// (code, qr_payload, offer headline, owner name, where, valid until, status,
// used_at); re-check the names when DB2 lands.

import { formatShortDate } from "../../utils/date";
import { rows, str } from "../market/parse";

export type VoucherStatus = "issued" | "used" | "expired";

export interface Voucher {
  id: string;
  code: string;
  qrPayload: string;
  offerId: string | null;
  offerHeadline: string;
  ownerType: "business" | "professional";
  ownerId: string | null;
  ownerName: string;
  /** in_store | online | both | in_person */
  where: string | null;
  /** The owner's online shop, for the "Online: …" how-to line. */
  onlineUrl: string | null;
  /** ISO date-time the voucher expires (D-24: 90 days, capped at the offer's end). */
  expiresAt: string;
  status: VoucherStatus;
  usedAt: string | null;
}

export function parseVoucher(r: unknown): Voucher | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const id = str(o.id) ?? str(o.voucher_id);
  const code = str(o.code);
  const expiresAt = str(o.expires_at) ?? str(o.valid_until);
  if (!id || !code || !expiresAt) return null;
  const s = str(o.status);
  return {
    id,
    code,
    qrPayload: str(o.qr_payload) ?? code,
    offerId: str(o.offer_id),
    offerHeadline: str(o.offer_headline) ?? str(o.headline) ?? "",
    ownerType: o.owner_type === "professional" ? "professional" : "business",
    ownerId: str(o.owner_id),
    ownerName: str(o.owner_name) ?? "",
    where: str(o.where_used) ?? str(o.where),
    onlineUrl: str(o.online_url),
    expiresAt,
    status: s === "used" ? "used" : s === "expired" ? "expired" : "issued",
    usedAt: str(o.used_at),
  };
}

export const parseVouchers = (data: unknown): Voucher[] => rows(data).flatMap((r) => (parseVoucher(r) ? [parseVoucher(r) as Voucher] : []));

/** The status a voucher shows now: an issued voucher past its expiry reads as expired before the nightly job flips it. */
export function liveStatus(v: Pick<Voucher, "status" | "expiresAt">, now: Date = new Date()): VoucherStatus {
  if (v.status === "issued" && new Date(v.expiresAt).getTime() < now.getTime()) return "expired";
  return v.status;
}

export type VoucherTab = "active" | "used" | "expired";

export const VOUCHER_TABS: readonly { key: VoucherTab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "used", label: "Used" },
  { key: "expired", label: "Expired" },
];

export const tabOf = (s: VoucherStatus): VoucherTab => (s === "issued" ? "active" : s);

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
 * expired "Expired on …" with a muted stub.
 */
export function voucherRow(v: Voucher, now: Date = new Date()): { meta: string; stub: string; tone: "teal" | "pale" | "muted" } {
  const s = liveStatus(v, now);
  if (s === "used") return { meta: v.usedAt ? `Used on ${date(v.usedAt)}` : "Used", stub: "Used", tone: "muted" };
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
