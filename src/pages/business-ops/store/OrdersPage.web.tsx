import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banknote, CircleX, MapPin, MessageCircle, MessageSquare, Package, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { advanceOrder, cancelOrder, fetchStoreOrder, fetchStoreReturn, markOrderPaid, respondReturn, type ReturnStatus, type StoreOrder, type StoreReturn } from "../../../services/store/orders";
import { isOpen, nextAction, orderChip, orderSteps, returnAction, returnChip, returnGroup, returnSteps } from "../../../services/store/orderSteps";
import { ageLabel, completedBucket, completedWhen, dayClock, dayWord, money, moneyShort } from "../../../services/store/format";
import { fetchStoreInfo, type StoreInfo } from "../../../services/store/customer";
import { storeErrorText } from "../../../services/store/mapping";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { ErrorCard, KitPop, useOpsToast } from "./opsKit";
import { ORDER_KINDS, STEP_CHIP, STEP_ICON, customerLabel, customerWho, methodWord, useLive, useMessagePerson, useStoreBusiness } from "./storeShared";
import { loadOrdersData } from "./StoreOrdersPage";
import { AppointmentsPanel } from "../appointments/AppointmentsPage";
import { FOCUS, WebBoxes, WebEmpty, WebLabel, WebList, WebListSkeleton, WebRow, WebTabs, WebTip } from "./webKit";
import { t, tk, tx } from "../../../i18n/core";

// Website viewport v1 · WB-ST-OR Orders (WB-ST Orders Web v2) with the order
// (.1) and return (.2) detail as list-detail: at 1440 the tab's lists in 5 of
// 12 columns and the selected order or return in 7 (the first one by
// default), its items and delivery beside the total, payment and status, the
// actions in the card's foot. At 1024 the lists fill the page and a row
// opens its detail on its own page. /app/business/orders, /:orderId and
// /returns/:returnId all render this page on web. Loading, the rules, the
// actions and their confirms (KitPop, 400 centred) are the mobile pages'.

type TabKey = "fulfil" | "completed" | "returns" | "appointments";
const CAP = 3;

const orderChipT = (o: StoreOrder) => {
  const raw = orderChip(o);
  return { ...raw, label: t(raw.label) };
};
const returnChipT = (r: StoreReturn) => {
  const raw = returnChip(r.status, r.kind);
  return { ...raw, label: t(raw.label) };
};

