import { useEffect, useState } from "react";
import { Armchair, Check, CreditCard, Mail, Minus, Plus } from "lucide-react";
import { upgradeMailto } from "../../../services/subscription-tiers/upgrade";
import { Buttons, LeadRow, RowsCard, Sheet } from "./parts";
import { money, perMonth } from "./fmt";
import type { SeatInfo } from "./teamData";

// AN5-022 (no free seats), AN5-057 (choose blocks), AN5-058 (confirm),
// AN5-059 (pay: Whish shown as Soon, X-29), AN5-060 O1 (request sent) and
// AN5-057 O1 (no plan). Prices are read from subscription_tiers (V6-40,
// X-27). Buying seat blocks is B8 (buy_seat_blocks); until then the working
// path is the existing upgrade email (AN5-059 row 4), and nothing is
// recorded as bought.

export type SeatsMode = "noseats" | "add" | "noplan";
type Step = "choose" | "confirm" | "pay" | "done";

const blocksWord = (n: number) => (n === 1 ? "1 block" : `${n} blocks`);

export function SeatsSheet({
  open,
  mode,
  seats,
  used,
  pending,
  onClose,
  onPlan,
  onRequested,
}: {
  open: boolean;
  mode: SeatsMode;
  seats: SeatInfo | null;
  used: number;
  pending: number;
  onClose: () => void;
  onPlan: () => void;
  onRequested: (blocks: number) => void;
}) {
  const [step, setStep] = useState<Step | "intro">("intro");
  const [n, setN] = useState(1);

  useEffect(() => {
    if (!open) return;
    setStep(mode === "add" ? "choose" : "intro");
    setN(1);
  }, [open, mode]);

  if (!seats) return null;
  const per = seats.perBlock || 5;
  const price = seats.blockPrice;
  const total = seats.capacity + n * per;
  const have = seats.blocks > 0 ? `${blocksWord(seats.blocks)} · ${seats.capacity} seats` : `${seats.capacity} seats`;

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
        <Buttons alt={{ label: "Not now", onClick: onClose }} primary={{ label: "Add seats", onClick: () => setStep("choose") }} marginTop={16} />
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
                  { l: "Today", v: money(Math.round(n * price * 100) / 100) },
                  { l: "Then", v: `+${perMonth(Math.round(n * price * 100) / 100)}` },
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
    const amount = price !== null ? money(Math.round(n * price * 100) / 100) : null;
    return (
      <Sheet open={open} onClose={onClose} title={amount ? `Pay ${amount}` : "Pay for seats"}>
        <LeadRow icon={CreditCard}>Choose how you pay for the new {n === 1 ? "block" : "blocks"}.</LeadRow>
        <RowsCard rows={[{ l: "Method", v: "Request by email" }, ...(amount ? [{ l: "Amount", v: amount, bold: true }] : [])]} />
        <Buttons
          alt={{ label: "Back", onClick: () => setStep("confirm") }}
          primary={{ label: "Pay with Whish", onClick: () => undefined, disabled: true, trailing: <span className="an5-soon">Soon</span> }}
          marginTop={16}
        />
        <a
          href={upgradeMailto()}
          className="an5-textbtn tap"
          style={{ color: "var(--an-pdark)" }}
          onClick={() => {
            setStep("done");
            onRequested(n);
          }}
        >
          <Mail size={15} aria-hidden />
          Ask Centium to add seats
        </a>
      </Sheet>
    );
  }

  if (step === "done") {
    return (
      <Sheet open={open} onClose={onClose} title="Request sent">
        <LeadRow icon={Check} tone="good">
          Your seats are added once Centium confirms the request.
        </LeadRow>
        <Buttons primary={{ label: "Back to Team", onClick: onClose }} marginTop={16} />
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
          <button type="button" className="an5-stepbtn tap" aria-label="More blocks" disabled={n >= 10} onClick={() => setN((x) => Math.min(10, x + 1))}>
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
