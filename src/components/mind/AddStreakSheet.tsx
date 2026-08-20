import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";

const emojiOptions = ["🔥", "💪", "🥗", "🧘", "📓", "😴", "👣"];

export const AddStreakSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addStreak } = useApp();
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState(emojiOptions[0]);
  const [goalDays, setGoalDays] = useState("30");

  const reset = () => {
    setLabel("");
    setEmoji(emojiOptions[0]);
    setGoalDays("30");
  };

  const save = () => {
    if (!label.trim()) return;
    addStreak(label.trim(), emoji, Number(goalDays) || 30);
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
        <div className="flex gap-2 flex-wrap">
          {emojiOptions.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`tap w-10 h-10 rounded-2xl text-lg flex items-center justify-center ${
                emoji === e ? "bg-sohati-pale ring-2 ring-sohati" : "bg-cream-soft"
              }`}
            >
              {e}
            </button>
          ))}
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
