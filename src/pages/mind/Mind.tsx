import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { streaks } from "../../data/mockHealthData";
import { Check, Droplet, Sparkles, BookOpen, Flame, Play } from "lucide-react";
import clsx from "clsx";

const GLASS_SIZE = 250;
const GLASS_COUNT = 10; // 2.5L target in 250ml glasses

export default function Mind() {
  const { habits, toggleHabit, water, addWater } = useApp();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);

  const filledGlasses = Math.min(Math.round(water / GLASS_SIZE), GLASS_COUNT);

  const saveJournal = () => {
    setJournalSaved(true);
    setTimeout(() => {
      setJournalOpen(false);
      setJournalSaved(false);
      setJournalText("");
    }, 900);
  };

  return (
    <div>
      <PageHeader title="Mind" subtitle="Habits, journaling & meditation" />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Today's habits
      </p>
      <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {habits.map((h) => (
          <button
            key={h.id}
            onClick={() => toggleHabit(h.id)}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{h.emoji}</span>
              <span className={clsx("text-sm font-medium", h.done ? "text-charcoal-faint line-through" : "text-charcoal")}>
                {h.label}
              </span>
            </div>
            <div
              className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                h.done ? "bg-sohati border-sohati" : "border-charcoal/15"
              )}
            >
              {h.done && <Check size={13} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        ))}
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Water</p>
      <Card className="mb-6 animate-fade-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplet size={18} className="text-sky" />
            <span className="font-semibold text-charcoal">{(water / 1000).toFixed(2)}L / 2.5L</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => addWater(250)}>
            + 250ml
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: GLASS_COUNT }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                "w-7 h-9 rounded-b-lg rounded-t-sm border-2 transition-colors",
                i < filledGlasses ? "bg-sky border-sky" : "bg-transparent border-charcoal/10"
              )}
            />
          ))}
        </div>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Streaks</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {streaks.map((s) => (
          <Card key={s.id} className="animate-fade-slide-up">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg">{s.emoji}</span>
              <span className="text-lg font-bold text-charcoal">{s.days}</span>
              <span className="text-xs text-charcoal-faint">days</span>
            </div>
            <p className="text-xs text-charcoal-soft mb-2">{s.label}</p>
            <div className="h-1.5 rounded-full bg-cream-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-ember transition-all duration-700"
                style={{ width: `${Math.min((s.days / s.goalDays) * 100, 100)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6 bg-gradient-to-br from-gold-pale to-cream-card animate-fade-slide-up">
        <div className="flex items-center gap-2 mb-1.5">
          <Flame size={16} className="text-gold" />
          <p className="text-sm font-semibold text-charcoal">Rewards coming soon</p>
        </div>
        <p className="text-xs text-charcoal-soft">
          Keep your streak alive and unlock rewards from Sohati partners — gyms, meals, classes & more.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card interactive onClick={() => setJournalOpen(true)} className="animate-fade-slide-up">
          <BookOpen size={20} className="text-charcoal mb-3" />
          <p className="text-sm font-semibold text-charcoal mb-1">Journal</p>
          <p className="text-xs text-charcoal-faint">Reflect on your day</p>
        </Card>
        <Card interactive className="animate-fade-slide-up">
          <Sparkles size={20} className="text-berry mb-3" />
          <p className="text-sm font-semibold text-charcoal mb-1">Meditation</p>
          <p className="text-xs text-charcoal-faint">5 min guided sessions</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-berry bg-berry-pale rounded-full px-2 py-0.5 mt-2">
            <Play size={9} /> Coming soon
          </span>
        </Card>
      </div>

      {journalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setJournalOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-cream rounded-t-4xl sm:rounded-4xl shadow-lift p-5 animate-sheet-up">
            <h2 className="font-display text-lg font-semibold text-charcoal mb-3">Today's entry</h2>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="شو صار معك اليوم؟ How was your day?"
              rows={6}
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/15 resize-none mb-4"
            />
            <Button fullWidth onClick={saveJournal} disabled={!journalText.trim() || journalSaved}>
              {journalSaved ? "Saved ✓" : "Save Entry"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
