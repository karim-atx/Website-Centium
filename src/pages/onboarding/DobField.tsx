import React from "react";
import { ageFromDateOfBirth, isoDateYearsAgo, validateDateOfBirth, MAX_AGE, MIN_AGE } from "../../utils/date";

/**
 * Task T: the onboarding date of birth, required for every account type.
 *
 * The native date input already used across the app; min/max stop the picker
 * offering impossible years, and the 16+ rule (validateDateOfBirth) is shown
 * under the field as soon as a full date fails it, because Continue stays
 * disabled until it passes and a disabled button needs a reason beside it.
 */
export const DobField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  /** Enter in the field: a date input does not submit a form on its own. */
  onEnter?: () => void;
}> = ({ value, onChange, onEnter }) => {
  const problem = value ? validateDateOfBirth(value) : null;
  const age = value ? ageFromDateOfBirth(value) : undefined;
  return (
    <label className="block">
      <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date of birth</span>
      <input
        type="date"
        value={value}
        min={isoDateYearsAgo(MAX_AGE)}
        max={isoDateYearsAgo(MIN_AGE)}
        required
        aria-invalid={!!problem}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
      />
      {problem ? (
        <p className="text-[11px] font-semibold text-status-high mt-1.5" role="alert">
          {problem}
        </p>
      ) : age !== undefined ? (
        <p className="text-[11px] text-charcoal-faint mt-1.5">{age} years old</p>
      ) : (
        <p className="text-[11px] text-charcoal-faint mt-1.5">
          Required. It can't be changed later without contacting support.
        </p>
      )}
    </label>
  );
};
