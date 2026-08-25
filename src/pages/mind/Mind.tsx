import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { useApp } from "../../context/AppContext";
import { StreakEditSheet } from "../../components/mind/StreakEditSheet";
import { AddStreakSheet } from "../../components/mind/AddStreakSheet";
import { MeditationSheet } from "../../components/mind/MeditationSheet";
import { YogaFigureIcon } from "../../components/mind/YogaFigureIcon";
import HabitsTab from "./HabitsTab";
import JournalTab from "./JournalTab";
import { Flame, Plus, CheckSquare, BookOpen } from "lucide-react";
import type { Streak } from "../../types";
import { flameColor } from "../../utils/flameColor";

type Tab = "overview" | "habits" | "journal";

export default function Mind() {
  const { streaks } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [editingStreak, setEditingStreak] = useState<Streak | null>(null);
  const [addStreakOpen, setAddStreakOpen] = useState(false);
  const [meditationOpen, setMeditationOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Mind" subtitle="Habits, journaling & meditation" showBack />

      <div className="flex gap-2 mb-5 animate-fade-slide-up">
        <Chip active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </Chip>
        <Chip active={tab === "habits"} onClick={() => setTab("habits")}>
          Habits
        </Chip>
        <Chip active={tab === "journal"} onClick={() => setTab("journal")}>
          Journal
        </Chip>
      </div>

      {tab === "overview" && (
        <div className="animate-fade-slide-up">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Streaks</p>
            <button
              onClick={() => setAddStreakOpen(true)}
              className="tap flex items-center gap-1 text-xs font-semibold text-sohati"
            >
              <Plus size={12} /> Add streak
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {streaks.map((s) => (
              <Card
                key={s.id}
                interactive={!s.auto}
                onClick={() => !s.auto && setEditingStreak(s)}
                className={s.auto ? "!cursor-default" : undefined}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Flame size={16} style={{ color: flameColor(s.days / s.goalDays) }} />
                  <span className="text-lg font-bold text-charcoal">{s.days}</span>
                  <span className="text-xs text-charcoal-faint">days</span>
                </div>
                <p className="text-xs text-charcoal-soft mb-2">{s.label}</p>
                <div className="h-1.5 rounded-full bg-cream-soft overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((s.days / s.goalDays) * 100, 100)}%`,
                      background: flameColor(s.days / s.goalDays),
                    }}
                  />
                </div>
                {!s.auto && <p className="text-[10px] text-charcoal-faint mt-1">Goal: {s.goalDays} days</p>}
              </Card>
            ))}
          </div>

          <Card className="mb-6 bg-gradient-to-br from-gold-pale to-cream-card">
            <div className="flex items-center gap-2 mb-1.5">
              <Flame size={16} className="text-gold" />
              <p className="text-sm font-semibold text-charcoal">Rewards coming soon</p>
            </div>
            <p className="text-xs text-charcoal-soft">
              Keep your streaks alive and unlock rewards from Centium partners — gyms, meals, classes & more.
            </p>
          </Card>

          {/* V7 (QA 7.0): Habits/Journal restored as their own buttons,
              matching Meditation — QA6 had merged them into the tabs above. */}
          <div className="grid grid-cols-3 gap-3">
            <Card interactive onClick={() => setTab("habits")}>
              <CheckSquare size={22} className="text-sohati mb-3" />
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
