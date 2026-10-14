import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Info, MapPin, ShieldCheck, ShoppingCart, Truck, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { deliveryFeeFor, writeCart } from "../../services/store/customer";
import { placeOrder, storeOrdersShipped, type Fulfilment } from "../../services/store/orders";
import { money } from "../../services/store/format";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, InfoNote, RadioRow, RetryLine, Section, SkeletonCards, SoonChip } from "./clientKit";
import { loadCart } from "./CartPage";
import { useCart } from "./useCart";

// OURS-customer-store-checkout (Designed by us). Cash today; Whish shown as
// "Soon"; no card fields (decided). place_order (B11) takes the prices, fee
// and stock from the database. The delivery address goes to this store for
// this order only and is cleared 90 days after completion (V6-38).

const FIELD = "w-full bg-cream-soft border-[0.5px] border-charcoal/[0.10] rounded-[12px] text-[14px] leading-[21px] text-charcoal placeholder:text-charcoal-faint outline-none focus:border-primary-dark";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const { uid, cart } = useCart();
  const key = cart ? `${cart.businessId}:${cart.lines.map((l) => l.offeringId + "x" + l.qty).join(",")}` : "none";
  const live = useLive(cart ? () => loadCart(cart) : null, 0, key);
  const [shipped, setShipped] = useState<boolean | null | undefined>(undefined);
  const [method, setMethod] = useState<Fulfilment | null>(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const store = d?.store ?? null;

  useEffect(() => {
    void storeOrdersShipped().then(setShipped);
  }, []);
  useEffect(() => {
    if (store && method === null) setMethod(store.pickup ? "pickup" : store.delivery ? "delivery" : null);
  }, [store, method]);

  if (!cart || cart.lines.length === 0) {
    return (
      <div>
        <PageHeader title="Checkout" showBack sub />
        <ClientEmpty icon={ShoppingCart} title="Your cart is empty" line="Add products from a store on Explore, then check out here." />
      </div>
    );
  }
  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title="Checkout" showBack sub />
        <SkeletonCards heights={[112, 112, 120]} label="Loading checkout" />
      </div>
    );
  }
  if (!d || !store) {
    return (
      <div>
        <PageHeader title="Checkout" showBack sub />
        <RetryLine text="Couldn't load checkout." onRetry={live.reload} />
      </div>
    );
  }

  const subtotal = d.lines.reduce((a, l) => a + l.total, 0);
  const fee = method === "delivery" ? deliveryFeeFor(store, subtotal) : 0;
  const total = subtotal + fee;
  const addressOk = method !== "delivery" || address.trim().length >= 6;
  const phoneOk = method !== "delivery" || phone.replace(/[^\d]/g, "").length >= 6;
  const ready = shipped === true && !!method && addressOk && phoneOk && d.lines.length > 0 && online;

  const submit = async () => {
    if (!method) return;
    setBusy(true);
    setError(null);
    const r = await placeOrder({
      businessId: store.id,
      fulfilment: method,
      items: d.lines.map((l) => ({ offeringId: l.product.id, qty: l.qty })),
      deliveryAddress: method === "delivery" ? address.trim() : null,
      phone: method === "delivery" ? phone.trim() : null,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Ordering from stores is coming soon." : "Couldn't place your order. Try again.");
      return;
    }
    writeCart(uid, null);
    navigate(`/app/store/orders/${r.value}?placed=1`, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Checkout" subtitle={store.name} showBack sub />

      <Section label="How you get it" first>
        <ClientCard>
          <div role="radiogroup" aria-label="How you get it">
            {store.pickup && <RadioRow icon={MapPin} selected={method === "pickup"} onSelect={() => setMethod("pickup")} title="Pickup" sub={store.location ? `At ${store.location}` : "At the store"} />}
            {store.delivery && (
              <RadioRow
                icon={Truck}
                selected={method === "delivery"}
                onSelect={() => setMethod("delivery")}
                title="Delivery"
                sub={[deliveryFeeFor(store, subtotal) === 0 ? "Free" : money(deliveryFeeFor(store, subtotal)), store.deliveryTime].filter(Boolean).join(" · ")}
              />
            )}
          </div>
        </ClientCard>
        {method === "delivery" && (
          <div style={{ marginTop: 12 }}>
            <label htmlFor="co-address" className="block text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
              Delivery address
            </label>
            <textarea id="co-address" rows={2} maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, floor" className={FIELD} style={{ padding: "10px 12px", resize: "none" }} />
            <label htmlFor="co-phone" className="block text-[12px] font-bold text-charcoal-soft" style={{ margin: "12px 0 6px" }}>
              Phone
            </label>
            <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For the driver" className={FIELD} style={{ height: 44, padding: "0 12px" }} />
            <InfoNote icon={ShieldCheck}>Only this store sees your address and phone, for this order. They're removed 90 days after it's delivered.</InfoNote>
          </div>
        )}
      </Section>

      <Section label="Payment">
        <ClientCard>
          <div role="radiogroup" aria-label="Payment">
            <RadioRow icon={Banknote} selected title="Cash" sub={method === "delivery" ? "Pay when it's delivered" : "Pay when you pick it up"} />
            <RadioRow icon={Wallet} selected={false} disabled title="Whish" sub="Pay in the app" trailing={<SoonChip />} />
          </div>
        </ClientCard>
      </Section>

      <Section label="Summary">
        <ClientCard label="Summary">
          {d.lines.map((l) => (
            <ClientRow key={l.product.id} title={l.product.name} sub={`qty ${l.qty}`} value={money(l.total)} />
          ))}
          {method === "delivery" && <ClientRow title="Delivery" value={fee === 0 ? "Free" : money(fee)} />}
          <ClientRow title={<span className="font-bold">Total</span>} value={money(total)} />
        </ClientCard>
        {store.returnsPolicy && (
          <p className="text-[12px] font-medium leading-[17px] text-charcoal-faint" style={{ marginTop: 10, padding: "0 4px" }}>
            Returns: {store.returnsPolicy}
          </p>
        )}
      </Section>

      {shipped === false && <InfoNote icon={Info}>Ordering from stores is coming soon. Your cart stays saved on this device.</InfoNote>}
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}

      <div aria-hidden style={{ height: 60 }} />
      <PinnedCta primary={{ label: `Place order · ${money(total)}`, onClick: () => void submit(), disabled: !ready, loading: busy }} />
    </div>
  );
}
