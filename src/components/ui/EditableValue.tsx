import React, { useState } from "react";
import { Pencil, Check } from "lucide-react";

interface EditableValueProps {
  value: number;
  unit?: string;
  onSave: (value: number) => void;
  className?: string;
  step?: number;
  decimals?: number;
  /** Render the edit pencil as an absolutely-positioned top-right corner
   * button instead of inline next to the value — the parent must be
   * `relative`. Used across Health metric cards for a consistent affordance. */
  corner?: boolean;
}

/** Tap the value (or its corner pencil) to edit it inline — no separate "+"
 * button required. */
export const EditableValue: React.FC<EditableValueProps> = ({
  value,
  unit,
  onSave,
  className,
  step = 0.1,
  decimals = 1,
  corner = false,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    onSave(Number(draft) || value);
    setEditing(false);
  };

  if (editing) {
    // Stacked (input above, checkmark below) and narrower than the old
    // side-by-side layout so the confirm button always stays inside a
    // dedicated box, even a narrow one like Profile's 3-across grid —
    // side-by-side previously overflowed those cards.
    return (
      <div className="flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          inputMode="decimal"
          step={step}
          className={`w-16 text-center rounded-lg border border-primary/40 bg-cream-card px-2 py-1 text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 ${className ?? ""}`}
        />
        <button
          onClick={commit}
          aria-label="Confirm"
          className="tap w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
        >
          <Check size={13} strokeWidth={3} />
        </button>
      </div>
    );
  }

  if (corner) {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
          aria-label="Edit value"
          className="tap absolute top-3 right-3 w-6 h-6 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint hover:text-charcoal"
        >
          <Pencil size={11} />
        </button>
        <span className={className}>
          {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
          {unit && <span className="text-xs font-normal text-charcoal-faint ml-0.5">{unit}</span>}
        </span>
      </>
    );
  }

  return (
    <button onClick={startEditing} className="tap inline-flex items-baseline gap-1.5 group">
      <span className={className}>
        {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
        {unit && <span className="text-xs font-normal text-charcoal-faint ml-0.5">{unit}</span>}
      </span>
      <Pencil size={11} className="text-charcoal-faint opacity-50 group-hover:opacity-100" />
    </button>
  );
};
