import React, { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * Free-text chips: type, press Enter or +, get a chip; tap its x to remove it.
 *
 * Duplicates are refused case-insensitively and blanks are ignored. `max` and
 * `maxTotal` mirror whatever the column enforces (for skills: 30 entries and
 * 900 characters joined), so the limit is met here with a sentence rather than
 * at the server with a refusal.
 */
export const ChipInput: React.FC<{
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  maxLength?: number;
  maxTotal?: number;
  disabled?: boolean;
}> = ({ id, label, values, onChange, placeholder, max = 30, maxLength = 60, maxTotal, disabled }) => {
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const add = () => {
    const v = text.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setNote(`"${v}" is already there.`);
      return;
    }
    if (values.length >= max) {
      setNote(`That's the most you can add (${max}).`);
      return;
    }
    if (maxTotal && [...values, v].join(" ").length > maxTotal) {
      setNote("That's as much as fits. Remove one to add another.");
      return;
    }
    onChange([...values, v]);
    setText("");
    setNote(null);
  };

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
        {label}
      </label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-0.5 rounded-full bg-primary-pale text-primary-deep-text text-[12.5px] font-semibold pl-3 max-w-full"
            >
              <span className="truncate py-1.5">{v}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className="tap relative w-7 h-7 flex items-center justify-center shrink-0 before:absolute before:-inset-2 before:content-['']"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={text}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(e) => {
            setText(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          enterKeyHint="done"
          className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !text.trim()}
          aria-label={`Add to ${label.toLowerCase()}`}
          className="tap w-11 h-11 rounded-xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
      {note && <p className="text-[11.5px] text-charcoal-soft mt-1.5">{note}</p>}
    </div>
  );
};
