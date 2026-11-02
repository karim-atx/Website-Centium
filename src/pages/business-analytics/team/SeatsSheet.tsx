import { useEffect, useState } from "react";
import { Armchair, Smartphone } from "lucide-react";
import { perPeriod } from "../../../services/centium-billing";
import { BuyInApp } from "../../../components/premium/BuyInApp";
import { Buttons, ErrLine, LeadRow, RowsCard, Sheet } from "./parts";
import { money } from "./fmt";
import type { SeatInfo } from "./teamData";
import { t, tn } from "../../../i18n/core";

// AN5-022 (no free seats) and AN5-057 O1 (no plan), then Add seats.
//
// G fixes 4 (Karim, 2026-11-02): nothing paid to Centium is bought on the web.
// Seat blocks are bought in the Centium app only, so Add seats explains what a
// block adds and shows the "Buy in the Centium app" block (the same one as
// Premium and the plan levels). The web never orders seats, never asks for
// cash or a bank transfer and never cancels an order. The block price shows
// only when business_plan_summary already answered it (V6-40: never
// hard-coded, never $0).

export type SeatsMode = "noseats" | "add" | "noplan";
type Step = "intro" | "buy";

const blocksWord = (n: number) => tn(n, "1 block", "{n} blocks");
const seatsWord = (n: number) => tn(n, "{n} seat", "{n} seats");

export function SeatsSheet({
  open,
  mode,
  seats,
  used,
  pending,
  isOwner,
  onClose,
  onPlan,
}: {
  open: boolean;
  mode: SeatsMode;
  seats: SeatInfo | null;
  used: number;
  pending: number;
  /** Seat blocks are the owner's to buy (in the app); anyone else is told so. */
  isOwner: boolean;
  onClose: () => void;
  onPlan: () => void;
}) {
  const firstStep = (): Step => (mode === "add" ? "buy" : "intro");
  const [step, setStep] = useState<Step>(firstStep);

  useEffect(() => {
    if (!open) return;
    setStep(firstStep());
    // The open moment decides the first step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!seats) return null;
  const per = seats.perBlock || 5;
  const price = seats.blockPrice;
  // The block price is for the plan's billing period; null is never shown as $0.
  const period = seats.period ?? "monthly";
  const priceRows = price !== null ? [{ l: t("Price per block"), v: `${money(price)} ${perPeriod(period)}` }] : [];
  const have = seats.blocks > 0 ? `${blocksWord(seats.blocks)} · ${seatsWord(seats.capacity)}` : seatsWord(seats.capacity);

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
        <RowsCard rows={[{ l: t("Seats"), v: pending > 0 ? t("{used} used · {pending} pending", { used, pending }) : t("{used} used", { used }) }, ...priceRows]} />
        <Buttons alt={{ label: t("Not now"), onClick: onClose }} primary={{ label: t("Add seats"), onClick: () => setStep("buy") }} marginTop={16} />
      </Sheet>
    );
  }

  // step === "buy": what a block adds, and where it's bought.
  return (
    <Sheet open={open} onClose={onClose} title={t("Add seats")}>
      <LeadRow icon={Smartphone}>
        {t("Each block adds {n} seats for professionals.", { n: per })} {t("Buy seat blocks in the Centium app. The seats are added once your purchase is confirmed.")}
      </LeadRow>
      <RowsCard rows={[...priceRows, { l: t("You have"), v: have }]} />
      <BuyInApp product="seat_blocks" line={null} className="mt-4" />
      {!isOwner && <ErrLine text={t("Only the business owner can buy seats.")} />}
      <Buttons primary={{ label: t("Done"), onClick: onClose }} marginTop={16} />
    </Sheet>
  );
}
