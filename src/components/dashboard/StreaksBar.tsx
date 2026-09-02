import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ChevronRight, Flame } from "lucide-react";
import { flameColor } from "../../utils/flameColor";

// Design refinement §6.1: "the one gradient retained in the app" — the
// sage bar becomes a lavender panel that's the screen's focal point
// instead of one of three competing blocks. Layout: longest streak leads
// (hero numeral + goal track), the other three sit below a hairline.
export const StreaksBar: React.FC = () => {
  const { streaks } = useApp();
  const navigate = useNavigate();
  const sorted = [...streaks].sort((a, b) => b.days - a.days);
  const lead = sorted[0];
  const rest = sorted.slice(1);
  if (!lead) return null;

  const leadLabel = lead.label.replace(/\s*streak$/i, "");
  const remaining = Math.max(0, lead.goalDays - lead.days);
  const filledSegments = Math.max(0, Math.min(10, Math.round((lead.days / lead.goalDays) * 10)));

  return (
    <button
      onClick={() => navigate("/app/mind")}
      className="tap w-full text-left rounded-[20px] p-4 mb-5 animate-fade-slide-up"
      style={{ background: "linear-gradient(148deg, #AEA1DC 0%, #8C7CC4 52%, #6F5FA6 100%)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-white/75 uppercase tracking-[0.1em]">Longest streak</p>
        <span className="flex items-center gap-0.5 text-[10.5px] font-semibold text-white/85">
          All streaks <ChevronRight size={12} />
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Flame size={28} style={{ color: flameColor(lead.days / lead.goalDays) }} fill="currentColor" fillOpacity={0.35} />
        <div>
          <p className="text-[38px] font-extrabold text-white leading-none tracking-[-0.03em] tabular-nums">
            {lead.days}
          </p>
          <p className="text-[12px] font-medium text-white/80 -mt-0.5">
            days · {leadLabel}
          </p>
        </div>
      </div>
      <p className="text-[11px] font-medium text-white/70 mb-2.5">
        {remaining > 0 ? `${remaining} to your ${lead.goalDays}-day goal` : "Goal reached — keep it going"}
      </p>

      <div className="flex gap-1 mb-3">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: i < filledSegments ? "#FFFFFF" : "rgba(255,255,255,0.28)" }}
          />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.22]">
          {rest.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 min-w-0">
              <Flame size={12} style={{ color: flameColor(s.days / s.goalDays) }} fill="currentColor" fillOpacity={0.3} className="shrink-0" />
              <div className="min-w-0">
                <span className="text-[15px] font-extrabold text-white tabular-nums">{s.days}</span>
                <p className="text-[9.5px] font-medium text-white/70 truncate">{s.label.replace(/\s*streak$/i, "")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};
