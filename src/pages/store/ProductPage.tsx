import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { Toast } from "../../components/ui/Toast";
import { addToCart, fetchStoreInfo, MAX_QTY, type StoreInfo } from "../../services/store/customer";
import { fetchProduct, type Product } from "../../services/store/products";
import type { Load } from "../../services/store/backend";
import { money, moneyShort } from "../../services/store/format";
import { useApp } from "../../context/AppContext";
import { useLive } from "../business-ops/store/storeShared";
import { ClientConfirm, ClientEmpty, QtyStepper, RetryLine, SkeletonCards } from "./clientKit";
import { fulfilmentLine } from "./StoreFrontPage";
import { useCart } from "./useCart";

// OURS-customer-store-product · product page (Designed by us). The price is
// the store's (business_offerings.price), read here and again at checkout.

async function loadProduct(productId: string): Promise<Load<{ product: Product; store: StoreInfo | null } | null>> {
  const p = await fetchProduct(productId);
  if (p.status !== "ok") return p;
  if (!p.value) return { status: "ok", value: null };
  const s = await fetchStoreInfo(p.value.businessId);
  return { status: "ok", value: { product: p.value.product, store: s.status === "ok" ? s.value : null } };
}

export default function ProductPage() {
  const { businessId = "", productId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const { uid } = useCart();
  const live = useLive(() => loadProduct(productId), 0, productId);
  const [qty, setQty] = useState(1);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [added, setAdded] = useState(0);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title="Product" showBack sub />
        <SkeletonCards heights={[200, 60, 90]} label="Loading the product" />
      </div>
    );
  }
  if (s.status !== "ok" || !d || !d.product.visible) {
    return (
      <div>
        <PageHeader title="Product" showBack sub />
        {s.status === "error" ? <RetryLine text="Couldn't load this product." onRetry={live.reload} /> : <ClientEmpty icon={ShoppingBag} title="Product not found" line="It may have been removed from the store." />}
      </div>
    );
  }

  const p = d.product;
  const out = p.stock !== null && p.stock <= 0;
  const max = Math.min(MAX_QTY, p.stock ?? MAX_QTY);
  const canBuy = user.accountType === "customer" && p.price !== null && !out;

  const add = (replace: boolean) => {
    const r = addToCart(uid, businessId, p.id, qty, replace);
    if (r === "other-store") {
      setReplaceOpen(true);
      return;
    }
    setReplaceOpen(false);
    setAdded((n) => n + 1);
  };

  return (
    <div>
      <PageHeader title={d.store?.name ?? "Store"} showBack sub />
      {/* B11 image_url (product-images bucket); without one, the store-product placeholder. */}
      {p.imageUrl ? (
        <img src={p.imageUrl} alt={p.name} className="w-full rounded-[18px] object-cover bg-primary-pale" style={{ height: 200 }} />
      ) : (
        <div aria-hidden className="flex items-center justify-center rounded-[18px] bg-primary-pale text-th-7d67d9 dark:text-primary-accent" style={{ height: 200 }}>
          <ShoppingBag size={48} strokeWidth={1.5} />
        </div>
      )}
      <h2 className="text-[22px] font-extrabold leading-[28px] tracking-[-0.01em] text-charcoal break-words" style={{ marginTop: 16 }}>
        {p.name}
      </h2>
      {p.price !== null && (
        <p className="text-[18px] font-bold text-charcoal tabular-nums" style={{ marginTop: 4 }}>
          {moneyShort(p.price)}
        </p>
      )}
      {p.stock !== null && (
        <p className={`text-[12.5px] font-semibold ${out ? "text-status-high" : p.stock < 5 ? "text-caution-text" : "text-charcoal-faint"}`} style={{ marginTop: 4 }}>
          {out ? "Out of stock" : p.stock < 5 ? `Only ${p.stock} left` : "In stock"}
        </p>
      )}
      {p.description && (
        <p className="text-[13px] leading-[20px] text-charcoal-soft whitespace-pre-line" style={{ marginTop: 12 }}>
          {p.description}
        </p>
      )}
      {d.store && fulfilmentLine(d.store) && (
        <p className="text-[12px] font-medium text-charcoal-faint" style={{ marginTop: 12 }}>
          {fulfilmentLine(d.store)}
        </p>
      )}

      {canBuy && (
        <div className="flex items-center justify-between rounded-[18px] border border-charcoal/[0.08] bg-cream-card" style={{ marginTop: 18, padding: "10px 14px" }}>
          <span className="text-[15px] font-semibold text-charcoal">Quantity</span>
          <QtyStepper value={qty} onChange={setQty} max={max} label="Quantity" />
        </div>
      )}
      {user.accountType !== "customer" && (
        <p className="text-[12px] font-medium text-charcoal-faint" style={{ marginTop: 16 }}>
          Buying is for client accounts.
        </p>
      )}

      {canBuy && (
        <>
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta primary={{ label: `Add to cart · ${money(p.price! * qty)}`, onClick: () => add(false) }} />
        </>
      )}

      <ClientConfirm
        open={replaceOpen}
        title="Start a new cart?"
        body="Your cart has items from another store. Adding this clears them."
        keep="Keep my cart"
        confirm="Start new cart"
        onKeep={() => setReplaceOpen(false)}
        onConfirm={() => add(true)}
      />
      <Toast
        key={added}
        open={added > 0}
        message="Added to your cart."
        bottom={160}
        onExpire={() => setAdded(0)}
        action={{ label: "View cart", onClick: () => navigate("/app/store/cart") }}
      />
    </div>
  );
}
