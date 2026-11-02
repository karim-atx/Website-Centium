import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { takesNewActivity } from "../../services/business-closure/logic";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { fetchStoreInfo, fetchStorefront, setCartQty, type Cart, type StoreInfo } from "../../services/store/customer";
import type { Load } from "../../services/store/backend";
import type { Product } from "../../services/store/products";
import { money } from "../../services/store/format";
import { MAX_QTY } from "../../services/store/customer";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, QtyStepper, RetryLine, Section, SkeletonCards } from "./clientKit";
import { useCart } from "./useCart";
import { t } from "../../i18n/core";

// OURS-customer-store-cart (Designed by us). One store per cart; quantities
// on this device, prices read from the store every time.

export interface PricedLine {
  product: Product;
  qty: number;
  total: number;
}

export async function loadCart(cart: Cart): Promise<Load<{ store: StoreInfo | null; lines: PricedLine[]; gone: string[] }>> {
  const [s, p] = await Promise.all([fetchStoreInfo(cart.businessId), fetchStorefront(cart.businessId)]);
  if (s.status !== "ok") return s;
  if (p.status !== "ok") return p;
  const byId = new Map(p.value.products.map((x) => [x.id, x]));
  const lines: PricedLine[] = [];
  const gone: string[] = [];
  for (const l of cart.lines) {
    const prod = byId.get(l.offeringId);
    if (!prod || prod.price === null || (prod.stock !== null && prod.stock <= 0)) gone.push(l.offeringId);
    else lines.push({ product: prod, qty: Math.min(l.qty, prod.stock ?? MAX_QTY), total: prod.price * Math.min(l.qty, prod.stock ?? MAX_QTY) });
  }
  return { status: "ok", value: { store: s.value, lines, gone } };
}

export default function CartPage() {
  const navigate = useNavigate();
  const { uid, cart } = useCart();
  const key = cart ? `${cart.businessId}:${cart.lines.map((l) => l.offeringId + "x" + l.qty).join(",")}` : "none";
  const live = useLive(cart ? () => loadCart(cart) : null, 0, key);
  // CP: a closed or paused store takes no new orders; the cart stays on this device.
  const bizStatus = useBusinessStatus(cart?.businessId);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;

  if (!cart || cart.lines.length === 0) {
    return (
      <div>
        <PageHeader title={t("Your cart")} showBack sub />
        <ClientEmpty icon={ShoppingCart} title={t("Your cart is empty")} line={t("Add products from a store on Explore, then check out here.")} />
      </div>
    );
  }

  const subtotal = d ? d.lines.reduce((a, l) => a + l.total, 0) : 0;

  return (
    <div>
      <PageHeader title={t("Your cart")} subtitle={d?.store?.name} showBack sub />
      <BusinessClosedNote status={bizStatus} what="orders" className="mb-3" />
      {s.status === "loading" ? (
        <SkeletonCards label={t("Loading your cart")} />
      ) : s.status !== "ok" || !d ? (
        <RetryLine text={t("Couldn't load your cart.")} onRetry={live.reload} />
      ) : (
        <>
          <ClientCard label={t("Items")}>
            {d.lines.map((l) => (
              <ClientRow
                key={l.product.id}
                icon={ShoppingBag}
                title={l.product.name}
                sub={money(l.total)}
                trailing={<QtyStepper value={l.qty} min={0} max={Math.min(MAX_QTY, l.product.stock ?? MAX_QTY)} onChange={(n) => setCartQty(uid, l.product.id, n)} label={t("Quantity of {name}", { name: l.product.name })} />}
              />
            ))}
          </ClientCard>
          {d.gone.length > 0 && (
            <Section label={t("No longer available")}>
              <ClientCard>
                {d.gone.map((id) => (
                  <ClientRow
                    key={id}
                    icon={ShoppingBag}
                    title={t("This item isn't available now")}
                    trailing={
                      <button type="button" aria-label={t("Remove")} onClick={() => setCartQty(uid, id, 0)} className="tap shrink-0 flex items-center justify-center text-charcoal-faint" style={{ width: 44, height: 44 }}>
                        <Trash2 size={16} aria-hidden />
                      </button>
                    }
                  />
                ))}
              </ClientCard>
            </Section>
          )}
          <div className="flex items-center justify-between" style={{ marginTop: 16, padding: "0 4px" }}>
            <span className="text-[14px] font-semibold text-charcoal-soft">{t("Subtotal")}</span>
            <span className="text-[16px] font-extrabold text-charcoal tabular-nums">{money(subtotal)}</span>
          </div>
          <p className="text-[12px] font-medium text-charcoal-faint" style={{ marginTop: 4, padding: "0 4px" }}>
            {t("Delivery, if you choose it, is added at checkout.")}
          </p>
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta primary={{ label: t("Checkout"), onClick: () => navigate("/app/store/checkout"), disabled: d.lines.length === 0 || !takesNewActivity(bizStatus) }} />
        </>
      )}
    </div>
  );
}
