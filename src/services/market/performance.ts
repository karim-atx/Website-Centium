// Market + Share 3.0 · W3 · the B-MA.7 / P-MA.6 performance readers (DB5,
// Database PR #39, 20261214030000; HANDOVER_API "DB5 · Performance"), through
// marketRpc. Both return one row { range, metric, total, delta_pct, points,
// previous }: zeros, not gaps (an empty range is N zero points); 90D and 12M
// bucket by week (performance_window); delta_pct is null against an empty
// previous window; previous is null unless p_compare.
//
// - offer_performance(p_range, p_metric, p_offer_id, p_compare,
//   p_business_id): the `marketing` permission (42501 otherwise); metrics
//   offer_views | redemptions | points_redeemed | conversion (redemptions
//   over views, computed over each bucket); p_offer_id null = all offers, an
//   offer of another business ATX08. The business is always named
//   (p_business_id): the server's fallback is the caller's own
//   business_profiles row, which a staff member doesn't have.
// - professional_performance(p_range, p_metric): the caller's own (ATX09 for
//   anyone else); metrics profile_views | hire_requests | vouchers_redeemed |
//   points_spent | conversion. Its `conversion` is vouchers redeemed over
//   profile views, NOT the hire rate P-MA.6 draws ("How many viewers asked to
//   hire you?", the screen's rateLine = hires / views), so the screen derives
//   that rate from the hire_requests and profile_views series itself and
//   doesn't ask for `conversion` (PRO_FETCHED).
// - the header's offer selector: the owner's offers (DB2 `offers`, services/offers/manage).

import { marketRpc, type MarketResult } from "./rpc";
import { fetchMyOffers } from "../offers/manage";
import { parsePerformance, type OfferChoice, type OfferMetric, type PerfRange, type PerfSeries, type ProMetric } from "./performanceModel";

export function fetchOfferPerformance(businessId: string, range: PerfRange, metric: OfferMetric, offerId: string | null, compare: boolean): Promise<MarketResult<PerfSeries | null>> {
  return marketRpc(
    "offer_performance",
    { p_range: range, p_metric: metric, p_offer_id: offerId, p_compare: compare, p_business_id: businessId },
    "Couldn't load your offer performance.",
    (d) => parsePerformance(d, range)
  );
}

export function fetchProfessionalPerformance(range: PerfRange, metric: ProMetric): Promise<MarketResult<PerfSeries | null>> {
  return marketRpc("professional_performance", { p_range: range, p_metric: metric }, "Couldn't load your performance.", (d) => parsePerformance(d, range));
}

export async function fetchOfferChoices(businessId: string): Promise<MarketResult<OfferChoice[]>> {
  const r = await fetchMyOffers({ variant: "business", businessId });
  return r.ok ? { ok: true, value: r.value.map((o) => ({ id: o.id, headline: o.headline, startsOn: o.startsOn })) } : r;
}
