// Market + Share 3.0 · W2 · the client's vouchers (C-MO.4.4.4, C-MO.4.6): the
// `vouchers` table under vouchers_select_own, each row carrying its own
// snapshot of the offer (vouchersModel). member_id is filtered explicitly:
// the same policy lets an offer's owner read the vouchers issued against
// their offers, and a professional or business owner is a client too.

import { currentUserId, marketDb, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { VOUCHER_SELECT, parseVouchers, type Voucher } from "./vouchersModel";

export * from "./vouchersModel";

async function read(filter: { id?: string }, fallback: string): Promise<MarketResult<Voucher[]>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: fallback };
  let res: { data: unknown; error: { code?: string; message: string } | null };
  try {
    let q = marketDb.from("vouchers").select(VOUCHER_SELECT).eq("member_id", uid);
    if (filter.id) q = q.eq("id", filter.id);
    res = await q.order("issued_at", { ascending: false }).order("id", { ascending: false }).limit(200);
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: fallback };
  }
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    console.error("[vouchers]", res.error.message);
    return { ok: false, code: res.error.code, message: fallback };
  }
  return { ok: true, value: parseVouchers(res.data) };
}

/** Every voucher of the signed-in member, newest first (My rewards splits them into tabs). */
export function fetchMyVouchers(): Promise<MarketResult<Voucher[]>> {
  return read({}, "Couldn't load your rewards.");
}

/** One voucher by id (the voucher page opened from My rewards, a redemption or a notification). */
export async function fetchMyVoucher(id: string): Promise<MarketResult<Voucher | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: true, value: null };
  const r = await read({ id }, "Couldn't load your voucher.");
  return r.ok ? { ok: true, value: r.value[0] ?? null } : r;
}
