import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { StreaksBar } from "../../components/dashboard/StreaksBar";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { WidgetBoard } from "../../components/dashboard/WidgetBoard";
import { Card } from "../../components/ui/Card";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { AIVoiceLogger } from "../../components/food/AIVoiceLogger";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { ChevronRight, Sparkles, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { todaysWorkout } from "../../data/mockWorkouts";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);

  const isPro = user.accountType === "professional";
  const isBusiness = user.accountType === "business";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 animate-fade-slide-up">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal">
            {getGreeting()}, {user.firstName} 👋
          </h1>
          <p className="text-charcoal-soft text-sm mt-1">
            {isPro ? "Your professional dashboard" : isBusiness ? "Your business dashboard" : "Here's your day"}
          </p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="tap w-11 h-11 rounded-full bg-ember-pale flex items-center justify-center text-ember-dark font-bold shrink-0"
        >
          {user.firstName.charAt(0)}
        </button>
      </div>

      {/* Widget order per QA: Calendar (fixed, non-adjustable) > Streaks > Quick Actions > Your Health Today */}
      <DateSelector />

      <StreaksBar />

      {(isPro || isBusiness) && (
        <Card
          interactive
          onClick={() => navigate(isPro ? "/professionals" : "/marketplace")}
          className="mb-5 bg-gradient-to-br from-charcoal to-charcoal/90 !text-cream animate-fade-slide-up"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                {isPro ? <Sparkles size={18} /> : <Store size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isPro ? "Manage your clients" : `${user.businessName || "Your business"} on Sohati`}
                </p>
                <p className="text-xs text-cream/60">
                  {isPro ? "View shared client data & requests" : "Business tools are an early preview"}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-cream/60" />
          </div>
        </Card>
      )}

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">Quick actions</p>
      <div className="mb-6">
        <QuickActions
          onLogFood={() => setAddFoodOpen(true)}
          onLogWorkout={() => setWorkoutOpen(true)}
          onAddMetric={() => setMetricOpen(true)}
          onVoiceLog={() => setVoiceOpen(true)}
        />
      </div>

      <div className="mb-6">
        <WidgetBoard />
      </div>

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
      <WorkoutSessionSheet
        open={workoutOpen}
        onClose={() => setWorkoutOpen(false)}
        routineId={todaysWorkout.id}
        routineName={todaysWorkout.name}
        exercises={todaysWorkout.exercises}
      />
      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
    </div>
  );
}
