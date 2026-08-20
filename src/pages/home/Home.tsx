import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { sumNutrition } from "../../services/nutrition";
import { healthMetrics, streaks } from "../../data/mockHealthData";
import { todaysWorkout } from "../../data/mockWorkouts";
import { NutritionCard } from "../../components/dashboard/NutritionCard";
import { StatCard } from "../../components/dashboard/StatCard";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { Card } from "../../components/ui/Card";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { AIVoiceLogger } from "../../components/food/AIVoiceLogger";
import { LogWorkoutSheet } from "../../components/workout/LogWorkoutSheet";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { Footprints, Moon, Scale, Dumbbell, Droplet, Flame, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, foodLog, workoutLog, water } = useApp();
  const navigate = useNavigate();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);

  const totals = useMemo(() => sumNutrition(foodLog), [foodLog]);

  const weight = healthMetrics.find((m) => m.type === "weight")!;
  const steps = healthMetrics.find((m) => m.type === "steps")!;
  const sleep = healthMetrics.find((m) => m.type === "sleep")!;

  const todaysWorkoutLog = workoutLog[workoutLog.length - 1];
  const completedGoals = [
    totals.calories > 0,
    steps.current >= 5000,
    !!todaysWorkoutLog?.completed,
    water >= 2000,
  ].filter(Boolean).length;

  const topStreak = streaks[1];

  return (
    <div>
      <div className="flex items-center justify-between mb-1 animate-fade-slide-up">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal">
            {getGreeting()}, {user.firstName} 👋
          </h1>
          <p className="text-charcoal-soft text-sm mt-1">Wednesday, August 20</p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="tap w-11 h-11 rounded-full bg-ember-pale flex items-center justify-center text-ember-dark font-bold shrink-0"
        >
          {user.firstName.charAt(0)}
        </button>
      </div>

      <Card className="mt-5 mb-5 !bg-charcoal !border-0 text-cream animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-cream/60 text-xs font-semibold uppercase tracking-wide mb-1">Your health today</p>
            <p className="font-display text-lg font-semibold">
              {completedGoals >= 4 ? "You're having a great day 🎉" : `${completedGoals} of 4 daily goals complete`}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-ember/20 text-ember-light rounded-full px-3 py-1.5 text-xs font-bold shrink-0">
            <Flame size={13} /> {topStreak.days}d
          </div>
        </div>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">Quick actions</p>
      <div className="mb-6">
        <QuickActions
          onLogFood={() => setAddFoodOpen(true)}
          onLogWorkout={() => setWorkoutOpen(true)}
          onAddMetric={() => setMetricOpen(true)}
          onVoiceLog={() => setVoiceOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <NutritionCard totals={totals} />

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Footprints}
            iconBg="#DCEAF8"
            iconColor="#4C8FD1"
            label="Steps today"
            value={steps.current.toLocaleString()}
            sub="Goal: 10,000"
            onClick={() => navigate("/health")}
          />
          <StatCard
            icon={Dumbbell}
            iconBg="#241F1B"
            iconColor="#FBF6EE"
            label={todaysWorkout.name}
            value={todaysWorkoutLog?.completed ? "Done ✓" : "Pending"}
            sub="Upper Body"
            onClick={() => navigate("/workout")}
          />
          <StatCard
            icon={Scale}
            iconBg="#DCEFE5"
            iconColor="#1B6B52"
            label="Weight"
            value={`${weight.current} kg`}
            trend={{ value: `${Math.abs(weight.trend)} kg`, positive: weight.trend >= 0, goodDirection: "down" }}
            onClick={() => navigate("/health")}
          />
          <StatCard
            icon={Moon}
            iconBg="#F1E0EB"
            iconColor="#9C4F7C"
            label="Sleep"
            value={`${Math.floor(sleep.current)}h ${Math.round((sleep.current % 1) * 60)}m`}
            sub="Last night"
            onClick={() => navigate("/health")}
          />
        </div>
      </div>

      <Card interactive onClick={() => navigate("/mind")} className="mb-4 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-pale flex items-center justify-center">
              <Droplet size={18} className="text-sky" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">Water intake</p>
              <p className="text-xs text-charcoal-soft">{(water / 1000).toFixed(1)}L / 2.5L</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-charcoal-faint" />
        </div>
      </Card>

      <Card interactive onClick={() => navigate("/mind")} className="mb-4 animate-fade-slide-up">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-ember" />
            <p className="text-sm font-semibold text-charcoal">{topStreak.label}</p>
          </div>
          <span className="text-xs font-bold text-ember-dark">{topStreak.days} days 🔥</span>
        </div>
        <p className="text-xs text-charcoal-faint">Keep it alive to unlock rewards from Sohati partners</p>
      </Card>

      <Card interactive onClick={() => navigate("/professionals")} className="mb-4 animate-fade-slide-up bg-gradient-to-br from-sohati to-sohati-dark !text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connect with a professional</p>
              <p className="text-xs text-white/70">Dietitians, trainers, doctors & more</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/70" />
        </div>
      </Card>

      <AddFoodSheet open={addFoodOpen} onClose={() => setAddFoodOpen(false)} />
      <AIVoiceLogger open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <LogWorkoutSheet open={workoutOpen} onClose={() => setWorkoutOpen(false)} />
      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
    </div>
  );
}
