import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarRange, Check, ChevronRight, Circle, EllipsisVertical, Play } from "lucide-react";
import type { Routine } from "../../types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import {
  fetchMyProgrammes,
  fetchProgrammeProgress,
  fetchProgrammeSchedule,
  moveProgrammeSession,
  skipProgrammeSessions,
  unskipProgrammeSession,
  type MyProgramme,
} from "../../services/programmes";
import {
  canMoveTo,
  clientMaySkip,
  doneLine,
  groupSchedule,
  isOpen,
  isoDay,
  mondayOf,
  moveTargets,
  sessionsOn,
  skipCalls,
  summariseProgress,
  yesterdaysOpen,
  type ScheduleRow,
  type SkipCalls,
  type WeekProgress,
} from "../../services/programmes/model";
import {
  dayOptionsLabel,
  daySkipped,
  doItToday,
  moveDayLabel,
  movedFrom,
  movedTo,
  skipDayLabel,
  skipLabel,
  skippedCount,
  skippedLabel,
  skipYesterdayLabel,
  weekdayName,
  workoutSkipped,
  yesterdayLine,
} from "../../services/programmes/copy";
import { t } from "../../i18n/core";
import { DAY_LONG, DAY_SHORT } from "../../utils/week";
import { shortDay } from "../../services/routines/programmeLogic";
import { textPx } from "../../theme/textSize";
import { coachColor } from "./coachColors";
import { MusicSection } from "../../components/music/MusicSection";
import { providerHeading } from "../../services/music/whichMusic";
import { useDayDrag } from "../../components/pro/programmes/useDayDrag";
import { MoveSessionSheet } from "./MoveSessionSheet";

