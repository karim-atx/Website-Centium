import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { StreaksBar } from "../../components/dashboard/StreaksBar";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { WidgetBoard } from "../../components/dashboard/WidgetBoard";
import { Card } from "../../components/ui/Card";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { AIVoiceLogger } from "../../components/food/AIVoiceLogger";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { ChevronRight, ArrowRight, Sparkles, Store, Crown, HeartHandshake, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfessionalDashboard from "../professionals/ProfessionalDashboard";
import BusinessDashboard from "../marketplace/BusinessDashboard";
import { NumberPlaceholder } from "../../components/ui/NumberPlaceholder";
import { useIsDark } from "../../hooks/useIsDark";

// The streaks card's height, so its placeholder does not shift the page.
const STREAKS_PLACEHOLDER_HEIGHT = 176;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const {
    user,
    t,
    premiumPlan,
    recoverySensitive,
    recoveryModePending,
    recoverySensitiveIntroSeen,
    setRecoverySensitiveIntroSeen,
  } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Quick Actions' Workout starts a NEW routine: the create-routine flow.
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);

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
      {/* Iteration 6 "Team" §1.5: context-only, token restyle — smaller
          19px headline and the design's own teal avatar gradient in place
          of the flat teal-pale wash; greeting, premium crown and avatar are
          unchanged. Home update handoff (change 6): the "Here's your day"
          subtitle that used to sit under the greeting is removed. */}
      <div className="flex items-center justify-between mb-[11px] animate-fade-slide-up">
        <div>
          <h1 className="font-display text-[19px] font-bold tracking-[-0.03em] text-charcoal flex items-center gap-1.5">
            {t(getGreeting())}, {user.firstName}
            {premiumPlan && <Crown size={16} className="text-gold fill-gold shrink-0" aria-label="Centium Premium" />}
          </h1>
        </div>
        <button
          onClick={() => navigate("/app/profile")}
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-team-teal-ink font-extrabold text-[13px] shrink-0 overflow-hidden"
          // Mobile v5.1 R3, dark mode: team-teal-ink turns light teal (#93C1B9), so
          // the avatar takes the teal #6F9993 as a 30% to 16% tint on the dark
          // surfaces (secondary.tint #293339), 5.9:1 to 6.5:1 under the initial.
          style={{ background: dark ? "linear-gradient(150deg,#2E3B3C,#293339)" : "linear-gradient(150deg,#C8E0DC,#A2C8C2)" }}
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
              Calorie totals, weight, and streaks are hidden. You can turn this off anytime in your Profile. Nothing you've logged is ever lost.
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

      {/* Task T: only for an older account with no date of birth. */}
      <DobPromptCard className="mb-5 animate-fade-slide-up" />

      {/* Widget order per QA: Calendar (fixed, non-adjustable) > Streaks > Quick Actions > Your Health Today */}
      <DateSelector />

      {/* QA 12.0 recovery-sensitive experience: "Disable fasting, streaks,
          badges, and weight-loss prompts." */}
      {/* Task X follow-up: streaks wait for the account's recovery setting
          on a browser with no local copy of it. */}
      {recoveryModePending ? (
        <NumberPlaceholder height={STREAKS_PLACEHOLDER_HEIGHT} label="Streaks" className="mb-[13px]" />
      ) : (
        !recoverySensitive && <StreaksBar />
      )}

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

      <div className="mb-3.5">
        <QuickActions
          onLogFood={() => setAddFoodOpen(true)}
          onLogWorkout={() => setCreateRoutineOpen(true)}
          onAddMetric={() => setMetricOpen(true)}
          onVoiceLog={() => setVoiceOpen(true)}
        />
      </div>

      <div className="mb-[13px]">
        <WidgetBoard onWaterClick={() => setMetricOpen(true)} />
      </div>

      {/* Iteration 6 "Team" §1.5: context-only, token restyle — a lighter
          berry wash than the app's own berry-pale token, and ArrowRight in
          place of ChevronRight, per the literal dc.html markup. Still the
          one theme accent not already used elsewhere on Home (QA 12.0). */}
      <button
        onClick={() => navigate("/app/professionals")}
        className="tap w-full flex items-center justify-between gap-3 rounded-[15px] bg-berry/[0.09] px-3.5 py-3 mb-4 animate-fade-slide-up text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles size={16} className="text-berry shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-charcoal">Connect with a professional</p>
            <p className="text-[10px] font-medium text-team-rose-ink mt-0.5">Dietitians, trainers, doctors &amp; more</p>
          </div>
        </div>
        <ArrowRight size={15} className="text-berry shrink-0" />
      </button>

      <AddFoodSheet open={addFoodOpen} onClose={() => setAddFoodOpen(false)} />
      <AIVoiceLogger open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <CreateRoutineSheet open={createRoutineOpen} onClose={() => setCreateRoutineOpen(false)} folderId={null} />
      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
    </div>
  );
}
