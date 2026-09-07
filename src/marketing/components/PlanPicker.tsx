import React, { useState } from "react";
import clsx from "clsx";

export interface Plan {
  key: string;
  name: string;
  description: string;
  /** Monthly price in whole dollars — yearly is derived as -20%, rounded. */
  monthly: number;
  unit: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

/** The selectable plan-card grid from the Pricing section (and its preview
 *  on Home): unselected cards share one fixed height and padding — emphasis
 *  on the selected card comes only from `transform: scale()` plus a solid
 *  color tab top and bottom, so the toggle-to-card gap never shifts when
 *  selection changes. Every visual property is derived from the single
 *  `selected` index below so it can never drift between the border, shadow,
 *  scale, tabs, badge and CTA fill on a given card.
 *
 *  Monthly/yearly billing toggle (−20% yearly, placeholder rates pending
 *  real pricing — see each page's own note) sits above the grid and is
 *  shared across all cards via one piece of state, so every price and
 *  billing-note label updates together. */
export const PlanPicker: React.FC<{ plans: Plan[]; defaultSelected?: number; className?: string }> = ({
  plans,
  defaultSelected = 0,
  className,
}) => {
  const [selected, setSelected] = useState(defaultSelected);
  const [yearly, setYearly] = useState(false);

  return (
    <div className={className}>
      <div className="flex justify-center mb-[clamp(52px,6vw,76px)]">
        <div className="inline-flex gap-1 bg-white/[.62] border border-mkt-ink/[.07] rounded-full p-1">
          <button
            onClick={() => setYearly(false)}
            className={clsx(
              "px-5 py-2.5 rounded-full text-[13.5px] font-bold transition-[background-color,color,box-shadow] duration-200",
              !yearly ? "text-white" : "bg-transparent text-mkt-soft"
            )}
            style={!yearly ? { background: "#7D67D9", boxShadow: "0 6px 16px rgba(125,103,217,.28)" } : undefined}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13.5px] font-bold transition-[background-color,color,box-shadow] duration-200",
              yearly ? "text-white" : "bg-transparent text-mkt-soft"
            )}
            style={yearly ? { background: "#7D67D9", boxShadow: "0 6px 16px rgba(125,103,217,.28)" } : undefined}
          >
            Yearly
            <span
              className="text-[10.5px] font-bold tracking-[.04em] px-[7px] py-[3px] rounded-full"
              style={{ background: yearly ? "rgba(255,255,255,.9)" : "rgba(125,103,217,.14)", color: "#6A54C4" }}
            >
              −20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-stretch">
        {plans.map((plan, i) => {
          const isSelected = i === selected;
          const price = yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;
          return (
            <div
              key={plan.key}
              onClick={() => setSelected(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(i)}
              className={clsx(
                // Regression fix: `overflow-hidden` here isn't in the handoff
                // (the card has no `overflow` property at all) and was
                // clipping the top half of the "Explore For" badge, which is
                // deliberately positioned partly outside the card at
                // `top: -11px`.
                "relative rounded-3xl p-[34px] flex flex-col cursor-pointer transition-[border-color,box-shadow,transform]",
                "duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                isSelected ? "scale-[1.09] z-10" : "scale-[.975]"
              )}
              style={{
                background: isSelected
                  ? "linear-gradient(165deg,#FFFFFF 0%,#F8F5FF 58%,#F1F7F5 100%)"
                  : "linear-gradient(165deg,#FFFFFF 0%,#FCFBFE 100%)",
                border: isSelected ? "2px solid #7D67D9" : "1px solid #EDEAE4",
                boxShadow: isSelected
                  ? "0 34px 74px rgba(72,58,130,.2), inset 0 0 0 1px rgba(125,103,217,.22)"
                  : "0 10px 30px rgba(72,58,130,.07)",
              }}
            >
              {isSelected && (
                <>
                  <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-3.5 rounded-t-3xl" style={{ background: "#7D67D9" }} />
                  <span aria-hidden="true" className="absolute left-0 right-0 bottom-0 h-3.5 rounded-b-3xl" style={{ background: "#7D67D9" }} />
                </>
              )}
              <span
                className={clsx(
                  "absolute -top-[11px] left-[34px] text-white font-bold text-[10px] tracking-[.14em] px-[11px] py-[5px] rounded-full whitespace-nowrap",
                  isSelected ? "inline-block" : "hidden"
                )}
                style={{ background: "#7D67D9" }}
              >
                Explore For
              </span>
              <div className="font-bold text-[19px] text-mkt-ink">{plan.name}</div>
              <p className="text-[14.5px] leading-relaxed text-mkt-soft mt-2.5 min-h-[74px]">{plan.description}</p>
              <div className="min-h-16 flex flex-wrap items-end gap-x-1.5 gap-y-0.5 pt-2">
                <span className="font-extrabold text-[clamp(24px,2vw,26px)] tracking-tight leading-[1.1] text-mkt-ink">
                  ${price}
                </span>
                <span className="text-[13.5px] text-mkt-faint pb-[3px] whitespace-nowrap">{plan.unit}</span>
              </div>
              <div className="text-[13px] text-mkt-faint mt-1.5">
                {yearly ? "Billed yearly — 20% off" : "Billed monthly"}
              </div>
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
                className="block text-center py-3.5 rounded-full font-semibold text-[14.5px] mt-auto border transition-colors"
                style={
                  isSelected
                    ? { background: "#5E9E95", borderColor: "#5E9E95", color: "#fff" }
                    : { background: "transparent", borderColor: "#DFDAD2", color: "#221E1A" }
                }
              >
                {plan.ctaLabel}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
