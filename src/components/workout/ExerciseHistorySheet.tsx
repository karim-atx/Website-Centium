import React, { useMemo } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { BookOpen } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { exerciseHistory } from "../../services/workout/history";
import { useIsDark } from "../../hooks/useIsDark";

// Mobile v5.1 R3, dark mode (no light islands): on the card's lavender 10%
// tint (#2B2C3A dark) the stat label takes text.secondary dark (tertiary
// #918DA0 measures 4.28:1 there) and the value primary.deeper dark.
const label = (dark: boolean): React.CSSProperties => ({ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: dark ? "#B8B3C7" : "#9A94B3" });
const value = (dark: boolean): React.CSSProperties => ({ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: dark ? "#C8BFE9" : "#5F5093", whiteSpace: "nowrap" });

/**
 * WO14 · Exercise history, over the exercise popup: "[name] history", the
 * logged sessions that included the exercise, newest first. Each card: the
 * date and routine, then set count, top set (heaviest working set) and total
 * volume, then the individual sets on one compact line.
 */
export const ExerciseHistorySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  name: string;
  match: { catalogId?: string; customId?: string } | null;
}> = ({ open, onClose, name, match }) => {
  const { workoutSessions } = useApp();
  const dark = useIsDark();
  const entries = useMemo(
    () => (open ? exerciseHistory(workoutSessions, { ...match, name }) : []),
    [open, workoutSessions, match, name]
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={`${name} history`}>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center text-center animate-fade-slide-up" style={{ padding: "26px 12px 10px", gap: 10 }}>
          <BookOpen size={20} style={{ color: "#AEA1DC" }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "rgb(var(--c-charcoal-muted))" }}>
            No history yet. Log this exercise in a routine to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col animate-fade-slide-up" style={{ gap: 8 }}>
          {entries.map((e) => (
            <div key={e.sessionId} style={{ background: "rgba(174,161,220,0.10)", borderRadius: 14, padding: "12px 14px 13px" }}>
              <div className="flex items-start justify-between" style={{ gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
                  {new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p className="truncate" style={{ margin: "1px 0 0", fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>{e.routineName}</p>
              </div>
              <div className="flex" style={{ gap: 22, marginTop: 8 }}>
                <div>
                  <p style={label(dark)}>SETS</p>
                  <p style={value(dark)}>{e.sets}</p>
                </div>
                {e.top && (
                  <div>
                    <p style={label(dark)}>TOP SET</p>
                    <p style={value(dark)}>
                      {e.top.weightKg} kg × {e.top.reps}
                    </p>
                  </div>
                )}
                <div>
                  <p style={label(dark)}>VOLUME</p>
                  <p style={value(dark)}>{e.volumeKg.toLocaleString()} kg</p>
                </div>
              </div>
              <p className="truncate" style={{ margin: "8px 0 0", fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>{e.line}</p>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
