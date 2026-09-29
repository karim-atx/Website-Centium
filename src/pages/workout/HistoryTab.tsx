import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { formatDuration } from "../../services/workout";
import { CalendarPickerSheet } from "../../components/dashboard/CalendarPickerSheet";
import { ChevronDown, ChevronUp, Calendar, BarChart3, Clock } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { SessionDetail } from "../../components/workout/SessionDetail";

// V8 (QA 8.0): "say that the client lifted the equivalent of a certain
// animal or object of that similar weight" — picks whichever reference is
// closest in weight to the total volume lifted, not just the nearest one
// below it, so a small total still gets a sensible (small) comparison.
const weightComparisons: { weight: number; label: string; emoji: string }[] = [
  { weight: 4, label: "a housecat", emoji: "🐱" },
  { weight: 30, label: "a Labrador", emoji: "🐕" },
  { weight: 70, label: "an adult human", emoji: "🧍" },
  { weight: 200, label: "a grand piano", emoji: "🎹" },
  { weight: 380, label: "a grizzly bear", emoji: "🐻" },
  { weight: 900, label: "a motorbike", emoji: "🏍️" },
  { weight: 1500, label: "a small car", emoji: "🚗" },
  { weight: 5400, label: "an elephant", emoji: "🐘" },
  { weight: 12000, label: "a school bus", emoji: "🚌" },
  { weight: 180000, label: "a blue whale", emoji: "🐋" },
];

function closestComparison(totalKg: number) {
  return weightComparisons.reduce((best, c) =>
    Math.abs(c.weight - totalKg) < Math.abs(best.weight - totalKg) ? c : best
  );
}

export default function HistoryTab() {
  const { workoutSessions, today } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // WO9: a day picked in the shared "Choose a date" picker shows that day's sessions.
  const [day, setDay] = useState<string | null>(null);
  const sessionDays = useMemo(() => new Set(workoutSessions.map((s) => s.date)), [workoutSessions]);
  const listed = day ? workoutSessions.filter((s) => s.date === day) : workoutSessions;

  const totalVolume = workoutSessions.reduce((s, w) => s + w.totalVolumeKg, 0);
  const totalSeconds = workoutSessions.reduce((s, w) => s + w.durationSec, 0);
  const comparison = totalVolume > 0 ? closestComparison(totalVolume) : null;

  return (
    <div className="animate-fade-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
          Summary
        </p>
        <button
          onClick={() => setCalendarOpen(true)}
          aria-label="Workout calendar"
          className="tap w-8 h-8 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft shadow-soft"
        >
          <Calendar size={15} />
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{totalVolume.toLocaleString()} kg</p>
              <p className="text-[11px] text-charcoal-faint">Total volume</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-pale flex items-center justify-center shrink-0">
              <Clock size={16} className="text-sky" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-charcoal">{formatDuration(totalSeconds)}</p>
              <p className="text-[11px] text-charcoal-faint">Time taken</p>
            </div>
          </div>
        </div>
        {comparison && (
          <p className="text-center text-xs text-charcoal-soft border-t border-charcoal/[0.06] pt-3">
            That's the equivalent of lifting {comparison.emoji} {comparison.label}
          </p>
        )}
      </Card>

      {day && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            {new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <button onClick={() => setDay(null)} className="tap text-xs font-semibold text-primary">
            Show all
          </button>
        </div>
      )}
      {day && listed.length === 0 && (
        <p className="text-center text-sm text-charcoal-faint py-4">No workouts logged on this day.</p>
      )}

      {listed.length > 0 && (
        <div>
          {!day && (
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
              Logged sessions
            </p>
          )}
          <div className="space-y-2.5">
            {[...listed].reverse().map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {workoutSessions.length === 0 && (
        <p className="text-center text-sm text-charcoal-faint py-8">
          No logged workouts yet — finish a routine to see it here.
        </p>
      )}

      {/* WO9: the app's standard date picker (as on Home and Food), with a dot
          under each day that has a logged session. */}
      <CalendarPickerSheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={day ?? today}
        today={today}
        markers={sessionDays}
        onSelect={setDay}
      />
    </div>
  );
}

// V8 (QA 8.0): "Logged sessions should have completion date alongside
// total time taken and total volume" + "Remove the ability to add a note
// in the logged sessions and instead show notes written during the routine
// previously" — per-set notes come from SetOptionsSheet, captured live
// during the workout, not a free-text box added after the fact here.
const SessionRow: React.FC<{
  session: WorkoutSession;
  expanded: boolean;
  onToggle: () => void;
}> = ({ session, expanded, onToggle }) => {
  const completionDate = new Date(`${session.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card padded={false} className="overflow-hidden">
      <button onClick={onToggle} className="tap w-full flex items-center justify-between p-4 text-left">
        <div>
          <p className="text-sm font-semibold text-charcoal">{session.routineName}</p>
          <p className="text-xs text-charcoal-faint">
            {completionDate} · {formatDuration(session.durationSec)} · {session.totalVolumeKg.toLocaleString()} kg volume
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-charcoal-faint shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-charcoal-faint shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-charcoal/[0.06] px-4 py-3 animate-fade-slide-up">
          <SessionDetail session={session} />
        </div>
      )}
    </Card>
  );
};
