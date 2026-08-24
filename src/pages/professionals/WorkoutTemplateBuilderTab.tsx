import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { CreateWorkoutTemplateSheet } from "../../components/professionals/CreateWorkoutTemplateSheet";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// Deterministic small hash so each template+client pairing gets a stable
// (not random-on-every-render) set of mock tracking numbers.
function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export default function WorkoutTemplateBuilderTab() {
  const { workoutTemplates, removeWorkoutTemplate, professionalClients } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Workout Templates"
        subtitle="Build programs for your clients to run"
        right={
          <button
            onClick={() => setCreateOpen(true)}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shadow-soft"
            aria-label="New template"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="space-y-2.5">
        {workoutTemplates.map((t) => {
          const expanded = expandedId === t.id;
          const clients = professionalClients.filter((c) => t.assignedClientIds.includes(c.id));
          return (
            <Card key={t.id} padded={false} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : t.id)}
                className="tap w-full flex items-center justify-between p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{t.name}</p>
                  <p className="text-xs text-charcoal-faint">
                    {t.exercises.length} exercises · {clients.length} client{clients.length !== 1 ? "s" : ""} assigned
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWorkoutTemplate(t.id);
                    }}
                    aria-label={`Delete ${t.name}`}
                    className="tap text-charcoal-faint"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expanded ? <ChevronUp size={16} className="text-charcoal-faint" /> : <ChevronDown size={16} className="text-charcoal-faint" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-charcoal/[0.06] px-4 py-3.5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5">
                      Exercises
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.exercises.map((ex) => (
                        <span key={ex.id} className="text-xs font-medium text-charcoal bg-cream-soft rounded-full px-2.5 py-1">
                          {ex.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {clients.length === 0 ? (
                    <p className="text-xs text-charcoal-faint">Not assigned to anyone yet.</p>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5">
                        Client activity
                      </p>
                      <div className="space-y-2">
                        {clients.map((c) => {
                          const h = hash(t.id + c.id);
                          const totalSets = t.exercises.length * (3 + (h % 2));
                          const totalReps = totalSets * (8 + (h % 5));
                          const rpe = 6 + (h % 4);
                          const mood = 4 + (h % 6);
                          const changed = h % 3;
                          return (
                            <div key={c.id} className="bg-cream-soft rounded-xl px-3.5 py-3">
                              <p className="text-sm font-semibold text-charcoal mb-1.5">{c.name}</p>
                              <div className="grid grid-cols-4 gap-2 text-center mb-2">
                                <div>
                                  <p className="text-sm font-bold text-charcoal">{totalSets}</p>
                                  <p className="text-[9px] text-charcoal-faint">Sets</p>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-charcoal">{totalReps}</p>
                                  <p className="text-[9px] text-charcoal-faint">Reps</p>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-charcoal">{rpe}</p>
                                  <p className="text-[9px] text-charcoal-faint">Avg RPE</p>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-charcoal">{mood}/10</p>
                                  <p className="text-[9px] text-charcoal-faint">Mood</p>
                                </div>
                              </div>
                              <p className="text-[11px] text-charcoal-faint">
                                {changed === 0
                                  ? "No exercises added, removed or replaced."
                                  : changed === 1
                                  ? "1 exercise replaced from the assigned template."
                                  : "1 exercise added beyond the assigned template."}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {workoutTemplates.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No templates yet — build your first one.</p>
          </Card>
        )}
      </div>

      <CreateWorkoutTemplateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
