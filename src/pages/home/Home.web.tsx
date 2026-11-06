import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, HeartHandshake, Sparkles, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import { StreaksBar } from "../../components/dashboard/StreaksBar";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { QuickActionsStack } from "../../components/dashboard/web/QuickActionsStack";
import { WidgetBoardWeb } from "../../components/dashboard/web/WidgetBoardWeb";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { AIVoiceLogger } from "../../components/food/AIVoiceLogger";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { PremiumBadge } from "../../components/premium/PremiumBadge";
import { NumberPlaceholder } from "../../components/ui/NumberPlaceholder";
import { ProReminders } from "../../components/client-forms/ProReminders";
import { StreakShieldsLine } from "../../components/premium/StreakShields";
import { WeeklyReviewCard } from "./review/WeeklyReviewCard";
import HomeMobile, { HomeBell } from "./Home";
import { t, tk } from "../../i18n/core";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return tk("Good morning");
  if (hour < 18) return tk("Good afternoon");
  return tk("Good evening");
}

const CSS = `
.home-web-press { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.home-web-press:hover { transform: scale(0.98); }
.home-web-press:active { transform: scale(0.96); }
.home-web-press:focus-visible, .home-web-x:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.home-web-x:hover { background: rgba(255,255,255,0.7); }
`;

/**
 * Website viewport v1, WC-HO Home (WC-HO Home Web v12 over HO Board v11,
 * literal values). A 64 header: the greeting 24/32 600 (-0.6px), the date
 * pill in a 260 box in the middle, the bell and the avatar (36) at the end.
 * Under it, centred at most 1280 wide with 24 (32 at 1440) side padding: the
 * professional reminders, then a 260-tall row with the streak card (half the
 * grid; the recovery-sensitive notice in its place while that notice is
 * new) beside Quick actions (65%) over "Connect with a professional" (35%),
 * then the Today board. Sheets open as the 440 side sheets, the calendar as
 * a popover under the pill. Business accounts keep their own dashboard.
 */
