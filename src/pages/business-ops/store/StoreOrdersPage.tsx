import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { fetchStoreOrders, fetchStoreReturns, type StoreOrder, type StoreReturn } from "../../../services/store/orders";
import { isOpen, orderChip, returnChip, returnGroup } from "../../../services/store/orderSteps";
import { ageLabel, completedBucket, completedWhen, money } from "../../../services/store/format";
import { fetchStoreInfo } from "../../../services/store/customer";
import type { Load } from "../../../services/store/backend";
import { EmptyCard, ErrorCard, KitLabel, KitRow, ListCard, ListSkeleton, NumberBoxes, OpsHeader, TextTabs } from "./opsKit";
import { customerLabel, customerWho, methodWord, useLive, useStoreBusiness } from "./storeShared";
import { AppointmentsPanel } from "../appointments/AppointmentsPage";

// OP1-001 / OP1-003 · Store › Orders (the Orders navbar tab root, V6-54):
// text tabs To fulfil · Completed · Returns (OURS-OP1-store-orders-completed,
// -returns), plus Appointments for a Wellness Service that also sells
// products (O11). B11: orders and their items are read with `store`, the
// customer labels come from store_orders_page (masked, as the server sends
// them). A database without B11 answers "pending" and every tab shows its
// empty state.

type TabKey = "fulfil" | "completed" | "returns" | "appointments";
const CAP = 3;

export interface OrdersData {
  orders: StoreOrder[];
  returns: StoreReturn[];
  pending: boolean;
}

export async function loadOrdersData(businessId: string): Promise<Load<OrdersData>> {
  const [o, r] = await Promise.all([fetchStoreOrders(businessId), fetchStoreReturns(businessId)]);
  if (o.status === "error") return o;
  if (r.status === "error") return r;
  const orders = o.status === "ok" ? o.value : [];
  // A return carries its order's label (the same server label).
  const byId = new Map(orders.map((x) => [x.id, x]));
  const returns = (r.status === "ok" ? r.value : []).map((x) => ({ ...x, customerLabel: byId.get(x.orderId)?.customerLabel ?? null }));
  return {
    status: "ok",
    value: {
      orders,
      returns,
      pending: o.status === "pending",
    },
  };
}

export function OrderRow({ o, onOpen }: { o: StoreOrder; onOpen: () => void }) {
  const chip = orderChip(o);
  return (
    <KitRow
      icon={o.fulfilment === "delivery" ? Truck : Package}
      title={`Order #${o.number}`}
      sub={`${methodWord(o)} · ${customerWho(o)} · ${ageLabel(o.placedAt)}`}
      chip={chip}
      onClick={onOpen}
      ariaLabel={`Order #${o.number}, ${methodWord(o)}, ${customerLabel(o)}, ${chip.label}`}
    />
  );
}

export function CompletedRow({ o, onOpen }: { o: StoreOrder; onOpen: () => void }) {
  const chip = orderChip(o);
  const what = o.status === "cancelled" ? "Cancelled" : o.fulfilment === "delivery" ? "Delivered" : "Picked up";
  const when = o.status === "cancelled" ? o.cancelledAt : o.completedAt;
  return (
    <KitRow
      icon={o.fulfilment === "delivery" ? Truck : Package}
      title={`Order #${o.number}`}
      sub={`${what} · ${customerWho(o)}${when ? ` · ${completedWhen(when)}` : ""}`}
      chip={chip}
      value={money(o.total)}
      onClick={onOpen}
    />
  );
}

export function ReturnRow({ r, onOpen }: { r: StoreReturn; onOpen: () => void }) {
  const chip = returnChip(r.status, r.kind);
  return (
    <KitRow
      icon={RotateCcw}
      title={`Return on #${r.orderNumber ?? ""}`}
      sub={`${r.reason} · ${customerLabel(r)}`}
      chip={chip}
      value={r.status === "refunded" ? money(r.refundAmount) : undefined}
      onClick={onOpen}
    />
  );
}

