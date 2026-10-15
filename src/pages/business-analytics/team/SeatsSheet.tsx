import { useEffect, useState } from "react";
import { Armchair, Banknote, Check, Clock3, CreditCard, Mail, Minus, Plus } from "lucide-react";
import { upgradeMailto } from "../../../services/subscription-tiers/upgrade";
import { MAX_BLOCKS_PER_PURCHASE, type CentiumCharge } from "../../../services/centium-billing";
import type { CentiumBilling } from "../../../hooks/useCentiumBilling";
import { formatShortDate } from "../../../utils/date";
import { Buttons, ErrLine, LeadRow, RowsCard, Sheet } from "./parts";
import { money, perMonth } from "./fmt";
import type { SeatInfo } from "./teamData";

// AN5-022 (no free seats), AN5-057 (choose blocks), AN5-058 (confirm),
// AN5-059 (pay: Whish shown as Soon, X-29), AN5-060 (done) and AN5-057 O1
// (no plan). Prices are read from the database (V6-40, X-27): the seat block
// price from business_plan_summary (subscription_tiers), never hard-coded.
//
// B8 / RV-06: buy_seat_blocks records the order as a pending charge from the
// business to Centium (owner only). There is no card payment: the business
// pays Centium by cash or bank transfer, Centium marks the charge paid, and
// only then do the seats count. So the pay step keeps "Pay with Whish"
// disabled with Soon (AN5-059 row 3, DECIDED) and the working path is "Pay by
// cash or bank transfer", which places the order; the done step says the
// seats arrive once the payment is recorded. One order may wait at a time
// (ATXD7): while one waits, Add seats opens it (OURS "pending" step) with
// Cancel order (cancel_seat_block_purchase).
//
// PENDING RULE: without RV-06 on the database (billing.available false) the
// earlier path stays: the pay step offers the upgrade email and nothing is
// recorded.

export type SeatsMode = "noseats" | "add" | "noplan";
type Step = "intro" | "choose" | "confirm" | "pay" | "done" | "pending" | "cancel";

const blocksWord = (n: number) => (n === 1 ? "1 block" : `${n} blocks`);
const dayMonth = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

