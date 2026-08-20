import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { rpeOptions, weightFromRpe } from "../../services/workout";

export const RPECalculator: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [oneRm, setOneRm] = useState("100");
  const [reps, setReps] = useState("5");
  const [rpe, setRpe] = useState(8);

  const suggested = useMemo(() => {
    const rm = Number(oneRm) || 0;
    const r = Number(reps) || 1;
    return weightFromRpe(rm, r, rpe);
  }, [oneRm, reps, rpe]);

  return (
    <BottomSheet open={open} onClose={onClose} title="RPE Calculator">
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Known 1RM (kg)</span>
          <input
            value={oneRm}
            onChange={(e) => setOneRm(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Target reps</span>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Target RPE</span>
          <div className="flex flex-wrap gap-1.5">
            {rpeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(r)}
                className={`tap px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  rpe === r ? "bg-sohati text-white border-sohati" : "bg-cream-soft border-transparent text-charcoal-soft"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-sohati-pale rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-sohati-dark uppercase tracking-wide mb-1">
            Suggested weight
          </p>
          <p className="text-3xl font-bold text-sohati-dark">{suggested} kg</p>
        </div>
      </div>
    </BottomSheet>
  );
};
