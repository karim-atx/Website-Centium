import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { ExerciseSettingsSheet } from "../../components/workout/ExerciseSettingsSheet";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import type { Exercise, Routine } from "../../types";
import { Folder, FolderPlus, MoreVertical, Play, Settings2, Trash2, X } from "lucide-react";

export default function RoutinesTab() {
  const { routineFolders, routines, addRoutineFolder, renameRoutineFolder, deleteRoutineFolder, updateRoutine, deleteRoutine } =
    useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [managingFolder, setManagingFolder] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [settingsExercise, setSettingsExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);

  const unfiled = routines.filter((r) => !r.folderId);

  const startRoutine = (r: Routine) => setActiveRoutine(r);

  return (
    <div className="animate-fade-slide-up">
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
        {routineFolders.map((folder) => {
          const folderRoutines = routines.filter((r) => r.folderId === folder.id);
          return (
            <div key={folder.id}>
              <div className="flex items-center justify-between mb-2">
                {managingFolder === folder.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renameDraft.trim()) {
                          renameRoutineFolder(folder.id, renameDraft.trim());
                          setManagingFolder(null);
                        }
                      }}
                      className="flex-1 rounded-lg bg-cream-card border border-charcoal/10 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (renameDraft.trim()) renameRoutineFolder(folder.id, renameDraft.trim());
                        setManagingFolder(null);
                      }}
                      className="text-xs font-semibold text-sohati"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        deleteRoutineFolder(folder.id);
                        setManagingFolder(null);
                      }}
                      className="text-charcoal-faint"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Folder size={15} className="text-charcoal-soft" />
                      <h3 className="font-display text-base font-semibold text-charcoal">{folder.name}</h3>
                      <span className="text-xs text-charcoal-faint">{folderRoutines.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        setManagingFolder(folder.id);
                        setRenameDraft(folder.name);
                      }}
                      className="tap text-charcoal-faint"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {folderRoutines.map((r) => (
                  <RoutineRow
                    key={r.id}
                    routine={r}
                    onStart={() => startRoutine(r)}
                    onDelete={() => deleteRoutine(r.id)}
                    onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
                  />
                ))}
                <button
                  onClick={() => {
                    setCreateFolder(folder.id);
                    setCreateOpen(true);
                  }}
                  className="tap w-full text-xs font-semibold text-sohati border-2 border-dashed border-sohati/30 rounded-xl py-2.5"
                >
                  + Create routine in {folder.name}
                </button>
              </div>
            </div>
          );
        })}

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
}> = ({ routine, onStart, onDelete, onSettings }) => {
  const [expanded, setExpanded] = useState(false);

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
          className="tap w-9 h-9 rounded-full bg-sohati text-white flex items-center justify-center shrink-0"
        >
          <Play size={14} fill="white" />
        </button>
        <button onClick={onDelete} className="tap text-charcoal-faint shrink-0">
          <X size={16} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-charcoal/[0.06] divide-y divide-charcoal/[0.04]">
          {routine.exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between px-4 py-2.5">
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
          ))}
        </div>
      )}
    </Card>
  );
};
