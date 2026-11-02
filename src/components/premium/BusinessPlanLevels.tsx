import { useState } from "react";
import clsx from "clsx";
import { BizNote, BizRow, BizSection } from "../business-more/kit";
import { Button } from "../ui/Button";
import { BuyInApp } from "./BuyInApp";
import { usePlanLevelPrices } from "./usePlanLevel";
import { awaitingPurchase, choosePlanLevel, planChoiceLine, planLevelName, planLevelPriceText, type PlanLevel, type PlanPeriod } from "../../services/premium";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15, the business plan levels on the Centium subscription page,
// only while business_plans_on is true for the business (business_plan_level
// says so for its owner); otherwise nothing renders and the page is today's.
// G fixes 3 (Karim, 2026-11-02): the level is CHOSEN here and BOUGHT only in
// the Centium app (Apple / Google), like Premium:
// - the owner: Base, Base + 5 seats, Base + 10 seats, monthly and yearly, from
//   business_plan_level_prices(), with the active level tagged "Current" and
//   the chosen one "Chosen"; "Choose this plan" records the pick
//   (choose_business_plan_level with exactly business, seat blocks, period;
//   no charge; choosing again replaces it), then "Buy in the Centium app"
//   (store buttons "Coming soon" while STORE_APPS_LIVE is false);
// - staff: the status only (the active or chosen level) and that the owner
//   chooses the plan;
// - "Bought in the Centium app" when the plan comes from the store.

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));

export function BusinessPlanLevels({ businessId, level, isOwner, onChanged }: { businessId: string; level: PlanLevel | null; isOwner: boolean; onChanged: () => void }) {
  const [period, setPeriod] = useState<PlanPeriod>(level?.chosenBillingPeriod ?? level?.billingPeriod ?? "monthly");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const on = !!level?.businessPlansOn;
  const prices = usePlanLevelPrices(on);

  if (!on || !level || !prices || prices.length === 0) return null;
  const base = prices.find((p) => p.seatBlocks === 0) ?? null;
  const current = level.planActive ? level.seatBlocks : null;
  const chosen = level.chosenSeatBlocks;
  const waiting = awaitingPurchase(level);
  const selected = pick ?? (waiting ? chosen : null) ?? current ?? null;
  const selectedRow = prices.find((p) => p.seatBlocks === selected) ?? null;
  const sameAsChosen = waiting && selected === chosen && period === level.chosenBillingPeriod;
  const canChoose = isOwner && selectedRow !== null && planLevelPriceText(selectedRow, period) !== null && !sameAsChosen && !busy;

  const choose = async () => {
    if (!canChoose || selected === null) return;
    setBusy(true);
    setNote(null);
    const r = await choosePlanLevel(businessId, selected, period);
    setBusy(false);
    if (!r.ok) {
      setNote({ tone: "error", text: r.message });
      return;
    }
    setNote({ tone: "done", text: t("Plan chosen. Now buy it in the Centium app.") });
    setPick(null);
    onChanged();
  };

  const bought = level.planActive && level.boughtInApp ? <BizNote>{t("Bought in the Centium app")}</BizNote> : null;

  if (!isOwner) {
    // Staff: the status only.
    const status = level.planActive
      ? planChoiceLine(level.seatBlocks, level.billingPeriod, prices)
      : waiting
        ? planChoiceLine(chosen, level.chosenBillingPeriod, prices)
        : null;
    return (
      <>
        {status && (
          <BizSection label={t("Plan levels")}>
            <BizRow title={status} value={level.planActive ? t("Current") : t("Chosen")} valueTone="good" />
          </BizSection>
        )}
        {bought}
        <BizNote>{t("The business owner chooses the plan.")}</BizNote>
      </>
    );
  }

  // The Buy block names the chosen level and its price: "Base + 5 seats · $89 a month".
  const chosenRow = waiting ? (prices.find((p) => p.seatBlocks === chosen) ?? null) : null;
  const chosenPrice = chosenRow && level.chosenBillingPeriod ? planLevelPriceText(chosenRow, level.chosenBillingPeriod) : null;
  const buyLine = waiting ? [planChoiceLine(chosen, chosenPrice ? null : level.chosenBillingPeriod, prices), chosenPrice].filter(Boolean).join(" · ") : "";

  return (
    <>
      {bought}
      <BizSection label={t("Plan levels")}>
        <div role="radiogroup" aria-label={t("Billing period")} className="flex gap-2" style={{ padding: "8px 14px 6px" }}>
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={clsx("tap flex-1 min-h-[44px] rounded-xl text-[12px] font-bold", period === p ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-soft")}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("Plan levels")}>
          {prices.map((row) => {
            const price = planLevelPriceText(row, period);
            const tag =
              current === row.seatBlocks && (level.billingPeriod ?? period) === period
                ? t("Current")
                : waiting && chosen === row.seatBlocks && (level.chosenBillingPeriod ?? period) === period
                  ? t("Chosen")
                  : undefined;
            return (
              <BizRow
                key={row.seatBlocks}
                radio={{ selected: selected === row.seatBlocks }}
                title={planLevelName(row, base)}
                desc={[tn(row.seats, "{n} seat", "{n} seats"), price ?? t("Not available")].join(" · ")}
                value={tag}
                valueTone="good"
                disabled={price === null}
                dim={price === null}
                onClick={price !== null ? () => setPick(row.seatBlocks) : undefined}
              />
            );
          })}
        </div>
      </BizSection>
      <div style={{ margin: "-4px 0 14px" }}>
        <Button variant="primary" size="lg" fullWidth disabled={!canChoose} onClick={() => void choose()}>
          {busy ? t("Saving…") : t("Choose this plan")}
        </Button>
        {note && (
          <p role={note.tone === "error" ? "alert" : "status"} className={clsx("text-[12px] font-semibold leading-[18px]", note.tone === "error" ? "text-status-high" : "text-charcoal-soft")} style={{ margin: "8px 4px 0" }}>
            {note.text}
          </p>
        )}
      </div>
      <BuyInApp product="business_plan" line={buyLine || null} className="mb-[14px]" />
    </>
  );
}
