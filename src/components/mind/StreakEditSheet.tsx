import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Streak } from "../../types";
import { Trash2 } from "lucide-react";

export const StreakEditSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  streak: Streak | null;
}> = ({ open, onClose, streak }) => {
  const { updateStreak, removeStreak } = useApp();
  const [label, setLabel] = useState("");
  const [goalDays, setGoalDays] = useState("30");

  useEffect(() => {
    if (streak) {
      setLabel(streak.label);
      setGoalDays(String(streak.goalDays));
    }
  }, [streak]);

  if (!streak) return null;

  const save = () => {
    updateStreak(streak.id, { label, goalDays: Number(goalDays) || streak.goalDays });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Streak">
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Goal (days)</span>
          <input
            value={goalDays}
            onChange={(e) => setGoalDays(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              removeStreak(streak.id);
              onClose();
            }}
          >
            <Trash2 size={14} /> Remove
          </Button>
          <Button fullWidth onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
