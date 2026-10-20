import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, UserPlus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { Toggle } from "../../ui/Toggle";
import { useApp } from "../../../context/AppContext";
import { getOverwriteDiff, type PrescriptionDiff } from "../../../services/templates";
import type { WorkoutTemplate } from "../../../types";
import { UnverifiedProgramNotice } from "../../workout/UnverifiedProgramNotice";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { clientsLabel, isActive, programmeEnd } from "./libraryModel";

/**
 * Release 3 · W5 TR5 "Assign to clients · start date and week".
 *
 * Pick clients from the roster, a start date (p_starts_on) and the week they
 * join at (p_join_week, 1 to duration_weeks; 22023 otherwise), with the end
 * date assign_template_to_client will compute shown before assigning. The
 * function takes one client per call, so the picked clients are assigned one
 * at a time, in order.
 *
 * KEPT FROM the old assign-template sheet (ATX18): assigning again replaces the
 * client's copy, and when the client has edited it since the last push the
 * function refuses; the sheet then stops on that client, lists what would be
 * lost (getOverwriteDiff) and asks: "Keep theirs" skips them, "Replace it"
 * calls again with p_confirm_overwrite. A curated program can't be assigned
 * (ATX09): UnverifiedProgramNotice and the old explanation stay.
 */
