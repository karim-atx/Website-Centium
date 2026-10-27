// Market + Share 3.0 · W3 · checking a voucher at the counter, pure (B-MA.4,
// P-MA.4; Business / Professional Marketplace Screens `R`, `scanCode`).
// DB2 (Database 33c0bf5, 20261210800000; HANDOVER_API "At the desk"):
// - check_voucher(p_code) → one row {voucher_id, state, offer_title,
//   points_paid, issued_at, expires_at, used_at, used_by_name}; state is
//   valid | already_used | expired | void | not_valid_here | not_found (the
//   last two as a row with everything else null, never an error);
//   offer_title is the voucher's own snapshot (Database PR #40), the words
//   the member is holding, not the offer's current title;
// - mark_voucher_used(p_voucher_id) → {voucher_id, state used | already_used,
//   already_used, used_at, used_by_name}; refusals ATX08 not found, ATX15
//   not_valid_here, ATX16 void, ATX17 expired (the function comment).
// DH (Karim, 2026-10-27; Database Release A stage A1, requested): both append
// member_first_name (valid / already_used only, after the not-valid-here
// check: the Q-05 desk rule, first name only) and member_confirmed_adult
// (filled only for an age-restricted offer). Until the stage lands neither
// column exists, and the Member / Client row and the check-ID note stay out.

import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";
import { rows, str } from "../market/parse";

export type CheckVariant = "business" | "professional";
/** check_voucher's six states, and `used`: mark_voucher_used's success. */
export type CheckState = "valid" | "already_used" | "expired" | "void" | "not_valid_here" | "not_found" | "used";

export interface VoucherCheck {
  state: CheckState;
  voucherId: string | null;
  /** The code as typed or scanned (the readers don't return it). */
  code: string | null;
  offerHeadline: string;
  /** valid / expired: when the voucher stops (stopped) working. */
  expiresAt: string | null;
  usedAt: string | null;
  /** The first name of the staff member (or professional) who marked it used. */
  usedBy: string | null;
  /** The holder's first name (the board's Member / Client row). */
  memberName: string | null;
  /** false only for an age-restricted offer whose holder isn't a confirmed adult. */
  memberConfirmedAdult: boolean | null;
}

// ---------------------------------------------------------------------------
// Codes (D-24: Crockford base32, XXXX-XXXX-XXXX; no I, L, O or U)

export const CODE_LENGTH = 12;

/**
 * Letters and digits only, upper case, at most 12, with Crockford's reading
 * of the glyphs the alphabet leaves out (O → 0, I and L → 1): a code read
 * aloud as "O" still matches. check_voucher only upper-cases and trims.
 */
export function codeChars(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .slice(0, CODE_LENGTH);
}

/** As typed in the Enter code field: upper case with the dashes put in ("hwae pd5g 74km" → "HWAE-PD5G-74KM"). */
export function formatCode(raw: string): string {
  const c = codeChars(raw);
  return [c.slice(0, 4), c.slice(4, 8), c.slice(8, 12)].filter(Boolean).join("-");
}

/** Check code is enabled once all 12 characters are in. */
export const codeComplete = (raw: string): boolean => codeChars(raw).length === CODE_LENGTH;

/**
 * A typed code or a camera read → check_voucher's p_code, or null when it
 * isn't a voucher code at all (the app's voucher QR carries the code; a
 * scanned URL or other QR can't be one).
 */
export function scanInput(raw: string): { p_code: string } | null {
  const t = raw.trim();
  if (!/^[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}$/.test(t)) return null;
  return { p_code: formatCode(t) };
}

/** What a read that isn't a code shows: the not-found result, without a server call. */
export const notACode = (): VoucherCheck => ({ state: "not_found", voucherId: null, code: null, offerHeadline: "", expiresAt: null, usedAt: null, usedBy: null, memberName: null, memberConfirmedAdult: null });

// ---------------------------------------------------------------------------
// Results

const STATES: readonly CheckState[] = ["valid", "already_used", "expired", "void", "not_valid_here", "not_found", "used"];

/** check_voucher's row (with the code that was checked). */
export function parseCheck(data: unknown, code: string | null = null): VoucherCheck | null {
  const r = rows(data)[0];
  if (!r) return null;
  const s = str(r.state);
  if (!STATES.includes(s as CheckState) || s === "used") return null;
  return {
    state: s as CheckState,
    voucherId: str(r.voucher_id),
    code,
    offerHeadline: str(r.offer_title) ?? "",
    expiresAt: str(r.expires_at),
    usedAt: str(r.used_at),
    usedBy: str(r.used_by_name),
    memberName: str(r.member_first_name),
    memberConfirmedAdult: typeof r.member_confirmed_adult === "boolean" ? r.member_confirmed_adult : null,
  };
}

