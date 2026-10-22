// Market + Share 3.0 · W3 · checking and using a voucher at the counter
// (B-MA.4, P-MA.4). Callers: the business's owner, front_desk or marketing
// staff (D-25), or the professional for their own offers.
//
// Both calls await Database stage DB2 (vouchers): until it lands PostgREST
// answers PGRST202, the result is `pending`, and the check sheet shows its
// quiet "coming soon" state. A hidden or paused listing still validates
// issued vouchers (the server decides; nothing here reads the listing).

import { marketRpcRaw } from "../market/rpc";
import { isOffline } from "../network-error";
import { mergeMark, parseCheck, scanInput, type VoucherCheck } from "./checkModel";

export * from "./checkModel";

export type CheckResult = { ok: true; check: VoucherCheck } | { ok: false; pending?: boolean; offline?: boolean; message: string };

const isPending = (code?: string | null) => code === "PGRST202" || code === "42883";

/** check_voucher(p_code | p_qr_payload): read only. `raw` is a typed code or a camera read. */
export async function checkVoucher(raw: string): Promise<CheckResult> {
  const fallback = "Couldn't check this voucher. Try again.";
  const input = scanInput(raw);
  if (!input) return { ok: false, message: fallback };
  // awaiting DB stage DB2
  const res = await marketRpcRaw("check_voucher", input);
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isPending(res.error.code)) return { ok: false, pending: true, message: fallback };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    console.error("[vouchers] check_voucher:", res.error.message);
    return { ok: false, message: fallback };
  }
  const c = parseCheck(res.data);
  if (!c) return { ok: false, message: fallback };
  return { ok: true, check: c.code ? c : { ...c, code: "p_code" in input ? input.p_code : null } };
}

/**
 * mark_voucher_used(p_voucher_id) ⟳: idempotent on the server, so a repeat
 * (a double tap, a retry after a dropped connection) answers already_used and
 * changes nothing.
 */
export async function markVoucherUsed(prev: VoucherCheck): Promise<CheckResult> {
  const fallback = "Couldn't mark this voucher as used. Try again.";
  if (!prev.voucherId) return { ok: false, message: fallback };
  // awaiting DB stage DB2
  const res = await marketRpcRaw("mark_voucher_used", { p_voucher_id: prev.voucherId });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isPending(res.error.code)) return { ok: false, pending: true, message: fallback };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    // not_valid_here / expired (api.md) come back as a state on a re-check.
    console.error("[vouchers] mark_voucher_used:", res.error.message);
    return { ok: false, message: fallback };
  }
  const c = mergeMark(prev, res.data);
  return c ? { ok: true, check: c } : { ok: false, message: fallback };
}
