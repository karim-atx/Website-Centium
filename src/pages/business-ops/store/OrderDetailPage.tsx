import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CircleX, MapPin, MessageCircle, MessageSquare, Package, Truck } from "lucide-react";
import { advanceOrder, cancelOrder, fetchStoreOrder, markOrderPaid } from "../../../services/store/orders";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import { nextAction, orderSteps, stepToast } from "../../../services/store/orderSteps";
import { storeErrorText } from "../../../services/store/mapping";
import { dayClock, money, moneyShort } from "../../../services/store/format";
import { fetchStoreInfo, type StoreInfo } from "../../../services/store/customer";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, TextButton, useOpsToast } from "./opsKit";
import { STEP_CHIP, STEP_ICON, customerLabel, customerWho, methodWord, useLive, useMessagePerson } from "./storeShared";

// OP1-005 / OP1-007 · Order detail, every step (OURS-OP1-store-order-steps)
// and the cancel confirm (OP1-004, entry = the "Cancel order" text button).
// B11: advance_order_status (pushes the customer), cancel_order (stock back;
// a paid order stays paid and its refund is recorded in Revenue),
// mark_order_paid (the store records the cash; Centium processes no money).
// Row 13: "Message {customer}" in the Delivery / Pickup card opens the
// business's thread with them (start_member_thread, gate messages).

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const online = useOnline();
  const live = useLive(() => fetchStoreOrder(orderId), 120000, orderId);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const msg = useMessagePerson();
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
  const paid = order.paymentStatus === "paid";
  const subParts = [`${methodWord(order)} · placed ${dayClock(order.placedAt)}`];
  if (order.status === "completed" && order.completedAt) subParts.push(`completed ${clock12(order.completedAt)}`);

  const doStep = async () => {
    if (!action) return;
    setBusy(true);
    setStepError(null);
    const r = await advanceOrder(order.id, action.to);
    setBusy(false);
    if (!r.ok) {
      setStepError(r.pending ? "Order updates are coming soon." : storeErrorText(r, "Couldn't update the order. Try again."));
      return;
    }
    showToast(stepToast(action, customer), nextAction({ ...order, status: action.to }) !== null);
    await live.refresh();
  };

  const doPaid = async () => {
    setBusy(true);
    setStepError(null);
    const r = await markOrderPaid(order.id);
    setBusy(false);
    if (!r.ok) {
      setStepError(r.pending ? "Marking orders paid is coming soon." : storeErrorText(r, "Couldn't mark the order paid. Try again."));
      return;
    }
    showToast(`Order #${order.number} marked as paid in cash.`, action !== null);
    offerPromotionUsed({ kind: "order", sourceId: order.id });
    await live.refresh();
  };

  const doCancel = async () => {
    setBusy(true);
    setCancelError(null);
    const r = await cancelOrder(order.id, null);
    setBusy(false);
    if (!r.ok) {
      setCancelError(r.pending ? "Cancelling orders is coming soon." : storeErrorText(r, "Couldn't cancel the order. Try again."));
      return;
    }
    setCancelOpen(false);
    showToast(
      r.value.paidToRefund ? `Order #${order.number} cancelled. ${customer} has been told. Record the cash refund in Revenue.` : `Order #${order.number} cancelled. ${customer} has been told.`,
      false
    );
    await live.refresh();
  };

  // OP1-004 #5: the body by payment state. B11 refunds nothing itself: a paid
  // order stays paid and the store records the cash it hands back.
  const cancelBody = paid
    ? `${customer} is told by message. It's paid, so hand back the cash and record the refund in Revenue. This can't be undone.`
    : `${customer} is told by message. This can't be undone.`;

  const feeRule = store?.freeDeliveryOver != null ? `Free over ${moneyShort(store.freeDeliveryOver)}` : store?.deliveryTime ?? "Delivery";
  const payLabel = order.paymentStatus === "refunded" ? "Refunded" : paid ? "Paid" : delivery ? "On delivery" : "At pickup";

  return (
    <div>
      <OpsHeader back kicker="Orders" title={`Order #${order.number}`} sub={subParts.join(" · ")} />

      <KitLabel label="Items" />
      <ListCard label="Items">
        {order.items.map((i) => (
          <KitRow key={i.id} icon={Package} title={i.name} sub={`qty ${i.qty}`} value={money(i.lineTotal)} />
        ))}
      </ListCard>

      <KitLabel label={delivery ? "Delivery" : "Pickup"} />
      <ListCard label={delivery ? "Delivery" : "Pickup"}>
        {delivery ? (
          <>
            <KitRow icon={MapPin} title={order.deliveryAddress ?? "Address removed"} sub={customerWho(order)} />
            <KitRow icon={Truck} title="Delivery fee" sub={feeRule} value={money(order.deliveryFee)} />
          </>
        ) : (
          <KitRow icon={MapPin} title={store?.location ?? store?.name ?? "Your store"} sub={["Pickup", customerWho(order)].join(" · ")} />
        )}
        {order.note && <KitRow icon={MessageSquare} title="Note from the customer" sub={order.note} subWrap />}
        {msg.can && order.customerId && (
          <KitRow icon={MessageCircle} title={`Message ${customer}`} onClick={() => void msg.open(order.customerId!)} disabled={!online || msg.busy} />
        )}
      </ListCard>
      {msg.error && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ margin: "-6px 0 10px" }}>
          {msg.error}
        </p>
      )}

      <NumberBoxes
        items={[
          { v: money(order.total), l: "Total" },
          order.paymentMethod === "whish" ? { v: "Whish", l: payLabel } : { v: "Cash", l: payLabel },
        ]}
      />
      {order.status !== "cancelled" && order.paymentStatus === "pending" && (
        <TextButton label="Mark as paid in cash" onClick={() => void doPaid()} disabled={busy || !online} />
      )}

      <KitLabel label="Status" />
      <ListCard label="Status">
        {steps.map((st) => {
          const Icon = STEP_ICON[st.glyph];
          const chip = st.tone === "bad" ? { label: "Cancelled", tone: "bad" as const } : STEP_CHIP[st.tone];
          return <KitRow key={st.key} icon={Icon} title={st.title} sub={st.at ? clock12(st.at) : st.hint ?? undefined} chip={chip} />;
        })}
        {order.status === "cancelled" && order.paymentStatus !== "pending" && (
          <KitRow
            icon={Banknote}
            title="Refund"
            sub={order.paymentStatus === "refunded" ? "Recorded in Revenue" : "Paid in cash · record the refund in Revenue"}
            value={money(order.total)}
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
      {!action && stepError && (
        <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 8 }}>
          {stepError}
        </p>
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
