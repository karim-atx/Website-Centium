import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchOfferChoices, fetchOfferPerformance } from "../../services/market/performance";
import { DEFAULT_RANGE, deltaPt, deltaText, fmtCount, isPerfRange, OFFER_METRICS, ratePtChange, rateText, type OfferChoice, type OfferMetric, type PerfRange, type PerfSeries } from "../../services/market/performanceModel";
import { t, tk, tn } from "../../i18n/core";

// B-MA.7 Offer Performance's readers and words (moved out of
// OfferPerformance.tsx unchanged so the website viewport's Performance tab,
// WB-MA.4, shares them).

export const QUESTION: Record<OfferMetric, string> = {
  offer_views: tk("How many members saw your offers?"),
  redemptions: tk("How many vouchers were redeemed?"),
  points_redeemed: tk("How many points did members spend with you?"),
  conversion: tk("How many viewers redeemed?"),
};



export const formatOf = (metric: OfferMetric) => (v: number): string =>
  metric === "offer_views"
    ? tn(Math.round(v), "{n} view", "{n} views", { n: fmtCount(v) })
    : metric === "redemptions"
      ? tn(Math.round(v), "{n} voucher", "{n} vouchers", { n: fmtCount(v) })
      : metric === "points_redeemed"
        ? t("{n} pts", { n: fmtCount(v) })
        : rateText(v);

export const totalOf = (metric: OfferMetric, s: PerfSeries | null): string => (metric === "conversion" ? rateText(s?.total ?? 0) : fmtCount(s?.total ?? 0));
export const deltaOf = (metric: OfferMetric, s: PerfSeries | null): string | null => (metric === "conversion" ? deltaPt(s ? ratePtChange(s.total, s.deltaPct) : null) : deltaText(s?.deltaPct));

/** The range and offer, kept in the page's query so the expanded page and back keep them. */
export function usePerfParams(): { range: PerfRange; offerId: string | null; set: (patch: { range?: PerfRange; offer?: string | null }) => void; query: string } {
  const [params, setParams] = useSearchParams();
  const raw = params.get("range");
  const range: PerfRange = isPerfRange(raw) ? raw : DEFAULT_RANGE;
  const offerId = params.get("offer") || null;
  const set = (patch: { range?: PerfRange; offer?: string | null }) => {
    const next = new URLSearchParams(params);
    if (patch.range) next.set("range", patch.range);
    if (patch.offer !== undefined) {
      if (patch.offer) next.set("offer", patch.offer);
      else next.delete("offer");
    }
    setParams(next, { replace: true });
  };
  const q = new URLSearchParams();
  q.set("range", range);
  if (offerId) q.set("offer", offerId);
  return { range, offerId, set, query: q.toString() };
}

/** The business's offers for the selector (DB2 `offers`); [] while loading or when the read fails (the selector keeps "All offers"). */
export function useOfferChoices(businessId: string | null): OfferChoice[] {
  const [list, setList] = useState<OfferChoice[]>([]);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchOfferChoices(businessId).then((r) => {
      if (alive && r.ok) setList(r.value);
    });
    return () => {
      alive = false;
    };
  }, [businessId]);
  return list;
}

export type Load = { state: "loading" } | { state: "error" } | { state: "ok"; series: Record<OfferMetric, PerfSeries | null> };

export function useOfferSeries(businessId: string | null, range: PerfRange, offerId: string | null, enabled: boolean): [Load, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${businessId ?? ""}|${range}|${offerId ?? ""}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    if (!enabled || !businessId) return;
    let alive = true;
    void Promise.all(OFFER_METRICS.map((mt) => fetchOfferPerformance(businessId, range, mt, offerId, false))).then((res) => {
      if (!alive) return;
      let load: Load;
      if (res.some((r) => !r.ok)) load = { state: "error" };
      else {
        const series = {} as Record<OfferMetric, PerfSeries | null>;
        OFFER_METRICS.forEach((mt, k) => {
          const r = res[k];
          series[mt] = r.ok ? r.value : null;
        });
        load = { state: "ok", series };
      }
      setGot({ key: `${businessId}|${range}|${offerId ?? ""}|${tick}`, load });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, offerId, tick, enabled]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return [got?.key === key ? got.load : { state: "loading" }, retry];
}

