import { useState } from "react";
import clsx from "clsx";
import { BizNote, BizRow, BizSection } from "../business-more/kit";
import { BuyInApp } from "./BuyInApp";
import { usePlanLevelPrices } from "./usePlanLevel";
import { choiceDue, planLevelName, planLevelPriceText, type PlanLevel, type PlanPeriod } from "../../services/premium";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15, the business plan levels on the Centium subscription page,
// only while business_plans_on is true for the business (business_plan_level
// says so for its owner); otherwise nothing renders and the page is today's.
// G fixes 2 (Karim, 2026-11-02): plan levels are bought ONLY in the Centium
// app (Apple / Google), like Premium, so the web never starts or changes a
// plan here:
// - Base, Base + 5 seats, Base + 10 seats, monthly and yearly, from
//   business_plan_level_prices(), with the current level tagged; the owner's
//   pick only highlights a level and fills the price in the block below;
// - "Buy in the Centium app" (store buttons "Coming soon" while
//   STORE_APPS_LIVE is false);
// - choice_due: a gentle line pointing to the app;
// - staff see the levels and that the owner chooses the plan.

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));

export function BusinessPlanLevels({ level, isOwner }: { level: PlanLevel | null; isOwner: boolean }) {
  const [period, setPeriod] = useState<PlanPeriod>(level?.billingPeriod ?? "monthly");
  const [pick, setPick] = useState<number | null>(null);
  const on = !!level?.businessPlansOn;
  const prices = usePlanLevelPrices(on);

  if (!on || !level || !prices || prices.length === 0) return null;
  const base = prices.find((p) => p.seatBlocks === 0) ?? null;
  const current = level.planActive ? level.seatBlocks : null;
  const selected = pick ?? current ?? null;
  const selectedRow = prices.find((p) => p.seatBlocks === selected) ?? null;

  return (
    <>
      {choiceDue(level) && (
        <p data-plan-choice-due role="note" className="rounded-2xl bg-primary-pale px-4 py-3.5 text-[12px] font-semibold text-primary-dark" style={{ marginBottom: 13 }}>
          {t("Change your plan in the Centium app.")}
        </p>
      )}
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
            return (
              <BizRow
                key={row.seatBlocks}
                radio={isOwner ? { selected: selected === row.seatBlocks } : undefined}
                title={planLevelName(row, base)}
                desc={[tn(row.seats, "{n} seat", "{n} seats"), price ?? t("Not available")].join(" · ")}
                value={current === row.seatBlocks && (level.billingPeriod ?? period) === period ? t("Current") : undefined}
                valueTone="good"
                disabled={!isOwner || price === null}
                dim={price === null}
                onClick={isOwner && price !== null ? () => setPick(row.seatBlocks) : undefined}
              />
            );
          })}
        </div>
      </BizSection>
      {isOwner ? (
        <BuyInApp product="business_plan" line={selectedRow ? planLevelPriceText(selectedRow, period) : null} className="mb-[14px]" />
      ) : (
        <BizNote>{t("The business owner chooses the plan.")}</BizNote>
      )}
    </>
  );
}
