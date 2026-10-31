import React from "react";
import { useBusinessPlanTier } from "./useBusinessPlanTier";
import { BadgeCheck, Banknote, Landmark, Mail, Wallet } from "lucide-react";
import { BizFrame } from "./BizFrame";
import { BizPlanCard, BizRows } from "./ui";
import { ObSectionLabel, ObTip } from "../shell";
import { cashLine, money } from "./lanes";
import type { LaneStepProps } from "./laneTypes";
import { RefundPolicyLink } from "../../../components/legal/RefundPolicyLink";

// OB-232 / 266 / 294: Step 5 · Payments. Cash now (venue_payment_method cash);
// Whish "Soon" and the payout account "Coming soon" (V6-42: no payouts are
// built; each business connects its own Whish later). The Business plan's
// price is ALWAYS read from subscription_tiers (V6-40), never written here.

export const PaymentsStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save }) => {
  const lane = biz.lane ?? "gym";
  const plan = useBusinessPlanTier();
  const price = plan.base ? money(plan.base.monthlyPrice) : plan.loading ? "…" : "–";
  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title="Payments"
      subtitle="How clients pay you. You can add online payments after approval."
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? "Try again" : "Continue",
        onClick: () => biz.cash && onContinue(),
        disabled: !biz.cash,
        busy: save.busy,
        error: !biz.cash ? "Turn on Cash so clients can pay you." /* OURS */ : save.error ?? undefined,
        errorTone: save.offline ? "info" : "error",
      }}
    >
      <ObSectionLabel title="Accepted now" margin="0 2px 12px" />
      <BizRows rows={[{ key: "cash", icon: Banknote, title: "Cash", desc: cashLine(lane), toggle: { on: biz.cash, onChange: (v) => setBiz((b) => ({ ...b, cash: v })) } }]} />
      <ObSectionLabel title="After approval" />
      <BizRows
        rows={[
          { key: "whish", icon: Wallet, title: "Whish", desc: "Online payments when clients book or order", status: "Soon", dim: true },
          { key: "payout", icon: Landmark, title: "Payout account", desc: "Where Whish payments are sent", status: "Coming soon", dim: true },
        ]}
      />
      <ObSectionLabel title="Your Centium plan" />
      <BizPlanCard
        icon={BadgeCheck}
        title="Business plan"
        sub={lane === "store" ? "Add seats when your staff join" /* OURS (COPY: Store seats only once staff are added) */ : "Includes 5 seats for your team"}
        price={price}
        note={plan.error ? "Couldn't load the plan price. It's shown again before you're charged." /* OURS */ : "Plans and payment details are shown before you subscribe." /* Round F (Karim) */}
      />
      <ObTip icon={Mail} margin="4px 0 0">You&apos;ll get an email and a message when online payments open.</ObTip>
      {/* Round F (DN): every place a plan is offered links the policy. */}
      <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: "17px", color: "var(--ob-desc)", textAlign: "center" }}>
        <RefundPolicyLink />
      </p>
    </BizFrame>
  );
};
