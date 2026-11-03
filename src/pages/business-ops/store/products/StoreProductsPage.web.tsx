import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, ImageIcon, Package, Plus } from "lucide-react";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../../components/market/MarketStates";
import { useOnline } from "../../../../hooks/useOnline";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";
import { fetchStoreProducts, productCounts, stockChip, type Product, type ProductsLoad } from "../../../../services/store/products";
import { reorderShowcase } from "../../../../services/business-market/overview";
import { BizShareButton } from "../../../../components/share/business/BizShareButton";
import { fetchRatingLine } from "../../../../components/share/business/useBizBrand";
import { WebPageHeader } from "../../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../../components/web/useWebLayout";
import { MarketProvider, MARKET_TAB_KEYS, tabKeyOf, useMarket, type MarketTabKey } from "../../../business-market/MarketContext";
import { HiddenBanner } from "../../../business-market/MarketplacePage";
import { OverviewWeb } from "../../../business-market/Overview.web";
import { OffersTabWeb } from "../../../business-market/OffersWeb.web";
import { PerformanceTabWeb } from "../../../business-market/PerformanceWeb.web";
import { MarketWebType } from "../../../../components/market/webType";
import { usePendingPhotos } from "../../../business-market/usePendingPhotos";
import { useStrip } from "../../../business-market/listingParts";
import { dropIndex, groupByCategory, itemsHeader, mergeSectionOrder, moveTo, priceLine } from "../../../business-market/showcaseModel";
import { ProductEditorSheet } from "./ProductEditorSheet";
import { ExtrasHeader, FOCUS } from "../webKit";
import { t, tk, tx } from "../../../../i18n/core";

// Website viewport v1 · WB-ST-PR Products · Showcase (WB-ST Products Web v2)
// and WB-ST-PR.3 Category See all: the header with the store's line and the
// share button, the four segmented tabs, the stock figures beside the items
// header and Add item, and the categories as a 2 × 2 bento of cards (3 rows
// each and See all, as the repo caps). Rows keep the drag to reorder
// (pointer and keyboard), the stock chips and the editor (ProductEditorSheet,
// a 440 side sheet on web). Loading, saving and the order rules are the
// mobile ShowcaseManager's. Overview, Offers and Performance are the
// Marketplace's own web tabs (WB-MA.1, .3, .4).

const CAP = 3;
const BORDER = "1px solid rgba(36,31,27,0.11)";
const CAPS: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" };
const TONE = { warn: ["#F6E9C9", "#B07D16"], bad: ["#FBE7E4", "#C0392B"], soft: ["#F5F5F6", "#8C8378"] } as const;

type Loaded = { status: "loading" } | { status: "ok"; value: ProductsLoad } | { status: "error"; offline: boolean } | { status: "pending" };

export default function StoreProductsPageWeb() {
  return (
    <MarketProvider forceKind="store">
      <ProductsScreen />
    </MarketProvider>
  );
}

