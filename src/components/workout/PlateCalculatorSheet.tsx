import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sessionOptionStyle } from "./sessionSheetStyles";
import { AlertTriangle } from "lucide-react";
import { perSideKg, plateBreakdown } from "../../services/workout/plates";

const BAR_OPTIONS: { value: "20" | "15" | "other"; label: string; kg?: number }[] = [
  { value: "20", label: "20kg", kg: 20 },
  { value: "15", label: "15kg", kg: 15 },
  { value: "other", label: "Other" },
];
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

export const PlateCalculatorSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [targetDraft, setTargetDraft] = useState("100");
  const [pct, setPct] = useState(100);
  const [barChoice, setBarChoice] = useState<"20" | "15" | "other">("20");
  const [customBarDraft, setCustomBarDraft] = useState("10");
  // Design refinement §6.9b: collars are a three-way selector (5 kg / 2.5 kg /
  // None) defaulting to 2.5 kg. The value is ONE collar; there is one per side.
  const [plateCollar, setPlateCollar] = useState<5 | 2.5 | 0>(2.5);

  const barKg = barChoice === "other" ? Number(customBarDraft) || 0 : BAR_OPTIONS.find((b) => b.value === barChoice)!.kg!;
  // One collar per sleeve, as the selector's "(per side)" label says: per
  // side = (working − bar − 2 × collar) / 2 (handover 2026-09-29, 03).
  const targetInput = Number(targetDraft) || 0;
  const targetKg = unit === "kg" ? targetInput : targetInput / KG_TO_LB;
  const workingKg = (targetKg * pct) / 100;
  const perSide = perSideKg(workingKg, barKg, plateCollar);
  const { plates, remainderKg } = plateBreakdown(perSide);

  const displayKg = (kg: number) => (unit === "kg" ? kg : +(kg * KG_TO_LB).toFixed(1));

  const collarHeight = plateCollar === 5 ? 34 : plateCollar === 2.5 ? 26 : 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Plate Calculator">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-2 w-fit" style={{ background: "#F5F5F6", borderRadius: 10, padding: 4 }}>
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className="tap uppercase"
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                background: unit === u ? "#A299DE" : "#FFFFFF",
                color: unit === u ? "#FFFFFF" : "#241F1B",
              }}
            >
              {u}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Target weight ({unit})
          </span>
          {/* Typed, never stepped — a single grey field. */}
          <input
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, ""))}
            inputMode="decimal"
            className="w-full min-w-0 text-center focus:outline-none"
            style={{
              background: "#F5F5F6",
              border: "1px solid rgba(36,31,27,0.07)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 18,
              fontWeight: 700,
              color: "#241F1B",
            }}
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Bar</span>
          <div className="flex gap-2 mb-2">
            {BAR_OPTIONS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBarChoice(b.value)}
                className="tap transition-colors"
                style={sessionOptionStyle(barChoice === b.value, { borderRadius: 12, padding: "8px 14px" })}
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
                className="tap transition-colors"
                style={{ flex: 1, ...sessionOptionStyle(plateCollar === c, { borderRadius: 12, padding: "8px 0" }) }}
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
            style={{ accentColor: "#AEA1DC" }}
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
                {displayKg(perSide).toLocaleString()}
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
            {barKg}kg bar{plateCollar > 0 ? ` + ${plateCollar * 2}kg collars` : ""} + {displayKg(perSide * 2).toLocaleString()}
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