export const AssignSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  template: WorkoutTemplate | null;
  preselected?: string[];
}> = ({ open, onClose, template, preselected }) => {
  const { professionalClients, templateAssignments, workoutTemplates, assignTemplate } = useApp();
  const [picked, setPicked] = useState<string[]>([]);
  const [startsOn, setStartsOn] = useState(todayLocal());
  const [joinWeek, setJoinWeek] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [pending, setPending] = useState<{ clientId: string; name: string; rest: string[]; differences: PrescriptionDiff[]; routineName?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPicked(preselected ?? []);
    setStartsOn(todayLocal());
    setJoinWeek(1);
    setErrors([]);
    setDone([]);
    setPending(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const roster = useMemo(() => professionalClients.filter((c) => !!c.clientId), [professionalClients]);

  if (!template) return null;
  const weeks = template.durationWeeks ?? null;
  const ends = programmeEnd(startsOn, joinWeek, weeks);

  /** "Not on a programme" / "On {name}, ends {date}" / "On {name}" from my active assignments. */
  const statusOf = (clientId: string) => {
    const a = templateAssignments.find((x) => x.clientId === clientId && isActive(x));
    if (!a) return "Not on a programme";
    const name = workoutTemplates.find((t) => t.id === a.templateId)?.name ?? "";
    return a.endsOn ? `On ${name}, ends ${fmtDay(a.endsOn)}` : `On ${name}`;
  };

  const nameOf = (clientId: string) => roster.find((c) => c.clientId === clientId)?.name ?? "";

  /** Assigns `queue` in order, stopping at an ATX18 to ask. */
  const run = async (queue: string[], confirmFirst = false) => {
    setBusy(true);
    let confirm = confirmFirst;
    for (let i = 0; i < queue.length; i += 1) {
      const clientId = queue[i];
      // The start date is also the assigned day, as the old sheet's per-client day: the
      // function writes the client's calendar event for it (and the Calendar
      // shows it as scheduled for a client).
      const result = await assignTemplate(template.id, clientId, startsOn, confirm, { startsOn, joinWeek });
      confirm = false;
      if (result.ok) {
        setDone((d) => [...d, clientId]);
        continue;
      }
      if (result.needsOverwriteConfirmation) {
        const a = templateAssignments.find((x) => x.templateId === template.id && x.clientId === clientId && isActive(x));
        const diff = a?.routineId ? await getOverwriteDiff(a.routineId, template.exercises) : { ok: true as const, differences: [], routineName: undefined };
        setPending({ clientId, name: nameOf(clientId), rest: queue.slice(i + 1), differences: diff.ok ? diff.differences : [], routineName: diff.ok ? diff.routineName : undefined });
        setBusy(false);
        return;
      }
      setErrors((e) => [...e, `${nameOf(clientId)}: ${result.message ?? "Couldn't assign that template."}`]);
    }
    setBusy(false);
  };

  const finished = done.length > 0 && !busy && !pending && done.length + errors.length >= picked.length;

  return (
    <BottomSheet open={open} onClose={onClose} title="Assign to clients">
      <div className="space-y-4 animate-fade-slide-up">
        <p style={{ fontSize: textPx(13), color: INK.chS }}>{weeks ? `${template.name} · ${weeks} weeks` : template.name}</p>

        {template.isPublic ? (
          <>
            <UnverifiedProgramNotice isVerified={template.isVerified} isPublic={template.isPublic} />
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              This is a starter program from Centium. It can't be assigned or edited. Duplicate it into a template of your own first.
            </p>
          </>
        ) : (
          <>
            {roster.length === 0 && <p className="text-center text-sm text-charcoal-faint py-6">You don't have any clients yet.</p>}
            <div>
              {roster.map((c, i) => {
                const id = c.clientId!;
                const on = picked.includes(id);
                const ok = done.includes(id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={busy || ok}
                    onClick={() => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                    className="tap w-full flex items-center text-left"
                    style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < roster.length - 1 ? `1px solid ${INK.b06}` : "none" }}
                  >
                    <span
                      aria-hidden
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 24, height: 24, borderRadius: 9999, border: `1.5px solid ${on || ok ? INK.fill : "rgb(var(--c-charcoal) / 0.2)"}`, background: on || ok ? INK.fill : "transparent" }}
                    >
                      {(on || ok) && <Check size={14} strokeWidth={3} style={{ color: INK.onFill }} />}
                    </span>
                    <Avatar name={c.name} url={c.avatarUrl} size={32} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                        {c.name}
                      </span>
                      <span className="block truncate" style={{ fontSize: textPx(12), color: INK.chF }}>
                        {ok ? "Assigned" : statusOf(id)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Start date</span>
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => e.target.value && setStartsOn(e.target.value)}
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ minHeight: 44 }}
                />
              </label>
              {weeks && weeks > 1 && (
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Start at</span>
                  <select
                    value={joinWeek}
                    onChange={(e) => setJoinWeek(Number(e.target.value))}
                    className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ minHeight: 44 }}
                  >
                    {Array.from({ length: weeks }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{`Week ${i + 1}`}</option>
                    ))}
                  </select>
                  <span className="block mt-1.5" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                    Pick a later week to join mid-programme
                  </span>
                </label>
              )}
            </div>
            {ends && <p style={{ fontSize: textPx(12), color: INK.chS }}>{`Ends ${fmtDay(ends, true)}`}</p>}

            <div className="flex items-center justify-between rounded-2xl bg-cream-soft" style={{ padding: "12px 16px", gap: 12 }}>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-charcoal">Each client gets their own copy</span>
                <span className="block text-[12px] text-charcoal-faint">Edit one client without changing the template</span>
              </span>
              {/* Always on: assign_template_to_client copies the template into
                  each client's own routine; there is no shared mode. */}
              <Toggle checked onChange={() => undefined} disabled label="Each client gets their own copy" />
            </div>
          </>
        )}

        {errors.map((e) => (
          <p key={e} className="text-[11.5px] font-semibold text-status-high">
            {e}
          </p>
        ))}

        {pending && (
          <div className="rounded-2xl border border-status-high/30 bg-cream-card p-3.5 space-y-3">
            <div>
              <p className="text-sm font-bold text-charcoal">{pending.name} has changed this routine</p>
              <p className="text-[11.5px] text-charcoal-soft leading-relaxed mt-0.5">
                Re-assigning replaces {pending.routineName ? `"${pending.routineName}"` : "their routine"} with this template. These changes of theirs would be lost:
              </p>
            </div>
            {pending.differences.length === 0 ? (
              <p className="text-[11.5px] text-charcoal-faint">They edited it, but it still matches this template exercise for exercise.</p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                {pending.differences.map((d) => (
                  <div key={d.name} className="bg-cream-soft rounded-xl px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-charcoal">{d.name}</p>
                    <p className="text-[11px] text-charcoal-soft flex items-center gap-1.5 flex-wrap">
                      {d.current ? <span>they have {d.current}</span> : <span className="text-charcoal-faint">not in their routine</span>}
                      <ArrowRight size={11} className="text-charcoal-faint shrink-0" />
                      {d.proposed ? <span>template has {d.proposed}</span> : <span className="text-charcoal-faint">would be removed</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                fullWidth
                disabled={busy}
                onClick={() => {
                  const rest = pending.rest;
                  setPending(null);
                  if (rest.length) void run(rest);
                }}
              >
                Keep theirs
              </Button>
              <Button
                fullWidth
                variant="teal"
                disabled={busy}
                onClick={() => {
                  const queue = [pending.clientId, ...pending.rest];
                  setPending(null);
                  void run(queue, true);
                }}
              >
                <Check size={14} /> Replace it
              </Button>
            </div>
          </div>
        )}

        {!template.isPublic && !finished && (
          <Button fullWidth size="lg" disabled={busy || !!pending || picked.filter((id) => !done.includes(id)).length === 0} onClick={() => void run(picked.filter((id) => !done.includes(id)))}>
            <UserPlus size={16} />
            {busy ? "Assigning…" : `Assign to ${clientsLabel(picked.filter((id) => !done.includes(id)).length)}`}
          </Button>
        )}
        {(template.isPublic || finished) && (
          <Button variant="outline" fullWidth onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};
