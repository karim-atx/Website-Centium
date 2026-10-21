import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { takesNewActivity } from "../../services/business-closure/logic";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Info, MapPin, ShieldCheck, ShoppingCart, Truck, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { deliveryFeeFor, writeCart } from "../../services/store/customer";
import { placeOrder, storeOrdersShipped, type Fulfilment } from "../../services/store/orders";
import { storeErrorText } from "../../services/store/mapping";
import { money } from "../../services/store/format";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, InfoNote, RadioRow, RetryLine, Section, SkeletonCards, SoonChip } from "./clientKit";
import { loadCart } from "./CartPage";
import { useCart } from "./useCart";

// OURS-customer-store-checkout (Designed by us). Cash today; Whish shown as
// "Soon"; no card fields (decided). place_order (B11) takes the prices, fee
// and stock from the database; its refusals (ATXE8 out of stock, ATXE9 not
// taking orders, ATXF0 pickup / delivery not offered) read as sentences. The
// delivery address goes to this store for this order only and is cleared 90
// days after the order ends (V6-38). B11 has no phone column, so the old
// Phone field is now an optional note for the store (p_note, 300).

const FIELD = "w-full bg-cream-soft border-[0.5px] border-charcoal/[0.10] rounded-[12px] text-[14px] leading-[21px] text-charcoal placeholder:text-charcoal-faint outline-none focus:border-primary-dark";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const { uid, cart } = useCart();
  const key = cart ? `${cart.businessId}:${cart.lines.map((l) => l.offeringId + "x" + l.qty).join(",")}` : "none";
  const live = useLive(cart ? () => loadCart(cart) : null, 0, key);
  // CP: a closed or paused store takes no new orders.
  const bizStatus = useBusinessStatus(cart?.businessId);
  const takesNew = takesNewActivity(bizStatus);
  const [shipped, setShipped] = useState<boolean | null | undefined>(undefined);
  const [method, setMethod] = useState<Fulfilment | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
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
        {takesNew ? <RetryLine text="Couldn't load checkout." onRetry={live.reload} /> : <BusinessClosedNote status={bizStatus} what="orders" />}
      </div>
    );
  }

  const subtotal = d.lines.reduce((a, l) => a + l.total, 0);
  const fee = method === "delivery" ? deliveryFeeFor(store, subtotal) : 0;
  const total = subtotal + fee;
  const addressOk = method !== "delivery" || address.trim().length >= 6;
  const ready = shipped === true && !!method && addressOk && d.lines.length > 0 && online && takesNew;

  const submit = async () => {
    if (!method) return;
    setBusy(true);
    setError(null);
    const r = await placeOrder({
      businessId: store.id,
      fulfilment: method,
      items: d.lines.map((l) => ({ offeringId: l.product.id, qty: l.qty })),
      deliveryAddress: method === "delivery" ? address.trim() : null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Ordering from stores is coming soon." : storeErrorText(r, "Couldn't place your order. Try again."));
      return;
    }
    writeCart(uid, null);
    navigate(`/app/store/orders/${r.value}?placed=1`, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Checkout" subtitle={store.name} showBack sub />
      <BusinessClosedNote status={bizStatus} what="orders" className="mb-3" />

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
            <InfoNote icon={ShieldCheck}>Only this store sees your address, for this order. It's removed 90 days after the order ends.</InfoNote>
          </div>
        )}
        <label htmlFor="co-note" className="block text-[12px] font-bold text-charcoal-soft" style={{ margin: "12px 0 6px" }}>
          Note for the store
        </label>
        <textarea id="co-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={FIELD} style={{ padding: "10px 12px", resize: "none" }} />
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
