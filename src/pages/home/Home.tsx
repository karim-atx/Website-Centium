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
import { GymPassesSheet } from "../../components/marketplace/GymPassesSheet";
import { ChevronRight, Sparkles, Store, Crown, HeartHandshake, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { todaysWorkout } from "../../data/mockWorkouts";
import ProfessionalDashboard from "../professionals/ProfessionalDashboard";
import BusinessDashboard from "../marketplace/BusinessDashboard";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, t, premiumPlan, recoverySensitive, recoverySensitiveIntroSeen, setRecoverySensitiveIntroSeen } =
    useApp();
  const navigate = useNavigate();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);
  const [gymPassesOpen, setGymPassesOpen] = useState(false);

  const isBusiness = user.accountType === "business";

  // V5 (QA 5.0): professionals no longer have a Home/Food/Workout/Health
  // dashboard of their own — "My Clients" is their main page instead,
  // same pattern already used by the Professionals/Explore routes.
  if (user.accountType === "professional") {
    return <ProfessionalDashboard />;
  }
  // V6 (QA 6.0): "remove everything that does not pertain to the business
  // owner related UI" — same treatment as professionals, a business account
  // lands on its own management dashboard instead of the personal
  // nutrition/workout/health tracking UI.
  if (isBusiness) {
    return <BusinessDashboard />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 animate-fade-slide-up">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.022em] text-charcoal flex items-center gap-1.5">
            {t(getGreeting())}, {user.firstName}
            {premiumPlan && <Crown size={16} className="text-gold fill-gold shrink-0" aria-label="Centium Premium" />}
          </h1>
          <p className="text-[13px] font-medium text-charcoal-faint mt-1.5">{t("Here's your day")}</p>
        </div>
        <button
          onClick={() => navigate("/app/profile")}
          className="tap w-11 h-11 rounded-full bg-teal-pale flex items-center justify-center text-teal-dark font-bold shrink-0 overflow-hidden"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName.charAt(0)
          )}
        </button>
      </div>

      {/* QA 12.0: "When accessing the account for the first time [with
          recovery-sensitive on] an initial prompt should state you are in
          recovery sensitive mode... and that it can be toggled off in the
          settings whenever without losing any data." Shown once, here,
          since Home is the first screen a customer lands on after
          onboarding. */}
      {recoverySensitive && !recoverySensitiveIntroSeen && (
        <div className="flex items-start gap-3 bg-primary-pale rounded-2xl px-4 py-3.5 mb-5 animate-fade-slide-up">
          <HeartHandshake size={17} className="text-primary-dark shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary-deep-text mb-0.5">You're in a recovery-sensitive experience</p>
            <p className="text-xs text-charcoal-soft leading-relaxed">
              Calorie totals, weight, and streaks are hidden. You can turn this off anytime in your Profile
              — nothing you've logged is ever lost.
            </p>
          </div>
          <button
            onClick={() => setRecoverySensitiveIntroSeen(true)}
            aria-label="Dismiss"
            className="tap text-charcoal-faint shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Widget order per QA: Calendar (fixed, non-adjustable) > Streaks > Quick Actions > Your Health Today */}
      <DateSelector />

      {/* QA 12.0 recovery-sensitive experience: "Disable fasting, streaks,
          badges, and weight-loss prompts." */}
      {!recoverySensitive && <StreaksBar />}

      {isBusiness && (
        <Card
          interactive
          onClick={() => navigate("/app/marketplace")}
          className="mb-5 bg-gradient-to-br from-charcoal to-charcoal/90 !text-cream animate-fade-slide-up"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Store size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">{user.businessName || "Your business"} on Centium</p>
                <p className="text-xs text-cream/60">Business tools are an early preview</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-cream/60" />
          </div>
        </Card>
      )}

      <p className="section-label text-charcoal-faint mb-3">Quick actions</p>
      <div className="mb-6">
        <QuickActions
          onLogFood={() => setAddFoodOpen(true)}
          onLogWorkout={() => setWorkoutOpen(true)}
          onAddMetric={() => setMetricOpen(true)}
          onVoiceLog={() => setVoiceOpen(true)}
        />
      </div>

      <div className="mb-6">
        <WidgetBoard onWaterClick={() => setMetricOpen(true)} onGymPassesClick={() => setGymPassesOpen(true)} />
      </div>

      {/* QA 12.0: "Connect with a professional should have a color to make
          it stand out... stick to the overall theme but have a different
          color than the ones found in the homepage" — berry is the one
          theme token not already used by another Home widget (primary/sky/
          teal/gold all are), so it reads as its own distinct accent. */}
      <button
        onClick={() => navigate("/app/professionals")}
        className="tap w-full flex items-center justify-between gap-3 rounded-2xl bg-berry-pale px-4 py-3.5 mb-4 animate-fade-slide-up text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles size={16} className="text-berry shrink-0" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-charcoal">Connect with a professional</p>
            <p className="text-[11.5px] font-medium text-charcoal-soft">Dietitians, trainers, doctors &amp; more</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-berry shrink-0" />
      </button>

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
      <GymPassesSheet open={gymPassesOpen} onClose={() => setGymPassesOpen(false)} />
    </div>
  );
}
