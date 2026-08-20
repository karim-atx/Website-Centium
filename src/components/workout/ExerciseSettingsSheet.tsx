import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise, RepMaxUpdateMode } from "../../types";
import clsx from "clsx";

const repMaxModes: { value: RepMaxUpdateMode; label: string; desc: string }[] = [
  { value: "no_update", label: "Does not update", desc: "Rep Max stays unchanged" },
  { value: "prompt", label: "Prompt for update", desc: "Ask when an update looks likely" },
  { value: "prompt_with_estimate", label: "Prompt with estimate", desc: "Pre-fill the new estimated 1RM" },
];

const field = (label: string, unit?: string) => `${label}${unit ? ` (${unit})` : ""}`;

export const ExerciseSettingsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  onSave: (patch: Partial<Exercise>) => void;
}> = ({ open, onClose, exercise, onSave }) => {
  const [draft, setDraft] = useState<Partial<Exercise>>({});

  React.useEffect(() => {
    if (exercise) setDraft(exercise);
  }, [exercise]);

  if (!exercise) return null;

  const num = (key: keyof Exercise) => (
    <input
      value={draft[key] === undefined || draft[key] === null ? "" : String(draft[key])}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
      inputMode="decimal"
      className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
    />
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={exercise.name}>
      <div className="space-y-5 animate-fade-slide-up">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Min sets")}</span>
            {num("minSets")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Max sets")}</span>
            {num("maxSets")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Min reps")}</span>
            {num("minReps")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Max reps")}</span>
            {num("maxReps")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Intensity", "%")}</span>
            {num("intensityPct")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rep Max", "kg")}</span>
            {num("repMaxKg")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rest", "sec")}</span>
            {num("restSeconds")}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">RPE</span>
            {num("rpe")}
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Tempo (ecc-pause-con-pause)
          </span>
          <input
            value={draft.tempo ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, tempo: e.target.value }))}
            placeholder="3-1-1-0"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Rep Max update mode
          </p>
          <div className="space-y-2">
            {repMaxModes.map((m) => (
              <button
                key={m.value}
                onClick={() => setDraft((d) => ({ ...d, repMaxUpdateMode: m.value }))}
                className={clsx(
                  "tap w-full text-left rounded-xl px-3.5 py-2.5 border transition-colors",
                  draft.repMaxUpdateMode === m.value
                    ? "bg-sohati-pale border-sohati"
                    : "bg-cream-soft border-transparent"
                )}
              >
                <p className="text-sm font-semibold text-charcoal">{m.label}</p>
                <p className="text-xs text-charcoal-faint">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Save settings
        </Button>
      </div>
    </BottomSheet>
  );
};
