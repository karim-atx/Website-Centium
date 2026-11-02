import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banknote, Check, Circle, CircleX, Package, RotateCcw, Store, Truck } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "../../components/ui/PageHeader";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import { cancelOrder, fetchMyOrder, type StoreReturn } from "../../services/store/orders";
import { storeErrorText } from "../../services/store/mapping";
import { orderSteps } from "../../services/store/orderSteps";
import { dayClock, money } from "../../services/store/format";
import { clock12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientConfirm, ClientEmpty, ClientRow, RetryLine, Section, SkeletonCards, type ClientTone } from "./clientKit";
import { customerStatus } from "./MyOrdersPage";
import { t, tk } from "../../i18n/core";

// OURS-customer-store-order-detail (Designed by us): the status tracker, the
// items, how it arrives, the total; Cancel while it's only placed; Request a
// return once it's done.

const RETURN_WORDS: Record<StoreReturn["status"], { label: string; tone: ClientTone; line: string }> = {
  requested: { label: tk("Requested"), tone: "pale", line: tk("The store will look at your request.") },
  approved: { label: tk("Approved"), tone: "good", line: tk("Bring the item back to the store.") },
  received: { label: tk("Received"), tone: "pale", line: tk("The store has the item. Your refund is next.") },
  refunded: { label: tk("Refunded"), tone: "soft", line: tk("Your refund is done.") },
  rejected: { label: tk("Declined"), tone: "bad", line: tk("The store declined this return.") },
};

