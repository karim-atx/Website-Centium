// Market + Share 3.0 · W2 · point offers for clients (C-MO.4.4–4.4.4), wired
// to DB2 (Database 33c0bf5, 20261210800000; HANDOVER_API "Release 1 ·
// Offers, vouchers, redemption"):
// - the catalogue and the detail read the `offers` table under its RLS (no
//   reader function exists), with the live rule applied client-side as
//   offer_is_live() states it (offersModel);
// - limit_left reads the member's own `redemptions` (select-own RLS);
// - redeem_offer(p_offer_id, p_request_id) is the one write.
// - one owner's offers (a business's showcase, a professional's profile) are
//   public_offers(p_owner_kind, p_owner_id) (Database PR #39), live by the
//   server's own rule. The catalogue (every owner) and the detail (one id)
//   have no reader function, so they stay table reads with the client rule.

import { typeLabel } from "../../components/pro/profile/typeLabel";
import type { ProfessionalSubtype } from "../../types";
import { todayLocal } from "../../utils/date";
import { currentUserId, marketDb, marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { parseVoucherRow, type Voucher } from "../vouchers/vouchersModel";
import {
  OFFER_SELECT,
  REDEEM_ERROR_TEXT,
  categoryParam,
  parseCatalog,
  parseOfferDetail,
  parsePublicOffers,
  professionalIds,
  redeemErrorOf,
  type CatalogOffer,
  type OfferDetail,
  type ProName,
  type RedeemError,
  type RewardCategory,
} from "./offersModel";

export * from "./offersModel";

/** Public names for professional owners (public_professional_directory); an unlisted one is simply missing. */
export async function fetchProNames(ids: readonly string[]): Promise<Map<string, ProName>> {
  const out = new Map<string, ProName>();
  if (ids.length === 0) return out;
  try {
    const r = await marketDb.from("public_professional_directory").select("profile_id, first_name, professional_subtype").in("profile_id", [...ids]);
    for (const p of (r.data ?? []) as { profile_id: string; first_name: string | null; professional_subtype: ProfessionalSubtype | null }[]) {
      if (p.first_name) out.set(p.profile_id, { first: p.first_name, type: p.professional_subtype ? typeLabel(p.professional_subtype) : null });
    }
  } catch {
    // Names are a nicety; the cards fall back to "Professional".
  }
  return out;
}

type ReadRes = { data: unknown; error: { code?: string; message: string } | null };

function failed<T>(e: unknown, fallback: string): MarketResult<T> {
  if (isOffline(e)) return { ok: false, offline: true, message: fallback };
  const err = e as { code?: string; message?: string } | null;
  console.error("[offers]", err?.message ?? e);
  return { ok: false, code: err?.code, message: fallback };
}

/** The live offers for a chip, cheapest first (D-22's "redeemable first" is arrangeOffers'). */
export async function fetchRewardCatalog(category: RewardCategory): Promise<MarketResult<CatalogOffer[]>> {
  const fallback = "Couldn't load rewards.";
  const today = todayLocal();
  let q = marketDb
    .from("offers")
    .select(OFFER_SELECT)
    .is("paused_at", null)
    .is("hidden_at", null)
    .not("funding_ack_at", "is", null)
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`);
  const cat = categoryParam(category);
  if (cat) q = q.eq("category", cat);
  let res: ReadRes;
  try {
    res = (await q.order("points_cost", { ascending: true }).order("id", { ascending: true }).limit(200)) as ReadRes;
  } catch (e) {
    return failed(e, fallback);
  }
  if (res.error) return failed(res.error, fallback);
  const pros = await fetchProNames(professionalIds(res.data));
  return { ok: true, value: parseCatalog(res.data, today, pros) };
}

/** One offer for its detail page: null when it doesn't exist or isn't live (RLS hides it, or offer_is_live wouldn't pass). */
export async function fetchOfferDetail(offerId: string): Promise<MarketResult<OfferDetail | null>> {
  const fallback = "Couldn't load this offer.";
  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return { ok: true, value: null };
  let res: ReadRes;
  try {
    res = (await marketDb.from("offers").select(OFFER_SELECT).eq("id", offerId).limit(1)) as ReadRes;
  } catch (e) {
    return failed(e, fallback);
  }
  if (res.error) return failed(res.error, fallback);
  // limit_left: per_member_limit − this member's redemptions of the offer.
  // The owner of an offer also sees other members' rows, so filter on the caller.
  let mine: number | null = null;
  const uid = await currentUserId();
  if (uid) {
    try {
      const c = await marketDb.from("redemptions").select("id", { count: "exact", head: true }).eq("offer_id", offerId).eq("member_id", uid);
      if (!c.error && typeof c.count === "number") mine = c.count;
    } catch {
      // Unknown: the button stays usable and redeem_offer answers ATX14 if the limit is used.
    }
  }
  const pros = await fetchProNames(professionalIds(res.data));
  return { ok: true, value: parseOfferDetail(res.data, todayLocal(), pros, mine) };
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
  const v = parseVoucherRow(Array.isArray(res.data) ? res.data[0] : res.data);
  return v ? { ok: true, voucher: v } : { ok: false, message: fallback };
}
