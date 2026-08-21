import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { LoggedSet, SetType } from "../../types";
import { rpeOptions } from "../../services/workout";
import clsx from "clsx";

const setTypes: { value: SetType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warmup", label: "Warm up" },
  { value: "failure", label: "Failure" },
  { value: "dropset", label: "Drop set" },
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

  useEffect(() => {
    if (set) {
      setSetType(set.setType ?? "normal");
      setNotes(set.notes ?? "");
      setRpe(set.rpe);
    }
  }, [set]);

  if (!set) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title={`Set ${set.setNumber} options`}>
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
                className={clsx(
                  "tap rounded-xl py-2.5 text-xs font-semibold border transition-colors",
                  setType === t.value
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">RPE</p>
          <div className="flex flex-wrap gap-1.5">
            {rpeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRpe(rpe === r ? undefined : r)}
                className={clsx(
                  "tap px-3 py-1.5 rounded-full text-xs font-semibold border",
                  rpe === r ? "bg-sohati text-white border-sohati" : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt heavy, elbow twinge…"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <Button
          fullWidth
          size="lg"
          onClick={() => {
            onSave({ setType, notes: notes.trim() || undefined, rpe });
            onClose();
          }}
        >
          Save set options
        </Button>
      </div>
    </BottomSheet>
  );
};
