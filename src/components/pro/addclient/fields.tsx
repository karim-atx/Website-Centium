import React, { useId } from "react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/**
 * Release 3 · the board's form field (gen/ui.js field): label 12 / 600
 * text.soft, 6 above a 40 high r12 well on cream-soft with a 1 px border
 * (primary on focus), text 14; an optional 11 pt note under it.
 */
const well: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${INK.b10}`,
  padding: "0 12px",
  fontSize: textPx(14),
  color: INK.ch,
};

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="flex items-center" style={{ gap: 6, fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
    {children}
  </label>
);

export const ProField: React.FC<
  { label: string; value: string; onChange: (v: string) => void; note?: string; maxLength?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">
> = ({ label, value, onChange, note, ...rest }) => {
  const id = useId();
  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="outline-none focus:border-primary placeholder:text-charcoal-faint"
        style={{ ...well, height: 40 }}
        {...rest}
      />
      {note && <span className="block" style={{ marginTop: 6, fontSize: textPx(11), color: INK.chF }}>{note}</span>}
    </div>
  );
};

export const ProTextArea: React.FC<{ label: string; value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string }> = ({ label, value, onChange, maxLength, placeholder }) => {
  const id = useId();
  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="outline-none focus:border-primary block resize-none placeholder:text-charcoal-faint"
        style={{ ...well, minHeight: 78, padding: "10px 12px", lineHeight: 1.45 }}
      />
    </div>
  );
};
