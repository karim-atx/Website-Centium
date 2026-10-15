import React, { useEffect, useState } from "react";
import { Check, Dumbbell, Repeat2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { Exercise, WorkoutTemplate } from "../../../types";
import { fetchClientCopy, fetchReviewState, fetchSession, markReviewed, type ProgrammeSession, type ReviewState } from "../../../services/pro/library";
import { clock12 } from "../../../utils/time12";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { PinnedCta } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { LockLine } from "../LockLine";
import { ComingSoonPill } from "../ComingSoon";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { DetailHeader } from "./libraryUi";
import { compareLog, currentWeek, parseSwaps, type LogStatus } from "./libraryModel";

/**
 * Release 3 · W5 TR22 "Client workout log · targets vs logged, swap".
 *
 * One session the client shares (Workout activity), each prescribed exercise
 * against what was logged: Changed (swapped, from workout_sessions.swaps),
 * As planned, Above, Below, Skipped. Targets come from the client's own copy
 * when it's readable, else the template. "Mark as reviewed" reads the session's
 * To review notification (written by workout_sessions_tell_coach) and sets its
 * read_at; it isn't offered when the trigger wrote none. "Reply to {first}"
 * has no backend for workout sessions yet: Coming soon.
 */
export const WorkoutLogView: React.FC<{ sessionId: string; template: WorkoutTemplate | null; onBack: () => void }> = ({ sessionId, template: given, onBack }) => {
  const { professionalClients, templateAssignments, workoutTemplates } = useApp();
  const [session, setSession] = useState<ProgrammeSession | null>(null);
  const [targets, setTargets] = useState<Exercise[] | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none" | "error" | "offline">("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchSession(sessionId).then(async (r) => {
      if (cancelled) return;
      if (!r.ok) {
        setState(r.offline && session ? "offline" : "error");
        return;
      }
      if (!r.data) {
        setState("none");
        return;
      }
      const [copy, rv] = await Promise.all([r.data.routineId ? fetchClientCopy(r.data.routineId) : Promise.resolve(null), fetchReviewState(sessionId)]);
      if (cancelled) return;
      setSession(r.data);
      setTargets(copy && copy.ok && copy.data ? copy.data.exercises : null);
      setReview(rv.ok ? rv.data : null);
      setState("ok");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, reload]);

  const client = session ? professionalClients.find((c) => c.clientId === session.userId) : undefined;
  const name = client?.name ?? "";
  const first = name.split(" ")[0] ?? "";

  if (client && !client.access.workoutActivity) {
    return (
      <div>
        <DetailHeader title={name} eyebrow="Workout log" onBack={onBack} />
        <LockLine what="Workout activity" clientFirstName={first} />
      </div>
    );
  }

  const assignment = session ? templateAssignments.find((a) => a.routineId === session.routineId && a.clientId === session.userId) : undefined;
  const template = given ?? (assignment ? workoutTemplates.find((t) => t.id === assignment.templateId) ?? null : null);
  const swaps = session ? parseSwaps(session.swaps) : [];
  const rows = session ? compareLog(targets ?? template?.exercises ?? [], session, swaps) : [];
  const week = assignment && session ? currentWeek(assignment.startsOn, assignment.joinWeek, template?.durationWeeks, session.date) : null;
  const rpes = session ? session.exercises.flatMap((e) => e.sets.map((s) => s.rpe).filter((x): x is number => typeof x === "number")) : [];
  const rpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 2) / 2 : null;
  const line = session
    ? [
        template && session.routineName !== template.name ? session.routineName : null,
        template ? (week ? `${template.name}, week ${week.n}` : template.name) : session.routineName,
        session.durationSec ? `${Math.round(session.durationSec / 60)} min` : null,
        rpe != null ? `RPE ${rpe}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const when = session ? `Workout log · ${session.date === todayLocal() ? "Today" : fmtDay(session.date)} ${clock12(session.startedAt)}` : "Workout log";

  const STATUS: Record<LogStatus, { label: string; ink: string }> = {
    changed: { label: "Changed", ink: INK.goldInk },
    planned: { label: "As planned", ink: INK.good },
    above: { label: "Above", ink: INK.good },
    below: { label: "Below", ink: INK.goldInk },
    skipped: { label: "Skipped", ink: INK.hi },
  };

  return (
    <div style={{ paddingBottom: review && !review.reviewed ? 96 : 0 }}>
      <DetailHeader title={name || " "} eyebrow={when} onBack={onBack} />
      {state === "offline" && <OfflineLine />}
      {state === "loading" && <ProCardSkeleton lines={4} />}
      {state === "error" && <ProError onRetry={() => setReload((n) => n + 1)} />}
      {state === "none" && <p style={{ fontSize: textPx(12.5), color: INK.chF }}>This session is no longer shared.</p>}
      {session && (
        <>
          {line && <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>{line}</p>}
          {swaps.map((s) => (
            <div key={`${s.from}-${s.to}`} className="flex items-start" style={{ gap: 10, background: INK.goldPale, borderRadius: 16, padding: "12px 14px", marginBottom: 12 }}>
              <Repeat2 size={16} aria-hidden style={{ color: INK.goldInk, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: textPx(13), color: INK.ch }}>
                <span style={{ fontWeight: 700 }}>{`${s.from} swapped for ${s.to}`}</span>
                {s.reason ? ` · "${s.reason}"` : ""}
              </p>
            </div>
          ))}
          {rows.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF }}>Nothing logged in this session.</p>
          ) : (
            <ListCard
              rows={rows.map((r, i) => ({
                key: `${r.name}-${i}`,
                icon: Dumbbell,
                title: r.swapped ? `${r.name} (swap)` : r.name,
                meta: r.status === "skipped" ? "Skipped" : [r.target, r.logged].filter(Boolean).join(" · "),
                trailing: <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: STATUS[r.status].ink, flexShrink: 0 }}>{STATUS[r.status].label}</span>,
              }))}
            />
          )}
          <div className="flex items-center" style={{ gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: textPx(13), color: INK.chS }}>{`Reply to ${first}`}</span>
            <ComingSoonPill />
          </div>
          {review?.reviewed && (
            <p className="flex items-center mt-4" style={{ gap: 6, fontSize: textPx(12.5), fontWeight: 700, color: INK.good }}>
              <Check size={14} aria-hidden /> Reviewed
            </p>
          )}
          {review && !review.reviewed && (
            <PinnedCta
              primary={{
                label: "Mark as reviewed",
                icon: <Check size={15} />,
                onClick: () => void markReviewed(review.notificationId).then((ok) => ok && setReview({ ...review, reviewed: true })),
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
