import React from "react";
import { sheetGreyStyleFor, sheetLabelStyleFor } from "../ui/sheetChip";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";

/**
 * CentiumFrame `field()`: a grey labelled container with a white borderless
 * input.
 *
 * Its own module because three screens draw it now — Create Custom Food, the
 * barcode no-match form in Add Food, and whatever opens the custom form next.
 * It used to live inside AddFoodSheet, which stopped being the only caller
 * the moment the form moved out.
 */
export const SheetField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
}> = ({ label, value, onChange, placeholder, numeric = false }) => {
  const dark = useIsDark();
  return (
    <label className="block" style={{ ...sheetGreyStyleFor(dark), boxSizing: "border-box" }}>
      <span className="block" style={{ ...sheetLabelStyleFor(dark), marginBottom: 8 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : "text"}
        className="w-full placeholder:text-charcoal-faint focus:outline-none"
        style={{ borderRadius: 10, background: "rgb(var(--c-cream-card))", border: "none", padding: "11px 13px", fontSize: textPx(14), color: "rgb(var(--c-charcoal))", boxSizing: "border-box" }}
      />
    </label>
  );
};
