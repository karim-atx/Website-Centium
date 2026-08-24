import React from "react";
import { useApp } from "../../context/AppContext";
import type { ColorTheme } from "../../types";
import { Check } from "lucide-react";
import clsx from "clsx";

const themes: { value: ColorTheme; label: string; swatch: string }[] = [
  { value: "sohati", label: "Centium", swatch: "#AEA1DC" },
  { value: "ocean", label: "Ocean", swatch: "#4C8FD1" },
  { value: "sunset", label: "Sunset", swatch: "#E97452" },
  { value: "berry", label: "Berry", swatch: "#9C4F7C" },
];

export const ColorThemePicker: React.FC = () => {
  const { colorTheme, setColorTheme } = useApp();

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setColorTheme(t.value)}
          className="tap flex flex-col items-center gap-1.5"
        >
          <div
            className={clsx(
              "w-11 h-11 rounded-full flex items-center justify-center",
              colorTheme === t.value && "ring-2 ring-offset-2 ring-offset-cream-card ring-charcoal"
            )}
            style={{ background: t.swatch }}
          >
            {colorTheme === t.value && <Check size={16} className="text-white" strokeWidth={3} />}
          </div>
          <span className="text-[10px] font-medium text-charcoal-soft text-center leading-tight">
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
};
