import React, { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { StreakEditSheet } from "../../components/mind/StreakEditSheet";
import { AddStreakSheet } from "../../components/mind/AddStreakSheet";
import { MeditationSheet } from "../../components/mind/MeditationSheet";
import { YogaFigureIcon } from "../../components/mind/YogaFigureIcon";
import HabitsTab from "./HabitsTab";
import JournalTab from "./JournalTab";
import { Flame, Plus, CheckSquare, BookOpen, Pencil } from "lucide-react";
import type { Streak } from "../../types";
import { flameColor } from "../../utils/flameColor";
import clsx from "clsx";

type Tab = "overview" | "habits" | "journal";

export default function Mind() {
  const { streaks, habits, toggleHabit } = useApp();
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
        <PageHeader title="Mind" subtitle="Habits, journaling & meditation" showBack />
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
          <div className="flex items-center justify-between mb-2.5">
            <p className="section-label text-charcoal-faint">Streaks</p>
            <button
              onClick={() => setAddStreakOpen(true)}
              className="tap flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Plus size={12} /> Add streak
            </button>
          </div>
          {/* Design refinement §6.8: auto-tracked and user-added streaks now
              read differently at a glance — an auto streak can't be tapped
              to log, so its border and caption say so instead of implying
              the same tap affordance as a user-added one. */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {streaks.map((s) => {
              const bursting = burstKey?.startsWith(`${s.id}-b`);
              const color = flameColor(s.days / s.goalDays);
              return (
              <Card
                key={s.id}
                interactive={!s.auto}
                onClick={() => !s.auto && logStreak(s)}
                className={clsx("relative overflow-hidden", s.auto ? "!cursor-default !border-charcoal/[0.11]" : "!border-primary/30")}
              >
                {!s.auto && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStreak(s);
                    }}
                    aria-label="Edit streak"
                    className="tap absolute top-3 right-3 w-6 h-6 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                  >
                    <Pencil size={11} />
                  </button>
                )}
                <div className="flex items-center gap-1.5 mb-1.5 relative">
                  <Flame
                    key={bursting ? burstKey : undefined}
                    size={14}
                    style={{ color, transformOrigin: "50% 85%" }}
                    className={bursting ? "animate-streak-flame" : undefined}
                  />
                  {bursting && (
                    <span
                      key={`${burstKey}-ring`}
                      className="absolute -left-1 -top-1 w-6 h-6 rounded-full border-2 pointer-events-none animate-streak-teal-ring"
                      style={{ borderColor: color }}
                    />
                  )}
                  {bursting &&
                    [-9, 1, 8].map((dx, i) => (
                      <span
                        key={`${burstKey}-teal-${i}`}
                        className="absolute left-1.5 top-0 w-1 h-1 rounded-full pointer-events-none animate-streak-teal-particle"
                        style={{ background: color, transform: `translateX(${dx}px)`, animationDelay: `${i * 50}ms` }}
                      />
                    ))}
                  <span
                    key={bursting ? `${burstKey}-count` : undefined}
                    className={clsx(
                      "text-[20px] font-extrabold text-charcoal tabular-nums leading-none",
                      bursting && "animate-streak-count-roll"
                    )}
                  >
                    {s.days}
                  </span>
                  <span className="text-xs text-charcoal-faint">days</span>
                </div>
                <p className="text-xs text-charcoal-soft mb-2">{s.label}</p>
                <div className="h-[5px] rounded-full bg-cream-soft overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-[620ms]"
                    style={{
                      width: `${Math.min((s.days / s.goalDays) * 100, 100)}%`,
                      background: color,
                    }}
                  />
                </div>
                <p className="text-[10px] text-charcoal-faint mt-1">
                  {s.auto ? "Auto — tracked for you" : `Goal: ${s.goalDays} days · tap to log`}
                </p>
              </Card>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 border-t border-charcoal/[0.08] pt-4 mb-6">
            <Flame size={15} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-charcoal">Rewards coming soon</p>
              <p className="text-xs text-charcoal-faint">
                Keep your streaks alive and unlock rewards from Centium partners — gyms, meals, classes & more.
              </p>
            </div>
          </div>

          {/* V7 (QA 7.0): Habits/Journal restored as their own buttons,
              matching Meditation — QA6 had merged them into the tabs above. */}
          <div className="grid grid-cols-3 gap-3">
            <Card interactive onClick={() => setTab("habits")}>
              <CheckSquare size={22} className="text-primary mb-3" />
              <p className="text-sm font-semibold text-charcoal mb-1">Habits</p>
              <p className="text-xs text-charcoal-faint">Track daily habits</p>
            </Card>
            <Card interactive onClick={() => setTab("journal")}>
              <BookOpen size={22} className="text-charcoal mb-3" />
              <p className="text-sm font-semibold text-charcoal mb-1">Journal</p>
              <p className="text-xs text-charcoal-faint">Write your thoughts</p>
            </Card>
            <Card interactive onClick={() => setMeditationOpen(true)}>
              <YogaFigureIcon size={22} className="text-berry mb-3" />
              <p className="text-sm font-semibold text-charcoal mb-1">Meditation</p>
              <p className="text-xs text-charcoal-faint">Breathing, stretching & yoga</p>
            </Card>
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
