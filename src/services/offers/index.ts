// Market + Share 3.0 · W2 · point offers for clients (C-MO.4.4–4.4.4).
//
// Every function here is awaiting a Database stage (DB2 offers, vouchers and
// redemption; DB3 public_showcase). They call the documented functions (PLAN
// §2.2) through marketRpc; until a stage lands PostgREST answers PGRST202 and
// the result is `pending`, which the screens show as their quiet designed
// state. Nothing here invents an offer.

import { marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { parseVoucher, type Voucher } from "../vouchers/vouchersModel";
import {
  REDEEM_ERROR_TEXT,
  categoryParam,
  parseCatalog,
  parseOfferDetail,
  parseShowcaseOffers,
  redeemErrorOf,
  type CatalogOffer,
  type OfferDetail,
  type RedeemError,
  type RewardCategory,
} from "./offersModel";

export * from "./offersModel";

/** reward_catalog(p_category): active offers with the owner card, can_redeem and points_to_go. */
export function fetchRewardCatalog(category: RewardCategory): Promise<MarketResult<CatalogOffer[]>> {
  // awaiting DB stage DB2
  return marketRpc("reward_catalog", { p_category: categoryParam(category) }, "Couldn't load rewards.", parseCatalog);
}

/** offer_detail(p_offer_id): the offer, its owner, terms, where, limits and the balance after. Errors not_found / not_public read as null. */
export async function fetchOfferDetail(offerId: string): Promise<MarketResult<OfferDetail | null>> {
  // awaiting DB stage DB2
  const r = await marketRpc("offer_detail", { p_offer_id: offerId }, "Couldn't load this offer.", parseOfferDetail);
  if (!r.ok && !r.pending && !r.offline && /not_found|not_public/i.test(r.code ?? "")) return { ok: true, value: null };
  return r;
}

/** The active offers on a business's or professional's public showcase (public_showcase, DB3). */
export function fetchShowcaseOffers(ownerType: "business" | "professional", ownerId: string): Promise<MarketResult<CatalogOffer[]>> {
  // awaiting DB stage DB3
  return marketRpc("public_showcase", { p_owner_type: ownerType, p_owner_id: ownerId }, "Couldn't load offers.", parseShowcaseOffers);
}

export type RedeemResult = { ok: true; voucher: Voucher } | { ok: false; pending?: boolean; offline?: boolean; error?: RedeemError; message: string };

/**
 * redeem_offer(p_offer_id, p_request_id) ⟳: one transaction on the server
 * (balance check, the negative redemption row, the voucher). A repeat with the
 * same request id returns the first voucher, so a retry after a dropped
 * connection can't redeem twice.
 */
export async function redeemOffer(offerId: string, requestId: string): Promise<RedeemResult> {
  const fallback = "Couldn't redeem this offer. Try again.";
  // awaiting DB stage DB2
  const res = await marketRpcRaw("redeem_offer", { p_offer_id: offerId, p_request_id: requestId });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (res.error.code === "PGRST202" || res.error.code === "42883") return { ok: false, pending: true, message: "Redeeming points is coming soon." };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const k = redeemErrorOf(res.error);
    if (k) return { ok: false, error: k, message: REDEEM_ERROR_TEXT[k] };
    console.error("[offers] redeem_offer:", res.error.message);
    return { ok: false, message: fallback };
  }
  const v = parseVoucher(Array.isArray(res.data) ? res.data[0] : res.data);
  return v ? { ok: true, voucher: v } : { ok: false, message: fallback };
}
