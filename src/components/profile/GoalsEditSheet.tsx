import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Goal } from "../../types";
import clsx from "clsx";
import { Check } from "lucide-react";

const goals: { value: Goal; label: string; emoji: string }[] = [
  { value: "lose_weight", label: "Lose weight", emoji: "⚖️" },
  { value: "build_muscle", label: "Build muscle", emoji: "💪" },
  { value: "get_stronger", label: "Get stronger", emoji: "🏋️" },
  { value: "improve_nutrition", label: "Improve my nutrition", emoji: "🥗" },
  { value: "improve_fitness", label: "Improve my fitness", emoji: "🏃" },
  { value: "improve_health", label: "Improve my overall health", emoji: "❤️" },
  { value: "track_health", label: "Track my health", emoji: "📊" },
  { value: "live_healthier", label: "Live healthier", emoji: "🌿" },
];

export const GoalsEditSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile } = useApp();
  const [selected, setSelected] = useState<Goal[]>(user.goals);

  useEffect(() => {
    if (open) setSelected(user.goals);
  }, [open, user.goals]);

  const toggle = (g: Goal) =>
    setSelected((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const save = () => {
    updateProfile({ goals: selected.length ? selected : user.goals });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Goals">
      <div className="grid grid-cols-2 gap-3 mb-5 animate-fade-slide-up">
        {goals.map((g) => {
          const active = selected.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggle(g.value)}
              className={clsx(
                "tap relative text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-sohati-pale border-sohati" : "bg-cream-soft border-transparent"
              )}
            >
              {active && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-sohati flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              <span className="text-xl mb-1.5 block">{g.emoji}</span>
              <span className="text-xs font-semibold text-charcoal leading-snug block">{g.label}</span>
            </button>
          );
        })}
      </div>
      <Button fullWidth size="lg" onClick={save} disabled={selected.length === 0}>
        Save goals
      </Button>
    </BottomSheet>
  );
};
