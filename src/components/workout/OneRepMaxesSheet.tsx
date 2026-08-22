import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { Pencil, Check, Dumbbell } from "lucide-react";

// V4: lists the estimated 1RM (auto-derived from logged sets) for every
// barbell/dumbbell/weighted-bodyweight exercise, editable if the estimate
// needs a manual correction.
export const OneRepMaxesSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { personalRecords, setPersonalRecord } = useApp();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const entries = Object.entries(personalRecords).sort((a, b) => b[1] - a[1]);

  return (
    <BottomSheet open={open} onClose={onClose} title="One Rep Maxes">
      <div className="animate-fade-slide-up space-y-2">
        {entries.length === 0 && (
          <p className="text-center text-sm text-charcoal-faint py-8">
            Log a barbell, dumbbell, or weighted-bodyweight exercise to see estimated 1RMs here.
          </p>
        )}
        {entries.map(([name, kg]) => (
          <div key={name} className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Dumbbell size={15} className="text-sohati-dark" />
              <span className="text-sm font-semibold text-charcoal">{name}</span>
            </div>
            {editingName === name ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  className="w-16 rounded-lg border border-sohati/40 bg-cream-card px-1.5 py-0.5 text-xs text-charcoal focus:outline-none"
                />
                <button
                  onClick={() => {
                    setPersonalRecord(name, Number(draft) || kg);
                    setEditingName(null);
                  }}
                  className="tap w-6 h-6 rounded-full bg-sohati text-white flex items-center justify-center"
                >
                  <Check size={11} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingName(name);
                  setDraft(String(kg));
                }}
                className="tap flex items-center gap-1.5 text-sm font-bold text-charcoal"
              >
                {kg}kg <Pencil size={11} className="text-charcoal-faint" />
              </button>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};
