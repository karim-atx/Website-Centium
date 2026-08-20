import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useApp } from "../../context/AppContext";
import { todaysWorkout, workoutPrograms, previousWorkouts, workoutCategories } from "../../data/mockWorkouts";
import { LogWorkoutSheet } from "../../components/workout/LogWorkoutSheet";
import { Check, Clock, TrendingUp, ChevronRight } from "lucide-react";

type Tab = "today" | "previous" | "programs";

export default function Workout() {
  const { workoutLog } = useApp();
  const [tab, setTab] = useState<Tab>("today");
  const [logOpen, setLogOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const completedToday = workoutLog.some((w) => w.completed);

  const filteredPrograms = category
    ? workoutPrograms.filter((p) => p.category === category)
    : workoutPrograms;

  return (
    <div>
      <PageHeader title="Workout" />

      <div className="flex gap-2 mb-5 animate-fade-slide-up">
        {(["today", "previous", "programs"] as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "today" ? "Today" : t === "previous" ? "Previous" : "Programs"}
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
            <Button fullWidth onClick={() => setLogOpen(true)}>
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

      {tab === "previous" && (
        <div className="space-y-2.5 animate-fade-slide-up">
          {previousWorkouts.map((w) => (
            <Card key={w.id} interactive className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">{w.name}</p>
                <p className="text-xs text-charcoal-faint">{w.date} · {w.exerciseCount} exercises</p>
              </div>
              <div className="flex items-center gap-2 text-charcoal-faint">
                <span className="text-xs font-medium flex items-center gap-1">
                  <TrendingUp size={12} /> {w.durationMin}m
                </span>
                <ChevronRight size={16} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "programs" && (
        <div className="animate-fade-slide-up">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All
            </Chip>
            {workoutCategories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.emoji} {c.label}
              </Chip>
            ))}
          </div>
          <div className="space-y-2.5">
            {filteredPrograms.map((p) => (
              <Card key={p.id} interactive>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-semibold text-charcoal text-sm">{p.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-cream-soft text-charcoal-soft rounded-full px-2.5 py-1">
                    {p.level}
                  </span>
                </div>
                <p className="text-xs text-charcoal-soft mb-2">{p.description}</p>
                <p className="text-[11px] text-charcoal-faint">
                  {p.exercises.length}+ exercises · ~{p.durationMin} min
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <LogWorkoutSheet open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
