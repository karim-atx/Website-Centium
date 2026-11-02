import React, { useState } from "react";
import { ObSectionLabel, ObStep } from "../shell";
import { BizFooterBar } from "./BizFrame";
import { BizRows } from "./ui";
import { bizLaneId } from "./bizLanes";
import type { BizLane } from "./lanes";
import { BuyInApp } from "../../../components/premium/BuyInApp";
import { usePlanLevelPrices } from "../../../components/premium/usePlanLevel";
import { planLevelName, planLevelPriceText, type PlanPeriod } from "../../../services/premium";
import { t, tn } from "../../../i18n/core";
import "./business-onboarding.css";

// undrawn (Round G, no handover)
// Round G1 fixes, then G fixes 2 (Karim, 2026-11-02): business plan levels
// are bought ONLY in the Centium app (Apple / Google), like Premium. This
// screen, in front of the venue ("Where") step, is shown only while
// business_plans_on is on for the owner and the business must_choose_level
// (onboardingPlanStep in services/premium/model); otherwise onboarding is
// exactly today's.
// - Base, Base + 5, Base + 10, monthly or yearly, from
//   business_plan_level_prices(); the owner's pick is a local choice, shown
//   highlighted, and nothing is sent;
// - then "Buy in the Centium app" (the same block Premium uses; its store
//   buttons say "Coming soon" while STORE_APPS_LIVE is false), and the line
//   that verification is approved once the purchase is confirmed;
// - then Continue to "Where", always available: the web never opens a plan
//   charge, so this step is never a dead end. Whether the venue can be added
//   before the purchase is the Database's to decide; if it still refuses
//   (ATXQ3), the venue step shows that sentence.

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));

export interface PlanStepProps {
  lane: BizLane;
  /** The gate's "loading": the skeleton. */
  loading: boolean;
  /** Carry on to the venue step. */
  onContinue: () => void;
  onBack: () => void;
  saveExit: boolean;
}

export const PlanStep: React.FC<PlanStepProps> = ({ lane, loading, onContinue, onBack, saveExit }) => {
  const prices = usePlanLevelPrices(true);
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [pick, setPick] = useState<number | null>(null);

  const base = prices?.find((p) => p.seatBlocks === 0) ?? null;
  const row = prices?.find((p) => p.seatBlocks === pick) ?? null;
  const list = prices ?? [];

  return (
    <ObStep
      lane={bizLaneId(lane)}
      step="bizWhere"
      eyebrow={t("Before step 2")}
      title={t("Choose your business plan")}
      onBack={onBack}
      saveExit={saveExit}
      loading={loading || !prices}
      // Always available: the plan is bought in the app, never here.
      footer={<BizFooterBar footer={{ label: t("Continue"), onClick: onContinue }} />}
    >
      <div className="ob-biz">
        <ObSectionLabel title={t("How you're billed")} margin="0 2px 12px" />
        <BizRows
          radioGroup
          ariaLabel={t("Billing period")}
          rows={(["monthly", "yearly"] as const).map((p) => ({ key: p, title: periodLabel(p), radio: { selected: period === p, onSelect: () => setPeriod(p) } }))}
        />
        <ObSectionLabel title={t("Plan levels")} />
        {list.length === 0 ? (
          <p role="alert" style={{ margin: "0 2px 16px", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>
            {t("Couldn't load the prices.")}
          </p>
        ) : (
          <BizRows
            radioGroup
            ariaLabel={t("Plan levels")}
            rows={list.map((r) => {
              const price = planLevelPriceText(r, period);
              return {
                key: String(r.seatBlocks),
                title: planLevelName(r, base),
                desc: [tn(r.seats, "{n} seat", "{n} seats"), price ?? t("Not available")].join(" · "),
                dim: price === null,
                radio: { selected: pick === r.seatBlocks, onSelect: () => price !== null && setPick(r.seatBlocks) },
              };
            })}
          />
        )}
        <BuyInApp product="business_plan" line={row ? planLevelPriceText(row, period) : null} />
        <p style={{ margin: "12px 2px 0", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>
          {t("Your verification is approved once your plan purchase is confirmed.")}
        </p>
      </div>
    </ObStep>
  );
};
