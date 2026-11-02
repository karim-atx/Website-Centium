import { useEffect, useState } from "react";
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
import { ChevronRight, ArrowRight, Sparkles, Store, HeartHandshake, X, Bell } from "lucide-react";
import { PremiumBadge } from "../../components/premium/PremiumBadge";
import { CLIENT_KINDS, fetchUnreadNotificationCount, unreadBadge } from "../../services/notifications";
import { useNavigate } from "react-router-dom";
import BusinessDashboard from "../marketplace/BusinessDashboard";
import { NumberPlaceholder } from "../../components/ui/NumberPlaceholder";
import { useIsDark } from "../../hooks/useIsDark";
import { useInboxRealtime } from "../../hooks/useInboxRealtime";
import { ProReminders } from "../../components/client-forms/ProReminders";

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

  // Release 3: a professional never renders this page. /app sends them to
  // /app/pro (ProHomeRedirect, J1), whose Home replaced their dashboard.
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
          {/* HO1.1 #1 (Home shell context): 19/28.5 700 ls -0.6. */}
          <h1 className="font-display text-[19px] leading-[28.5px] font-bold tracking-[-0.6px] text-charcoal flex items-center gap-1.5">
            {t(getGreeting())}, {user.firstName}
            {/* Round G1 (G9): the Premium badge reads my_premium(), not browser storage. */}
            <PremiumBadge />
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
        <HomeBell />
        <button
          onClick={() => navigate("/app/profile")}
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-team-teal-ink font-extrabold text-[13px] shrink-0 overflow-hidden"
          // Mobile v5.1 R3, dark mode: team-teal-ink turns light teal (#93C1B9), so
          // the avatar takes the teal #6F9993 as a 30% to 16% tint on the dark
          // surfaces (secondary.tint #293339), 5.9:1 to 6.5:1 under the initial.
          style={{ background: dark ? "linear-gradient(150deg,rgb(var(--th-2e3b3c)),#293339)" : "linear-gradient(150deg,rgb(var(--th-c8e0dc)),rgb(var(--th-a2c8c2)))" }}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName.charAt(0)
          )}
        </button>
        </div>
      </div>

      {/* QA 12.0: "When accessing the account for the first time [with
          recovery-sensitive on] an initial prompt should state you are in
          recovery sensitive mode... and that it can be toggled off in the
          settings whenever without losing any data." Shown once, here,
          since Home is the first screen a customer lands on after
          onboarding. */}
      {recoverySensitive && !recoverySensitiveIntroSeen && (
        // OURS-home-shell H3 (KEEP-SAFETY, copy unchanged): r15 card #F0EDF9
        // (dark #303141), HeartHandshake 17 #5F5093, title 13/700, body
        // 11/16 500 #5B5349, close X 15 with a 44 hit area.
        <div
          className="flex items-start gap-3 px-4 py-3.5 mb-5 animate-fade-slide-up"
          style={{ borderRadius: 15, background: dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f0edf9))" }}
        >
          <HeartHandshake size={17} className="shrink-0 mt-0.5" style={{ color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-charcoal mb-0.5">You're in a recovery-sensitive experience</p>
            <p className="text-[11px] leading-[16px] font-medium text-charcoal-soft">
              Calorie totals, weight, and streaks are hidden. You can turn this off anytime in your Profile. Nothing you've logged is ever lost.
            </p>
          </div>
          <button
            onClick={() => setRecoverySensitiveIntroSeen(true)}
            aria-label="Dismiss"
            className="tap relative text-charcoal-faint shrink-0"
          >
            <span aria-hidden className="absolute left-1/2 top-1/2 w-11 h-11 -translate-x-1/2 -translate-y-1/2" />
            <X size={15} />
          </button>
        </div>
      )}

      {/* Task T: only for an older account with no date of birth. */}
      <DobPromptCard className="mb-5 animate-fade-slide-up" />

      {/* Widget order per QA: Calendar (fixed, non-adjustable) > Streaks > Quick Actions > Your Health Today */}
      {/* OURS-home-shell H5: the HO1.1 pill's hairline border (X-09, both modes) and 44 hit areas. */}
      <DateSelector partB />

      {/* Release 3 · W7 (CU5, CU6, CU23, CU26), an addition: what the client's
          professionals are waiting on, between the date pill and the streak
          board, and the pop-up queue. Renders nothing when nothing is waiting. */}
      <ProReminders />

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
        className="tap w-full flex items-center justify-between gap-3 rounded-[15px] bg-berry/[0.09] px-3.5 py-3 mb-4 animate-fade-slide-up text-start"
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

/**
 * Market + Share 3.0 · W2 · D-36: the client Home's bell, beside the avatar,
 * opening C-MO.4.10 (/app/notifications). Not drawn: a 36 box with a 44 hit
 * area (.tap), lucide Bell 20 in the header's ink, and the board's 8 unread
 * dot #8F68F6 (C-MO.4.10's `n.dot`) when the inbox reports unread rows. It
 * reads my_unread_notification_count(CLIENT_KINDS) on mount (a member's kinds
 * only, so an owner's or a professional's rows never light it; Home remounts
 * on the way back from the page, so rows read there clear the dot); the
 * count goes in the label, "99+" at the reader's cap (unreadBadge). No dot
 * when the read fails. Live (Database 73ea87b, notifications in realtime):
 * an INSERT or UPDATE of one of the member's own client-kind rows re-reads
 * the count only (useInboxRealtime, coalesced), never the list.
 */
function HomeBell() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void fetchUnreadNotificationCount(CLIENT_KINDS).then((r) => {
      if (!cancelled && r.ok) setUnread(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);
  useInboxRealtime(authUserId, "bell", CLIENT_KINDS, () => setTick((t) => t + 1));
  return (
    <button
      type="button"
      onClick={() => navigate("/app/notifications")}
      aria-label={unread > 0 ? `Notifications, ${unreadBadge(unread)} unread` : "Notifications"}
      className="tap relative w-9 h-9 rounded-full flex items-center justify-center text-charcoal shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent"
    >
      <Bell size={20} strokeWidth={1.9} aria-hidden />
      {unread > 0 && <span aria-hidden className="absolute rounded-full" style={{ top: 6, insetInlineEnd: 7, width: 8, height: 8, background: "#8F68F6" }} />}
    </button>
  );
}
