// Market + Share 3.0 · W3 · the owner's point offers (B-MA.3, P-MA.3).
//
// Every call here awaits Database stage DB2 (offers). They call the documented
// functions (PLAN §2.2 DB2, api.md "Offers") through marketRpc / marketRpcRaw;
// until the stage lands PostgREST answers PGRST202 and the result is
// `pending`, which the screens show as their quiet designed state. A business
// passes its id (a staff seat may hold several businesses); a professional's
// offers are their own.

import { marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import {
  OFFER_ERROR_TEXT,
  offerArgs,
  offerErrorOf,
  parseManagedOffers,
  parseOneOffer,
  type ManagedOffer,
  type OfferDraft,
  type OfferError,
  type OfferStatus,
  type OfferVariant,
} from "./manageModel";

export * from "./manageModel";

/** Whose offers: a business by id, or the signed-in professional. */
export type OfferOwner = { variant: "business"; businessId: string } | { variant: "professional" };

const ownerArgs = (o: OfferOwner): Record<string, unknown> => (o.variant === "business" ? { p_business_id: o.businessId } : {});

/** my_offers(p_status, p_business_id?): every offer, or one status. */
export function fetchMyOffers(owner: OfferOwner, status: OfferStatus | null = null): Promise<MarketResult<ManagedOffer[]>> {
  // awaiting DB stage DB2
  return marketRpc("my_offers", { p_status: status, ...ownerArgs(owner) }, "Couldn't load your offers.", parseManagedOffers);
}

/** One of the owner's offers (the edit page), or null when it isn't theirs. */
export async function fetchMyOffer(owner: OfferOwner, offerId: string): Promise<MarketResult<ManagedOffer | null>> {
  const all = await fetchMyOffers(owner, null);
  if (!all.ok) return all;
  return { ok: true, value: all.value.find((o) => o.id === offerId) ?? null };
}

export type OfferWrite = { ok: true; offer: ManagedOffer | null } | { ok: false; pending?: boolean; offline?: boolean; error?: OfferError; message: string };

async function write(fn: string, args: Record<string, unknown>, fallback: string, pendingText: string): Promise<OfferWrite> {
  const res = await marketRpcRaw(fn, args);
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (res.error.code === "PGRST202" || res.error.code === "42883") return { ok: false, pending: true, message: pendingText };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const k = offerErrorOf(res.error);
    if (k) return { ok: false, error: k, message: OFFER_ERROR_TEXT[k] };
    console.error(`[offers] ${fn}:`, res.error.message);
    return { ok: false, message: fallback };
  }
  return { ok: true, offer: parseOneOffer(res.data) };
}

/**
 * create_offer(…, p_funding_ack, p_request_id) ⟳: one request id per open
 * form, so a retry after a dropped connection returns the first offer instead
 * of creating a second.
 */
export function createOffer(owner: OfferOwner, draft: OfferDraft, requestId: string): Promise<OfferWrite> {
  const variant: OfferVariant = owner.variant;
  // awaiting DB stage DB2
  return write(
    "create_offer",
    { ...offerArgs(draft, variant), ...ownerArgs(owner), p_funding_ack: draft.fundingAck, p_request_id: requestId },
    "Couldn't publish this offer. Try again.",
    "Publishing offers is coming soon."
  );
}

/** update_offer(p_offer_id, …): refuses offer_expired. */
export function updateOffer(owner: OfferOwner, offerId: string, draft: OfferDraft): Promise<OfferWrite> {
  // awaiting DB stage DB2
  return write(
    "update_offer",
    { p_offer_id: offerId, ...offerArgs(draft, owner.variant), p_funding_ack: draft.fundingAck },
    "Couldn't save this offer. Try again.",
    "Editing offers is coming soon."
  );
}

/** set_offer_paused(p_offer_id, p_paused): Pause / Resume from the row menu. */
export function setOfferPaused(offerId: string, paused: boolean): Promise<OfferWrite> {
  // awaiting DB stage DB2
  return write(
    "set_offer_paused",
    { p_offer_id: offerId, p_paused: paused },
    paused ? "Couldn't pause this offer. Try again." : "Couldn't resume this offer. Try again.",
    "Pausing offers is coming soon."
  );
}
