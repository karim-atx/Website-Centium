import React, { useEffect, useState } from "react";
import { Dumbbell, Repeat2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { Exercise, WorkoutTemplate } from "../../../types";
import { fetchClientCopy, fetchSession, type ProgrammeSession } from "../../../services/pro/library";
import { clock12 } from "../../../utils/time12";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { LockLine } from "../LockLine";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { DetailHeader } from "./libraryUi";
import { compareLog, currentWeek, parseSwaps, type LogStatus } from "./libraryModel";
import { WorkoutLogReplies } from "./WorkoutLogReplies";
import { t, tx } from "../../../i18n/core";

/**
 * Release 3 · W5 TR22 "Client workout log · targets vs logged, swap".
 *
 * One session the client shares (Workout activity), each prescribed exercise
 * against what was logged: Changed (swapped, from workout_sessions.swaps),
 * As planned, Above, Below, Skipped. Targets come from the client's own copy
 * when it's readable, else the template. Round D: "Reply to {first}" and
 * "Mark as reviewed" are WorkoutLogReplies (reply_to_workout_log,
 * mark_workout_log_reviewed), which replaced the To review notification read.
 */
export const WorkoutLogView: React.FC<{ sessionId: string; template: WorkoutTemplate | null; onBack: () => void }> = ({ sessionId, template: given, onBack }) => {
  const { professionalClients, templateAssignments, workoutTemplates, exerciseCatalog, customExercises } = useApp();
  const [session, setSession] = useState<ProgrammeSession | null>(null);
  const [targets, setTargets] = useState<Exercise[] | null>(null);
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
      const copy = r.data.routineId ? await fetchClientCopy(r.data.routineId) : null;
      if (cancelled) return;
      setSession(r.data);
      setTargets(copy && copy.ok && copy.data ? copy.data.exercises : null);
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
        <DetailHeader title={name} eyebrow={t("Workout log")} onBack={onBack} />
        <LockLine what={t("Workout activity")} clientFirstName={first} />
      </div>
    );
  }

  const assignment = session ? templateAssignments.find((a) => a.routineId === session.routineId && a.clientId === session.userId) : undefined;
  const template = given ?? (assignment ? workoutTemplates.find((w) => w.id === assignment.templateId) ?? null : null);
  const prescribed = targets ?? template?.exercises ?? [];
  const swaps = session
    ? parseSwaps(session.swaps, { prescribed, catalog: exerciseCatalog, custom: customExercises, logged: session.exercises })
    : [];
  const rows = session ? compareLog(prescribed, session, swaps) : [];
  const week = assignment && session ? currentWeek(assignment.startsOn, assignment.joinWeek, template?.durationWeeks, session.date) : null;
  const rpes = session ? session.exercises.flatMap((e) => e.sets.map((s) => s.rpe).filter((x): x is number => typeof x === "number")) : [];
  const rpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 2) / 2 : null;
  const line = session
    ? [
        template && session.routineName !== template.name ? session.routineName : null,
        template ? (week ? t("{name}, week {n}", { name: template.name, n: week.n }) : template.name) : session.routineName,
        session.durationSec ? t("{n} min", { n: Math.round(session.durationSec / 60) }) : null,
        rpe != null ? t("RPE {n}", { n: rpe }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const when = session ? t("Workout log · {day} {time}", { day: session.date === todayLocal() ? t("Today") : fmtDay(session.date), time: clock12(session.startedAt) }) : t("Workout log");

  const STATUS: Record<LogStatus, { label: string; ink: string }> = {
    changed: { label: t("Changed"), ink: INK.goldInk },
    planned: { label: t("As planned"), ink: INK.good },
    above: { label: tx("Above", "target"), ink: INK.good },
    below: { label: tx("Below", "target"), ink: INK.goldInk },
    skipped: { label: t("Skipped"), ink: INK.hi },
  };

  return (
    <div>
      <DetailHeader title={name || " "} eyebrow={when} onBack={onBack} />
      {state === "offline" && <OfflineLine />}
      {state === "loading" && <ProCardSkeleton lines={4} />}
      {state === "error" && <ProError onRetry={() => setReload((n) => n + 1)} />}
      {state === "none" && <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("This session is no longer shared.")}</p>}
      {session && (
        <>
          {line && <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>{line}</p>}
          {swaps.map((s) => (
            <div key={`${s.from}-${s.to}`} className="flex items-start" style={{ gap: 10, background: INK.goldPale, borderRadius: 16, padding: "12px 14px", marginBottom: 12 }}>
              <Repeat2 size={16} aria-hidden style={{ color: INK.goldInk, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: textPx(13), color: INK.ch }}>
                <span style={{ fontWeight: 700 }}>{t("{from} swapped for {to}", { from: s.from, to: s.to })}</span>
                {s.reason ? ` · ${t("\"{reason}\"", { reason: s.reason })}` : ""}
              </p>
            </div>
          ))}
          {rows.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("Nothing logged in this session.")}</p>
          ) : (
            <ListCard
              rows={rows.map((r, i) => ({
                key: `${r.name}-${i}`,
                icon: Dumbbell,
                title: r.swapped ? t("{name} (swap)", { name: r.name }) : r.name,
                meta: r.status === "skipped" ? t("Skipped") : [r.target, r.logged].filter(Boolean).join(" · "),
                trailing: <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: STATUS[r.status].ink, flexShrink: 0 }}>{STATUS[r.status].label}</span>,
              }))}
            />
          )}
          <WorkoutLogReplies sessionId={session.id} clientFirstName={first} />
        </>
      )}
    </div>
  );
};
