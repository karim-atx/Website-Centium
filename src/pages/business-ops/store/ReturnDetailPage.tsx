import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banknote, CircleX, MessageSquare, Package, RotateCcw } from "lucide-react";
import { fetchStoreReturn, respondReturn, type ReturnStatus } from "../../../services/store/orders";
import { returnAction, returnSteps } from "../../../services/store/orderSteps";
import { storeErrorText } from "../../../services/store/mapping";
import { dayClock, dayWord, money } from "../../../services/store/format";
import { clock12 } from "../../../utils/time12";
import { useOnline } from "../../../hooks/useOnline";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { CtaSpacer, EmptyCard, ErrorCard, FixedCta, KitLabel, KitPop, KitRow, KitTip, ListCard, ListSkeleton, NumberBoxes, OpsHeader, TextButton, useOpsToast } from "./opsKit";
import { STEP_CHIP, STEP_ICON, customerLabel, useLive } from "./storeShared";
import { t, tx } from "../../../i18n/core";

// OURS-OP1-store-return-detail · Requested > Approved > Received > Refunded,
// or Denied (B11 respond_return). Received puts the stock back. The Refunded
// step records the refund in Revenue (record_refund), so it needs `revenue`
// as well as `store`; without it the CTA is off and a tip says why. Refund in
// cash today; Whish refunds shown as coming (DECIDED). An exchange ends at
// Received.

export default function ReturnDetailPage() {
  const { returnId = "" } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const access = useConsoleAccess();
  const live = useLive(() => fetchStoreReturn(returnId), 120000, returnId);
  const [toast, showToast] = useOpsToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pop, setPop] = useState<null | "deny" | "refund">(null);

  const s = live.state;
  const ret = s.status === "ok" ? s.value : null;

  if (s.status === "loading") {
    return (
      <div>
        <OpsHeader back kicker={t("Returns")} title={t("Return")} />
        <KitLabel label={t("Items")} />
        <ListSkeleton rows={2} label={t("Loading the return")} />
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker={t("Returns")} title={t("Return")} />
        <ErrorCard text={t("Couldn't load this return.")} onRetry={live.reload} />
      </div>
    );
  }
  if (!ret) {
    return (
      <div>
        <OpsHeader back kicker={t("Returns")} title={t("Return")} />
        <EmptyCard icon={RotateCcw} title={t("Return not found")} body={t("It may have been removed.")} />
      </div>
    );
  }

  const customer = customerLabel(ret);
  const action = returnAction(ret.status, ret.kind);
  const whish = ret.paymentMethod === "whish";
  const exchange = ret.kind === "exchange";
  const canRefund = access.meets("revenue");
  const refundBlocked = action?.to === "refunded" && !canRefund;

  const move = async (to: ReturnStatus) => {
    setBusy(true);
    setError(null);
    const r = await respondReturn(ret.id, to, to === "refunded" ? ret.refundAmount : null);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? t("Return updates are coming soon.") : storeErrorText(r, t("Couldn't update the return. Try again.")));
      return false;
    }
    const msg =
      to === "approved"
        ? t("Return approved. {customer} has been told.", { customer })
        : to === "received"
          ? t("Marked as received.")
          : to === "refunded"
            ? t("Refund recorded. {customer} has been told.", { customer })
            : t("Return denied. {customer} has been told.", { customer });
    showToast(msg, returnAction(to, ret.kind) !== null);
    setPop(null);
    await live.refresh();
    return true;
  };

  const onCta = () => {
    if (!action) return;
    if (action.to === "refunded") setPop("refund");
    else void move(action.to);
  };

  const units = ret.items.reduce((a, i) => a + i.qty, 0);

  return (
    <div>
      <OpsHeader back kicker={t("Returns")} title={t("Return on #{number}", { number: ret.orderNumber ?? "" })} sub={t("Requested {when}", { when: dayClock(ret.requestedAt) })} />

      <KitLabel label={t("Items")} />
      <ListCard label={t("Items")}>
        {ret.items.map((i) => (
          <KitRow key={i.itemId} icon={Package} title={i.name} sub={t("qty {n}", { n: i.qty })} value={money(i.amount)} />
        ))}
        {ret.orderNumber !== null && (
          <KitRow
            icon={Package}
            title={t("Order #{number}", { number: ret.orderNumber })}
            sub={[customer, ret.orderPlacedAt ? t("Placed {when}", { when: dayWord(ret.orderPlacedAt) }) : null].filter(Boolean).join(" · ")}
            onClick={() => navigate(`/app/business/orders/${ret.orderId}`)}
          />
        )}
      </ListCard>

      <KitLabel label={t("Reason")} />
      <ListCard label={t("Reason")}>
        <KitRow icon={MessageSquare} title={ret.reason} sub={exchange ? t("Asked for an exchange") : t("Asked for a refund")} subWrap />
      </ListCard>

      {exchange ? (
        <NumberBoxes
          items={[
            { v: String(units), l: units === 1 ? tx("Item", "count") : t("Items") },
            { v: t("Exchange"), l: t("Asked for") },
          ]}
        />
      ) : (
        <NumberBoxes
          items={[
            { v: money(ret.refundAmount), l: t("Refund") },
            whish ? { v: "Whish", l: t("Refund by"), d: t("Coming soon"), dTone: "warn" } : { v: t("Cash"), l: t("Refund by") },
          ]}
        />
      )}
      {whish && !exchange && <KitTip>{t("Whish refunds are coming soon. For now, refund in cash and mark it here.")}</KitTip>}
      {refundBlocked && <KitTip>{t("Recording a refund needs the Revenue permission. Ask the owner to mark it refunded.")}</KitTip>}

      <KitLabel label={t("Status")} />
      <ListCard label={t("Status")}>
        {returnSteps(ret).map((st) => (
          <KitRow
            key={st.key}
            icon={STEP_ICON[st.glyph]}
            title={t(st.title)}
            sub={st.at ? clock12(st.at) : st.hint ? t(st.hint) : undefined}
            chip={st.tone === "bad" ? { label: t("Denied"), tone: "bad" } : { label: t(STEP_CHIP[st.tone].label), tone: STEP_CHIP[st.tone].tone }}
          />
        ))}
      </ListCard>

      {ret.status === "requested" && <TextButton tone="high" label={t("Deny")} onClick={() => setPop("deny")} disabled={!online} />}

      {action && (
        <>
          <CtaSpacer />
          <FixedCta label={t(action.label)} onClick={onCta} busy={busy && pop === null} disabled={!online || refundBlocked} error={pop === null ? error : null} />
        </>
      )}

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
    </div>
  );
}
