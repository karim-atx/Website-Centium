import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ChevronRight, Flame } from "lucide-react";
import { flameColor } from "../../utils/flameColor";

export const StreaksBar: React.FC = () => {
  const { streaks } = useApp();
  const navigate = useNavigate();
  const top = [...streaks].sort((a, b) => b.days - a.days);

  return (
    <button
      onClick={() => navigate("/app/mind")}
      className="tap w-full text-left bg-gradient-to-r from-teal to-teal-dark rounded-3xl p-4 mb-5 shadow-card animate-fade-slide-up"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-white/80 uppercase tracking-wide">Streaks</p>
        <ChevronRight size={16} className="text-white/70" />
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {top.map((s) => (
          <div key={s.id} className="shrink-0 text-center">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-white leading-none mb-1">
              <Flame size={18} style={{ color: flameColor(s.days / s.goalDays) }} fill="currentColor" fillOpacity={0.3} /> {s.days}
            </p>
            <p className="text-[11px] text-white/80 font-medium whitespace-nowrap">{s.label}</p>
          </div>
        ))}
      </div>
    </button>
  );
};
