// Market + Share 3.0 · W2 · the client's vouchers (C-MO.4.4.4, C-MO.4.6).
// awaiting DB stage DB2: my_vouchers isn't on the server yet; until it is the
// read is `pending` and My rewards shows its drawn empty state.

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseVouchers, type Voucher, type VoucherStatus } from "./vouchersModel";

export * from "./vouchersModel";

/** my_vouchers(p_status): every voucher, or one status. */
export function fetchMyVouchers(status: VoucherStatus | null = null): Promise<MarketResult<Voucher[]>> {
  // awaiting DB stage DB2
  return marketRpc("my_vouchers", { p_status: status }, "Couldn't load your rewards.", parseVouchers);
}

/** One voucher by id (the voucher page opened from My rewards or a notification). */
export async function fetchMyVoucher(id: string): Promise<MarketResult<Voucher | null>> {
  const all = await fetchMyVouchers(null);
  if (!all.ok) return all;
  return { ok: true, value: all.value.find((v) => v.id === id) ?? null };
}
