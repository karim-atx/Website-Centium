import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ImageIcon, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MarketError, MarketOffline, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useOnline } from "../../hooks/useOnline";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useIsDark } from "../../hooks/useIsDark";
import { fetchStoreProducts, productCounts, stockChip, type Product, type ProductsLoad } from "../../services/store/products";
import { reorderShowcase } from "../../services/business-market/overview";
import { marketPalette } from "../../theme/marketTokens";
import { ProductEditorSheet } from "../business-ops/store/products/ProductEditorSheet";
import { useMarket } from "./MarketContext";
import { usePendingPhotos } from "./usePendingPhotos";
import { CapsLabel, OutlineButton, TextLink, lh, px, useMarketColors, useStrip } from "./listingParts";
import { dropIndex, groupByCategory, itemsHeader, mergeSectionOrder, moveTo, priceLine } from "./showcaseModel";

// Market + Share 3.0 · W3 · B-MA.2 Showcase Manager (HANDOVER §4 "B-MA.2
// Showcase Manager"; Business Marketplace Screens lines 100–117 and the
// `showcase` script; frame-check B-MA.2 showcaseList). Over the live
// business_offerings (D-17), with the old Listing tab's Offerings card
// features KEPT (add, edit, delete, visible / hidden, price, description,
// image, the Explore category of a new item, the share of an item) and, for a
// store (D-12), the old Products tab's (category sections with "See all",
// stock figures and chips, the product editor: stock, category, hide in
// store, delete).
// - note banner (radius 16, --pale, padding 12 14, 12.5 / 18 700 --pdark):
//   "Showcase only. Members can't buy these in the app." ONLY for a business
//   without an in-app shop (D-12: not a store);
// - caps "{n} items · drag to reorder" + the outlined "Add item" (plus 15,
//   stroke 2.4), margin-top 12;
// - the list card (margin-top 10, radius 24, --card, 1px --border): rows
//   padding 10 14 10 8, gap 10, the 0.5px --div rule from row 2; drag handle
//   (6 dots 16, --tert), a 52 × 52 radius 12 --soft photo frame (the real
//   image, or an empty frame with an icon: never the board's "PHOTO"), name
//   13.5 / 700, description 11.5 --faint on one line with an ellipsis, price
//   12 / 700 (margin-top 1), chevron 16 --faint; a hidden item at 0.5 with the
//   "Hidden" chip (10.5 / 800, --soft / --faint, padding 2 8).
// Reorder: drag the handle (pointer, the rows move as it passes their
// middles) or, from the keyboard, Space / Enter to pick up, arrows to move,
// Space / Enter to drop, Escape to cancel. The order is saved through
// reorder_showcase_items (Database 73ea87b; the whole list, top to bottom:
// "Order saved"); a refusal puts the order back with the error strip. The list
// reads the shelf order (sort, then newest first, then id), the same order
// members see through public_showcase.

const CAP = 3;

type Loaded = { status: "loading" } | { status: "ok"; value: ProductsLoad } | { status: "error"; offline: boolean } | { status: "pending" };