export default function OrdersPageWeb() {
  const { orderId, returnId } = useParams();
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const rowH = rail ? 48 : 56;
  const [params] = useSearchParams();
  const { businessId, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const [withAppts, setWithAppts] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchStoreInfo(businessId).then((r) => {
      if (alive && r.status === "ok" && r.value) setWithAppts(r.value.businessType === "wellness_service" && r.value.offersAppointments && r.value.sellsProducts);
    });
    return () => {
      alive = false;
    };
  }, [businessId]);

  const live = useLive(businessId ? () => loadOrdersData(businessId) : null, 120000, "", { businessId, kinds: ORDER_KINDS });
  const s = live.state;
  const data = s.status === "ok" ? s.value : null;
  const open = useMemo(() => (data ? data.orders.filter((o) => isOpen(o.status)) : []), [data]);
  const done = useMemo(() => (data ? data.orders.filter((o) => !isOpen(o.status)) : []), [data]);
  const neverOrdered = !!data && data.orders.length === 0 && data.returns.length === 0;
  const loading = !ready || (!!businessId && s.status === "loading");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "fulfil", label: t("To fulfil") },
    { key: "completed", label: t("Completed") },
    { key: "returns", label: t("Returns") },
    ...(withAppts ? [{ key: "appointments" as TabKey, label: t("Appointments") }] : []),
  ];
  const raw = params.get("tab") as TabKey | null;
  // A selected order opens on its own tab (open: To fulfil, else Completed); a return on Returns.
  const routeOrder = orderId ? data?.orders.find((o) => o.id === orderId) ?? null : null;
  const implied: TabKey = returnId ? "returns" : routeOrder && !isOpen(routeOrder.status) ? "completed" : "fulfil";
  const tab: TabKey = raw && tabs.some((x) => x.key === raw) ? raw : implied;
  const setTab = (k: TabKey) => navigate({ pathname: "/app/business/orders", search: k === "fulfil" ? "" : `?tab=${k}` }, { replace: true });

  const when = (o: StoreOrder) => o.completedAt ?? o.cancelledAt ?? o.placedAt;
  const completedGroups = [
    { key: "today", label: t("Today"), list: done.filter((o) => completedBucket(when(o)) === "today") },
    { key: "week", label: t("This week"), list: done.filter((o) => completedBucket(when(o)) === "week") },
    { key: "earlier", label: t("Earlier"), list: done.filter((o) => completedBucket(when(o)) === "earlier") },
  ].filter((g) => g.list.length > 0);
  const returnGroups = [
    { key: "needs", label: t("Needs you") },
    { key: "progress", label: t("In progress") },
    { key: "done", label: t("Done") },
  ]
    .map((g) => ({ ...g, list: (data?.returns ?? []).filter((r) => returnGroup(r.status, r.kind) === g.key) }))
    .filter((g) => g.list.length > 0);
  const requested = (data?.returns ?? []).filter((r) => r.status === "requested");

  // The selection: the route's order or return; at 1440 the tab's first row by default.
  const firstOf = (): { kind: "order" | "return"; id: string } | null => {
    if (tab === "fulfil") return open[0] ? { kind: "order", id: open[0].id } : requested[0] ? { kind: "return", id: requested[0].id } : null;
    if (tab === "completed") {
      const o = completedGroups[0]?.list[0];
      return o ? { kind: "order", id: o.id } : null;
    }
    if (tab === "returns") {
      const r = returnGroups[0]?.list[0];
      return r ? { kind: "return", id: r.id } : null;
    }
    return null;
  };
  const sel: { kind: "order" | "return"; id: string } | null = orderId ? { kind: "order", id: orderId } : returnId ? { kind: "return", id: returnId } : rail ? null : firstOf();
  const openOrder = (o: StoreOrder) => navigate({ pathname: `/app/business/orders/${o.id}`, search: tab === (isOpen(o.status) ? "fulfil" : "completed") ? "" : `?tab=${tab}` }, { replace: !rail });
  const openReturn = (r: StoreReturn) => navigate({ pathname: `/app/business/orders/returns/${r.id}`, search: tab === "fulfil" ? "?tab=fulfil" : "" }, { replace: !rail });
  const seeAll = (which: string) => navigate(`/app/business/orders/list/${which}`);
  const refreshList = () => void live.refresh();

  // At 1024 a selected order or return is its own page (the detail card filling the content).
  if (rail && sel) {
    return (
      <div>
        <div className="sticky top-0 z-30">
          <WebPageHeader title={t("Orders")} back={{ to: "/app/business/orders", label: tk("Back"), square: true, onClick: () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/orders")) }} />
        </div>
        <div style={{ padding: 32 }}>
          <div className="max-w-[1600px]">{sel.kind === "order" ? <OrderPane key={sel.id} id={sel.id} rail onChanged={refreshList} /> : <ReturnPane key={sel.id} id={sel.id} rail onChanged={refreshList} />}</div>
        </div>
      </div>
    );
  }

  const orderRow = (o: StoreOrder, i: number, list: StoreOrder[], completed: boolean) => {
    const chip = orderChipT(o);
    const on = !rail && sel?.kind === "order" && sel.id === o.id;
    const prevOn = i > 0 && !rail && sel?.kind === "order" && sel.id === list[i - 1].id;
    const what = o.status === "cancelled" ? t("Cancelled") : o.fulfilment === "delivery" ? t("Delivered") : t("Picked up");
    const at = o.status === "cancelled" ? o.cancelledAt : o.completedAt;
    return (
      <WebRow
        key={o.id}
        icon={o.fulfilment === "delivery" ? Truck : Package}
        title={t("Order #{number}", { number: o.number })}
        sub={completed ? `${what} · ${customerWho(o)}${at ? ` · ${completedWhen(at)}` : ""}` : `${methodWord(o)} · ${customerWho(o)} · ${ageLabel(o.placedAt)}`}
        chip={chip}
        value={completed ? money(o.total) : undefined}
        onClick={() => openOrder(o)}
        ariaLabel={completed ? undefined : `${t("Order #{number}", { number: o.number })}، ${methodWord(o)}، ${customerLabel(o)}، ${chip.label}`}
        rule={i > 0 && !on && !prevOn}
        selected={on}
        rowH={rowH}
      />
    );
  };
  const returnRow = (r: StoreReturn, i: number, list: StoreReturn[]) => {
    const on = !rail && sel?.kind === "return" && sel.id === r.id;
    const prevOn = i > 0 && !rail && sel?.kind === "return" && sel.id === list[i - 1].id;
    return (
      <WebRow
        key={r.id}
        icon={RotateCcw}
        title={t("Return on #{number}", { number: r.orderNumber ?? "" })}
        sub={`${r.reason} · ${customerLabel(r)}`}
        chip={returnChipT(r)}
        value={r.status === "refunded" ? money(r.refundAmount) : undefined}
        onClick={() => openReturn(r)}
        rule={i > 0 && !on && !prevOn}
        selected={on}
        rowH={rowH}
      />
    );
  };

  let list: React.ReactNode;
  let empty: { icon: typeof Package; title: string; body: string } | null = null;
  if (tab === "appointments") {
    list = <AppointmentsPanel embedded />;
  } else if (loadError || s.status === "error") {
    const text = tab === "completed" ? t("Couldn't load completed orders.") : tab === "returns" ? t("Couldn't load returns.") : t("Couldn't load your orders.");
    list = <ErrorCard text={text} onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (loading) {
    list = (
      <>
        {tab === "fulfil" && <WebBoxes rail={rail} loading items={[{ v: "", l: t("To fulfil") }, { v: "", l: t("Pickups ready") }, { v: "", l: t("Out for delivery") }]} />}
        <WebListSkeleton rowH={rowH} label={tab === "fulfil" ? t("Loading your orders") : tab === "completed" ? t("Loading completed orders") : t("Loading returns")} />
      </>
    );
  } else if (tab === "fulfil") {
    if (!businessId || !data || neverOrdered) empty = { icon: Package, title: t("No orders yet"), body: t("When a customer orders, it shows here with pickup or delivery details.") };
    else
      list = (
        <>
          <WebBoxes
            rail={rail}
            items={[
              { v: String(open.length), l: t("To fulfil") },
              { v: String(open.filter((o) => o.status === "ready_for_pickup").length), l: t("Pickups ready") },
              { v: String(open.filter((o) => o.status === "out_for_delivery").length), l: t("Out for delivery") },
            ]}
          />
          {open.length === 0 ? (
            <WebEmpty icon={PackageCheck} title={t("Nothing to fulfil")} body={t("New orders show here. Completed ones are in the Completed tab.")} />
          ) : (
            <>
              <WebLabel label={t("To fulfil")} first />
              <WebList label={t("Orders to fulfil")}>{open.map((o, i) => orderRow(o, i, open, false))}</WebList>
            </>
          )}
          {requested.length > 0 && (
            <>
              <WebLabel label={t("Returns")} action={t("See all")} onAction={() => setTab("returns")} />
              <WebList label={t("Returns to approve")}>{requested.slice(0, CAP).map((r, i, a) => returnRow(r, i, a))}</WebList>
            </>
          )}
        </>
      );
  } else if (tab === "completed") {
    if (done.length === 0) empty = { icon: PackageCheck, title: t("No completed orders yet"), body: t("Orders move here once they're delivered or picked up.") };
    else
      list = completedGroups.map((g, gi) => (
        <section key={g.key} className="flex flex-col" style={{ gap: 12 }}>
          <WebLabel label={g.label} first={gi === 0} action={g.list.length > CAP ? t("See all") : undefined} onAction={() => seeAll(`completed?when=${g.key}`)} />
          <WebList label={g.label}>{g.list.slice(0, CAP).map((o, i, a) => orderRow(o, i, a, true))}</WebList>
        </section>
      ));
  } else {
    if ((data?.returns ?? []).length === 0) empty = { icon: RotateCcw, title: t("No returns"), body: t("When a customer asks to return an item, it shows here.") };
    else
      list = returnGroups.map((g, gi) => (
        <section key={g.key} className="flex flex-col" style={{ gap: 12 }}>
          <WebLabel label={g.label} first={gi === 0} action={g.list.length > CAP ? t("See all") : undefined} onAction={() => seeAll(`returns?group=${g.key}`)} />
          <WebList label={g.label}>{g.list.slice(0, CAP).map((r, i, a) => returnRow(r, i, a))}</WebList>
        </section>
      ));
  }

  const showPane = !rail && !empty && tab !== "appointments" && !loading && !(loadError || s.status === "error") && !!sel;

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <WebPageHeader title={t("Orders")} />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] flex flex-col" style={{ gap: 24 }}>
          <WebTabs label={t("Orders")} tabs={tabs} active={tab} onChange={setTab} />
          <div role="tabpanel" aria-label={tabs.find((x) => x.key === tab)?.label}>
            {empty ? (
              <WebEmpty icon={empty.icon} title={empty.title} body={empty.body} minHeight="calc(100dvh - 191px)" />
            ) : (
              <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(12,minmax(0,1fr))", gap: 24, alignItems: "start" }}>
                <div className="min-w-0 flex flex-col" style={{ gridColumn: rail || tab === "appointments" ? "1 / -1" : "span 5", gap: 12 }}>
                  {list}
                </div>
                {showPane && sel && (
                  <div className="min-w-0" style={{ gridColumn: "span 7", position: "sticky", top: 96 }}>
                    {sel.kind === "order" ? <OrderPane key={sel.id} id={sel.id} rail={false} onChanged={refreshList} /> : <ReturnPane key={sel.id} id={sel.id} rail={false} onChanged={refreshList} />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The detail card: 1px border r20, padding 20 (16 at the rail); the head, a two-column body (1.12fr · 1fr) that scrolls, and the actions in the foot. */
const DetailCard: React.FC<{
  label: string;
  kicker: string;
  title: string;
  sub?: string | null;
  rail: boolean;
  left: React.ReactNode;
  right: React.ReactNode;
  foot?: React.ReactNode;
}> = ({ label, kicker, title, sub, rail, left, right, foot }) => (
  <section
    aria-label={label}
    className="flex flex-col"
    style={{ border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, padding: rail ? 16 : 20, boxSizing: "border-box", maxHeight: rail ? undefined : "calc(100dvh - 128px)" }}
  >
    <div className="shrink-0" style={{ marginBottom: rail ? 12 : 16 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#8C8378" }}>{kicker}</p>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{title}</h2>
      {sub && (
        <p title={sub} className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
          {sub}
        </p>
      )}
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto grid" style={{ gridTemplateColumns: "minmax(0,1.12fr) minmax(0,1fr)", alignItems: "start", gap: 20, scrollbarWidth: "thin" }}>
      <div className="min-w-0 flex flex-col" style={{ gap: 12 }}>
        {left}
      </div>
      <div className="min-w-0 flex flex-col" style={{ gap: 12 }}>
        {right}
      </div>
    </div>
    {foot && (
      <div className="shrink-0 flex items-center justify-end flex-wrap" style={{ gap: 12, marginTop: rail ? 12 : 16, paddingTop: rail ? 12 : 16, borderTop: "1px solid #EBEAF6" }}>
        {foot}
      </div>
    )}
  </section>
);

const FootText: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`flex items-center enabled:hover:bg-[#FBE7E4] disabled:opacity-40 ${FOCUS}`} style={{ height: 40, padding: "0 20px", borderRadius: 14, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#C0392B" }}>
    {label}
  </button>
);

const FootCta: React.FC<{ label: string; onClick: () => void; disabled?: boolean; busy?: boolean }> = ({ label, onClick, disabled, busy }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={`flex items-center justify-center whitespace-nowrap enabled:hover:brightness-[0.96] disabled:opacity-50 ${FOCUS}`}
    style={{ height: 44, minWidth: 240, padding: "0 24px", boxSizing: "border-box", borderRadius: 14, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, boxShadow: "0 6px 16px rgba(95,80,147,0.22)" }}
  >
    {label}
  </button>
);

const FootError: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <p role="alert" className="flex-1" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>
      {text}
    </p>
  ) : null;

const TextAction: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`flex items-center justify-center enabled:hover:bg-[#F5F5F6] disabled:opacity-40 ${FOCUS}`} style={{ minHeight: 40, borderRadius: 12, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5B5349" }}>
    {label}
  </button>
);

const PaneLoading: React.FC<{ rail: boolean; label: string }> = ({ rail, label }) => (
  <section aria-busy="true" aria-label={label} className="flex flex-col" style={{ border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, padding: rail ? 16 : 20, gap: 16 }}>
    <span aria-hidden className="animate-skeleton-pulse" style={{ height: 30, width: 200, borderRadius: 8, background: "#F5F5F6" }} />
    <WebListSkeleton rows={3} rowH={56} label={label} />
  </section>
);

/** The order (WB-ST-OR.1): the mobile OrderDetailPage's data and actions in the web detail card. */
function OrderPane({ id, rail, onChanged }: { id: string; rail: boolean; onChanged: () => void }) {
  const online = useOnline();
  const live = useLive(() => fetchStoreOrder(id), 120000, id);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const msg = useMessagePerson();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const s = live.state;
  const order = s.status === "ok" ? s.value : null;
  const rowH = rail ? 48 : 56;

  useEffect(() => {
    if (!order?.businessId) return;
    let alive = true;
    void fetchStoreInfo(order.businessId).then((r) => alive && r.status === "ok" && setStore(r.value));
    return () => {
      alive = false;
    };
  }, [order?.businessId]);

  if (s.status === "loading") return <PaneLoading rail={rail} label={t("Loading items")} />;
  if (s.status === "error") return <ErrorCard text={t("Couldn't load this order.")} onRetry={live.reload} />;
  if (!order) return <WebEmpty icon={Package} title={t("Order not found")} body={t("It may have been removed.")} />;

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
    showToast(action.quiet ? t(action.done) : `${t(action.done)} ${t("{customer} has been told.", { customer })}`, false);
    await live.refresh();
    onChanged();
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
    showToast(t("Order #{number} marked as paid in cash.", { number: order.number }), false);
    offerPromotionUsed({ kind: "order", sourceId: order.id });
    await live.refresh();
    onChanged();
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
    onChanged();
  };
  const cancelBody = paid
    ? t("{customer} is told by message. It's paid, so hand back the cash and record the refund in Revenue. This can't be undone.", { customer })
    : t("{customer} is told by message. This can't be undone.", { customer });
  const feeRule = store?.freeDeliveryOver != null ? t("Free over {amount}", { amount: moneyShort(store.freeDeliveryOver) }) : store?.deliveryTime ?? t("Delivery");
  const payLabel = order.paymentStatus === "refunded" ? t("Refunded") : paid ? t("Paid") : delivery ? t("On delivery") : t("At pickup");

  const place: { key: string; node: (rule: boolean) => React.ReactNode }[] = [
    ...(delivery
      ? [
          { key: "addr", node: (rule: boolean) => <WebRow icon={MapPin} title={order.deliveryAddress ?? t("Address removed")} titleWrap sub={customerWho(order)} rule={rule} rowH={rowH} /> },
          { key: "fee", node: (rule: boolean) => <WebRow icon={Truck} title={t("Delivery fee")} sub={feeRule} value={money(order.deliveryFee)} rule={rule} rowH={rowH} /> },
        ]
      : [{ key: "pick", node: (rule: boolean) => <WebRow icon={MapPin} title={store?.location ?? store?.name ?? t("Your store")} titleWrap sub={[t("Pickup"), customerWho(order)].join(" · ")} rule={rule} rowH={rowH} /> }]),
    ...(order.note ? [{ key: "note", node: (rule: boolean) => <WebRow icon={MessageSquare} title={t("Note from the customer")} sub={order.note} subWrap rule={rule} rowH={rowH} /> }] : []),
    ...(msg.can && order.customerId
      ? [{ key: "msg", node: (rule: boolean) => <WebRow icon={MessageCircle} title={t("Message {name}", { name: customer })} link onClick={() => void msg.open(order.customerId!)} disabled={!online || msg.busy} rule={rule} rowH={rowH} /> }]
      : []),
  ];

  return (
    <>
      <DetailCard
        label={t("Order #{number}", { number: order.number })}
        kicker={t("Orders")}
        title={t("Order #{number}", { number: order.number })}
        sub={subParts.join(" · ")}
        rail={rail}
        left={
          <>
            <WebLabel as="h3" label={t("Items")} first />
            <WebList inner label={t("Items")}>
              {order.items.map((i, k) => (
                <WebRow key={i.id} icon={Package} title={i.name} titleWrap sub={t("qty {n}", { n: i.qty })} value={money(i.lineTotal)} rule={k > 0} rowH={rowH} />
              ))}
            </WebList>
            <WebLabel as="h3" label={delivery ? t("Delivery") : t("Pickup")} />
            <WebList inner label={delivery ? t("Delivery") : t("Pickup")}>
              {place.map((p, k) => (
                <React.Fragment key={p.key}>{p.node(k > 0)}</React.Fragment>
              ))}
            </WebList>
            {msg.error && (
              <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
                {msg.error}
              </p>
            )}
          </>
        }
        right={
          <>
            <WebBoxes rail={rail} items={[{ v: money(order.total), l: t("Total") }, order.paymentMethod === "whish" ? { v: "Whish", l: payLabel } : { v: t("Cash"), l: payLabel }]} />
            {order.status !== "cancelled" && order.paymentStatus === "pending" && <TextAction label={t("Mark as paid in cash")} onClick={() => void doPaid()} disabled={busy || !online} />}
            <WebLabel as="h3" label={t("Status")} />
            <WebList inner label={t("Status")}>
              {steps.map((st, k) => {
                const Icon = STEP_ICON[st.glyph];
                const chip = st.tone === "bad" ? { label: t("Cancelled"), tone: "bad" as const } : { label: t(STEP_CHIP[st.tone].label), tone: STEP_CHIP[st.tone].tone };
                return <WebRow key={st.key} icon={Icon} title={t(st.title)} sub={st.at ? clock12(st.at) : st.hint ? t(st.hint) : undefined} chip={chip} rule={k > 0} rowH={rowH} />;
              })}
              {order.status === "cancelled" && order.paymentStatus !== "pending" && (
                <WebRow
                  icon={Banknote}
                  title={t("Refund")}
                  sub={order.paymentStatus === "refunded" ? t("Recorded in Revenue") : t("Paid in cash · record the refund in Revenue")}
                  value={money(order.total)}
                  rule={steps.length > 0}
                  rowH={rowH}
                />
              )}
            </WebList>
          </>
        }
        foot={
          openish || action || stepError ? (
            <>
              <FootError text={stepError} />
              {openish && <FootText label={t("Cancel order")} onClick={() => setCancelOpen(true)} disabled={!online} />}
              {action && <FootCta label={t(action.label)} onClick={() => void doStep()} busy={busy && !cancelOpen} disabled={!online} />}
            </>
          ) : undefined
        }
      />
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
    </>
  );
}

/** The return (WB-ST-OR.2): the mobile ReturnDetailPage's data and actions in the web detail card. */
function ReturnPane({ id, rail, onChanged }: { id: string; rail: boolean; onChanged: () => void }) {
  const navigate = useNavigate();
  const online = useOnline();
  const access = useConsoleAccess();
  const live = useLive(() => fetchStoreReturn(id), 120000, id);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pop, setPop] = useState<null | "deny" | "refund">(null);
  const s = live.state;
  const ret = s.status === "ok" ? s.value : null;
  const rowH = rail ? 48 : 56;

  if (s.status === "loading") return <PaneLoading rail={rail} label={t("Loading the return")} />;
  if (s.status === "error") return <ErrorCard text={t("Couldn't load this return.")} onRetry={live.reload} />;
  if (!ret) return <WebEmpty icon={RotateCcw} title={t("Return not found")} body={t("It may have been removed.")} />;

  const customer = customerLabel(ret);
  const action = returnAction(ret.status, ret.kind);
  const whish = ret.paymentMethod === "whish";
  const exchange = ret.kind === "exchange";
  const canRefund = access.meets("revenue");
  const refundBlocked = action?.to === "refunded" && !canRefund;
  const units = ret.items.reduce((a, i) => a + i.qty, 0);

  const move = async (to: ReturnStatus) => {
    setBusy(true);
    setError(null);
    const r = await respondReturn(ret.id, to, to === "refunded" ? ret.refundAmount : null);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Return updates are coming soon.") : storeErrorText(r, t("Couldn't update the return. Try again.")));
      return false;
    }
    const m =
      to === "approved"
        ? t("Return approved. {customer} has been told.", { customer })
        : to === "received"
          ? t("Marked as received.")
          : to === "refunded"
            ? t("Refund recorded. {customer} has been told.", { customer })
            : t("Return denied. {customer} has been told.", { customer });
    showToast(m, false);
    setPop(null);
    await live.refresh();
    onChanged();
    return true;
  };
  const onCta = () => {
    if (!action) return;
    if (action.to === "refunded") setPop("refund");
    else void move(action.to);
  };

  return (
    <>
      <DetailCard
        label={t("Return on #{number}", { number: ret.orderNumber ?? "" })}
        kicker={t("Returns")}
        title={t("Return on #{number}", { number: ret.orderNumber ?? "" })}
        sub={t("Requested {when}", { when: dayClock(ret.requestedAt) })}
        rail={rail}
        left={
          <>
            <WebLabel as="h3" label={t("Items")} first />
            <WebList inner label={t("Items")}>
              {ret.items.map((i, k) => (
                <WebRow key={i.itemId} icon={Package} title={i.name} titleWrap sub={t("qty {n}", { n: i.qty })} value={money(i.amount)} rule={k > 0} rowH={rowH} />
              ))}
              {ret.orderNumber !== null && (
                <WebRow
                  icon={Package}
                  title={t("Order #{number}", { number: ret.orderNumber })}
                  link
                  sub={[customer, ret.orderPlacedAt ? t("Placed {when}", { when: dayWord(ret.orderPlacedAt) }) : null].filter(Boolean).join(" · ")}
                  onClick={() => navigate(`/app/business/orders/${ret.orderId}`)}
                  rule={ret.items.length > 0}
                  rowH={rowH}
                />
              )}
            </WebList>
            <WebLabel as="h3" label={t("Reason")} />
            <WebList inner label={t("Reason")}>
              <WebRow icon={MessageSquare} title={ret.reason} titleWrap sub={exchange ? t("Asked for an exchange") : t("Asked for a refund")} subWrap rule={false} rowH={rowH} />
            </WebList>
          </>
        }
        right={
          <>
            {exchange ? (
              <WebBoxes rail={rail} items={[{ v: String(units), l: units === 1 ? tx("Item", "count") : t("Items") }, { v: t("Exchange"), l: t("Asked for") }]} />
            ) : (
              <WebBoxes rail={rail} items={[{ v: money(ret.refundAmount), l: t("Refund") }, whish ? { v: "Whish", l: t("Refund by"), d: t("Coming soon") } : { v: t("Cash"), l: t("Refund by") }]} />
            )}
            {whish && !exchange && <WebTip>{t("Whish refunds are coming soon. For now, refund in cash and mark it here.")}</WebTip>}
            {refundBlocked && <WebTip>{t("Recording a refund needs the Revenue permission. Ask the owner to mark it refunded.")}</WebTip>}
            <WebLabel as="h3" label={t("Status")} />
            <WebList inner label={t("Status")}>
              {returnSteps(ret).map((st, k) => (
                <WebRow
                  key={st.key}
                  icon={STEP_ICON[st.glyph]}
                  title={t(st.title)}
                  sub={st.at ? clock12(st.at) : st.hint ? t(st.hint) : undefined}
                  chip={st.tone === "bad" ? { label: t("Denied"), tone: "bad" } : { label: t(STEP_CHIP[st.tone].label), tone: STEP_CHIP[st.tone].tone }}
                  rule={k > 0}
                  rowH={rowH}
                />
              ))}
            </WebList>
          </>
        }
        foot={
          ret.status === "requested" || action || (pop === null && error) ? (
            <>
              <FootError text={pop === null ? error : null} />
              {ret.status === "requested" && <FootText label={t("Deny")} onClick={() => setPop("deny")} disabled={!online} />}
              {action && <FootCta label={t(action.label)} onClick={onCta} busy={busy && pop === null} disabled={!online || refundBlocked} />}
            </>
          ) : undefined
        }
      />
      <KitPop
        open={pop === "deny"}
        icon={CircleX}
        title={t("Deny this return?")}
        body={t("{customer} is told by message.", { customer })}
        action={t("Deny return")}
        keep={t("Keep request")}
        busy={busy}
        error={pop === "deny" ? error : null}
        onAction={() => void move("rejected")}
        onKeep={() => {
          setPop(null);
          setError(null);
        }}
      />
      <KitPop
        open={pop === "refund"}
        tone="primary"
        icon={Banknote}
        title={t("Refund {amount} in cash?", { amount: money(ret.refundAmount) })}
        body={t("Hand the money back, then confirm. It's recorded in Revenue and {customer} is told by message.", { customer })}
        action={t("Mark as refunded")}
        keep={t("Not yet")}
        busy={busy}
        error={pop === "refund" ? error : null}
        onAction={() => void move("refunded")}
        onKeep={() => {
          setPop(null);
          setError(null);
        }}
      />
      {toast}
    </>
  );
}
