import React from "react";
import { BP_DISCUSS_TEXT, FLAG_LABEL, FLAG_TEXT, HAEMATOCRIT_SOON_EXTRA } from "../../services/health-checks/guidance";
import type { Flag } from "../../services/health-checks/flags";
import { FlagChip, FlagNote } from "../ui/FlagNote";

/** The level in words, as a small chip beside a reading. */
export const CheckFlagChip: React.FC<{ flag: Flag }> = ({ flag }) => <FlagChip tone={flag.level} label={FLAG_LABEL[flag.level]} />;

/** The level, its sentence, and for a high haematocrit the extra line. */
export const CheckFlagNote: React.FC<{ flag: Flag; className?: string }> = ({ flag, className }) => (
  <FlagNote tone={flag.level} label={FLAG_LABEL[flag.level]} className={className}>
    <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">
      {flag.bloodPressure && flag.level === "discuss" ? BP_DISCUSS_TEXT : FLAG_TEXT[flag.level]}
    </p>
    {flag.haematocrit && flag.level === "soon" && (
      <p className="mt-1 text-[11.5px] leading-[1.45] text-charcoal-soft">{HAEMATOCRIT_SOON_EXTRA}</p>
    )}
  </FlagNote>
);
