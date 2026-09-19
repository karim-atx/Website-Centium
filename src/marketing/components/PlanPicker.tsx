import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

export interface Plan {
  key: string;
  name: string;
  description: string;
  /** Monthly price in whole/decimal dollars. */
  monthly: number;
  /** Monthly billing-unit label, e.g. "per month" or "per month + rev share". */
  unit: string;
  /** Literal discounted annual total (v5 handoff: −15%, e.g. 149/99/799) —
   *  NOT derived from `monthly` at runtime. $15×12×0.85 = $153, not the
   *  handoff's $149, so these figures must come from the data, verbatim. */
  yearlyPrice: number;
  /** Yearly billing-unit label, e.g. "/ yr" or "/ yr + rev share". */
  yearlyUnit: string;
  /** Optional lead-in shown before the price (Professionals only: "Starting at"). */
  prefix?: string;
  features: string[];
  ctaLabel: string;
  /** @deprecated Unused — the v5 handoff hardcodes CTA destination off
   *  `key === "business"` (Contact vs. scroll-to-`#cta`), not a per-plan
   *  href. Kept optional so existing data isn't forced to drop the field. */
  ctaHref?: string;
}

/** The selectable plan-card grid from the Pricing section (and its preview
 *  on Home): unselected cards share one fixed height and padding — emphasis
 *  on the selected card comes only from `transform: scale()` plus the
 *  tinted gradient/border/badge, so the toggle-to-card gap never shifts when
 *  selection changes. Every visual property is derived from the single
 *  `selected` index below so it can never drift between the border, shadow,
 *  scale, badge and CTA fill on a given card.
 *
 *  Monthly/yearly billing toggle (−15% yearly, literal annual totals from
 *  `plan.yearlyPrice`) sits above the grid and is shared across all cards
 *  via one piece of state, so every price and billing-note label updates
 *  together.
 *
 *  CTA behavior (v5 handoff, `.dc.html` `planCards` renderer): the Business
 *  plan is a sales conversation, so its CTA opens the Contact route; the two
 *  self-serve plans (Professionals, General Users) scroll down to the page's
 *  own final CTA section instead. This is keyed off `plan.key === "business"`
 *  rather than any per-plan href in the data, matching the handoff exactly. */
