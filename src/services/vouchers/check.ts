// Market + Share 3.0 · W3 · checking and using a voucher at the counter
// (B-MA.4, P-MA.4), wired to DB2: check_voucher(p_code) and
// mark_voucher_used(p_voucher_id). Who may: business_can(business, 'front_desk')
// for a business's offers, the professional for their own (the functions
// decide; a stranger's code reads not_valid_here). A paused or hidden listing
// or offer still validates the vouchers already issued: nothing here reads
// the listing.

import { marketRpcRaw } from "../market/rpc";
import { isOffline } from "../network-error";
import { markRefusal, mergeMark, notACode, parseCheck, scanInput, type VoucherCheck } from "./checkModel";

export * from "./checkModel";

export type CheckResult = { ok: true; check: VoucherCheck } | { ok: false; offline?: boolean; message: string };

const RATE_LIMITED = "Too many checks in a short time. Try again in a few minutes.";

/** check_voucher(p_code). `raw` is a typed code or a camera read. */
export async function checkVoucher(raw: string): Promise<CheckResult> {
  const fallback = "Couldn't check this voucher. Try again.";
  const input = scanInput(raw);
  if (!input) return { ok: true, check: notACode() };
  const res = await marketRpcRaw("check_voucher", input);
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    if (res.error.code === "ATX02") return { ok: false, message: RATE_LIMITED };
    console.error("[vouchers] check_voucher:", res.error.code, res.error.message);
    return { ok: false, message: fallback };
  }
  const c = parseCheck(res.data, input.p_code);
  return c ? { ok: true, check: c } : { ok: false, message: fallback };
}

/**
 * mark_voucher_used(p_voucher_id) ⟳: idempotent on the server, so a repeat
 * (a double tap, a retry after a dropped connection, a second desk) answers
 * already_used and changes nothing. A refusal (not found, not valid here,
 * void, expired) shows that state instead.
 */
export async function markVoucherUsed(prev: VoucherCheck): Promise<CheckResult> {
  const fallback = "Couldn't mark this voucher as used. Try again.";
  if (!prev.voucherId) return { ok: false, message: fallback };
  const res = await marketRpcRaw("mark_voucher_used", { p_voucher_id: prev.voucherId });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const refused = markRefusal(prev, res.error);
    if (refused) return { ok: true, check: refused };
    console.error("[vouchers] mark_voucher_used:", res.error.code, res.error.message);
    return { ok: false, message: fallback };
  }
  const c = mergeMark(prev, res.data);
  return c ? { ok: true, check: c } : { ok: false, message: fallback };
}
