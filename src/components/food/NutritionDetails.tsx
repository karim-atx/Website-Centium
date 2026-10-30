import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { textPx } from "../../theme/textSize";

/**
 * Round D, D18: in recovery-sensitive mode a food being CREATED keeps its
 * kcal and macro fields, but folded under "Nutrition details" and closed by
 * default, so nothing about calories is in view unless the person opens it.
 * What they type is still saved. Outside the mode the fields render as they
 * always did, without this wrapper (the caller decides).
 */
export const NutritionDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap w-full flex items-center text-start"
        style={{ gap: 8, padding: "4px 2px", background: "none", border: "none" }}
      >
        <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12.5), fontWeight: 700, color: "rgb(var(--c-charcoal-soft))" }}>
          Nutrition details <span style={{ fontWeight: 500, color: "rgb(var(--c-charcoal-muted))" }}>(optional)</span>
        </span>
        <span
          className="flex"
          style={{ color: "rgb(var(--c-charcoal-muted))", transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
        >
          <ChevronDown size={14} />
        </span>
      </button>
      {open && <div className="animate-fade-slide-up" style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
};
