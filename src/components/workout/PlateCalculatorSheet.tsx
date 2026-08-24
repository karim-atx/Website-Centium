import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import clsx from "clsx";

const BAR_KG = 20;
const COLLARS_KG = 2.5; // per side, 2.5kg each -> 5kg total
const IPF_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const KG_TO_LB = 2.20462;

// Greedy per-side plate breakdown from the standard IPF powerlifting set.
function plateBreakdown(perSideKg: number) {
  let remaining = perSideKg;
  const plates: { kg: number; count: number }[] = [];
  for (const plate of IPF_PLATES_KG) {
    const count = Math.floor(remaining / plate + 1e-6);
    if (count > 0) {
      plates.push({ kg: plate, count });
      remaining = +(remaining - count * plate).toFixed(2);
    }
  }
  return { plates, remainderKg: remaining };
}

export const PlateCalculatorSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [targetDraft, setTargetDraft] = useState("100");
  const [pct, setPct] = useState(100);

  const targetInput = Number(targetDraft) || 0;
  const targetKg = unit === "kg" ? targetInput : targetInput / KG_TO_LB;
  const workingKg = (targetKg * pct) / 100;
  const perSideKg = Math.max(0, (workingKg - BAR_KG - 2 * COLLARS_KG) / 2);
  const { plates, remainderKg } = plateBreakdown(perSideKg);

  const displayKg = (kg: number) => (unit === "kg" ? kg : +(kg * KG_TO_LB).toFixed(1));

  return (
    <BottomSheet open={open} onClose={onClose} title="Plate Calculator">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit">
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={clsx(
                "tap px-4 py-1.5 rounded-full text-xs font-bold uppercase",
                unit === u ? "bg-sohati text-white" : "text-charcoal-faint"
              )}
            >
              {u}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Target weight ({unit})
          </span>
          <input
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-lg font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-charcoal-soft">Percentage</span>
            <span className="text-xs text-charcoal-faint">{pct}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="text-center bg-sohati-pale rounded-2xl py-4">
          <p className="text-3xl font-bold text-sohati-dark">
            {displayKg(workingKg).toLocaleString()} {unit}
          </p>
          <p className="text-xs text-sohati-dark/70 mt-1">
            {pct}% of {displayKg(targetKg).toLocaleString()} {unit}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Per side (IPF plates, {BAR_KG}kg bar + {COLLARS_KG * 2}kg collars)
          </p>
          {plates.length === 0 ? (
            <p className="text-sm text-charcoal-faint">
              Working weight is at or below the bar + collars — no plates needed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plates.map((p) => (
                <span
                  key={p.kg}
                  className="flex items-center gap-1.5 rounded-xl bg-cream-soft px-3 py-2 text-sm font-semibold text-charcoal"
                >
                  {p.kg}kg <span className="text-charcoal-faint">× {p.count}</span>
                </span>
              ))}
            </div>
          )}
          {remainderKg > 0.01 && (
            <p className="text-xs text-ember-dark mt-2">
              {remainderKg.toFixed(2)}kg per side can't be made exactly with standard IPF plates.
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
