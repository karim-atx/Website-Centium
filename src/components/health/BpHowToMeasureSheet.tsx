import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { BP_HOW_TO_MEASURE_STEPS, BP_HOW_TO_MEASURE_TITLE, BP_WHY_ARM_AND_POSITION } from "../../services/blood-pressure/guidance";
import { textPx, linePx } from "../../theme/textSize";
import { useHealthMode } from "./metric/MetricKit";

/**
 * OURS-health-bp-how-to-measure: the repo's AHA measuring steps in the Part B
 * sheet shell, no Save. Steps 12.5/18.8 400 #241F1B with numbers 12.5/18.8
 * 800 #7D3B62 (dark: the BP dark main #B17598), gap 10; the why note 11.5/17.3
 * 400 #8C8378 in a #FAFAFB r18 card (dark #262932). Copy verbatim from
 * services/blood-pressure/guidance.ts.
 */
export const BpHowToMeasureSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { dark } = useHealthMode();
  return (
    <BottomSheet open={open} onClose={onClose} title={BP_HOW_TO_MEASURE_TITLE} chrome="partB">
      <ol className="flex flex-col" style={{ gap: 10 }}>
        {BP_HOW_TO_MEASURE_STEPS.map((step, i) => (
          <li key={step} className="flex" style={{ gap: 8, fontSize: textPx(12.5), lineHeight: linePx(18.8) }}>
            <span className="shrink-0 tabular-nums" style={{ fontWeight: 800, color: dark ? "rgb(var(--metric-blood-pressure-main))" : "rgb(var(--metric-blood-pressure-ink))", minWidth: 14 }}>
              {i + 1}
            </span>
            <span style={{ fontWeight: 400, color: "rgb(var(--c-charcoal))" }}>{step}</span>
          </li>
        ))}
      </ol>
      <p
        style={{
          marginTop: 14,
          marginBottom: 8,
          borderRadius: 18,
          padding: 14,
          background: dark ? "#262932" : "#FAFAFB",
          fontSize: textPx(11.5),
          lineHeight: linePx(17.3),
          fontWeight: 400,
          color: "rgb(var(--c-charcoal-faint))",
        }}
      >
        {BP_WHY_ARM_AND_POSITION}
      </p>
    </BottomSheet>
  );
};
