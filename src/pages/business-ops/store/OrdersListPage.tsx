import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { isOpen, returnGroup } from "../../../services/store/orderSteps";
import { completedBucket } from "../../../services/store/format";
import { EmptyCard, ErrorCard, ListCard, ListSkeleton, OpsHeader, P_DARK } from "./opsKit";
import { ORDER_KINDS, useLive, useStoreBusiness } from "./storeShared";
import { CompletedRow, OrderRow, ReturnRow, loadOrdersData } from "./StoreOrdersPage";
import { Package } from "lucide-react";

// "See all" lists (OP1-001 S3, OURS completed row 18, returns row 2): the
// header with Back, the rows uncapped, 30 at a time with "Show more".

const PAGE = 30;

export default function OrdersListPage() {
  const { which = "to-fulfil" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { businessId, ready } = useStoreBusiness();
  const live = useLive(businessId ? () => loadOrdersData(businessId) : null, 120000, "", { businessId, kinds: ORDER_KINDS });
  const [shown, setShown] = useState(PAGE);
  const s = live.state;

  const titles: Record<string, string> = { "to-fulfil": "To fulfil", completed: "Completed", returns: "Returns" };
  const groupLabel: Record<string, string> = { today: "Today", week: "This week", earlier: "Earlier", needs: "Needs you", progress: "In progress", done: "Done" };
  const filter = params.get("when") ?? params.get("group");
  const title = filter && groupLabel[filter] ? groupLabel[filter] : titles[which] ?? "Orders";
  const kicker = which === "returns" ? "Returns" : "Orders";

  let rows: React.ReactNode[] = [];
  if (s.status === "ok") {
    const d = s.value;
    if (which === "returns") {
      rows = d.returns.filter((r) => !filter || returnGroup(r.status, r.kind) === filter).map((r) => <ReturnRow key={r.id} r={r} onOpen={() => navigate(`/app/business/orders/returns/${r.id}`)} />);
    } else if (which === "completed") {
      rows = d.orders
        .filter((o) => !isOpen(o.status) && (!filter || completedBucket(o.completedAt ?? o.cancelledAt ?? o.placedAt) === filter))
        .map((o) => <CompletedRow key={o.id} o={o} onOpen={() => navigate(`/app/business/orders/${o.id}`)} />);
    } else {
      rows = d.orders.filter((o) => isOpen(o.status)).map((o) => <OrderRow key={o.id} o={o} onOpen={() => navigate(`/app/business/orders/${o.id}`)} />);
    }
  }

  return (
    <div>
      <OpsHeader back kicker={kicker} title={title} />
      {s.status === "error" ? (
        <ErrorCard text={which === "returns" ? "Couldn't load returns." : which === "completed" ? "Couldn't load completed orders." : "Couldn't load your orders."} onRetry={live.reload} />
      ) : !ready || s.status === "loading" ? (
        <ListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyCard icon={Package} title="Nothing here" body="Orders show here as they come in." />
      ) : (
        <>
          <ListCard label={title}>{rows.slice(0, shown)}</ListCard>
          {rows.length > shown && (
            // OURS completed row 18: "Show more" 12/700 pDark, 44 tall.
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`tap w-full text-[12px] font-bold ${P_DARK}`} style={{ minHeight: 44 }}>
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
}
