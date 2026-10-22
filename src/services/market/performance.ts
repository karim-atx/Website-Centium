// Market + Share 3.0 · W3 · the B-MA.7 / P-MA.6 performance readers, through
// marketRpc (a stage that hasn't landed answers `pending`: the screens show
// the quiet "No data yet" state, never a series of their own).
//
// - offer_performance(p_range, p_metric, p_offer_id, p_compare): DB5,
//   business (marketing). p_offer_id null = all offers.
// - professional_performance(p_range, p_metric): DB5, the professional.
// - my_offers(p_status): DB2, the header's offer selector (the owner's offers).
// Only the documented arguments are sent: an extra one would make PostgREST
// miss the function once it lands.

import { marketRpc, type MarketResult } from "./rpc";
import { parseOfferChoices, parsePerformance, type OfferChoice, type OfferMetric, type PerfRange, type PerfSeries, type ProMetric } from "./performanceModel";

export async function fetchOfferPerformance(range: PerfRange, metric: OfferMetric, offerId: string | null, compare: boolean): Promise<MarketResult<PerfSeries | null>> {
  // awaiting DB stage DB5
  return marketRpc("offer_performance", { p_range: range, p_metric: metric, p_offer_id: offerId, p_compare: compare }, "Couldn't load your offer performance.", (d) => parsePerformance(d, range));
}

export async function fetchProfessionalPerformance(range: PerfRange, metric: ProMetric): Promise<MarketResult<PerfSeries | null>> {
  // awaiting DB stage DB5
  return marketRpc("professional_performance", { p_range: range, p_metric: metric }, "Couldn't load your performance.", (d) => parsePerformance(d, range));
}

export async function fetchOfferChoices(): Promise<MarketResult<OfferChoice[]>> {
  // awaiting DB stage DB2
  return marketRpc("my_offers", { p_status: null }, "Couldn't load your offers.", parseOfferChoices);
}
