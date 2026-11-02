import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { Briefcase, Check } from "lucide-react";
import { CreateRoutineSheet, type RoutineDraft, type RoutineSheetPro } from "../../workout/CreateRoutineSheet";
import type { ExerciseSettingsPro } from "../../workout/ExerciseSettingsSheet";
import { Toggle } from "../../ui/Toggle";
import { PopupMenu } from "../../ui/PopupMenu";
import { useApp } from "../../../context/AppContext";
import type { Exercise, WorkoutTemplate } from "../../../types";
import { INK } from "../proInk";
import { PlaylistField, playlistFieldValid } from "../../music/PlaylistField";
import { tidyPlaylistInput } from "../../../services/music/playlistLink";
import { isRtl, t } from "../../../i18n/core";

/**
 * Release 3 · W5 TR3 / TR13: the template builder = the shared
 * CreateRoutineSheet with its professional props, plus what the old
 * the old create-template sheet carried, in the "For your clients" block:
 * - Assign to: clients to assign right after saving (TR5 opens with them
 *   picked; assigning needs a saved template, assign_template_to_client);
 * - Save as template: always on. A professional can only give a client a
 *   programme through a template (the assign function copies one), so there
 *   is no "don't keep it" mode to switch to;
 * - Programme length (weeks, 1 to 104, empty = open-ended):
 *   workout_templates.duration_weeks, which the owner can set on create and
 *   update (follow-up 20261124160000). No frame draws this field, so it
 *   keeps the sheet's own numeric field style. Existing assignments keep
 *   the ends_on computed when they were assigned;
 * - Folder (Unfiled or one of the template folders) and the note to the
 *   client (workout_templates.coach_note, shown on their routine) — both kept
 *   from the old sheet.
 * - Round E: "Playlist (optional)" (workout_templates.playlist_url), copied
 *   to the client's routine with the rest when it is assigned.
 */
