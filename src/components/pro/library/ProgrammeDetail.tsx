import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Ellipsis, UserPlus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { WorkoutTemplate } from "../../../types";
import { BlockCard } from "../../workout/BlockCard";
import { UnverifiedProgramNotice } from "../../workout/UnverifiedProgramNotice";
import { groupIntoRuns } from "../../../services/workout/blocks";
import { prescriptionLine } from "../../../services/workout/prescription";
import { formatDuration } from "../../../services/workout";
import { fetchProgrammeSessions, type ProgrammeSession } from "../../../services/pro/library";
import { PinnedCta } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar, RoundBtn, SectionHead } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { LockLine } from "../LockLine";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { DetailHeader, ErrorLine } from "./libraryUi";
import { clientsLabel, currentWeek, isActive } from "./libraryModel";
import { todayLocal } from "../../../utils/date";

/**
 * Release 3 · W5 TR2 "Programme builder", as far as the schema goes.
 *
 * workout_templates stores ONE workout (its exercise list and blocks) and a
 * length in weeks; there is no week-by-day schedule to draw Week 1 … Week n
 * tabs or Mon to Sun rows from (a backend gap, reported). So the screen shows
 * the header (Assign, ⋮), "Template · {n} weeks · used by {n} clients", the
 * workout card with every prescription (blocks drawn by BlockCard, as the old
 * expanded template did), the note to the client, and then — kept from the
 * old builder's expanded card — who it's assigned to with their real
 * sessions. Each client's activity has the old four states: not sharing
 * Workout activity (LockLine), loading, none, sessions; a session opens the
 * client's workout log (TR22), a client opens their copy (TR6), Progress
 * opens TR7. Ended assignments are Past programmes.
 */
