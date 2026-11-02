import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Truck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useApp } from "../../context/AppContext";
import { fetchMyOrders, type StoreOrder } from "../../services/store/orders";
import { isOpen } from "../../services/store/orderSteps";
import { dayWord, money } from "../../services/store/format";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, ClientRow, InfoNote, RetryLine, SkeletonCards, type ClientTone } from "./clientKit";
import { t, tx } from "../../i18n/core";

// OURS-customer-store-orders · order history (Designed by us), B11 my_orders.
// Entry: Profile › My orders; after checkout.

/** The customer's words for an order's status. */
export function customerStatus(o: Pick<StoreOrder, "status" | "fulfilment">): { label: string; tone: ClientTone } {
  switch (o.status) {
    case "placed":
      return { label: t("Placed"), tone: "pale" };
    case "packed":
      return { label: t("Packed"), tone: "pale" };
    case "out_for_delivery":
      return { label: t("On its way"), tone: "pale" };
    case "ready_for_pickup":
      return { label: t("Ready to collect"), tone: "good" };
    case "completed":
      return { label: o.fulfilment === "delivery" ? t("Delivered") : t("Picked up"), tone: "soft" };
    case "cancelled":
      return { label: t("Cancelled"), tone: "bad" };
    case "returned":
      return { label: tx("Returned", "order"), tone: "soft" };
  }
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [tab, setTab] = useState<"active" | "past">("active");
  const live = useLive(authUserId ? () => fetchMyOrders() : null, 120000, authUserId ?? "");
  const s = live.state;
  const list = s.status === "ok" ? s.value.filter((o) => (tab === "active" ? isOpen(o.status) : !isOpen(o.status))) : [];

  return (
    <div>
      <PageHeader title={t("My orders")} showBack sub />
      <SegmentedTabs
        items={[
          { key: "active", label: tx("Active", "orders") },
          { key: "past", label: tx("Past", "orders") },
        ]}
        activeKey={tab}
        onChange={(v) => setTab(v as "active" | "past")}
        darkTone="partB"
      />
      <div style={{ marginTop: 16 }}>
        {s.status === "loading" ? (
          <SkeletonCards label={t("Loading your orders")} />
        ) : s.status === "error" ? (
          <RetryLine text={t("Couldn't load your orders.")} onRetry={live.reload} />
        ) : list.length === 0 ? (
          <>
            <ClientEmpty
              icon={Package}
              title={tab === "active" ? t("No orders on the way") : t("No past orders")}
              line={tab === "active" ? t("Orders you place in stores on Explore show here until they're done.") : t("Delivered, collected and cancelled orders show here.")}
            />
            {s.status === "pending" && <InfoNote>{t("Ordering from stores is coming soon.")}</InfoNote>}
          </>
        ) : (
          <ClientCard label={tab === "active" ? t("Active orders") : t("Past orders")}>
            {list.map((o) => (
              <ClientRow
                key={o.id}
                icon={o.fulfilment === "delivery" ? Truck : Package}
                title={o.storeName ?? t("Order #{number}", { number: o.number })}
                sub={`${t("Order #{number}", { number: o.number })} · ${dayWord(o.placedAt)} · ${money(o.total)}`}
                pill={customerStatus(o)}
                onClick={() => navigate(`/app/store/orders/${o.id}`)}
              />
            ))}
          </ClientCard>
        )}
      </div>
    </div>
  );
}
