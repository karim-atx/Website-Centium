import React from "react";
import { TrendingUp } from "lucide-react";
import { usePremium } from "../../../../services/premium/hooks";
import { askLocked, useG3Available } from "../../../premium/g3/useG3";
import { PremiumLabel } from "../../../premium/PremiumAskHost";
import { trendLocked } from "../../../../services/premium/g3";
import { t } from "../../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · biomarker trends (decision G5). With the switch on and no
// Premium, a marker's trend (the chart and its stats) is Premium: the card
// below takes its place, with the label and the prompt. Typing lab values
// stays free, and a single reading stays visible. With Premium the trend is
// read through my_biomarker_trend(). With the switch off (or loading),
// today's chart is untouched.

/** The trend view, or the Premium card in its place. */
export function TrendGate({ results, children, className = "" }: { results: number; children: React.ReactNode; className?: string }) {
  const { premium } = usePremium();
  // A Database without G3 keeps today's chart too.
  const available = useG3Available();
  if (!available || !trendLocked(premium, results)) return <>{children}</>;
  return (
    <button
      type="button"
      data-g3="biomarker-trend"
      onClick={() => askLocked("biomarker_trends")}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <TrendingUp size={17} aria-hidden className="shrink-0 text-primary-deep-text" />
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold text-charcoal">{t("Biomarker trends")}</span>
        <span className="block text-[11.5px] leading-[16px] text-charcoal-faint">{t("See how this marker has changed over time. Your latest reading stays here, and adding results is free.")}</span>
      </span>
      <PremiumLabel className="shrink-0" />
    </button>
  );
}
