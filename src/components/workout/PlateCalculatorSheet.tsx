import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Minus, Plus, AlertTriangle } from "lucide-react";
import clsx from "clsx";

const BAR_OPTIONS: { value: "20" | "15" | "other"; label: string; kg?: number }[] = [
  { value: "20", label: "20kg", kg: 20 },
  { value: "15", label: "15kg", kg: 15 },
  { value: "other", label: "Other" },
];
const IPF_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const KG_TO_LB = 2.20462;

// V10 (QA 10.0) / Design refinement §6.9b: IPF powerlifting plate colours
// — kept verbatim, the problem was geometry, not colour. Real calibrated
// steel diameters (→ px height) and thicknesses scaled 2.2× against them
// (→ px width) so the loadout reads by silhouette, not just a colour key.
const PLATE_SPEC: Record<number, { color: string; height: number; width: number; textColor: string | null }> = {
  25: { color: "#C0392B", height: 92, width: 29, textColor: "#FFFFFF" },
  20: { color: "#2E5F8A", height: 92, width: 24, textColor: "#FFFFFF" },
  15: { color: "#D9A441", height: 82, width: 22, textColor: "#3F2A08" },
  10: { color: "#3F9165", height: 66, width: 19, textColor: "#FFFFFF" },
  5: { color: "#E8E4DA", height: 47, width: 14, textColor: "#4A443A" },
  2.5: { color: "#2A2622", height: 39, width: 12, textColor: null },
  1.25: { color: "#8A8478", height: 33, width: 10, textColor: null },
};
const COLLAR_COLOR = "#B9BEC4"; // silver

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
  const [barChoice, setBarChoice] = useState<"20" | "15" | "other">("20");
  const [customBarDraft, setCustomBarDraft] = useState("10");
  // Design refinement §6.9b: "Collars become a three-way mutually-exclusive
  // selector: 5kg/2.5kg/None... default to 2.5kg — that is what makes the
  // default 100kg loadout 25+10+2.5+1.25 and puts all four plate sizes,
  // including the grey 1.25kg, in play."
  const [plateCollar, setPlateCollar] = useState<5 | 2.5 | 0>(2.5);

  const barKg = barChoice === "other" ? Number(customBarDraft) || 0 : BAR_OPTIONS.find((b) => b.value === barChoice)!.kg!;
  // §6.9b: the selector stores the collar PAIR mass (5|2.5|0) — per-side is
  // half of that. 100kg with the default 2.5kg pair → 38.75kg/side →
  // 25+10+2.5+1.25, every plate size in play; 101kg → 39.25kg/side, the
  // doc's canonical case where 0.50kg/side can't be made.
  const collarsPairKg = plateCollar;

  const targetInput = Number(targetDraft) || 0;
  const targetKg = unit === "kg" ? targetInput : targetInput / KG_TO_LB;
  const workingKg = (targetKg * pct) / 100;
  const perSideKg = Math.max(0, (workingKg - barKg - collarsPairKg) / 2);
  const { plates, remainderKg } = plateBreakdown(perSideKg);

  const displayKg = (kg: number) => (unit === "kg" ? kg : +(kg * KG_TO_LB).toFixed(1));

  // §6.9b: "±1kg stepper (40px square buttons, clamped 20-300kg)."
  const stepTarget = (delta: number) => {
    const current = Number(targetDraft) || 0;
    const next = Math.max(20, Math.min(300, current + delta));
    setTargetDraft(String(next));
  };

  const collarHeight = plateCollar === 5 ? 34 : plateCollar === 2.5 ? 26 : 0;

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
                unit === u ? "bg-primary text-white" : "text-charcoal-faint"
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepTarget(-1)}
              aria-label="Decrease target by 1"
              className="tap shrink-0 w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center text-charcoal"
            >
              <Minus size={14} />
            </button>
            <input
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/[0.07] px-3 py-2.5 text-lg font-bold text-charcoal text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => stepTarget(1)}
              aria-label="Increase target by 1"
              className="tap shrink-0 w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center text-charcoal"
            >
              <Plus size={14} />
            </button>
          </div>
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Bar</span>
          <div className="flex gap-2 mb-2">
            {BAR_OPTIONS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBarChoice(b.value)}
                className={clsx(
                  "tap rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors",
                  barChoice === b.value
                    ? "bg-primary text-white border-primary"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          {barChoice === "other" && (
            <input
              value={customBarDraft}
              onChange={(e) => setCustomBarDraft(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="Bar weight (kg)"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/[0.07] px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
        </div>

        {/* §6.9b: "Collars become a three-way mutually-exclusive selector." */}
        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Collars (per side)</span>
          <div className="flex gap-2">
            {[5, 2.5, 0].map((c) => (
              <button
                key={c}
                onClick={() => setPlateCollar(c as 5 | 2.5 | 0)}
                className={clsx(
                  "tap flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                  plateCollar === c
                    ? "bg-primary text-white border-primary"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {c === 0 ? "None" : `${c} kg`}
              </button>
            ))}
          </div>
        </div>

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

        <div className="text-center bg-primary-pale rounded-2xl py-4">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-[34px] font-extrabold text-primary-deep-text leading-none tracking-[-0.035em] tabular-nums">
                {displayKg(workingKg).toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-primary-deep-text/70 mt-1 uppercase tracking-wide">Working ({unit})</p>
            </div>
            <div>
              <p className="text-[22px] font-extrabold text-primary-deep-text leading-none tracking-[-0.03em] tabular-nums">
                {displayKg(perSideKg).toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-primary-deep-text/70 mt-1 uppercase tracking-wide">Per side ({unit})</p>
            </div>
          </div>
          <p className="text-xs text-primary-deep-text/70 mt-2">
            {pct}% of {displayKg(targetKg).toLocaleString()} {unit}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-medium text-charcoal-faint mb-2">
            {barKg}kg bar{collarsPairKg > 0 ? ` + ${collarsPairKg}kg collars` : ""} + {displayKg(perSideKg * 2).toLocaleString()}
            {unit} plates
          </p>
          {plates.length === 0 ? (
            <p className="text-sm text-charcoal-faint">
              Working weight is at or below the bar + collars — no plates needed.
            </p>
          ) : (
            <>
              {/* Design refinement §6.9b: one sleeve, bar centre at LEFT →
                  sleeve end at RIGHT. Heaviest plate seats against the
                  shoulder; the collar clamps outside the stack. */}
              <div className="flex items-center overflow-x-auto no-scrollbar pb-1" style={{ height: 104 }}>
                {/* shaft stub — runs off the left edge, representing the
                    bar continuing to its centre. */}
                <div
                  className="shrink-0"
                  style={{
                    width: 34,
                    height: 6,
                    borderRadius: "0 3px 3px 0",
                    background: "linear-gradient(180deg, #D8D4CD, #B9BEC4 45%, #9AA0A6)",
                  }}
                />
                {/* inner shoulder — the step the first plate seats against */}
                <div
                  className="shrink-0"
                  style={{
                    width: 9,
                    height: 28,
                    background: "linear-gradient(180deg, #C6C2BA, #9EA4AA 45%, #83898F)",
                  }}
                />
                {plates.map((p) =>
                  Array.from({ length: p.count }, (_, i) => {
                    const spec = PLATE_SPEC[p.kg];
                    return (
                      <div
                        key={`${p.kg}-${i}`}
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: spec.width,
                          height: spec.height,
                          background: spec.color,
                          border: p.kg === 5 ? "1px solid rgba(36,31,27,0.22)" : "1px solid rgba(0,0,0,0.14)",
                          boxShadow: "inset -1.5px 0 0 rgba(0,0,0,0.12), inset 1.5px 0 0 rgba(255,255,255,0.16)",
                        }}
                        aria-label={`${p.kg}kg plate`}
                      >
                        {spec.textColor && (
                          <span className="text-[10px] font-extrabold" style={{ color: spec.textColor }}>
                            {p.kg}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                {plateCollar > 0 && (
                  <div
                    className="shrink-0"
                    style={{ width: 9, height: collarHeight, background: COLLAR_COLOR }}
                    aria-label="Collar"
                  />
                )}
                {/* sleeve end cap */}
                <div
                  className="shrink-0"
                  style={{
                    width: 16,
                    height: 9,
                    borderRadius: "0 3px 3px 0",
                    background: "linear-gradient(180deg, #D8D4CD, #B9BEC4 45%, #9AA0A6)",
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {plates.map((p) => (
                  <span
                    key={p.kg}
                    className="flex items-center gap-1.5 rounded-xl bg-cream-soft px-3 py-2 text-sm font-semibold text-charcoal"
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PLATE_SPEC[p.kg].color, border: p.kg === 5 ? "1px solid rgba(36,31,27,0.3)" : undefined }} />
                    {p.kg}kg <span className="text-charcoal-faint">× {p.count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
          {remainderKg > 0.01 && (
            <p className="flex items-center gap-1.5 text-xs text-status-high mt-2">
              <AlertTriangle size={13} /> {remainderKg.toFixed(2)}kg per side can't be made exactly with standard IPF plates.
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