export const TemplateEditor: React.FC<{
  open: boolean;
  onClose: () => void;
  template: WorkoutTemplate | null;
  defaultFolderId: string | null;
  /** Saved: the template's id (new or edited) and the clients picked under Assign to. */
  onSaved: (templateId: string | null, assignTo: string[], before: Set<string>) => void;
  onTargets?: (exercise: Exercise) => void;
  targetsSummary?: (exercise: Exercise) => string | null;
}> = ({ open, onClose, template, defaultFolderId, onSaved, onTargets, targetsSummary }) => {
  const { addWorkoutTemplate, updateWorkoutTemplate, workoutTemplates, workoutTemplateFolders, professionalClients } = useApp();
  const [folderId, setFolderId] = useState<string | null>(template?.folderId ?? defaultFolderId);
  const [weeks, setWeeks] = useState(template?.durationWeeks ? String(template.durationWeeks) : "");
  const [note, setNote] = useState(template?.coachNote ?? "");
  const [playlist, setPlaylist] = useState(template?.playlistUrl ?? "");
  const [assignTo, setAssignTo] = useState<string[]>([]);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  // Fresh each time it opens (the sheet itself resets from `initial`).
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setFolderId(template?.folderId ?? defaultFolderId);
      setWeeks(template?.durationWeeks ? String(template.durationWeeks) : "");
      setNote(template?.coachNote ?? "");
      setPlaylist(template?.playlistUrl ?? "");
      setAssignTo([]);
    }
  }

  const roster = professionalClients.filter((c) => !!c.clientId);
  const initial = useMemo(
    () => (template ? { name: template.name, durationMin: template.durationMin, exercises: template.exercises, blocks: template.blocks ?? [] } : undefined),
    [template]
  );

  const submit = async (draft: RoutineDraft): Promise<string | undefined> => {
    const w = Number(weeks);
    if (weeks && (!Number.isInteger(w) || w < 1 || w > 104)) return t("Programme length is 1 to 104 weeks.");
    const playlistUrl = tidyPlaylistInput(playlist);
    if (!playlistFieldValid(playlistUrl)) return t("Check the playlist link.");
    const payload = {
      name: draft.name,
      exercises: draft.exercises,
      blocks: draft.blocks,
      folderId,
      durationMin: draft.durationMin,
      coachNote: note.trim() || undefined,
      durationWeeks: weeks ? w : null,
      playlistUrl: playlistUrl || null,
    };
    if (template) {
      const message = await updateWorkoutTemplate(template.id, payload);
      if (message) return t(message);
      onSaved(template.id, assignTo, new Set());
      return undefined;
    }
    const before = new Set(workoutTemplates.map((w) => w.id));
    const message = await addWorkoutTemplate(payload);
    if (message) return t(message);
    // addWorkoutTemplate appends the saved row; the new id is the one not seen before.
    onSaved(null, assignTo, before);
    return undefined;
  };

  const names = roster.filter((c) => assignTo.includes(c.clientId!)).map((c) => c.name);
  const label = (text: string) => <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{text}</span>;

  const extra = (
    <div className="border-t border-charcoal/[0.08] pt-4 space-y-4">
      <p className="flex items-center text-[11px] font-semibold uppercase text-charcoal-faint" style={{ gap: 8, letterSpacing: "0.14em" }}>
        <Briefcase size={13} aria-hidden /> {t("For your clients")}
      </p>
      {!template?.isPublic && roster.length > 0 && (
        <div>
          {label(t("Assign to"))}
          <button
            type="button"
            onClick={(e) => setPickerAnchor(e.currentTarget)}
            className="tap w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-start text-sm"
            style={{ minHeight: 44, color: names.length ? INK.ch : INK.chF }}
            aria-haspopup="listbox"
          >
            {names.length ? names.join(isRtl() ? "، " : ", ") : t("Choose clients")}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between rounded-2xl bg-cream-soft" style={{ padding: "12px 16px", gap: 12 }}>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-charcoal">{t("Save as template")}</span>
          <span className="block text-[12px] text-charcoal-faint">{t("Reuse it in other programmes")}</span>
        </span>
        <Toggle checked onChange={() => undefined} disabled label={t("Save as template")} />
      </div>
      <label className="block">
        {label(t("Programme length (weeks)"))}
        <input
          value={weeks}
          onChange={(e) => setWeeks(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          className="w-28 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      {workoutTemplateFolders.length > 0 && (
        <div>
          {label(t("Folder"))}
          <div className="flex flex-wrap gap-2">
            {[{ id: null as string | null, name: t("Unfiled"), parentId: null as string | null | undefined }, ...workoutTemplateFolders].map((f) => (
              <button
                key={f.id ?? "unfiled"}
                type="button"
                onClick={() => setFolderId(f.id)}
                aria-pressed={folderId === f.id}
                className={clsx(
                  "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                  folderId === f.id ? "bg-primary-fill text-on-primary-fill border-primary-fill" : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
                style={{ minHeight: 36 }}
              >
                {f.parentId ? "↳ " : ""}
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
          {t("Note to client")} <span className="text-charcoal-faint font-normal">{t("(read-only for them)")}</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </label>
      <PlaylistField
        value={playlist}
        onChange={setPlaylist}
        hint={t("Your clients see it on this workout and can play it while they train.")}
        labelStyle={{ fontWeight: 600 }}
        inputStyle={{ borderRadius: 16, fontWeight: 400 }}
      />
    </div>
  );

  const pro: RoutineSheetPro = {
    title: template ? template.name : t("Create Routine"),
    initial,
    submitLabel: t("Save routine"),
    onSubmit: submit,
    extra,
    settings: (exercise): ExerciseSettingsPro => ({
      ...(onTargets && exercise.exerciseId && exercise.intensityPct
        ? { targets: { summary: targetsSummary?.(exercise) ?? null, onOpen: () => onTargets(exercise) } }
        : {}),
    }),
  };

  return (
    <>
      <CreateRoutineSheet open={open} onClose={onClose} folderId={folderId} pro={pro} />
      <PopupMenu<string>
        open={!!pickerAnchor}
        anchor={pickerAnchor}
        onClose={() => setPickerAnchor(null)}
        multiSelect
        selected={assignTo}
        width={240}
        options={roster.map((c) => ({ value: c.clientId!, label: c.name, icon: assignTo.includes(c.clientId!) ? <Check size={15} /> : undefined }))}
        onSelect={(id) => setAssignTo((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
      />
    </>
  );
};