function ProductsScreen() {
  const m = useMarket();
  const { rail } = useWebLayout();
  const [params, setParams] = useSearchParams();
  const category = params.get("category");
  const tab = tabKeyOf(params.get("tab"), "showcase");
  const labels: Record<MarketTabKey, string> = { overview: t("Overview"), showcase: t("Showcase"), offers: t("Offers"), perf: t("Performance") };
  const onTab = (k: MarketTabKey) => {
    const next = new URLSearchParams(params);
    next.delete("category");
    if (k === "showcase") next.delete("tab");
    else next.set("tab", k);
    setParams(next, { replace: true });
  };

  if (category) {
    return (
      <div style={{ color: "#241F1B" }}>
        <div className="sticky top-0 z-30">
          <ExtrasHeader kicker={t("Products")} title={category === "Other" ? t("Other") : category} backLabel={t("Back to Products")} onBack={() => onTab(tab)} />
        </div>
        <div style={{ padding: 32 }}>
          <div className="max-w-[1280px]">
            <Showcase section={category} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <WebPageHeader
          title={t("Products")}
          sub={m.v.subtitle}
          actions={<BizShareButton web label={t("Share your profile: Find us on Centium")} getData={async (id) => ({ t: "profile", d: { rating: await fetchRatingLine(id) } })} />}
        />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1280px] flex flex-col" style={{ gap: 24 }}>
          <div role="tablist" aria-label={t("Marketplace")} className="grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, padding: 5, borderRadius: 14, background: "#F3F3FD" }}>
            {MARKET_TAB_KEYS.map((k) => {
              const on = k === tab;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  id={`mk-tab-${k}`}
                  aria-selected={on}
                  aria-controls="mk-panel"
                  onClick={() => onTab(k)}
                  className={`flex items-center justify-center whitespace-nowrap hover:brightness-[0.98] ${FOCUS}`}
                  style={{ height: 30, borderRadius: 10, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#6D50D3", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                >
                  {labels[k]}
                </button>
              );
            })}
          </div>
          <div role="tabpanel" id="mk-panel" aria-labelledby={`mk-tab-${tab}`}>
            {tab === "showcase" ? (
              <>
                <HiddenBanner />
                <Showcase />
              </>
            ) : !m.kindKnown && m.loading ? (
              <MarketSkeleton radius={24} rows={3} count={2} label={t("Loading your marketplace")} />
            ) : tab === "overview" ? (
              // WB-MA tabs: the Marketplace's own web layouts (WB-MA.1, .3, .4).
              <OverviewWeb rail={rail} />
            ) : (
              <MarketWebType.Provider value={rail ? "rail" : "wide"}>
                <HiddenBanner />
                {tab === "offers" ? <OffersTabWeb /> : <PerformanceTabWeb />}
              </MarketWebType.Provider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The store's showcase: figures + header, then the categories (bento), or one category's full list. */
function Showcase({ section }: { section?: string | null }) {
  const m = useMarket();
  const navigate = useNavigate();
  const online = useOnline();
  const { rail } = useWebLayout();
  const { business } = m;
  const businessId = business?.id ?? null;
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [order, setOrder] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [strip, showStrip] = useStrip();
  const reload = useCallback(() => setTick((x) => x + 1), []);
  const pending = usePendingPhotos("showcase_image", tick);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchStoreProducts(businessId, "shelf").then((r) => {
      if (!alive) return;
      setOrder(null);
      setState(r.status === "ok" ? { status: "ok", value: r.value } : r.status === "error" ? { status: "error", offline: r.offline } : { status: "pending" });
    });
    return () => {
      alive = false;
    };
  }, [businessId, tick]);

  const products = useMemo(() => {
    if (state.status !== "ok") return [];
    const list = state.value.products;
    if (!order) return list;
    const byId = new Map(list.map((p) => [p.id, p]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Product[];
    return [...ordered, ...list.filter((p) => !order.includes(p.id))];
  }, [state, order]);

  const canEdit = online && (m.can("marketing") || m.can("store"));
  const reorder = async (ids: string[]) => {
    const before = order;
    setOrder(ids);
    const r = await reorderShowcase(ids);
    if (r.ok) {
      showStrip(t("Order saved"));
      return;
    }
    setOrder(before);
    showStrip(r.offline ? t("You're offline. Try again when you're connected.") : r.message, r.offline ? "neutral" : "error");
  };
  const open = (p: Product | null) => setEditor({ open: true, product: p });
  const allIds = products.map((p) => p.id);
  const gap = rail ? 20 : 24;

  const addButton = (style?: React.CSSProperties) => (
    <button
      type="button"
      onClick={() => open(null)}
      disabled={!canEdit || !online}
      className={`shrink-0 inline-flex items-center justify-center whitespace-nowrap bg-white enabled:hover:bg-[#F0EDF9] disabled:opacity-40 ${FOCUS}`}
      style={{ height: 40, boxSizing: "border-box", borderRadius: 12, border: BORDER, color: "#7D6BB5", fontSize: 15, lineHeight: "24px", fontWeight: 600, gap: 8, padding: "0 16px", ...style }}
    >
      <Plus size={20} strokeWidth={2.4} aria-hidden />
      {t("Add item")}
    </button>
  );

  let body: React.ReactNode;
  if (!businessId || state.status === "loading") {
    body = <MarketSkeleton radius={24} rows={3} count={2} height={292} label={t("Loading your products")} />;
  } else if (state.status === "error" || state.status === "pending") {
    body = <MarketError thing={tk("your products")} onRetry={reload} />;
  } else if (section) {
    const list = products.filter((p) => (p.category ?? "Other") === section);
    body = list.length ? (
      <ItemCard
        label={section === "Other" ? t("Other") : section}
        items={list}
        pending={pending}
        canReorder={canEdit}
        rail={rail}
        full
        onOpen={open}
        onReorder={(ids) => void reorder(mergeSectionOrder(allIds, list.map((p) => p.id), ids))}
      />
    ) : (
      <div className="flex flex-col items-center justify-center text-center bg-white" style={{ borderRadius: 24, border: BORDER, padding: 32, minHeight: 240 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Nothing in this category yet.")}</p>
      </div>
    );
  } else if (products.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center text-center" style={{ gap: 12, minHeight: "calc(100dvh - 246px)" }}>
        <span className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 20, background: "#EEEAF8" }}>
          <Package size={28} strokeWidth={1.75} style={{ color: "#7D67D9" }} aria-hidden />
        </span>
        <div style={{ fontSize: 22, lineHeight: "30px", fontWeight: 800 }}>{t("No products yet")}</div>
        <div style={{ fontSize: 15, lineHeight: "24px", color: "#8C8378", maxWidth: 360 }}>{t("Add your first product with a photo, price and stock.")}</div>
        {addButton({ marginTop: 8, padding: "0 18px" })}
      </div>
    );
  } else {
    const sc = productCounts(products);
    const shipped = state.value.stockShipped;
    const fig = (n: number) => (shipped ? String(n) : "–");
    const figs = [
      { v: String(sc.live), l: t("Live products") },
      { v: fig(sc.low), l: t("Low stock") },
      { v: fig(sc.out), l: t("Out of stock") },
    ];
    body = (
      <div className="flex flex-col" style={{ gap }}>
        <div className="grid items-center" style={{ gridTemplateColumns: rail ? "repeat(8,minmax(0,1fr))" : "repeat(12,minmax(0,1fr))", gap: 24 }}>
          <div className="grid bg-white" style={{ gridColumn: rail ? "span 4" : "span 8", gridTemplateColumns: "repeat(3,minmax(0,1fr))", borderRadius: 20, border: BORDER }}>
            {figs.map((f, i) => (
              <div key={f.l} className="min-w-0 flex items-baseline" style={{ padding: rail ? "12px 14px" : "16px 20px", gap: 10, borderInlineStart: i ? "1.5px dashed rgba(36,31,27,0.11)" : 0 }}>
                <span className="tabular-nums" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 800, color: "#241F1B" }}>{f.v}</span>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis" title={f.l} style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{f.l}</span>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex items-center justify-between" style={{ gridColumn: "span 4", gap: 12 }}>
            <h2 className="whitespace-nowrap overflow-hidden text-ellipsis" style={CAPS}>{itemsHeader(products.length)}</h2>
            {addButton()}
          </div>
        </div>
        <div className="grid items-start" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", alignContent: "start", gap }}>
          {groupByCategory(products).map((g) => {
            const name = g.name === "Other" ? t("Other") : g.name;
            return (
              <ItemCard
                key={g.name}
                label={name}
                items={g.list.slice(0, CAP)}
                pending={pending}
                canReorder={canEdit}
                rail={rail}
                onSeeAll={g.list.length > CAP ? () => navigate(`${m.base}?tab=showcase&category=${encodeURIComponent(g.name)}`) : undefined}
                onOpen={open}
                onReorder={(ids) => void reorder(mergeSectionOrder(allIds, g.list.map((p) => p.id), ids))}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: "#241F1B" }}>
      <MarketOffline loaded={state.status === "ok"} onRetry={reload} style={{ marginBottom: 12 }} />
      {body}
      {businessId && state.status === "ok" && (
        <ProductEditorSheet
          open={editor.open}
          onClose={() => setEditor((e) => ({ ...e, open: false }))}
          businessId={businessId}
          businessType={business?.type ?? null}
          stockShipped={state.value.stockShipped}
          product={editor.product}
          variant="store"
          onSaved={(msg) => {
            setEditor((e) => ({ ...e, open: false }));
            showStrip(msg);
            reload();
          }}
        />
      )}
      {strip}
    </div>
  );
}

/** A category card: r24, the caps head 52 (44 at the rail) with See all, rows 72 (64) with the drag handle, photo 56 (48), name, description, price and the stock chip. */
function ItemCard({
  label,
  items,
  pending,
  canReorder,
  rail,
  full,
  onSeeAll,
  onOpen,
  onReorder,
}: {
  label: string;
  items: Product[];
  pending: Map<string, string>;
  canReorder: boolean;
  rail: boolean;
  /** The category's See all page: price and stock as a right column. */
  full?: boolean;
  onSeeAll?: () => void;
  onOpen: (p: Product) => void;
  onReorder: (ids: string[]) => void;
}) {
  const reduce = useReducedMotion();
  const ids = items.map((p) => p.id);
  const [drag, setDrag] = useState<{ id: string; order: string[]; pointer: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const byId = new Map(items.map((p) => [p.id, p]));
  const shown = drag ? (drag.order.map((id) => byId.get(id)).filter(Boolean) as Product[]) : items;
  const nameOf = (id: string) => byId.get(id)?.name ?? tx("Item", "showcase");

  // Drag to reorder, pointer and keyboard: the mobile ShowcaseManager's ItemList, unchanged.
  const finish = (d: { id: string; order: string[] }) => {
    setDrag(null);
    if (d.order.join() === ids.join()) {
      setAnnounce(t("{name} dropped. The order didn't change.", { name: nameOf(d.id) }));
      return;
    }
    setAnnounce(t("{name} dropped at position {n} of {total}.", { name: nameOf(d.id), n: d.order.indexOf(d.id) + 1, total: d.order.length }));
    onReorder(d.order);
  };
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (!canReorder || e.button !== 0) return;
    e.preventDefault();
    setDrag({ id, order: ids, pointer: true });
  };
  const dragRef = useRef(drag);
  const finishRef = useRef(finish);
  useEffect(() => {
    dragRef.current = drag;
    finishRef.current = finish;
  });
  const pointerDrag = !!drag?.pointer;
  useEffect(() => {
    if (!pointerDrag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !listRef.current) return;
      e.preventDefault();
      const rows = [...listRef.current.querySelectorAll<HTMLElement>("[data-row-id]")];
      const mids = rows.map((r) => {
        const b = r.getBoundingClientRect();
        return b.top + b.height / 2;
      });
      const from = d.order.indexOf(d.id);
      const to = dropIndex(mids, e.clientY, from);
      if (to !== from) setDrag({ ...d, order: moveTo(d.order, d.id, to) });
    };
    const up = () => {
      const d = dragRef.current;
      if (d) finishRef.current(d);
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [pointerDrag]);
  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (!canReorder) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!drag) {
        setDrag({ id, order: ids, pointer: false });
        setAnnounce(t("{name} picked up, position {n} of {total}. Use the up and down arrows to move it, Space to drop, Escape to cancel.", { name: nameOf(id), n: ids.indexOf(id) + 1, total: ids.length }));
      } else finish(drag);
      return;
    }
    if (!drag || drag.pointer) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const from = drag.order.indexOf(drag.id);
      const next = moveTo(drag.order, drag.id, from + (e.key === "ArrowUp" ? -1 : 1));
      setDrag({ ...drag, order: next });
      setAnnounce(t("Position {n} of {total}.", { n: next.indexOf(drag.id) + 1, total: next.length }));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDrag(null);
      setAnnounce(t("Cancelled. {name} is back at position {n}.", { name: nameOf(drag.id), n: ids.indexOf(drag.id) + 1 }));
    }
  };

  const photoW = rail ? 48 : 56;
  return (
    <section aria-label={label} className="min-w-0 flex flex-col overflow-hidden bg-white" style={{ borderRadius: 24, border: BORDER }}>
      <span aria-live="assertive" className="sr-only">
        {announce}
      </span>
      <div className="shrink-0 flex items-center justify-between" style={{ height: rail ? 44 : 52, padding: "0 16px", borderBottom: "0.5px solid rgba(36,31,27,0.06)" }}>
        <p style={CAPS}>{label}</p>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} aria-label={t("See all {name}", { name: label })} className={`whitespace-nowrap hover:underline ${FOCUS}`} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}>
            {t("See all")}
          </button>
        )}
      </div>
      <div ref={listRef} role="list" aria-label={label} className="flex flex-col">
        {shown.map((p, i) => {
          const lifted = drag?.id === p.id;
          const chip = stockChip(p);
          const chipText = !chip ? "" : chip.label === "Hidden" ? t("Hidden") : chip.label === "Out" ? tx("Out", "stock") : chip.label === "Low" ? tx("Low", "stock") : chip.label;
          const stockWords = !chip ? "" : chip.label === "Out" ? t("Out of stock") : chip.label === "Low" ? t("Low stock") : "";
          const op = p.visible ? 1 : 0.5;
          const photo = pending.get(p.id) ?? p.imageUrl;
          const price = priceLine(p, true);
          return (
            <div
              key={p.id}
              role="listitem"
              data-row-id={p.id}
              className="relative flex items-center hover:bg-[#FAFAFB]"
              style={{
                minHeight: rail ? 64 : 72,
                boxSizing: "border-box",
                gap: 12,
                padding: rail ? "1px 16px 1px 10px" : "8px 16px 8px 10px",
                borderTop: i ? "0.5px solid rgba(36,31,27,0.06)" : 0,
                background: lifted ? "#FFFFFF" : undefined,
                boxShadow: lifted ? "0 10px 24px rgba(36,31,27,0.16)" : undefined,
                zIndex: lifted ? 1 : undefined,
                transition: reduce ? undefined : "box-shadow 140ms ease",
              }}
            >
              <button
                type="button"
                title={t("Drag to reorder")}
                aria-label={t("Move {name}", { name: p.name })}
                aria-pressed={lifted && !drag?.pointer ? true : undefined}
                aria-roledescription="drag handle"
                disabled={!canReorder}
                onPointerDown={(e) => onPointerDown(e, p.id)}
                onKeyDown={(e) => onKeyDown(e, p.id)}
                onBlur={() => drag && !drag.pointer && setDrag(null)}
                className={`shrink-0 grid ${FOCUS}`}
                style={{ width: 16, height: 16, gridTemplateColumns: "repeat(2,2.8px)", gridTemplateRows: "repeat(3,2.8px)", columnGap: 3.4, rowGap: 4.2, justifyContent: "center", alignContent: "center", cursor: canReorder ? (lifted ? "grabbing" : "grab") : "default", touchAction: "none", opacity: canReorder ? 1 : 0.4, borderRadius: 4 }}
              >
                {Array.from({ length: 6 }, (_, k) => (
                  <span key={k} aria-hidden style={{ borderRadius: 999, background: "#A79E93" }} />
                ))}
              </button>
              <button
                type="button"
                onClick={() => onOpen(p)}
                aria-label={`${p.name}${p.visible ? "" : `${t(", ")}${t("hidden")}`}${stockWords ? `${t(", ")}${stockWords}` : ""}. ${t("Edit item")}`}
                className={`flex-1 min-w-0 flex items-center text-start ${FOCUS}`}
                style={{ gap: 12, borderRadius: 12, color: "#241F1B" }}
              >
                <span className="shrink-0 flex items-center justify-center overflow-hidden" style={{ width: photoW, height: photoW, borderRadius: 12, background: "#F5F5F6", opacity: op }}>
                  {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <ImageIcon size={20} strokeWidth={1.8} color="#A79E93" aria-hidden />}
                </span>
                <span className="flex-1 min-w-0" style={{ opacity: op }}>
                  <span title={p.name} className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>
                    {p.name}
                  </span>
                  {p.description ? (
                    <span title={p.description} className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                      {p.description}
                    </span>
                  ) : null}
                  {!full && price ? <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700 }}>{price}</span> : null}
                </span>
                {full && price ? (
                  <span className="shrink-0 whitespace-nowrap tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, opacity: op }}>
                    {price}
                  </span>
                ) : null}
                {chip ? (
                  <span className="shrink-0" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: TONE[chip.tone][0], color: TONE[chip.tone][1] }}>
                    {chipText}
                  </span>
                ) : null}
                <ChevronRight size={16} strokeWidth={2} color="#8C8378" aria-hidden className="shrink-0" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
