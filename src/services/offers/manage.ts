// Market + Share 3.0 · W3 · the owner's point offers (B-MA.3, P-MA.3).
//
// Reads are wired to DB2 (Database 33c0bf5, 20261210800000): the owner
// SELECTs `offers` under offers_select_live, which shows an owner every offer
// they own whatever its state (a business through business_can(id,
// 'marketing'), a professional their own) AND every other owner's live offer,
// so the read always filters on the owner's column.
//
// WRITES ARE A DATABASE GAP. DB2 gives owners no way to create, edit, pause
// or publish an offer: `offers` has no INSERT / UPDATE grant or policy for
// authenticated ("every write goes through a SECURITY DEFINER function") and
// no owner function exists (only redeem_offer, check_voucher,
// mark_voucher_used and the admin hide). The three writers below keep W3's
// PLAN §2.2 calls; PostgREST answers PGRST202 and the screens show their quiet
// "coming soon" strip until the Database ships them.

import { currentUserId, marketDb, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import {
  MANAGED_OFFER_SELECT,
  OFFER_ERROR_TEXT,
  offerArgs,
  offerErrorOf,
  parseManagedOffers,
  parseOneOffer,
  type ManagedOffer,
  type OfferDraft,
  type OfferError,
  type OfferVariant,
} from "./manageModel";

export * from "./manageModel";

/** Whose offers: a business by id, or the signed-in professional. */
export type OfferOwner = { variant: "business"; businessId: string } | { variant: "professional" };

const ownerArgs = (o: OfferOwner): Record<string, unknown> => (o.variant === "business" ? { p_business_id: o.businessId } : {});

/** The owner's offers, newest first (the list sorts them by status). */
export async function fetchMyOffers(owner: OfferOwner): Promise<MarketResult<ManagedOffer[]>> {
  const fallback = "Couldn't load your offers.";
  const col = owner.variant === "business" ? "business_id" : "professional_id";
  const id = owner.variant === "business" ? owner.businessId : await currentUserId();
  if (!id) return { ok: false, message: fallback };
  let res: { data: unknown; error: { code?: string; message: string } | null };
  try {
    res = await marketDb.from("offers").select(MANAGED_OFFER_SELECT).eq(col, id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(200);
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: fallback };
  }
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    console.error("[offers] my offers:", res.error.message);
    return { ok: false, code: res.error.code, message: fallback };
  }
  return { ok: true, value: parseManagedOffers(res.data) };
}

/** One of the owner's offers (the edit page), or null when it isn't theirs. */
export async function fetchMyOffer(owner: OfferOwner, offerId: string): Promise<MarketResult<ManagedOffer | null>> {
  const all = await fetchMyOffers(owner);
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
  // awaiting DB stage DB2 owner writer (gap: 33c0bf5 ships none; see the header)
  return write(
    "create_offer",
    { ...offerArgs(draft, variant), ...ownerArgs(owner), p_funding_ack: draft.fundingAck, p_request_id: requestId },
    "Couldn't publish this offer. Try again.",
    "Publishing offers is coming soon."
  );
}

/** update_offer(p_offer_id, …): refuses offer_expired. */
export function updateOffer(owner: OfferOwner, offerId: string, draft: OfferDraft): Promise<OfferWrite> {
  // awaiting DB stage DB2 owner writer (gap: 33c0bf5 ships none; see the header)
  return write(
    "update_offer",
    { p_offer_id: offerId, ...offerArgs(draft, owner.variant), p_funding_ack: draft.fundingAck },
    "Couldn't save this offer. Try again.",
    "Editing offers is coming soon."
  );
}

/** set_offer_paused(p_offer_id, p_paused): Pause / Resume from the row menu. */
export function setOfferPaused(offerId: string, paused: boolean): Promise<OfferWrite> {
  // awaiting DB stage DB2 owner writer (gap: 33c0bf5 ships none; see the header)
  return write(
    "set_offer_paused",
    { p_offer_id: offerId, p_paused: paused },
    paused ? "Couldn't pause this offer. Try again." : "Couldn't resume this offer. Try again.",
    "Pausing offers is coming soon."
  );
}
