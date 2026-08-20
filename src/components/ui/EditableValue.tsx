import React, { useState } from "react";
import { Pencil, Check } from "lucide-react";

interface EditableValueProps {
  value: number;
  unit?: string;
  onSave: (value: number) => void;
  className?: string;
  step?: number;
  decimals?: number;
}

/** Tap the value to edit it inline — no separate "+" button required. */
export const EditableValue: React.FC<EditableValueProps> = ({
  value,
  unit,
  onSave,
  className,
  step = 0.1,
  decimals = 1,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(Number(draft) || value);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          inputMode="decimal"
          step={step}
          className={`w-20 rounded-lg border border-sohati/40 bg-cream-card px-2 py-1 text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20 ${className ?? ""}`}
        />
        <button
          onClick={() => {
            onSave(Number(draft) || value);
            setEditing(false);
          }}
          className="tap w-7 h-7 rounded-full bg-sohati text-white flex items-center justify-center shrink-0"
        >
          <Check size={13} strokeWidth={3} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="tap inline-flex items-baseline gap-1.5 group"
    >
      <span className={className}>
        {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
        {unit && <span className="text-xs font-normal text-charcoal-faint ml-0.5">{unit}</span>}
      </span>
      <Pencil size={11} className="text-charcoal-faint opacity-50 group-hover:opacity-100" />
    </button>
  );
};
