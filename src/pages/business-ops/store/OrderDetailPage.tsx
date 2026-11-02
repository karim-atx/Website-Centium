import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CircleX, MapPin, MessageCircle, MessageSquare, Package, Truck } from "lucide-react";
import { advanceOrder, cancelOrder, fetchStoreOrder, markOrderPaid } from "../../../services/store/orders";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import { nextAction, orderSteps } from "../../../services/store/orderSteps";
import { t, tk } from "../../../i18n/core";
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
        <OpsHeader back kicker={t("Orders")} title={t("Order")} />
        {[
          [tk("Items"), tk("Loading items")],
          [tk("Delivery"), tk("Loading delivery")],
          [tk("Status"), tk("Loading status")],
        ].map(([l, loading]) => (
          <section key={l}>
            <KitLabel label={t(l)} />
            <ListSkeleton rows={2} label={t(loading)} />
          </section>
        ))}
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker={t("Orders")} title={t("Order")} />
        <ErrorCard text={t("Couldn't load this order.")} onRetry={live.reload} />
      </div>
    );
  }
  if (!order) {
    return (
      <div>
        <OpsHeader back kicker={t("Orders")} title={t("Order")} />
        <EmptyCard icon={Package} title={t("Order not found")} body={t("It may have been removed.")} />
      </div>
    );
  }

  const customer = customerLabel(order);
  const delivery = order.fulfilment === "delivery";
  const action = nextAction(order);
  const steps = orderSteps(order);
  const openish = action !== null;
  const paid = order.paymentStatus === "paid";
  const subParts = [`${methodWord(order)} · ${t("placed {when}", { when: dayClock(order.placedAt) })}`];
  if (order.status === "completed" && order.completedAt) subParts.push(t("completed {time}", { time: clock12(order.completedAt) }));

  const doStep = async () => {
    if (!action) return;
    setBusy(true);
    setStepError(null);
    const r = await advanceOrder(order.id, action.to);
    setBusy(false);
    if (!r.ok) {
      setStepError(r.pending ? t("Order updates are coming soon.") : storeErrorText(r, t("Couldn't update the order. Try again.")));
      return;
    }
    // stepToast's sentence, built here so each half reads in the app's language.
    showToast(action.quiet ? t(action.done) : `${t(action.done)} ${t("{customer} has been told.", { customer })}`, nextAction({ ...order, status: action.to }) !== null);
    await live.refresh();
  };

  const doPaid = async () => {
    setBusy(true);
    setStepError(null);
    const r = await markOrderPaid(order.id);
    setBusy(false);
    if (!r.ok) {
      setStepError(r.pending ? t("Marking orders paid is coming soon.") : storeErrorText(r, t("Couldn't mark the order paid. Try again.")));
      return;
    }
    showToast(t("Order #{number} marked as paid in cash.", { number: order.number }), action !== null);
    offerPromotionUsed({ kind: "order", sourceId: order.id });
    await live.refresh();
  };

  const doCancel = async () => {
    setBusy(true);
    setCancelError(null);
    const r = await cancelOrder(order.id, null);
    setBusy(false);
    if (!r.ok) {
      setCancelError(r.pending ? t("Cancelling orders is coming soon.") : storeErrorText(r, t("Couldn't cancel the order. Try again.")));
      return;
    }
    setCancelOpen(false);
    showToast(
      r.value.paidToRefund
        ? t("Order #{number} cancelled. {customer} has been told. Record the cash refund in Revenue.", { number: order.number, customer })
        : t("Order #{number} cancelled. {customer} has been told.", { number: order.number, customer }),
      false
    );
    await live.refresh();
  };

  // OP1-004 #5: the body by payment state. B11 refunds nothing itself: a paid
  // order stays paid and the store records the cash it hands back.
  const cancelBody = paid
    ? t("{customer} is told by message. It's paid, so hand back the cash and record the refund in Revenue. This can't be undone.", { customer })
    : t("{customer} is told by message. This can't be undone.", { customer });

  const feeRule = store?.freeDeliveryOver != null ? t("Free over {amount}", { amount: moneyShort(store.freeDeliveryOver) }) : store?.deliveryTime ?? t("Delivery");
  const payLabel = order.paymentStatus === "refunded" ? t("Refunded") : paid ? t("Paid") : delivery ? t("On delivery") : t("At pickup");

  return (
    <div>
      <OpsHeader back kicker={t("Orders")} title={t("Order #{number}", { number: order.number })} sub={subParts.join(" · ")} />

      <KitLabel label={t("Items")} />
      <ListCard label={t("Items")}>
        {order.items.map((i) => (
          <KitRow key={i.id} icon={Package} title={i.name} sub={t("qty {n}", { n: i.qty })} value={money(i.lineTotal)} />
        ))}
      </ListCard>

      <KitLabel label={delivery ? t("Delivery") : t("Pickup")} />
      <ListCard label={delivery ? t("Delivery") : t("Pickup")}>
        {delivery ? (
          <>
            <KitRow icon={MapPin} title={order.deliveryAddress ?? t("Address removed")} sub={customerWho(order)} />
            <KitRow icon={Truck} title={t("Delivery fee")} sub={feeRule} value={money(order.deliveryFee)} />
          </>
        ) : (
          <KitRow icon={MapPin} title={store?.location ?? store?.name ?? t("Your store")} sub={[t("Pickup"), customerWho(order)].join(" · ")} />
        )}
        {order.note && <KitRow icon={MessageSquare} title={t("Note from the customer")} sub={order.note} subWrap />}
        {msg.can && order.customerId && (
          <KitRow icon={MessageCircle} title={t("Message {name}", { name: customer })} onClick={() => void msg.open(order.customerId!)} disabled={!online || msg.busy} />
        )}
      </ListCard>
      {msg.error && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ margin: "-6px 0 10px" }}>
          {msg.error}
        </p>
      )}

      <NumberBoxes
        items={[
          { v: money(order.total), l: t("Total") },
          order.paymentMethod === "whish" ? { v: "Whish", l: payLabel } : { v: t("Cash"), l: payLabel },
        ]}
      />
      {order.status !== "cancelled" && order.paymentStatus === "pending" && (
        <TextButton label={t("Mark as paid in cash")} onClick={() => void doPaid()} disabled={busy || !online} />
      )}

      <KitLabel label={t("Status")} />
      <ListCard label={t("Status")}>
        {steps.map((st) => {
          const Icon = STEP_ICON[st.glyph];
          const chip = st.tone === "bad" ? { label: t("Cancelled"), tone: "bad" as const } : { label: t(STEP_CHIP[st.tone].label), tone: STEP_CHIP[st.tone].tone };
          return <KitRow key={st.key} icon={Icon} title={t(st.title)} sub={st.at ? clock12(st.at) : st.hint ? t(st.hint) : undefined} chip={chip} />;
        })}
        {order.status === "cancelled" && order.paymentStatus !== "pending" && (
          <KitRow
            icon={Banknote}
            title={t("Refund")}
            sub={order.paymentStatus === "refunded" ? t("Recorded in Revenue") : t("Paid in cash · record the refund in Revenue")}
            value={money(order.total)}
          />
        )}
      </ListCard>

      {openish && <TextButton tone="high" label={t("Cancel order")} onClick={() => setCancelOpen(true)} disabled={!online} />}

      {action && (
        <>
          <CtaSpacer />
          <FixedCta label={t(action.label)} onClick={doStep} busy={busy && !cancelOpen} disabled={!online} error={stepError} />
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
        title={t("Cancel order #{number}?", { number: order.number })}
        body={cancelBody}
        action={t("Cancel order")}
        keep={t("Keep order")}
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
