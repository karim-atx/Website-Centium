import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { WaterFillContainer } from "../dashboard/WaterFillContainer";
import { Droplet, Scale, Check } from "lucide-react";

const quickAmounts = [100, 250, 500];
const TODAY = "2026-08-20";

// V4: weight/body fat/steps/sleep/calories burned are now auto-sourced from
// Apple/Android Health and no longer manually loggable — Water is the only
// metric left to quickly add from here (Home's "Add Metric" quick action).
// V8 (QA 8.0): "should not only log water but be able to add weight of that
// day. It should reset if it is a new day" — weight gets its own section,
// pre-filled only if already logged today (weightLoggedDate === TODAY).
// V10 (QA 10.0): both water and weight now log against whichever day is
// selected on Home, not always literal "today".
export const AddMetricSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { water, waterGoalMl, addWater, metricValues, weightLoggedDate, weightByDate, logWeightForToday, selectedDate } =
    useApp();
  const pct = water / waterGoalMl;
  const isToday = selectedDate === TODAY;
  const loggedForDay = weightLoggedDate === selectedDate;
  const dayWeight = weightByDate[selectedDate] ?? (isToday ? metricValues.weight : undefined);
  const [weightDraft, setWeightDraft] = useState(loggedForDay && dayWeight !== undefined ? String(dayWeight) : "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setWeightDraft(loggedForDay && dayWeight !== undefined ? String(dayWeight) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate]);

  const saveWeight = () => {
    const n = Number(weightDraft);
    if (!n || n <= 0) return;
    logWeightForToday(n);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Metric">
      <div className="animate-fade-slide-up">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Water</p>
        <div className="flex items-center gap-4 mb-4">
          <WaterFillContainer pct={pct} height={64} width={40} orientation="vertical" />
          <div>
            <p className="text-2xl font-bold text-charcoal leading-none mb-1">{(water / 1000).toFixed(2)}L</p>
            <p className="text-xs text-charcoal-faint">of {(waterGoalMl / 1000).toFixed(1)}L goal</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-6">
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

        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
          Weight {isToday ? "today" : "for this day"}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2.5 bg-cream-soft rounded-2xl px-4 py-3">
            <Scale size={16} className="text-primary-dark shrink-0" />
            <input
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="e.g. 70"
              inputMode="decimal"
              className="flex-1 bg-transparent text-sm font-semibold text-charcoal placeholder:text-charcoal-faint placeholder:font-normal focus:outline-none"
            />
            <span className="text-xs text-charcoal-faint shrink-0">kg</span>
          </div>
          <button
            onClick={saveWeight}
            disabled={!weightDraft}
            aria-label="Save today's weight"
            className="tap w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            <Check size={16} strokeWidth={3} />
          </button>
        </div>
        <p className="text-[11px] text-charcoal-faint">
          {saved
            ? "Saved — updated in Health."
            : loggedForDay
            ? `Already logged ${isToday ? "today" : "for this day"} — edit and save to update it.`
            : `Not logged yet ${isToday ? "today" : "for this day"}.`}
        </p>

        <p className="text-[11px] text-charcoal-faint mt-5 text-center">
          Body Fat, Steps, Sleep and Calories Burned sync automatically from Apple/Android Health and
          aren't manually editable.
        </p>
      </div>
    </BottomSheet>
  );
};