/** mark_voucher_used's answer over the check it followed: `used` the first time, `already_used` on a repeat. */
export function mergeMark(prev: VoucherCheck, data: unknown): VoucherCheck | null {
  const r = rows(data)[0];
  if (!r) return null;
  const s = str(r.state);
  if (s !== "used" && s !== "already_used") return null;
  return { ...prev, state: s, voucherId: str(r.voucher_id) ?? prev.voucherId, usedAt: str(r.used_at) ?? prev.usedAt, usedBy: str(r.used_by_name) ?? prev.usedBy, memberName: str(r.member_first_name) ?? prev.memberName };
}

/** mark_voucher_used's refusals → the state the sheet shows instead. */
const MARK_CODES: Record<string, CheckState> = { ATX08: "not_found", ATX15: "not_valid_here", ATX16: "void", ATX17: "expired" };

export function markRefusal(prev: VoucherCheck, e: { code?: string | null }): VoucherCheck | null {
  const s = e.code ? MARK_CODES[e.code] : undefined;
  return s ? { ...prev, state: s } : null;
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
  /** DH: the check-ID note on an 18+ offer whose holder isn't a confirmed adult (not drawn). */
  note?: string;
  cta: "Mark as used" | "Scan another";
}

/**
 * The Voucher check sheet's content (`R`): Valid → Mark as used; Already used
 * (date, 12-hour time and, for a business, the staff first name); Expired;
 * Not valid here. Ours: `used` (after Mark as used), `not_found` and `void`
 * (check_voucher's other two states, not drawn).
 */
export function checkView(c: VoucherCheck, variant: CheckVariant): CheckView {
  const pro = variant === "professional";
  const who = pro ? "client" : "member";
  const offer = c.offerHeadline ? [{ k: "Offer", v: c.offerHeadline }] : [];
  const codeRow = c.code ? [{ k: "Code", v: c.code }] : [];
  // B-MA.4 / P-MA.4 _Valid: Offer, Member (Client), Valid until.
  const member = c.memberName ? [{ k: pro ? "Client" : "Member", v: c.memberName }] : [];
  switch (c.state) {
    case "valid":
      return {
        tone: "good",
        icon: "check",
        title: "Valid voucher",
        body: `Check the ${who}'s name, then mark the voucher as used.`,
        rows: [...offer, ...member, ...(c.expiresAt ? [{ k: "Valid until", v: dateOf(c.expiresAt) }] : [])],
        // Staff still decide: Mark as used stays enabled.
        ...(c.memberConfirmedAdult === false
          ? { note: `18+ offer. ${c.memberName ? `${c.memberName}'s` : `The ${who}'s`} age isn't confirmed on Centium. Check ID before marking it as used.` }
          : {}),
        cta: "Mark as used",
      };
    case "used":
      return {
        tone: "good",
        icon: "check",
        title: "Voucher marked as used",
        body: c.usedAt ? `Marked as used on ${dateTimeLabel(c.usedAt)}.` : "Marked as used.",
        rows: offer,
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
        body: c.expiresAt ? `This voucher expired on ${dateOf(c.expiresAt)} and can't be used.` : "This voucher has expired and can't be used.",
        rows: [...offer, ...(c.expiresAt ? [{ k: "Expired", v: dateOf(c.expiresAt) }] : [])],
        cta: "Scan another",
      };
    case "void":
      return {
        tone: "high",
        icon: "x",
        title: "Voucher cancelled",
        body: "Centium cancelled this voucher, so it can't be used.",
        rows: [...offer, ...codeRow],
        cta: "Scan another",
      };
    case "not_found":
      return {
        tone: "high",
        icon: "x",
        title: "Code not found",
        body: "No voucher has this code. Check it and try again.",
        rows: codeRow,
        cta: "Scan another",
      };
    default:
      return {
        tone: "high",
        icon: "x",
        title: pro ? "Not valid with you" : "Not valid at this business",
        body: pro ? "This voucher was issued for another professional's or business's offer." : "This voucher was issued for another business's offer.",
        rows: codeRow,
        cta: "Scan another",
      };
  }
}
