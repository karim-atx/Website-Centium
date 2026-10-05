import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { Check, Flame, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { habitIcon, habitIconOptions } from "../../utils/icons";
import type { HabitIconKey } from "../../types";

// The Habits tab.
//
// HABITS ARE SERVER ROWS NOW (habit_items + habit_completions), so this screen
// has the three states every other server-backed screen has: loading, empty,
// and an error that never reads as "you have none". A tick is a row dated with
// the user's own local date, which is why the same five boxes look the same on
// a phone and a laptop.
export default function HabitsTab() {
  const {
    habits,
    habitsLoading,
    habitsError,
    habitSuggestions,
    toggleHabit,
    addHabit,
    removeHabit,
    renameHabit,
  } = useApp();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<HabitIconKey>(habitIconOptions[0].key);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const create = () => {
    if (!newLabel.trim()) return;
    addHabit(newLabel.trim(), newIcon);
    setNewLabel("");
    setNewIcon(habitIconOptions[0].key);
    setAdding(false);
  };

  // WHAT IS STILL ON OFFER. A suggestion the account already has a habit for
  // is not offered again, matched on the label the suggestion would create.
  const taken = new Set(habits.map((h) => h.label.trim().toLowerCase()));
  const suggestions = habitSuggestions.filter((s) => !taken.has(s.label.toLowerCase()));

  if (habitsLoading) {
    return (
      <div className="animate-fade-slide-up">
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-slide-up">
      {/* A FAILED READ OR WRITE SAYS SO, and leaves whatever is on screen
          alone. "No habits" and "the request failed" look identical once
          rendered, and only one of them is true. */}
      {habitsError && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {habitsError}
        </p>
      )}

      {habits.length === 0 && !habitsError && (
        <Card className="text-center py-7 mb-4">
          <p className="text-sm font-semibold text-charcoal mb-1">No habits yet</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-4">
            Add one of your own below, or start from a suggestion.
          </p>
        </Card>
      )}

      <Card padded={false} className="mb-4 divide-y divide-charcoal/[0.04]">
        {habits.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3.5">
            {editingId === h.id ? (
              <div className="flex items-center gap-2 flex-1">
                {(() => {
                  const Icon = habitIcon[h.icon];
                  return <Icon size={16} className="text-primary-dark shrink-0" />;
                })()}
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editDraft.trim()) {
                      renameHabit(h.id, editDraft.trim());
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 rounded-lg bg-cream-soft border border-charcoal/10 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => {
                    if (editDraft.trim()) renameHabit(h.id, editDraft.trim());
                    setEditingId(null);
                  }}
                  className="text-xs font-semibold text-primary"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleHabit(h.id)}
                  className="tap flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <span className="w-7 h-7 rounded-lg bg-primary-pale flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = habitIcon[h.icon];
                      return <Icon size={14} className="text-primary-dark" />;
                    })()}
                  </span>
                  <span className={clsx("text-sm font-medium truncate", h.done ? "text-charcoal-faint line-through" : "text-charcoal")}>
                    {h.label}
                  </span>
                  {h.streakDays > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-charcoal-soft dark:text-teal-deep-text bg-teal-pale rounded-full px-1.5 py-0.5 shrink-0">
                      <Flame size={10} /> {h.streakDays}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(h.id);
                      setEditDraft(h.label);
                    }}
                    className="tap text-charcoal-faint"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => removeHabit(h.id)} className="tap text-charcoal-faint">
                    <Trash2 size={13} />
                  </button>
                  <div
                    onClick={() => toggleHabit(h.id)}
                    className={clsx(
                      "tap w-6 h-6 rounded-full flex items-center justify-center border-2 cursor-pointer",
                      h.done ? "bg-primary border-primary" : "border-charcoal/15"
                    )}
                  >
                    {h.done && <Check size={13} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </Card>

      {/* SUGGESTIONS, NOT SEEDED ROWS. These five used to be written into every
          new account as habits it appeared to have made. Tapping one creates
          it — at which point it is the user's, and stops being offered. */}
      {suggestions.length > 0 && (
        <div className="mb-3">
          <p className="mb-[7px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const Icon = habitIcon[s.icon];
              return (
                <button
                  key={s.label}
                  onClick={() => addHabit(s.label, s.icon)}
                  className="tap flex items-center gap-1.5 rounded-full bg-cream-soft px-3 py-1.5 text-[12px] font-semibold text-charcoal-soft"
                >
                  <Icon size={13} className="text-primary-dark" />
                  {s.label}
                  <Plus size={12} className="text-charcoal-faint" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {adding ? (
        <Card>
          <div className="flex gap-2 flex-wrap mb-3">
            {habitIconOptions.map((opt) => {
              const Icon = habitIcon[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => setNewIcon(opt.key)}
                  aria-label={opt.label}
                  className={clsx(
                    "tap w-9 h-9 rounded-xl flex items-center justify-center",
                    newIcon === opt.key ? "bg-primary-pale ring-2 ring-primary" : "bg-cream-soft"
                  )}
                >
                  <Icon size={16} className="text-primary-dark" />
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="New habit…"
              className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button onClick={create} className="tap w-9 h-9 rounded-xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0">
              <Check size={15} />
            </button>
            <button onClick={() => setAdding(false)} className="tap w-9 h-9 rounded-xl bg-cream-soft text-charcoal-faint flex items-center justify-center shrink-0">
              <X size={15} />
            </button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" fullWidth onClick={() => setAdding(true)}>
          <Plus size={15} /> Add habit
        </Button>
      )}
    </div>
  );
}
