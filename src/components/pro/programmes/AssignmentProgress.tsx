import React, { useEffect, useMemo, useState } from "react";
import { Check, Circle, Dumbbell, StopCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { ConfirmCard } from "../../ui/ConfirmCard";
import { CtaButton } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { todayLocal } from "../../../utils/date";
import { DAY_SHORT } from "../../../utils/week";
import { INK } from "../proInk";
import { LockLine } from "../LockLine";
import { ProCardSkeleton, ProError } from "../states";
import { Card, Chip, ListCard, SectionHead, type Tone } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { DetailHeader, ErrorLine, FilterChip } from "../library/libraryUi";
import { endProgrammeAssignment, fetchProgrammeProgress, fetchProgrammeSchedule } from "../../../services/programmes";
import {
  addDays,
  assignmentStatus,
  doneLine,
  groupSchedule,
  summariseProgress,
  totalSoFar,
  weekDayOn,
  type ScheduleRow,
  type WeekProgress,
} from "../../../services/programmes/model";
import type { ProgrammesState } from "./useProgrammes";

/**
 * Round D · DT1 TR7 for one client on a week-by-day programme
 * (?view=programme-client&id={assignment}; also opened from the client
 * page's Plan tab).
 *
 * - The status line, then "So far": done of planned over the weeks begun.
 * - By week (programme_progress): "{n} of {n} sessions done" per week, each
 *   workout's own count under it.
 * - Schedule (programme_schedule): the week's days with each workout and a
 *   done tick.
 * - `done` is null without the client's Workout activity consent: the plan
 *   still shows, and every count says "Not shared", never 0.
 * - End programme (ConfirmCard): end_programme_assignment; the sessions after
 *   today leave the client's calendar and the routines stay theirs.
 */
export const AssignmentProgress: React.FC<{
  assignmentId: string;
  state: ProgrammesState;
  onBack: () => void;
}> = ({ assignmentId, state, onBack }) => {
  const { professionalClients } = useApp();
  const today = todayLocal();
  const [schedule, setSchedule] = useState<ScheduleRow[] | null>(null);
  const [progress, setProgress] = useState<WeekProgress[] | null>(null);
  const [failed, setFailed] = useState<{ offline: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [week, setWeek] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([fetchProgrammeSchedule(assignmentId), fetchProgrammeProgress(assignmentId)]).then(([s, p]) => {
      if (!live) return;
      if (!s.ok || !p.ok) {
        setFailed({ offline: (!s.ok && s.offline) || (!p.ok && p.offline) });
        return;
      }
      setFailed(null);
      setSchedule(s.data);
      setProgress(summariseProgress(p.data));
    });
    return () => {
      live = false;
    };
  }, [assignmentId, nonce]);

  const a = state.assignments.find((x) => x.id === assignmentId) ?? null;
  const programme = a ? state.programmes.find((p) => p.id === a.programmeId) ?? null : null;
  const weeks = useMemo(() => groupSchedule(schedule ?? []), [schedule]);

  if (state.status === "loading") return <ProCardSkeleton lines={4} height={200} />;
  if (!a || !programme) {
    return (
      <>
        <DetailHeader title="Programme" onBack={onBack} />
        {state.status === "error" ? <ProError onRetry={() => void state.reload()} /> : <p style={{ fontSize: textPx(13), color: INK.chF }}>This programme isn't available any more.</p>}
      </>
    );
  }

  const client = professionalClients.find((c) => c.clientId === a.clientId);
  const name = client?.name ?? "A former client";
  const firstName = name.split(" ")[0] || name;
  const status = assignmentStatus(a, programme.durationWeeks, today, (d) => fmtDay(d));
  const hidden = (schedule ?? []).some((r) => r.done === null) || (progress ?? []).some((w) => w.done === null);
  const total = progress ? totalSoFar(progress, today) : null;
  const now = weekDayOn(a, today);
  const shownWeek = week ?? (now && weeks.some((x) => x.week === now.week) ? now.week : weeks[0]?.week ?? null);
  const shown = weeks.find((x) => x.week === shownWeek) ?? null;

  const cell = (wp: WeekProgress): { label: string; tone: Tone } | null => {
    if (wp.weekStartsOn > today) return null;
    if (wp.done === null) return null;
    if (wp.done >= wp.planned) return { label: "Done", tone: "done" };
    const ended = today > addDays(wp.weekStartsOn, 6);
    if (wp.done > 0) return { label: "Partly", tone: "req" };
    return ended ? { label: "Missed", tone: "att" } : { label: "This week", tone: "pr" };
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <DetailHeader title={`${name} · ${programme.name}`} eyebrow="Programme progress" onBack={onBack} />
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 12 }}>
        {[status, `${fmtDay(a.startsOn, true)} to ${fmtDay(a.endsOn, true)}`, a.joinWeek > 1 ? `joined at week ${a.joinWeek}` : null].filter(Boolean).join(" · ")}
      </p>
      {error && <ErrorLine>{error}</ErrorLine>}

      {failed && !schedule ? (
        <ProError onRetry={() => setNonce((n) => n + 1)} message={failed.offline ? "You're offline. Progress needs a connection." : undefined} />
      ) : !schedule || !progress ? (
        <ProCardSkeleton lines={3} height={160} />
      ) : (
        <>
          {hidden && <LockLine className="mb-3" what="Workout activity" clientFirstName={firstName} />}
          <Card>
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>So far</p>
            <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch, marginTop: 2 }}>
              {total && total.planned > 0 ? doneLine(total.planned, total.done) : "Nothing planned yet"}
            </p>
          </Card>

          <SectionHead label="By week" />
          {progress.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>Nothing is planned for these weeks.</p>
          ) : (
            <ListCard
              rows={progress.map((wp) => {
                const c = cell(wp);
                return {
                  key: String(wp.week),
                  icon: Dumbbell,
                  title: `Week ${wp.week} · ${fmtDay(wp.weekStartsOn)}`,
                  meta: (
                    <>
                      {wp.weekStartsOn > today ? `${wp.planned} planned` : doneLine(wp.planned, wp.done)}
                      {wp.byWorkout.length > 1 && (
                        <span className="block">
                          {wp.byWorkout.map((x) => `${x.workoutName} ${x.done === null || wp.weekStartsOn > today ? x.planned : `${x.done}/${x.planned}`}`).join(" · ")}
                        </span>
                      )}
                    </>
                  ),
                  trailing: c ? <Chip label={c.label} tone={c.tone} /> : undefined,
                  onClick: () => setWeek(wp.week),
                  ariaLabel: `Show week ${wp.week}'s schedule`,
                };
              })}
            />
          )}

          <SectionHead label="Schedule" />
          {weeks.length > 1 && (
            <div className="flex scroll-row no-scrollbar" style={{ gap: 6, marginBottom: 12 }}>
              {weeks.map((x) => (
                <FilterChip key={x.week} label={`Week ${x.week}`} on={x.week === shownWeek} onClick={() => setWeek(x.week)} />
              ))}
            </div>
          )}
          {!shown ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>Nothing scheduled.</p>
          ) : (
            <Card pad="4px 14px">
              {shown.days.map((d, i) => (
                <div key={d.onDate} className="flex items-start" style={{ gap: 10, padding: "10px 0", borderBottom: i < shown.days.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                  <span style={{ minWidth: 64 }}>
                    <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch }}>{DAY_SHORT[d.day - 1]}</span>
                    <span className="block" style={{ fontSize: textPx(11), color: d.onDate === today ? INK.prDeep : INK.chF, fontWeight: d.onDate === today ? 700 : 400 }}>
                      {d.onDate === today ? "Today" : fmtDay(d.onDate)}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    {d.sessions.map((s) => (
                      <span key={`${s.onDate}-${s.position}`} className="flex items-center" style={{ gap: 8, minHeight: 26 }}>
                        <span className="flex-1 min-w-0" style={{ fontSize: textPx(13), color: INK.ch, overflowWrap: "anywhere" }}>
                          {s.workoutName}
                        </span>
                        {s.done === null ? (
                          <span style={{ fontSize: textPx(11), color: INK.chF }}>Not shared</span>
                        ) : s.done ? (
                          <span className="flex items-center" style={{ gap: 3, fontSize: textPx(11), fontWeight: 700, color: INK.good }}>
                            <Check size={13} strokeWidth={2.6} aria-hidden /> Done
                          </span>
                        ) : (
                          <span className="flex items-center" style={{ gap: 3, fontSize: textPx(11), color: INK.chF }}>
                            <Circle size={11} strokeWidth={2} aria-hidden /> {s.onDate < today ? "Not done" : "Planned"}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {!a.endedAt && (
        <div className="flex" style={{ marginTop: 8 }}>
          <CtaButton size="base" variant="outline" icon={<StopCircle size={15} />} label="End programme" onClick={() => setConfirmEnd(true)} />
        </div>
      )}
      {a.endedAt && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 8 }}>{`Ended ${fmtDay(a.endedAt, true)}.`}</p>}

      <ConfirmCard
        open={confirmEnd}
        title={`End ${firstName}'s programme?`}
        subtitle="The sessions after today leave their calendar. The routines stay theirs."
        confirmLabel="End programme"
        busy={busy}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={async () => {
          setBusy(true);
          setError(null);
          const r = await endProgrammeAssignment(a.id);
          setBusy(false);
          setConfirmEnd(false);
          if (!r.ok) {
            setError(r.message);
            return;
          }
          await state.reload();
          setNonce((n) => n + 1);
        }}
      />
    </div>
  );
};
