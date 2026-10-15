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

// OURS-customer-store-orders · order history (Designed by us), B11 my_orders.
// Entry: Profile › My orders; after checkout.

/** The customer's words for an order's status. */
export function customerStatus(o: Pick<StoreOrder, "status" | "fulfilment">): { label: string; tone: ClientTone } {
  switch (o.status) {
    case "placed":
      return { label: "Placed", tone: "pale" };
    case "packed":
      return { label: "Packed", tone: "pale" };
    case "out_for_delivery":
      return { label: "On its way", tone: "pale" };
    case "ready_for_pickup":
      return { label: "Ready to collect", tone: "good" };
    case "completed":
      return { label: o.fulfilment === "delivery" ? "Delivered" : "Picked up", tone: "soft" };
    case "cancelled":
      return { label: "Cancelled", tone: "bad" };
    case "returned":
      return { label: "Returned", tone: "soft" };
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
      <PageHeader title="My orders" showBack sub />
      <SegmentedTabs
        items={[
          { key: "active", label: "Active" },
          { key: "past", label: "Past" },
        ]}
        activeKey={tab}
        onChange={(v) => setTab(v as "active" | "past")}
        darkTone="partB"
      />
      <div style={{ marginTop: 16 }}>
        {s.status === "loading" ? (
          <SkeletonCards label="Loading your orders" />
        ) : s.status === "error" ? (
          <RetryLine text="Couldn't load your orders." onRetry={live.reload} />
        ) : list.length === 0 ? (
          <>
            <ClientEmpty
              icon={Package}
              title={tab === "active" ? "No orders on the way" : "No past orders"}
              line={tab === "active" ? "Orders you place in stores on Explore show here until they're done." : "Delivered, collected and cancelled orders show here."}
            />
            {s.status === "pending" && <InfoNote>Ordering from stores is coming soon.</InfoNote>}
          </>
        ) : (
          <ClientCard label={tab === "active" ? "Active orders" : "Past orders"}>
            {list.map((o) => (
              <ClientRow
                key={o.id}
                icon={o.fulfilment === "delivery" ? Truck : Package}
                title={o.storeName ?? `Order #${o.number}`}
                sub={`Order #${o.number} · ${dayWord(o.placedAt)} · ${money(o.total)}`}
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
