import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchListingPerformance, type ListingPerformance } from "../../services/business-market/listing";
import { fetchPromotions, promoStartMarkers, type Promotion } from "../../services/business-market/promotions";
import { funnelStages, newClientsTotal, num, SOURCE_ORDER, summarize, topBooked, type ListingSource, type MarketKind } from "../../services/business-market/listingLogic";
import type { MarketPalette } from "../../theme/marketTokens";
import { useMarket } from "./MarketContext";
import { useMarketColors } from "./listingParts";
import { addDays, dayMonth, isoOf, mondayOf } from "./model";
import { t } from "../../i18n/core";

// B-MA.7 Performance · Listing: the readers and derived values (moved out of
// PerformanceTab.tsx unchanged; shared with the website viewport, WB-MA.4).

/**
 * The listing performance readers and everything the Listing group draws
 * from them (shared by the mobile ListingGroup and the website viewport's
 * Performance tab, WB-MA.4).
 */
export function useListingData() {
  const mk = useMarket();
  const { v, kind, business } = mk;
  const m = useMarketColors();
  const navigate = useNavigate();
  const [src, setSrc] = useState<ListingSource | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [data, setData] = useState<ListingPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = mk.backend.events === "live";
  const businessId = business?.id ?? null;
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchPromotions(businessId).then((r) => {
      if (alive && r.ok) setPromos(r.value);
    });
    return () => {
      alive = false;
    };
  }, [businessId]);

  useEffect(() => {
    if (!live || !businessId) return;
    let alive = true;
    void fetchListingPerformance(businessId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setData(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [live, businessId, tick]);

  const mkind: MarketKind = kind === "store" ? "store" : kind === "gym" ? "gym" : "classes";
  const weeks = data?.weeks.length ? data.weeks.map((w) => w.weekStart) : lastTwelveMondays();
  const s = summarize(data?.weeks ?? [], mkind);
  const top = topBooked(data?.top ?? []);
  const empty = s.empty;
  const dash = "–";
  const funnel = data?.funnel ?? { seen: 0, opened: 0, tappedBook: 0, booked: 0, bySource: {} };
  const stages = empty ? [] : funnelStages(funnel, v.stages, src);
  const chips = SOURCE_ORDER.filter((x) => x !== "featured" || (funnel.bySource.featured ?? 0) > 0);
  const colOf = (x: ListingSource) => srcColour(m, x);
  const doneWord = v.doneWord;
  const labels = weeks.map((w) => dayMonth(w));
  const today = isoOf(new Date());
  const markers = promos ? promoStartMarkers(promos, weeks, addDays(weeks[weeks.length - 1], 6), () => t("Offer on"), today).map((k) => ({ index: k.i, label: k.t })) : [];
  const nc = data ? newClientsTotal(data.newClients) : 0;
  // The item's own kind names it: a gym's top item can be a class or a pass.
  const topSub = top?.title
    ? top.kind === "product" || (top.kind === "other" && mkind === "store")
      ? t("orders for {title}, your top item", { title: top.title })
      : top.kind === "plan" || (top.kind === "other" && mkind === "gym")
        ? t("passes for {title}, your top pass", { title: top.title })
        : t("bookings for {title}, your top class", { title: top.title })
    : v.noneYet;
  const detail = stage === 0 && !empty ? funnel : null;
  const ledger = v.perfLabels.map((label, i) => ({
    label,
    value: empty ? dash : num([s.views, s.taps, s.done][i]),
    delta: i === 0 && !empty && s.early ? t("First 2 weeks") : "",
  }));

  return { mk, v, kind, business, m, navigate, src, setSrc, stage, setStage, data, error, tick, setTick, live, businessId, promos, mkind, weeks, s, top, empty, dash, funnel, stages, chips, colOf, doneWord, labels, today, markers, nc, topSub, detail, ledger };
}

export type ListingData = ReturnType<typeof useListingData>;


/** Search, Category browsing, Map, Direct link; Featured takes --pdark. */
function srcColour(m: MarketPalette, s: ListingSource): string {
  return s === "search" ? m.fill : s === "category" ? m.teal : s === "map" ? m.gold : s === "direct" ? m.tert : m.pdark;
}

/** The 12 Mondays ending this week (fixed last 12 weeks, V6-105). */
function lastTwelveMondays(): string[] {
  const end = mondayOf(isoOf(new Date()));
  return Array.from({ length: 12 }, (_, i) => addDays(end, (i - 11) * 7));
}
