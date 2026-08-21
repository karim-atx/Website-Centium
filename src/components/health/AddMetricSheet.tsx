import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Scale, Percent, Footprints, Moon, Droplet, Check } from "lucide-react";
import clsx from "clsx";

type MetricType = "weight" | "bodyFat" | "steps" | "sleep" | "water";

const metricOptions: { type: MetricType; label: string; unit: string; icon: typeof Scale }[] = [
  { type: "weight", label: "Weight", unit: "kg", icon: Scale },
  { type: "bodyFat", label: "Body Fat", unit: "%", icon: Percent },
  { type: "steps", label: "Steps", unit: "steps", icon: Footprints },
  { type: "sleep", label: "Sleep", unit: "h", icon: Moon },
  { type: "water", label: "Water", unit: "ml", icon: Droplet },
];

export const AddMetricSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { addWater, updateMetricValue } = useApp();
  const [type, setType] = useState<MetricType>("weight");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setType("weight");
    setValue("");
    setSaved(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    const num = Number(value);
    if (value) {
      if (type === "water") addWater(num);
      else if (type === "sleep") updateMetricValue("sleepHours", num);
      else updateMetricValue(type, num);
    }
    setSaved(true);
    setTimeout(handleClose, 800);
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add Health Metric">
      <div className="animate-fade-slide-up">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
          What are you logging?
        </p>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {metricOptions.map((m) => {
            const Icon = m.icon;
            const active = type === m.type;
            return (
              <button
                key={m.type}
                onClick={() => setType(m.type)}
                className={clsx(
                  "tap flex flex-col items-center gap-1.5 rounded-2xl py-4 border transition-colors",
                  active ? "bg-sohati-pale border-sohati" : "bg-cream-soft border-transparent"
                )}
              >
                <Icon size={18} className={active ? "text-sohati" : "text-charcoal-soft"} />
                <span className="text-[11px] font-semibold text-charcoal">{m.label}</span>
              </button>
            );
          })}
        </div>

        <label className="block mb-6">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Value ({metricOptions.find((m) => m.type === type)?.unit})
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
          />
        </label>

        <Button fullWidth size="lg" onClick={handleSave} disabled={!value || saved}>
          {saved ? <><Check size={16} /> Saved</> : "Save"}
        </Button>
        <p className="text-[11px] text-charcoal-faint mt-4 text-center">
          Prototype entry — not connected to a wearable or lab feed yet.
        </p>
      </div>
    </BottomSheet>
  );
};
