import React from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import type { SubscriptionTier } from "../../services/subscription-tiers";
import {
  formatPrice,
  monthlyEquivalent,
  priceLabel,
  savingLabel,
  yearlySaving,
  type BillingPeriod,
  limitLabel,
} from "../../services/subscription-tiers/pricing";

// The plan list, shared by all three account types.
//
// ONE COMPONENT BECAUSE IT IS ONE QUESTION. Clients, professionals and
// businesses all look at the same thing here — every plan, what each costs
// monthly and yearly, what it allows, and which one is theirs — and three
// copies of it were three chances for the prices to drift apart, which is
// exactly what had happened: the client list was hardcoded at $5.99/$49.99
// while the database said $9.99/$99.99.
//
// READ-ONLY, ALL THREE. Nothing here selects a plan, because nothing can buy
// one: subscription_states has no write policy or grant for any client role.
// A control that appeared to change a plan would write localStorage and leave
// the database enforcing the old cap — which is what the professional screen
// was cured of in 9c724ce, and what the other two still did until now.

export const BillingToggle: React.FC<{
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  /** The best saving among the plans shown, so the toggle can advertise it. */
  bestSaving?: number | null;
}> = ({ period, onChange, bestSaving }) => (
  <div className="flex gap-2 mb-5">
    {(["monthly", "yearly"] as BillingPeriod[]).map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        aria-pressed={period === p}
        className={clsx(
          "tap flex-1 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
          period === p ? "bg-primary text-white" : "bg-cream-soft text-charcoal-faint"
        )}
      >
        {p === "monthly" ? "Monthly" : "Yearly"}
        {/* COMPUTED, NOT WRITTEN. This badge read "−15%" on the marketing
            picker and "SAVE 30%" in the app, beside prices that produced
            neither. */}
        {p === "yearly" && bestSaving != null && (
          <span
            className={clsx(
              "text-[10px] font-bold rounded-full px-1.5 py-0.5",
              period === "yearly" ? "bg-white/20 text-white" : "bg-teal text-white"
            )}
          >
            −{bestSaving}%
          </span>
        )}
      </button>
    ))}
  </div>
);


export const PlanRow: React.FC<{
  tier: SubscriptionTier;
  period: BillingPeriod;
  isCurrent: boolean;
  /** Overrides the derived limit line — the business rows say their own thing. */
  detail?: string;
}> = ({ tier, period, isCurrent, detail }) => {
  const saving = yearlySaving(tier.monthlyPrice, tier.yearlyPrice);
  const limit = detail ?? limitLabel(tier);
  return (
    <div
      className={clsx(
        "w-full flex items-center justify-between rounded-2xl px-4 py-4 border-2",
        isCurrent ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
      )}
    >
      <div className="text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-charcoal">{tier.name}</p>
          {isCurrent && (
            <span className="text-[10px] font-bold text-primary-dark bg-white rounded-full px-2 py-0.5">
              CURRENT
            </span>
          )}
          {period === "yearly" && saving && (
            <span className="text-[10px] font-bold text-white bg-teal rounded-full px-2 py-0.5">
              {savingLabel(saving)}
            </span>
          )}
        </div>
        <p className="text-xs text-charcoal-faint">
          {[limit, priceLabel(tier.monthlyPrice, tier.yearlyPrice, period)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {/* A yearly price and a monthly one are not comparable numbers until
            one of them is restated, so the yearly view says what it works out
            to per month. */}
        {period === "yearly" && tier.yearlyPrice != null && tier.monthlyPrice > 0 && (
          <p className="text-[11px] text-charcoal-faint">
            {formatPrice(monthlyEquivalent(tier.yearlyPrice))}/mo, billed yearly
          </p>
        )}
      </div>
      {isCurrent && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

export const PlanSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-2xl border-2 border-charcoal/10 bg-cream-card px-4 py-4">
        <div className="h-3.5 w-24 rounded bg-charcoal/10 mb-2" />
        <div className="h-3 w-40 rounded bg-charcoal/[0.06]" />
      </div>
    ))}
  </>
);
