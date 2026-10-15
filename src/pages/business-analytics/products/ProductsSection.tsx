import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpDown,
  BadgePercent,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  CircleStop,
  Clock,
  Copy,
  Eye,
  EyeOff,
  List,
  Package,
  Pencil,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  ScrubChart,
  type ScrubChartConfig,
} from "../../../components/charts/ScrubChart";
import { Toggle } from "../../../components/ui/Toggle";
import { useOnline } from "../../../hooks/useOnline";
import { clock12 } from "../../../utils/time12";
import {
  fetchBusinessTimezone,
  fetchSalesSummary,
  fetchStoreOrders,
  fetchTopProducts,
  type StoreOrder,
} from "../../../services/store/orders";
import type { Load } from "../../../services/store/backend";
import {
  deleteProduct,
  fetchStoreProducts,
  setProductVisible,
  type Product,
  type ProductsLoad,
} from "../../../services/store/products";
import {
  cancelPromotion,
  endPromotion,
  fetchPromotionRedemptions,
  fetchPromotionStats,
  fetchPromotions,
  promotionStatus,
  type PromoStats,
  type PromoStatus,
  type Promotion,
} from "../../../services/business-market/promotions";
import { bizKindOf, type BizKind } from "../../../components/business-more/kind";
import { nameTitle, promoText } from "../../business-market/promoModel";
import { vocabOf as marketVocab } from "../../business-market/vocab";
import { useAnalytics } from "../analyticsContext";
import { businessRange, dateOf, isoOf, previousOf, type AnalyticsRange } from "../analyticsRange";
import { AnHeaderRow, AnNumberBoxes } from "../members/anKit";
import {
  CtaSpacer,
  FixedCta,
  KitPop,
  useOpsToast,
} from "../../business-ops/store/opsKit";
import {
  useLive,
  useStoreBusiness,
} from "../../business-ops/store/storeShared";
import { ProductEditorSheet } from "../../business-ops/store/products/ProductEditorSheet";
import {
  SORTS,
  detailLead,
  discountLead,
  discountView,
  sortDiscounts,
  weekBars,
  weekStarts,
  weeklyUses,
  type DiscountFacts,
  type DiscountView,
  headlineOf,
  money,
  price,
  productSeries,
  sortRows,
  withServerSales,
  type Headline,
  type ServerSales,
  type ProductRow,
  type SortKey,
} from "./productsModel";
import "../shell/analytics.css";
import "./an11.css";

// AN11 · Analytics › Products (store). Analytics reads; the Products navbar
// tab manages (OURS-AN11-products-organisation, V6-54). Pages (routes under
// /app/business/analytics/products): index (OURS-AN11-products-index), all
// (OURS-AN11-all-listings), item/<id> (OURS-AN11-listing-detail), discounts
// (AN11-009 / -011 / -014) and discounts/<id> (AN11-015 to -020). The ONE
// product editor is Batch 4's ProductEditorSheet (V6-157). Sales are B11
// (store orders): until the server answers for them every sales number is
// "–" and the empty texts show, never a sample. Discounts are the B13
// promotions rows (B16: business_discounts is no longer read): status from
// the dates and stamps, uses from promotion_stats. Promotions are recorded,
// not taken off prices, so "Discount given" stays "–".

const BASE = "/app/business/analytics/products";

// M2 (SAFETY_AND_MONEY): "Sales" and "Revenue" here are order value (every
// placed, not-cancelled store_orders line, paid or not; AN11 / BU6-03 feed
// them from orders), not recorded payments. The drawn words stay; this line
// says what they count (OURS).
const ORDER_VALUE_NOTE =
  "Sales here are the value of orders placed and not cancelled, paid or not.";

/** B11 store_sales_summary (range + the period before) and store_top_products for the index. */
async function loadServerSales(
  businessId: string,
  shown: AnalyticsRange,
): Promise<Load<ServerSales>> {
  // The readers count days in the business's timezone: a preset ends on the
  // business's today, not this device's.
  const range = businessRange(shown, await fetchBusinessTimezone(businessId));
  const p = previousOf(range);
  const [now, prev, top] = await Promise.all([
    fetchSalesSummary(businessId, range.from, range.to),
    range.compare ? fetchSalesSummary(businessId, p.from, p.to) : null,
    fetchTopProducts(businessId, range.from, range.to, 5),
  ]);
  if (now.status !== "ok") return now;
  if (top.status !== "ok") return top;
  return {
    status: "ok",
    value: {
      now: { units: now.value.units, sales: now.value.sales },
      prev:
        prev && prev.status === "ok"
          ? { units: prev.value.units, sales: prev.value.sales }
          : null,
      top: top.value,
    },
  };
}

interface DiscountRow {
  id: string;
  label: string;
  status: PromoStatus;
  promo: Promotion;
  /** promotion_stats (gate marketing or revenue); null when not readable. */
  stats: PromoStats | null;
  f: DiscountFacts;
  /** This promotion's redemption days inside the window (newest first); null when not readable. */
  days: string[] | null;
}

interface DiscountsData {
  list: DiscountRow[];
  /** Every redemption day in the window (promotion_redemptions); null when not readable. */
  days: string[] | null;
  /** The window's first day: 16 Monday weeks (this period's 8 and the 8 before). */
  windowFrom: string;
}

const STATUS_WORD: Record<PromoStatus, string> = { live: "Active", scheduled: "Scheduled", paused: "Paused", ended: "Ended" };

/** B13 promotions (any insider reads them) with promotion_stats and promotion_redemptions: the AN11 discounts. */
async function fetchDiscounts(
  businessId: string,
): Promise<
  { status: "ok"; value: DiscountsData } | { status: "error"; offline: boolean }
> {
  const today = isoOf(new Date());
  const windowFrom = weekStarts(today, 16)[0];
  const [rows, stats, reds] = await Promise.all([
    fetchPromotions(businessId),
    fetchPromotionStats(businessId),
    fetchPromotionRedemptions(businessId, dateOf(windowFrom).toISOString()),
  ]);
  if (!rows.ok) return { status: "error", offline: typeof navigator !== "undefined" && navigator.onLine === false };
  const byPromo = new Map<string, string[]>();
  if (reds.ok)
    for (const r of reds.value) {
      const d = isoOf(new Date(r.redeemedAt));
      byPromo.set(r.promotionId, [...(byPromo.get(r.promotionId) ?? []), d]);
    }
  const list = rows.value.map((p) => {
    const status = promotionStatus(p, today);
    const st = stats.ok ? stats.value.get(p.id) ?? { uses: 0, useLimit: p.useLimit, people: 0, recorded: 0 } : null;
    return {
      id: p.id,
      label: p.name,
      status,
      promo: p,
      stats: st,
      f: { status, startsOn: p.startsOn, endsOn: p.endsOn, endedAt: p.endedAt, useLimit: p.useLimit, uses: st ? st.uses : null, showOnListing: p.showOnListing, audience: p.audience },
      days: reds.ok ? byPromo.get(p.id) ?? [] : null,
    };
  });
  return {
    status: "ok",
    value: { list: sortDiscounts(list), days: reds.ok ? reds.value.map((r) => isoOf(new Date(r.redeemedAt))) : null, windowFrom },
  };
}