export const PlanPicker: React.FC<{ plans: Plan[]; defaultSelected?: number; className?: string }> = ({
  plans,
  defaultSelected = 0,
  className,
}) => {
  const [selected, setSelected] = useState(defaultSelected);
  const [yearly, setYearly] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // `.dc.html` `_centrePlanOrphan()`: the desktop/tablet grid is a fluid
  // `repeat(auto-fit,minmax(min(280px,100%),1fr))` track list. Three cards in
  // a track list that resolves to exactly two columns leave the third card
  // alone on row 2, hugging the left edge — auto-fit can't centre an orphan
  // on its own. When the grid resolves to exactly two tracks, span the last
  // card across both and centre it at one track's width; any other track
  // count (1 or 3) clears the override so 3-up/stacked layouts are untouched.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const apply = () => {
      const cards = Array.from(grid.children) as HTMLElement[];
      if (cards.length !== 3) return;
      const tracks = getComputedStyle(grid)
        .gridTemplateColumns.split(" ")
        .filter((t) => parseFloat(t) > 1);
      const last = cards[2];
      if (tracks.length === 2) {
        last.style.gridColumn = "1 / -1";
        last.style.justifySelf = "center";
        last.style.width = tracks[0];
      } else {
        last.style.gridColumn = "";
        last.style.justifySelf = "";
        last.style.width = "";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    let ro: ResizeObserver | undefined;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(apply);
      ro.observe(grid);
    }
    return () => {
      window.removeEventListener("resize", apply);
      ro?.disconnect();
    };
  }, [plans]);

  const renderCard = (plan: Plan, i: number, narrow: boolean) => {
    const isSelected = i === selected;
    const isBusiness = plan.key === "business";
    const price = yearly ? plan.yearlyPrice : plan.monthly;
    const unit = yearly ? plan.yearlyUnit : plan.unit;

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
          "relative rounded-3xl p-[34px] flex flex-col cursor-pointer min-w-0 transition-[border-color,box-shadow,transform]",
          "duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          !narrow && (isSelected ? "scale-[1.09] z-10" : "scale-[.975]")
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
        <p className={clsx("text-[14.5px] leading-relaxed text-mkt-soft mt-2.5", !narrow && "min-h-[74px]")}>
          {plan.description}
        </p>
        <div className={clsx("flex flex-wrap items-end gap-x-1.5 gap-y-0.5 pt-2", !narrow && "min-h-16")}>
          {plan.prefix && (
            <span className="text-[13.5px] text-mkt-faint pb-[3px] whitespace-nowrap">{plan.prefix}</span>
          )}
          <span className="font-extrabold text-[clamp(24px,2vw,26px)] tracking-[-0.01em] leading-[1.1] text-mkt-ink">
            ${price}
          </span>
          <span className="text-[13.5px] text-mkt-faint pb-[3px] whitespace-nowrap">{unit}</span>
        </div>
        <div className="text-[13px] text-mkt-faint mt-1.5">
          {yearly ? "Billed yearly — 15% off" : "Billed monthly"}
        </div>
        <div className={clsx("flex flex-col gap-[11px] my-[26px]", !narrow && "min-h-[112px]")}>
          {plan.features.map((f) => (
            <span key={f} className="text-[14.5px] text-mkt-ink/85">
              {f}
            </span>
          ))}
        </div>
        <Link
          to={isBusiness ? "/contact" : "/#cta"}
          onClick={(e) => e.stopPropagation()}
          className="block text-center py-3.5 rounded-full font-semibold text-[14.5px] mt-auto border transition-colors duration-200"
          style={
            isSelected
              ? { background: "#5E9E95", borderColor: "#5E9E95", color: "#fff" }
              : { background: "transparent", borderColor: "#DFDAD2", color: "#221E1A" }
          }
        >
          {plan.ctaLabel}
        </Link>
      </div>
    );
  };

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
              −15%
            </span>
          </button>
        </div>
      </div>

      {/* ≥640px: the fluid 3-up grid — `repeat(auto-fit,minmax(min(280px,100%),1fr))`
         is the handoff's own literal formula, not `grid-cols-3`, so the section
         can resolve to 1, 2 or 3 tracks depending on available width before the
         640px collapse below ever applies. */}
      <div
        ref={gridRef}
        className="hidden sm:grid gap-5 items-stretch"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))" }}
      >
        {plans.map((plan, i) => renderCard(plan, i, false))}
      </div>

      {/* Below 640px: three cards stacked ran 1481px — 2.3 screens — of the
         page, so the handoff collapses them into a plan switcher: a segmented
         tab row plus only the selected plan's card. Rendering just the one
         card (rather than hiding the other two with CSS) is deliberate — a
         hidden-but-mounted card would still occupy a track in an
         `auto-fit`/`max-content` grid and could overflow the container, per
         the handoff's own "Gotchas" note on that exact failure mode. */}
      <div className="sm:hidden">
        <div
          className="grid grid-cols-3 gap-1 bg-white/[.62] border border-mkt-ink/[.07] rounded-full p-1 mb-[22px]"
        >
          {plans.map((plan, i) => (
            <button
              key={plan.key}
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
              className="min-h-10 min-w-0 px-1.5 py-2 rounded-full text-[12.5px] font-bold leading-tight [overflow-wrap:anywhere] transition-[background-color,color,box-shadow] duration-200"
              style={
                i === selected
                  ? { background: "#7D67D9", color: "#fff", boxShadow: "0 6px 16px rgba(125,103,217,.28)" }
                  : { background: "transparent", color: "#5B5349" }
              }
            >
              {plan.name}
            </button>
          ))}
        </div>
        {renderCard(plans[selected], selected, true)}
      </div>
    </div>
  );
};
