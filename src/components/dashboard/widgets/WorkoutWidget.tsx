import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Play } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { nextRoutine } from "../../../services/workout/nextRoutine";
import { DAY_SHORT, mondayFirstWeek, mondayIndex } from "../../../utils/week";
import { MUSCLE_GROUP_LABEL } from "../../../utils/muscleGroups";
import { WorkoutSessionSheet } from "../../workout/WorkoutSessionSheet";
import { useAssignedDays, useWorkoutWeek } from "./data";
import { DoneStatus, HomeCard, HomeKeyframes, Hit44, homeColors, Line, linePx, stop, textPx, useHomeMode } from "./kit";

// HO1.W6 Workout (small, large) and HO1.W6·e. Colours: HO1.W6 table, fixed in
// every theme (V6-60); dark #262932* / #B8C0CE*. V6-121: Play / Pick ink in
// dark is #262932 (white on #B8C0CE is about 1.8:1).
// V6-141 (D17): no weekly target is stored (PB-HO-06), so the "/4" of the
// empty ring shows only with coach-assigned days (B3 my_workout_week()
// "scheduled"). Those assigned days (workout_template_assignments.assigned_day)
// are also the schedule behind the small widget's "Rest day / Next: Leg Day ·
// Fri" variant (#7a): this week has assigned days, none today, nothing done
// today, and a later assigned day names its routine. Without a coach nothing
// changes.

/** HO1.W6-L #6: ring 62 x 62, stroke 5 (measured: outer 57, band 10 px at 2x), track white. */
const Ring: React.FC<{ done: number; total: number; label: string; dark: boolean; empty?: boolean }> = ({ done, total, label, dark, empty }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const f = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <span className="relative block shrink-0" style={{ width: 62, height: 62 }} aria-hidden>
      <svg width={62} height={62} viewBox="0 0 62 62" className="qa-shape block">
        <circle cx={31} cy={31} r={r} fill="none" stroke={dark ? "rgba(255,255,255,0.08)" : "#FFFFFF"} strokeWidth={5} />
        {!empty && f > 0 && (
          <circle
            cx={31}
            cy={31}
            r={r}
            fill="none"
            stroke={dark ? "#B8C0CE" : "#5F6878"}
            strokeWidth={5}
            strokeLinecap={f >= 1 ? "butt" : "round"}
            strokeDasharray={`${f * c} ${c}`}
            transform="rotate(-90 31 31)"
            style={{ transition: "stroke-dasharray 300ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 grid place-items-center tabular-nums"
        style={{ fontSize: 12, lineHeight: "15.6px", fontWeight: 700, color: "rgb(var(--c-charcoal))" }}
      >
        {label}
      </span>
    </span>
  );
};

/** HO1.W6-L #10: 7 dots 12 x 12, gap 3; done #5F6878 (dark #B8C0CE*), not done 1 px #C9C9CC (measured); letters under, today bold. */
const WeekDots: React.FC<{ days: boolean[]; todayIndex: number; dark: boolean; hc: boolean; emptyFrame?: boolean }> = ({ days, todayIndex, dark, hc, emptyFrame }) => {
  const doneFill = dark ? "#B8C0CE" : "#5F6878";
  // HO1.W6·e-L #8: border 1.09545 #241F1B@18% (dark #F5F3FA@18%); High contrast: hairlines to ink 30%.
  const ringNotDone = emptyFrame || hc ? `rgb(var(--c-charcoal) / ${hc ? 0.3 : 0.18})` : dark ? "rgba(245,243,250,0.18)" : "#C9C9CC";
  return (
    <span className="flex" style={{ gap: 3 }} aria-hidden>
      {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
        <span key={i} className="flex flex-col items-center" style={{ width: 12, gap: 2 }}>
          <span
            className="block rounded-full"
            style={{
              width: 12,
              height: 12,
              boxSizing: "border-box",
              background: days[i] ? doneFill : "transparent",
              border: days[i] ? "none" : `${emptyFrame ? 1.09545 : 1}px solid ${i === todayIndex ? doneFill : ringNotDone}`,
            }}
          />
          <span
            style={{
              fontSize: textPx(8.5),
              lineHeight: linePx(11.1),
              fontWeight: i === todayIndex ? 700 : 600,
              color: i === todayIndex ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))",
            }}
          >
            {l}
          </span>
        </span>
      ))}
    </span>
  );
};

