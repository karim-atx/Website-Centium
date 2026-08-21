import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Sparkline } from "../../components/health/Sparkline";
import { previousWorkouts } from "../../data/mockWorkouts";
import { formatDuration } from "../../services/workout";
import { TrendingUp, ChevronDown, ChevronUp, NotebookPen } from "lucide-react";
import type { WorkoutSession } from "../../types";

// A few seed volume points so the chart reads meaningfully before the user
// has logged real sessions in this prototype.
const seedVolumes = [4200, 4550, 4100, 4820, 5010, 4700];

export default function HistoryTab() {
  const { workoutSessions, updateWorkoutSessionNotes } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const volumePoints = [...seedVolumes, ...workoutSessions.map((s) => s.totalVolumeKg)];

  return (
    <div className="animate-fade-slide-up space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            Volume progression
          </p>
          <TrendingUp size={14} className="text-sohati" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-charcoal">
              {volumePoints[volumePoints.length - 1].toLocaleString()} kg
            </p>
            <p className="text-xs text-charcoal-faint">Last logged session</p>
          </div>
          <Sparkline values={volumePoints} color="#1B6B52" width={140} height={44} />
        </div>
      </Card>

      {workoutSessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Logged sessions
          </p>
          <div className="space-y-2.5">
            {[...workoutSessions].reverse().map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onSaveNotes={(notes) => updateWorkoutSessionNotes(s.id, notes)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
          Previous workouts
        </p>
        <div className="space-y-2.5">
          {previousWorkouts.map((w) => (
            <Card key={w.id} interactive className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">{w.name}</p>
                <p className="text-xs text-charcoal-faint">
                  {w.date} · {w.exerciseCount} exercises
                </p>
              </div>
              <span className="text-xs font-medium text-charcoal-faint">{w.durationMin}m</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const SessionRow: React.FC<{
  session: WorkoutSession;
  expanded: boolean;
  onToggle: () => void;
  onSaveNotes: (notes: string) => void;
}> = ({ session, expanded, onToggle, onSaveNotes }) => {
  const [noteDraft, setNoteDraft] = useState(session.notes ?? "");

  return (
    <Card padded={false} className="overflow-hidden">
      <button onClick={onToggle} className="tap w-full flex items-center justify-between p-4 text-left">
        <div>
          <p className="text-sm font-semibold text-charcoal">{session.routineName}</p>
          <p className="text-xs text-charcoal-faint">
            {formatDuration(session.durationSec)} · {session.totalVolumeKg.toLocaleString()} kg volume
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
          {/* Small notes header at the top of the expanded view, Strong-app-inspired */}
          <div className="flex items-start gap-2 mb-3 bg-cream-soft rounded-xl px-3 py-2.5">
            <NotebookPen size={14} className="text-charcoal-faint mt-0.5 shrink-0" />
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => onSaveNotes(noteDraft)}
              placeholder="Add a note about this workout…"
              className="flex-1 bg-transparent text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>

          <div className="divide-y divide-charcoal/[0.04]">
            {session.exercises.map((ex) => (
              <div key={ex.exerciseId} className="py-2">
                <p className="text-sm font-medium text-charcoal mb-1">{ex.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {ex.sets.map((s, i) => (
                    <span key={i} className="text-[11px] text-charcoal-faint">
                      {s.weightKg}kg × {s.reps}
                      {s.completed ? "" : " (skipped)"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
