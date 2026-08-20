import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Sparkline } from "../../components/health/Sparkline";
import { previousWorkouts } from "../../data/mockWorkouts";
import { formatDuration } from "../../services/workout";
import { TrendingUp } from "lucide-react";

// A few seed volume points so the chart reads meaningfully before the user
// has logged real sessions in this prototype.
const seedVolumes = [4200, 4550, 4100, 4820, 5010, 4700];

export default function HistoryTab() {
  const { workoutSessions } = useApp();

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
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{s.routineName}</p>
                  <p className="text-xs text-charcoal-faint">
                    {formatDuration(s.durationSec)} · {s.totalVolumeKg.toLocaleString()} kg volume
                  </p>
                </div>
              </Card>
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