export function ShowcaseManager({ section }: { section?: string | null }) {
  const m = useMarket();
  const c = useMarketColors();
  const navigate = useNavigate();
  const online = useOnline();
  const { kind, business } = m;
  const store = kind === "store";
  const businessId = business?.id ?? null;
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [order, setOrder] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [strip, showStrip] = useStrip();
  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Round C Release 2: a photo waiting for approval shows in its row's frame (only to this business).
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

  const canEdit = online && (m.can("marketing") || (store && m.can("store")));

  const reorder = async (ids: string[]) => {
    const before = order;
    setOrder(ids);
    const r = await reorderShowcase(ids);
    if (r.ok) {
      showStrip("Order saved");
      return;
    }
    setOrder(before);
    showStrip(r.offline ? "You're offline. Try again when you're connected." : r.message, r.offline ? "neutral" : "error");
  };

  const open = (p: Product | null) => setEditor({ open: true, product: p });
  const allIds = products.map((p) => p.id);
  const banner = !store ? (
    <div style={{ borderRadius: 16, background: c.pale, padding: "12px 14px", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: c.pdark, marginBottom: 12 }}>
      Showcase only. Members can't buy these in the app.
    </div>
  ) : null;

  let body: React.ReactNode;
  if (!businessId || state.status === "loading") {
    body = <MarketSkeleton radius={24} rows={3} count={1} height={292} label={store ? "Loading your products" : "Loading your showcase"} />;
  } else if (state.status === "error" || state.status === "pending") {
    body = <MarketError thing={store ? "your products" : "your showcase"} onRetry={reload} />;
  } else if (section) {
    const list = products.filter((p) => (p.category ?? "Other") === section);
    body = list.length ? (
      <ItemList
        label={section}
        items={list}
        pending={pending}
        store={store}
        canReorder={canEdit}
        onOpen={open}
        onReorder={(ids) => void reorder(mergeSectionOrder(allIds, list.map((p) => p.id), ids))}
      />
    ) : (
      <p style={{ fontSize: px(12.5), color: c.faint, textAlign: "center", padding: "24px 0" }}>Nothing in this category yet.</p>
    );
  } else if (products.length === 0) {
    body = (
      <>
        {banner}
        <EmptyShowcase store={store} canAdd={canEdit} onAdd={() => open(null)} />
      </>
    );
  } else {
    const header = (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <CapsLabel>{itemsHeader(products.length)}</CapsLabel>
        <OutlineButton onClick={() => open(null)} disabled={!canEdit || !online}>
          <Plus size={15} strokeWidth={2.4} aria-hidden style={{ transform: "none" }} />
          Add item
        </OutlineButton>
      </div>
    );
    if (store) {
      const sc = productCounts(products);
      const shipped = state.value.stockShipped;
      const fig = (n: number) => (shipped ? String(n) : "–");
      body = (
        <>
          <StockFigures items={[{ v: String(sc.live), l: "Live products" }, { v: fig(sc.low), l: "Low stock" }, { v: fig(sc.out), l: "Out of stock" }]} />
          <div style={{ marginTop: 12 }}>{header}</div>
          {groupByCategory(products).map((g) => (
            <section key={g.name} aria-label={g.name} style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 24, marginBottom: 8 }}>
                <CapsLabel as="p">{g.name}</CapsLabel>
                {g.list.length > CAP ? (
                  <TextLink onClick={() => navigate(`${m.base}?tab=showcase&category=${encodeURIComponent(g.name)}`)} ariaLabel={`See all ${g.name}`}>
                    See all
                  </TextLink>
                ) : null}
              </div>
              <ItemList
                label={g.name}
                items={g.list.slice(0, CAP)}
                pending={pending}
                store
                canReorder={canEdit}
                onOpen={open}
                onReorder={(ids) => void reorder(mergeSectionOrder(allIds, g.list.map((p) => p.id), ids))}
              />
            </section>
          ))}
        </>
      );
    } else {
      body = (
        <>
          {banner}
          {header}
          <div style={{ marginTop: 10 }}>
            <ItemList label="Showcase items" items={products} pending={pending} store={false} canReorder={canEdit} onOpen={open} onReorder={(ids) => void reorder(ids)} />
          </div>
        </>
      );
    }
  }

  return (
    <div style={{ paddingBottom: 32, color: c.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
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
          variant={store ? "store" : "showcase"}
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

/** The store's live stock figures (OP1-008 row 5, KEPT): a --card radius 20 row of three, 16 / 800 figures over 11.5 --faint labels. */
function StockFigures({ items }: { items: { v: string; l: string }[] }) {
  const c = useMarketColors();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, borderRadius: 20, background: c.card, border: `1px solid ${c.border}` }}>
      {items.map((x, i) => (
        <div key={x.l} style={{ padding: "12px 14px", borderLeft: i ? `1.5px dashed ${c.border}` : 0, minWidth: 0 }}>
          <div style={{ fontSize: px(16), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>{x.v}</div>
          <div style={{ fontSize: px(11.5), color: c.faint, marginTop: 2 }}>{x.l}</div>
        </div>
      ))}
    </div>
  );
}

/** Empty (the P-MA.2 empty drawing, adapted): a 56 radius 18 tile, 16 / 800 title, 13 / 1.55 --faint body, the outlined CTA. */
function EmptyShowcase({ store, canAdd, onAdd }: { store: boolean; canAdd: boolean; onAdd: () => void }) {
  const dark = useIsDark();
  const c = marketPalette(dark);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "32px 24px 0" }}>
      <span style={{ width: 56, height: 56, borderRadius: 18, background: dark ? c.pale : "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center", color: c.accent }}>
        <Package size={24} strokeWidth={1.75} aria-hidden />
      </span>
      <div style={{ fontSize: px(16), fontWeight: 800 }}>{store ? "No products yet" : "No items yet"}</div>
      <div style={{ fontSize: px(13), lineHeight: 1.55, color: c.faint, maxWidth: 290 }}>
        {store ? "Add your first product with a photo, price and stock." : "Add what you sell or offer. Items show on your Showcase on Explore."}
      </div>
      <OutlineButton onClick={onAdd} disabled={!canAdd} style={{ marginTop: 6 }}>
        <Plus size={15} strokeWidth={2.4} aria-hidden style={{ transform: "none" }} />
        Add item
      </OutlineButton>
    </div>
  );
}

/** The six-dot drag handle (16, fill --tert). */
const DOTS = (
  <>
    <circle cx="9" cy="5" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="9" cy="19" r="1.4" />
    <circle cx="15" cy="5" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="15" cy="19" r="1.4" />
  </>
);

