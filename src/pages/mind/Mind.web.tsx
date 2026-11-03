import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Apple, BookOpen, Check, ChevronRight, ClipboardList, Dumbbell, Flame, Flower2, Footprints, Leaf, Trophy } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { useWebLayout } from "../../components/web/useWebLayout";
import { earnedCount, visibleAchievements } from "../../services/achievements";
import { formatMeditationTime, isEmptySummary } from "../../services/meditation/logic";
import { habitBestStreak } from "../../services/habits/streak";
import { habitShade } from "../../services/habits/colours";
import { groupCoachHabits } from "../../services/habits";
import { journalStreak as journalStreakFrom } from "../../services/journal/streak";
import { habitIcon } from "../../utils/icons";
import { StreakLeaf } from "../../components/icons/StreakLeaf";
import { CoachAvatar } from "../../components/workout/CoachAvatar";
import { coachTone } from "../workout/coachColors";
import type { HabitItem, Streak } from "../../types";
import MindMobile, { useCoachHabits } from "./Mind";
import { t, tk, tn } from "../../i18n/core";

const AUTO_LABEL: Record<NonNullable<Streak["category"]>, string> = {
  logging: tk("Logging"),
  movement: tk("Movement"),
  workout: tk("Workout"),
  nutrition: tk("Nutrition"),
};
const AUTO_ICON: Record<NonNullable<Streak["category"]>, typeof Flame> = {
  logging: ClipboardList,
  movement: Footprints,
  workout: Dumbbell,
  nutrition: Apple,
};

const CSS = `
.mind-web-tile { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.mind-web-tile:hover { transform: scale(0.99); }
.mind-web-tile:active { transform: scale(0.97); }
.mind-web-tile:focus-visible, .mind-web-link:focus-visible, .mind-web-check:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.mind-web-row:hover { background: #FAF8FE; }
`;

const caps: React.CSSProperties = { fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" };
const ruleSoft = "rgba(36,31,27,0.08)";

/** The teal streak count: the handover's filled leaf and the number. */
const Count: React.FC<{ n: number; size: 22 | 20 }> = ({ n, size }) => (
  <span className="flex items-center" style={{ gap: 5 }}>
    <StreakLeaf variant="filled" height={20} className="text-team-teal-deep" />
    <span style={{ fontSize: size, lineHeight: "22px", fontWeight: 800, color: "#4F7F78", fontVariantNumeric: "tabular-nums" }}>{n}</span>
  </span>
);

/** The 26 check: done #4F7F78 with a white tick, open a 1px #6F9993-at-35% ring. */
const CheckDot: React.FC<{ done: boolean }> = ({ done }) => (
  <span
    className="grid place-items-center"
    style={{ width: 26, height: 26, borderRadius: 999, boxSizing: "border-box", flex: "none", background: done ? "#4F7F78" : "transparent", border: done ? "none" : "1px solid rgba(111,153,147,0.35)" }}
  >
    {done && <Check size={14} strokeWidth={3} color="#FFFFFF" aria-hidden />}
  </span>
);

/** The Habits header's 40 ring: done today of all habits (white track, #AEA1DC). */
const Ring: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const r = 21.5;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <span className="relative" style={{ width: 40, height: 40, flex: "none" }}>
      <svg viewBox="0 0 48 48" width={40} height={40} style={{ transform: "rotate(-90deg)", display: "block" }} aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" stroke="#FFFFFF" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="#AEA1DC" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center" style={{ fontSize: 12, fontWeight: 800, color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>
        {done}/{total}
      </span>
    </span>
  );
};

/**
 * Website viewport v1, WC-MI Mind hub (WC-MI Mind Web v5, screen "hub",
 * literal values). A 64 header (title 24/32 600, the line 13/20 beside it),
 * then, centred at most 1280 wide: three 104 tiles (Journal, Meditation,
 * Achievements: 64 wells r18, title 17/24 700, line 13/20), and under them an
 * 8 : 4 grid: the Habits card (1px #AEA1DC, r20; its header with the done ring
 * and View all habits, 56 rows with 36 tiles, the label 17/24 600 and the
 * 128 teal strip with the count and the check) beside the Day streak card
 * (#F0EDF9) and the Auto-tracked card (52 rows, always open on web). Same data
 * as the mobile hub; the sections (/app/mind/:section) keep their mobile
 * layout.
 */
