import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { takesNewActivity } from "../../services/business-closure/logic";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, MapPin, ShoppingBag, ShoppingCart, Truck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { fetchStoreInfo, fetchStorefront, cartCount, type StoreInfo } from "../../services/store/customer";
import type { Load } from "../../services/store/backend";
import type { Product } from "../../services/store/products";
import { moneyShort } from "../../services/store/format";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, RetryLine, Section, SkeletonCards } from "./clientKit";
import { useCart } from "./useCart";
import { t } from "../../i18n/core";

// OURS-customer-store-product · the store's front on Explore (Designed by
// us). Entry: Explore › a store's page › "Shop" (MarketplaceCategoryPage
// BusinessPage). Products are the store's visible business_offerings.

async function loadFront(businessId: string): Promise<Load<{ store: StoreInfo | null; products: Product[] }>> {
  const [s, p] = await Promise.all([fetchStoreInfo(businessId), fetchStorefront(businessId)]);
  if (s.status !== "ok") return s;
  if (p.status === "error") return p;
  return { status: "ok", value: { store: s.value, products: p.status === "ok" ? p.value.products : [] } };
}

export function fulfilmentLine(store: StoreInfo): string {
  const parts: string[] = [];
  if (store.pickup) parts.push(t("Pickup"));
  if (store.delivery) {
    const fee = store.deliveryFee ? moneyShort(store.deliveryFee) : t("free");
    parts.push(store.freeDeliveryOver !== null ? t("Delivery {fee}, free over {amount}", { fee, amount: moneyShort(store.freeDeliveryOver) }) : t("Delivery {fee}", { fee }));
  }
  return parts.join(" · ");
}

export default function StoreFrontPage() {
  const { businessId = "" } = useParams();
  const navigate = useNavigate();
  const { cart } = useCart();
  const live = useLive(() => loadFront(businessId), 0, businessId);
  // CP: a closed or paused business sells and books nothing new.
  const bizStatus = useBusinessStatus(businessId);
  const takesNew = takesNewActivity(bizStatus);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const inCart = cart && cart.businessId === businessId ? cartCount(cart) : 0;

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title={t("Store")} showBack sub />
        <SkeletonCards heights={[64, 72, 72, 72]} label={t("Loading the store")} />
      </div>
    );
  }
  if (s.status === "error" || s.status === "pending" || !d?.store) {
    return (
      <div>
        <PageHeader title={t("Store")} showBack sub />
        {s.status === "error" ? (
          <RetryLine text={t("Couldn't load this store.")} onRetry={live.reload} />
        ) : !takesNew ? (
          <BusinessClosedNote status={bizStatus} what="orders" />
        ) : (
          <ClientEmpty icon={ShoppingBag} title={t("Store not found")} line={t("It may not be listed on Explore right now.")} />
        )}
      </div>
    );
  }
  const store = d.store;

  return (
    <div>
      <PageHeader title={store.name} subtitle={store.location ?? undefined} showBack sub />
      <BusinessClosedNote status={bizStatus} what="orders" className="mb-3" />

      {(store.pickup || store.delivery) && (
        <ClientCard label={t("How you get it")}>
          <ClientRow icon={store.delivery ? Truck : MapPin} title={store.delivery && store.pickup ? t("Pickup or delivery") : store.delivery ? t("Delivery") : t("Pickup")} sub={fulfilmentLine(store)} />
        </ClientCard>
      )}

      {store.offersAppointments && takesNew && (
        <div style={{ marginTop: 10 }}>
          <ClientCard>
            <ClientRow icon={CalendarPlus} title={t("Book an appointment")} sub={t("See services and free times")} onClick={() => navigate(`/app/appointments/book/${store.id}`)} />
          </ClientCard>
        </div>
      )}

      <Section label={t("Products")}>
        {d.products.length === 0 ? (
          <ClientEmpty icon={ShoppingBag} title={t("No products yet")} line={t("This store hasn't listed anything to buy yet.")} />
        ) : (
          <ClientCard label={t("Products")}>
            {d.products.map((p) => (
              <ClientRow
                key={p.id}
                icon={ShoppingBag}
                title={p.name}
                sub={p.stock !== null && p.stock <= 0 ? t("Out of stock") : p.description || undefined}
                value={p.price !== null ? moneyShort(p.price) : undefined}
                onClick={() => navigate(`/app/store/${store.id}/p/${p.id}`)}
              />
            ))}
          </ClientCard>
        )}
      </Section>

      {inCart > 0 && takesNew && <PinnedCta primary={{ label: t("View cart · {n}", { n: inCart }), icon: <ShoppingCart size={15} />, onClick: () => navigate("/app/store/cart") }} />}
      {inCart > 0 && takesNew && <div aria-hidden style={{ height: 60 }} />}
    </div>
  );
}
