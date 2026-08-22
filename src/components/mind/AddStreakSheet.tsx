import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Flame } from "lucide-react";

export const AddStreakSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addStreak } = useApp();
  const [label, setLabel] = useState("");
  const [goalDays, setGoalDays] = useState("30");

  const reset = () => {
    setLabel("");
    setGoalDays("30");
  };

  const save = () => {
    if (!label.trim()) return;
    addStreak(label.trim(), Number(goalDays) || 30);
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New Streak"
    >
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-2 text-ember">
          <Flame size={22} />
          <span className="text-xs text-charcoal-faint">Every streak uses this icon</span>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Reading streak"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
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
        <Button fullWidth size="lg" onClick={save} disabled={!label.trim()}>
          Add streak
        </Button>
      </div>
    </BottomSheet>
  );
};
