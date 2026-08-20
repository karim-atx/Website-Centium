import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useApp } from "../../context/AppContext";
import { todaysWorkout } from "../../data/mockWorkouts";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import RoutinesTab from "./RoutinesTab";
import HistoryTab from "./HistoryTab";
import { Check, Clock } from "lucide-react";

type Tab = "today" | "routines" | "history";

export default function Workout() {
  const { workoutLog } = useApp();
  const [tab, setTab] = useState<Tab>("today");
  const [sessionOpen, setSessionOpen] = useState(false);

  const completedToday = workoutLog.some((w) => w.completed);

  return (
    <div>
      <PageHeader title="Workout" />

      <div className="flex gap-2 mb-5 animate-fade-slide-up">
        {(["today", "routines", "history"] as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "today" ? "Today" : t === "routines" ? "Routines" : "History"}
          </Chip>
        ))}
      </div>

      {tab === "today" && (
        <div className="animate-fade-slide-up">
          <Card className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                  Today's workout
                </p>
                <h2 className="font-display text-xl font-semibold text-charcoal">
                  {todaysWorkout.name}
                </h2>
              </div>
              {completedToday ? (
                <span className="flex items-center gap-1 text-xs font-bold text-sohati-dark bg-sohati-pale rounded-full px-3 py-1.5">
                  <Check size={12} /> Completed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-ember-dark bg-ember-pale rounded-full px-3 py-1.5">
                  <Clock size={12} /> Pending
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-faint mb-4">
              {todaysWorkout.exercises.length} exercises · ~{todaysWorkout.durationMin} min
            </p>
            <Button fullWidth onClick={() => setSessionOpen(true)}>
              {completedToday ? "Log Again" : "Start Workout"}
            </Button>
          </Card>

          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Exercises
          </p>
          <Card padded={false} className="divide-y divide-charcoal/[0.04]">
            {todaysWorkout.exercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{ex.name}</p>
                  <p className="text-xs text-charcoal-faint capitalize">{ex.category.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-charcoal">
                    {ex.sets} × {ex.reps}
                  </p>
                  <p className="text-xs text-charcoal-faint">{ex.weightKg} kg</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "routines" && <RoutinesTab />}
      {tab === "history" && <HistoryTab />}

      <WorkoutSessionSheet
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        routineId={todaysWorkout.id}
        routineName={todaysWorkout.name}
        exercises={todaysWorkout.exercises}
      />
    </div>
  );
}
