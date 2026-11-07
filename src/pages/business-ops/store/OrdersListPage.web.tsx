import { useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Package, RotateCcw, Truck } from "lucide-react";
import { isOpen, orderChip, returnChip, returnGroup } from "../../../services/store/orderSteps";
import { ageLabel, completedBucket, completedWhen, money } from "../../../services/store/format";
import { ErrorCard } from "./opsKit";
import { ORDER_KINDS, customerLabel, customerWho, methodWord, useLive, useStoreBusiness } from "./storeShared";
import { loadOrdersData } from "./StoreOrdersPage";
import { ExtrasHeader, ExtrasList, ExtrasMore, ExtrasRow, WebEmpty, WebListSkeleton } from "./webKit";
import { t } from "../../../i18n/core";

// Website viewport v1 · WB-ST-OR.3 See all lists (WB-ST Store Extras Web,
// "list-*"): the 72 header (Back, the Orders / Returns kicker over the title),
// the rows uncapped in one #F7F7FC card (rows 64, tile 40, the chip, the
// completed total, a chevron), 30 at a time with Show more; the dashed empty
// card. Reading, the filters (?when=, ?group=) and the rows' destinations are
// the mobile OrdersListPage's.

const PAGE = 30;

export default function OrdersListPageWeb() {
  const { which = "to-fulfil" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { businessId, ready } = useStoreBusiness();
  const live = useLive(businessId ? () => loadOrdersData(businessId) : null, 120000, "", { businessId, kinds: ORDER_KINDS });
  const [shown, setShown] = useState(PAGE);
  const s = live.state;

  const titles: Record<string, string> = { "to-fulfil": t("To fulfil"), completed: t("Completed"), returns: t("Returns") };
  const groupLabel: Record<string, string> = { today: t("Today"), week: t("This week"), earlier: t("Earlier"), needs: t("Needs you"), progress: t("In progress"), done: t("Done") };
  const filter = params.get("when") ?? params.get("group");
  const title = filter && groupLabel[filter] ? groupLabel[filter] : titles[which] ?? t("Orders");
  const kicker = which === "returns" ? t("Returns") : t("Orders");
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/orders"));

  let rows: { key: string; node: (rule: boolean) => ReactNode }[] = [];
  if (s.status === "ok") {
    const d = s.value;
    if (which === "returns") {
      rows = d.returns
        .filter((r) => !filter || returnGroup(r.status, r.kind) === filter)
        .map((r) => {
          const raw = returnChip(r.status, r.kind);
          return {
            key: r.id,
            node: (rule: boolean) => (
              <ExtrasRow
                key={r.id}
                icon={RotateCcw}
                title={t("Return on #{number}", { number: r.orderNumber ?? "" })}
                sub={`${r.reason} · ${customerLabel(r)}`}
                chip={{ ...raw, label: t(raw.label) }}
                value={r.status === "refunded" ? money(r.refundAmount) : undefined}
                rule={rule}
                onClick={() => navigate(`/app/business/orders/returns/${r.id}`)}
              />
            ),
          };
        });
    } else if (which === "completed") {
      rows = d.orders
        .filter((o) => !isOpen(o.status) && (!filter || completedBucket(o.completedAt ?? o.cancelledAt ?? o.placedAt) === filter))
        .map((o) => {
          const raw = orderChip(o);
          const what = o.status === "cancelled" ? t("Cancelled") : o.fulfilment === "delivery" ? t("Delivered") : t("Picked up");
          const when = o.status === "cancelled" ? o.cancelledAt : o.completedAt;
          return {
            key: o.id,
            node: (rule: boolean) => (
              <ExtrasRow
                key={o.id}
                icon={o.fulfilment === "delivery" ? Truck : Package}
                title={t("Order #{number}", { number: o.number })}
                sub={`${what} · ${customerWho(o)}${when ? ` · ${completedWhen(when)}` : ""}`}
                chip={{ ...raw, label: t(raw.label) }}
                value={money(o.total)}
                rule={rule}
                onClick={() => navigate(`/app/business/orders/${o.id}`)}
              />
            ),
          };
        });
    } else {
      rows = d.orders
        .filter((o) => isOpen(o.status))
        .map((o) => {
          const raw = orderChip(o);
          const chip = { ...raw, label: t(raw.label) };
          return {
            key: o.id,
            node: (rule: boolean) => (
              <ExtrasRow
                key={o.id}
                icon={o.fulfilment === "delivery" ? Truck : Package}
                title={t("Order #{number}", { number: o.number })}
                sub={`${methodWord(o)} · ${customerWho(o)} · ${ageLabel(o.placedAt)}`}
                chip={chip}
                rule={rule}
                onClick={() => navigate(`/app/business/orders/${o.id}`)}
                ariaLabel={`${t("Order #{number}", { number: o.number })}، ${methodWord(o)}، ${customerLabel(o)}، ${chip.label}`}
              />
            ),
          };
        });
    }
  }

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <ExtrasHeader kicker={kicker} title={title} backLabel={t("Back")} onBack={back} />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] flex flex-col">
          {s.status === "error" ? (
            <ErrorCard text={which === "returns" ? t("Couldn't load returns.") : which === "completed" ? t("Couldn't load completed orders.") : t("Couldn't load your orders.")} onRetry={live.reload} />
          ) : !ready || s.status === "loading" ? (
            <WebListSkeleton rows={6} rowH={64} label={t("Loading your orders")} />
          ) : rows.length === 0 ? (
            <WebEmpty icon={Package} title={t("Nothing here")} body={t("Orders show here as they come in.")} padding="40px 32px" />
          ) : (
            <>
              <ExtrasList label={title}>{rows.slice(0, shown).map((r, i) => r.node(i > 0))}</ExtrasList>
              {rows.length > shown && <ExtrasMore onClick={() => setShown((n) => n + PAGE)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