/**
 * Round D · DT1 CU1 for week-by-day programmes: Workout › Routines, above
 * "From your coach". One card per active programme (my_programmes):
 *
 * - "Week {n} of {n} · from {coach}" (or "Starts {date}"), the coach note;
 * - Round E: the coach's playlist (and the member's own workout favourite
 *   beside it, when they have one), when the programme has one;
 * - TODAY: today's workouts from programme_schedule, each with a done tick
 *   or Start, which opens the routine exactly as a routine row's Play does;
 *   a rest day says so and names the next session;
 * - "This week" opens the week view: week tabs, each day's workouts with
 *   done ticks and Start, and done of planned per week (programme_progress).
 *
 * Round F (DW1–DW3, Database 20261226000000):
 * - this week's note from the professional under the status line
 *   (my_programmes.week_note), and each week's in the week view
 *   (programme_progress.week_note);
 * - Round D D-S4: "Yesterday: {workout} · Do it today" (moves it to today)
 *   with "Skip", while yesterday is in this week;
 * - a day's ⋮ (TODAY and each day of the week view): "Move to another day"
 *   (the day picker, MoveSessionSheet) and "Skip this day" (a day of this
 *   week with an unfinished workout; ATXP1 otherwise), with Undo in the
 *   toast and on the skipped row; on a desktop pointer, a session also drags
 *   onto another listed day of its week;
 * - "Skipped" in grey (a skipped session is not planned, so never missed)
 *   and "Moved from {day}" on a moved one.
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

type ToastState = { message: string; tone?: "error"; undo?: { assignmentId: string; sessions: ScheduleRow[] } };

const assignmentOf = (p: MyProgramme) => ({ startsOn: p.startsOn, endsOn: p.endsOn });

/** What a day of a programme offers the member: sessions that can move, and whether it can be skipped. */
function dayActions(l: Loaded, date: string, today: string) {
  const sessions = sessionsOn(l.schedule, date);
  const movable = sessions.filter((s) => moveTargets(s, l.schedule, today, assignmentOf(l.programme)).length > 0);
  return { sessions, movable, maySkip: clientMaySkip(date, sessions, today) };
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
  // Round F: the day menu, the move sheet, a write in flight, and the toast.
  const [menu, setMenu] = useState<{ anchor: HTMLElement; assignmentId: string; date: string } | null>(null);
  const [moveFor, setMoveFor] = useState<{ assignmentId: string; date: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

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

  // Round D (Database 20261223060000): the "Your coach assigned a programme"
  // push opens /app/workout?tab=routines&programme={assignment id}, which
  // opens that programme's week sheet once the programmes have loaded. Once
  // per link (adjusted during render); an id that isn't one of mine is ignored.
  const [params] = useSearchParams();
  const linkedId = params.get("programme");
  const [handledLink, setHandledLink] = useState<string | null>(null);
  if (linkedId && rows && handledLink !== linkedId) {
    setHandledLink(linkedId);
    if (rows.some((r) => r.programme.assignmentId === linkedId)) setOpen(linkedId);
  }

  // -------------------------------------------------------------------------
  // Round F: skip, Undo and move. Each is written, then everything is re-read.
  // -------------------------------------------------------------------------

  /** Writes a skip (skipCalls' plan); `gone` are the sessions that go. */
  const skip = async (assignmentId: string, calls: SkipCalls | null, gone: ScheduleRow[]) => {
    setMenu(null);
    if (!calls) return;
    setBusy(true);
    const r = await skipProgrammeSessions(assignmentId, calls);
    setBusy(false);
    if (!r.ok) setToast({ message: r.message, tone: "error" });
    else if (gone.length) {
      setToast({ message: gone.length === 1 ? workoutSkipped(gone[0].workoutName) : daySkipped(), undo: { assignmentId, sessions: gone } });
    }
    setNonce((n) => n + 1);
  };
  const skipDay = (assignmentId: string, sessions: ScheduleRow[]) => void skip(assignmentId, skipCalls(sessions), sessions.filter(isOpen));
  /** Undo, one call per session by its id; a moved one comes back on the day it was moved to. */
  const undo = async (assignmentId: string, sessions: ScheduleRow[]) => {
    setToast(null);
    setBusy(true);
    for (const s of sessions) {
      const r = await unskipProgrammeSession(assignmentId, s.sessionId);
      if (!r.ok) {
        setToast({ message: r.message, tone: "error" });
        break;
      }
    }
    setBusy(false);
    setNonce((n) => n + 1);
  };
  const move = async (assignmentId: string, session: ScheduleRow, toDate: string) => {
    setBusy(true);
    const r = await moveProgrammeSession(assignmentId, session.sessionId, toDate);
    setBusy(false);
    setMoveFor(null);
    setToast(r.ok ? { message: movedTo(session.workoutName, weekdayName(isoDay(toDate))) } : { message: r.message, tone: "error" });
    setNonce((n) => n + 1);
  };

  const loadedOf = (id: string | undefined) => rows?.find((r) => r.programme.assignmentId === id) ?? null;
  const menuLoaded = loadedOf(menu?.assignmentId);
  const menuActions = menu && menuLoaded ? dayActions(menuLoaded, menu.date, today) : null;
  const moveLoaded = loadedOf(moveFor?.assignmentId);
  const moveActions = moveFor && moveLoaded ? dayActions(moveLoaded, moveFor.date, today) : null;

  /** The ⋮ on a day, when the member can move or skip something on it. */
  const dayMenu = (l: Loaded, date: string, day: number) => {
    const a = dayActions(l, date, today);
    if (a.movable.length === 0 && !a.maySkip) return null;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => setMenu({ anchor: e.currentTarget, assignmentId: l.programme.assignmentId, date })}
        aria-label={dayOptionsLabel(weekdayName(day))}
        className="tap relative shrink-0 flex items-center justify-center before:absolute before:-inset-2 before:content-['']"
        style={{ width: 28, height: 28, color: coachColor("faint", dark) }}
      >
        <EllipsisVertical size={16} strokeWidth={2} aria-hidden />
      </button>
    );
  };

  /** Undo on a skipped row, for a day the member could skip (this week). */
  const undoFor = (l: Loaded) => (s: ScheduleRow) => (mondayOf(s.onDate) === mondayOf(today) ? () => void undo(l.programme.assignmentId, [s]) : undefined);

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
        {rows.map((l) => {
          const { programme: p, schedule } = l;
          const todays = sessionsOn(schedule, today);
          const next = schedule.find((s) => s.onDate > today && !s.skipped);
          const thisWeek = p.currentWeek ? schedule.filter((s) => s.week === p.currentWeek && !s.skipped).length : 0;
          const yesterday = yesterdaysOpen(schedule, today);
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
                  {/* Round F (DW1): the professional's note for this week, under "Week {n} of {n}". */}
                  {p.weekNote && (
                    <span className="block" style={{ marginTop: 4, fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {p.weekNote}
                    </span>
                  )}
                </span>
              </div>
              {p.coachNote && (
                <p style={{ marginTop: 10, fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))", background: coachColor("soft", dark), borderRadius: 12, padding: "8px 10px", whiteSpace: "pre-wrap" }}>
                  {p.coachNote}
                </p>
              )}
              {p.playlistUrl && (
                <MusicSection
                  moment="workout"
                  playlistsOnly
                  provider={{ url: p.playlistUrl, heading: p.professionalFirstName ? providerHeading(p.professionalFirstName) : "Your coach's playlist" }}
                  style={{ marginTop: 10 }}
                />
              )}

              {/* Round D D-S4 (Round F DW2/DW3): yesterday's unfinished workout. */}
              {yesterday.map((s) => (
                <div
                  key={`y-${s.sessionId}`}
                  className="flex items-center"
                  style={{ gap: 8, marginTop: 10, borderRadius: 12, background: coachColor("soft", dark), padding: "8px 10px", minHeight: 44 }}
                >
                  <span className="flex-1 min-w-0" style={{ fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
                    {yesterdayLine(s.workoutName)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void move(p.assignmentId, s, today)}
                    className="tap shrink-0 bg-primary-fill text-on-primary-fill"
                    style={{ height: 32, borderRadius: 10, padding: "0 11px", fontSize: textPx(12), fontWeight: 700 }}
                  >
                    {doItToday()}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void skip(p.assignmentId, { sessionIds: [s.sessionId] }, [s])}
                    aria-label={skipYesterdayLabel(s.workoutName)}
                    className="tap relative shrink-0 before:absolute before:-inset-2 before:content-['']"
                    style={{ fontSize: textPx(12), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
                  >
                    {skipLabel()}
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between" style={{ marginTop: 12, marginBottom: 6, minHeight: 20 }}>
                <p className="text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk }}>
                  Today
                </p>
                {todays.length > 0 && dayMenu(l, today, isoDay(today))}
              </div>
              {todays.length === 0 ? (
                <p style={{ fontSize: textPx(12.5), color: coachColor("faint", dark) }}>
                  {next ? `Rest day. Next: ${next.workoutName}, ${DAY_LONG[next.day - 1]} ${shortDay(next.onDate)}.` : "Nothing planned today."}
                </p>
              ) : (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {todays.map((s) => (
                    <SessionRow
                      key={s.sessionId}
                      s={s}
                      routine={s.routineId ? byId.get(s.routineId) : undefined}
                      dark={dark}
                      onStart={onStart}
                      onUndo={undoFor(l)(s)}
                      busy={busy}
                    />
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
      <WeekSheet
        key={open ?? "closed"}
        loaded={current}
        today={today}
        dark={dark}
        byId={byId}
        busy={busy}
        dayMenu={dayMenu}
        undoFor={undoFor}
        onMove={(s, to) => current && void move(current.programme.assignmentId, s, to)}
        onClose={() => setOpen(null)}
        onStart={(r) => {
          setOpen(null);
          onStart(r);
        }}
      />

      <PopupMenu<"move" | "skip">
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={[
          { value: "move", label: moveDayLabel(), disabled: !menuActions || menuActions.movable.length === 0 },
          { value: "skip", label: skipDayLabel(), disabled: !menuActions?.maySkip },
        ]}
        onSelect={(v) => {
          const m = menu;
          setMenu(null);
          if (!m || !menuActions) return;
          if (v === "move") setMoveFor({ assignmentId: m.assignmentId, date: m.date });
          else skipDay(m.assignmentId, menuActions.sessions);
        }}
      />
      <MoveSessionSheet
        key={moveFor ? `${moveFor.assignmentId}-${moveFor.date}` : "closed"}
        open={!!moveFor && !!moveLoaded}
        sessions={moveActions?.movable ?? []}
        rows={moveLoaded?.schedule ?? []}
        today={today}
        assignment={moveLoaded ? assignmentOf(moveLoaded.programme) : { startsOn: today, endsOn: today }}
        dark={dark}
        busy={busy}
        onClose={() => setMoveFor(null)}
        onMove={(s, to) => moveFor && void move(moveFor.assignmentId, s, to)}
      />
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        tone={toast?.tone}
        onUndo={toast?.undo ? () => toast.undo && void undo(toast.undo.assignmentId, toast.undo.sessions) : undefined}
        onExpire={() => setToast(null)}
      />
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

/**
 * One scheduled workout: its name, the routine's size, and Done or Start.
 * Round F: a skipped one reads "Skipped" in grey (with Undo while it can be
 * undone), and a moved one names the day it came from.
 */
const SessionRow: React.FC<{
  s: ScheduleRow;
  routine: Routine | undefined;
  dark: boolean;
  onStart: (r: Routine) => void;
  past?: boolean;
  onUndo?: () => void;
  busy?: boolean;
}> = ({ s, routine, dark, onStart, past, onUndo, busy }) => (
  <div className="flex items-center" style={{ gap: 10, borderRadius: 12, background: coachColor("soft", dark), padding: "8px 10px", minHeight: 44 }}>
    <span className="flex-1 min-w-0">
      <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: s.skipped ? coachColor("faint", dark) : "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
        {s.workoutName}
      </span>
      <span className="block" style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
        {[
          routine
            ? [`${routine.exercises.length} ${routine.exercises.length === 1 ? "exercise" : "exercises"}`, routine.estimatedDurationMin ? `~${routine.estimatedDurationMin} min` : null].filter(Boolean).join(" · ")
            : "No longer in your routines",
          s.movedFrom ? movedFrom(weekdayName(isoDay(s.movedFrom))) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
    {s.skipped ? (
      <span className="flex items-center shrink-0" style={{ gap: 8 }}>
        <span style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>{skippedLabel()}</span>
        {onUndo && (
          <button
            type="button"
            disabled={busy}
            onClick={onUndo}
            className="tap relative before:absolute before:-inset-2 before:content-['']"
            style={{ fontSize: textPx(12), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
          >
            {t("Undo")}
          </button>
        )}
      </span>
    ) : s.done ? (
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

/**
 * The week view: week tabs, each day's workouts with done ticks, and done of
 * planned per week. Round F: the week's note, the skipped count, each day's
 * ⋮, and (desktop pointer) dragging a session onto another listed day.
 */
const WeekSheet: React.FC<{
  loaded: Loaded | null;
  today: string;
  dark: boolean;
  byId: Map<string, Routine>;
  busy: boolean;
  dayMenu: (l: Loaded, date: string, day: number) => React.ReactNode;
  undoFor: (l: Loaded) => (s: ScheduleRow) => (() => void) | undefined;
  onMove: (s: ScheduleRow, toDate: string) => void;
  onClose: () => void;
  onStart: (r: Routine) => void;
}> = ({ loaded, today, dark, byId, busy, dayMenu, undoFor, onMove, onClose, onStart }) => {
  // Keyed by the programme, so the week starts at "now" each time it opens.
  const [week, setWeek] = useState<number | null>(loaded?.programme.currentWeek ?? null);
  const weeks = useMemo(() => groupSchedule(loaded?.schedule ?? []), [loaded]);
  // Round F (DW3): drag a session onto another day of its week (mouse and pen only;
  // a finger scrolls the sheet, and the day's ⋮ moves it there).
  const drag = useDayDrag<ScheduleRow>(
    (s, date) => !!loaded && !busy && canMoveTo(s, date, loaded.schedule, today, assignmentOf(loaded.programme)),
    (s, date) => onMove(s, date)
  );
  if (!loaded) return null;
  const shownWeek = week != null && weeks.some((w) => w.week === week) ? week : weeks[0]?.week ?? null;
  const shown = weeks.find((w) => w.week === shownWeek) ?? null;
  const progress = loaded.progress.find((w) => w.week === shownWeek) ?? null;
  const undoOn = undoFor(loaded);

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
            {progress.skipped > 0 && ` · ${skippedCount(progress.skipped)}`}
          </p>
        )}
        {progress?.weekNote && (
          <p style={{ fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))", background: coachColor("soft", dark), borderRadius: 12, padding: "8px 10px", whiteSpace: "pre-wrap" }}>
            {progress.weekNote}
          </p>
        )}
        {!shown ? (
          <p style={{ fontSize: textPx(12.5), color: coachColor("faint", dark) }}>Nothing scheduled.</p>
        ) : (
          shown.days.map((d) => {
            const over = drag.over === d.onDate;
            return (
              <div
                key={d.onDate}
                data-drop-day={d.onDate}
                style={over ? { borderRadius: 12, outline: `1.5px dashed ${coachColor("deep", dark)}`, outlineOffset: 3 } : undefined}
              >
                <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: textPx(12), fontWeight: 700, color: d.onDate === today ? coachColor("deep", dark) : "rgb(var(--c-charcoal))" }}>
                    {d.onDate === today ? `Today · ${DAY_SHORT[d.day - 1]} ${shortDay(d.onDate)}` : `${DAY_SHORT[d.day - 1]} ${shortDay(d.onDate)}`}
                  </p>
                  {dayMenu(loaded, d.onDate, d.day)}
                </div>
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {d.sessions.map((s) => {
                    const lifted = drag.dragging === s;
                    const draggable = !busy && moveTargets(s, loaded.schedule, today, assignmentOf(loaded.programme)).length > 0;
                    return (
                      <div
                        key={s.sessionId}
                        onPointerDown={draggable ? (e) => e.pointerType !== "touch" && drag.begin(s, e) : undefined}
                        style={{ opacity: lifted ? 0.5 : 1, userSelect: drag.dragging ? "none" : undefined, cursor: draggable ? "grab" : undefined }}
                      >
                        <SessionRow
                          s={s}
                          routine={s.routineId ? byId.get(s.routineId) : undefined}
                          dark={dark}
                          onStart={(r) => {
                            // A drag released on Start is not a tap on it.
                            if (!drag.clickAfterDrag()) onStart(r);
                          }}
                          past={s.onDate < today}
                          onUndo={undoOn(s)}
                          busy={busy}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
};