function ItemList({
  label,
  items,
  pending,
  store,
  canReorder,
  onOpen,
  onReorder,
}: {
  label: string;
  items: Product[];
  /** Item id → the owner's photo waiting for approval (signed URL). */
  pending: Map<string, string>;
  store: boolean;
  canReorder: boolean;
  onOpen: (p: Product) => void;
  onReorder: (ids: string[]) => void;
}) {
  const dark = useIsDark();
  const c = marketPalette(dark);
  const reduce = useReducedMotion();
  const ids = items.map((p) => p.id);
  const [drag, setDrag] = useState<{ id: string; order: string[]; pointer: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const byId = new Map(items.map((p) => [p.id, p]));
  const shown = drag ? (drag.order.map((id) => byId.get(id)).filter(Boolean) as Product[]) : items;
  const nameOf = (id: string) => byId.get(id)?.name ?? "Item";

  const finish = (d: { id: string; order: string[] }) => {
    setDrag(null);
    if (d.order.join() === ids.join()) {
      setAnnounce(`${nameOf(d.id)} dropped. The order didn't change.`);
      return;
    }
    setAnnounce(`${nameOf(d.id)} dropped at position ${d.order.indexOf(d.id) + 1} of ${d.order.length}.`);
    onReorder(d.order);
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (!canReorder || e.button !== 0) return;
    e.preventDefault();
    setDrag({ id, order: ids, pointer: true });
  };
  // The rows re-order under the pointer while it moves (React moves the
  // nodes, which drops any pointer capture), so a pointer drag listens on the
  // window until it ends.
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const finishRef = useRef(finish);
  finishRef.current = finish;
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
        setAnnounce(`${nameOf(id)} picked up, position ${ids.indexOf(id) + 1} of ${ids.length}. Use the up and down arrows to move it, Space to drop, Escape to cancel.`);
      } else finish(drag);
      return;
    }
    if (!drag || drag.pointer) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const from = drag.order.indexOf(drag.id);
      const next = moveTo(drag.order, drag.id, from + (e.key === "ArrowUp" ? -1 : 1));
      setDrag({ ...drag, order: next });
      setAnnounce(`Position ${next.indexOf(drag.id) + 1} of ${next.length}.`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDrag(null);
      setAnnounce(`Cancelled. ${nameOf(drag.id)} is back at position ${ids.indexOf(drag.id) + 1}.`);
    }
  };

  return (
    <>
      <span aria-live="assertive" className="sr-only">
        {announce}
      </span>
      <div ref={listRef} role="list" aria-label={label} style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        {shown.map((p, i) => {
          const lifted = drag?.id === p.id;
          const chip = store ? stockChip(p) : p.visible ? null : { label: "Hidden", tone: "soft" as const };
          const [chipBg, chipInk] = !chip ? ["", ""] : chip.tone === "warn" ? [c.cautionbg, c.caution] : chip.tone === "bad" ? [c.highbg, c.high] : [c.soft, c.faint];
          const op = p.visible ? 1 : 0.5;
          const photo = pending.get(p.id) ?? p.imageUrl;
          const price = priceLine(p, store);
          return (
            <div
              key={p.id}
              role="listitem"
              data-row-id={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px 10px 8px",
                borderTop: i ? `0.5px solid ${c.div}` : 0,
                position: "relative",
                background: lifted ? c.card : undefined,
                boxShadow: lifted ? (dark ? "0 10px 24px rgba(0,0,0,0.45)" : "0 10px 24px rgba(36,31,27,0.16)") : undefined,
                zIndex: lifted ? 1 : undefined,
                transition: reduce ? undefined : "box-shadow 140ms ease",
              }}
            >
              <button
                type="button"
                aria-label={`Move ${p.name}`}
                aria-pressed={lifted && !drag?.pointer ? true : undefined}
                aria-roledescription="drag handle"
                disabled={!canReorder}
                onPointerDown={(e) => onPointerDown(e, p.id)}
                onKeyDown={(e) => onKeyDown(e, p.id)}
                onBlur={() => drag && !drag.pointer && setDrag(null)}
                className="hit market-focus"
                style={{ width: 16, height: 16, padding: 0, border: 0, background: "transparent", flexShrink: 0, cursor: canReorder ? (lifted ? "grabbing" : "grab") : "default", touchAction: "none", display: "flex", opacity: canReorder ? 1 : 0.4 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={c.tert} stroke="none" aria-hidden style={{ transform: "none" }}>
                  {DOTS}
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onOpen(p)}
                aria-label={`${p.name}${p.visible ? "" : ", hidden"}${chip && chip.label !== "Hidden" ? `, ${chip.label} stock` : ""}. Edit item`}
                className="market-focus"
                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, border: 0, background: "transparent", textAlign: "left", fontFamily: "inherit", color: c.ink, cursor: "pointer" }}
              >
                <span style={{ width: 52, height: 52, borderRadius: 12, background: c.soft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: op, overflow: "hidden" }}>
                  {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <ImageIcon size={18} strokeWidth={1.8} color={c.tert} aria-hidden />}
                </span>
                <span style={{ flex: 1, minWidth: 0, opacity: op, lineHeight: "normal" }}>
                  <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700 }}>{p.name}</span>
                  {p.description ? <span style={{ display: "block", fontSize: px(11.5), color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.description}</span> : null}
                  {price ? <span style={{ display: "block", fontSize: px(12), fontWeight: 700, marginTop: 1 }}>{price}</span> : null}
                </span>
                {chip ? <span style={{ fontSize: px(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: chipBg, color: chipInk, flexShrink: 0, lineHeight: "normal" }}>{chip.label}</span> : null}
                <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden style={{ flexShrink: 0 }} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
