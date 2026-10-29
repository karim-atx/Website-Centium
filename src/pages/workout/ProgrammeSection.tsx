import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Check, ChevronRight, Circle, Play } from "lucide-react";
import type { Routine } from "../../types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { fetchMyProgrammes, fetchProgrammeProgress, fetchProgrammeSchedule, type MyProgramme } from "../../services/programmes";
import {
  doneLine,
  groupSchedule,
  sessionsOn,
  summariseProgress,
  type ScheduleRow,
  type WeekProgress,
} from "../../services/programmes/model";
import { DAY_LONG, DAY_SHORT } from "../../utils/week";
import { shortDay } from "../../services/routines/programmeLogic";
import { textPx } from "../../theme/textSize";
import { coachColor } from "./coachColors";

/**
 * Round D · DT1 CU1 for week-by-day programmes: Workout › Routines, above
 * "From your coach". One card per active programme (my_programmes):
 *
 * - "Week {n} of {n} · from {coach}" (or "Starts {date}"), the coach note;
 * - TODAY: today's workouts from programme_schedule, each with a done tick
 *   or Start, which opens the routine exactly as a routine row's Play does;
 *   a rest day says so and names the next session;
 * - "This week" opens the week view: week tabs, each day's workouts with
 *   done ticks and Start, and done of planned per week (programme_progress).
 *
 * The routines themselves stay where they are in the client's list (they are
 * the client's own); this card is the schedule over them. No programme: the
 * card does not exist. Reads need a connection and say so.
 */
interface Loaded {
  programme: MyProgramme;
  schedule: ScheduleRow[];
  progress: WeekProgress[];
}

