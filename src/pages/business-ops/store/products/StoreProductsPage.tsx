import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, ShoppingBag } from "lucide-react";
import { fetchStoreProducts, productCounts, stockChip, type Product } from "../../../../services/store/products";
import { moneyShort } from "../../../../services/store/format";
import { useOnline } from "../../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, TextTabs, useOpsToast } from "../opsKit";
import { useLive, useStoreBusiness } from "../storeShared";
import { ProductEditorSheet } from "./ProductEditorSheet";
import { StoreMarketPanel } from "../../../business-market/MarketplacePage";

// OP1-008 / OP1-012 · Store › Products tab. Tabs per V6-54: Products ·
// Listing · Performance · Promotions. The Products tab is OP1 (this file);
// Listing / Performance / Promotions are MA1's (Batch 5): they render the
// Marketplace bodies (StoreMarketPanel, src/pages/business-market).
// Products are business_offerings rows (V6-50).

type TabKey = "products" | "listing" | "performance" | "promotions";
const TABS: { key: TabKey; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "listing", label: "Listing" },
  { key: "performance", label: "Performance" },
  { key: "promotions", label: "Promotions" },
];
const CAP = 3;
const OTHER = "Other";

export function productSub(p: Product): string {
  const price = p.price !== null ? moneyShort(p.price) : "No price";
  return p.stock !== null ? `${price} · ${p.stock} left` : price;
}

/** Sections by product category, alphabetical, "Other" last (OP1-008 row 6). */
export function groupProducts(list: Product[]): { name: string; list: Product[] }[] {
  const map = new Map<string, Product[]>();
  for (const p of list) {
    const k = p.category ?? OTHER;
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)))
    .map(([name, l]) => ({ name, list: l }));
}

export default function StoreProductsPage() {
  const online = useOnline();
  const [params, setParams] = useSearchParams();
  const category = params.get("category");
  const raw = params.get("tab") as TabKey | null;
  const tab: TabKey = raw && TABS.some((t) => t.key === raw) ? raw : "products";
  const { businessId, businessType, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const live = useLive(businessId ? () => fetchStoreProducts(businessId) : null, 0);
  const [toast, showToast] = useOpsToast();
  const [editor, setEditor] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const s = live.state;
  const data = s.status === "ok" ? s.value : null;

  const openEditor = (product: Product | null) => setEditor({ open: true, product });
  const saved = (msg: string) => {
    setEditor((e) => ({ ...e, open: false }));
    showToast(msg, true);
    void live.refresh();
  };

  // OP1-008 S3: one category's full list.
  if (category) {
    const list = data ? data.products.filter((p) => (p.category ?? OTHER) === category) : [];
    return (
      <div>
        <OpsHeader back kicker="Products" title={category} />
        {s.status === "loading" ? (
          <ListSkeleton rows={6} />
        ) : (
          <ListCard label={category}>
            {list.map((p) => (
              <KitRow key={p.id} icon={Package} title={p.name} sub={productSub(p)} chip={stockChip(p)} onClick={() => openEditor(p)} />
            ))}
          </ListCard>
        )}
        {businessId && data && (
          <ProductEditorSheet
            open={editor.open}
            onClose={() => setEditor((e) => ({ ...e, open: false }))}
            businessId={businessId}
            businessType={businessType}
            stockShipped={data.stockShipped}
            product={editor.product}
            onSaved={saved}
          />
        )}
        {toast}
      </div>
    );
  }

  let body: React.ReactNode;
  if (tab !== "products") {
    // Batch 5 · MA1-067 / 071 / 072 (OURS-MA1-store-products-tab): the
    // Marketplace Listing, Performance and Promotions bodies for a store.
    body = <StoreMarketPanel tab={tab} />;
  } else if (loadError || s.status === "error") {
    body = <ErrorCard text="Couldn't load your products." onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (!ready || (businessId && s.status === "loading")) {
    body = (
      <>
        <NumberBoxes loading items={[{ v: "", l: "Live products" }, { v: "", l: "Low stock" }, { v: "", l: "Out of stock" }]} />
        <ListSkeleton label="Loading your products" />
      </>
    );
  } else if (!data || data.products.length === 0) {
    body = <EmptyCard icon={ShoppingBag} title="No products yet" body="Add your first product with a photo, price and stock." />;
  } else {
    const c = productCounts(data.products);
    // Pending B11: stock is not tracked yet, so the two stock boxes show a dash.
    const stockBox = (n: number) => (data.stockShipped ? String(n) : "–");
    body = (
      <>
        <NumberBoxes
          items={[
            { v: String(c.live), l: "Live products" },
            { v: stockBox(c.low), l: "Low stock" },
            { v: stockBox(c.out), l: "Out of stock" },
          ]}
        />
        {groupProducts(data.products).map((g) => (
          <section key={g.name}>
            <KitLabel label={g.name} action={g.list.length > CAP ? "See all" : undefined} onAction={() => setParams({ category: g.name })} />
            <ListCard label={g.name}>
              {g.list.slice(0, CAP).map((p) => (
                <KitRow key={p.id} icon={Package} title={p.name} sub={productSub(p)} chip={stockChip(p)} onClick={() => openEditor(p)} />
              ))}
            </ListCard>
          </section>
        ))}
      </>
    );
  }

  return (
    <div>
      <OpsHeader kicker="Products" title="Products" />
      <TextTabs label="Products" tabs={TABS} active={tab} onChange={(k) => setParams(k === "products" ? {} : { tab: k }, { replace: true })} />
      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label}>
        {body}
      </div>
      {tab === "products" && businessId && (
        <>
          <CtaSpacer />
          <FixedCta label="Add product" plus onClick={() => openEditor(null)} disabled={!online || !data} />
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
          onSaved={saved}
        />
      )}
      {toast}
    </div>
  );
}
