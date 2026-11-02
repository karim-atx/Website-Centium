import React from "react";
import { TrendingUp } from "lucide-react";
import { usePremium } from "../../../../services/premium/hooks";
import { askLocked, useG3 } from "../../../premium/g3/useG3";
import { PremiumLabel } from "../../../premium/PremiumAskHost";
import { fetchBiomarkerTrend } from "../../../../services/premium/g3Calls";
import { g3On, trendKey, trendLocked, trendResults, type MarkerStatus } from "../../../../services/premium/g3";
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
  if (!trendLocked(premium, results)) return <>{children}</>;
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

/**
 * The chart's results: with the switch on and Premium, the trend reader's
 * points (oldest first) lined up with the page's own results; otherwise the
 * page's results as today.
 */
export function useTrendResults<R extends { id: string; panelId: string | null; date: string; value: number; unit: string; status: MarkerStatus }>(
  marker: { markerKey?: string | null; name: string },
  results: R[]
): R[] {
  const { premium } = usePremium();
  const key = trendKey(marker);
  const on = g3On(premium) && !!premium?.premium && results.length > 1;
  const { state } = useG3(() => fetchBiomarkerTrend(key), `trend:${key}:${results.length}`, on);
  if (!on || state.kind !== "ready" || state.value.length === 0) return results;
  return trendResults(state.value, results);
}