/** SB: Active good, Scheduled pale / pDark, Expired soft / faint (Paused OURS: soft / faint). */
const StatusPill: React.FC<{ s: PromoStatus }> = ({ s }) => (
  <span className={"pa-status is-" + s}>
    <i aria-hidden />
    {STATUS_WORD[s]}
  </span>
);

export default function ProductsSection() {
  const params = useParams();
  const sub = (params["*"] ?? "").replace(/\/+$/, "");
  const navigate = useNavigate();
  const online = useOnline();
  const { range, setExport } = useAnalytics();
  const {
    businessId,
    businessType,
    ready,
    loadError,
    reload: reloadBiz,
  } = useStoreBusiness();
  const products = useLive<ProductsLoad>(
    businessId ? () => fetchStoreProducts(businessId) : null,
    0,
  );
  const orders = useLive<StoreOrder[]>(
    businessId ? () => fetchStoreOrders(businessId) : null,
    0,
  );
  const server = useLive<ServerSales>(
    businessId ? () => loadServerSales(businessId, range) : null,
    0,
    `${range.from}:${range.to}:${range.compare}`,
  );
  const discounts = useLive<DiscountsData>(
    businessId ? () => fetchDiscounts(businessId) : null,
    0,
  );
  const [toast, showToast] = useOpsToast();
  const [editor, setEditor] = useState<{
    open: boolean;
    product: Product | null;
    initial: { name: string; price: number | null; description: string } | null;
  }>({
    open: false,
    product: null,
    initial: null,
  });
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const p = products.state;
  const data = p.status === "ok" ? p.value : null;
  // "Pending" = the server has no store orders yet (B11): sales stay unknown.
  const orderList = orders.state.status === "ok" ? orders.state.value : null;
  const salesPending = orders.state.status === "pending";
  const h = useMemo(
    () =>
      data
        ? withServerSales(
            headlineOf(data.products, orderList, range),
            server.state.status === "ok" ? server.state.value : null,
            range,
          )
        : null,
    [data, orderList, range, server.state],
  );
  const dctx = useMemo<DiscountCtx>(() => {
    const kind = bizKindOf(businessType);
    return {
      kind,
      audienceNew: marketVocab(kind).audienceNew,
      products: new Map((data?.products ?? []).map((x) => [x.id, x.name])),
    };
  }, [businessType, data]);
  useEffect(() => {
    if (p.status === "ok") setLoadedAt(new Date());
  }, [p.status]);

  // Export CSV (AN11-009 S5): the products table for the range; sales cells empty while unknown.
  useEffect(() => {
    if (!h || sub) {
      setExport("", null);
      return;
    }
    setExport("centium-products.csv", [
      ["Product", "Price", "Visible", "Units sold", "Sales"],
      ...h.rows.map((r) => [
        r.product.name,
        r.product.price,
        r.product.visible ? "Yes" : "No",
        orderList ? r.units : null,
        orderList ? Math.round(r.revenue * 100) / 100 : null,
      ]),
    ]);
    return () => setExport("", null);
  }, [h, sub, orderList, setExport]);

  const openEditor = (
    product: Product | null,
    initial: typeof editor.initial = null,
  ) => setEditor({ open: true, product, initial });
  const saved = (msg: string) => {
    setEditor((e) => ({ ...e, open: false }));
    showToast(msg, sub === "");
    void products.refresh();
  };

  const offline =
    !online && loadedAt
      ? `Offline. Showing what was loaded at ${clock12(loadedAt)}.`
      : null;
  let body: React.ReactNode;
  if (loadError || p.status === "error") {
    body = (
      <ErrorCard
        text="Couldn't load your products."
        onRetry={() => (loadError ? reloadBiz() : products.reload())}
      />
    );
  } else if (
    !ready ||
    (businessId &&
      (p.status === "loading" || orders.state.status === "loading"))
  ) {
    body = <IndexSkeleton />;
  } else if (!businessId) {
    // K1 (AN11-001): products are published under a saved business profile.
    body = (
      <>
        <IndexView
          h={headlineOf([], null, range)}
          salesPending
          discounts={[]}
          onOpen={() => undefined}
          onAll={() => undefined}
          onDiscounts={() => undefined}
        />
        <p className="pa-note">
          Save your business profile first. Products are published under it.
        </p>
      </>
    );
  } else if (sub === "all") {
    body = (
      <AllProducts
        h={h!}
        data={data!}
        known={!!orderList}
        onOpen={(id) => navigate(`${BASE}/item/${id}`)}
      />
    );
  } else if (sub.startsWith("item/")) {
    const id = sub.slice(5);
    const row = h!.rows.find((r) => r.product.id === id);
    if (!row) return <Navigate to={BASE} replace />;
    body = (
      <ProductDetail
        row={row}
        orders={orderList}
        onEdit={() => openEditor(row.product)}
        onDuplicate={() =>
          openEditor(null, {
            name: `${row.product.name} (copy)`,
            price: row.product.price,
            description: row.product.description,
          })
        }
        onDeleted={(msg) => {
          showToast(msg, true);
          void products.refresh();
          navigate(BASE, { replace: true });
        }}
        writable={data!.stockShipped}
        onChanged={() => void products.refresh()}
      />
    );
  } else if (sub === "discounts" || sub.startsWith("discounts/")) {
    const ds = discounts.state;
    body =
      ds.status === "loading" ? (
        <IndexSkeleton />
      ) : ds.status !== "ok" ? (
        <ErrorCard
          text="Couldn't load discounts."
          onRetry={() => discounts.reload()}
        />
      ) : sub === "discounts" ? (
        <DiscountsView
          data={ds.value}
          ctx={dctx}
          onOpen={(id) => navigate(`${BASE}/discounts/${id}`)}
        />
      ) : (
        <DiscountDetail
          d={ds.value.list.find((x) => x.id === sub.slice(10)) ?? null}
          windowFrom={ds.value.windowFrom}
          ctx={dctx}
          onEnded={(msg) => {
            showToast(msg, false);
            void discounts.refresh();
            navigate(`${BASE}/discounts`, { replace: true });
          }}
        />
      );
  } else if (sub) {
    return <Navigate to={BASE} replace />;
  } else {
    body = (
      <IndexView
        h={h!}
        salesPending={salesPending || !orderList}
        discounts={
          discounts.state.status === "ok" ? discounts.state.value.list : null
        }
        onOpen={(id) => navigate(`${BASE}/item/${id}`)}
        onAll={() => navigate(`${BASE}/all`)}
        onDiscounts={() => navigate(`${BASE}/discounts`)}
      />
    );
  }

  const header =
    sub === "all" ? (
      <AnHeaderRow
        crumb="Products"
        backLabel="Back to Products"
        title="All products"
        onBack={() => navigate(BASE)}
      />
    ) : sub.startsWith("item/") ? (
      <AnHeaderRow
        crumb="Products"
        backLabel="Back to Products"
        title={
          h?.rows.find((r) => r.product.id === sub.slice(5))?.product.name ??
          "Product"
        }
        onBack={() => navigate(-1)}
      />
    ) : sub === "discounts" ? (
      <AnHeaderRow
        crumb="Products"
        backLabel="Back to Products"
        title="Discounts"
        onBack={() => navigate(BASE)}
      />
    ) : sub.startsWith("discounts/") ? (
      <AnHeaderRow
        crumb="Discounts"
        backLabel="Back to Discounts"
        title="Discount"
        onBack={() => navigate(`${BASE}/discounts`)}
      />
    ) : null;

  return (
    <div className="pa an-scope">
      {offline && <p className="pa-early">{offline}</p>}
      {header}
      {body}
      {sub === "" && (
        <>
          <CtaSpacer />
          <FixedCta
            label="Add product"
            plus
            onClick={() => openEditor(null)}
            disabled={!online || !businessId || !data}
          />
        </>
      )}
      {businessId && data && (
        <ProductEditorSheet
          open={editor.open}
          onClose={() => setEditor((e) => ({ ...e, open: false }))}
          businessId={businessId}
          businessType={businessType}
          stockShipped={data.stockShipped}
          product={editor.product}
          initial={editor.initial}
          onSaved={saved}
        />
      )}
      {toast}
    </div>
  );
}

