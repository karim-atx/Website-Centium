import React, { useMemo, useRef, useState } from "react";
import { ArrowUp, ClipboardList, Copy, EllipsisVertical, Eraser, Pencil, Plus, Send, Trash2, UserRound, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { ConfirmCard } from "../../ui/ConfirmCard";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { textPx } from "../../../theme/textSize";
import { todayLocal } from "../../../utils/date";
import { DAY_LONG, DAY_SHORT } from "../../../utils/week";
import { INK } from "../proInk";
import { ProCardSkeleton, ProError } from "../states";
import { Card, ListCard, SectionHead } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { DetailHeader, ErrorLine, FilterChip, SquareBtn } from "../library/libraryUi";
import { copyProgrammeWeek, deleteProgramme, setProgrammeDay } from "../../../services/programmes";
import { addToDay, assignmentStatus, buildGrid, moveInDay, programmeMeta, removeFromDay, weekCount } from "../../../services/programmes/model";
import type { ProgrammesState } from "./useProgrammes";
import { AddWorkoutSheet } from "./AddWorkoutSheet";
import { AssignProgrammeSheet } from "./AssignProgrammeSheet";
import { ProgrammeDetailsSheet } from "./ProgrammeDetailsSheet";

/**
 * Round D · DT1 TR2 Programme builder (Library › Programmes ›
 * ?view=programme&id=).
 *
 * - Header: the name, "{n} weeks · {n} workouts a week · used by {n}
 *   clients", the description and the coach note; ⋮ Edit details / Assign
 *   to a client / Delete.
 * - Scrolling "Week 1…n" tabs, and the week's ⋮ (D-S2): "Copy this week
 *   to…" (copy_programme_week REPLACES the target week, so the sheet says so
 *   before it copies) and "Clear this week" (a ConfirmCard first).
 * - Mon–Sun rows: each day's workouts in order (up to four), with move up
 *   and remove; a dashed "Rest day +" when empty. Every change is one
 *   set_programme_day call that replaces the whole day.
 * - Assigned to clients: the active assignments; a row opens the client's
 *   progress (?view=programme-client&id=).
 *
 * Changes to the plan show at once in each client's schedule and progress
 * (they are read from the plan); their calendars and routines change when the
 * programme is assigned again, as the server does it.
 */
export const ProgrammeBuilder: React.FC<{
  programmeId: string;
  state: ProgrammesState;
  onBack: () => void;
  onOpenAssignment: (assignmentId: string) => void;
  onDeleted: () => void;
}> = ({ programmeId, state, onBack, onOpenAssignment, onDeleted }) => {
  const { workoutTemplates, professionalClients } = useApp();
  const today = todayLocal();
  const [week, setWeek] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [weekAnchor, setWeekAnchor] = useState<HTMLElement | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "clear" | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyTo, setCopyTo] = useState(2);
  const menuRef = useRef<HTMLButtonElement>(null);
  const weekRef = useRef<HTMLButtonElement>(null);

  const programme = state.programmes.find((p) => p.id === programmeId) ?? null;
  const weeks = programme?.durationWeeks ?? 0;
  const grid = buildGrid(weeks, state.slots[programmeId] ?? []);
  const own = useMemo(() => workoutTemplates.filter((t) => !t.isPublic), [workoutTemplates]);
  const byId = useMemo(() => new Map(workoutTemplates.map((t) => [t.id, t])), [workoutTemplates]);

  if (state.status === "loading") return <ProCardSkeleton lines={4} height={220} />;
  if (state.status === "error" && !programme) return <ProError onRetry={() => void state.reload()} />;
  if (!programme) {
    return (
      <>
        <DetailHeader title="Programme" onBack={onBack} />
        <p style={{ fontSize: textPx(13), color: INK.chF }}>This programme isn't available any more.</p>
      </>
    );
  }

  const w = Math.min(Math.max(week, 1), weeks);
  const days = grid[w - 1] ?? [];
  const active = state.assignments.filter((a) => a.programmeId === programme.id && !a.endedAt);
  const clientName = (id: string) => professionalClients.find((c) => c.clientId === id)?.name ?? "A former client";

  /** One write, then a re-read; errors stay on screen until the next write. */
  const write = async (fn: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.message);
    await state.reload();
    setBusy(false);
    return r.ok;
  };
  const saveDay = (day: number, ids: string[]) => void write(() => setProgrammeDay(programme.id, w, day, ids));

  const clearWeek = async () => {
    await write(async () => {
      for (let d = 1; d <= 7; d += 1) {
        if ((days[d - 1] ?? []).length === 0) continue;
        const r = await setProgrammeDay(programme.id, w, d, []);
        if (!r.ok) return r;
      }
      return { ok: true as const };
    });
    setConfirm(null);
  };

  const targetHasWorkouts = weekCount(grid[copyTo - 1]) > 0;

  return (
    <div style={{ paddingBottom: 32 }}>
      <DetailHeader
        title={programme.name}
        eyebrow="Programme"
        onBack={onBack}
        right={<SquareBtn ref={menuRef} icon={EllipsisVertical} label="Programme options" onClick={() => setMenuAnchor(menuRef.current)} />}
      />
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 8 }}>{programmeMeta(weeks, grid, new Set(active.map((a) => a.clientId)).size)}</p>
      {programme.description && <p style={{ fontSize: textPx(13), color: INK.ch, lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-wrap" }}>{programme.description}</p>}
      {programme.coachNote && (
        <div style={{ background: INK.soft, borderRadius: 14, padding: "10px 12px", marginBottom: 10 }}>
          <p style={{ fontSize: textPx(11), fontWeight: 700, color: INK.chF, marginBottom: 2 }}>Coach note</p>
          <p style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{programme.coachNote}</p>
        </div>
      )}
      <div className="flex" style={{ marginBottom: 14 }}>
        <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label="Assign to a client" onClick={() => setAssigning(true)} />
      </div>

      {error && <ErrorLine>{error}</ErrorLine>}
      {state.status === "error" && <ErrorLine>{state.offline ? "You're offline. Showing what was loaded." : "Couldn't refresh this programme."}</ErrorLine>}

      <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
        <div className="flex-1 min-w-0 flex scroll-row no-scrollbar" style={{ gap: 6 }} role="tablist" aria-label="Weeks">
          {Array.from({ length: weeks }, (_, i) => (
            <FilterChip key={i + 1} label={`Week ${i + 1}`} on={w === i + 1} onClick={() => setWeek(i + 1)} />
          ))}
        </div>
        <SquareBtn ref={weekRef} icon={EllipsisVertical} label={`Week ${w} options`} onClick={() => setWeekAnchor(weekRef.current)} />
      </div>

      <Card pad="4px 14px">
        {days.map((ids, i) => {
          const day = i + 1;
          return (
            <div key={day} style={{ padding: "10px 0", borderBottom: i < 6 ? `1px solid ${INK.b06}` : "none" }}>
              <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: ids.length ? 6 : 0 }}>
                <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, minWidth: 36 }}>{DAY_SHORT[i]}</span>
                {ids.length === 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAdding(day)}
                    className="tap flex-1 flex items-center justify-between text-start"
                    style={{ minHeight: 40, borderRadius: 12, border: `1.5px dashed ${INK.b10}`, padding: "0 12px", color: INK.chF, fontSize: textPx(12.5), fontWeight: 600 }}
                    aria-label={`Rest day. Add a workout to ${DAY_LONG[i]}`}
                  >
                    Rest day
                    <Plus size={15} strokeWidth={2} aria-hidden />
                  </button>
                ) : (
                  ids.length < 4 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setAdding(day)}
                      className="tap relative flex items-center before:absolute before:-inset-3 before:content-['']"
                      style={{ gap: 4, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
                      aria-label={`Add a workout to ${DAY_LONG[i]}`}
                    >
                      <Plus size={13} strokeWidth={2.4} aria-hidden /> Add
                    </button>
                  )
                )}
              </div>
              {ids.map((id, k) => {
                const t = byId.get(id);
                return (
                  <div key={`${id}-${k}`} className="flex items-center" style={{ gap: 10, background: INK.soft, borderRadius: 12, padding: "8px 10px", marginTop: k ? 6 : 0 }}>
                    <ClipboardList size={15} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent, flexShrink: 0 }} />
                    <span className="flex-1 min-w-0">
                      <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                        {t?.name ?? "A workout"}
                      </span>
                      {t && (
                        <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                          {[`${t.exercises.length} ${t.exercises.length === 1 ? "exercise" : "exercises"}`, t.durationMin ? `${t.durationMin} min` : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    {k > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveDay(day, moveInDay(ids, k, -1))}
                        aria-label={`Move ${t?.name ?? "workout"} up`}
                        className="tap relative shrink-0 flex items-center justify-center before:absolute before:-inset-2 before:content-['']"
                        style={{ width: 28, height: 28, color: INK.chS }}
                      >
                        <ArrowUp size={15} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveDay(day, removeFromDay(ids, k))}
                      aria-label={`Remove ${t?.name ?? "workout"} from ${DAY_LONG[i]}`}
                      className="tap relative shrink-0 flex items-center justify-center before:absolute before:-inset-2 before:content-['']"
                      style={{ width: 28, height: 28, color: INK.chS }}
                    >
                      <X size={15} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Card>

      <SectionHead label="Assigned to clients" className="mt-2" />
      {active.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>Not assigned to anyone yet.</p>
      ) : (
        <ListCard
          rows={active.map((a) => ({
            key: a.id,
            icon: UserRound,
            title: clientName(a.clientId),
            meta: [assignmentStatus(a, weeks, today, (d) => fmtDay(d)), `ends ${fmtDay(a.endsOn)}`].filter(Boolean).join(" · "),
            onClick: () => onOpenAssignment(a.id),
          }))}
        />
      )}

      <PopupMenu<"edit" | "assign" | "delete">
        open={!!menuAnchor}
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        options={[
          { value: "edit", label: "Edit details", icon: <Pencil size={15} /> },
          { value: "assign", label: "Assign to a client", icon: <Send size={15} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} />, destructive: true },
        ]}
        onSelect={(v) => {
          setMenuAnchor(null);
          if (v === "edit") setEditing(true);
          else if (v === "assign") setAssigning(true);
          else setConfirm("delete");
        }}
      />
      <PopupMenu<"copy" | "clear">
        open={!!weekAnchor}
        anchor={weekAnchor}
        onClose={() => setWeekAnchor(null)}
        options={[
          { value: "copy", label: "Copy this week to…", icon: <Copy size={15} />, disabled: weeks < 2 || weekCount(days) === 0 },
          { value: "clear", label: "Clear this week", icon: <Eraser size={15} />, destructive: true, disabled: weekCount(days) === 0 },
        ]}
        onSelect={(v) => {
          setWeekAnchor(null);
          if (v === "copy") {
            setCopyTo(w === weeks ? 1 : w + 1);
            setCopying(true);
          } else setConfirm("clear");
        }}
      />

      <AddWorkoutSheet
        open={adding !== null}
        onClose={() => setAdding(null)}
        dayLabel={adding ? DAY_LONG[adding - 1] : ""}
        templates={own}
        onPick={(templateId) => {
          const day = adding;
          setAdding(null);
          if (!day) return;
          const next = addToDay(days[day - 1] ?? [], templateId);
          if (next) saveDay(day, next);
          else setError("A day can hold up to four workouts.");
        }}
      />
      <ProgrammeDetailsSheet open={editing} onClose={() => setEditing(false)} programme={programme} onSaved={() => void state.reload()} />
      <AssignProgrammeSheet
        open={assigning}
        onClose={() => setAssigning(false)}
        programmes={state.programmes}
        assignments={state.assignments}
        programmeId={programme.id}
        onAssigned={() => void state.reload()}
      />
      <BottomSheet open={copying} onClose={() => setCopying(false)} title={`Copy week ${w}`}>
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Copy to</span>
            <select
              value={copyTo}
              onChange={(e) => setCopyTo(Number(e.target.value))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ minHeight: 44 }}
            >
              {Array.from({ length: weeks }, (_, i) => i + 1)
                .filter((n) => n !== w)
                .map((n) => (
                  <option key={n} value={n}>{`Week ${n}${weekCount(grid[n - 1]) ? ` (${weekCount(grid[n - 1])} workouts)` : ""}`}</option>
                ))}
            </select>
          </label>
          <p style={{ fontSize: textPx(12.5), color: targetHasWorkouts ? INK.hi : INK.chS, lineHeight: 1.45 }}>
            {targetHasWorkouts
              ? `Week ${copyTo} is replaced. Its ${weekCount(grid[copyTo - 1])} workouts are removed first.`
              : `Week ${copyTo} will look like week ${w}.`}
          </p>
          <Button
            fullWidth
            size="lg"
            disabled={busy}
            onClick={async () => {
              const ok = await write(async () => {
                const r = await copyProgrammeWeek(programme.id, w, copyTo);
                return r.ok ? { ok: true as const } : r;
              });
              if (ok) {
                setCopying(false);
                setWeek(copyTo);
              }
            }}
          >
            {busy ? "Copying…" : targetHasWorkouts ? `Replace week ${copyTo}` : `Copy to week ${copyTo}`}
          </Button>
        </div>
      </BottomSheet>

      <ConfirmCard
        open={confirm === "clear"}
        title={`Clear week ${w}?`}
        subtitle={`Its ${weekCount(days)} workouts leave the programme. Clients' calendars change when you assign it again.`}
        confirmLabel="Clear week"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void clearWeek()}
      />
      <ConfirmCard
        open={confirm === "delete"}
        title={`Delete ${programme.name}?`}
        subtitle={
          active.length
            ? `It ends now for ${active.length} ${active.length === 1 ? "client" : "clients"}: the sessions ahead leave their calendars. The routines they have stay.`
            : "This can't be undone."
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          const r = await deleteProgramme(programme.id);
          setBusy(false);
          setConfirm(null);
          if (!r.ok) {
            setError(r.message);
            return;
          }
          await state.reload();
          onDeleted();
        }}
      />
    </div>
  );
};
