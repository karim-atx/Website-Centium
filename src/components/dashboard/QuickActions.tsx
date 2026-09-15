import React from "react";
import { Plus, Activity, Mic } from "lucide-react";

interface QuickActionsProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}

// Iteration 6 "Team" §1.3: a QUICK ACTIONS caps label above three pills, all
// three carrying the same lavender gradient (the dc.html markup gives all
// three the identical gradient, not the three-way lavender-to-teal
// progression CHANGE_MANIFEST.md's prose describes — the markup wins per
// the literal-spec rule). "Log workout" uses the nav's own white barbell
// glyph rather than a generic dumbbell icon. The voice-log button below
// isn't part of this handoff's canvas at all — kept as-is, since absence
// from the design means out of scope, not removed.
export const QuickActions: React.FC<QuickActionsProps> = ({
  onLogFood,
  onLogWorkout,
  onAddMetric,
  onVoiceLog,
}) => {
  const pillClass =
    "tap flex-1 flex items-center justify-center gap-[7px] rounded-full py-3 text-white text-[11px] font-bold whitespace-nowrap";
  const pillStyle = {
    background: "var(--gradient-quick-action)",
    boxShadow: "0 5px 14px #A192D63D",
  };

  return (
    <div className="animate-fade-slide-up">
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Quick actions</p>
      <div className="flex gap-[7px] mb-3.5">
        <button onClick={onLogFood} className={pillClass} style={pillStyle}>
          <Plus size={16} />
          <span>Log food</span>
        </button>
        <button onClick={onLogWorkout} className={pillClass} style={pillStyle}>
          <img src="/icon-workFilled-white.png" alt="" className="w-[18px] h-[18px] object-contain block" />
          <span>Log workout</span>
        </button>
        <button onClick={onAddMetric} className={pillClass} style={pillStyle}>
          <Activity size={16} />
          <span>Add metric</span>
        </button>
      </div>
      <button
        onClick={onVoiceLog}
        className="tap w-full flex items-center gap-3 rounded-2xl py-3.5 px-4 bg-gradient-to-r from-teal to-teal-dark text-white shadow-soft"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Mic size={15} />
        </span>
        <span className="text-sm font-semibold">Tell Centium what you ate</span>
      </button>
    </div>
  );
};
