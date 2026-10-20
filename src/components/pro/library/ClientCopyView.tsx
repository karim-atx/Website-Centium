import React, { useEffect, useMemo, useState } from "react";
import { GitBranch, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { WorkoutTemplate, WorkoutTemplateAssignment } from "../../../types";
import { CreateRoutineSheet, type RoutineDraft, type RoutineSheetPro } from "../../workout/CreateRoutineSheet";
import { BlockCard } from "../../workout/BlockCard";
import { CentredPopup } from "../../ui/CentredPopup";
import { Button } from "../../ui/Button";
import { groupIntoRuns } from "../../../services/workout/blocks";
import { prescriptionLine } from "../../../services/workout/prescription";
import { canEditClientRoutine, fetchClientCopy, saveClientCopy, type ClientCopy } from "../../../services/pro/library";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { DetailHeader, ErrorLine } from "./libraryUi";

/**
 * Release 3 · W5 TR6 "Edit one client's copy or the template".
 *
 * Every client follows their own copy (assign_template_to_client copies the
 * template into their routine). The copy is read through
 * routines_select_assigning_professional; can_edit_client_routine decides
 * whether it's editable (the assigning professional, while the client is
 * connected: Release 3 follow-up 20261124150000). Editable: the shared
 * builder opens on the copy, and Save asks where the change goes — "Only
 * {first}'s copy" (set_routine_exercises + routine_exercise_blocks) or
 * "Update the template" (the template only: existing copies stay as they
 * are). Not editable (ended coaching, another professional's routine):
 * read only, with "Edit the template".
 */
export const ClientCopyView: React.FC<{
  assignment: WorkoutTemplateAssignment;
  template: WorkoutTemplate;
  onBack: () => void;
  onEditTemplate: () => void;
}> = ({ assignment, template, onBack, onEditTemplate }) => {
  const { professionalClients, updateWorkoutTemplate } = useApp();
  const client = professionalClients.find((c) => c.clientId === assignment.clientId);
  const name = client?.name ?? "";
  const first = name.split(" ")[0] ?? "";
  const [copy, setCopy] = useState<ClientCopy | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none" | "error" | "offline">("loading");
  const [editable, setEditable] = useState(false);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!assignment.routineId) {
      setState("none");
      return;
    }
    void Promise.all([fetchClientCopy(assignment.routineId), canEditClientRoutine(assignment.routineId)]).then(([r, can]) => {
      if (cancelled) return;
      if (!r.ok) {
        setState(r.offline && copy ? "offline" : "error");
        return;
      }
      setCopy(r.data);
      setEditable(can);
      setState(r.data ? "ok" : "none");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.routineId, reload]);

  const initial = useMemo(() => (copy ? { name: copy.name, exercises: copy.exercises, blocks: copy.blocks, durationMin: template.durationMin } : undefined), [copy, template.durationMin]);

  /** The names of the exercises the draft changed, for the question's first line. */
  const changed = useMemo(() => {
    if (!draft || !copy) return [] as string[];
    const before = new Map(copy.exercises.map((e) => [e.id, JSON.stringify({ ...e, id: undefined })]));
    return draft.exercises.filter((e) => before.get(e.id) !== JSON.stringify({ ...e, id: undefined })).map((e) => e.name);
  }, [draft, copy]);

  const pro: RoutineSheetPro = {
    title: copy?.name ?? template.name,
    initial,
    submitLabel: "Save routine",
    onSubmit: async (d) => {
      setDraft(d);
      return undefined;
    },
  };

  const onlyTheirs = async () => {
    if (!copy || !draft) return;
    setSaving(true);
    const r = await saveClientCopy(copy, draft.exercises, draft.blocks);
    setSaving(false);
    setDraft(null);
    if (!r.ok) {
      setError(r.message);
      // A refusal (ended coaching meanwhile) drops back to read only.
      setEditable(await canEditClientRoutine(copy.routineId));
      return;
    }
    setError(null);
    setReload((n) => n + 1);
  };

  const toTemplate = async () => {
    if (!draft) return;
    setSaving(true);
    const message = await updateWorkoutTemplate(template.id, { exercises: draft.exercises, blocks: draft.blocks });
    setSaving(false);
    setDraft(null);
    setError(message ?? null);
  };

  const runs = copy ? groupIntoRuns(copy.exercises, copy.blocks) : [];

  return (
    <div>
      <DetailHeader title={copy?.name ?? template.name} eyebrow={name} onBack={onBack} />
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 12 }}>{`${name} follows their own copy of this programme.`}</p>
      {error && <ErrorLine>{error}</ErrorLine>}
      {state === "offline" && <OfflineLine />}
      {state === "loading" && <ProCardSkeleton lines={4} />}
      {state === "error" && <ProError onRetry={() => setReload((n) => n + 1)} />}
      {state === "none" && <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{`${first} has deleted their copy. Assigning again gives them a fresh one.`}</p>}
      {copy && (state === "ok" || state === "offline") && (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "14px 16px", marginBottom: 12 }}>
          {runs.map((run) =>
            run.block ? (
              <div key={run.block.id} style={{ margin: "4px -12px" }}>
                <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
              </div>
            ) : (
              run.members.map((ex) => (
                <div key={ex.id} style={{ padding: "6px 0", borderBottom: `1px solid ${INK.b06}` }}>
                  <p style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>{ex.name}</p>
                  {prescriptionLine(ex) && <p style={{ fontSize: textPx(11.5), color: INK.chF }}>{prescriptionLine(ex)}</p>}
                  {ex.coachNote && <p style={{ fontSize: textPx(11.5), color: INK.prDeep }}>{ex.coachNote}</p>}
                </div>
              ))
            )
          )}
        </div>
      )}
      {copy && editable && (
        <Button fullWidth size="lg" onClick={() => setEditing(true)}>
          <Pencil size={15} /> {`Edit ${first}'s copy`}
        </Button>
      )}
      {(state !== "loading" && (!editable || !copy)) && (
        <Button fullWidth size="lg" variant="outline" onClick={onEditTemplate}>
          <Pencil size={15} /> Edit the template
        </Button>
      )}

      <CreateRoutineSheet open={editing} onClose={() => setEditing(false)} folderId={null} pro={pro} />

      <CentredPopup
        open={!!draft}
        onClose={() => setDraft(null)}
        icon={<GitBranch size={22} />}
        title="Where should this change go?"
        body={`${changed.length ? `You changed ${changed.slice(0, 2).join(" and ")}${changed.length > 2 ? " and more" : ""}. ` : ""}${name} follows their own copy of this programme.`}
      >
        <div className="flex flex-col" style={{ gap: 8 }}>
          <Button fullWidth size="lg" disabled={saving} onClick={() => void onlyTheirs()}>
            {`Only ${first}'s copy`}
          </Button>
          <Button fullWidth size="lg" variant="secondary" disabled={saving} onClick={() => void toTemplate()}>
            Update the template
          </Button>
          <p className="text-center" style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>
            Updating the template changes it for new clients. Existing copies stay as they are.
          </p>
        </div>
      </CentredPopup>
    </div>
  );
};
