import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { getOverwriteDiff, type PrescriptionDiff } from "../../services/templates";
import type { WorkoutTemplate } from "../../types";
import { UnverifiedProgramNotice } from "../workout/UnverifiedProgramNotice";
import { ArrowRight, CalendarDays, Check, X } from "lucide-react";
import clsx from "clsx";

// Pushing a template to a client, one client at a time, each with their own day.
//
// WHY THIS IS ITS OWN SCREEN. Assignment used to be two controls inside the
// template editor — a row of client chips and one date shared by all of them —
// which could not express what the schema stores and hid what the act actually
// does. Assigning is DESTRUCTIVE: assign_template_to_client deletes every
// routine_exercises row the client has for that routine and re-copies the
// template's. Something that can throw away a person's adjustments deserves a
// screen that says so, not a chip.
//
// THE DATABASE IS THE GUARD, NOT THIS COMPONENT. The function compares the
// routine's updated_at against the assignment's assigned_at inside the
// transaction that would do the overwrite, behind its own FOR UPDATE locks, and
// raises ATX18 when the client has edited since. Everything below only explains
// to a human what they are being asked to approve; if the client edits again
// between the warning and the confirmation, the function refuses a second time
// and this shows the warning again rather than crashing.
export const AssignTemplateSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  template: WorkoutTemplate | null;
}> = ({ open, onClose, template }) => {
  const { professionalClients, templateAssignments, assignTemplate, unassignTemplate } = useApp();

  const [days, setDays] = useState<Record<string, string>>({});
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The client whose overwrite is being confirmed, with what would change. */
  const [pending, setPending] = useState<{
    clientId: string;
    clientName: string;
    day: string | null;
    differences: PrescriptionDiff[];
    routineName?: string;
  } | null>(null);

  const assignmentsForTemplate = templateAssignments.filter((a) => a.templateId === template?.id);
  const assignmentFor = (clientId: string | undefined) =>
    clientId ? assignmentsForTemplate.find((a) => a.clientId === clientId) : undefined;

  // Each client's date box starts at whatever THAT client is already assigned
  // for — the per-client day the old single shared field could not hold.
  useEffect(() => {
    if (!open) return;
    setDays(
      Object.fromEntries(
        professionalClients.map((c) => [c.clientId ?? c.id, assignmentFor(c.clientId)?.assignedDay ?? ""])
      )
    );
    setError(null);
    setPending(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  if (!template) return null;

  const push = async (clientId: string, clientName: string, confirmOverwrite: boolean) => {
    const day = days[clientId]?.trim() || null;
    setBusyClientId(clientId);
    setError(null);

    const result = await assignTemplate(template.id, clientId, day, confirmOverwrite);

    if (result.ok) {
      setBusyClientId(null);
      setPending(null);
      return;
    }

    // ATX18. Not an error to report — a question to ask, and the answer is a
    // list of what would be lost rather than "something changed".
    if (result.needsOverwriteConfirmation) {
      const assignment = assignmentFor(clientId);
      const diff = assignment?.routineId
        ? await getOverwriteDiff(assignment.routineId, template.exercises)
        : { ok: true as const, differences: [], routineName: undefined };
      setBusyClientId(null);
      setPending({
        clientId,
        clientName,
        day,
        differences: diff.ok ? diff.differences : [],
        routineName: diff.ok ? diff.routineName : undefined,
      });
      return;
    }

    setBusyClientId(null);
    setPending(null);
    setError(result.message ?? "Couldn't assign that template.");
  };

  const remove = async (assignmentId: string) => {
    setBusyClientId(assignmentId);
    const message = await unassignTemplate(assignmentId);
    setBusyClientId(null);
    setError(message ?? null);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Assign "${template.name}"`}>
      <div className="space-y-4 animate-fade-slide-up">
        {/* CURATED PROGRAMS ARE NOT ASSIGNABLE, and the function says so too:
            a public template has no owner, so `owner_id is distinct from
            auth.uid()` holds and it raises ATX09. Saying it here beats
            offering a button that always fails. */}
        {template.isPublic ? (
          <>
            {/* Said before the professional decides to build on it, since
                duplicating is the next thing this screen points them at. */}
            <UnverifiedProgramNotice
              isVerified={template.isVerified}
              isPublic={template.isPublic}
            />
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              This is a starter program from Centium. It can't be assigned or edited — duplicate it
              into a template of your own first.
            </p>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Each client gets their own copy of this plan, on their own day. Assigning again later
              replaces what they have with the current version of this template.
            </p>

            {professionalClients.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-6">
                You don't have any clients yet.
              </p>
            )}

            <div className="space-y-2">
              {professionalClients.map((c) => {
                const clientProfileId = c.clientId;
                const assignment = assignmentFor(clientProfileId);
                const busy = busyClientId === clientProfileId || busyClientId === assignment?.id;
                return (
                  <div key={c.id} className="bg-cream-soft rounded-2xl px-3.5 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                        <p className="text-[10.5px] font-medium text-charcoal-faint">
                          {assignment
                            ? assignment.assignedDay
                              ? `Assigned for ${assignment.assignedDay}`
                              : "Assigned, no day set"
                            : "Not assigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => clientProfileId && void push(clientProfileId, c.name, false)}
                          disabled={busy || !clientProfileId}
                        >
                          {assignment ? "Re-assign" : "Assign"}
                        </Button>
                        {assignment && (
                          <button
                            onClick={() => void remove(assignment.id)}
                            disabled={busy || !clientProfileId}
                            aria-label={`Unassign ${c.name}`}
                            className="tap w-7 h-7 rounded-full bg-cream-card flex items-center justify-center text-charcoal-faint disabled:opacity-40"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <CalendarDays size={13} className="text-charcoal-faint shrink-0" />
                      <input
                        type="date"
                        value={days[clientProfileId ?? c.id] ?? ""}
                        onChange={(e) =>
                          setDays((prev) => ({ ...prev, [clientProfileId ?? c.id]: e.target.value }))
                        }
                        aria-label={`Day for ${c.name}`}
                        className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <p className="text-[11.5px] font-semibold text-status-high text-center">{error}</p>
        )}

        {/* The overwrite warning. Shown only when the database refused, and
            listing the actual prescriptions that would change. */}
        {pending && (
          <div className="rounded-2xl border border-status-high/30 bg-cream-card p-3.5 space-y-3">
            <div>
              <p className="text-sm font-bold text-charcoal">
                {pending.clientName} has changed this routine
              </p>
              <p className="text-[11.5px] text-charcoal-soft leading-relaxed mt-0.5">
                Re-assigning replaces{" "}
                {pending.routineName ? `"${pending.routineName}"` : "their routine"} with this
                template. These changes of theirs would be lost:
              </p>
            </div>

            {pending.differences.length === 0 ? (
              <p className="text-[11.5px] text-charcoal-faint">
                They edited it, but it still matches this template exercise for exercise.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                {pending.differences.map((d) => (
                  <div key={d.name} className="bg-cream-soft rounded-xl px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-charcoal">{d.name}</p>
                    <p className="text-[11px] text-charcoal-soft flex items-center gap-1.5 flex-wrap">
                      {d.current ? (
                        <span>they have {d.current}</span>
                      ) : (
                        <span className="text-charcoal-faint">not in their routine</span>
                      )}
                      <ArrowRight size={11} className="text-charcoal-faint shrink-0" />
                      {d.proposed ? (
                        <span>template has {d.proposed}</span>
                      ) : (
                        <span className="text-charcoal-faint">would be removed</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setPending(null)}
                disabled={busyClientId !== null}
              >
                Keep theirs
              </Button>
              <Button
                fullWidth
                variant="teal"
                onClick={() => void push(pending.clientId, pending.clientName, true)}
                disabled={busyClientId !== null}
              >
                <Check size={14} /> Replace it
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          fullWidth
          onClick={onClose}
          className={clsx(pending && "opacity-60")}
        >
          Done
        </Button>
      </div>
    </BottomSheet>
  );
};
