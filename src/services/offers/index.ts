// Market + Share 3.0 · W2 · point offers for clients (C-MO.4.4–4.4.4):
// - the catalogue is offer_catalogue(p_category, p_limit, p_offset) and the
//   detail offer_detail(p_offer_id) (Database PR #40, 20261215010000), both
//   live by offer_is_live() on the server, with the owner card, quantity_left,
//   the caller's own limit_left and the voucher's expiry in the one read;
// - one owner's offers (a business's showcase, a professional's profile) are
//   public_offers(p_owner_kind, p_owner_id) (Database PR #39);
// - redeem_offer(p_offer_id, p_request_id) is the one write.
// All three readers are signed in only (not granted to anon).

import { typeLabel } from "../../components/pro/profile/typeLabel";
import type { ProfessionalSubtype } from "../../types";
import { marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { parseVoucherRow, type Voucher } from "../vouchers/vouchersModel";
import {
  REDEEM_ERROR_TEXT,
  categoryParam,
  parseCatalogue,
  parseOfferDetail,
  parsePublicOffers,
  redeemErrorOf,
  type CatalogOffer,
  type OfferDetail,
  type RedeemError,
  type RewardCategory,
} from "./offersModel";

export * from "./offersModel";

const subtypeLabel = (s: string): string => typeLabel(s as ProfessionalSubtype);

/** The live offers for a chip, cheapest first (D-22's "redeemable first" is arrangeOffers'). */
export function fetchRewardCatalog(category: RewardCategory): Promise<MarketResult<CatalogOffer[]>> {
  return marketRpc("offer_catalogue", { p_category: categoryParam(category), p_limit: 200, p_offset: 0 }, "Couldn't load rewards.", (d) => parseCatalogue(d, subtypeLabel));
}

/** One offer for its detail page: null when offer_detail returns no row (gone, or not live). */
export async function fetchOfferDetail(offerId: string): Promise<MarketResult<OfferDetail | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return { ok: true, value: null };
  return marketRpc("offer_detail", { p_offer_id: offerId }, "Couldn't load this offer.", (d) => parseOfferDetail(d, subtypeLabel));
}

/**
 * The live point offers on one owner's public page: public_offers(
 * p_owner_kind, p_owner_id) (Database PR #39, 20261214010000), cheapest
 * first. The server applies offer_is_live() (acknowledged, not paused or
 * hidden, inside its dates, the business still trading) and answers nothing
 * for a business that isn't publicly visible or a professional who isn't
 * listed, so no client live rule runs here. Signed in only (not granted to
 * anon). Not public_showcase: that returns the owner's shelf items.
 */
export function fetchShowcaseOffers(ownerType: "business" | "professional", ownerId: string): Promise<MarketResult<CatalogOffer[]>> {
  return marketRpc("public_offers", { p_owner_kind: ownerType, p_owner_id: ownerId }, "Couldn't load offers.", (d) => parsePublicOffers(d, ownerType, ownerId));
}

export type RedeemResult = { ok: true; voucher: Voucher } | { ok: false; offline?: boolean; error?: RedeemError; message: string };

/**
 * redeem_offer(p_offer_id, p_request_id) ⟳ → the vouchers row. One
 * transaction on the server (the negative ledger row, the voucher, the
 * redemption); every refusal comes before any write. A repeat with the same
 * request id returns the first call's voucher, so a retry after a dropped
 * connection can't redeem twice.
 */
export async function redeemOffer(offerId: string, requestId: string): Promise<RedeemResult> {
  const fallback = "Couldn't redeem this offer. Try again.";
  const res = await marketRpcRaw("redeem_offer", { p_offer_id: offerId, p_request_id: requestId });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const k = redeemErrorOf(res.error);
    if (k) return { ok: false, error: k, message: REDEEM_ERROR_TEXT[k] };
    console.error("[offers] redeem_offer:", res.error.message);
    return { ok: false, message: fallback };
  }
  const v = parseVoucherRow(Array.isArray(res.data) ? res.data[0] : res.data, subtypeLabel);
  return v ? { ok: true, voucher: v } : { ok: false, message: fallback };
}
