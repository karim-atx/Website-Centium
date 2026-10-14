import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CircleX, MapPin, Package, Truck } from "lucide-react";
import { advanceOrder, cancelOrder, fetchOrder } from "../../../services/store/orders";
import { nextAction, orderSteps, stepToast } from "../../../services/store/orderSteps";
import { dayClock, money, moneyShort } from "../../../services/store/format";
import { fetchStoreInfo, type StoreInfo } from "../../../services/store/customer";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, TextButton, useOpsToast } from "./opsKit";
import { STEP_CHIP, STEP_ICON, customerLabel, methodWord, useLive } from "./storeShared";

// OP1-005 / OP1-007 · Order detail, every step (OURS-OP1-store-order-steps)
// and the cancel confirm (OP1-004, entry = the "Cancel order" text button).

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const online = useOnline();
  const live = useLive(() => fetchOrder(orderId), 120000, orderId);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);

  const s = live.state;
  const order = s.status === "ok" ? s.value : null;

  useEffect(() => {
    if (!order?.businessId) return;
    let alive = true;
    void fetchStoreInfo(order.businessId).then((r) => alive && r.status === "ok" && setStore(r.value));
    return () => {
      alive = false;
    };
  }, [order?.businessId]);

  if (s.status === "loading") {
    return (
      <div>
        <OpsHeader back kicker="Orders" title="Order" />
        {["Items", "Delivery", "Status"].map((l) => (
          <section key={l}>
            <KitLabel label={l} />
            <ListSkeleton rows={2} label={`Loading ${l.toLowerCase()}`} />
          </section>
        ))}
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker="Orders" title="Order" />
        <ErrorCard text="Couldn't load this order." onRetry={live.reload} />
      </div>
    );
  }
  if (!order) {
    return (
      <div>
        <OpsHeader back kicker="Orders" title="Order" />
        <EmptyCard icon={Package} title="Order not found" body="It may have been removed." />
      </div>
    );
  }

  const customer = customerLabel(order);
  const delivery = order.fulfilment === "delivery";
  const action = nextAction(order);
  const steps = orderSteps(order);
  const openish = action !== null;
  const subParts = [`${methodWord(order)} · placed ${dayClock(order.placedAt)}`];
  if (order.status === "completed" && order.completedAt) subParts.push(`completed ${clock12(order.completedAt)}`);

  const doStep = async () => {
    if (!action) return;
    setBusy(true);
    setStepError(null);
    const r = await advanceOrder(order.id, action.to);
    setBusy(false);
    if (!r.ok) {
      setStepError(r.pending ? "Order updates are coming soon." : "Couldn't update the order. Try again.");
      return;
    }
    showToast(stepToast(action, customer, r.value.notified), nextAction({ ...order, status: action.to }) !== null);
    await live.refresh();
  };

  const doCancel = async () => {
    setBusy(true);
    setCancelError(null);
    const r = await cancelOrder(order.id, null);
    setBusy(false);
    if (!r.ok) {
      setCancelError(r.pending ? "Cancelling orders is coming soon." : "Couldn't cancel the order. Try again.");
      return;
    }
    setCancelOpen(false);
    showToast(r.value.notified ? `Order #${order.number} cancelled. ${customer} has been told.` : `Order #${order.number} cancelled. We couldn't message ${customer}.`, false);
    await live.refresh();
  };

  // OP1-004 #5: the body by payment state.
  const cancelBody =
    order.paymentMethod === "whish"
      ? `${customer} is told by message. Whish refunds are coming soon, so refund in cash for now. This can't be undone.`
      : order.paidAt
        ? `${customer} is refunded and told by message. This can't be undone.`
        : `${customer} is told by message. This can't be undone.`;

  const feeRule = store?.freeDeliveryOver != null ? `Free over ${moneyShort(store.freeDeliveryOver)}` : store?.deliveryTime ?? "Delivery";

  return (
    <div>
      <OpsHeader back kicker="Orders" title={`Order #${order.number}`} sub={subParts.join(" · ")} />

      <KitLabel label="Items" />
      <ListCard label="Items">
        {order.items.map((i) => (
          <KitRow key={i.id} icon={Package} title={i.name} sub={i.variant ? `${i.variant} · qty ${i.qty}` : `qty ${i.qty}`} value={money(i.lineTotal)} />
        ))}
      </ListCard>

      <KitLabel label={delivery ? "Delivery" : "Pickup"} />
      <ListCard label={delivery ? "Delivery" : "Pickup"}>
        {delivery ? (
          <>
            <KitRow
              icon={MapPin}
              title={order.deliveryAddress ?? "Address removed"}
              sub={[customer, order.customerPhone].filter(Boolean).join(" · ")}
            />
            <KitRow icon={Truck} title="Delivery fee" sub={feeRule} value={money(order.deliveryFee)} />
          </>
        ) : (
          <KitRow icon={MapPin} title={store?.location ?? store?.name ?? "Your store"} sub={["Pickup", customer, order.customerPhone].filter(Boolean).join(" · ")} />
        )}
      </ListCard>

      <NumberBoxes
        items={[
          { v: money(order.total), l: "Total" },
          order.paymentMethod === "whish"
            ? { v: "Whish", l: "Paid" }
            : { v: "Cash", l: order.paidAt ? "Paid" : delivery ? "On delivery" : "At pickup" },
        ]}
      />

      <KitLabel label="Status" />
      <ListCard label="Status">
        {steps.map((st) => {
          const Icon = STEP_ICON[st.glyph];
          const chip = st.tone === "bad" ? { label: "Cancelled", tone: "bad" as const } : STEP_CHIP[st.tone];
          return <KitRow key={st.key} icon={Icon} title={st.title} sub={st.at ? clock12(st.at) : st.hint ?? undefined} chip={chip} />;
        })}
        {order.status === "cancelled" && (order.refundAmount !== null || order.paymentMethod === "whish") && (
          <KitRow
            icon={Banknote}
            title="Refund"
            sub={order.refundMethod === "whish" || order.paymentMethod === "whish" ? "Whish, coming soon" : `Cash${order.refundedAt ? `, ${clock12(order.refundedAt)}` : ""}`}
            value={money(order.refundAmount ?? order.total)}
          />
        )}
      </ListCard>

      {openish && <TextButton tone="high" label="Cancel order" onClick={() => setCancelOpen(true)} disabled={!online} />}

      {action && (
        <>
          <CtaSpacer />
          <FixedCta label={action.label} onClick={doStep} busy={busy && !cancelOpen} disabled={!online} error={stepError} />
        </>
      )}

      <KitPop
        open={cancelOpen}
        icon={CircleX}
        title={`Cancel order #${order.number}?`}
        body={cancelBody}
        action="Cancel order"
        keep="Keep order"
        busy={busy}
        error={cancelError}
        onAction={doCancel}
        onKeep={() => {
          setCancelOpen(false);
          setCancelError(null);
        }}
      />
      {toast}
    </div>
  );
}