// ---------------------------------------------------------------------------

const ErrorCard: React.FC<{ text: string; onRetry: () => void }> = ({
  text,
  onRetry,
}) => (
  <div className="pa-card">
    <div className="pa-err" role="alert">
      <p>{text}</p>
      <button type="button" className="tap" onClick={onRetry}>
        Retry
      </button>
    </div>
  </div>
);

const IndexSkeleton: React.FC = () => (
  <div role="status" aria-label="Loading your products">
    <div className="pa-card" style={{ padding: "18px 16px" }}>
      <span className="flex gap-[16px]">
        <span className="flex-1 flex flex-col items-center gap-[8px]">
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 30, height: 32 }}
          />
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 80, height: 11, borderRadius: 5 }}
          />
        </span>
        <span className="flex-1 flex flex-col items-center gap-[8px]">
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 30, height: 32 }}
          />
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 80, height: 11, borderRadius: 5 }}
          />
        </span>
      </span>
    </div>
    <div className="pa-card pa-hero">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="flex items-center gap-[10px]"
          style={{ minHeight: 52 }}
        >
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 22, height: 22, borderRadius: 999 }}
          />
          <span
            className="pa-sk animate-skeleton-pulse flex-1"
            style={{ height: 8, borderRadius: 999 }}
          />
        </span>
      ))}
    </div>
    <div className="pa-card" style={{ marginTop: 12 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="flex items-center gap-[12px]"
          style={{ minHeight: 72, padding: "12px 14px 12px 16px" }}
        >
          <span
            className="pa-sk animate-skeleton-pulse"
            style={{ width: 36, height: 36, borderRadius: 12 }}
          />
          <span
            className="pa-sk animate-skeleton-pulse flex-1"
            style={{ height: 14 }}
          />
        </span>
      ))}
    </div>
  </div>
);

const delta = (d: number | null, unit = "") =>
  d === null || d === 0 ? undefined : (
    <span className={"pa-delta" + (d < 0 ? " is-down" : "")}>
      {(d > 0 ? "+" : "−") + Math.abs(d) + unit}
    </span>
  );