export default function MindWeb() {
  const { section } = useParams<{ section?: string }>();
  if (section) return <MindMobile />;
  return <MindHubWeb />;
}

function MindHubWeb() {
  const { streaks, habits, toggleHabit, journalEntries, achievements, meditationSummary, refreshAchievements, today, habitsLoading, journalLoading, accessibility, authUserId } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const hideNumbers = useHideNumbers();
  const hc = !!accessibility.highContrast;
  const coach = useCoachHabits(authUserId, habits.length);
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;

  // As the mobile hub: opening Mind evaluates the achievements.
  useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  const counts = earnedCount(visibleAchievements(achievements ?? [], hideNumbers));
  const autoStreaks = hideNumbers ? [] : streaks.filter((s) => s.auto);
  const writtenToday = journalEntries.some((e) => e.date === today);
  const doneHabits = habits.filter((h) => h.done).length;
  const journalDays = journalStreakFrom(journalEntries.map((e) => e.date), today);
  const lead = habits.reduce<HabitItem | undefined>((best, h) => (!best || h.streakDays > best.streakDays ? h : best), undefined);
  const leadBest = lead ? Math.max(habitBestStreak(lead.doneDates ?? []), lead.streakDays) : 0;
  const LeadIcon = lead ? habitIcon[lead.icon] : Leaf;
  const { groups: coachGroups, own } = groupCoachHabits(habits, coach.coachOf);

  const meditationLine =
    meditationSummary && !isEmptySummary(meditationSummary)
      ? meditationSummary.secondsToday > 0
        ? t("{time} today", { time: formatMeditationTime(meditationSummary.secondsToday) })
        : t("{time} this week", { time: formatMeditationTime(meditationSummary.secondsThisWeek) })
      : t("Start a session");

  const tiles = [
    {
      to: "/app/mind/journal",
      title: t("Journal"),
      line: journalLoading ? null : hideNumbers ? (writtenToday ? t("Written today") : t("Not written today")) : tn(journalDays, "{n} day", "{n} days"),
      Icon: BookOpen,
      fill: "#FAF9FD",
      well: "#E9E6F6",
      ink: "#5F5093",
    },
    { to: "/app/mind/meditation", title: t("Meditation"), line: meditationLine, Icon: Flower2, fill: "#F7F9F9", well: "#E1EAE9", ink: "#4F7F78" },
    {
      to: "/app/mind/achievements",
      title: t("Achievements"),
      line: achievements === null ? null : t("{a} of {b}", { a: counts.earned, b: counts.total }),
      Icon: Trophy,
      fill: "#FCF9F2",
      well: "#F6EBD6",
      ink: "#A67C2E",
    },
  ];

  const habitRow = (h: HabitItem, divider: boolean) => {
    const Icon = habitIcon[h.icon];
    const shade = habitShade(h.colour, dark, hc);
    return (
      <div key={h.id} data-mind-habit className="mind-web-row flex items-stretch" style={{ height: 56, flex: "none" }}>
        <div className="relative flex items-center" style={{ flex: 1, minWidth: 0, gap: 12, paddingInlineStart: 16, paddingInlineEnd: 10 }}>
          {divider && <span aria-hidden className="absolute" style={{ insetInlineStart: 64, insetInlineEnd: 0, top: 0, height: 1, background: "rgba(36,31,27,0.05)" }} />}
          <span className="grid place-items-center" style={{ width: 36, height: 36, borderRadius: 10, flex: "none", background: shade ? shade.tile : "#F0EDF9" }}>
            <Icon size={20} strokeWidth={1.75} color={shade ? shade.ink : "#7D6BB5"} aria-hidden />
          </span>
          <span title={h.label} className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
            {h.label}
          </span>
        </div>
        <div className="flex items-center justify-end" style={{ width: 128, flex: "none", gap: 12, paddingInlineEnd: 16, background: "rgba(111,153,147,0.12)" }}>
          {!hideNumbers && <Count n={h.streakDays} size={22} />}
          <button
            type="button"
            onClick={() => toggleHabit(h.id)}
            aria-label={h.done ? t("{habit}, today: done", { habit: h.label }) : t("{habit}, today: not done", { habit: h.label })}
            aria-pressed={h.done}
            className="mind-web-check"
            style={{ borderRadius: 999, display: "flex" }}
          >
            <CheckDot done={h.done} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div data-web-mind>
      <style href="mind-web" precedence="default">{CSS}</style>
      <header className="sticky top-0 flex items-center bg-cream" style={{ zIndex: 30, height: 64, boxSizing: "border-box", gap: 12, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <div className="flex items-baseline" style={{ flex: 1, minWidth: 0, gap: 14 }}>
          <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
            {t("Mind")}
          </h1>
          <p className="whitespace-nowrap" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
            {t("Habits, journalling & meditation")}
          </p>
        </div>
      </header>

      <div className="flex flex-col" style={{ maxWidth: 1280, margin: "0 auto", padding: `24px ${margin}px`, boxSizing: "border-box", gap: 20 }}>
        <div data-mind-tiles style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
          {tiles.map((x) => (
            <button
              key={x.to}
              type="button"
              onClick={() => navigate(x.to)}
              className="mind-web-tile flex items-center text-start"
              style={{ minWidth: 0, height: 104, boxSizing: "border-box", borderRadius: 18, border: `1px solid ${ruleSoft}`, gap: 16, padding: "0 20px", background: x.fill }}
            >
              <span className="grid place-items-center" style={{ width: 64, height: 64, borderRadius: 18, flex: "none", background: x.well }}>
                <x.Icon size={30} strokeWidth={1.5} color={x.ink} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                  {x.title}
                </span>
                <span className="block whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>
                  {x.line ?? (
                    <>
                      <span aria-hidden className="inline-block align-middle bg-cream-soft" style={{ width: 48, height: 11, borderRadius: 4 }} />
                      <span className="sr-only">{t("Loading")}</span>
                    </>
                  )}
                </span>
              </span>
              <ChevronRight size={16} color="#8C8378" className="shrink-0 rtl:-scale-x-100" aria-hidden />
            </button>
          ))}
        </div>

        <div data-mind-grid style={{ display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" }}>
          <section data-mind-habits className="flex flex-col overflow-hidden" style={{ minWidth: 0, borderRadius: 20, border: "1px solid #AEA1DC", background: "#FFFFFF" }}>
            <div className="flex items-center" style={{ flex: "none", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${ruleSoft}`, background: "rgba(174,161,220,0.08)" }}>
              <h2 style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("Habits")}</h2>
              <Ring done={doneHabits} total={habits.length} />
              <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                {t("Habits done today")}
              </span>
              <button
                type="button"
                onClick={() => navigate("/app/mind/habits")}
                className="mind-web-link flex items-center whitespace-nowrap"
                style={{ marginInlineStart: "auto", gap: 2, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}
              >
                {t("View all habits")}
                <ChevronRight size={16} color="#7D6BB5" className="rtl:-scale-x-100" aria-hidden />
              </button>
            </div>
            {coachGroups.map((g, gi) => {
              const info = coach.coaches[g.professionalId];
              const name = info?.name ?? t("Your coach");
              return (
                <React.Fragment key={g.professionalId}>
                  <div className="flex items-center" style={{ gap: 8, padding: "10px 16px", borderBottom: `1px solid ${ruleSoft}`, borderTop: gi > 0 ? `1px solid ${ruleSoft}` : undefined, background: "rgba(174,161,220,0.08)" }}>
                    <CoachAvatar name={name} avatarUrl={info?.avatarUrl} size={20} tone={coachTone(gi)} />
                    <span className="truncate" style={{ ...caps, color: "#8C8378", minWidth: 0 }}>
                      {t("From {name}", { name })}
                    </span>
                  </div>
                  {g.habits.map((h, i) => habitRow(h, i > 0))}
                </React.Fragment>
              );
            })}
            {coachGroups.length > 0 && own.length > 0 && <div aria-hidden style={{ height: 1, background: ruleSoft }} />}
            {own.map((h, i) => habitRow(h, i > 0))}
            {habits.length === 0 && habitsLoading && (
              <div aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-stretch" style={{ height: 56 }}>
                    <div className="flex items-center" style={{ flex: 1, gap: 12, paddingInlineStart: 16 }}>
                      <span className="bg-cream-soft" style={{ width: 36, height: 36, borderRadius: 10 }} />
                      <span className="bg-cream-soft" style={{ width: 160, height: 14, borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 128, background: "rgba(111,153,147,0.12)" }} />
                  </div>
                ))}
              </div>
            )}
            {habits.length === 0 && !habitsLoading && (
              <button type="button" onClick={() => navigate("/app/mind/habits")} className="flex items-center justify-center" style={{ padding: "24px 16px", fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>
                {t("No habits yet.")}{" "}<b style={{ color: "#7D6BB5" }}>{t("Add one")}</b>
              </button>
            )}
          </section>

          <div className="flex flex-col" style={{ minWidth: 0, gap: 24 }}>
            {!hideNumbers && (
              <div data-mind-streak className="flex flex-col" style={{ borderRadius: 20, background: "#F0EDF9", padding: "16px 20px 18px", boxSizing: "border-box", gap: 12 }}>
                <p style={{ ...caps, margin: 0, color: "#7D6BB5" }}>{t("Day streak")}</p>
                <div className="flex items-center" style={{ gap: 14 }}>
                  <span className="grid place-items-center" style={{ width: 48, height: 48, borderRadius: 14, background: "#FFFFFF", flex: "none" }}>
                    <LeadIcon size={24} strokeWidth={1.75} color="#4F7F78" aria-hidden />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="flex items-baseline whitespace-nowrap" style={{ margin: 0, gap: 6 }}>
                      <span style={{ fontSize: 32, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.03em", color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>{lead?.streakDays ?? 0}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#5B5349" }}>{tn(lead?.streakDays ?? 0, "day", "days")}</span>
                    </p>
                    <p className="truncate" style={{ margin: "2px 0 0", fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#7D6BB5" }}>
                      {lead ? lead.label : t("No habits yet")}
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                  {t("Personal best")} · <b style={{ color: "#241F1B" }}>{tn(leadBest, "{n} day", "{n} days")}</b>
                </p>
              </div>
            )}
            <div data-mind-auto className="flex flex-col overflow-hidden" style={{ minHeight: 0, borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", background: "#FFFFFF" }}>
              {autoStreaks.length > 0 && (
                <>
                  <div className="flex items-center" style={{ flex: "none", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${ruleSoft}`, background: "rgba(174,161,220,0.08)" }}>
                    <span className="whitespace-nowrap" style={{ ...caps, color: "#8C8378" }}>
                      {t("Auto-tracked")}
                    </span>
                    <span style={{ minWidth: 24, height: 20, padding: "0 7px", boxSizing: "border-box", borderRadius: 999, background: "#F0EDF9", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5", textAlign: "center" }}>
                      {autoStreaks.length}
                    </span>
                  </div>
                  {autoStreaks.map((s, i) => {
                    const Icon = s.category ? AUTO_ICON[s.category] : Flame;
                    const label = s.category ? t(AUTO_LABEL[s.category]) : s.label.replace(/\s*streak$/i, "");
                    return (
                      <div key={s.id} className="flex items-center" style={{ flex: "none", height: 52, boxSizing: "border-box", gap: 12, padding: "0 16px", borderTop: i ? "0.5px solid rgba(36,31,27,0.08)" : "none" }}>
                        <span className="grid place-items-center" style={{ width: 32, height: 32, borderRadius: 9, background: "#F0EDF9", flex: "none" }}>
                          <Icon size={16} strokeWidth={1.75} color="#7D6BB5" aria-hidden />
                        </span>
                        <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "#241F1B" }}>
                          {label}
                        </span>
                        {/* No check: auto streaks are not ticked by hand, and the app has no "done today" for them (as on mobile). */}
                        <Count n={s.days} size={20} />
                      </div>
                    );
                  })}
                </>
              )}
              <p style={{ margin: 0, flex: "none", padding: "12px 16px 14px", borderTop: autoStreaks.length > 0 ? `1px solid ${ruleSoft}` : "none", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {hideNumbers ? t("To track something new, add a habit.") : t("Auto streaks count from what you log across the app. To track something new, add a habit.")}
              </p>
              {coachGroups.map((g) => {
                const name = coach.coaches[g.professionalId]?.name ?? t("your coach");
                const Name = name.charAt(0).toUpperCase() + name.slice(1);
                return (
                  <p key={g.professionalId} style={{ margin: 0, padding: "0 16px 14px", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {t("Habits from {name} can be ticked but not edited.", { name })}
                    {coach.sharedWith.has(g.professionalId) ? ` ${t("{name} sees your streaks.", { name: Name })}` : ""}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
