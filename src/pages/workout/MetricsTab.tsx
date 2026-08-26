import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Sparkline } from "../../components/health/Sparkline";
import { OneRepMaxesSheet } from "../../components/workout/OneRepMaxesSheet";
import { TrendingUp, Dumbbell } from "lucide-react";

// V4: new "Metrics" tab per QA — statistical values like volume progression,
// plus a One Rep Maxes button.
const seedVolumes = [4200, 4550, 4100, 4820, 5010, 4700];

export default function MetricsTab() {
  const { workoutSessions, personalRecords } = useApp();
  const [oneRmOpen, setOneRmOpen] = useState(false);

  const volumePoints = [...seedVolumes, ...workoutSessions.map((s) => s.totalVolumeKg)];
  const prCount = Object.keys(personalRecords).length;

  return (
    <div className="animate-fade-slide-up space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            Volume progression
          </p>
          <TrendingUp size={14} className="text-primary" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-charcoal">
              {volumePoints[volumePoints.length - 1].toLocaleString()} kg
            </p>
            <p className="text-xs text-charcoal-faint">Last logged session</p>
          </div>
          <Sparkline values={volumePoints} color="#7D6BB5" width={140} height={44} />
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-pale flex items-center justify-center shrink-0">
            <Dumbbell size={16} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-sm font-bold text-charcoal">{prCount} tracked</p>
            <p className="text-[11px] text-charcoal-faint">One Rep Maxes</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOneRmOpen(true)}>
          View
        </Button>
      </Card>

      <p className="text-[11px] text-charcoal-faint text-center">
        More statistics — like weekly sets per muscle group — are coming to this prototype.
      </p>

      <OneRepMaxesSheet open={oneRmOpen} onClose={() => setOneRmOpen(false)} />
    </div>
  );
}
