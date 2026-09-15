import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { StreakEditSheet } from "../../components/mind/StreakEditSheet";
import { AddStreakSheet } from "../../components/mind/AddStreakSheet";
import { MeditationSheet } from "../../components/mind/MeditationSheet";
import { LotusGlyph } from "../../components/dashboard/LotusGlyph";
import HabitsTab from "./HabitsTab";
import JournalTab from "./JournalTab";
import { Flame, Plus, BookOpen, Pencil, Gift, Check, ChevronLeft } from "lucide-react";
import type { Streak } from "../../types";
import { flameColor } from "../../utils/flameColor";
import { streakProgress } from "../../utils/streakProgress";
import clsx from "clsx";

type Tab = "overview" | "habits" | "journal";

export default function Mind() {
  const { streaks, habits, toggleHabit, journalEntries } = useApp();
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
  let journalStreak = 0;
  {
    const cursor = new Date();
    for (;;) {
      const d = cursor.toISOString().slice(0, 10);
      if (!journalEntries.some((e) => e.date === d)) break;
      journalStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

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
          title={tab === "habits" ? "Habits" : "Journal"}
          subtitle={tab === "habits" ? "Track your daily habits" : "Your thoughts, logged"}
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
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-[5px]">
                {habits.slice(0, 6).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-[5px]"
                    style={{ background: h.done ? "rgba(125,107,181,.14)" : "rgba(255,255,255,.45)" }}
                  >
                    <span className={clsx("flex-1 min-w-0 text-[9.5px] truncate", h.done ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>
                      {h.label}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center"
                      style={h.done ? { background: "rgb(var(--c-team-lavender-deep))", border: "1.5px solid rgb(var(--c-team-lavender-deep))" } : { background: "transparent", border: "1.5px solid rgba(125,107,181,.3)" }}
                    >
                      {h.done && <Check size={9} className="text-white" strokeWidth={3} />}
                    </span>
                  </div>
                ))}
              </div>
              {habits.length > 6 && (
                <div className="flex items-center justify-between gap-2.5 pt-1 pb-px">
                  <span className="text-[8.5px] font-semibold whitespace-nowrap text-primary-deep-text/[0.68]">For more habits, swipe.</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-team-lavender-deep shrink-0" />
                    <span className="w-1.5 h-1.5 rounded-full bg-team-lavender-deep/[0.28] shrink-0" />
                  </span>
                </div>
              )}
            </div>
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
                    <span className="text-[20px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">{journalStreak}</span>
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
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-2">
                  <LotusGlyph size={40} stroke="rgb(var(--c-teal-dark))" />
                  <span className="flex items-baseline gap-[3px]">
                    <span className="text-[20px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">12</span>
                    <span className="text-[9px] font-bold text-team-teal-ink/[0.72]">min</span>
                  </span>
                </span>
              </div>
            </button>

            <div className="flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col justify-between" style={{ background: "rgba(162,200,194,.18)" }}>
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-teal-ink/[0.72]">Rewards</p>
              <div>
                <Gift size={17} className="text-team-teal-deep mb-1.5" />
                <p className="text-[10px] leading-[1.35] text-team-teal-ink">Soon — from Centium partners</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "habits" && <HabitsTab />}
      {tab === "journal" && <JournalTab />}

      <StreakEditSheet open={!!editingStreak} onClose={() => setEditingStreak(null)} streak={editingStreak} />
      <AddStreakSheet open={addStreakOpen} onClose={() => setAddStreakOpen(false)} />
      <MeditationSheet open={meditationOpen} onClose={() => setMeditationOpen(false)} />
    </div>
  );
}
