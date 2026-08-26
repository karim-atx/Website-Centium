import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { Check, Flame, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { habitIcon, habitIconOptions } from "../../utils/icons";
import type { HabitIconKey } from "../../types";

export default function HabitsTab() {
  const { habits, toggleHabit, addHabit, removeHabit, renameHabit } = useApp();
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

  return (
    <div className="animate-fade-slide-up">
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
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-teal-dark bg-teal-pale rounded-full px-1.5 py-0.5 shrink-0">
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
        {habits.length === 0 && (
          <p className="text-center text-sm text-charcoal-faint py-8">No habits yet — add one below.</p>
        )}
      </Card>

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
            <button onClick={create} className="tap w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
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