export function SeatsSheet({
  open,
  mode,
  seats,
  used,
  pending,
  billing,
  businessId,
  doneLabel = "Back to Team",
  onClose,
  onPlan,
  onRequested,
  onChanged,
}: {
  open: boolean;
  mode: SeatsMode;
  seats: SeatInfo | null;
  used: number;
  pending: number;
  /** RV-06 state (useCentiumBilling); null keeps the email path. */
  billing: CentiumBilling | null;
  businessId: string | null;
  doneLabel?: string;
  onClose: () => void;
  onPlan: () => void;
  /** Email path only (no RV-06): the blocks asked for, for the hero line. */
  onRequested?: (blocks: number) => void;
  /** RV-06: an order was placed or cancelled; reload what shows it. */
  onChanged?: () => void;
}) {
  const live = !!billing && billing.available && !!businessId;
  const order: CentiumCharge | null = live ? billing.pendingSeat : null;
  const firstStep = (): Step => (mode === "add" ? (order ? "pending" : "choose") : "intro");
  const [step, setStep] = useState<Step>(firstStep);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ n: number; amount: number | null } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(firstStep());
    setN(1);
    setErr(null);
    setBusy(false);
    // The open moment decides the first step; a reload while open must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!seats) return null;
  const per = seats.perBlock || 5;
  const price = seats.blockPrice;
  const total = seats.capacity + n * per;
  const have = seats.blocks > 0 ? `${blocksWord(seats.blocks)} · ${seats.capacity} seats` : `${seats.capacity} seats`;
  const amountOf = (k: number) => (price !== null ? Math.round(k * price * 100) / 100 : null);
  const toAdd = () => setStep(order ? "pending" : "choose");

  const place = async () => {
    if (!billing || !businessId || busy) return;
    setBusy(true);
    setErr(null);
    const r = await billing.buy(businessId, n);
    setBusy(false);
    if (!r.ok) {
      if (r.kind === "already_pending") {
        // Another device placed one: show it.
        onChanged?.();
        setStep("pending");
        return;
      }
      setErr(r.message);
      return;
    }
    setPlaced({ n, amount: amountOf(n) });
    setStep("done");
    onChanged?.();
  };

  const cancelOrder = async () => {
    if (!billing || !order || busy) return;
    setBusy(true);
    setErr(null);
    const r = await billing.cancel(order.id);
    setBusy(false);
    if (!r.ok && r.kind !== "final") {
      setErr(r.message);
      return;
    }
    onChanged?.();
    onClose();
  };

  if (mode === "noplan" && step === "intro") {
    return (
      <Sheet open={open} onClose={onClose} title="Seats come with the Business plan">
        <LeadRow icon={Armchair}>Each seat block adds {per} seats.</LeadRow>
        <Buttons alt={{ label: "Not now", onClick: onClose }} primary={{ label: "See the Business plan", onClick: onPlan }} marginTop={16} />
      </Sheet>
    );
  }

  if (mode === "noseats" && step === "intro") {
    return (
      <Sheet open={open} onClose={onClose} title={`All ${seats.capacity} seats are in use`}>
        <LeadRow icon={Armchair}>Add a seat block to invite another professional. Each block adds {per} seats.</LeadRow>
        <RowsCard
          rows={[
            { l: "Seats", v: pending > 0 ? `${used} used · ${pending} pending` : `${used} used` },
            ...(price !== null ? [{ l: "Price per block", v: perMonth(price) }] : []),
          ]}
        />
        <Buttons alt={{ label: "Not now", onClick: onClose }} primary={{ label: "Add seats", onClick: toAdd }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "pending" && order) {
    return (
      <Sheet open={open} onClose={onClose} title="Seats awaiting payment">
        <LeadRow icon={Clock3}>Pay Centium by cash or bank transfer. The seats are added once your payment is recorded.</LeadRow>
        <RowsCard
          rows={[
            { l: "Order", v: `${blocksWord(order.quantity)} · ${order.quantity * per} seats` },
            { l: "Ordered", v: dayMonth(order.createdAt) },
            { l: "Amount", v: money(order.amount), bold: true },
          ]}
        />
        {err && <ErrLine text={err} />}
        <Buttons
          alt={billing?.isOwner ? { label: "Cancel order", onClick: () => setStep("cancel") } : undefined}
          primary={{ label: "Done", onClick: onClose }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  if (step === "cancel" && order) {
    return (
      <Sheet open={open} onClose={onClose} title="Cancel this order?">
        <LeadRow>{order.quantity === 1 ? "1 seat block won't be added." : `${order.quantity} seat blocks won't be added.`} You can order seats again any time.</LeadRow>
        {err && <ErrLine text={err} />}
        <Buttons alt={{ label: "Keep order", onClick: () => setStep("pending") }} primary={{ label: "Cancel order", tone: "danger", busy, onClick: () => void cancelOrder() }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "confirm") {
    return (
      <Sheet open={open} onClose={onClose} title={n === 1 ? "Confirm 1 seat block" : `Confirm ${n} seat blocks`}>
        <LeadRow>Billed with your Business plan from today.</LeadRow>
        <RowsCard
          rows={[
            { l: "Add", v: `${blocksWord(n)} · ${n * per} seats` },
            ...(price !== null
              ? [
                  { l: "Today", v: money(amountOf(n) ?? 0) },
                  { l: "Then", v: `+${perMonth(amountOf(n) ?? 0)}` },
                ]
              : []),
            { l: "New total", v: `${total} seats`, bold: true },
          ]}
        />
        <Buttons alt={{ label: "Back", onClick: () => setStep("choose") }} primary={{ label: "Confirm and pay", onClick: () => setStep("pay") }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "pay") {
    const a = amountOf(n);
    const amount = a !== null ? money(a) : null;
    return (
      <Sheet open={open} onClose={onClose} title={amount ? `Pay ${amount}` : "Pay for seats"}>
        <LeadRow icon={CreditCard}>Choose how you pay for the new {n === 1 ? "block" : "blocks"}.</LeadRow>
        <RowsCard
          rows={[{ l: "Method", v: live ? "Cash or bank transfer" : "Request by email" }, ...(amount ? [{ l: "Amount", v: amount, bold: true }] : [])]}
        />
        <Buttons
          alt={{ label: "Back", onClick: () => setStep("confirm") }}
          primary={{ label: "Pay with Whish", onClick: () => undefined, disabled: true, trailing: <span className="an5-soon">Soon</span> }}
          marginTop={16}
        />
        {live ? (
          billing.isOwner ? (
            <>
              <button
                type="button"
                className="an5-textbtn tap"
                style={{ color: "var(--an-pdark)", opacity: busy ? 0.45 : 1 }}
                aria-disabled={busy || undefined}
                onClick={() => void place()}
              >
                <Banknote size={15} aria-hidden />
                Pay by cash or bank transfer
              </button>
              {err && <ErrLine text={err} />}
            </>
          ) : (
            <ErrLine text="Only the business owner can buy seats." />
          )
        ) : (
          <a
            href={upgradeMailto()}
            className="an5-textbtn tap"
            style={{ color: "var(--an-pdark)" }}
            onClick={() => {
              setPlaced(null);
              setStep("done");
              onRequested?.(n);
            }}
          >
            <Mail size={15} aria-hidden />
            Ask Centium to add seats
          </a>
        )}
      </Sheet>
    );
  }

  if (step === "done") {
    return (
      <Sheet open={open} onClose={onClose} title={placed ? "Seats ordered" : "Request sent"}>
        <LeadRow icon={Check} tone="good">
          {placed
            ? `${placed.amount !== null ? `Pay Centium ${money(placed.amount)} by cash or bank transfer.` : "Pay Centium by cash or bank transfer."} Your ${placed.n * per} new seats are added once the payment is recorded.`
            : "Your seats are added once Centium confirms the request."}
        </LeadRow>
        <Buttons primary={{ label: doneLabel, onClick: onClose }} marginTop={16} />
      </Sheet>
    );
  }

  // step === "choose"
  return (
    <Sheet open={open} onClose={onClose} title="Add seats">
      <LeadRow>Each block adds {per} seats for professionals.</LeadRow>
      <div className="an5-stepper">
        <div className="min-w-0">
          <p className="an5-stepper-t">Seat blocks to add</p>
          <p className="an5-stepper-s">{per} professionals per block</p>
        </div>
        <div className="an5-stepper-c">
          <button type="button" className="an5-stepbtn tap" aria-label="Fewer blocks" disabled={n <= 1} onClick={() => setN((x) => Math.max(1, x - 1))}>
            <Minus size={16} strokeWidth={2.4} aria-hidden />
          </button>
          <span className="an5-stepval" aria-live="polite">
            {n}
          </span>
          <button
            type="button"
            className="an5-stepbtn tap"
            aria-label="More blocks"
            disabled={n >= MAX_BLOCKS_PER_PURCHASE}
            onClick={() => setN((x) => Math.min(MAX_BLOCKS_PER_PURCHASE, x + 1))}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>
      <RowsCard
        rows={[
          ...(price !== null ? [{ l: "Price per block", v: perMonth(price) }] : []),
          { l: "You have", v: have },
          { l: "New total", v: `${total} seats`, bold: true },
        ]}
      />
      <Buttons alt={{ label: "Cancel", onClick: onClose }} primary={{ label: "Continue", onClick: () => setStep("confirm") }} marginTop={16} />
    </Sheet>
  );
}