const IndexView: React.FC<{
  h: Headline;
  salesPending: boolean;
  discounts: DiscountRow[] | null;
  onOpen: (id: string) => void;
  onAll: () => void;
  onDiscounts: () => void;
}> = ({ h, salesPending, discounts, onOpen, onAll, onDiscounts }) => {
  const noProducts = h.rows.length === 0;
  const best = h.top[0];
  const lead = noProducts
    ? "Publish your first product and its sales show up here."
    : h.sold === null
      ? "Sales show here once orders are on Centium."
      : h.early
        ? "Your first sales came in less than 4 weeks ago. Comparisons start after a full period."
        : best
          ? `${best.product.name} is your best seller, with ${best.units} sold this period.`
          : "No sales yet this period. Your best seller shows here once orders come in.";
  // Top 3 by units sold, newest first while nothing has sold (index row 6).
  const top3 = [...h.rows]
    .filter((r) => r.product.visible)
    .sort((a, b) => b.units - a.units)
    .slice(0, 3);
  const mx = Math.max(
    1,
    ...h.top.map((r) => Math.max(r.units, r.prevUnits ?? 0)),
  );
  const liveN = discounts?.filter((d) => d.status === "live").length ?? 0;
  const usesN = discounts?.reduce((a, d) => a + (d.stats?.uses ?? 0), 0) ?? 0;
  return (
    <>
      {h.early && (
        <p className="pa-early">
          Early data: your first sales were less than 4 weeks ago.
        </p>
      )}
      <section className="pa-card" aria-label="Products this period">
        <AnNumberBoxes
          boxes={[
            {
              label: "Live products",
              value: noProducts ? "0" : String(h.live),
            },
            {
              label: "Items sold",
              value: h.sold === null || noProducts ? null : String(h.sold),
              delta: delta(h.soldDelta),
            },
          ]}
        />
        <div className="pa-cell3">
          <p className="flex items-baseline justify-center gap-[6px]">
            <span
              className={
                "pa-num" + (h.sales === null || noProducts ? " is-none" : "")
              }
            >
              {h.sales === null || noProducts ? "–" : money(h.sales)}
            </span>
            {h.salesDeltaPct !== null && h.salesDeltaPct !== 0 && (
              <span
                className={"pa-delta" + (h.salesDeltaPct < 0 ? " is-down" : "")}
              >
                {(h.salesDeltaPct > 0 ? "+" : "−") + Math.abs(h.salesDeltaPct)}%
              </span>
            )}
          </p>
          <p className="pa-numl">Sales this period</p>
        </div>
        <p className="pa-lead">{lead}</p>
        <p className="pa-ordernote">{ORDER_VALUE_NOTE}</p>
      </section>

      <section className="pa-card pa-hero" aria-label="What's selling?">
        <p className="pa-hero-t">What's selling?</p>
        <p className="pa-hero-s">
          {h.top.length
            ? "Your top 5 items by units sold this period."
            : "Your top sellers will rank here."}
        </p>
        {h.top.length ? (
          <>
            <div role="list" aria-label="Top sellers" className="pa-top">
              {h.top.map((r, i) => {
                const d = r.prevUnits === null ? null : r.units - r.prevUnits;
                return (
                  <button
                    key={r.product.id}
                    type="button"
                    role="listitem"
                    className="pa-top-row tap"
                    aria-label={`${i + 1}. ${r.product.name}, ${r.units} sold`}
                    onClick={() => onOpen(r.product.id)}
                  >
                    <span className={"pa-rank" + (i === 0 ? " is-first" : "")}>
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="pa-top-n">{r.product.name}</span>
                      <span className="pa-bar" aria-hidden>
                        <span
                          className={i === 0 ? "is-first" : undefined}
                          style={{
                            width: `${((r.units / mx) * 100).toFixed(1)}%`,
                          }}
                        />
                        {r.prevUnits !== null && (
                          <i
                            style={{
                              left: `calc(${((r.prevUnits / mx) * 100).toFixed(1)}% - 1px)`,
                            }}
                          />
                        )}
                      </span>
                    </span>
                    <span className="pa-top-v">
                      <b>{r.units}</b>
                      <span
                        className={
                          d === null || d === 0
                            ? undefined
                            : d > 0
                              ? "is-up"
                              : "is-down"
                        }
                      >
                        {d === null
                          ? "sold"
                          : d > 0
                            ? `↑ +${d} vs last`
                            : d < 0
                              ? `↓ −${Math.abs(d)} vs last`
                              : "same as last"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pa-legend" aria-hidden>
              <span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: "var(--an-primary)",
                  }}
                />
                Sold this period
              </span>
              <span>
                <span
                  style={{
                    width: 2,
                    height: 10,
                    borderRadius: 2,
                    background: "var(--an-tert)",
                  }}
                />
                Previous period
              </span>
            </div>
            <p className="pa-cap">
              Ranked by units sold. The grey mark shows last period, so you can
              see who's rising.
            </p>
          </>
        ) : (
          <div className="pa-ladder">
            <span className="pa-ladder-dots" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
            <p>
              No sales yet. Publish a product and your best sellers appear here.
            </p>
          </div>
        )}
      </section>

      <p className="pa-label">Your products</p>
      <section className="pa-card" aria-label="Your products">
        {noProducts ? (
          <div className="pa-ix">
            <span className="pa-tile is-faint">
              <Package size={17} strokeWidth={2.2} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="pa-ix-t">No products yet</span>
              <span className="pa-ix-l">
                Publish your first product and it shows here.
              </span>
            </span>
            <span />
            <span />
          </div>
        ) : (
          <>
            {top3.map((r) => (
              <button
                key={r.product.id}
                type="button"
                className="pa-ix tap"
                aria-label={`${r.product.name}, ${salesPending ? "sales not known yet" : `${r.units} sold`}`}
                onClick={() => onOpen(r.product.id)}
              >
                <span className="pa-tile">
                  <Package size={17} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="pa-ix-t">{r.product.name}</span>
                  <span className="pa-ix-l">{`${price(r.product.price)} · Active`}</span>
                </span>
                <span className="pa-ix-v">
                  <b className={salesPending ? "is-none" : undefined}>
                    {salesPending ? "–" : r.units}
                  </b>
                  <span>sold</span>
                </span>
                <span className="pa-chev">
                  <ChevronRight size={16} aria-hidden />
                </span>
              </button>
            ))}
            <button type="button" className="pa-ix tap" onClick={onAll}>
              <span className="pa-tile is-soft">
                <List size={17} strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="pa-ix-t">{`See all ${h.rows.length} ${h.rows.length === 1 ? "product" : "products"}`}</span>
                <span className="pa-ix-l">Search and sort every product.</span>
              </span>
              <span />
              <span className="pa-chev">
                <ChevronRight size={16} aria-hidden />
              </span>
            </button>
          </>
        )}
      </section>

      <button
        type="button"
        className="pa-card pa-ix tap"
        style={{ marginTop: 12 }}
        aria-label={`Discounts: ${liveN} live`}
        onClick={onDiscounts}
      >
        <span className="pa-tile">
          <BadgePercent size={17} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="pa-ix-t">Discounts</span>
          <span className="pa-ix-l">
            {liveN
              ? usesN
                ? `Used ${usesN} ${usesN === 1 ? "time" : "times"} so far.`
                : "No uses recorded yet."
              : "Deals shown on your listing."}
          </span>
        </span>
        <span className="pa-ix-v">
          <b className={liveN ? undefined : "is-none"}>{liveN}</b>
          <span>live</span>
        </span>
        <span className="pa-chev">
          <ChevronRight size={16} aria-hidden />
        </span>
      </button>
    </>
  );
};

/** Stock line / pill (OURS-AN11-all-listings row 6, OP1 tones). */
const StockPill: React.FC<{ p: Product }> = ({ p }) =>
  p.stock === null ? null : p.stock <= 0 ? (
    <span className="pa-pill is-out">Out of stock</span>
  ) : p.stock < 5 ? (
    <span className="pa-pill is-low">Low stock</span>
  ) : null;

const AllProducts: React.FC<{
  h: Headline;
  data: ProductsLoad;
  known: boolean;
  onOpen: (id: string) => void;
}> = ({ h, data, known, onOpen }) => {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("sold");
  const [open, setOpen] = useState(false);
  const newest = useMemo(
    () => new Map(data.products.map((p, i) => [p.id, i])),
    [data.products],
  );
  const rows = sortRows(h.rows, sort, newest).filter(
    (r) =>
      !q.trim() ||
      r.product.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <>
      <label className="pa-search">
        <Search size={16} aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
        />
        {q && (
          <button
            type="button"
            className="pa-clear tap"
            aria-label="Clear the search"
            onClick={() => setQ("")}
          >
            <X size={15} aria-hidden />
          </button>
        )}
      </label>
      <div className="pa-tools">
        <button
          type="button"
          className={"pa-btn tap" + (open ? " is-open" : "")}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ArrowUpDown
            size={14}
            aria-hidden
            style={{ color: "var(--an-faint)" }}
          />
          <span>Sort: {SORTS.find((s) => s.key === sort)?.label}</span>
          <ChevronDown size={14} aria-hidden />
        </button>
      </div>
      {open && (
        <div role="listbox" aria-label="Sort by" className="pa-list">
          <p className="pa-list-l">Sort by</p>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="option"
              aria-selected={s.key === sort}
              className="pa-opt tap"
              onClick={() => {
                setSort(s.key);
                setOpen(false);
              }}
            >
              <span>{s.label}</span>
              {s.key === sort && (
                <Check size={15} strokeWidth={2.6} aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
      {h.rows.length === 0 ? (
        <div className="pa-none">
          <b>No products yet</b>
          <p>Create your first product to start selling on Explore.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="pa-none">
          <b>No products match "{q.trim()}"</b>
          <p>Try a shorter name or clear the search.</p>
        </div>
      ) : (
        <>
          <p className="pa-group-l">
            {(q.trim() ? "Results · " : "All products · ") + rows.length}
          </p>
          <div className="pa-items">
            {rows.map((r) => (
              <ProductCard
                key={r.product.id}
                r={r}
                known={known}
                onOpen={() => onOpen(r.product.id)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
};

const ProductCard: React.FC<{
  r: ProductRow;
  known: boolean;
  onOpen: () => void;
}> = ({ r, known, onOpen }) => {
  const p = r.product;
  const d = r.prevUnits === null ? null : r.units - r.prevUnits;
  return (
    <button
      type="button"
      className={"pa-pcard tap" + (p.visible ? "" : " is-hidden")}
      aria-label={`${p.name}, ${price(p.price)}, ${p.visible ? "Active" : "Hidden"}`}
      onClick={onOpen}
    >
      <span className="pa-ptile">
        <Package size={18} strokeWidth={2.2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="pa-pname">
          <b>{p.name}</b>
          <span className={"pa-pill " + (p.visible ? "is-good" : "is-soft")}>
            {p.visible ? "Active" : "Hidden"}
          </span>
          <StockPill p={p} />
        </span>
        <span className="pa-price">{price(p.price)}</span>
        {(p.description || p.stock !== null) && (
          <span className="pa-desc">
            {[p.description, p.stock !== null ? `${p.stock} in stock` : ""]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        <span className="pa-stats">
          <span>
            <b className={known ? undefined : "is-none"}>
              {known ? r.units : "–"}
            </b>
            <i>sold this period</i>
          </span>
          <span>
            <b className={known ? undefined : "is-none"}>
              {known ? money(r.revenue) : "–"}
            </b>
            <i>sales</i>
          </span>
          {known && d !== null && (
            <span>
              <b className={d > 0 ? "is-up" : d < 0 ? "is-down" : undefined}>
                {d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0"}
              </b>
              <i>vs last</i>
            </span>
          )}
        </span>
      </span>
      <span className="pa-chev self-center">
        <ChevronRight size={16} aria-hidden />
      </span>
    </button>
  );
};

const ProductDetail: React.FC<{
  row: ProductRow;
  orders: StoreOrder[] | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDeleted: (msg: string) => void;
  /** B11 visible is writable here (false on a database without B11). */
  writable: boolean;
  onChanged: () => void;
}> = ({ row, orders, onEdit, onDuplicate, onDeleted, writable, onChanged }) => {
  const online = useOnline();
  const { range } = useAnalytics();
  const p = row.product;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useOpsToast();
  const s = useMemo(
    () => (orders ? productSeries(p.id, orders, range) : null),
    [orders, p.id, range],
  );
  const known = !!s;
  const dl = (a: number, b: number, f: (v: number) => string) =>
    !known || !b ? "" : a > b ? "+" + f(a - b) : a < b ? "−" + f(b - a) : "";
  const sum: [string, string, string][] = [
    [
      "Total units",
      known && s!.totU ? String(s!.totU) : "–",
      known ? dl(s!.totU, s!.prevTotU, String) : "",
    ],
    [
      "Total revenue",
      known && s!.totU ? money(s!.totR) : "–",
      known ? dl(s!.totR, s!.prevTotR, (v) => money(v)) : "",
    ],
    [
      "Average price",
      known && s!.totU ? "$" + (s!.totR / s!.totU).toFixed(2) : "–",
      "",
    ],
    [
      "Best week",
      known && s!.totU ? s!.labels[s!.bestIdx].replace("Week of ", "") : "–",
      known && s!.totU ? `${s!.units[s!.bestIdx]} sold` : "",
    ],
  ];
  const tipFor = (i: number, rev: boolean) =>
    !s
      ? []
      : [
          { l: "Units", v: String(s.units[i]) },
          { l: "Revenue", v: money(s.revenue[i]) },
          {
            l: "Avg price",
            v: s.units[i] ? "$" + (s.revenue[i] / s.units[i]).toFixed(2) : "–",
          },
          {
            l: "Last period",
            v: rev ? money(s.prevRevenue[i]) : String(s.prevUnits[i]),
            prev: true,
          },
        ];
  const cfg: ScrubChartConfig = {
    vh: 140,
    labels: s?.labels ?? [],
    xl: s?.xl ?? [],
    aria: `Sales by week for ${p.name}`,
    curLabel: "This period",
    prevLabel: "Previous period",
    caption:
      "Is it selling more or less than before? Drag across the chart to read each week, tap to pin one.",
    earlyText: "The trend starts after 2 weeks of sales.",
    emptyText: "Sales show here once it starts selling.",
    modes: [
      {
        t: "Revenue",
        unit: "$ per week",
        cur: s?.revenue ?? [],
        prev: s?.prevRevenue,
        fmt: (v) => "$" + Math.round(v),
        tips: (s?.revenue ?? []).map((_, i) => tipFor(i, true)),
        step: 50,
      },
      {
        t: "Units sold",
        unit: "units per week",
        cur: s?.units ?? [],
        prev: s?.prevUnits,
        fmt: (v) => String(Math.round(v)),
        tips: (s?.units ?? []).map((_, i) => tipFor(i, false)),
        step: 2,
      },
    ],
  };
  const hideShow = async () => {
    const r = await setProductVisible(p.id, !p.visible);
    if (r.ok) onChanged();
    showToast(
      r.ok
        ? p.visible
          ? "Hidden from Explore."
          : "Back on Explore."
        : r.pending
          ? "Hiding products is coming soon."
          : "Couldn't save. Try again.",
      false,
    );
  };
  const acts = [
    { icon: Pencil, t: "Edit", onClick: onEdit, disabled: !online },
    { icon: Copy, t: "Duplicate", onClick: onDuplicate, disabled: !online },
    {
      icon: p.visible ? EyeOff : Eye,
      t: p.visible ? "Hide" : "Show",
      onClick: hideShow,
      disabled: !online || !writable,
    },
    {
      icon: Trash2,
      t: "Delete",
      onClick: () => setConfirm(true),
      disabled: !online,
      high: true,
    },
  ];
  return (
    <>
      <section className="pa-card pa-sum" aria-label={p.name}>
        <div className="pa-sum-top">
          <span className="pa-sum-tile">
            <Package size={21} strokeWidth={2.1} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="pa-sum-n">{p.name}</p>
            <p className="pa-sum-p">
              <b>{price(p.price)}</b>
              <span>
                {known
                  ? `${row.units} sold this period`
                  : "Sales show here once orders are on Centium."}
              </span>
            </p>
            <p className="pa-sum-m">
              <i className={p.visible ? undefined : "is-hidden"} aria-hidden />
              {p.visible ? "Listed on Explore" : "Hidden from Explore"}
            </p>
          </div>
        </div>
        <div className="pa-acts">
          {acts.map((a) => (
            <button
              key={a.t}
              type="button"
              className={"pa-act tap" + (a.high ? " is-high" : "")}
              onClick={a.onClick}
              disabled={a.disabled}
            >
              <a.icon size={18} aria-hidden />
              {a.t}
            </button>
          ))}
        </div>
        {!writable && (
          <p className="pa-note" style={{ marginTop: 0, marginBottom: 8 }}>
            Hide and show are coming soon.
          </p>
        )}
      </section>

      <section className="pa-card pa-sales" aria-label="Sales">
        <div className="pa-sales-in">
          <p className="pa-sales-t">Sales</p>
          <ScrubChart
            cfg={cfg}
            empty={!s || s.totU === 0}
            early={!!s && s.totU > 0 && s.early}
          />
        </div>
        <div className="pa-grid4">
          {sum.map(([l, v, d]) => (
            <div key={l}>
              <p>
                <b className={v === "–" ? "is-none" : undefined}>{v}</b>
                {d && (
                  <em
                    className={
                      d.startsWith("+")
                        ? "is-up"
                        : d.startsWith("−")
                          ? "is-down"
                          : undefined
                    }
                  >
                    {d}
                  </em>
                )}
              </p>
              <p>{l}</p>
            </div>
          ))}
        </div>
        <p className="pa-lead" style={{ padding: "12px 16px" }}>
          {known
            ? detailLead(p.visible, s)
            : "Sales show here once orders are on Centium."}
        </p>
        <p className="pa-ordernote" style={{ padding: "0 16px 12px" }}>
          {ORDER_VALUE_NOTE}
        </p>
      </section>

      <section className="pa-card pa-details" aria-label="Details">
        <p className="pa-details-l">Details</p>
        {p.description && <p className="pa-details-d">{p.description}</p>}
        {p.stock !== null && (
          <div className="pa-drow">
            <span className="flex-1 min-w-0">
              <span className="pa-drow-t">In stock</span>
            </span>
            <span className="pa-drow-v">
              {p.stock}
              <StockPill p={p} />
            </span>
          </div>
        )}
        <div className="pa-drow">
          <span className="flex-1 min-w-0">
            <span className="pa-drow-t">
              {p.visible ? "Visible on Explore" : "Hidden from Explore"}
            </span>
            <span className="pa-drow-s">
              {writable
                ? p.visible
                  ? "Clients can find and buy it."
                  : "Only you can see it."
                : "Coming soon"}
            </span>
          </span>
          <Toggle
            size="business-lg"
            checked={p.visible}
            onChange={() => void hideShow()}
            disabled={!writable || !online}
            label="Visible on Explore"
          />
        </div>
      </section>

      <KitPop
        open={confirm}
        icon={Trash2}
        title={`Delete ${p.name}?`}
        body="It comes off Explore. Past sales stay in your numbers."
        action="Delete"
        keep="Keep it"
        busy={busy}
        error={err}
        onKeep={() => {
          setConfirm(false);
          setErr(null);
        }}
        onAction={async () => {
          setBusy(true);
          setErr(null);
          const r = await deleteProduct(p.id);
          setBusy(false);
          if (!r.ok) {
            setErr("Couldn't delete the product. Try again.");
            return;
          }
          setConfirm(false);
          onDeleted(`${p.name} deleted.`);
        }}
      />
      {toast}
    </>
  );
};

// ---------------------------------------------------------------------------
// Discounts (AN11-009 to -020, AnStoreOfferingsV2 isDisc / isDiscD): the
// B13 promotions rows. Status from the dates and stamps, uses from
// promotion_stats, the weekly bars from promotion_redemptions (this week and
// the 7 before; the dashed line the 8 before those). Promotions are recorded
// against payments, not taken off prices, so "Discount given" is "–"
// (B8_B16_REVIEW #24) and there is no code chip (#15).

interface DiscountCtx {
  kind: BizKind;
  /** The type's "New customers only" (Marketplace vocabulary). */
  audienceNew: string;
  /** business_offerings id → title, for "Applies to". */
  products: Map<string, string>;
}

const amountOf = (p: Promotion, kind: BizKind) => promoText(kind, p.type, p.value).chip;

/** "Applies to" from target_kind: the item (or "Any item"), then who it is for. */
function appliesOf(p: Promotion, ctx: DiscountCtx): string {
  const what =
    p.targetKind === "any" || !p.targetId
      ? "Any item"
      : p.targetKind === "day_pass"
        ? "Day pass"
        : p.targetKind === "product"
          ? ctx.products.get(p.targetId) ?? nameTitle(p.name)
          : nameTitle(p.name);
  return `${what}, ${p.audience === "new" ? ctx.audienceNew.toLowerCase() : "everyone"}`;
}

const DL_CLASS: Record<DiscountView["dlTone"], string> = { soon: "is-soon", normal: "is-normal", scheduled: "is-scheduled", ended: "is-ended" };

/** The two-cell headline (H(): "–" and "0" in tertiary ink; the delta here is "of {limit}" in faint). */
const DHead: React.FC<{ cells: [{ v: string; d?: string; l: string }, { v: string; d?: string; l: string }] }> = ({ cells }) => (
  <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)" }}>
    {cells.map((c, i) => (
      <React.Fragment key={c.l}>
        {i === 1 && <span aria-hidden className="pa-dhead-sep" />}
        <div className="pa-dhead">
          <p>
            <span className={"pa-num" + (c.v === "–" || c.v === "0" ? " is-none" : "")}>{c.v}</span>
            {c.d && <span className="pa-dhead-d">{c.d}</span>}
          </p>
          <p className="pa-numl">{c.l}</p>
        </div>
      </React.Fragment>
    ))}
  </div>
);

/** mkChart: 8 weekly bars (last bar pDark), the previous 8 weeks dashed, legend, y and x labels. */
const WeekChart: React.FC<{ vals: number[]; prev: number[]; aria: string }> = ({ vals, prev, aria }) => {
  const ch = weekBars(vals, prev);
  return (
    <div role="img" aria-label={aria} className="pa-wk">
      <div className="pa-wk-leg" aria-hidden>
        <span>
          <i className="pa-wk-sq" />
          This period
        </span>
        <span>
          <i className="pa-wk-dash" />
          Previous period
        </span>
      </div>
      <div className="relative">
        <svg width="100%" height="118" viewBox="0 0 300 118" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} aria-hidden>
          <line x1="24" x2="300" y1="10" y2="10" stroke="var(--an-grid)" strokeWidth="1" />
          <line x1="24" x2="300" y1="55" y2="55" stroke="var(--an-grid)" strokeWidth="1" />
          <line x1="24" x2="300" y1="100" y2="100" stroke="var(--pa-axis)" strokeWidth="1" />
          {ch.bars.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={b.last ? "var(--an-pdark)" : "var(--an-primary)"} />
          ))}
          <path d={ch.ghost} fill="none" stroke="var(--pa-axis)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
        </svg>
        <span className="pa-wk-y" style={{ top: 3 }} aria-hidden>
          {ch.ymax}
        </span>
        <span className="pa-wk-y" style={{ top: 48 }} aria-hidden>
          {ch.ymid}
        </span>
        <span className="pa-wk-y" style={{ top: 93 }} aria-hidden>
          0
        </span>
      </div>
      <div className="pa-wk-x" aria-hidden>
        <span>{vals.length} weeks ago</span>
        <span>This week</span>
      </div>
    </div>
  );
};

/** This period's 8 weeks and the 8 before, from redemption days. */
function weekSeries(days: string[], today: string): { vals: number[]; prev: number[] } {
  const w = weekStarts(today, 16);
  const all = weeklyUses(days, w);
  return { prev: all.slice(0, 8), vals: all.slice(8) };
}

/** Uses label + 6px bar (dInfo use / w / barCol). */
const UsesBar: React.FC<{ v: DiscountView }> = ({ v }) =>
  v.use === null ? null : (
    <div className="pa-uses">
      <div className="pa-uses-h">
        <span>Uses</span>
        <b>{v.use}</b>
      </div>
      <div className="pa-uses-t">
        <div className={"pa-uses-f is-" + v.useTone} style={{ width: `${v.usePct.toFixed(1)}%` }} />
      </div>
    </div>
  );

const DiscountsView: React.FC<{
  data: DiscountsData;
  ctx: DiscountCtx;
  onOpen: (id: string) => void;
}> = ({ data, ctx, onOpen }) => {
  const navigate = useNavigate();
  // 3 rows, "See all {n}" shows up to 20, then "Show more" 20 at a time (AN11-011 O2).
  const [shown, setShown] = useState(3);
  const today = isoOf(new Date());
  const list = data.list;
  const n = list.length;
  const live = list.filter((d) => d.status === "live").length;
  const views = list.map((d) => ({ d, v: discountView(d.f, today, d.days?.[0] ?? null, data.windowFrom) }));
  const soon = views.filter((x) => x.v.soon);
  const unused = views.filter((x) => x.v.unused);
  const top = [...list].filter((d) => (d.stats?.uses ?? 0) > 0).sort((a, b) => (b.stats?.uses ?? 0) - (a.stats?.uses ?? 0))[0];
  // O5: the first discount went live less than 4 weeks ago.
  const started = list.filter((d) => d.status !== "scheduled").map((d) => d.f.startsOn).sort()[0];
  const early = !!started && daysSince(started, today) < 28;
  const recorded = " Discounts are recorded on payments, so the amount given isn't counted.";
  const lead = !n
    ? "Add a discount and it shows on your listing."
    : early
      ? "Your first discount went live less than 4 weeks ago. Comparisons start after a full period."
      : top
        ? `${top.label} is used the most.${recorded}`
        : `No uses recorded yet.${recorded}`;
  const flags: { col: string; n: number; t: string; s: string }[] = [];
  if (soon.length) {
    const f = soon[0];
    const left = f.d.f.endsOn ? daysSince(today, f.d.f.endsOn) : 0;
    flags.push({
      col: "var(--an-caution)",
      n: soon.length,
      t: "Ends soon",
      s:
        soon.length === 1
          ? left <= 0
            ? `${f.d.label} ends today.`
            : `${f.d.label} ends on ${f.v.to}, in ${left} ${left === 1 ? "day" : "days"}.`
          : `${f.d.label} and ${soon.length - 1} more end in the next 7 days.`,
    });
  }
  if (unused.length) {
    const f = unused[0];
    flags.push({
      col: "var(--an-pdark)",
      n: unused.length,
      t: "Unused",
      s:
        unused.length === 1
          ? `${f.d.label} has had no uses in ${f.v.idleDays !== null ? `${f.v.idleDays} days` : "the last 30 days"}. Check it shows on the right items.`
          : `${f.d.label} and ${unused.length - 1} more have had no uses in 30 days. Check they show on the right items.`,
    });
  }
  const ch = data.days ? weekSeries(data.days, today) : null;
  const rows = views.slice(0, shown);
  return (
    <>
      <section className="pa-card" aria-label="Discounts this period">
        <DHead
          cells={[
            { v: String(live), l: "Live discounts" },
            { v: "–", l: "Discount given" },
          ]}
        />
        <p className="pa-lead">{lead}</p>
        {!n && (
          <button
            type="button"
            className="pa-addbtn tap"
            onClick={() => navigate("/app/business/products?tab=promotions")}
          >
            <BadgePercent size={14} aria-hidden />
            Add a discount
          </button>
        )}
      </section>
      <section className="pa-card pa-dchart" aria-label="Discount use">
        <p className="pa-dchart-t">Discount use</p>
        <p className="pa-dchart-c">
          How often are discounts used? Redemptions each week; the dashed line is the previous 8 weeks.
        </p>
        {n && ch ? (
          <WeekChart vals={ch.vals} prev={ch.prev} aria="Discount redemptions per week" />
        ) : (
          <div className="pa-dempty">
            <span className="pa-dempty-tile">
              <BadgePercent size={22} aria-hidden />
            </span>
            <b>{n ? "Uses not shown" : "No discounts yet"}</b>
            <p>
              {n
                ? "Uses show here for people with the Marketing or Revenue permission."
                : "Add one in Products, Promotions and its uses show here."}
            </p>
          </div>
        )}
      </section>
      {flags.length > 0 && (
        <section className="pa-card pa-flags" aria-label="Flags">
          {flags.map((fl, i) => (
            <div key={fl.t} className="pa-flag-row" style={{ borderTop: i ? "1px solid var(--an-divider)" : "none" }}>
              <span className="pa-flag-rail" style={{ background: fl.col }} aria-hidden />
              <p className="pa-flag-n" style={{ color: fl.col }}>
                {fl.n}
              </p>
              <div className="min-w-0">
                <p className="pa-flag-t">{fl.t}</p>
                <p className="pa-flag-s">{fl.s}</p>
              </div>
            </div>
          ))}
        </section>
      )}
      {n > 0 && (
        <>
          <p className="pa-label" style={{ margin: "16px 4px 8px" }}>
            All discounts · {n}
          </p>
          <div className="pa-items" style={{ gap: 8 }}>
            {rows.map(({ d, v }) => {
              const amt = amountOf(d.promo, ctx.kind);
              const fl = [v.soon && "Ends soon", v.unused && "Unused"].filter(Boolean) as string[];
              return (
                <button
                  key={d.id}
                  type="button"
                  className={"pa-drowcard tap" + (v.soon ? " is-soon" : "") + (d.status === "ended" ? " is-ended" : "")}
                  aria-label={[d.label, amt, STATUS_WORD[d.status], v.daysLeft, v.use, "Discount given not known", ...fl].filter(Boolean).join(", ")}
                  onClick={() => onOpen(d.id)}
                >
                  <div className="pa-drow-in">
                    <div className="pa-drow-top">
                      <div className="flex-1 min-w-0">
                        <span className="pa-drow-name block">{d.label}</span>
                        <span className="pa-chips">
                          <span className="pa-amt">{amt}</span>
                        </span>
                      </div>
                      <StatusPill s={d.status} />
                    </div>
                    <div className="pa-dmeta">
                      <span className="pa-dmeta-g">
                        <Tag size={14} aria-hidden />
                      </span>
                      <span className="min-w-0">{appliesOf(d.promo, ctx)}</span>
                      <span className="pa-dmeta-g">
                        <Calendar size={14} aria-hidden />
                      </span>
                      <span className="pa-dmeta-dates">
                        <span className="whitespace-nowrap">{v.dates}</span>
                        <span className={"pa-dl " + DL_CLASS[v.dlTone]}>{v.daysLeft}</span>
                      </span>
                    </div>
                    <UsesBar v={v} />
                  </div>
                  <div className="pa-dfoot">
                    <span>Discount given</span>
                    <b>–</b>
                    <span className="flex-1" />
                    {v.soon && (
                      <span className="pa-fpill is-soon">
                        <Clock size={11} strokeWidth={2.4} aria-hidden />
                        Ends soon
                      </span>
                    )}
                    {v.unused && (
                      <span className="pa-fpill is-unused">
                        <CircleDashed size={11} strokeWidth={2.4} aria-hidden />
                        Unused
                      </span>
                    )}
                    <span className="pa-chev">
                      <ChevronRight size={16} aria-hidden />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {n > shown && (
            <button
              type="button"
              className="pa-more tap"
              onClick={() => setShown((s) => (s < 20 ? 20 : s + 20))}
            >
              {shown < 20 ? `See all ${n}` : "Show more"}
              <ChevronRight size={14} aria-hidden />
            </button>
          )}
        </>
      )}
    </>
  );
};

/** Whole days from a to b. */
const daysSince = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86_400_000);

const DiscountDetail: React.FC<{
  d: DiscountRow | null;
  windowFrom: string;
  ctx: DiscountCtx;
  onEnded: (msg: string) => void;
}> = ({ d, windowFrom, ctx, onEnded }) => {
  const navigate = useNavigate();
  const online = useOnline();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!d) return <Navigate to={`${BASE}/discounts`} replace />;
  const today = isoOf(new Date());
  const promos = () => navigate("/app/business/products?tab=promotions");
  const v = discountView(d.f, today, d.days?.[0] ?? null, windowFrom);
  const uses = d.f.uses;
  const lim = d.f.useLimit;
  const scheduled = d.status === "scheduled";
  const ended = d.status === "ended";
  const ch = d.days ? weekSeries(d.days, today) : null;
  const acts = ended
    ? [
        { k: "dup", t: "Duplicate", I: Copy, on: promos },
        { k: "edit", t: "Edit", I: Pencil, on: promos },
      ]
    : [
        { k: "edit", t: "Edit", I: Pencil, on: promos },
        { k: "dup", t: "Duplicate", I: Copy, on: promos },
      ];
  return (
    <>
      <section className="pa-card pa-dsum" aria-label={d.label}>
        <div className="pa-drow-top">
          <div className="flex-1 min-w-0">
            <p className="pa-dsum-n">{d.label}</p>
            <span className="pa-chips">
              <span className="pa-amt">{amountOf(d.promo, ctx.kind)}</span>
            </span>
          </div>
          <StatusPill s={d.status} />
        </div>
        <div className="pa-dacts">
          {acts.map((a) => (
            <button key={a.k} type="button" className="pa-dact tap" onClick={a.on}>
              <a.I size={14} aria-hidden />
              {a.t}
            </button>
          ))}
          {!ended && (
            <button
              type="button"
              className="pa-dact is-high tap"
              disabled={!online}
              onClick={() => setConfirm(true)}
            >
              <CircleStop size={14} aria-hidden />
              {scheduled ? "Cancel" : "End now"}
            </button>
          )}
        </div>
      </section>
      <section className="pa-card" style={{ marginTop: 12 }} aria-label="Uses">
        <DHead
          cells={[
            { v: uses === null ? "–" : String(uses), d: lim ? `of ${lim}` : undefined, l: "Uses" },
            { v: "–", l: "Discount given" },
          ]}
        />
        <p className="pa-lead">{discountLead(d.f, v, today, ctx.audienceNew)}</p>
      </section>
      <section className="pa-card pa-valid" aria-label="Validity">
        <p className="pa-valid-t">Validity</p>
        <div className="pa-vbar" aria-hidden>
          {v.elapsed > 0 && <div className="pa-vbar-f" style={{ width: `${v.elapsed.toFixed(1)}%` }} />}
          {v.marker && <span className="pa-vbar-m" style={{ left: `${v.elapsed.toFixed(1)}%` }} />}
        </div>
        <p className="pa-vdates">
          <span>{v.from}</span>
          <span className={"pa-vdl " + DL_CLASS[v.dlTone]}>{v.daysLeft}</span>
          <span>{v.to}</span>
        </p>
        <div className="pa-vapplies">
          <span className="pa-dmeta-g">
            <Tag size={14} aria-hidden />
          </span>
          <span>{appliesOf(d.promo, ctx)}</span>
        </div>
        <UsesBar v={v} />
      </section>
      {!scheduled && ch && (
        <section className="pa-card pa-dchart" aria-label="Uses by week">
          <p className="pa-dchart-t">Uses by week</p>
          <p className="pa-dchart-c">
            Is it being used more or less over time? Bars show this period; the dashed line is the previous 8 weeks.
          </p>
          <WeekChart vals={ch.vals} prev={ch.prev} aria={`${d.label} uses per week`} />
        </section>
      )}
      <KitPop
        open={confirm}
        icon={CircleStop}
        title={scheduled ? "Cancel this discount?" : "End this discount now?"}
        body={scheduled ? "It won't go live. You can duplicate it later." : "It comes off your listing today. Past uses stay in your numbers."}
        action={scheduled ? "Cancel discount" : "End now"}
        keep="Keep it"
        busy={busy}
        error={err}
        onKeep={() => {
          setConfirm(false);
          setErr(null);
        }}
        onAction={async () => {
          setBusy(true);
          setErr(null);
          // B13: ending stamps ended_at (the row and its uses stay); a
          // scheduled one never started, so cancelling deletes it (#15).
          const r = scheduled ? await cancelPromotion(d.id) : await endPromotion(d.id);
          setBusy(false);
          if (!r.ok) {
            setErr(scheduled ? "Couldn't cancel the discount. Try again." : "Couldn't end the discount. Try again.");
            return;
          }
          setConfirm(false);
          onEnded(scheduled ? "Discount cancelled." : "Discount ended.");
        }}
      />
    </>
  );
};
