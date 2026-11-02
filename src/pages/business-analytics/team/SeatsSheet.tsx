import { useEffect, useState } from "react";
import { Armchair, Banknote, Check, Clock3, CreditCard, Mail, Minus, Plus } from "lucide-react";
import { upgradeMailto } from "../../../services/subscription-tiers/upgrade";
import { MAX_BLOCKS_PER_PURCHASE, NOT_AVAILABLE, perPeriod, type CentiumCharge } from "../../../services/centium-billing";
import type { CentiumBilling } from "../../../hooks/useCentiumBilling";
import { formatShortDate } from "../../../utils/date";
import { Buttons, ErrLine, LeadRow, RowsCard, Sheet } from "./parts";
import { money } from "./fmt";
import type { SeatInfo } from "./teamData";
import { t, tn } from "../../../i18n/core";

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

const blocksWord = (n: number) => tn(n, "1 block", "{n} blocks");
const seatsWord = (n: number) => tn(n, "{n} seat", "{n} seats");
const dayMonth = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

export function SeatsSheet({
  open,
  mode,
  seats,
  used,
  pending,
  billing,
  businessId,
  doneLabel,
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
  // Batch 2: the block price is for the plan's billing period (buy_seat_blocks
  // charges that period's price); NULL is "Not available", never $0.
  const period = seats.period ?? "monthly";
  const each = (amount: number) => `${money(amount)} ${perPeriod(period)}`;
  const priceRow = { l: t("Price per block"), v: price !== null ? each(price) : t(NOT_AVAILABLE) };
  const total = seats.capacity + n * per;
  const have = seats.blocks > 0 ? `${blocksWord(seats.blocks)} · ${seatsWord(seats.capacity)}` : seatsWord(seats.capacity);
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
      <Sheet open={open} onClose={onClose} title={t("Seats come with the Business plan")}>
        <LeadRow icon={Armchair}>{t("Each seat block adds {n} seats.", { n: per })}</LeadRow>
        <Buttons alt={{ label: t("Not now"), onClick: onClose }} primary={{ label: t("See the Business plan"), onClick: onPlan }} marginTop={16} />
      </Sheet>
    );
  }

  if (mode === "noseats" && step === "intro") {
    return (
      <Sheet open={open} onClose={onClose} title={t("All {n} seats are in use", { n: seats.capacity })}>
        <LeadRow icon={Armchair}>{t("Add a seat block to invite another professional. Each block adds {n} seats.", { n: per })}</LeadRow>
        <RowsCard
          rows={[
            { l: t("Seats"), v: pending > 0 ? t("{used} used · {pending} pending", { used, pending }) : t("{used} used", { used }) },
            ...(live || price !== null ? [priceRow] : []),
          ]}
        />
        <Buttons alt={{ label: t("Not now"), onClick: onClose }} primary={{ label: t("Add seats"), onClick: toAdd }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "pending" && order) {
    return (
      <Sheet open={open} onClose={onClose} title={t("Seats awaiting payment")}>
        <LeadRow icon={Clock3}>{t("Pay Centium by cash or bank transfer. The seats are added once your payment is recorded.")}</LeadRow>
        <RowsCard
          rows={[
            { l: t("Order"), v: `${blocksWord(order.quantity)} · ${seatsWord(order.quantity * per)}` },
            { l: t("Ordered"), v: dayMonth(order.createdAt) },
            { l: t("Amount"), v: money(order.amount), bold: true },
          ]}
        />
        {err && <ErrLine text={t(err)} />}
        <Buttons
          alt={billing?.isOwner ? { label: t("Cancel order"), onClick: () => setStep("cancel") } : undefined}
          primary={{ label: t("Done"), onClick: onClose }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  if (step === "cancel" && order) {
    return (
      <Sheet open={open} onClose={onClose} title={t("Cancel this order?")}>
        <LeadRow>{tn(order.quantity, "1 seat block won't be added.", "{n} seat blocks won't be added.")} {t("You can order seats again any time.")}</LeadRow>
        {err && <ErrLine text={t(err)} />}
        <Buttons alt={{ label: t("Keep order"), onClick: () => setStep("pending") }} primary={{ label: t("Cancel order"), tone: "danger", busy, onClick: () => void cancelOrder() }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "confirm") {
    return (
      <Sheet open={open} onClose={onClose} title={tn(n, "Confirm 1 seat block", "Confirm {n} seat blocks")}>
        <LeadRow>{t("Billed with your Business plan from today.")}</LeadRow>
        <RowsCard
          rows={[
            { l: t("Add"), v: `${blocksWord(n)} · ${seatsWord(n * per)}` },
            ...(price !== null
              ? [
                  { l: t("Today"), v: money(amountOf(n) ?? 0) },
                  { l: t("Then"), v: `+${each(amountOf(n) ?? 0)}` },
                ]
              : live
                ? [priceRow]
                : []),
            { l: t("New total"), v: seatsWord(total), bold: true },
          ]}
        />
        <Buttons alt={{ label: t("Back"), onClick: () => setStep("choose") }} primary={{ label: t("Confirm and pay"), onClick: () => setStep("pay") }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "pay") {
    const a = amountOf(n);
    const amount = a !== null ? money(a) : null;
    return (
      <Sheet open={open} onClose={onClose} title={amount ? t("Pay {amount}", { amount }) : t("Pay for seats")}>
        <LeadRow icon={CreditCard}>{n === 1 ? t("Choose how you pay for the new block.") : t("Choose how you pay for the new blocks.")}</LeadRow>
        <RowsCard
          rows={[{ l: t("Method"), v: live ? t("Cash or bank transfer") : t("Request by email") }, ...(amount ? [{ l: t("Amount"), v: amount, bold: true }] : [])]}
        />
        <Buttons
          alt={{ label: t("Back"), onClick: () => setStep("confirm") }}
          primary={{ label: t("Pay with Whish"), onClick: () => undefined, disabled: true, trailing: <span className="an5-soon">{t("Soon")}</span> }}
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
                {t("Pay by cash or bank transfer")}
              </button>
              {err && <ErrLine text={t(err)} />}
            </>
          ) : (
            <ErrLine text={t("Only the business owner can buy seats.")} />
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
            {t("Ask Centium to add seats")}
          </a>
        )}
      </Sheet>
    );
  }

  if (step === "done") {
    return (
      <Sheet open={open} onClose={onClose} title={placed ? t("Seats ordered") : t("Request sent")}>
        <LeadRow icon={Check} tone="good">
          {placed
            ? `${placed.amount !== null ? t("Pay Centium {amount} by cash or bank transfer.", { amount: money(placed.amount) }) : t("Pay Centium by cash or bank transfer.")} ${t("Your {n} new seats are added once the payment is recorded.", { n: placed.n * per })}`
            : t("Your seats are added once Centium confirms the request.")}
        </LeadRow>
        <Buttons primary={{ label: doneLabel ?? t("Back to Team"), onClick: onClose }} marginTop={16} />
      </Sheet>
    );
  }

  // step === "choose"
  return (
    <Sheet open={open} onClose={onClose} title={t("Add seats")}>
      <LeadRow>{t("Each block adds {n} seats for professionals.", { n: per })}</LeadRow>
      <div className="an5-stepper">
        <div className="min-w-0">
          <p className="an5-stepper-t">{t("Seat blocks to add")}</p>
          <p className="an5-stepper-s">{tn(per, "{n} professional per block", "{n} professionals per block")}</p>
        </div>
        <div className="an5-stepper-c">
          <button type="button" className="an5-stepbtn tap" aria-label={t("Fewer blocks")} disabled={n <= 1} onClick={() => setN((x) => Math.max(1, x - 1))}>
            <Minus size={16} strokeWidth={2.4} aria-hidden />
          </button>
          <span className="an5-stepval" aria-live="polite">
            {n}
          </span>
          <button
            type="button"
            className="an5-stepbtn tap"
            aria-label={t("More blocks")}
            disabled={n >= MAX_BLOCKS_PER_PURCHASE}
            onClick={() => setN((x) => Math.min(MAX_BLOCKS_PER_PURCHASE, x + 1))}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>
      <RowsCard
        rows={[
          ...(live || price !== null ? [priceRow] : []),
          { l: t("You have"), v: have },
          { l: t("New total"), v: seatsWord(total), bold: true },
        ]}
      />
      <Buttons alt={{ label: t("Cancel"), onClick: onClose }} primary={{ label: t("Continue"), onClick: () => setStep("confirm") }} marginTop={16} />
    </Sheet>
  );
}
