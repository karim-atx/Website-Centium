import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { formatDuration } from "../../services/workout";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toIso(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// V4: History tab calendar button — a monthly view of worked days (Strong
// app-inspired, not copied). Tapping a marked day shows that day's full
// session details.
export const WorkoutCalendarSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { workoutSessions, personalRecords } = useApp();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const sessionsByDate = new Map<string, typeof workoutSessions>();
  for (const s of workoutSessions) {
    sessionsByDate.set(s.date, [...(sessionsByDate.get(s.date) ?? []), s]);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : [];

  return (
    <BottomSheet open={open} onClose={() => { setSelectedDate(null); onClose(); }} title="Workout Calendar">
      <div className="animate-fade-slide-up">
        {!selectedDate ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-charcoal">{monthLabel}</p>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-charcoal-faint py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const iso = toIso(year, month, day);
                const worked = sessionsByDate.has(iso);
                return (
                  <button
                    key={i}
                    onClick={() => worked && setSelectedDate(iso)}
                    disabled={!worked}
                    className={`tap aspect-square rounded-xl text-sm font-medium flex flex-col items-center justify-center gap-0.5 ${
                      worked ? "bg-sohati-pale text-sohati-dark font-bold" : "text-charcoal-faint disabled:opacity-50"
                    }`}
                  >
                    {day}
                    {worked && <span className="w-1 h-1 rounded-full bg-sohati" />}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="animate-fade-slide-up">
            <button
              onClick={() => setSelectedDate(null)}
              className="tap flex items-center gap-1 text-xs font-semibold text-sohati mb-3"
            >
              <ChevronLeft size={13} /> Back to calendar
            </button>
            <p className="text-sm font-semibold text-charcoal mb-3">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            {selectedSessions.map((s) => (
              <div key={s.id} className="bg-cream-soft rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-charcoal">{s.routineName}</p>
                  <span className="text-xs text-charcoal-faint">{formatDuration(s.durationSec)}</span>
                </div>
                <p className="text-xs text-sohati-dark font-semibold mb-3">
                  {s.totalVolumeKg.toLocaleString()} kg total volume
                </p>
                <div className="space-y-2.5">
                  {s.exercises.map((ex) => (
                    <div key={ex.exerciseId} className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-charcoal">{ex.name}</p>
                        <p className="text-[11px] text-charcoal-faint">
                          {ex.sets.length} sets · {ex.sets.reduce((s2, st) => s2 + st.reps, 0)} reps
                        </p>
                      </div>
                      {personalRecords[ex.name] && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-ember-dark bg-ember-pale rounded-full px-2 py-0.5">
                          <Dumbbell size={10} /> 1RM {personalRecords[ex.name]}kg
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
