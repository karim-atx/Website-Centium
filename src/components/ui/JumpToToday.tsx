import React from "react";

/**
 * "Jump to today": the one control for returning a date view to today, used
 * by the Home / Food date row, the shared calendar sheet, the Calendar pages
 * and the Cycle scrubber. Each caller shows it ONLY when the selected or
 * visible date is not today, and wires it to select today and bring it into
 * view. A real button of its own — never nested inside another tappable
 * element, where the parent's hit box swallowed the tap (the old Home one was
 * a <span> inside the date button, so tapping it opened the picker instead).
 */
export const JumpToToday: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`tap text-[10px] font-bold text-team-nav-accent bg-team-nav-accent/[0.14] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap ${className ?? ""}`}
  >
    Jump to today
  </button>
);
