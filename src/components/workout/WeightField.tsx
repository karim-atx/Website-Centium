import React, { useState } from "react";

/**
 * The logger's weight box. THREE STATES, not two: blank (null, nothing typed:
 * the set takes its greyed hint when logged), 0 (bodyweight, shown "BW"), or a
 * load in kg. "0" and "bw" both mean bodyweight.
 *
 * While focused it shows exactly what is typed, so "0.5" or "62.5" can be
 * typed through a leading 0 without the box turning into "BW" mid-number;
 * once it loses focus a 0 reads "BW". A greyed hint of 0 reads "BW" too.
 */
export const WeightField: React.FC<{
  value: number | null;
  onChange: (weightKg: number | null) => void;
  placeholder: string;
  ariaLabel: string;
  style: React.CSSProperties;
}> = ({ value, onChange, placeholder, ariaLabel, style }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : value === 0 ? "BW" : String(value));

  const commit = (raw: string) => {
    const t = raw.trim();
    if (t === "") return onChange(null);
    if (/^bw$|^bodyweight$/i.test(t)) return onChange(0);
    const n = Number(t);
    // "b" on the way to "bw", or a stray character: leave the value as it was.
    if (Number.isFinite(n) && n >= 0) onChange(n);
  };

  return (
    <input
      value={shown}
      onFocus={() => setDraft(value === null ? "" : String(value))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        commit(e.target.value);
      }}
      placeholder={placeholder === "0" ? "BW" : placeholder}
      inputMode="decimal"
      aria-label={ariaLabel}
      className="logger-field flex-1 focus:outline-none"
      style={style}
    />
  );
};
