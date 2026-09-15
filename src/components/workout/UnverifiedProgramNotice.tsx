import React from "react";
import { ShieldAlert } from "lucide-react";
import clsx from "clsx";

// The disclaimer a curated program carries until a qualified human has read it.
//
// WHY THIS EXISTS AT ALL. The nine starter programs shipped with this app were
// written by an AI, not by a certified coach, and nothing on screen said so.
// workout_templates.is_verified answers the same question foods.is_verified and
// exercises.is_verified answer, and the migration that added it makes the case
// plainly: a wrong muscle-group mapping is a taxonomy error, wrong programming
// is a person under a loaded barbell.
//
// BEFORE, NOT AFTER. This renders where the program is being considered — in
// the list and in the sheet that offers it — rather than as small print
// somewhere past the decision. Someone should know what they are taking on
// before they take it on, not after.
//
// NOT AUTH-GATED, DELIBERATELY. Curated templates are readable by anon —
// `workout_templates_select_public` is `using (is_public)` with a SELECT grant
// to anon — so any signed-out surface that ever lists them gets this too,
// without needing to remember to add it.
//
// SHOWS ONLY WHEN THE FLAG IS FALSE. The caller passes the row's own value, so
// the day a program is genuinely reviewed and marked verified, the treatment
// disappears on its own with nothing to remove here.
export const UnverifiedProgramNotice: React.FC<{
  /** The template's own `is_verified`. Nothing renders when it is true. */
  isVerified: boolean;
  /** Only curated programs make this claim; a professional's own work is theirs. */
  isPublic: boolean;
  /** `full` explains; `compact` is the one-line form for a dense list. */
  variant?: "full" | "compact";
  className?: string;
}> = ({ isVerified, isPublic, variant = "full", className }) => {
  // A professional's own template is never verified either, but saying
  // "unreviewed" about someone's own coaching would be nonsense — they are the
  // reviewer. The claim is only about programming this app is handing out.
  if (isVerified || !isPublic) return null;

  if (variant === "compact") {
    return (
      <p
        className={clsx(
          "text-[10.5px] font-semibold text-charcoal-soft flex items-center gap-1",
          className
        )}
      >
        <ShieldAlert size={11} className="text-ember-dark shrink-0" />
        Unreviewed starting point
      </p>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 rounded-xl bg-cream-soft border border-ember-dark/20 px-3 py-2.5",
        className
      )}
    >
      <ShieldAlert size={14} className="text-ember-dark shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-charcoal">Unreviewed starting point</p>
        <p className="text-[11px] text-charcoal-soft leading-relaxed">
          This program hasn't been checked by a certified coach. Treat it as a starting point,
          adjust the weights to what you can actually lift, and talk to a professional if anything
          hurts.
        </p>
      </div>
    </div>
  );
};
