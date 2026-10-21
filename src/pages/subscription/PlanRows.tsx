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
// (Batch 2 · CS: the business screen's toggle is the owner's real choice of
// monthly or yearly, written by set_subscription_billing_period; the plan
// rows stay read-only.)

export const BillingToggle: React.FC<{
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  /** The best saving among the plans shown, so the toggle can advertise it. */
  bestSaving?: number | null;
  /**
   * Batch 2 · CS (business owner): a line under each label (that period's
   * price), and periods that can't be chosen. Unset: unchanged.
   */
  notes?: Partial<Record<BillingPeriod, string>>;
  disabled?: Partial<Record<BillingPeriod, boolean>>;
  /** The group's accessible name when the toggle is a real choice. */
  label?: string;
}> = ({ period, onChange, bestSaving, notes, disabled, label }) => (
  <div className="flex gap-2 mb-5" role={label ? "group" : undefined} aria-label={label}>
    {(["monthly", "yearly"] as BillingPeriod[]).map((p) => (
      <button
        key={p}
        type="button"
        onClick={() => onChange(p)}
        aria-pressed={period === p}
        disabled={disabled?.[p]}
        className={clsx(
          "tap flex-1 min-h-[44px] rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
          notes && "flex-col !gap-0.5",
          period === p ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-faint"
        )}
      >
        {p === "monthly" ? "Monthly" : "Yearly"}
        {notes?.[p] && <span className="text-[11px] font-semibold opacity-90">{notes[p]}</span>}
        {/* COMPUTED, NOT WRITTEN. This badge read "−15%" on the marketing
            picker and "SAVE 30%" in the app, beside prices that produced
            neither. */}
        {p === "yearly" && bestSaving != null && (
          <span
            className={clsx(
              "text-[10px] font-bold rounded-full px-1.5 py-0.5",
              // On the selected pill: white/20 in light mode (the board's); dark
              // mode inverts (its ink on primary-fill read 3.15:1 through white/20).
              period === "yearly" ? "bg-on-primary-fill/20 text-on-primary-fill dark:bg-on-primary-fill dark:text-primary-fill" : "bg-teal-fill text-on-primary-fill"
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
  /**
   * Batch 2 · CS: the price as subscription_price_for answered it ("$29/mo",
   * "Not available"), instead of priceLabel from the tier columns.
   */
  priceText?: string;
  /**
   * Batch 2 · CS: the two prices the saving badge and the per-month
   * restatement are computed from (the business screen passes
   * subscription_price_for's answers). Null while they load or failed: no
   * comparison. A NULL price on either side: no saving. Unset: the tier's own
   * columns, unchanged.
   */
  periodPrices?: { monthly: number | null; yearly: number | null } | null;
}> = ({ tier, period, isCurrent, detail, priceText, periodPrices }) => {
  const monthly = periodPrices === undefined ? tier.monthlyPrice : (periodPrices?.monthly ?? null);
  const yearly = periodPrices === undefined ? tier.yearlyPrice : (periodPrices?.yearly ?? null);
  const saving = monthly != null && yearly != null ? yearlySaving(monthly, yearly) : null;
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
            <span className="text-[10px] font-bold text-primary-dark bg-white dark:bg-cream-card rounded-full px-2 py-0.5">
              CURRENT
            </span>
          )}
          {period === "yearly" && saving && (
            <span className="text-[10px] font-bold text-on-primary-fill bg-teal-fill rounded-full px-2 py-0.5">
              {savingLabel(saving)}
            </span>
          )}
        </div>
        <p className="text-xs text-charcoal-faint">
          {[limit, priceText ?? priceLabel(tier.monthlyPrice, tier.yearlyPrice, period)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {/* A yearly price and a monthly one are not comparable numbers until
            one of them is restated, so the yearly view says what it works out
            to per month. */}
        {period === "yearly" && yearly != null && monthly != null && monthly > 0 && (
          <p className="text-[11px] text-charcoal-faint">
            {formatPrice(monthlyEquivalent(yearly))}/mo, billed yearly
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
