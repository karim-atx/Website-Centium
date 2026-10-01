import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { StreakEditSheet } from "../../components/mind/StreakEditSheet";
import { AddStreakSheet } from "../../components/mind/AddStreakSheet";
import { MeditationSheet } from "../../components/mind/MeditationSheet";
import { MeditationSmall } from "../../components/mind/MeditationFigures";
import HabitsTab from "./HabitsTab";
import JournalTab from "./JournalTab";
import AchievementsTab from "./AchievementsTab";
import { earnedCount } from "../../services/achievements";
import { Flame, Plus, BookOpen, Pencil, Trophy, ChevronLeft } from "lucide-react";
import type { Streak } from "../../types";
import { flameColor } from "../../utils/flameColor";
import { streakProgress } from "../../utils/streakProgress";
import clsx from "clsx";
import { journalStreak as journalStreakFrom } from "../../services/journal/streak";
import { HabitPages } from "../../components/mind/HabitPages";

type Tab = "overview" | "habits" | "journal" | "achievements";

// The takeover header, for the three tabs that have one. Keyed rather than
// nested ternaries, which is what adding a third to the pair turned into.
const TAB_TITLE: Record<Exclude<Tab, "overview">, string> = {
  habits: "Habits",
  journal: "Journal",
  achievements: "Achievements",
};
const TAB_SUBTITLE: Record<Exclude<Tab, "overview">, string> = {
  habits: "Track your daily habits",
  journal: "Your thoughts, logged",
  achievements: "What you've earned so far",
};

