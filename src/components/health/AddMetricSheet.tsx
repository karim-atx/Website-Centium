import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { WaterFillContainer } from "../dashboard/WaterFillContainer";
import { Droplet } from "lucide-react";

const quickAmounts = [100, 250, 500];

// V4: weight/body fat/steps/sleep/calories burned are now auto-sourced from
// Apple/Android Health and no longer manually loggable — Water is the only
// metric left to quickly add from here (Home's "Add Metric" quick action).
export const AddMetricSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { water, waterGoalMl, addWater } = useApp();
  const pct = water / waterGoalMl;

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Water">
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <WaterFillContainer pct={pct} height={64} width={40} orientation="vertical" />
          <div>
            <p className="text-2xl font-bold text-charcoal leading-none mb-1">{(water / 1000).toFixed(2)}L</p>
            <p className="text-xs text-charcoal-faint">of {(waterGoalMl / 1000).toFixed(1)}L goal</p>
          </div>
        </div>

        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Add</p>
        <div className="grid grid-cols-3 gap-2.5">
          {quickAmounts.map((ml) => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-4 bg-sky-pale text-sky"
            >
              <Droplet size={18} />
              <span className="text-xs font-semibold">+{ml}ml</span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-charcoal-faint mt-5 text-center">
          Body Fat, Steps, Sleep and Calories Burned sync automatically from Apple/Android Health and
          aren't manually editable.
        </p>
      </div>
    </BottomSheet>
  );
};
