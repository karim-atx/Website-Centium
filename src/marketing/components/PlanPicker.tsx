import React, { useState } from "react";
import clsx from "clsx";

export interface Plan {
  key: string;
  badge: string;
  name: string;
  description: string;
  priceLabel: string;
  billingNote: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

/** The selectable plan-card grid from the hi-fi Pricing section (and its
 *  preview on Home): unselected cards share one fixed height; the selected
 *  card scales up, gains a lavender border/shadow/badge and a filled CTA.
 *  Every visual property is derived from the single `selected` index below
 *  so it can never drift between the border, shadow, scale, badge and CTA
 *  fill on a given card (the bug the original hi-fi mock hit and fixed). */
export const PlanPicker: React.FC<{ plans: Plan[]; defaultSelected?: number }> = ({ plans, defaultSelected = 0 }) => {
  const [selected, setSelected] = useState(defaultSelected);

  return (
    <div className="grid lg:grid-cols-3 gap-5 items-stretch">
      {plans.map((plan, i) => {
        const isSelected = i === selected;
        return (
          <div
            key={plan.key}
            onClick={() => setSelected(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(i)}
            className={clsx(
              "relative rounded-3xl bg-white p-[34px] flex flex-col cursor-pointer transition-[border-color,box-shadow,transform]",
              "duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              isSelected ? "border border-mkt-accent-ring shadow-[0_24px_60px_rgba(72,58,130,.10)] scale-[1.045] z-10" : "border border-mkt-line"
            )}
          >
            <span
              className={clsx(
                "absolute -top-[11px] left-[34px] bg-mkt-accent text-white font-bold text-[10px] tracking-[.14em] px-[11px] py-[5px] rounded-full",
                isSelected ? "inline-block" : "hidden"
              )}
            >
              {plan.badge}
            </span>
            <div className="font-bold text-[19px] text-mkt-ink">{plan.name}</div>
            <p className="text-[14.5px] leading-relaxed text-mkt-soft mt-2.5 min-h-[74px]">{plan.description}</p>
            <div className="font-extrabold text-2xl sm:text-[26px] tracking-tight leading-tight min-h-16 flex items-end text-mkt-ink">
              {plan.priceLabel}
            </div>
            <div className="text-[13px] text-mkt-faint mt-1.5">{plan.billingNote}</div>
            <div className="flex flex-col gap-[11px] my-[26px] min-h-[112px]">
              {plan.features.map((f) => (
                <span key={f} className="text-[14.5px] text-mkt-ink/85">
                  {f}
                </span>
              ))}
            </div>
            <a
              href={plan.ctaHref}
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                "block text-center py-3.5 rounded-full font-semibold text-[14.5px] mt-auto border transition-colors",
                isSelected ? "bg-mkt-accent border-mkt-accent text-white" : "bg-transparent border-[#DFDAD2] text-mkt-ink"
              )}
            >
              {plan.ctaLabel}
            </a>
          </div>
        );
      })}
    </div>
  );
};
