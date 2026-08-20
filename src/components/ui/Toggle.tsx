import React from "react";
import clsx from "clsx";

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0",
        checked ? "bg-sohati justify-end" : "bg-charcoal/15 justify-start"
      )}
    >
      <div className="w-5 h-5 rounded-full bg-cream-card shadow-sm" />
    </button>
  );
};
