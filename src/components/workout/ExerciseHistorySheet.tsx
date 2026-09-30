import React, { useMemo } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { BookOpen } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { exerciseHistory } from "../../services/workout/history";

const label: React.CSSProperties = { margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#9A94B3" };
const value: React.CSSProperties = { margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#5F5093", whiteSpace: "nowrap" };

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
  const entries = useMemo(
    () => (open ? exerciseHistory(workoutSessions, { ...match, name }) : []),
    [open, workoutSessions, match, name]
  );

  return (
    <BottomSheet light open={open} onClose={onClose} title={`${name} history`}>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center text-center animate-fade-slide-up" style={{ padding: "26px 12px 10px", gap: 10 }}>
          <BookOpen size={20} style={{ color: "#AEA1DC" }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
            No history yet. Log this exercise in a routine to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col animate-fade-slide-up" style={{ gap: 8 }}>
          {entries.map((e) => (
            <div key={e.sessionId} style={{ background: "rgba(174,161,220,0.10)", borderRadius: 14, padding: "12px 14px 13px" }}>
              <div className="flex items-start justify-between" style={{ gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#241F1B" }}>
                  {new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p className="truncate" style={{ margin: "1px 0 0", fontSize: 11, color: "#8C8378" }}>{e.routineName}</p>
              </div>
              <div className="flex" style={{ gap: 22, marginTop: 8 }}>
                <div>
                  <p style={label}>SETS</p>
                  <p style={value}>{e.sets}</p>
                </div>
                {e.top && (
                  <div>
                    <p style={label}>TOP SET</p>
                    <p style={value}>
                      {e.top.weightKg} kg × {e.top.reps}
                    </p>
                  </div>
                )}
                <div>
                  <p style={label}>VOLUME</p>
                  <p style={value}>{e.volumeKg.toLocaleString()} kg</p>
                </div>
              </div>
              <p className="truncate" style={{ margin: "8px 0 0", fontSize: 11, color: "#8C8378" }}>{e.line}</p>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
