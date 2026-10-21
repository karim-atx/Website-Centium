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
  if (store.pickup) parts.push("Pickup");
  if (store.delivery) {
    const fee = store.deliveryFee ? moneyShort(store.deliveryFee) : "free";
    parts.push(store.freeDeliveryOver !== null ? `Delivery ${fee}, free over ${moneyShort(store.freeDeliveryOver)}` : `Delivery ${fee}`);
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
        <PageHeader title="Store" showBack sub />
        <SkeletonCards heights={[64, 72, 72, 72]} label="Loading the store" />
      </div>
    );
  }
  if (s.status === "error" || s.status === "pending" || !d?.store) {
    return (
      <div>
        <PageHeader title="Store" showBack sub />
        {s.status === "error" ? (
          <RetryLine text="Couldn't load this store." onRetry={live.reload} />
        ) : !takesNew ? (
          <BusinessClosedNote status={bizStatus} what="orders" />
        ) : (
          <ClientEmpty icon={ShoppingBag} title="Store not found" line="It may not be listed on Explore right now." />
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
        <ClientCard label="How you get it">
          <ClientRow icon={store.delivery ? Truck : MapPin} title={store.delivery && store.pickup ? "Pickup or delivery" : store.delivery ? "Delivery" : "Pickup"} sub={fulfilmentLine(store)} />
        </ClientCard>
      )}

      {store.offersAppointments && takesNew && (
        <div style={{ marginTop: 10 }}>
          <ClientCard>
            <ClientRow icon={CalendarPlus} title="Book an appointment" sub="See services and free times" onClick={() => navigate(`/app/appointments/book/${store.id}`)} />
          </ClientCard>
        </div>
      )}

      <Section label="Products">
        {d.products.length === 0 ? (
          <ClientEmpty icon={ShoppingBag} title="No products yet" line="This store hasn't listed anything to buy yet." />
        ) : (
          <ClientCard label="Products">
            {d.products.map((p) => (
              <ClientRow
                key={p.id}
                icon={ShoppingBag}
                title={p.name}
                sub={p.stock !== null && p.stock <= 0 ? "Out of stock" : p.description || undefined}
                value={p.price !== null ? moneyShort(p.price) : undefined}
                onClick={() => navigate(`/app/store/${store.id}/p/${p.id}`)}
              />
            ))}
          </ClientCard>
        )}
      </Section>

      {inCart > 0 && takesNew && <PinnedCta primary={{ label: `View cart · ${inCart}`, icon: <ShoppingCart size={15} />, onClick: () => navigate("/app/store/cart") }} />}
      {inCart > 0 && takesNew && <div aria-hidden style={{ height: 60 }} />}
    </div>
  );
}