export default function HomeWeb() {
  const { user, recoverySensitive, recoveryModePending, recoverySensitiveIntroSeen, setRecoverySensitiveIntroSeen } = useApp();
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);

  // The business Dashboard (and its own web layout) lives in the mobile Home.
  if (user.accountType === "business") return <HomeMobile />;

  const margin = rail ? 24 : 32;
  const cols = rail ? 8 : 12;
  const half = rail ? 4 : 6;
  const recHero = recoverySensitive && !recoverySensitiveIntroSeen;
  const showStreaks = recoveryModePending || !recoverySensitive;
  const rightSpan = showStreaks || recHero ? half : cols;

  return (
    <div data-web-home>
      <style href="home-web" precedence="default">{CSS}</style>
      <header
        className="sticky top-0 flex items-center justify-between"
        style={{ zIndex: 30, height: 64, boxSizing: "border-box", gap: 24, padding: `0 ${margin}px`, background: "#FFFFFF", borderBottom: "1px solid rgba(36,31,27,0.06)" }}
      >
        <h1 className="flex items-center whitespace-nowrap" style={{ margin: 0, flex: 1, minWidth: 0, gap: 6, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
          <span className="min-w-0 overflow-hidden text-ellipsis">
            {t(greeting())}
            {t(", ")}
            {user.firstName}
          </span>
          <PremiumBadge />
        </h1>
        <div style={{ width: 260, flex: "none" }}>
          <DateSelector partB web />
        </div>
        <div className="flex items-center justify-end" style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <HomeBell />
          <button
            type="button"
            onClick={() => navigate("/app/profile")}
            title={t("Profile")}
            aria-label={t("Profile")}
            className="home-web-press flex items-center justify-center overflow-hidden"
            style={{ width: 36, height: 36, borderRadius: 999, flex: "none", color: "#3C6B65", fontWeight: 800, fontSize: 13, background: "linear-gradient(150deg,#C8E0DC,#A2C8C2)" }}
          >
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.firstName.charAt(0)}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: WEB_CONTENT_MAX, margin: "0 auto", padding: `24px ${margin}px`, boxSizing: "border-box" }}>
        {/* Task T: only for an older account with no date of birth (global rules: a card above the board). */}
        <DobPromptCard className="mb-6" />
        <ProReminders web={{ rail }} />
        {/* Round G3: the weekly review (nothing while the Premium switch is off). */}
        <WeeklyReviewCard className="mb-6" />

        <div className="flex flex-col" style={{ gap: 24 }}>
          <div data-home-hero style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridAutoRows: 260, gap: 24 }}>
            {showStreaks && (
              <div style={{ gridColumn: `span ${half}`, minWidth: 0, height: 260 }}>
                {recoveryModePending ? <NumberPlaceholder height={260} label={t("Streaks")} /> : <StreaksBar web={{ zoom: 1.38 }} />}
              </div>
            )}
            {recHero && (
              <div
                data-home-recovery
                className="relative flex flex-col"
                style={{ gridColumn: `span ${half}`, minWidth: 0, height: 260, boxSizing: "border-box", borderRadius: 20, background: "#F0EDF9", paddingBlock: 24, paddingInlineStart: 24, paddingInlineEnd: 56, gap: 14 }}
              >
                <span className="flex" style={{ flex: "none", width: 28, height: 28 }}>
                  <HeartHandshake size={28} color="#5F5093" aria-hidden />
                </span>
                <div className="flex flex-col justify-center" style={{ flex: 1, minHeight: 0, gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B", textWrap: "pretty" }}>{t("You're in a recovery-sensitive experience")}</h2>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 500, color: "#5B5349", textWrap: "pretty" }}>
                    {t("Calorie totals, weight, and streaks are hidden. You can turn this off anytime in your Profile. Nothing you've logged is ever lost.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoverySensitiveIntroSeen(true)}
                  aria-label={t("Dismiss")}
                  title={t("Dismiss")}
                  className="home-web-x absolute flex items-center justify-center"
                  style={{ top: 16, insetInlineEnd: 16, width: 32, height: 32, borderRadius: 999 }}
                >
                  <X size={16} color="#8C8378" aria-hidden />
                </button>
              </div>
            )}
            <div style={{ gridColumn: `span ${rightSpan}`, minWidth: 0, height: 260, display: "grid", gridTemplateRows: "minmax(0,65fr) minmax(0,35fr)", gap: 24 }}>
              <div style={{ minHeight: 0 }}>
                <QuickActionsStack
                  onLogFood={() => setAddFoodOpen(true)}
                  onLogWorkout={() => setCreateRoutineOpen(true)}
                  onAddMetric={() => setMetricOpen(true)}
                  onVoiceLog={() => setVoiceOpen(true)}
                />
              </div>
              <button
                type="button"
                data-home-connect
                onClick={() => navigate("/app/professionals")}
                className="home-web-press flex items-center justify-between text-start"
                style={{ minWidth: 0, minHeight: 0, boxSizing: "border-box", gap: 12, borderRadius: 15, background: "rgba(156,79,124,0.09)", padding: "12px 20px" }}
              >
                <span className="flex items-center min-w-0" style={{ gap: 14 }}>
                  <Sparkles size={20} color="#9C4F7C" className="shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("Connect with a professional")}</span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#8A5878" }}>{t("Dietitians, trainers, doctors & more")}</span>
                  </span>
                </span>
                <ArrowRight size={16} color="#9C4F7C" className="shrink-0" aria-hidden />
              </button>
            </div>
          </div>
          {/* Round G2: Premium's streak shields (nothing while the switch is off or without Premium). */}
          {showStreaks && !recoveryModePending && <StreakShieldsLine />}

          <WidgetBoardWeb rail={rail} onWaterClick={() => setMetricOpen(true)} />
        </div>
      </div>

      <AddFoodSheet open={addFoodOpen} onClose={() => setAddFoodOpen(false)} />
      <AIVoiceLogger open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <CreateRoutineSheet open={createRoutineOpen} onClose={() => setCreateRoutineOpen(false)} folderId={null} />
      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
    </div>
  );
}
