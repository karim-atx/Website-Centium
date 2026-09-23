import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sessionChipStyle, sessionOptionStyle } from "./sessionSheetStyles";
import { Button } from "../ui/Button";
import type { LoggedSet, SetType } from "../../types";
import { rpeOptions } from "../../services/workout";

// QA 11.0: "When editing a routine, add more buttons like super set and
// PR." A PR set that gets checked off fires a confetti celebration (see
// WorkoutSessionSheet).
const setTypes: { value: SetType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warmup", label: "Warm up" },
  { value: "failure", label: "Failure" },
  { value: "dropset", label: "Drop set" },
  { value: "superset", label: "Superset" },
  { value: "pr", label: "PR" },
];

export const SetOptionsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  set: LoggedSet | null;
  onSave: (patch: Partial<LoggedSet>) => void;
}> = ({ open, onClose, set, onSave }) => {
  const [setType, setSetType] = useState<SetType>("normal");
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [mood, setMood] = useState(5);
  const [pain, setPain] = useState(0);

  useEffect(() => {
    if (set) {
      setSetType(set.setType ?? "normal");
      setNotes(set.notes ?? "");
      setRpe(set.rpe);
      setMood(set.mood ?? 5);
      setPain(set.pain ?? 0);
    }
  }, [set]);

  if (!set) return null;

  // V9 (QA 9.0): "starts as the color green on 0 and gradually changes
  // color to red when it reaches 10" — linear interpolation between the
  // app's existing green/red semantic colors, driven by the slider value.
  const painColor = (() => {
    const t = pain / 10;
    const from = [63, 145, 101]; // #3F9165
    const to = [192, 57, 43]; // #C0392B
    const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t));
    return `rgb(${r}, ${g}, ${b})`;
  })();

  return (
    <BottomSheet open={open} onClose={onClose} title={`Set ${set.setNumber} options`} variant="session">
      <div className="space-y-5 animate-fade-slide-up">
        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Classification
          </p>
          <div className="grid grid-cols-2 gap-2">
            {setTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setSetType(t.value)}
                className="tap transition-colors"
                style={sessionOptionStyle(setType === t.value, { borderRadius: 12, padding: "10px 0" })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">RPE</p>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {rpeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(rpe === r ? undefined : r)}
                className="tap"
                style={sessionChipStyle(rpe === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          {/* V9 (QA 9.0): "above the mood slider should also be a slider for
              Pain level ranging from zero being no injury to 10 being severe
              pain. It automatically should start at zero." */}
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Pain level</p>
            <span className="text-xs text-charcoal-faint">{pain} / 10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={pain}
            onChange={(e) => setPain(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: painColor }}
          />
          <div className="flex items-center justify-between text-[10px] text-charcoal-faint mt-1">
            <span>No injury</span>
            <span>Severe pain</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Mood</p>
            <span className="text-xs text-charcoal-faint">{mood} / 10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "#AEA1DC" }}
          />
          <div className="flex items-center justify-between text-[10px] text-charcoal-faint mt-1">
            <span>Bad mood</span>
            <span>Very good</span>
          </div>
        </div>

        {/* CentiumFrame field(): grey #F2F3F5 container, white borderless input. */}
        <label className="block" style={{ background: "#F2F3F5", borderRadius: 14, padding: "12px 14px" }}>
          <span className="block" style={{ fontSize: 13, fontWeight: 500, color: "#575863", marginBottom: 8 }}>
            Notes
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt heavy, elbow twinge…"
            className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            style={{ borderRadius: 10, background: "#FFFFFF", border: "none", padding: "11px 13px", fontSize: 14 }}
          />
        </label>

        <Button
          fullWidth
          size="lg"
          onClick={() => {
            onSave({ setType, notes: notes.trim() || undefined, rpe, mood, pain });
            onClose();
          }}
        >
          Save set options
        </Button>
      </div>
    </BottomSheet>
  );
};
