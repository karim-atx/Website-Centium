// Reporting an offer: report_offer and the member's own report (see
// reportModel.ts for the rules).

import { marketDb, marketRpcRaw } from "../market/rpc";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { offerReportError, offerReportNote, type OfferReportReason } from "./reportModel";

export * from "./reportModel";

/** Sends the report; ok also for a repeat (the server keeps the first one). */
export async function reportOffer(offerId: string, reason: OfferReportReason, note: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await marketRpcRaw("report_offer", { p_offer_id: offerId, p_reason: reason, p_note: offerReportNote(note) });
  if ("thrown" in res) return { ok: false, message: isOffline(res.thrown) ? OFFLINE_MESSAGE : offerReportError({}) };
  if (res.error) {
    if (isOffline(res.error)) return { ok: false, message: OFFLINE_MESSAGE };
    console.error("[offers] report_offer:", res.error.code, res.error.message);
    return { ok: false, message: offerReportError(res.error) };
  }
  return { ok: true };
}

/** Whether this member has already reported the offer (their own row, select-own RLS); null when it can't be read. */
export async function hasReportedOffer(offerId: string): Promise<boolean | null> {
  try {
    const { data, error } = await marketDb.from("offer_reports").select("id").eq("offer_id", offerId).limit(1);
    if (error) return null;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return null;
  }
}