export default function Mind() {
  const {
    streaks,
    habits,
    toggleHabit,
    journalEntries,
    achievements,
    pointsSummary,
    meditationSummary,
    refreshAchievements,
    noteFeatureMilestone,
    today,
  } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [editingStreak, setEditingStreak] = useState<Streak | null>(null);
  const [addStreakOpen, setAddStreakOpen] = useState(false);
  const [meditationOpen, setMeditationOpen] = useState(false);
  // §7.2: which user-added streak just incremented, so its card can fire
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
    if (tab === "journal") noteFeatureMilestone("mind_journal");
  }, [tab, noteFeatureMilestone]);

  const achievementCounts = earnedCount(achievements ?? []);

  // A user-added streak's `days` mirrors its linked habit's `streakDays`
  // (see AppContext) — "tap to log" means checking off today's habit, not
  // editing the streak's label/goal, which now lives behind the pencil.
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

  // Iteration 6 "Team" §5 Mind: a "Longest streak" hero, same idea as the
  // one Home's streak board replaced (see StreaksBar.tsx) — goal copy only
  // renders when a real goalDays exists, since the four auto streaks are
  // schema-forbidden from having one.
  const sortedStreaks = [...streaks].sort((a, b) => b.days - a.days);
  const leadStreak = sortedStreaks[0];
  const leadRemaining = leadStreak?.goalDays ? Math.max(0, leadStreak.goalDays - leadStreak.days) : null;
  const leadTotalSegments = leadStreak?.goalDays ?? 0;
  const leadFilledSegments = leadTotalSegments ? Math.round(streakProgress(leadStreak) * leadTotalSegments) : 0;

  const doneHabits = habits.filter((h) => h.done).length;
  // Local calendar days, from the app's local today (not UTC).
  const journalDays = journalStreakFrom(journalEntries.map((e) => e.date), today);

  return (
    <div>
      {/* QA 11.0: "fix title and back button" — showing the full page
          header (its own back chevron + "Mind" title) at the same time as
          the in-page "‹ Mind" link below was a redundant double
          back-button. The full header now only shows on the overview;
          Habits/Journal rely on the in-page link alone.
          QA 12.0: "The title and button going back to Mind should have the
          same style as [the standard PageHeader]" — that in-page link was
          a small plain-text chevron, inconsistent with the rest of the
          app's back-navigation style. Reuses PageHeader itself (now with
          an onBack override) instead of a bespoke smaller link. */}
      {tab === "overview" ? (
        // Iteration 6 "Team": compact 19px title in place of PageHeader's
        // 27px default — see the identical note in Food.tsx. The back
        // button is otherwise the same one PageHeader itself renders.
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
      ) : (
        <PageHeader
          title={TAB_TITLE[tab]}
          subtitle={TAB_SUBTITLE[tab]}
          showBack
          onBack={() => setTab("overview")}
        />
      )}

      {tab === "overview" && (
        <div className="animate-fade-slide-up">
          {/* Iteration 6 "Team" §5 Mind: a "Longest streak" hero (teal
              gradient, matching Workout's hero colour-coding) in place of
              the old grid's implicit "biggest card wins" reading. */}
          {leadStreak && (
            <div
              className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
              style={{ background: "var(--gradient-teal-hero)" }}
            >
              <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66]">Longest streak</p>
              <div className="flex items-end justify-between gap-3.5 mt-[9px]">
                <div className="flex items-center gap-2.5">
                  <Flame size={26} style={{ color: "#FFB35C" }} fill="currentColor" fillOpacity={0.35} />
                  <div>
                    <p className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">{leadStreak.days}</p>
                    <p className="mt-[3px] text-[10px] text-white/[0.72]">days · {leadStreak.label.replace(/\s*streak$/i, "").toLowerCase()}</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold text-white bg-white/20 rounded-full px-[9px] py-1 whitespace-nowrap shrink-0">
                  {leadRemaining === null ? "Tracked automatically" : leadRemaining > 0 ? `${leadRemaining} to goal` : "Goal reached"}
                </span>
              </div>
              {leadTotalSegments > 0 && (
                <div className="flex gap-[2px] mt-[13px]">
                  {Array.from({ length: leadTotalSegments }, (_, i) => (
                    <div key={i} className="flex-1 h-1 rounded-[2px]" style={{ background: i < leadFilledSegments ? "#fff" : "rgba(255,255,255,.28)" }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-[9px]">
            <p className="text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Streaks</p>
            <button
              onClick={() => setAddStreakOpen(true)}
              className="tap flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Plus size={12} /> Add streak
            </button>
          </div>
          {/* Design refinement §6.8: auto-tracked and user-added streaks
              still read differently — an auto streak can't be tapped to
              log, so its caption says so instead of implying a tap
              affordance it doesn't have. Rows, not a 2-col grid, now that
              the biggest streak has its own hero above. */}
          <div className="flex flex-col gap-[7px] mb-[13px]">
            {streaks.map((s) => {
              const bursting = burstKey?.startsWith(`${s.id}-b`);
              const color = flameColor(streakProgress(s));
              return (
                <div
                  key={s.id}
                  role={s.auto ? undefined : "button"}
                  onClick={() => !s.auto && logStreak(s)}
                  className={clsx("relative flex items-center gap-[11px] rounded-[15px] px-3.5 py-3", !s.auto && "tap cursor-pointer")}
                  style={{ background: "rgba(174,161,220,.16)" }}
                >
                  <span className="relative shrink-0">
                    <Flame
                      key={bursting ? burstKey : undefined}
                      size={15}
                      style={{ color, transformOrigin: "50% 85%" }}
                      className={bursting ? "animate-streak-flame" : undefined}
                    />
                    {bursting && (
                      <span
                        key={`${burstKey}-ring`}
                        className="absolute -left-1.5 -top-1.5 w-6 h-6 rounded-full border-2 pointer-events-none animate-streak-teal-ring"
                        style={{ borderColor: color }}
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-[5px]">
                      <span
                        key={bursting ? `${burstKey}-count` : undefined}
                        className={clsx("text-[15px] font-extrabold text-charcoal tabular-nums", bursting && "animate-streak-count-roll")}
                      >
                        {s.days}
                      </span>
                      <span className="text-[10px] text-charcoal-tertiary">
                        {s.auto ? `day ${s.label.replace(/\s*streak$/i, "").toLowerCase()} streak` : s.label}
                      </span>
                    </span>
                    <span className="block mt-[5px] h-1 rounded-full bg-charcoal/[0.07] overflow-hidden">
                      <span className="block h-full rounded-full transition-all duration-[620ms]" style={{ width: `${streakProgress(s) * 100}%`, background: color }} />
                    </span>
                  </div>
                  {!s.auto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStreak(s);
                      }}
                      aria-label="Edit streak"
                      className="tap shrink-0 w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-primary-deep-text"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* "Practice": Habits reuses the canonical large widget exactly
              (see the identical widgets in HomeWidget.tsx); Journal and
              Meditation reuse the small ones. Real data throughout — the
              manifest's "7 of 10" is this mock's example count, not a
              fixed target. */}
          <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Practice</p>
          <button
            onClick={() => setTab("habits")}
            className="tap w-full h-[150px] box-border rounded-[15px] px-4 py-3.5 flex flex-col text-left mb-[9px]"
            style={{ background: "rgba(174,161,220,.16)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-primary-deep-text/[0.68]">Habits</p>
              <span className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap text-primary-deep-text bg-team-lavender/30">
                {doneHabits} of {habits.length} today
              </span>
            </div>
            <HabitPages habits={habits} />
          </button>

          <div className="flex gap-[7px] mb-[13px]">
            <button
              onClick={() => setTab("journal")}
              className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
              style={{ background: "rgba(217,164,65,.14)" }}
            >
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-gold-ink/[0.82]">Journal</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-[7px]">
                  <BookOpen size={30} className="text-team-gold-deep" />
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[20px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">{journalDays}</span>
                    <span className="mt-1 text-[8.5px] font-bold text-team-gold-ink/[0.82]">day streak</span>
                  </span>
                </span>
              </div>
            </button>

            <button
              onClick={() => setMeditationOpen(true)}
              className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
              style={{ background: "rgba(162,200,194,.18)" }}
            >
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-teal-ink/[0.72]">Meditation</p>
              {/* Real minutes from meditation_sessions (my_meditation_summary),
                  saved by MeditationSheet when a session ends. */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <MeditationSmall summary={meditationSummary} />
              </div>
            </button>

            {/* THE "REWARDS" TILE IS GONE. It was a static Gift icon over
                "Soon — from Centium partners": no count, no link, nothing to
                tap, and it named partners that do not exist. Achievements are
                real and earned server-side, so the tile is now a way into them
                and carries the three numbers that say where the account
                stands. Rewards for the points are still coming — the
                Achievements tab says so, once, where the points are. */}
            <button
              onClick={() => setTab("achievements")}
              className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col justify-between text-left"
              style={{ background: "rgba(217,164,65,.15)" }}
            >
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-gold-ink/[0.78]">Achievements</p>
              <div>
                <Trophy size={17} className="text-team-gold-deep mb-1.5" />
                {/* NOTHING IS SHOWN UNTIL SOMETHING HAS BEEN READ. A count of
                    "0 of 0" before the first call would be a number nobody
                    earned, and a tier before my_points_summary() answers would
                    be a guess at one. */}
                {achievements === null || pointsSummary === null ? (
                  <p className="text-[10px] leading-[1.35] text-team-gold-ink/[0.72]">Loading…</p>
                ) : (
                  <p className="text-[10px] leading-[1.35] text-team-gold-ink tabular-nums">
                    {achievementCounts.earned} of {achievementCounts.total} ·{" "}
                    {pointsSummary.balance.toLocaleString()} pts · {pointsSummary.tierName}
                  </p>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {tab === "habits" && <HabitsTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "achievements" && <AchievementsTab />}

      <StreakEditSheet open={!!editingStreak} onClose={() => setEditingStreak(null)} streak={editingStreak} />
      <AddStreakSheet open={addStreakOpen} onClose={() => setAddStreakOpen(false)} />
      <MeditationSheet open={meditationOpen} onClose={() => setMeditationOpen(false)} />
    </div>
  );
}
