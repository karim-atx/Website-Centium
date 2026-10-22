// Market + Share 3.0 · W3 · checking a voucher at the counter, pure (B-MA.4,
// P-MA.4; Business / Professional Marketplace Screens `R`, `scanCode`).
// Shapes: PLAN §2.2 DB2 check_voucher → {state: valid | already_used |
// expired | not_valid_here, offer_headline, member_first_name, used_at,
// used_by_first_name, expired_at, code} (+ the voucher id and valid-until a
// Mark as used needs), mark_voucher_used → the same with `used` on the first
// call and `already_used` on a repeat. Re-check the names when DB2 lands.

import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";
import { rows, str } from "../market/parse";

export type CheckVariant = "business" | "professional";
export type CheckState = "valid" | "already_used" | "expired" | "not_valid_here" | "used";

export interface VoucherCheck {
  state: CheckState;
  voucherId: string | null;
  code: string | null;
  offerHeadline: string;
  memberFirstName: string | null;
  /** valid: when the voucher stops working. */
  validUntil: string | null;
  usedAt: string | null;
  usedBy: string | null;
  expiredAt: string | null;
}

// ---------------------------------------------------------------------------
// Codes (D-24: XXXX-XXXX-XXXX, letters and digits)

export const CODE_LENGTH = 12;

/** Letters and digits only, upper case, at most 12. */
export function codeChars(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, CODE_LENGTH);
}

/** As typed in the Enter code field: upper case with the dashes put in ("OUTL-7K4P-2QX9"). */
export function formatCode(raw: string): string {
  const c = codeChars(raw);
  return [c.slice(0, 4), c.slice(4, 8), c.slice(8, 12)].filter(Boolean).join("-");
}

/** Check code is enabled once all 12 characters are in. */
export const codeComplete = (raw: string): boolean => codeChars(raw).length === CODE_LENGTH;

/**
 * What a camera read becomes: a printed code ("OUTL-7K4P-2QX9", any case,
 * with or without dashes) is checked as p_code; anything else (the signed QR
 * token) as p_qr_payload.
 */
export function scanInput(raw: string): { p_code: string } | { p_qr_payload: string } | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}$/.test(t)) return { p_code: formatCode(t) };
  return { p_qr_payload: t };
}

// ---------------------------------------------------------------------------
// Results

const STATES: readonly CheckState[] = ["valid", "already_used", "expired", "not_valid_here", "used"];

export function parseCheck(data: unknown): VoucherCheck | null {
  const r = rows(data)[0];
  if (!r) return null;
  const s = str(r.state);
  if (!STATES.includes(s as CheckState)) return null;
  return {
    state: s as CheckState,
    voucherId: str(r.voucher_id) ?? str(r.id),
    code: str(r.code),
    offerHeadline: str(r.offer_headline) ?? "",
    memberFirstName: str(r.member_first_name),
    validUntil: str(r.expires_at) ?? str(r.valid_until),
    usedAt: str(r.used_at),
    usedBy: str(r.used_by_first_name) ?? str(r.used_by),
    expiredAt: str(r.expired_at) ?? str(r.expires_at),
  };
}

/** A Mark as used answer, filling what the server leaves out from the check it followed. */
export function mergeMark(prev: VoucherCheck, data: unknown, now: Date = new Date()): VoucherCheck | null {
  const r = parseCheck(data);
  if (!r) return null;
  return {
    ...prev,
    state: r.state === "valid" ? "used" : r.state,
    voucherId: r.voucherId ?? prev.voucherId,
    offerHeadline: r.offerHeadline || prev.offerHeadline,
    memberFirstName: r.memberFirstName ?? prev.memberFirstName,
    usedAt: r.usedAt ?? (r.state === "used" ? now.toISOString() : prev.usedAt),
    usedBy: r.usedBy ?? prev.usedBy,
    expiredAt: r.expiredAt ?? prev.expiredAt,
  };
}

const dateOf = (iso: string) => formatShortDate(new Date(iso), { month: "short", day: "numeric", year: "numeric" });

/** "Oct 12, 2026 at 4:18 PM" (D-02 month first, D-03 12-hour). */
export function dateTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dateOf(iso)} at ${clock12(d)}`;
}

export interface CheckRow {
  k: string;
  v: string;
}

export interface CheckView {
  /** The 56 circle: good (check), caution / high (X). */
  tone: "good" | "caution" | "high";
  icon: "check" | "x";
  title: string;
  body: string;
  rows: CheckRow[];
  cta: "Mark as used" | "Scan another";
}

/**
 * The Voucher check sheet's content (`R`): Valid → Mark as used; Already used
 * (date, 12-hour time and, for a business, the staff first name); Expired;
 * Not valid here. `used` is ours: the success state after Mark as used.
 */
export function checkView(c: VoucherCheck, variant: CheckVariant): CheckView {
  const pro = variant === "professional";
  const who = pro ? "client" : "member";
  const offer = c.offerHeadline ? [{ k: "Offer", v: c.offerHeadline }] : [];
  switch (c.state) {
    case "valid":
      return {
        tone: "good",
        icon: "check",
        title: "Valid voucher",
        body: `Check the ${who}'s name, then mark the voucher as used.`,
        rows: [...offer, ...(c.memberFirstName ? [{ k: pro ? "Client" : "Member", v: c.memberFirstName }] : []), ...(c.validUntil ? [{ k: "Valid until", v: dateOf(c.validUntil) }] : [])],
        cta: "Mark as used",
      };
    case "used":
      return {
        tone: "good",
        icon: "check",
        title: "Voucher marked as used",
        body: c.usedAt ? `Marked as used on ${dateTimeLabel(c.usedAt)}.` : "Marked as used.",
        rows: [...offer, ...(c.memberFirstName ? [{ k: pro ? "Client" : "Member", v: c.memberFirstName }] : [])],
        cta: "Scan another",
      };
    case "already_used":
      return {
        tone: "caution",
        icon: "x",
        title: "Already used",
        body: c.usedAt ? `This voucher was marked as used on ${dateTimeLabel(c.usedAt)}.` : "This voucher was already marked as used.",
        rows: [...offer, ...(!pro && c.usedBy ? [{ k: "Used by staff", v: c.usedBy }] : [])],
        cta: "Scan another",
      };
    case "expired":
      return {
        tone: "high",
        icon: "x",
        title: "Expired",
        body: c.expiredAt ? `This voucher expired on ${dateOf(c.expiredAt)} and can't be used.` : "This voucher has expired and can't be used.",
        rows: [...offer, ...(c.expiredAt ? [{ k: "Expired", v: dateOf(c.expiredAt) }] : [])],
        cta: "Scan another",
      };
    default:
      return {
        tone: "high",
        icon: "x",
        title: pro ? "Not valid with you" : "Not valid at this business",
        body: pro ? "This voucher was issued for another professional's or business's offer." : "This voucher was issued for another business's offer.",
        rows: c.code ? [{ k: "Code", v: c.code }] : [],
        cta: "Scan another",
      };
  }
}
