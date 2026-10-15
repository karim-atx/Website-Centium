import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, Square, SquareCheck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { fetchMyOrder, RETURN_REASONS, requestReturn, type ReturnKind } from "../../services/store/orders";
import { fetchStoreInfo } from "../../services/store/customer";
import { storeErrorText } from "../../services/store/mapping";
import { money } from "../../services/store/format";
import { useOnline } from "../../hooks/useOnline";
import { useLive } from "../business-ops/store/storeShared";
import { ClientCard, ClientEmpty, QtyStepper, RadioRow, RetryLine, Section, SkeletonCards, Tile } from "./clientKit";

// OURS-customer-store-return-request (Designed by us). Pick the items and how
// many, a reason from our short list (V6-158), an optional note. B11
// request_return(p_order_id, [{item_id, quantity}], p_kind, p_reason): the
// note is sent inside the reason ("Damaged: {note}", 300 at most); Refund or
// Exchange is asked only when the store allows exchanges. Only an order
// completed in the last 30 days with no open return can be returned.

export default function ReturnRequestPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const live = useLive(() => fetchMyOrder(orderId), 0, orderId);
  const [kind, setKind] = useState<ReturnKind>("refund");
  const [exchanges, setExchanges] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = live.state;
  const o = s.status === "ok" ? s.value?.order ?? null : null;

  useEffect(() => {
    if (!o?.businessId) return;
    let alive = true;
    void fetchStoreInfo(o.businessId).then((r) => alive && r.status === "ok" && setExchanges(!!r.value?.allowExchanges));
    return () => {
      alive = false;
    };
  }, [o?.businessId]);

  if (s.status === "loading") {
    return (
      <div>
        <PageHeader title="Request a return" showBack sub />
        <SkeletonCards label="Loading your order" />
      </div>
    );
  }
  if (!o || !o.canReturn) {
    return (
      <div>
        <PageHeader title="Request a return" showBack sub />
        {s.status === "error" ? <RetryLine text="Couldn't load this order." onRetry={live.reload} /> : <ClientEmpty icon={Package} title="Returns aren't open for this order" line="You can ask for a return within 30 days of an order being delivered or picked up, one return at a time." />}
      </div>
    );
  }

  const items = Object.entries(picked).filter(([, q]) => q > 0);
  const amount = items.reduce((a, [id, q]) => a + (o.items.find((i) => i.id === id)?.unitPrice ?? 0) * q, 0);
  const ready = items.length > 0 && !!reason && online;

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    const text = note.trim() ? `${reason}: ${note.trim()}`.slice(0, 300) : reason;
    const r = await requestReturn(o.id, items.map(([itemId, qty]) => ({ itemId, qty })), exchanges ? kind : "refund", text);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Returns are coming soon." : storeErrorText(r, "Couldn't send your request. Try again."));
      return;
    }
    navigate(`/app/store/orders/${o.id}?returned=1`, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Request a return" subtitle={`Order #${o.number}${o.storeName ? ` · ${o.storeName}` : ""}`} showBack sub />

      <Section label="What are you returning?" first>
        <ClientCard label="Items">
          {o.items.map((i) => {
            const on = (picked[i.id] ?? 0) > 0;
            return (
              <div key={i.id} className="flex items-center border-t-[0.5px] border-charcoal/[0.08] first:border-t-0" style={{ gap: 12, minHeight: 56, padding: "12px 14px" }}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setPicked((p) => ({ ...p, [i.id]: on ? 0 : 1 }))}
                  className="tap flex-1 min-w-0 flex items-center text-start"
                  style={{ gap: 12, minHeight: 44 }}
                >
                  <Tile icon={Package} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold leading-[20px] text-charcoal break-words">{i.name}</span>
                    <span className="block text-[12px] font-medium text-charcoal-faint">{`${money(i.unitPrice)} each · bought ${i.qty}`}</span>
                  </span>
                  {on ? <SquareCheck size={20} aria-hidden className="shrink-0 text-primary-dark" /> : <Square size={20} aria-hidden className="shrink-0 text-charcoal-faint" />}
                </button>
                {on && i.qty > 1 && <QtyStepper value={picked[i.id]} max={i.qty} onChange={(n) => setPicked((p) => ({ ...p, [i.id]: n }))} label={`How many ${i.name}`} />}
              </div>
            );
          })}
        </ClientCard>
      </Section>

      {exchanges && (
        <Section label="Refund or exchange?">
          <ClientCard>
            <div role="radiogroup" aria-label="Refund or exchange">
              <RadioRow selected={kind === "refund"} onSelect={() => setKind("refund")} title="Refund" sub="Your money back, in cash at the store" />
              <RadioRow selected={kind === "exchange"} onSelect={() => setKind("exchange")} title="Exchange" sub="Swap it at the store" />
            </div>
          </ClientCard>
        </Section>
      )}

      <Section label="Why?">
        <ClientCard>
          <div role="radiogroup" aria-label="Reason">
            {RETURN_REASONS.map((r) => (
              <RadioRow key={r} selected={reason === r} onSelect={() => setReason(r)} title={r} />
            ))}
          </div>
        </ClientCard>
      </Section>

      <Section label="Anything to add?">
        <textarea
          aria-label="Note for the store"
          rows={3}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
          className="w-full bg-cream-soft border-[0.5px] border-charcoal/[0.10] rounded-[12px] text-[14px] leading-[21px] text-charcoal placeholder:text-charcoal-faint outline-none focus:border-primary-dark"
          style={{ padding: "10px 12px", resize: "none" }}
        />
      </Section>

      {amount > 0 && kind === "refund" && (
        <p className="text-[12.5px] font-medium text-charcoal-faint" style={{ marginTop: 12 }}>
          {`Refund if approved: ${money(amount)}, in cash at the store.`}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
      <div aria-hidden style={{ height: 60 }} />
      <PinnedCta primary={{ label: "Send request", onClick: () => void send(), disabled: !ready, loading: busy }} />
    </div>
  );
}
