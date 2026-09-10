import { Star } from "lucide-react";

/**
 * A tappable one-to-five rating.
 *
 * EXTRACTED FROM AN EXISTING PATTERN, NOT INVENTED. Professionals.tsx and
 * ProfessionalDetail.tsx already carry this control, byte-for-byte identical
 * in both — gold when filled, `charcoal/15` when not, and an aria-label naming
 * the value rather than the position. This is that markup, moved somewhere it
 * can be used a third time without a third copy.
 *
 * THOSE TWO CALL SITES ARE DELIBERATELY LEFT ALONE. Converting them is a
 * refactor with its own regression surface — both sit inside review sheets
 * that write to different places — and folding it into a new feature would
 * mean this change could not be reverted without taking them with it.
 *
 * NO ZERO STATE AND NO HALF STARS. `value` of 0 means unrated and renders five
 * empty stars, which is what an untouched control should look like; there is
 * no way to return to 0 once a star is tapped, because "I meant not to rate"
 * is expressed by not submitting.
 */
export const StarRating: React.FC<{
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}> = ({ value, onChange, size = 30, disabled = false }) => (
  <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label="Rating">
    {Array.from({ length: 5 }, (_, i) => {
      const filled = i < value;
      return (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i + 1}
          onClick={() => onChange(i + 1)}
          disabled={disabled}
          aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          className="tap disabled:opacity-50"
        >
          <Star size={size} className={filled ? "fill-gold text-gold" : "text-charcoal/15"} />
        </button>
      );
    })}
  </div>
);
