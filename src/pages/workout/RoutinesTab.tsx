import React, { useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { ExerciseSettingsSheet } from "../../components/workout/ExerciseSettingsSheet";
import { ExerciseLibrarySheet, type ExercisePick } from "../../components/workout/ExerciseLibrarySheet";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import type { Exercise, Routine, RoutineFolder } from "../../types";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  MoreVertical,
  Play,
  Settings2,
  Trash2,
  X,
  Pencil,
  FolderTree,
  Plus,
  Repeat,
} from "lucide-react";

const SWIPE_THRESHOLD = 50;

export default function RoutinesTab() {
  const { routineFolders, routines, addRoutineFolder, renameRoutineFolder, deleteRoutineFolder, updateRoutine, deleteRoutine } =
    useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState("");
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [settingsExercise, setSettingsExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const toggleFolderCollapsed = (id: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const unfiled = routines.filter((r) => !r.folderId);
  const topLevelFolders = routineFolders.filter((f) => !f.parentId);
  const childrenOf = (parentId: string) => routineFolders.filter((f) => f.parentId === parentId);

  const startRoutine = (r: Routine) => setActiveRoutine(r);

  const closeMenu = () => setMenuFolderId(null);

  const FolderNode: React.FC<{ folder: RoutineFolder; depth: number }> = ({ folder, depth }) => {
    const folderRoutines = routines.filter((r) => r.folderId === folder.id);
    const subfolders = childrenOf(folder.id);
    const collapsed = collapsedFolders.has(folder.id);

    return (
      <div style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center justify-between mb-2">
          {renamingId === folder.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameDraft.trim()) {
                    renameRoutineFolder(folder.id, renameDraft.trim());
                    setRenamingId(null);
                  }
                }}
                className="flex-1 rounded-lg bg-cream-card border border-charcoal/10 px-2 py-1 text-sm"
              />
              <button
                onClick={() => {
                  if (renameDraft.trim()) renameRoutineFolder(folder.id, renameDraft.trim());
                  setRenamingId(null);
                }}
                className="text-xs font-semibold text-sohati"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => toggleFolderCollapsed(folder.id)}
                className="tap flex items-center gap-2 flex-1 text-left min-w-0"
              >
                {collapsed ? (
                  <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
                ) : (
                  <ChevronDown size={15} className="text-charcoal-faint shrink-0" />
                )}
                <Folder size={15} className="text-charcoal-soft shrink-0" />
                <h3 className="font-display text-base font-semibold text-charcoal truncate">{folder.name}</h3>
                <span className="text-xs text-charcoal-faint shrink-0">{folderRoutines.length}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuFolderId(menuFolderId === folder.id ? null : folder.id)}
                  className="tap text-charcoal-faint shrink-0"
                  aria-label={`Options for ${folder.name}`}
                >
                  <MoreVertical size={15} />
                </button>
                {menuFolderId === folder.id && (
                  <div className="absolute right-0 top-7 z-20 w-44 bg-cream-card rounded-2xl shadow-lift border border-charcoal/[0.06] overflow-hidden animate-fade-slide-up">
                    <button
                      onClick={() => {
                        setRenamingId(folder.id);
                        setRenameDraft(folder.name);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <Pencil size={13} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        setAddingSubfolderTo(folder.id);
                        setSubfolderName("");
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <FolderTree size={13} /> Add subfolder
                    </button>
                    <button
                      onClick={() => {
                        setCreateFolder(folder.id);
                        setCreateOpen(true);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <Plus size={13} /> Add routine
                    </button>
                    <button
                      onClick={() => {
                        deleteRoutineFolder(folder.id);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ember-dark hover:bg-ember-pale"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="space-y-2 mb-2">
            {folderRoutines.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                onStart={() => startRoutine(r)}
                onDelete={() => deleteRoutine(r.id)}
                onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
                onDeleteExercise={(exId) =>
                  updateRoutine(r.id, { exercises: r.exercises.filter((e) => e.id !== exId) })
                }
                onReplaceExercise={(exId, pick) =>
                  updateRoutine(r.id, {
                    exercises: r.exercises.map((e) =>
                      e.id === exId
                        ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, classification: pick.classification, isCustom: pick.isCustom }
                        : e
                    ),
                  })
                }
              />
            ))}

            {addingSubfolderTo === folder.id && (
              <div className="flex gap-2 mb-2" style={{ marginLeft: 16 }}>
                <input
                  autoFocus
                  value={subfolderName}
                  onChange={(e) => setSubfolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subfolderName.trim()) {
                      addRoutineFolder(subfolderName.trim(), folder.id);
                      setAddingSubfolderTo(null);
                    }
                  }}
                  placeholder="Subfolder name…"
                  className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sohati/20"
                />
                <button
                  onClick={() => {
                    if (subfolderName.trim()) addRoutineFolder(subfolderName.trim(), folder.id);
                    setAddingSubfolderTo(null);
                  }}
                  className="tap px-3 rounded-xl bg-sohati text-white text-sm font-semibold"
                >
                  Add
                </button>
              </div>
            )}

            {subfolders.map((sf) => (
              <FolderNode key={sf.id} folder={sf} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-slide-up" onClick={() => menuFolderId && closeMenu()}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Folders</p>
        <button
          onClick={() => setNewFolderOpen(true)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-sohati"
        >
          <FolderPlus size={13} /> New folder
        </button>
      </div>

      {newFolderOpen && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                addRoutineFolder(newFolderName.trim());
                setNewFolderName("");
                setNewFolderOpen(false);
              }
            }}
            placeholder="Folder name…"
            className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
          <button
            onClick={() => {
              if (newFolderName.trim()) addRoutineFolder(newFolderName.trim());
              setNewFolderName("");
              setNewFolderOpen(false);
            }}
            className="tap px-3 rounded-xl bg-sohati text-white text-sm font-semibold"
          >
            Add
          </button>
        </div>
      )}

      <div className="space-y-6 mb-6">
        {topLevelFolders.map((folder) => (
          <FolderNode key={folder.id} folder={folder} depth={0} />
        ))}

        {unfiled.length > 0 && (
          <div>
            <h3 className="font-display text-base font-semibold text-charcoal mb-2">Unfiled</h3>
            <div className="space-y-2">
              {unfiled.map((r) => (
                <RoutineRow
                  key={r.id}
                  routine={r}
                  onStart={() => startRoutine(r)}
                  onDelete={() => deleteRoutine(r.id)}
                  onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
                  onDeleteExercise={(exId) =>
                    updateRoutine(r.id, { exercises: r.exercises.filter((e) => e.id !== exId) })
                  }
                  onReplaceExercise={(exId, pick) =>
                    updateRoutine(r.id, {
                      exercises: r.exercises.map((e) =>
                        e.id === exId
                          ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, classification: pick.classification, isCustom: pick.isCustom }
                          : e
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        fullWidth
        size="lg"
        onClick={() => {
          setCreateFolder(null);
          setCreateOpen(true);
        }}
      >
        + Create Routine
      </Button>

      <CreateRoutineSheet open={createOpen} onClose={() => setCreateOpen(false)} folderId={createFolder} />

      <ExerciseSettingsSheet
        open={!!settingsExercise}
        onClose={() => setSettingsExercise(null)}
        exercise={settingsExercise?.exercise ?? null}
        routineId={settingsExercise?.routineId ?? null}
        onSave={(patch) => {
          if (!settingsExercise) return;
          const routine = routines.find((r) => r.id === settingsExercise.routineId);
          if (!routine) return;
          updateRoutine(routine.id, {
            exercises: routine.exercises.map((e) =>
              e.id === settingsExercise.exercise.id ? { ...e, ...patch } : e
            ),
          });
        }}
      />

      {activeRoutine && (
        <WorkoutSessionSheet
          open={!!activeRoutine}
          onClose={() => setActiveRoutine(null)}
          routineId={activeRoutine.id}
          routineName={activeRoutine.name}
          exercises={activeRoutine.exercises}
        />
      )}
    </div>
  );
}

const RoutineRow: React.FC<{
  routine: Routine;
  onStart: () => void;
  onDelete: () => void;
  onSettings: (ex: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onReplaceExercise: (exerciseId: string, pick: ExercisePick) => void;
}> = ({ routine, onStart, onDelete, onSettings, onDeleteExercise, onReplaceExercise }) => {
  const [expanded, setExpanded] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Swipe-left on an exercise row reveals Replace/Delete, Apple-UI style —
  // same pattern as the Food diary's swipe-to-delete.
  const onRowTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onRowTouchEnd = (e: React.TouchEvent, exId: string) => {
    if (!touchStart.current) return;
    e.stopPropagation();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      setRevealedId(exId);
    } else if (dx > SWIPE_THRESHOLD) {
      setRevealedId(null);
    }
  };

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-2.5 h-10 rounded-full shrink-0" style={{ background: routine.color }} />
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <p className="text-sm font-semibold text-charcoal">{routine.name}</p>
          <p className="text-xs text-charcoal-faint">
            {routine.exercises.length} exercises · ~{routine.estimatedDurationMin} min
          </p>
        </button>
        <button
          onClick={onStart}
          aria-label={`Start ${routine.name}`}
          className="tap w-9 h-9 rounded-full bg-sohati text-white flex items-center justify-center shrink-0"
        >
          <Play size={14} fill="white" />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${routine.name}`} className="tap text-charcoal-faint shrink-0">
          <X size={16} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-charcoal/[0.06] divide-y divide-charcoal/[0.04]">
          {routine.exercises.map((ex) => {
            const revealed = revealedId === ex.id;
            return (
              <div key={ex.id} className="relative overflow-hidden">
                {revealed && (
                  <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
                    <button
                      onClick={() => setReplaceTarget(ex.id)}
                      aria-label={`Replace ${ex.name}`}
                      className="tap w-16 flex flex-col items-center justify-center gap-0.5 bg-sohati text-white text-[10px] font-semibold"
                    >
                      <Repeat size={14} />
                      Replace
                    </button>
                    <button
                      onClick={() => {
                        onDeleteExercise(ex.id);
                        setRevealedId(null);
                      }}
                      aria-label={`Delete ${ex.name}`}
                      className="tap w-16 flex flex-col items-center justify-center gap-0.5 bg-[#C0392B] text-white text-[10px] font-semibold"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
                <div
                  onTouchStart={onRowTouchStart}
                  onTouchEnd={(ev) => onRowTouchEnd(ev, ex.id)}
                  onClick={() => revealed && setRevealedId(null)}
                  className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-cream-card transition-transform duration-200"
                  style={{ transform: revealed ? "translateX(-128px)" : "translateX(0)" }}
                >
                  <div>
                    <p className="text-sm text-charcoal">{ex.name}</p>
                    <p className="text-[11px] text-charcoal-faint">
                      {ex.sets} × {ex.reps} · {ex.weightKg}kg
                    </p>
                  </div>
                  <button onClick={() => onSettings(ex)} className="tap text-charcoal-faint">
                    <Settings2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExerciseLibrarySheet
        open={!!replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onPick={(pick) => {
          if (replaceTarget) onReplaceExercise(replaceTarget, pick);
          setReplaceTarget(null);
          setRevealedId(null);
        }}
        alreadyAdded={[]}
      />
    </Card>
  );
};
