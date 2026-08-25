import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";

// V7 (QA 7.0): one shared edit sheet for weight/height/age instead of a
// separate inline edit affordance per box.
export const EditBodyStatsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile } = useApp();
  const [weightKg, setWeightKg] = useState(String(user.weightKg));
  const [heightCm, setHeightCm] = useState(String(user.heightCm));
  const [age, setAge] = useState(String(user.age));

  useEffect(() => {
    if (open) {
      setWeightKg(String(user.weightKg));
      setHeightCm(String(user.heightCm));
      setAge(String(user.age));
    }
  }, [open, user.weightKg, user.heightCm, user.age]);

  const save = () => {
    updateProfile({
      weightKg: Number(weightKg) || user.weightKg,
      heightCm: Number(heightCm) || user.heightCm,
      age: Number(age) || user.age,
    });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Body Stats">
      <div className="space-y-4 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Weight (kg)</span>
          <input
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Height (cm)</span>
          <input
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Age</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>
        <Button fullWidth size="lg" onClick={save}>
          Save changes
        </Button>
      </div>
    </BottomSheet>
  );
};
