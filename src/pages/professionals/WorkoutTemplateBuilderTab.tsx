import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { CreateWorkoutTemplateSheet } from "../../components/professionals/CreateWorkoutTemplateSheet";
import type { WorkoutTemplateAssignment } from "../../types";
import { Plus, Trash2, ChevronDown, ChevronUp, Folder, FolderPlus, MoreVertical, Copy, Pencil, Settings2 } from "lucide-react";
import clsx from "clsx";

// Deterministic small hash so each template+client pairing gets a stable
// (not random-on-every-render) set of mock tracking numbers.
function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

const folderColorOptions = ["#7D6BB5", "#6F9993", "#4C8FD1", "#9C4F7C", "#D9A441", "#241F1B"];

export default function WorkoutTemplateBuilderTab() {
  const {
    workoutTemplates,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    removeWorkoutTemplate,
    professionalClients,
    workoutTemplateFolders,
    addWorkoutTemplateFolder,
    deleteWorkoutTemplateFolder,
  } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [createFolderId, setCreateFolderId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplateAssignment | null>(null);
  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);
  const [renamingTemplate, setRenamingTemplate] = useState<WorkoutTemplateAssignment | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);

  const openCreateIn = (folderId: string | null) => {
    setCreateFolderId(folderId);
    setCreateOpen(true);
  };

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const saveFolder = () => {
    if (!newFolderName.trim()) return;
    addWorkoutTemplateFolder(newFolderName.trim(), newFolderParentId, newFolderColor);
    setNewFolderName("");
    setNewFolderParentId(null);
    setNewFolderColor(folderColorOptions[0]);
    setNewFolderOpen(false);
  };

  const topFolders = workoutTemplateFolders.filter((f) => !f.parentId);
  const subfoldersOf = (id: string) => workoutTemplateFolders.filter((f) => f.parentId === id);
  const templatesIn = (folderId: string | null) => workoutTemplates.filter((t) => (t.folderId ?? null) === folderId);

  const templateCard = (t: (typeof workoutTemplates)[number]) => {
          const expanded = expandedId === t.id;
          const clients = professionalClients.filter((c) => t.assignedClientIds.includes(c.id));
          return (
            <div key={t.id} className="relative">
            <Card padded={false} className="overflow-hidden">
              <button
                onClick={() => {
                  setExpandedId(expanded ? null : t.id);
                  setMenuTemplateId(null);
                }}
                className="tap w-full flex items-center justify-between p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{t.name}</p>
                  <p className="text-xs text-charcoal-faint">
                    {t.exercises.length} exercises · {clients.length} client{clients.length !== 1 ? "s" : ""} assigned
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuTemplateId(menuTemplateId === t.id ? null : t.id);
                    }}
                    aria-label={`Options for ${t.name}`}
                    className="tap text-charcoal-faint"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {expanded ? <ChevronUp size={16} className="text-charcoal-faint" /> : <ChevronDown size={16} className="text-charcoal-faint" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-charcoal/[0.06] px-4 py-3.5 space-y-4">
                  {t.coachNote && (
                    <p className="text-xs text-sohati-dark bg-sohati-pale rounded-xl px-3 py-2">
                      Note to client: {t.coachNote}
                    </p>
                  )}
                  {t.assignedDay && (
                    <p className="text-xs text-charcoal-faint">Assigned for {t.assignedDay}</p>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5">
                      Exercises
                    </p>
                    {/* V10 (QA 10.0): "It should show the full details, not
                        just the exercise. Replace the title of exercises
                        with something more expansive that not only shows
                        the exercise, but the sets, reps, and anything else
                        used when adding exercise." */}
                    <div className="space-y-1.5">
                      {t.exercises.map((ex) => (
                        <div key={ex.id} className="bg-cream-soft rounded-xl px-3 py-2">
                          <p className="text-sm font-medium text-charcoal">{ex.name}</p>
                          <p className="text-[11px] text-charcoal-faint">
                            {[
                              `${ex.sets} sets × ${ex.reps} reps`,
                              ex.weightKg ? `${ex.weightKg}kg` : null,
                              ex.restSeconds ? `Rest ${ex.restSeconds}s` : null,
                              ex.rpe ? `RPE ${ex.rpe}` : null,
                              ex.tempo ? `Tempo ${ex.tempo}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
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
            {menuTemplateId === t.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-4 top-14 z-10 w-40 bg-cream-card rounded-2xl shadow-lift overflow-hidden border border-charcoal/5"
              >
                <button
                  onClick={() => {
                    setRenamingTemplate(t);
                    setRenameDraft(t.name);
                    setMenuTemplateId(null);
                  }}
                  className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(t);
                    setMenuTemplateId(null);
                  }}
                  className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                >
                  <Settings2 size={13} /> Edit template
                </button>
                <button
                  onClick={() => {
                    addWorkoutTemplate({
                      name: `${t.name} (copy)`,
                      exercises: t.exercises,
                      assignedClientIds: [],
                      folderId: t.folderId,
                      coachNote: t.coachNote,
                    });
                    setMenuTemplateId(null);
                  }}
                  className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                >
                  <Copy size={13} /> Duplicate
                </button>
                <button
                  onClick={() => {
                    removeWorkoutTemplate(t.id);
                    setMenuTemplateId(null);
                  }}
                  className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-ember-dark hover:bg-cream-soft text-left"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
            </div>
    );
  };

  const folderCard = (folderId: string, indent = false) => {
    const folder = workoutTemplateFolders.find((f) => f.id === folderId);
    if (!folder) return null;
    const expanded = expandedFolders.has(folder.id);
    const templates = templatesIn(folder.id);
    const subfolders = subfoldersOf(folder.id);
    return (
      <Card key={folder.id} padded={false} className={clsx("overflow-hidden", indent && "ml-4")}>
        <button
          onClick={() => toggleFolder(folder.id)}
          className="tap w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Folder size={16} style={{ color: folder.color ?? "#7D6BB5" }} className="shrink-0" />
            <p className="text-sm font-semibold text-charcoal truncate">{folder.name}</p>
            <span className="text-xs text-charcoal-faint shrink-0">({templates.length})</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteWorkoutTemplateFolder(folder.id);
              }}
              aria-label={`Delete folder ${folder.name}`}
              className="tap text-charcoal-faint"
            >
              <Trash2 size={14} />
            </button>
            {expanded ? <ChevronUp size={16} className="text-charcoal-faint" /> : <ChevronDown size={16} className="text-charcoal-faint" />}
          </div>
        </button>
        {expanded && (
          <div className="border-t border-charcoal/[0.06] px-4 py-3.5 space-y-2.5">
            {subfolders.map((sf) => folderCard(sf.id, true))}
            {templates.map(templateCard)}
            {templates.length === 0 && subfolders.length === 0 && (
              <p className="text-xs text-charcoal-faint">No templates in this folder yet.</p>
            )}
            <button
              onClick={() => openCreateIn(folder.id)}
              className="tap w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-charcoal/15 py-2 text-xs font-semibold text-charcoal-soft"
            >
              <Plus size={13} /> New template in this folder
            </button>
          </div>
        )}
      </Card>
    );
  };

  const unfiledTemplates = templatesIn(null);

  return (
    <div>
      {/* V10 (QA 10.0): "Rename the tab templates into something that
          pertains to workout templates and being able to track what the
          client logged when it came to working out." */}
      <PageHeader
        title="Training"
        subtitle="Build workout templates and track what clients log"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewFolderOpen(true)}
              className="tap w-10 h-10 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
              aria-label="New folder"
            >
              <FolderPlus size={17} />
            </button>
            <button
              onClick={() => openCreateIn(null)}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft"
              aria-label="New template"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-2.5">
        {topFolders.map((f) => folderCard(f.id))}
        {unfiledTemplates.map(templateCard)}
        {workoutTemplates.length === 0 && topFolders.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No templates yet — build your first one.</p>
          </Card>
        )}
      </div>

      <CreateWorkoutTemplateSheet
        key={createFolderId ?? "unfiled"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultFolderId={createFolderId}
      />

      <CreateWorkoutTemplateSheet
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        editTemplate={editingTemplate}
      />

      <BottomSheet open={!!renamingTemplate} onClose={() => setRenamingTemplate(null)} title="Rename Template">
        <div className="space-y-4 animate-fade-slide-up">
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
          <Button
            fullWidth
            size="lg"
            disabled={!renameDraft.trim()}
            onClick={() => {
              if (renamingTemplate) updateWorkoutTemplate(renamingTemplate.id, { name: renameDraft.trim() });
              setRenamingTemplate(null);
            }}
          >
            Save name
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New Folder">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Folder name</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Strength blocks"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {topFolders.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Parent folder (optional)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNewFolderParentId(null)}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    newFolderParentId === null
                      ? "bg-primary text-white border-primary"
                      : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  None (top-level)
                </button>
                {topFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setNewFolderParentId(f.id)}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      newFolderParentId === f.id
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Color</span>
            <div className="flex gap-2">
              {folderColorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewFolderColor(c)}
                  aria-label={`Color ${c}`}
                  className="tap w-7 h-7 rounded-full"
                  style={{
                    background: c,
                    boxShadow: newFolderColor === c ? "0 0 0 2px rgb(var(--c-cream)), 0 0 0 4px " + c : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <Button fullWidth size="lg" onClick={saveFolder} disabled={!newFolderName.trim()}>
            Create folder
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
