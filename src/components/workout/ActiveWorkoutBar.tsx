import React, { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { activeBarLine, loggedFraction } from "../../services/workout/activeBar";
import { WorkoutSessionSheet } from "./WorkoutSessionSheet";
import { linePx, textPx } from "../../theme/textSize";

/**
 * True while any sheet, popup or full-screen view is open (the logger among
 * them). Every one in this app is a `fixed inset-0` layer; decorative ones
 * (none at present) would be pointer-events-none and not count.
 */
function useOverlayOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setOpen(!!document.querySelector(".fixed.inset-0:not(.pointer-events-none)"));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return open;
}

/** True while the on-screen keyboard covers part of the viewport. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOpen(window.innerHeight - vv.height - vv.offsetTop > 100);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return open;
}

// Bar height + the 8px gap above the navbar: what page content and floating
// buttons move up by while the bar shows (--active-bar, read in Layout, the
// Food FAB and Toast).
const BAR_HEIGHT = 48;
const BAR_LIFT = BAR_HEIGHT + 8;

/**
 * WO17 · Persistent active-workout bar, in the app shell above the navbar on
 * every tab while a session is active and no logger, sheet, popup or
 * keyboard is open. A "now playing" indicator only: no image, no buttons.
 * Decision 23 (kept item 134, WO1.2 K2): a pinned-CTA-height bar (48, r14,
 * C-01) in primary.fill with its ink (on-primary-fill), in place of the
 * folder-coloured 52 bar. Tapping it reopens the logger at the current exercise.
 * Kept in the handover-complete pass: no frame draws it, but it is the way
 * back to a minimised session's logged sets. Pause and resume happen in the
 * logger (Play on the routine row also resumes a paused one); the bar reads
 * session.status.
 */
export const ActiveWorkoutBar: React.FC = () => {
  const { activeSession, routines, pausedSessions } = useApp();
  const overlayOpen = useOverlayOpen();
  const keyboardOpen = useKeyboardOpen();
  // The logger this bar opened. Held separately from the session so the
  // logger stays up through Finish (which ends the session) until it closes.
  const [loggerFor, setLoggerFor] = useState<string | null>(null);
  const loggerOpen = loggerFor !== null;
  const loggerRoutine = loggerFor ? routines.find((r) => r.id === loggerFor) ?? null : null;
  const [now, setNow] = useState(() => Date.now());

  const routine = activeSession ? routines.find((r) => r.id === activeSession.routineId) ?? null : null;
  const visible = !!activeSession && !!routine && !loggerOpen && !overlayOpen && !keyboardOpen;
  const running = activeSession?.status === "running";

  // Fresh the moment the bar appears, then every 15 s (the line shows minutes).
  useEffect(() => {
    if (!visible || !running) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [visible, running]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--active-bar", visible ? `${BAR_LIFT}px` : "0px");
    return () => {
      root.style.setProperty("--active-bar", "0px");
    };
  }, [visible]);

  const bar = visible && activeSession && routine
    ? {
        progress: loggedFraction(pausedSessions[routine.id]?.logged),
        subline: activeBarLine(activeSession, routine.exercises.length, routine.estimatedDurationMin ?? 0, now),
      }
    : null;

  return (
    <>
      {bar && routine && (
        <button
          onClick={() => setLoggerFor(routine.id)}
          aria-label={`Open ${routine.name}: ${bar.subline}`}
          className="tap fixed z-40 left-[calc(var(--app-gutter)+22px)] right-[calc(var(--app-gutter)+22px)] text-left bg-primary-fill"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 84px)",
            height: BAR_HEIGHT,
            borderRadius: 14,
            boxShadow: "0 8px 20px rgba(36,31,27,0.2)",
            // A button centres its content: 8 + 30 (two lines) + 10 = 48 keeps it top-aligned.
            padding: "8px 12px 10px 16px",
          }}
        >
          <span className="flex items-start" style={{ gap: 10 }}>
            <span className="flex-1 min-w-0 block">
              <span
                className="block truncate"
                style={{ fontSize: textPx(13), lineHeight: linePx(16), fontWeight: 600, color: "rgb(var(--c-on-primary-fill))" }}
              >
                {routine.name}
              </span>
              <span
                className="block truncate"
                style={{ fontSize: textPx(10.5), lineHeight: linePx(14), fontWeight: 500, color: "rgb(var(--c-on-primary-fill) / 0.78)" }}
              >
                {bar.subline}
              </span>
            </span>
            <ChevronUp size={16} strokeWidth={2} className="flex-none" style={{ marginTop: 8, color: "rgb(var(--c-on-primary-fill))" }} />
          </span>
          <span
            aria-hidden
            className="absolute block overflow-hidden"
            style={{ left: 12, right: 12, bottom: 5, height: 2, borderRadius: 1, background: "rgb(var(--c-on-primary-fill) / 0.18)" }}
          >
            <span className="block h-full" style={{ width: `${Math.round(bar.progress * 1000) / 10}%`, background: "rgb(var(--c-on-primary-fill))", borderRadius: 1 }} />
          </span>
        </button>
      )}
      {loggerRoutine && (
        <WorkoutSessionSheet
          open
          onClose={() => setLoggerFor(null)}
          routineId={loggerRoutine.id}
          routineName={loggerRoutine.name}
          exercises={loggerRoutine.exercises}
          blocks={loggerRoutine.blocks}
          coachNote={loggerRoutine.coachNote}
        />
      )}
    </>
  );
};
