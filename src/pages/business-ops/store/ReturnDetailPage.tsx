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
        <OpsHeader back kicker="Returns" title="Return" />
        <KitLabel label="Items" />
        <ListSkeleton rows={2} label="Loading the return" />
      </div>
    );
  }
  if (s.status === "error") {
    return (
      <div>
        <OpsHeader back kicker="Returns" title="Return" />
        <ErrorCard text="Couldn't load this return." onRetry={live.reload} />
      </div>
    );
  }
  if (!ret) {
    return (
      <div>
        <OpsHeader back kicker="Returns" title="Return" />
        <EmptyCard icon={RotateCcw} title="Return not found" body="It may have been removed." />
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
      setError(r.pending ? "Return updates are coming soon." : storeErrorText(r, "Couldn't update the return. Try again."));
      return false;
    }
    const msg =
      to === "approved"
        ? `Return approved. ${customer} has been told.`
        : to === "received"
          ? "Marked as received."
          : to === "refunded"
            ? `Refund recorded. ${customer} has been told.`
            : `Return denied. ${customer} has been told.`;
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
      <OpsHeader back kicker="Returns" title={`Return on #${ret.orderNumber ?? ""}`} sub={`Requested ${dayClock(ret.requestedAt)}`} />

      <KitLabel label="Items" />
      <ListCard label="Items">
        {ret.items.map((i) => (
          <KitRow key={i.itemId} icon={Package} title={i.name} sub={`qty ${i.qty}`} value={money(i.amount)} />
        ))}
        {ret.orderNumber !== null && (
          <KitRow
            icon={Package}
            title={`Order #${ret.orderNumber}`}
            sub={[customer, ret.orderPlacedAt ? `Placed ${dayWord(ret.orderPlacedAt)}` : null].filter(Boolean).join(" · ")}
            onClick={() => navigate(`/app/business/orders/${ret.orderId}`)}
          />
        )}
      </ListCard>

      <KitLabel label="Reason" />
      <ListCard label="Reason">
        <KitRow icon={MessageSquare} title={ret.reason} sub={exchange ? "Asked for an exchange" : "Asked for a refund"} subWrap />
      </ListCard>

      {exchange ? (
        <NumberBoxes
          items={[
            { v: String(units), l: units === 1 ? "Item" : "Items" },
            { v: "Exchange", l: "Asked for" },
          ]}
        />
      ) : (
        <NumberBoxes
          items={[
            { v: money(ret.refundAmount), l: "Refund" },
            whish ? { v: "Whish", l: "Refund by", d: "Coming soon", dTone: "warn" } : { v: "Cash", l: "Refund by" },
          ]}
        />
      )}
      {whish && !exchange && <KitTip>Whish refunds are coming soon. For now, refund in cash and mark it here.</KitTip>}
      {refundBlocked && <KitTip>Recording a refund needs the Revenue permission. Ask the owner to mark it refunded.</KitTip>}

      <KitLabel label="Status" />
      <ListCard label="Status">
        {returnSteps(ret).map((st) => (
          <KitRow
            key={st.key}
            icon={STEP_ICON[st.glyph]}
            title={st.title}
            sub={st.at ? clock12(st.at) : st.hint ?? undefined}
            chip={st.tone === "bad" ? { label: "Denied", tone: "bad" } : STEP_CHIP[st.tone]}
          />
        ))}
      </ListCard>

      {ret.status === "requested" && <TextButton tone="high" label="Deny" onClick={() => setPop("deny")} disabled={!online} />}

      {action && (
        <>
          <CtaSpacer />
          <FixedCta label={action.label} onClick={onCta} busy={busy && pop === null} disabled={!online || refundBlocked} error={pop === null ? error : null} />
        </>
      )}

      <KitPop
        open={pop === "deny"}
        icon={CircleX}
        title="Deny this return?"
        body={`${customer} is told by message.`}
        action="Deny return"
        keep="Keep request"
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
        title={`Refund ${money(ret.refundAmount)} in cash?`}
        body={`Hand the money back, then confirm. It's recorded in Revenue and ${customer} is told by message.`}
        action="Mark as refunded"
        keep="Not yet"
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
