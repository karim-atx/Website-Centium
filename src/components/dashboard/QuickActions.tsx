import React from "react";
import { Plus, Dumbbell, Activity, Mic } from "lucide-react";

interface QuickActionsProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onLogFood,
  onLogWorkout,
  onAddMetric,
  onVoiceLog,
}) => {
  const actions = [
    { label: "Log Food", icon: Plus, onClick: onLogFood, bg: "bg-sohati", text: "text-white" },
    { label: "Log Workout", icon: Dumbbell, onClick: onLogWorkout, bg: "bg-charcoal", text: "text-white" },
    { label: "Add Metric", icon: Activity, onClick: onAddMetric, bg: "bg-cream-card border border-charcoal/10", text: "text-charcoal" },
  ];

  return (
    <div className="animate-fade-slide-up">
      <div className="grid grid-cols-3 gap-2.5 mb-2.5">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`tap flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 ${a.bg} ${a.text} shadow-soft`}
          >
            <a.icon size={18} />
            <span className="text-[11px] font-semibold leading-none">{a.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onVoiceLog}
        className="tap w-full flex items-center gap-3 rounded-2xl py-3.5 px-4 bg-gradient-to-r from-ember to-ember-dark text-white shadow-soft"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Mic size={15} />
        </span>
        <span className="text-sm font-semibold">Tell Sohati what you ate</span>
      </button>
    </div>
  );
};