export default function MyOrderPage() {
  const { orderId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { authUserId } = useApp();
  const live = useLive(authUserId ? () => fetchMyOrder(orderId) : null, 120000, orderId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(params.get("placed") ? t("Order placed. The store has it.") : params.get("returned") ? t("Return requested.") : null);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const o = d?.order ?? null;

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title={t("Order")} showBack sub />
        <SkeletonCards heights={[160, 112, 90]} label={t("Loading your order")} />
      </div>
    );
  }
  if (s.status !== "ok" || !o) {
    return (
      <div>
        <PageHeader title={t("Order")} showBack sub />
        {s.status === "error" ? <RetryLine text={t("Couldn't load this order.")} onRetry={live.reload} /> : <ClientEmpty icon={Package} title={t("Order not found")} line={t("It may have been removed.")} />}
      </div>
    );
  }

  const status = customerStatus(o);
  const delivery = o.fulfilment === "delivery";
  const steps = orderSteps(o);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelOrder(o.id, null);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Cancelling orders is coming soon.") : storeErrorText(r, t("Couldn't cancel the order. Try again.")));
      return;
    }
    setCancelOpen(false);
    setToast(r.value.paidToRefund ? t("Order cancelled. The store will give your cash back.") : t("Order cancelled."));
    await live.refresh();
  };

  return (
    <div>
      <PageHeader title={t("Order #{number}", { number: o.number })} subtitle={[o.storeName, t("placed {when}", { when: dayClock(o.placedAt) })].filter(Boolean).join(" · ")} showBack sub />

      <ClientCard label={t("Status")}>
        <div className="flex items-center justify-between" style={{ padding: "12px 14px 4px" }}>
          <span className="text-[15px] font-bold text-charcoal">{status.label}</span>
        </div>
        <ol style={{ padding: "4px 14px 12px" }}>
          {steps.map((st, i) => {
            const done = st.tone === "done";
            const bad = st.tone === "bad";
            const Icon = bad ? CircleX : done ? Check : Circle;
            return (
              <li key={st.key} className="flex items-start" style={{ gap: 10, minHeight: 34 }}>
                <span className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                  <span
                    aria-hidden
                    className={clsx(
                      "flex items-center justify-center rounded-full",
                      bad ? "bg-status-high-bg text-status-high" : done ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-faint"
                    )}
                    style={{ width: 20, height: 20 }}
                  >
                    <Icon size={12} strokeWidth={done || bad ? 3 : 2} />
                  </span>
                  {i < steps.length - 1 && <span aria-hidden className={done ? "bg-primary-fill" : "bg-cream-soft"} style={{ width: 2, height: 14 }} />}
                </span>
                <span className="flex-1 min-w-0 flex items-baseline justify-between" style={{ gap: 8 }}>
                  <span className={clsx("text-[14px] leading-[20px]", done || bad ? "font-semibold text-charcoal" : "font-medium text-charcoal-faint")}>
                    {st.key === "out" ? t("On its way") : st.key === "ready" ? t("Ready to collect") : t(st.title)}
                  </span>
                  {st.at && <span className="text-[12px] font-medium text-charcoal-faint tabular-nums">{clock12(st.at)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </ClientCard>

      <Section label={t("Items")}>
        <ClientCard label={t("Items")}>
          {o.items.map((i) => (
            <ClientRow key={i.id} icon={Package} title={i.name} sub={t("qty {n}", { n: i.qty })} value={money(i.lineTotal)} />
          ))}
          {delivery && <ClientRow title={t("Delivery")} value={o.deliveryFee === 0 ? t("Free") : money(o.deliveryFee)} />}
          <ClientRow title={<span className="font-bold">{t("Total")}</span>} value={money(o.total)} />
        </ClientCard>
      </Section>

      <Section label={delivery ? t("Delivery") : t("Pickup")}>
        <ClientCard>
          {delivery ? (
            <ClientRow icon={Truck} title={o.deliveryAddress ?? t("Address removed")} sub={o.deliveryAddress ? t("Only the store sees this, for this order.") : t("Removed 90 days after delivery.")} />
          ) : (
            <ClientRow icon={Store} title={o.storeName ?? t("The store")} sub={t("Collect it at the store")} />
          )}
          <ClientRow
            icon={Banknote}
            title={o.paymentMethod === "whish" ? "Whish" : t("Cash")}
            sub={o.paymentStatus === "refunded" ? t("Refunded") : o.paymentStatus === "paid" ? t("Paid") : delivery ? t("Pay when it's delivered") : t("Pay when you pick it up")}
          />
        </ClientCard>
      </Section>

      {d?.ret && (
        <Section label={t("Return")}>
          <ClientCard>
            <ClientRow icon={RotateCcw} title={d.ret.reason} sub={d.ret.kind === "exchange" && d.ret.status === "received" ? t("The store has the item. Your exchange is done.") : t(RETURN_WORDS[d.ret.status].line)} pill={{ label: t(RETURN_WORDS[d.ret.status].label), tone: RETURN_WORDS[d.ret.status].tone }} />
          </ClientCard>
        </Section>
      )}

      <div style={{ marginTop: 18 }}>
        {o.canCancel && (
          <button type="button" onClick={() => setCancelOpen(true)} disabled={!online} className="tap w-full text-[14px] font-bold text-status-high disabled:opacity-40" style={{ minHeight: 44 }}>
            {t("Cancel order")}
          </button>
        )}
        {o.canReturn && (
          <button
            type="button"
            onClick={() => navigate(`/app/store/orders/${o.id}/return`)}
            disabled={!online}
            className="tap w-full text-[14px] font-bold text-primary-dark disabled:opacity-40"
            style={{ minHeight: 44 }}
          >
            {t("Request a return")}
          </button>
        )}
      </div>
      {o.canReturn && (
        <p className="text-[12px] font-medium text-charcoal-faint text-center">{t("The store's returns policy applies.")}</p>
      )}

      <ClientConfirm
        open={cancelOpen}
        title={t("Cancel order #{number}?", { number: o.number })}
        body={t("The store sees it as cancelled. This can't be undone.")}
        keep={t("Keep order")}
        confirm={t("Cancel order")}
        destructive
        busy={busy}
        error={error}
        onKeep={() => {
          setCancelOpen(false);
          setError(null);
        }}
        onConfirm={() => void cancel()}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