export default function StoreOrdersPage({ title = "Orders" }: { title?: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { businessId, ready, loadError, reload: reloadBiz } = useStoreBusiness();
  const [withAppts, setWithAppts] = useState(false);

  // O11: a Wellness Service that sells products AND offers appointments gets a fourth tab.
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "fulfil", label: "To fulfil" },
    { key: "completed", label: "Completed" },
    { key: "returns", label: "Returns" },
    ...(withAppts ? [{ key: "appointments" as TabKey, label: "Appointments" }] : []),
  ];
  const raw = params.get("tab") as TabKey | null;
  const tab: TabKey = raw && tabs.some((t) => t.key === raw) ? raw : "fulfil";
  const setTab = (k: TabKey) => setParams(k === "fulfil" ? {} : { tab: k }, { replace: true });

  const live = useLive(businessId ? () => loadOrdersData(businessId) : null);
  const s = live.state;

  const data = s.status === "ok" ? s.value : null;
  const open = useMemo(() => (data ? data.orders.filter((o) => isOpen(o.status)) : []), [data]);
  const done = useMemo(() => (data ? data.orders.filter((o) => !isOpen(o.status)) : []), [data]);
  const neverOrdered = !!data && data.orders.length === 0 && data.returns.length === 0;
  const loading = !ready || (!!businessId && s.status === "loading");

  const openOrder = (o: StoreOrder) => navigate(`/app/business/orders/${o.id}`);
  const openReturn = (r: StoreReturn) => navigate(`/app/business/orders/returns/${r.id}`);
  const seeAll = (which: string) => navigate(`/app/business/orders/list/${which}`);

  let body: React.ReactNode;
  if (tab === "appointments") {
    body = <AppointmentsPanel embedded />;
  } else if (loadError || s.status === "error") {
    const what = tab === "completed" ? "completed orders" : tab === "returns" ? "returns" : "your orders";
    body = <ErrorCard text={`Couldn't load ${what}.`} onRetry={() => (loadError ? reloadBiz() : live.reload())} />;
  } else if (loading) {
    body = (
      <>
        {tab === "fulfil" && <NumberBoxes loading items={[{ v: "", l: "To fulfil" }, { v: "", l: "Pickups ready" }, { v: "", l: "Out for delivery" }]} />}
        <ListSkeleton label={tab === "fulfil" ? "Loading your orders" : tab === "completed" ? "Loading completed orders" : "Loading returns"} />
      </>
    );
  } else if (tab === "fulfil") {
    // OP1-003: never had an order (also the B11-pending state, and an owner whose business row isn't saved yet).
    if (!businessId || !data || neverOrdered) {
      body = <EmptyCard icon={Package} title="No orders yet" body="When a customer orders, it shows here with pickup or delivery details." />;
    } else {
      const requested = data.returns.filter((r) => r.status === "requested");
      body = (
        <>
          <NumberBoxes
            items={[
              { v: String(open.length), l: "To fulfil" },
              { v: String(open.filter((o) => o.status === "ready_for_pickup").length), l: "Pickups ready" },
              { v: String(open.filter((o) => o.status === "out_for_delivery").length), l: "Out for delivery" },
            ]}
          />
          {open.length === 0 ? (
            <EmptyCard icon={PackageCheck} title="Nothing to fulfil" body="New orders show here. Completed ones are in the Completed tab." />
          ) : (
            <>
              <KitLabel label="To fulfil" action={open.length > CAP ? "See all" : undefined} onAction={() => seeAll("to-fulfil")} />
              <ListCard label="Orders to fulfil">
                {open.slice(0, CAP).map((o) => (
                  <OrderRow key={o.id} o={o} onOpen={() => openOrder(o)} />
                ))}
              </ListCard>
            </>
          )}
          {/* OP1-001 #15: shown only while a return waits on the owner. */}
          {requested.length > 0 && (
            <>
              <KitLabel label="Returns" action="See all" onAction={() => setTab("returns")} />
              <ListCard label="Returns to approve">
                {requested.slice(0, CAP).map((r) => (
                  <ReturnRow key={r.id} r={r} onOpen={() => openReturn(r)} />
                ))}
              </ListCard>
            </>
          )}
        </>
      );
    }
  } else if (tab === "completed") {
    if (done.length === 0) {
      body = <EmptyCard icon={PackageCheck} title="No completed orders yet" body="Orders move here once they're delivered or picked up." />;
    } else {
      const when = (o: StoreOrder) => o.completedAt ?? o.cancelledAt ?? o.placedAt;
      const groups = [
        { key: "today", label: "Today", list: done.filter((o) => completedBucket(when(o)) === "today") },
        { key: "week", label: "This week", list: done.filter((o) => completedBucket(when(o)) === "week") },
        { key: "earlier", label: "Earlier", list: done.filter((o) => completedBucket(when(o)) === "earlier") },
      ].filter((g) => g.list.length > 0);
      body = groups.map((g) => (
        <section key={g.key}>
          <KitLabel label={g.label} action={g.list.length > CAP ? "See all" : undefined} onAction={() => seeAll(`completed?when=${g.key}`)} />
          <ListCard label={g.label}>
            {g.list.slice(0, CAP).map((o) => (
              <CompletedRow key={o.id} o={o} onOpen={() => openOrder(o)} />
            ))}
          </ListCard>
        </section>
      ));
    }
  } else {
    const returns = data?.returns ?? [];
    if (returns.length === 0) {
      body = <EmptyCard icon={RotateCcw} title="No returns" body="When a customer asks to return an item, it shows here." />;
    } else {
      const groups = [
        { key: "needs", label: "Needs you" },
        { key: "progress", label: "In progress" },
        { key: "done", label: "Done" },
      ]
        .map((g) => ({ ...g, list: returns.filter((r) => returnGroup(r.status, r.kind) === g.key) }))
        .filter((g) => g.list.length > 0);
      body = groups.map((g) => (
        <section key={g.key}>
          <KitLabel label={g.label} action={g.list.length > CAP ? "See all" : undefined} onAction={() => seeAll(`returns?group=${g.key}`)} />
          <ListCard label={g.label}>
            {g.list.slice(0, CAP).map((r) => (
              <ReturnRow key={r.id} r={r} onOpen={() => openReturn(r)} />
            ))}
          </ListCard>
        </section>
      ));
    }
  }

  return (
    <div>
      <OpsHeader kicker={title} title={title} />
      <TextTabs label="Orders" tabs={tabs} active={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={tabs.find((t) => t.key === tab)?.label}>
        {body}
      </div>
    </div>
  );
}
