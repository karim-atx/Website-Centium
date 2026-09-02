import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { WaterFillContainer } from "../dashboard/WaterFillContainer";
import { useApp } from "../../context/AppContext";
import { Droplet } from "lucide-react";

// V4: "Pressing on the water widget should indicate only water details
// instead of showing the add metric pop-up" — its own sheet with a goal
// slider and a total-consumed slider (water is the one metric that stays
// user-editable; the rest are auto-sourced from Apple/Android Health).
export const WaterDetailSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { water, waterGoalMl, setWaterAmount, setWaterGoal } = useApp();
  const [goalDraft, setGoalDraft] = useState(waterGoalMl);
  const [amountDraft, setAmountDraft] = useState(water);

  const pct = amountDraft / goalDraft;
  const exceeded = pct > 1;

  return (
    <BottomSheet open={open} onClose={onClose} title="Water">
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <WaterFillContainer pct={pct} height={90} width={54} orientation="vertical" />
          <div>
            <p className="text-3xl font-bold text-charcoal leading-none mb-1">
              {(amountDraft / 1000).toFixed(2)}L
            </p>
            <p className="text-xs text-charcoal-faint">of {(goalDraft / 1000).toFixed(1)}L goal</p>
            <p className={`text-xs font-semibold mt-1 ${exceeded ? "text-gold" : "text-sky"}`}>
              {Math.round(pct * 100)}% today
            </p>
          </div>
        </div>

        {exceeded && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold-pale rounded-full px-3 py-1.5 w-fit mb-5 animate-fade-slide-up">
            🎉 Goal exceeded — great hydration today!
          </p>
        )}

        <label className="block mb-5">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 flex items-center gap-1.5">
            <Droplet size={12} /> Consumed today
          </span>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={amountDraft}
            onChange={(e) => {
              const v = Number(e.target.value);
              setAmountDraft(v);
              setWaterAmount(v);
            }}
            className="w-full"
            style={{ accentColor: "rgb(var(--c-sky))" }}
          />
          <p className="text-xs text-charcoal-faint mt-1">{(amountDraft / 1000).toFixed(1)}L</p>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Daily goal</span>
          <input
            type="range"
            min={1000}
            max={5000}
            step={100}
            value={goalDraft}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGoalDraft(v);
              setWaterGoal(v);
            }}
            className="w-full"
            style={{ accentColor: "rgb(var(--c-sky))" }}
          />
          <p className="text-xs text-charcoal-faint mt-1">{(goalDraft / 1000).toFixed(1)}L / day</p>
        </label>
      </div>
    </BottomSheet>
  );
};
