// Market + Share 3.0 · W3 · the B-MA.7 / P-MA.6 performance readers, through
// marketRpc (a stage that hasn't landed answers `pending`: the screens show
// the quiet "No data yet" state, never a series of their own).
//
// - offer_performance(p_range, p_metric, p_offer_id, p_compare): DB5,
//   business (marketing). p_offer_id null = all offers.
// - professional_performance(p_range, p_metric): DB5, the professional.
// - the header's offer selector: the owner's offers (DB2 `offers`, services/offers/manage).
// Only the documented arguments are sent: an extra one would make PostgREST
// miss the function once it lands.

import { marketRpc, type MarketResult } from "./rpc";
import { fetchMyOffers } from "../offers/manage";
import { parsePerformance, type OfferChoice, type OfferMetric, type PerfRange, type PerfSeries, type ProMetric } from "./performanceModel";

export async function fetchOfferPerformance(range: PerfRange, metric: OfferMetric, offerId: string | null, compare: boolean): Promise<MarketResult<PerfSeries | null>> {
  // awaiting DB stage DB5
  return marketRpc("offer_performance", { p_range: range, p_metric: metric, p_offer_id: offerId, p_compare: compare }, "Couldn't load your offer performance.", (d) => parsePerformance(d, range));
}

export async function fetchProfessionalPerformance(range: PerfRange, metric: ProMetric): Promise<MarketResult<PerfSeries | null>> {
  // awaiting DB stage DB5
  return marketRpc("professional_performance", { p_range: range, p_metric: metric }, "Couldn't load your performance.", (d) => parsePerformance(d, range));
}

export async function fetchOfferChoices(businessId: string): Promise<MarketResult<OfferChoice[]>> {
  const r = await fetchMyOffers({ variant: "business", businessId });
  return r.ok ? { ok: true, value: r.value.map((o) => ({ id: o.id, headline: o.headline, startsOn: o.startsOn })) } : r;
}
