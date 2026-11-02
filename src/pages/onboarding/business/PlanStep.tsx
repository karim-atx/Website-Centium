import React, { useState } from "react";
import { CalendarClock, Clock3 } from "lucide-react";
import { ObSectionLabel, ObStep, ObTip } from "../shell";
import { BizFooterBar } from "./BizFrame";
import { BizPlanCard, BizRows } from "./ui";
import { bizLaneId } from "./bizLanes";
import type { BizLane } from "./lanes";
import { RefundPolicyLink } from "../../../components/legal/RefundPolicyLink";
import { usePlanLevelPrices } from "../../../components/premium/usePlanLevel";
import { choosePlanLevel, formatPremiumPrice, pendingPlanLine, planLevelName, type PlanLevel, type PlanLevelPrice, type PlanPeriod } from "../../../services/premium";
import { t, tn } from "../../../i18n/core";
import "./business-onboarding.css";

// undrawn (Round G, no handover)
// Round G1 fixes (Karim, 2026-11-02): business onboarding starts with choosing
// and buying the plan, on this screen in front of the venue ("Where") step,
// so paying first is never a dead end. Shown only while business_plans_on is
// on for the owner and the business must_choose_level (onboardingPlanStep in
// services/premium/model); otherwise onboarding is exactly today's.
// - Base, Base + 5, Base + 10, monthly or yearly, from
//   business_plan_level_prices();
// - "Start now" is choose_business_plan_level (the G1 wording key, language,
//   refund policy version and 'web'), which opens the plan charge;
// - then the open charge (business_plan_level's pending_*) and how it's paid:
//   to Centium by cash or bank transfer, as every Centium charge today;
//   Continue goes on to the venue step. The verification is approved once the
//   charge is paid (the Database checks that at approval).

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));
const priceText = (row: PlanLevelPrice, p: PlanPeriod): string | null => {
  const v = formatPremiumPrice(p === "monthly" ? row.monthlyPrice : row.yearlyPrice);
  return v ? (p === "monthly" ? t("{price} a month", { price: v }) : t("{price} a year", { price: v })) : null;
};

export interface PlanStepProps {
  lane: BizLane;
  businessId: string;
  /** business_plan_level(), or null while it (re)loads. */
  level: PlanLevel | null;
  /** The gate's "loading": the skeleton. */
  loading: boolean;
  /** "Start now" succeeded here (or a charge was already open): the charge is shown. */
  chosen: boolean;
  onChosen: () => void;
  reloadLevel: () => void;
  /** Carry on to the venue step. */
  onContinue: () => void;
  onBack: () => void;
  saveExit: boolean;
  online: boolean;
}

export const PlanStep: React.FC<PlanStepProps> = ({ lane, businessId, level, loading, chosen, onChosen, reloadLevel, onContinue, onBack, saveExit, online }) => {
  const prices = usePlanLevelPrices(true);
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What was started here, until business_plan_level's pending_* reads back.
  const [started, setStarted] = useState<{ seatBlocks: number; period: PlanPeriod } | null>(null);

  const base = prices?.find((p) => p.seatBlocks === 0) ?? null;
  const row = prices?.find((p) => p.seatBlocks === pick) ?? null;
  const canStart = !!row && priceText(row, period) !== null && !busy;

  const start = async () => {
    if (!row || !canStart) return;
    if (!online) {
      setError(t("You're offline. Connect to start your plan."));
      return;
    }
    setBusy(true);
    setError(null);
    const r = await choosePlanLevel(businessId, row.seatBlocks, period);
    setBusy(false);
    // ATXD7: a plan charge already awaits payment, so a level is chosen: show it.
    if (!r.ok && r.code !== "ATXD7") {
      setError(r.message);
      return;
    }
    setStarted({ seatBlocks: row.seatBlocks, period });
    onChosen();
    reloadLevel();
  };

  const shell = (children: React.ReactNode, footer: React.ReactNode, isLoading = false) => (
    <ObStep
      lane={bizLaneId(lane)}
      step="bizWhere"
      eyebrow={t("Before step 2")}
      title={t("Choose your business plan")}
      subtitle={t("Your plan comes first. Your verification is approved once it's paid.")}
      onBack={onBack}
      saveExit={saveExit}
      loading={isLoading}
      footer={footer}
    >
      <div className="ob-biz">{children}</div>
    </ObStep>
  );

  if (loading || (!chosen && !prices)) return shell(null, undefined, true);

  if (chosen) {
    // The open charge: business_plan_level's pending_* once it has read back,
    // else what was started here.
    const open = level && level.awaitingPayment ? level : null;
    const blocks = open?.pendingSeatBlocks ?? started?.seatBlocks ?? null;
    const per = open?.pendingBillingPeriod ?? started?.period ?? null;
    const levelRow = blocks === null ? null : (prices?.find((p) => p.seatBlocks === blocks) ?? null);
    const amount = open?.pendingAmount ?? (levelRow && per ? (per === "monthly" ? levelRow.monthlyPrice : levelRow.yearlyPrice) : null);
    const amountText = formatPremiumPrice(amount);
    const title = levelRow ? planLevelName(levelRow, base) : blocks !== null ? planLevelName({ seatBlocks: blocks, seats: 0 }, null) : t("Business plan");
    const line = open ? pendingPlanLine(open, prices) : null;
    return shell(
      <>
        <ObSectionLabel title={t("Your plan charge")} margin="0 2px 12px" />
        <BizPlanCard
          icon={CalendarClock}
          title={title}
          sub={per ? (per === "monthly" ? t("Billed monthly") : t("Billed yearly")) : (line ?? "")}
          price={amountText ?? "–"}
          note={t("Awaiting payment")}
        />
        <ObTip icon={Clock3} heading={t("How to pay")} margin="4px 0 0">
          {amountText
            ? t("Pay Centium {price} by cash or bank transfer. Centium records the payment, and your verification is approved once it's paid.", { price: amountText })
            : t("Pay Centium by cash or bank transfer. Centium records the payment, and your verification is approved once it's paid.")}
        </ObTip>
        <p style={{ margin: "12px 2px 0", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>{t("You can carry on setting up your business now.")}</p>
      </>,
      // Continue waits until business_plan_level reads the level as chosen.
      <BizFooterBar footer={{ label: t("Continue"), onClick: onContinue, busy: level?.mustChooseLevel === true }} />
    );
  }

  const list = prices ?? [];
  return shell(
    <>
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
            const price = priceText(r, period);
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
      <p style={{ margin: "0 2px", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)" }}>
        {t("Your plan starts once its first payment is recorded.")} <RefundPolicyLink />
      </p>
    </>,
    <BizFooterBar
      footer={{
        label: busy ? t("Starting…") : t("Start now"),
        onClick: () => void start(),
        disabled: !canStart,
        busy,
        error: error ?? undefined,
        errorTone: !online ? "info" : "error",
      }}
    />
  );
};
