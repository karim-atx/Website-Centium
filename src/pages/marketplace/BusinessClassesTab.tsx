import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { Plus, Trash2, Users, Clock } from "lucide-react";

const classTypeOptions = ["Group fitness", "Yoga", "Spin", "HIIT", "Personal training", "Physio session"];

const blankDraft = (date: string) => ({
  title: "",
  classType: classTypeOptions[0],
  date,
  startTime: "09:00",
  endTime: "10:00",
  maxCapacity: "10",
  professionalId: "",
  notes: "",
});

// V7 (QA 7.0): "Classes tab (a professionals-style calendar for creating
// classes linked to affiliated professionals, with time/max-capacity/class-
// type fields)" — gym-type businesses only.
export default function BusinessClassesTab() {
  const { user, businessClasses, addBusinessClass, removeBusinessClass, businessEmployees } = useApp();
  const employees = user.businessId ? businessEmployees[user.businessId] ?? [] : [];
  const today = new Date().toISOString().slice(0, 10);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState(blankDraft(today));

  const save = () => {
    if (!draft.title.trim()) return;
    addBusinessClass({
      title: draft.title.trim(),
      classType: draft.classType,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      maxCapacity: Number(draft.maxCapacity) || 10,
      professionalId: draft.professionalId || undefined,
      notes: draft.notes.trim() || undefined,
    });
    setDraft(blankDraft(today));
    setComposeOpen(false);
  };

  const sorted = [...businessClasses].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Schedule classes run by your affiliated professionals"
        showBack
        right={
          <button
            onClick={() => setComposeOpen(true)}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shadow-soft"
            aria-label="New class"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="space-y-2.5">
        {sorted.map((c) => {
          const professional = employees.find((e) => e.professionalId === c.professionalId);
          return (
            <Card key={c.id} className="flex items-start justify-between gap-3 animate-fade-slide-up">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal">{c.title}</p>
                <p className="text-xs text-sohati-dark font-medium">{c.classType}</p>
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-1">
                  <Clock size={11} /> {c.date} · {c.startTime}–{c.endTime}
                </p>
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                  <Users size={11} /> Max {c.maxCapacity}
                  {professional ? ` · ${professional.professionalName}` : ""}
                </p>
                {c.notes && <p className="text-xs text-charcoal-faint mt-1 italic">{c.notes}</p>}
              </div>
              <button
                onClick={() => removeBusinessClass(c.id)}
                aria-label={`Delete ${c.title}`}
                className="tap text-charcoal-faint shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No classes scheduled yet.</p>
          </Card>
        )}
      </div>

      <BottomSheet open={composeOpen} onClose={() => setComposeOpen(false)} title="New Class">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Class name</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Morning HIIT"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          <label className="block">
            {/* V8 (QA 8.0): "class type must be an actual dropdown, not buttons" */}
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Class type</span>
            <select
              value={draft.classType}
              onChange={(e) => setDraft((d) => ({ ...d, classType: e.target.value }))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
            >
              {classTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Starts</span>
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Ends</span>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Max capacity</span>
            <input
              value={draft.maxCapacity}
              onChange={(e) => setDraft((d) => ({ ...d, maxCapacity: e.target.value.replace(/\D/g, "") }))}
              inputMode="numeric"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          {employees.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Run by</span>
              <div className="flex flex-wrap gap-2">
                {employees.map((e) => (
                  <button
                    key={e.professionalId}
                    onClick={() => setDraft((d) => ({ ...d, professionalId: d.professionalId === e.professionalId ? "" : e.professionalId }))}
                    className={`tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      draft.professionalId === e.professionalId
                        ? "bg-sohati text-white border-sohati"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    }`}
                  >
                    {e.professionalName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Description / notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={3}
              placeholder="Anything the assigned professional should know…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20 resize-none"
            />
          </label>

          <Button fullWidth size="lg" onClick={save} disabled={!draft.title.trim()}>
            Save class
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
