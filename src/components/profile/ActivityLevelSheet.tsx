import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { ActivityLevel } from "../../types";
import clsx from "clsx";
import { Armchair, Footprints, Bike, Flame, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// V7 (QA 7.0): "Have a button called activity level under goals similar to
// the one found in the client sign up" — same options as ActivityStep.
const levels: { value: ActivityLevel; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "sedentary", label: "Sedentary", desc: "Little to no exercise", icon: Armchair },
  { value: "light", label: "Lightly active", desc: "1–3 workouts a week", icon: Footprints },
  { value: "moderate", label: "Moderately active", desc: "3–5 workouts a week", icon: Bike },
  { value: "very_active", label: "Very active", desc: "6–7 workouts a week", icon: Flame },
  { value: "athlete", label: "Athlete", desc: "Structured training daily", icon: Trophy },
];

export const ActivityLevelSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile } = useApp();
  const [selected, setSelected] = useState<ActivityLevel>(user.activityLevel);

  useEffect(() => {
    if (open) setSelected(user.activityLevel);
  }, [open, user.activityLevel]);

  const save = () => {
    updateProfile({ activityLevel: selected });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Activity Level">
      <div className="space-y-2.5 mb-5 animate-fade-slide-up">
        {levels.map((l) => {
          const active = selected === l.value;
          return (
            <button
              key={l.value}
              onClick={() => setSelected(l.value)}
              className={clsx(
                "tap w-full flex items-center gap-3.5 text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-sohati-pale border-sohati" : "bg-cream-card border-charcoal/10"
              )}
            >
              <l.icon size={22} className={active ? "text-sohati-dark" : "text-charcoal-soft"} />
              <div>
                <p className="text-sm font-semibold text-charcoal">{l.label}</p>
                <p className="text-xs text-charcoal-soft">{l.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <Button fullWidth size="lg" onClick={save}>
        Save
      </Button>
    </BottomSheet>
  );
};