export const ProgrammeDetail: React.FC<{
  template: WorkoutTemplate;
  onBack: () => void;
  onAssign: () => void;
  onMenu: (anchor: HTMLElement) => void;
  onProgress: () => void;
  onOpenCopy: (assignmentId: string) => void;
  onOpenLog: (sessionId: string) => void;
}> = ({ template, onBack, onAssign, onMenu, onProgress, onOpenCopy, onOpenLog }) => {
  const { templateAssignments, professionalClients, endTemplateAssignment } = useApp();
  const [sessions, setSessions] = useState<ProgrammeSession[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const assignments = templateAssignments.filter((a) => a.templateId === template.id);
  const active = assignments.filter(isActive);
  const past = assignments.filter((a) => !isActive(a));
  const routineIds = useMemo(() => assignments.map((a) => a.routineId).filter((x): x is string => !!x), [assignments]);
  const routineKey = routineIds.join(",");

  // Fetched when the programme opens, not on the list (a roster of forty and
  // thirty templates would otherwise pull every session nobody opened).
  useEffect(() => {
    let cancelled = false;
    if (routineIds.length === 0) {
      setSessions([]);
      setState("ok");
      return;
    }
    setState((s) => (s === "ok" ? s : "loading"));
    void fetchProgrammeSessions(routineIds).then((r) => {
      if (cancelled) return;
      // A FAILED READ IS NOT AN EMPTY ONE: keep what was shown and say so.
      if (!r.ok) {
        setState(r.offline && sessions ? "offline" : "error");
        return;
      }
      setSessions(r.data);
      setState("ok");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineKey, reload]);

  const clientOf = (clientId: string) => professionalClients.find((c) => c.clientId === clientId);
  const meta = ["Template", template.durationWeeks ? `${template.durationWeeks} weeks` : null, `used by ${clientsLabel(active.length)}`].filter(Boolean).join(" · ");
  const runs = groupIntoRuns(template.exercises, template.blocks ?? []);
  const today = todayLocal();

  const activity = (clientId: string, routineId: string | null) => {
    const c = clientOf(clientId);
    if (!c) return null;
    if (!c.access.workoutActivity) return <LockLine what="Workout activity" clientFirstName={c.name.split(" ")[0]} />;
    if (state === "error" && !sessions) return <ProError onRetry={() => setReload((n) => n + 1)} />;
    if (!sessions) return <ProCardSkeleton lines={2} />;
    const mine = sessions.filter((s) => s.userId === clientId && s.routineId === routineId);
    if (mine.length === 0) return <p style={{ fontSize: textPx(11.5), color: INK.chF }}>No sessions logged yet.</p>;
    return (
      <div>
        {mine.slice(0, 3).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpenLog(s.id)}
            className="tap w-full text-left"
            style={{ padding: "8px 0", minHeight: 44, borderTop: `1px solid ${INK.b06}` }}
          >
            <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 600, color: INK.ch }}>
              {fmtDay(s.date)} · {formatDuration(s.durationSec)} · {Math.round(s.totalVolumeKg).toLocaleString()} kg
            </span>
            <span className="block truncate" style={{ fontSize: textPx(11.5), color: INK.chF }}>
              {s.exercises.map((e) => e.name).join(", ")}
            </span>
          </button>
        ))}
        {mine.length > 3 && <p style={{ fontSize: textPx(11), color: INK.chF }}>{`${mine.length - 3} earlier session${mine.length - 3 === 1 ? "" : "s"} not shown.`}</p>}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 96 }}>
      <DetailHeader
        title={template.name}
        onBack={onBack}
        right={
          <div className="flex shrink-0" style={{ gap: 8 }}>
            {!template.isPublic && <RoundBtn icon={UserPlus} label="Assign to clients" onClick={onAssign} />}
            <RoundBtn ref={moreRef} icon={Ellipsis} label="More" onClick={() => moreRef.current && onMenu(moreRef.current)} />
          </div>
        }
      />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>{meta}</p>
      <UnverifiedProgramNotice isVerified={template.isVerified} isPublic={template.isPublic} className="mb-3" />
      {actionError && <ErrorLine>{actionError}</ErrorLine>}

      <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderLeft: `4px solid ${INK.pr}`, borderRadius: 18, padding: "14px 16px", marginBottom: 12 }}>
        <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch }}>{template.name}</p>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 6 }}>
          {[`${template.exercises.length} exercise${template.exercises.length === 1 ? "" : "s"}`, template.durationMin ? `${template.durationMin} min` : null].filter(Boolean).join(" · ")}
        </p>
        {runs.map((run) =>
          run.block ? (
            <div key={run.block.id} style={{ margin: "4px -12px" }}>
              <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
            </div>
          ) : (
            run.members.map((ex) => {
              const line = prescriptionLine(ex);
              return (
                <p key={ex.id} className="flex" style={{ gap: 8, fontSize: textPx(13), color: INK.chS, padding: "2px 0" }}>
                  <span aria-hidden style={{ color: INK.chT }}>•</span>
                  <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>
                    {ex.name}
                    {line ? ` ${line}` : ""}
                  </span>
                </p>
              );
            })
          )
        )}
      </div>

      {template.coachNote && (
        <p className="rounded-xl" style={{ fontSize: textPx(12), color: INK.prDeep, background: INK.prPale, padding: "8px 12px", marginBottom: 12 }}>
          {`Note to client: ${template.coachNote}`}
        </p>
      )}

      {!template.isPublic && (
        <>
          <SectionHead label="Assigned to clients" right={active.length ? "Progress" : undefined} onRight={active.length ? onProgress : undefined} />
          {state === "offline" && <OfflineLine />}
          {active.length === 0 && <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>Not assigned to anyone yet.</p>}
          {active.map((a) => {
            const c = clientOf(a.clientId);
            const week = currentWeek(a.startsOn, a.joinWeek, template.durationWeeks, today);
            const line = [week ? (week.of ? `Week ${week.n} of ${week.of}` : `Week ${week.n}`) : a.startsOn && a.startsOn > today ? `Starts ${fmtDay(a.startsOn)}` : null, a.endsOn ? `ends ${fmtDay(a.endsOn)}` : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={a.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px", marginBottom: 8 }}>
                <button type="button" onClick={() => onOpenCopy(a.id)} className="tap w-full flex items-center text-left" style={{ gap: 12, minHeight: 44 }}>
                  <Avatar name={c?.name ?? ""} url={c?.avatarUrl} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>
                      {c?.name ?? "A client"}
                    </span>
                    {line && <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>{line}</span>}
                  </span>
                </button>
                <div style={{ marginTop: 6 }}>{activity(a.clientId, a.routineId)}</div>
                <div className="flex justify-end" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmEnd !== a.id) {
                        setConfirmEnd(a.id);
                        return;
                      }
                      setConfirmEnd(null);
                      // Remove (not started yet) and End are one call: end_template_assignment
                      // works before the start date and takes the sessions after today off
                      // the client's calendar (follow-up 20261124160000). The row then
                      // shows under Past programmes; the client keeps their routine.
                      void endTemplateAssignment(a.id).then((m) => setActionError(m ?? null));
                    }}
                    className="tap"
                    style={{ minHeight: 44, fontSize: textPx(12), fontWeight: 700, color: confirmEnd === a.id ? INK.hi : INK.chS }}
                  >
                    {confirmEnd === a.id ? "Tap again to confirm" : a.startsOn && a.startsOn > today ? "Remove" : "End programme"}
                  </button>
                </div>
              </div>
            );
          })}

          {past.length > 0 && (
            <>
              <SectionHead label="Past programmes" className="mt-4" />
              {past.map((a) => {
                const c = clientOf(a.clientId);
                return (
                  <div key={a.id} className="flex items-center" style={{ gap: 12, padding: "8px 0", borderBottom: `1px solid ${INK.b06}` }}>
                    <Avatar name={c?.name ?? ""} url={c?.avatarUrl} size={30} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
                        {c?.name ?? "A client"}
                      </span>
                      <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                        {/* Removed before its start: starts_on = ends_on, one date. */}
                        {[...new Set([a.startsOn ? fmtDay(a.startsOn, true) : null, a.endsOn ? fmtDay(a.endsOn, true) : null].filter(Boolean))].join(" to ")}
                      </span>
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {active.length > 0 && (
            <button type="button" onClick={onProgress} className="tap flex items-center mt-3" style={{ gap: 6, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
              <BarChart3 size={15} aria-hidden /> Progress
            </button>
          )}

          <PinnedCta primary={{ label: "Assign to clients", icon: <UserPlus size={15} />, onClick: onAssign }} />
        </>
      )}
    </div>
  );
};

