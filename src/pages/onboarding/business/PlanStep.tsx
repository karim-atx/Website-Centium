import React, { useState } from "react";
import { ObSectionLabel, ObStep } from "../shell";
import { BizFooterBar } from "./BizFrame";
import { BizRows } from "./ui";
import { bizLaneId } from "./bizLanes";
import type { BizLane } from "./lanes";
import { BuyInApp } from "../../../components/premium/BuyInApp";
import { usePlanLevelPrices } from "../../../components/premium/usePlanLevel";
import { choosePlanLevel, planChoiceLine, planLevelName, planLevelPriceText, type PlanPeriod } from "../../../services/premium";
import { t, tn } from "../../../i18n/core";
import "./business-onboarding.css";

// undrawn (Round G, no handover)
// Round G1 fixes, G fixes 2, then G fixes 3 (Karim, 2026-11-02): business
// plan levels are CHOSEN here and BOUGHT only in the Centium app (Apple /
// Google), like Premium. This screen, in front of the venue ("Where") step,
// is shown only while business_plans_on is on for the owner and the business
// must_choose_level (onboardingPlanStep in services/premium/model); otherwise
// onboarding is exactly today's.
// - Base, Base + 5, Base + 10, monthly or yearly, from
//   business_plan_level_prices();
// - "Choose this plan", the step's main action, is choose_business_plan_level
//   with exactly (business, seat blocks, period): it only records the level,
//   with no charge, and unlocks the verification and the venue. ATXD7 or a
//   repeat choice reads as chosen;
// - once chosen: "Now buy it in the Centium app", the Buy in the Centium app
//   block (its store buttons say "Coming soon" while STORE_APPS_LIVE is
//   false) and that verification is approved once the purchase is confirmed;
// - Continue to "Where" is always there (a link before the choice), so the
//   step is never a dead end. Carrying on without choosing, the venue step
//   shows the Database's ATXQ3 as "Choose your business plan first."

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));

export interface PlanStepProps {
  lane: BizLane;
  businessId: string;
  /** The gate's "loading": the skeleton. */
  loading: boolean;
  /** "Choose this plan" succeeded here. */
  chosen: boolean;
  onChosen: () => void;
  /** Carry on to the venue step. */
  onContinue: () => void;
  onBack: () => void;
  saveExit: boolean;
  online: boolean;
}

export const PlanStep: React.FC<PlanStepProps> = ({ lane, businessId, loading, chosen, onChosen, onContinue, onBack, saveExit, online }) => {
  const prices = usePlanLevelPrices(true);
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What was chosen here: the Buy block's level and price.
  const [made, setMade] = useState<{ seatBlocks: number; period: PlanPeriod } | null>(null);

  const base = prices?.find((p) => p.seatBlocks === 0) ?? null;
  const row = prices?.find((p) => p.seatBlocks === pick) ?? null;
  const canChoose = !!row && planLevelPriceText(row, period) !== null && !busy;

  const choose = async () => {
    if (!row || !canChoose) return;
    if (!online) {
      setError(t("You're offline. Connect to choose your plan."));
      return;
    }
    setBusy(true);
    setError(null);
    const r = await choosePlanLevel(businessId, row.seatBlocks, period);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setMade({ seatBlocks: row.seatBlocks, period });
    onChosen();
  };

  const shell = (children: React.ReactNode, footer: React.ReactNode, isLoading = false) => (
    <ObStep
      lane={bizLaneId(lane)}
      step="bizWhere"
      eyebrow={t("Before step 2")}
      title={t("Choose your business plan")}
      onBack={onBack}
      saveExit={saveExit}
      loading={isLoading}
      footer={footer}
    >
      <div className="ob-biz">{children}</div>
    </ObStep>
  );

  if (loading || !prices) return shell(null, undefined, true);

  if (chosen) {
    const madeRow = made ? (prices.find((p) => p.seatBlocks === made.seatBlocks) ?? null) : null;
    const price = madeRow && made ? planLevelPriceText(madeRow, made.period) : null;
    // "Base + 5 seats · $89 a month": the price already says the period.
    const line = [made ? planChoiceLine(made.seatBlocks, price ? null : made.period, prices) : null, price].filter(Boolean).join(" · ");
    return shell(
      <>
        <ObSectionLabel title={t("Now buy it in the Centium app")} margin="0 2px 12px" />
        <BuyInApp product="business_plan" line={line || null} />
        <p role="status" style={{ margin: "12px 2px 0", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>
          {t("Your verification is approved once your purchase is confirmed.")}
        </p>
      </>,
      <BizFooterBar footer={{ label: t("Continue"), onClick: onContinue }} />
    );
  }

  return shell(
    <>
      <ObSectionLabel title={t("How you're billed")} margin="0 2px 12px" />
      <BizRows
        radioGroup
        ariaLabel={t("Billing period")}
        rows={(["monthly", "yearly"] as const).map((p) => ({ key: p, title: periodLabel(p), radio: { selected: period === p, onSelect: () => setPeriod(p) } }))}
      />
      <ObSectionLabel title={t("Plan levels")} />
      {prices.length === 0 ? (
        <p role="alert" style={{ margin: "0 2px 16px", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>
          {t("Couldn't load the prices.")}
        </p>
      ) : (
        <BizRows
          radioGroup
          ariaLabel={t("Plan levels")}
          rows={prices.map((r) => {
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
      <p style={{ margin: "0 2px", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>{t("You choose your plan here and buy it in the Centium app.")}</p>
    </>,
    // The choice is the step's main action; Continue stays as the link, so
    // the step is never a dead end.
    <BizFooterBar
      footer={{
        label: busy ? t("Saving…") : t("Choose this plan"),
        onClick: () => void choose(),
        disabled: !canChoose,
        busy,
        error: error ?? undefined,
        errorTone: !online ? "info" : "error",
        link: { label: t("Continue"), onClick: onContinue },
      }}
    />
  );
};
