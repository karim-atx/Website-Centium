import React, { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { StreakEditSheet } from "../../components/mind/StreakEditSheet";
import { AddStreakSheet } from "../../components/mind/AddStreakSheet";
import HabitsTab from "./HabitsTab";
import JournalTab from "./JournalTab";
import AchievementsTab from "./AchievementsTab";
import MeditationPage from "./MeditationPage";
import { earnedCount } from "../../services/achievements";
import { formatMeditationTime, isEmptySummary } from "../../services/meditation/logic";
import { habitBestStreak } from "../../services/habits/streak";
import { habitIcon } from "../../utils/icons";
import {
  Apple,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Pencil,
  Plus,
  Trophy,
} from "lucide-react";
import type { HabitItem, Streak } from "../../types";
import clsx from "clsx";
import { journalStreak as journalStreakFrom } from "../../services/journal/streak";

type Section = "habits" | "journal" | "achievements" | "meditation";
const SECTIONS: readonly Section[] = ["habits", "journal", "achievements", "meditation"];

// The sub-page header, for each section.
const SECTION_TITLE: Record<Section, string> = {
  habits: "Habits",
  journal: "Journal",
  achievements: "Achievements",
  meditation: "Meditation",
};
const SECTION_SUBTITLE: Record<Section, string> = {
  habits: "Track your daily habits",
  journal: "Your thoughts, logged",
  achievements: "What you've earned so far",
  meditation: "Breathing, stretching & yoga",
};

const AUTO_ICON: Record<NonNullable<Streak["category"]>, typeof Flame> = {
  logging: ClipboardList,
  movement: Footprints,
  workout: Dumbbell,
  nutrition: Apple,
};

const sectionLabel = "text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]";

/** MO1.1 hero ring: done-today out of all habits. */
function DoneRing({ done, total }: { done: number; total: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <span className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="stroke-cream-card" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold text-charcoal tabular-nums">
        {done}/{total}
      </span>
    </span>
  );
}

// Mind, mobile v5.1 MO1.1. The hub is /app/mind; Habits, Journal,
// Achievements and Meditation are sub-routes (/app/mind/<section>), so they
// can be linked to and the browser's back button leaves them (A7).
//
// WHAT THE DESIGN DROPS, AND WHERE IT WENT (decisions A1, A2, A8):
// - Manual streaks stay, in "Your streaks" below the habits, with Add streak,
//   tap-to-log, edit and the burst. The four auto streaks are the collapsible
//   "Auto-tracked" group, without a check (they can't be ticked by hand).
// - The paging Habits widget stays on Home; points and tier stay on the
//   Achievements page.
// - The Meditation tile keeps the live minutes when there are any.
// LIGHT MODE keeps the old tiles' colours (gold Journal and Achievements, teal
// Meditation); the hero is primary-pale, the streak strip teal-pale, and the
// checks lavender (A5). The flame stays until a leaf exists (A6).
export default function Mind() {
  const {
    streaks,
    habits,
    toggleHabit,
    journalEntries,
    achievements,
    meditationSummary,
    refreshAchievements,
    noteFeatureMilestone,
    today,
    habitsLoading,
    journalLoading,
  } = useApp();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section?: string }>();
  const section = SECTIONS.find((s) => s === sectionParam) ?? null;
  const [editingStreak, setEditingStreak] = useState<Streak | null>(null);
  const [addStreakOpen, setAddStreakOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  // §7.2: which user-added streak just incremented, so its row can fire
  // the one-shot celebration burst — never on the four auto-derived
  // streaks, which can't be logged by hand.
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const burstNonce = React.useRef(0);

  // OPENING MIND EVALUATES. my_achievements() awards before it returns, so this
  // is the sweep for anything earned on a screen that does not itself trigger
  // one — and the tile below cannot show a count until something has read it.
  // Debounced in the context, so arriving here alongside another trigger costs
  // one call rather than two.
  React.useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  // Explorer milestone: "Quiet corner". Recorded the first time the journal is
  // actually opened, not on every visit to Mind — the badge is for finding it.
  React.useEffect(() => {
    if (section === "journal") noteFeatureMilestone("mind_journal");
  }, [section, noteFeatureMilestone]);

  // An unknown sub-route goes to the hub rather than rendering nothing.
  if (sectionParam && !section) return <Navigate to="/app/mind" replace />;

  const achievementCounts = earnedCount(achievements ?? []);

  // A user-added streak's `days` mirrors its linked habit's `streakDays`
  // (see AppContext) — "tap to log" means checking off today's habit, not
  // editing the streak's label/goal, which lives behind the pencil.
  const logStreak = (s: Streak) => {
    if (!s.habitId) return;
    const habit = habits.find((h) => h.id === s.habitId);
    if (!habit) return;
    const wasDone = habit.done;
    toggleHabit(habit.id);
    if (!wasDone) {
      burstNonce.current += 1;
      setBurstKey(`${s.id}-b${burstNonce.current}`);
    }
  };

  const autoStreaks = streaks.filter((s) => s.auto);
  const ownStreaks = streaks.filter((s) => !s.auto);
  const doneHabits = habits.filter((h) => h.done).length;
  // Local calendar days, from the app's local today (not UTC).
  const journalDays = journalStreakFrom(journalEntries.map((e) => e.date), today);
  // MO1.1 rule: the hero is the habit with the highest current streak.
  const lead: HabitItem | undefined = habits.reduce<HabitItem | undefined>(
    (best, h) => (!best || h.streakDays > best.streakDays ? h : best),
    undefined
  );
  const leadBest = lead ? Math.max(habitBestStreak(lead.doneDates ?? []), lead.streakDays) : 0;
  const LeadIcon = lead ? habitIcon[lead.icon] : null;

  const meditationLine =
    meditationSummary && !isEmptySummary(meditationSummary)
      ? meditationSummary.secondsToday > 0
        ? `${formatMeditationTime(meditationSummary.secondsToday)} today`
        : `${formatMeditationTime(meditationSummary.secondsThisWeek)} this week`
      : "Start a session";

  if (section) {
    return (
      <div>
        <PageHeader
          title={SECTION_TITLE[section]}
          subtitle={SECTION_SUBTITLE[section]}
          showBack
          onBack={() => navigate("/app/mind")}
        />
        {section === "habits" && <HabitsTab />}
        {section === "journal" && <JournalTab />}
        {section === "achievements" && <AchievementsTab />}
        {section === "meditation" && <MeditationPage />}
      </div>
    );
  }

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. MO1.1 #1. */}
      <div className="flex items-start gap-2.5 mb-[13px]">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ml-1.5 mt-0.5 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Mind</p>
          <p className="mt-[3px] text-[11px] text-charcoal-tertiary">Habits, journalling &amp; meditation</p>
        </div>
      </div>

      <div className="animate-fade-slide-up">
        {/* MO1.1 #2: three equal tiles. The fills are the old tiles'. */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Tile
            onClick={() => navigate("/app/mind/journal")}
            fill="rgba(217,164,65,.14)"
            well="rgba(217,164,65,.22)"
            icon={<BookOpen size={28} strokeWidth={1.5} className="text-team-gold-deep" />}
            title="Journal"
            line={
              journalLoading ? (
                <LineSkeleton />
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Flame size={11} className="text-team-gold-ink dark:text-team-gold-ink" />
                  {journalDays} {journalDays === 1 ? "day" : "days"}
                </span>
              )
            }
          />
          <Tile
            onClick={() => navigate("/app/mind/meditation")}
            fill="rgb(var(--th-a2c8c2) / .18)"
            well="rgb(var(--th-a2c8c2) / .3)"
            // MO1.1 icons list: Flower2 28/1.5, in the tile's teal as before.
            icon={<Flower2 size={28} strokeWidth={1.5} style={{ color: "rgb(var(--c-teal-dark))" }} />}
            title="Meditation"
            line={meditationLine}
          />
          {/* NOTHING IS SHOWN UNTIL SOMETHING HAS BEEN READ. A count of "0 of
              0" before the first call would be a number nobody earned. */}
          <Tile
            onClick={() => navigate("/app/mind/achievements")}
            fill="rgba(217,164,65,.15)"
            well="rgba(217,164,65,.24)"
            icon={<Trophy size={28} strokeWidth={1.5} className="text-team-gold-deep" />}
            title="Achievements"
            line={achievements === null ? <LineSkeleton /> : `${achievementCounts.earned} of ${achievementCounts.total}`}
          />
        </div>

        {/* MO1.1 #3: the hero, the habit with the highest current streak. */}
        {lead && LeadIcon ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-primary-pale px-4 py-3.5 mb-6">
            <span className="w-10 h-10 rounded-xl bg-cream-card flex items-center justify-center shrink-0">
              <LeadIcon size={22} strokeWidth={1.75} className="text-team-teal-deep dark:text-team-teal-ink" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[26px] leading-none font-extrabold tracking-[-0.03em] text-charcoal tabular-nums">{lead.streakDays}</span>
                <span className="text-[12px] font-semibold text-charcoal-soft">{lead.streakDays === 1 ? "day" : "days"}</span>
                <span className="text-[12px] font-bold text-primary-dark truncate">{lead.label}</span>
              </p>
              <p className="mt-1.5 text-[10.5px] text-charcoal-muted dark:text-charcoal-faint">
                Personal best · <span className="font-bold text-charcoal">{leadBest} {leadBest === 1 ? "day" : "days"}</span>
              </p>
            </div>
            <DoneRing done={doneHabits} total={habits.length} />
            <span className="text-[10.5px] leading-[1.3] text-charcoal-soft w-[64px] shrink-0">Habits done today</span>
          </div>
        ) : habitsLoading ? (
          // MO1.1 States, Loading: a skeleton block where the hero sits
          // (358 × 84, r20), in surface.soft.
          <div aria-hidden className="h-[84px] rounded-[20px] bg-cream-soft mb-6" />
        ) : null}

        {/* MO1.1 #4–6: Today, with the Auto-tracked group and the habits. */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className={sectionLabel}>Today</p>
          <button
            onClick={() => navigate("/app/mind/habits")}
            className="tap flex items-center gap-0.5 text-[12px] font-bold text-primary-dark"
          >
            View all habits <ChevronRight size={13} />
          </button>
        </div>
        <div className="rounded-[20px] border border-charcoal/[0.11] dark:border-charcoal/[0.08] bg-cream-card overflow-hidden">
          {autoStreaks.length > 0 && (
            <>
              {/* The header's own full-width rule; the rows below it start
                  their dividers at the label column (MO1.1 #5, #6). */}
              <button
                onClick={() => setAutoOpen((v) => !v)}
                aria-expanded={autoOpen}
                className="tap w-full flex items-center gap-2 px-3.5 py-3 text-left border-b border-charcoal/[0.06]"
                style={{ background: "rgb(var(--th-aea1dc) / 0.08)" }}
              >
                <span className="text-[10px] font-bold tracking-[.14em] uppercase text-charcoal-muted dark:text-charcoal-faint">Auto-tracked</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-pale text-[10px] font-bold text-primary-dark flex items-center justify-center tabular-nums">
                  {autoStreaks.length}
                </span>
                <ChevronRight
                  size={15}
                  className={clsx("ml-auto text-charcoal-faint transition-transform duration-200", autoOpen && "rotate-90")}
                />
              </button>
              {autoOpen &&
                autoStreaks.map((s, i) => {
                  const Icon = s.category ? AUTO_ICON[s.category] : Flame;
                  return (
                    <Row
                      key={s.id}
                      divider={i > 0}
                      icon={<Icon size={14} strokeWidth={1.75} className="text-primary-dark" />}
                      label={`${s.label.replace(/\s*streak$/i, "")}`}
                      days={s.days}
                    />
                  );
                })}
            </>
          )}
          {habits.map((h, i) => {
            const Icon = habitIcon[h.icon];
            return (
              <Row
                key={h.id}
                divider={i > 0 || (autoOpen && autoStreaks.length > 0)}
                icon={<Icon size={14} strokeWidth={1.75} className="text-primary-dark" />}
                label={h.label}
                days={h.streakDays}
                check={
                  <button
                    onClick={() => toggleHabit(h.id)}
                    aria-label={`${h.label}, today: ${h.done ? "done" : "not done"}`}
                    aria-pressed={h.done}
                    className={clsx(
                      "tap w-6 h-6 rounded-full flex items-center justify-center border shrink-0",
                      h.done ? "bg-primary border-primary" : "border-charcoal/15 dark:border-[#807C93]"
                    )}
                  >
                    {h.done && <Check size={13} strokeWidth={3} className="text-white dark:text-on-primary-fill" />}
                  </button>
                }
              />
            );
          })}
          {habits.length === 0 && habitsLoading && (
            // Loading: skeleton rows at the row positions (56 tall, 28 pt
            // icon tile r8, the label, the teal strip), in surface.soft.
            <div aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-stretch h-14">
                  <div className="relative flex-1 min-w-0 flex items-center gap-3 pl-3.5 pr-2">
                    {i > 0 && <span className="absolute left-[54px] right-0 top-0 h-px bg-charcoal/[0.06]" />}
                    <span className="w-7 h-7 rounded-lg bg-cream-soft shrink-0" />
                    <span className="h-3 w-28 rounded bg-cream-soft" />
                  </div>
                  <div className="w-[110px] shrink-0 bg-teal-pale" />
                </div>
              ))}
            </div>
          )}
          {habits.length === 0 && !habitsLoading && (
            <button
              onClick={() => navigate("/app/mind/habits")}
              className="tap w-full px-4 py-4 text-left text-[13px] text-charcoal-soft"
            >
              No habits yet. <span className="font-bold text-primary-dark">Add one</span>
            </button>
          )}
        </div>
        <p className="mt-2.5 px-1 text-[11px] leading-[1.45] text-charcoal-muted dark:text-charcoal-faint">
          Auto streaks count from what you log across the app. To track something new, add a habit.
        </p>

        {/* KEPT (A1): the streaks you made yourself, with a goal. */}
        <div className="flex items-center justify-between mt-6 mb-2.5 px-1">
          <p className={sectionLabel}>Your streaks</p>
          <button
            onClick={() => setAddStreakOpen(true)}
            className="tap flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Plus size={12} /> Add streak
          </button>
        </div>
        {ownStreaks.length > 0 && (
          <div className="rounded-[20px] border border-charcoal/[0.11] dark:border-charcoal/[0.08] bg-cream-card overflow-hidden">
            {ownStreaks.map((s, i) => {
              const bursting = burstKey?.startsWith(`${s.id}-b`);
              const habit = habits.find((h) => h.id === s.habitId);
              const Icon = habit ? habitIcon[habit.icon] : Flame;
              return (
                <Row
                  key={s.id}
                  divider={i > 0}
                  onClick={() => logStreak(s)}
                  icon={<Icon size={14} strokeWidth={1.75} className="text-primary-dark" />}
                  label={s.label}
                  sub={s.goalDays ? `Goal ${s.goalDays} days` : undefined}
                  days={s.days}
                  bursting={bursting ? burstKey ?? undefined : undefined}
                  check={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStreak(s);
                      }}
                      aria-label="Edit streak"
                      className="tap w-6 h-6 rounded-full bg-white/60 dark:bg-cream-card/70 flex items-center justify-center text-primary-deep-text shrink-0"
                    >
                      <Pencil size={11} />
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <StreakEditSheet open={!!editingStreak} onClose={() => setEditingStreak(null)} streak={editingStreak} />
      <AddStreakSheet open={addStreakOpen} onClose={() => setAddStreakOpen(false)} />
    </div>
  );
}

/** MO1.1 States, Loading: a tile line's skeleton block, in surface.soft. */
function LineSkeleton() {
  return (
    <>
      <span aria-hidden className="inline-block align-middle w-12 h-[11px] rounded bg-cream-soft" />
      <span className="sr-only">Loading</span>
    </>
  );
}

/** MO1.1 #2: a hub tile. */
function Tile({
  onClick,
  fill,
  well,
  icon,
  title,
  line,
}: {
  onClick: () => void;
  fill: string;
  well: string;
  icon: React.ReactNode;
  title: string;
  line: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="tap min-w-0 h-[137px] rounded-[18px] border border-charcoal/[0.06] flex flex-col items-center justify-center px-1.5 text-center"
      style={{ background: fill }}
    >
      <span className="w-14 h-14 rounded-[14px] flex items-center justify-center" style={{ background: well }}>
        {icon}
      </span>
      <span className="mt-2.5 text-[13.5px] font-bold text-charcoal truncate max-w-full">{title}</span>
      <span className="mt-1 text-[11px] text-charcoal-muted dark:text-charcoal-faint truncate max-w-full tabular-nums">{line}</span>
    </button>
  );
}

/** MO1.1 #6: one row of the Today list; the count sits on a teal-pale strip. */
function Row({
  icon,
  label,
  sub,
  days,
  check,
  onClick,
  bursting,
  divider,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  days: number;
  check?: React.ReactNode;
  onClick?: () => void;
  bursting?: string;
  /** A rule above the row, inset to the label column (x 71 on the frame:
      14 padding + 28 tile + 12 gap) and stopping at the streak strip, so
      the strip runs unbroken (MO1.1 #6). */
  divider?: boolean;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={clsx("flex items-stretch h-14", onClick && "tap cursor-pointer")}
    >
      <div className="relative flex-1 min-w-0 flex items-center gap-3 pl-3.5 pr-2">
        {divider && <span aria-hidden className="absolute left-[54px] right-0 top-0 h-px bg-charcoal/[0.06]" />}
        <span className="w-7 h-7 rounded-lg bg-primary-pale flex items-center justify-center shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-charcoal truncate">{label}</span>
          {sub && <span className="block text-[10.5px] text-charcoal-muted dark:text-charcoal-faint">{sub}</span>}
        </span>
      </div>
      <div className="w-[110px] shrink-0 flex items-center justify-end gap-2.5 pr-3.5 bg-teal-pale">
        <span className="relative flex items-center gap-1">
          <Flame
            key={bursting}
            size={15}
            className={clsx("text-team-teal-deep dark:text-teal-deep-text", bursting && "animate-streak-flame")}
            style={{ transformOrigin: "50% 85%" }}
          />
          <span
            key={bursting ? `${bursting}-count` : undefined}
            className={clsx(
              "text-[20px] font-extrabold leading-none text-team-teal-deep dark:text-teal-deep-text tabular-nums",
              bursting && "animate-streak-count-roll"
            )}
          >
            {days}
          </span>
        </span>
        {check ?? <span className="w-6 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
