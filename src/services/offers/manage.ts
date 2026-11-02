// Market + Share 3.0 · W3 · the owner's point offers (B-MA.3, P-MA.3).
//
// Reads are wired to DB2 (Database 33c0bf5, 20261210800000): the owner
// SELECTs `offers` under offers_select_live, which shows an owner every offer
// they own whatever its state (a business through business_can(id,
// 'marketing'), a professional their own) AND every other owner's live offer,
// so the read always filters on the owner's column.
//
// WRITES (Database PR #39, 20261214010000; HANDOVER_API "DB2 · An owner
// creates, edits and pauses an offer"): `offers` has no INSERT / UPDATE grant
// for authenticated, so every write is a SECURITY DEFINER function, each
// returning the offers row:
// - create_offer(p_headline, p_type, p_points_cost, p_starts_on, p_where_used,
//   p_value, p_applies_to, p_quantity_cap, p_per_member_limit, p_ends_on,
//   p_terms, p_business_id, p_funding_ack, p_request_id): p_business_id
//   omitted = the caller's own offer as a professional; the category is
//   derived on the server; p_funding_ack must be true to publish
//   (funding_ack_required); p_request_id becomes the offer's id, so a retry
//   returns the first offer;
// - update_offer(p_offer_id, …): the editor sends the whole draft (null
//   clears quantity_cap, terms and applies_to, leaves the rest); an ended offer refuses
//   (offer_expired), a taken-down one too (42501);
// - set_offer_paused(p_offer_id, p_paused).
// p_applies_to (a professional's own session type or plan) is stored since
// Database PR #40 and refused for a business offer or someone else's
// service (applies_to_invalid).
// Refusals: the five keywords (offerErrorOf), then the SQLSTATEs
// (offerWriteRefusal).

import { currentUserId, marketDb, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { t } from "../../i18n/core";
import {
  MANAGED_OFFER_SELECT,
  OFFER_ERROR_TEXT,
  offerArgs,
  offerErrorOf,
  offerWriteRefusal,
  parseManagedOffers,
  parseOneOffer,
  type ManagedOffer,
  type OfferDraft,
  type OfferError,
  type OfferVariant,
} from "./manageModel";
import { contactRefusal } from "../moderation/text";

export * from "./manageModel";

/** Whose offers: a business by id, or the signed-in professional. */
export type OfferOwner = { variant: "business"; businessId: string } | { variant: "professional" };

const ownerArgs = (o: OfferOwner): Record<string, unknown> => (o.variant === "business" ? { p_business_id: o.businessId } : {});

/** The owner's offers, newest first (the list sorts them by status). */
export async function fetchMyOffers(owner: OfferOwner): Promise<MarketResult<ManagedOffer[]>> {
  const fallback = t("Couldn't load your offers.");
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

export type OfferWrite = { ok: true; offer: ManagedOffer | null } | { ok: false; offline?: boolean; error?: OfferError; code?: string; message: string };

async function write(fn: string, args: Record<string, unknown>, fallback: string): Promise<OfferWrite> {
  const res = await marketRpcRaw(fn, args);
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const k = offerErrorOf(res.error);
    if (k) return { ok: false, error: k, code: res.error.code, message: t(OFFER_ERROR_TEXT[k]) };
    const refusal = offerWriteRefusal(res.error);
    if (refusal) return { ok: false, code: res.error.code, message: refusal };
    console.error(`[offers] ${fn}:`, res.error.message);
    return { ok: false, code: res.error.code, message: fallback };
  }
  return { ok: true, offer: parseOneOffer(res.data) };
}

/**
 * create_offer(…, p_funding_ack, p_request_id) ⟳: one request id per open
 * form, so a retry after a dropped connection returns the first offer instead
 * of creating a second.
 */
export function createOffer(owner: OfferOwner, draft: OfferDraft, requestId: string): Promise<OfferWrite> {
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(draft.headline, draft.terms);
  if (contact) return Promise.resolve({ ok: false, message: contact });
  const variant: OfferVariant = owner.variant;
  return write(
    "create_offer",
    { ...offerArgs(draft, variant), ...ownerArgs(owner), p_funding_ack: draft.fundingAck, p_request_id: requestId },
    t("Couldn't publish this offer. Try again.")
  );
}

/** update_offer(p_offer_id, …): refuses offer_expired (ended) and a taken-down offer. */
export function updateOffer(owner: OfferOwner, offerId: string, draft: OfferDraft): Promise<OfferWrite> {
  const contact = contactRefusal(draft.headline, draft.terms);
  if (contact) return Promise.resolve({ ok: false, message: contact });
  return write("update_offer", { p_offer_id: offerId, ...offerArgs(draft, owner.variant), p_funding_ack: draft.fundingAck }, t("Couldn't save this offer. Try again."));
}

/** set_offer_paused(p_offer_id, p_paused): Pause / Resume from the row menu. */
export function setOfferPaused(offerId: string, paused: boolean): Promise<OfferWrite> {
  return write("set_offer_paused", { p_offer_id: offerId, p_paused: paused }, paused ? t("Couldn't pause this offer. Try again.") : t("Couldn't resume this offer. Try again."));
}