export const ProgrammeSection: React.FC<{
  routines: Routine[];
  today: string;
  dark: boolean;
  capsInk: string;
  onStart: (routine: Routine) => void;
}> = ({ routines, today, dark, capsInk, onStart }) => {
  const [rows, setRows] = useState<Loaded[] | null>(null);
  const [failed, setFailed] = useState<{ offline: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const mine = await fetchMyProgrammes();
      if (!live) return;
      if (!mine.ok) {
        setFailed({ offline: mine.offline });
        return;
      }
      const loaded = await Promise.all(
        mine.data.map(async (programme) => {
          const [s, p] = await Promise.all([fetchProgrammeSchedule(programme.assignmentId), fetchProgrammeProgress(programme.assignmentId)]);
          return { programme, schedule: s.ok ? s.data : [], progress: p.ok ? summariseProgress(p.data) : [], ok: s.ok && p.ok, offline: (!s.ok && s.offline) || (!p.ok && p.offline) };
        })
      );
      if (!live) return;
      const bad = loaded.find((x) => !x.ok);
      setFailed(bad ? { offline: bad.offline } : null);
      setRows(loaded.map(({ programme, schedule, progress }) => ({ programme, schedule, progress })));
    })();
    return () => {
      live = false;
    };
  }, [nonce, today]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const byId = useMemo(() => new Map(routines.map((r) => [r.id, r])), [routines]);

  if (!rows && !failed) return null;
  if (!rows || (rows.length === 0 && failed)) {
    return (
      <section aria-label="Programme" style={{ marginBottom: 22 }}>
        <Label ink={capsInk} />
        <div role="alert" className="flex items-center justify-between" style={{ gap: 12, padding: "12px 14px", borderRadius: 14, background: coachColor("soft", dark) }}>
          <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
            {failed?.offline ? "Your programme needs a connection." : "Couldn't load your programme."}
          </p>
          <RetryButton dark={dark} onClick={retry} />
        </div>
      </section>
    );
  }
  if (rows.length === 0) return null;

  const current = rows.find((r) => r.programme.assignmentId === open) ?? null;

  return (
    <section aria-label="Programme" style={{ marginBottom: 22 }}>
      <Label ink={capsInk} />
      <div className="flex flex-col" style={{ gap: 12 }}>
        {rows.map(({ programme: p, schedule }) => {
          const todays = sessionsOn(schedule, today);
          const next = schedule.find((s) => s.onDate > today);
          const thisWeek = p.currentWeek ? schedule.filter((s) => s.week === p.currentWeek).length : 0;
          const status =
            p.currentWeek != null
              ? `Week ${p.currentWeek} of ${p.durationWeeks}`
              : today < p.startsOn
                ? `Starts ${shortDay(p.startsOn)}`
                : "Finished";
          return (
            <div key={p.assignmentId} className="bg-cream-card border border-charcoal/[0.08]" style={{ borderRadius: 16, padding: "14px 14px 12px" }}>
              <div className="flex items-start" style={{ gap: 10 }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: coachColor("pale", dark) }}>
                  <CalendarRange size={17} strokeWidth={1.9} aria-hidden style={{ color: coachColor("deep", dark) }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(15), fontWeight: 700, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
                    {p.name}
                  </span>
                  <span className="block" style={{ fontSize: textPx(12), color: coachColor("faint", dark) }}>
                    {[status, thisWeek ? `${thisWeek} ${thisWeek === 1 ? "workout" : "workouts"} this week` : null, p.professionalFirstName ? `from ${p.professionalFirstName}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </div>
              {p.coachNote && (
                <p style={{ marginTop: 10, fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))", background: coachColor("soft", dark), borderRadius: 12, padding: "8px 10px", whiteSpace: "pre-wrap" }}>
                  {p.coachNote}
                </p>
              )}

              <p className="text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk, marginTop: 12, marginBottom: 6 }}>
                Today
              </p>
              {todays.length === 0 ? (
                <p style={{ fontSize: textPx(12.5), color: coachColor("faint", dark) }}>
                  {next ? `Rest day. Next: ${next.workoutName}, ${DAY_LONG[next.day - 1]} ${shortDay(next.onDate)}.` : "Nothing planned today."}
                </p>
              ) : (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {todays.map((s) => (
                    <SessionRow key={`${s.onDate}-${s.position}`} s={s} routine={s.routineId ? byId.get(s.routineId) : undefined} dark={dark} onStart={onStart} />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpen(p.assignmentId)}
                className="tap w-full flex items-center justify-between"
                style={{ marginTop: 10, minHeight: 40, fontSize: textPx(12.5), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
              >
                Week by week
                <ChevronRight size={15} strokeWidth={2} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      {failed && (
        <p role="alert" className="text-[11.5px] font-semibold text-status-high" style={{ marginTop: 8 }}>
          {failed.offline ? "You're offline. Some of your programme couldn't load." : "Some of your programme couldn't load."}{" "}
          <button type="button" onClick={retry} className="tap underline">
            Retry
          </button>
        </p>
      )}
      <WeekSheet key={open ?? "closed"} loaded={current} today={today} dark={dark} byId={byId} onClose={() => setOpen(null)} onStart={(r) => {
        setOpen(null);
        onStart(r);
      }} />
    </section>
  );
};

const Label: React.FC<{ ink: string }> = ({ ink }) => (
  <p className="mb-2.5 text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: ink }}>
    Programme
  </p>
);

const RetryButton: React.FC<{ dark: boolean; onClick: () => void }> = ({ dark, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap relative shrink-0 before:absolute before:-inset-[12px] before:content-['']"
    style={{ fontSize: textPx(12), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
  >
    Retry
  </button>
);

/** One scheduled workout: its name, the routine's size, and Done or Start. */
const SessionRow: React.FC<{ s: ScheduleRow; routine: Routine | undefined; dark: boolean; onStart: (r: Routine) => void; past?: boolean }> = ({ s, routine, dark, onStart, past }) => (
  <div className="flex items-center" style={{ gap: 10, borderRadius: 12, background: coachColor("soft", dark), padding: "8px 10px", minHeight: 44 }}>
    <span className="flex-1 min-w-0">
      <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
        {s.workoutName}
      </span>
      <span className="block" style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
        {routine
          ? [`${routine.exercises.length} ${routine.exercises.length === 1 ? "exercise" : "exercises"}`, routine.estimatedDurationMin ? `~${routine.estimatedDurationMin} min` : null].filter(Boolean).join(" · ")
          : "No longer in your routines"}
      </span>
    </span>
    {s.done ? (
      <span className="flex items-center shrink-0" style={{ gap: 4, fontSize: textPx(12), fontWeight: 700, color: "rgb(var(--c-status-good))" }}>
        <Check size={14} strokeWidth={2.6} aria-hidden /> Done
      </span>
    ) : routine ? (
      <button
        type="button"
        onClick={() => onStart(routine)}
        aria-label={`Start ${s.workoutName}`}
        className="tap shrink-0 flex items-center bg-primary-fill text-on-primary-fill"
        style={{ gap: 5, height: 34, borderRadius: 10, padding: "0 12px", fontSize: textPx(12.5), fontWeight: 700 }}
      >
        <Play size={13} strokeWidth={2.4} aria-hidden /> Start
      </button>
    ) : past ? (
      <span className="flex items-center shrink-0" style={{ gap: 4, fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
        <Circle size={11} strokeWidth={2} aria-hidden /> Not done
      </span>
    ) : null}
  </div>
);

/** The week view: week tabs, each day's workouts with done ticks, and done of planned per week. */
const WeekSheet: React.FC<{
  loaded: Loaded | null;
  today: string;
  dark: boolean;
  byId: Map<string, Routine>;
  onClose: () => void;
  onStart: (r: Routine) => void;
}> = ({ loaded, today, dark, byId, onClose, onStart }) => {
  // Keyed by the programme, so the week starts at "now" each time it opens.
  const [week, setWeek] = useState<number | null>(loaded?.programme.currentWeek ?? null);
  const weeks = useMemo(() => groupSchedule(loaded?.schedule ?? []), [loaded]);
  if (!loaded) return null;
  const shownWeek = week != null && weeks.some((w) => w.week === week) ? week : weeks[0]?.week ?? null;
  const shown = weeks.find((w) => w.week === shownWeek) ?? null;
  const progress = loaded.progress.find((w) => w.week === shownWeek) ?? null;

  return (
    <BottomSheet open onClose={onClose} title={loaded.programme.name}>
      <div className="space-y-3 animate-fade-slide-up">
        {weeks.length > 1 && (
          <div className="flex scroll-row no-scrollbar" style={{ gap: 6 }} role="tablist" aria-label="Weeks">
            {weeks.map((w) => {
              const on = w.week === shownWeek;
              return (
                <button
                  key={w.week}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setWeek(w.week)}
                  className={`tap whitespace-nowrap shrink-0 ${on ? "bg-primary-fill text-on-primary-fill" : "bg-cream-card text-charcoal-soft border border-charcoal/[0.11]"}`}
                  style={{ borderRadius: 9999, padding: "7px 13px", fontSize: textPx(12), fontWeight: on ? 700 : 600 }}
                >
                  {`Week ${w.week}`}
                  {w.week === loaded.programme.currentWeek ? " · now" : ""}
                </button>
              );
            })}
          </div>
        )}
        {progress && (
          <p style={{ fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
            {progress.weekStartsOn > today ? `${progress.planned} ${progress.planned === 1 ? "workout" : "workouts"} planned` : doneLine(progress.planned, progress.done)}
          </p>
        )}
        {!shown ? (
          <p style={{ fontSize: textPx(12.5), color: coachColor("faint", dark) }}>Nothing scheduled.</p>
        ) : (
          shown.days.map((d) => (
            <div key={d.onDate}>
              <p style={{ fontSize: textPx(12), fontWeight: 700, color: d.onDate === today ? coachColor("deep", dark) : "rgb(var(--c-charcoal))", marginBottom: 4 }}>
                {d.onDate === today ? `Today · ${DAY_SHORT[d.day - 1]} ${shortDay(d.onDate)}` : `${DAY_SHORT[d.day - 1]} ${shortDay(d.onDate)}`}
              </p>
              <div className="flex flex-col" style={{ gap: 6 }}>
                {d.sessions.map((s) => (
                  <SessionRow key={`${s.onDate}-${s.position}`} s={s} routine={s.routineId ? byId.get(s.routineId) : undefined} dark={dark} onStart={onStart} past={s.onDate < today} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </BottomSheet>
  );
};
