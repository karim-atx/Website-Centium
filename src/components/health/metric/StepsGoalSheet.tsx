import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { textPx, linePx } from "../../../theme/textSize";
import { PINNED_FILL_STYLE, metricTextInk, useHealthMode } from "./MetricKit";

// HE1.2.1 "Step goal": the shared Part B log sheet shell (lavender header
// with ×, pinned Save), measured from HE1.2.1.png: "Daily goal" 12.5/18.8
// 600 #5B5349; the goal 48/52 800 (cap 386.5-421.5); "steps a day · today
// 6,842 (68%)" 12.5/18.8 600 in the Steps ink; chips 36 tall r9999, gap 8,
// #F0EDF9 + 0.5px #CFC7EA, 12.5/18.8 700 #5F5093, selected #A79AD5 white;
// Custom on its own row; hint 12/18 400 #8C8378; wheel 1,000 to 40,000 step
// 500, band 120 x 40. Save → setStepsGoal (B1 metric_goals, with the
// device copy kept in step; PB-H-06 / V6-59), close, toast "Step goal saved" (the page).

const CHIPS = [6000, 8000, 10000, 12000];
const OPTIONS: WheelOption<number>[] = Array.from({ length: (40000 - 1000) / 500 + 1 }, (_, i) => {
  const v = 1000 + i * 500;
  return { value: v, label: v.toLocaleString("en-GB") };
});

export const StepsGoalSheet: React.FC<{ open: boolean; goal: number; todaySteps: number | null; onClose: () => void; onSave: (goal: number) => void }> = ({
  open,
  goal,
  todaySteps,
  onClose,
  onSave,
}) => {
  const { dark } = useHealthMode();
  const [value, setValue] = useState(goal);
  const [custom, setCustom] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setValue(goal);
    setCustom(!CHIPS.includes(goal));
  } else if (!open && wasOpen) setWasOpen(false);

  const chip = (on: boolean): React.CSSProperties => ({
    height: 36,
    padding: "0 14px",
    borderRadius: 9999,
    fontSize: textPx(12.5),
    lineHeight: linePx(18.8),
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    border: on ? "none" : `0.5px solid ${dark ? "rgb(var(--c-primary-fill) / 0.5)" : "#CFC7EA"}`,
    color: on ? "rgb(var(--c-on-primary-fill))" : undefined,
  });
  const chipClass = (on: boolean) => `tap ${on ? "bg-seg-active" : "bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text"}`;
  const pct = todaySteps !== null ? Math.round((todaySteps / value) * 100) : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Step goal"
      chrome="partB"
      footerBottom={30}
      footer={<CtaButton label="Save" onClick={() => onSave(value)} style={PINNED_FILL_STYLE} />}
    >
      <div className="flex flex-col items-center text-center">
        <p style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Daily goal</p>
        <p data-goal-value style={{ marginTop: 2, fontSize: 48, lineHeight: "52px", fontWeight: 800, letterSpacing: -1.6, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>
          {value.toLocaleString("en-GB")}
        </p>
        <p style={{ marginTop: 2, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: metricTextInk("steps", dark) }}>
          {todaySteps !== null ? `steps a day · today ${todaySteps.toLocaleString("en-GB")} (${pct}%)` : "steps a day"}
        </p>
        <div role="radiogroup" aria-label="Daily step goal" className="flex flex-wrap justify-center" style={{ marginTop: 16, gap: 8 }}>
          {CHIPS.map((c) => {
            const on = !custom && value === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                className={chipClass(on)}
                style={chip(on)}
                onClick={() => {
                  setCustom(false);
                  setValue(c);
                }}
              >
                {c.toLocaleString("en-GB")}
              </button>
            );
          })}
        </div>
        <button type="button" role="radio" aria-checked={custom} className={chipClass(custom)} style={{ ...chip(custom), marginTop: 8 }} onClick={() => setCustom(true)}>
          Custom
        </button>
        {!custom && (
          <p style={{ marginTop: 14, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>Custom opens a wheel in steps of 500.</p>
        )}
        {custom && (
          <div style={{ marginTop: 16, width: "100%" }}>
            <WheelPicker variant="partB" columns={[{ label: "Daily step goal", options: OPTIONS, value, bandWidth: 120, onChange: (v) => setValue(Number(v)) }]} />
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