export const WorkoutWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { routines, workoutSessions, selectedDate, today, activeSession, pausedSessions } = useApp();
  const { dark, hc } = useHomeMode();
  const [logger, setLogger] = useState(false);
  const isLarge = size === "large";
  const c = homeColors("workout", dark);
  const colors = { tint: c.tint, icon: c.icon, label: c.label, ink: c.ink, tile: c.tile };

  const sessionToday = [...workoutSessions].reverse().find((s) => s.date === selectedDate) ?? null;
  const done = !!sessionToday;
  const routine = done ? routines.find((r) => r.id === sessionToday!.routineId) ?? null : nextRoutine(routines, workoutSessions);
  const name = done ? sessionToday!.routineName : routine?.name ?? null;

  const week = mondayFirstWeek(today);
  const weekDays = week.map((d) => workoutSessions.some((s) => s.date === d));
  const todayIndex = week.indexOf(today);
  // B3 my_workout_week(): done this week and the days scheduled (0 without a coach: "/N" hidden).
  const ww = useWorkoutWeek(workoutSessions.length);
  const sessionsThisWeek = ww?.done ?? weekDays.filter(Boolean).length;
  const ringLabel = ww && ww.scheduled > 0 ? `${sessionsThisWeek}/${ww.scheduled}` : String(sessionsThisWeek);
  const assigned = useAssignedDays(today, workoutSessions.length);
  const nextAssigned =
    !done && selectedDate === today && ww && ww.scheduled > 0 && assigned && !assigned.some((a) => a.day === today)
      ? assigned.map((a) => ({ ...a, routine: routines.find((r) => r.id === a.routineId) })).find((a) => a.day > today && a.routine)
      : undefined;
  const restNext = nextAssigned ? `Next: ${nextAssigned.routine!.name} · ${DAY_SHORT[mondayIndex(new Date(`${nextAssigned.day}T12:00:00`).getDay())]}` : null;
  const routes = () => navigate("/app/workout");

  // HO1.W6·e: nothing planned and nothing done.
  if (!name) {
    if (!isLarge) {
      return (
        <HomeCard
          size={size}
          editMode={editMode}
          colors={colors}
          icon={Dumbbell}
          label="Workout"
          state="empty"
          emptyTitle="No workout planned"
          emptyHint="Pick a routine"
          onOpen={routes}
          ariaLabel="Workout, no workout planned. Pick a routine"
        />
      );
    }
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Dumbbell}
        label="Workout"
        innerActions
        onOpen={routes}
        ariaLabel="Workout, no workout planned. Pick a routine to start this week"
        bodyGap={21.2}
        // The whole body is the full-width graphic row (ring | text | Pick).
        graphicHeight={66}
        graphic={
          <span className="flex items-start self-start w-full">
            <span style={{ marginTop: 2.3 }}>
              {/* #5: sessions this week; the "/N" target has no source (BACKEND PB-HO-06, hidden). */}
              <Ring done={sessionsThisWeek} total={ww?.scheduled ?? 0} label={ringLabel} dark={dark} empty={!ww?.scheduled} />
            </span>
            <span className="flex-1 min-w-0" style={{ marginInlineStart: 12 }}>
              <Line style={{ fontSize: textPx(14), lineHeight: linePx(18.2), fontWeight: 700, color: "rgb(var(--c-charcoal-soft))" }}>No workout planned</Line>
              <Line style={{ marginTop: 5, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: c.ink }}>Pick a routine to start this week</Line>
              <span className="block" style={{ marginTop: 5 }}>
                <WeekDots days={weekDays} todayIndex={todayIndex} dark={dark} hc={hc} emptyFrame />
              </span>
            </span>
            <button
              type="button"
              tabIndex={editMode ? -1 : 0}
              {...stop(routes)}
              className="tap relative shrink-0 rounded-full"
              style={{
                marginTop: 17.3,
                height: 32,
                padding: "0 12px",
                fontSize: textPx(11),
                fontWeight: 700,
                color: dark ? "#262932" : "#FFFFFF",
                background: dark ? "#B8C0CE" : "#5F6878",
              }}
            >
              <Hit44 />
              Pick
            </button>
          </span>
        }
      />
    );
  }

  // A session read back without its logged exercises (none saved yet) counts the routine's.
  const exercises = (done && sessionToday!.exercises.length) || (routine?.exercises.length ?? 0);
  const minutes = done ? Math.max(1, Math.round(sessionToday!.durationSec / 60)) : routine?.estimatedDurationMin ?? 0;
  const muscles = Array.from(new Set((routine?.exercises ?? []).flatMap((e) => e.muscleGroups ?? [])))
    .slice(0, 2)
    .map((m) => MUSCLE_GROUP_LABEL[m]);
  const line = [`${exercises} exercise${exercises === 1 ? "" : "s"}`, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ");
  const lineLarge = [line, muscles.length ? muscles.join(", ") : null].filter(Boolean).join(" · ");

  // Ring: exercises done of the session's exercises. Done: all; running or
  // paused: the exercises with a completed set; not started: 0.
  const paused = routine ? pausedSessions[routine.id] : undefined;
  const inProgress = !done && routine && (activeSession?.routineId === routine.id || !!paused);
  const doneCount = done ? exercises : inProgress && paused ? paused.logged.filter((l) => l.sets.some((s) => s.completed)).length : 0;

  const startOrResume = () => {
    if (done) return routes(); // WO3 session summary: no deep link yet (Workout owner).
    const otherOngoing = Object.keys(pausedSessions).some((id) => id !== routine?.id);
    if (!routine || otherOngoing) return routes(); // RoutinesTab owns the "cancel the other session?" question.
    setLogger(true);
  };

  if (!isLarge && restNext) {
    // #7a: the title and text rows of #6 / #7 with "Rest day" and the next assigned routine.
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Dumbbell}
        label="Workout"
        onOpen={routes}
        ariaLabel={`Workout, rest day. ${restNext}`}
        bodyGap={20.2}
        context={
          <span className="block" style={{ width: "100%" }} data-rest-day>
            <Line style={{ fontSize: textPx(17), lineHeight: linePx(18.7), fontWeight: 700, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>Rest day</Line>
            <Line style={{ marginTop: 5.9, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: c.ink }}>{restNext}</Line>
          </span>
        }
      />
    );
  }

  if (!isLarge) {
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Dumbbell}
        label="Workout"
        onOpen={routes}
        ariaLabel={`Workout, ${name}${done ? ", done" : ""}, ${line}`}
        headerRight={done ? <DoneStatus label="Done" dark={dark} /> : undefined}
        // Title 17/18.7 at 51.2 (header ends 31: gap 20.2); text 10/13 at 75.8.
        bodyGap={20.2}
        context={
          <span className="block" style={{ width: "100%" }}>
            <Line style={{ fontSize: textPx(17), lineHeight: linePx(18.7), fontWeight: 700, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>{name}</Line>
            <Line style={{ marginTop: 5.9, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: c.ink }}>{line}</Line>
          </span>
        }
      />
    );
  }

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Dumbbell}
        label="Workout"
        innerActions
        onOpen={routes}
        ariaLabel={`Workout, ${name}${done ? ", done today" : ""}, ${lineLarge}, ${doneCount} of ${exercises} exercises`}
        headerRight={done ? <DoneStatus label="Done today" dark={dark} /> : undefined}
        // Title 20/22 at 90, 52.3 (gap 19.3); ring 16, 56.5; text 79.3; dots 97.3; play 304, 68.5.
        bodyGap={19.3}
        graphicHeight={66.2}
        graphic={
          <span className="flex items-start self-start w-full">
            <span style={{ marginTop: 4.2 }}>
              <Ring done={doneCount} total={exercises} label={`${doneCount}/${exercises}`} dark={dark} />
            </span>
            <span className="flex-1 min-w-0" style={{ marginInlineStart: 12 }}>
              <Line style={{ fontSize: textPx(20), lineHeight: linePx(22), fontWeight: 700, letterSpacing: -0.4, color: "rgb(var(--c-charcoal))" }}>{name}</Line>
              <Line style={{ marginTop: 5, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: c.ink }}>{lineLarge}</Line>
              <span className="block" style={{ marginTop: 5 }}>
                <WeekDots days={weekDays} todayIndex={todayIndex} dark={dark} hc={hc} />
              </span>
            </span>
            <button
              type="button"
              tabIndex={editMode ? -1 : 0}
              aria-label={done ? `Open ${name}` : inProgress ? `Resume ${name}` : `Start ${name}`}
              {...stop(startOrResume)}
              className="tap relative shrink-0 grid place-items-center rounded-full"
              style={{ marginTop: 16.2, width: 38, height: 38, background: dark ? "#B8C0CE" : "#5F6878" }}
            >
              <Hit44 />
              <Play size={15} fill="currentColor" style={{ color: dark ? "#262932" : "#FFFFFF" }} aria-hidden />
            </button>
          </span>
        }
      />
      {logger && routine && (
        <WorkoutSessionSheet
          open
          onClose={() => setLogger(false)}
          routineId={routine.id}
          routineName={routine.name}
          exercises={routine.exercises}
          blocks={routine.blocks}
          coachNote={routine.coachNote}
        />
      )}
    </>
  );
};
