import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { logMeditationSession } from "../../services/meditation";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { meditationKind, sessionSeconds } from "../../services/meditation/logic";
import { t, tk } from "../../i18n/core";
import type { Pose } from "./PoseSequence";
import { sessions, useLockedSession } from "../../platform/sessions";

// The Stretching / Yoga sequence: its timer, the session clock and the one
// meditation_sessions write when it finishes (the rules are written out above
// PoseSequence). Shared by the mobile PoseSequence and the web Meditation page
// (website viewport v1, WC-MI.4); moved here unchanged from PoseSequence.
//
// In the app a timed (Stretching) run is kept going by the phone with the
// screen locked, a soft cue at each pose and the pose on the lock screen
// (App-Centium ROUND_J.md §7). The phone's clock decides the pose and the
// time left; the sequence is still logged here, once, when it finishes.

const SAVE_FAILED = tk("Couldn't save. Try again.");

export type SaveState = "saving" | "saved" | "short" | "hidden";

export function usePoseSequence(poses: Pose[], kind: "stretching" | "yoga") {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const timed = kind === "stretching";
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const pose = poses[idx];
  const next = poses[idx + 1];

  // --- the timer (Stretching) -------------------------------------------------
  /** Ms left on the current pose (what the ring and label show; updated every tick while running). */
  const [remainingMs, setRemainingMs] = useState(poses[0].seconds * 1000);
  /** While running: when the current run started, and what was left then. */
  const runRef = useRef<{ atMs: number; leftMs: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  // In the app, and only for the timed sequence: the phone's clock.
  const locked = useLockedSession(`poses:${kind}`);
  const native = timed && locked.native;
  const lockedState = timed ? locked.state : null;
  const lockedRef = useRef(lockedState);
  useEffect(() => {
    lockedRef.current = lockedState;
  });

  // --- the session clock -----------------------------------------------------
  // Mount time, then the first timer start replaces it for Stretching.
  // Mount time comes from an effect so render stays pure.
  const clockRef = useRef<{ startMs: number; fromTimer: boolean } | null>(null);
  useEffect(() => {
    clockRef.current = { startMs: Date.now(), fromTimer: false };
  }, []);

  /** The finished sequence: seconds saved (null under the 8 s floor), seconds shown, save state. */
  const [complete, setComplete] = useState<{ seconds: number | null; shown: number; save: SaveState } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const live = useRef({ authUserId, refreshMeditationSummary, refreshAchievements });
  useEffect(() => {
    live.current = { authUserId, refreshMeditationSummary, refreshAchievements };
  });

  const currentLeft = () => (runRef.current ? Math.max(0, runRef.current.leftMs - (Date.now() - runRef.current.atMs)) : remainingMs);

  const pause = () => {
    const left = currentLeft();
    runRef.current = null;
    setRunning(false);
    setRemainingMs(left);
    if (native) void sessions.pause();
  };

  const finish = () => {
    runRef.current = null;
    setRunning(false);
    const startMs = clockRef.current?.startMs ?? Date.now();
    const endMs = Date.now();
    const seconds = sessionSeconds(startMs, endMs);
    const shown = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const userId = live.current.authUserId;
    const save: SaveState = seconds === null ? "short" : userId ? "saving" : "hidden";
    setComplete({ seconds, shown, save });
    if (seconds === null || !userId) return;
    void logMeditationSession({
      userId,
      startedAt: new Date(startMs),
      durationSeconds: seconds,
      kind: meditationKind(kind),
      completed: true,
      // B3 (PB-O-21): a sequence is logged only when finished, so every pose was done.
      posesCompleted: poses.length,
    }).then((r) => {
      if (!r.ok) {
        setComplete((c) => (c ? { ...c, save: "hidden" } : c));
        setToast(r.message === OFFLINE_MESSAGE || r.message.startsWith("That's a lot") ? r.message : SAVE_FAILED);
        return;
      }
      setComplete((c) => (c ? { ...c, save: "saved" } : c));
      void live.current.refreshMeditationSummary();
      live.current.refreshAchievements();
    });
  };
  // Makes pose i current with its full seconds; the timer keeps running if it was.
  const goTo = (i: number) => {
    idxRef.current = i;
    setIdx(i);
    const full = poses[i].seconds * 1000;
    setRemainingMs(full);
    if (runRef.current) runRef.current = { atMs: Date.now(), leftMs: full };
    if (native && lockedRef.current?.active && lockedRef.current.phaseIndex !== i) void sessions.jumpTo(i);
  };

  const finishRef = useRef(finish);
  const goToRef = useRef(goTo);
  useEffect(() => {
    finishRef.current = finish;
    goToRef.current = goTo;
  });


  // 100 ms ticks while running (the ring drains smoothly); the time itself
  // comes from the wall clock, so a throttled background tab stays right.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      // In the app the phone's clock says which pose and how long is left
      // (right after a locked screen too); it also ends the sequence.
      const s = lockedRef.current;
      if (s?.active) {
        if (s.phaseIndex !== idxRef.current && s.phaseIndex < poses.length) {
          idxRef.current = s.phaseIndex;
          setIdx(s.phaseIndex);
        }
        if (s.phaseEndsAt !== null) setRemainingMs(Math.max(0, s.phaseEndsAt - Date.now()));
        return;
      }
      const run = runRef.current;
      if (!run) return;
      const left = run.leftMs - (Date.now() - run.atMs);
      if (left > 0) {
        setRemainingMs(left);
        return;
      }
      // At 0: auto-advance, or complete the sequence after the last pose.
      const i = idxRef.current;
      if (i + 1 >= poses.length) {
        finishRef.current();
        return;
      }
      goToRef.current(i + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [running, poses]);

  // Pauses when the page is hidden (S6). Not in the app, where the phone keeps
  // the run going with the screen locked (that is the point of it).
  useEffect(() => {
    if (!running || native) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        const run = runRef.current;
        const left = run ? Math.max(0, run.leftMs - (Date.now() - run.atMs)) : 0;
        runRef.current = null;
        setRunning(false);
        setRemainingMs(left);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [running, native]);

  const toggleTimer = () => {
    if (running) {
      pause();
      return;
    }
    const fresh = !clockRef.current?.fromTimer;
    if (fresh) clockRef.current = { startMs: Date.now(), fromTimer: true };
    runRef.current = { atMs: Date.now(), leftMs: remainingMs };
    setStarted(true);
    setRunning(true);
    if (!native) return;
    if (fresh || !lockedRef.current?.active) {
      const at = idxRef.current;
      void sessions
        .start({
          kind: meditationKind(kind),
          title: t(kind === "stretching" ? "Stretching" : "Yoga"),
          phases: poses.map((p) => ({ label: p.name, seconds: p.seconds, cue: "hold" as const })),
          repeat: 1,
          resultKey: `poses:${kind}`,
        })
        .then(() => (at > 0 ? sessions.jumpTo(at) : undefined));
    } else {
      void sessions.resume();
    }
  };

  /** The phone's run ends with this one (in a browser there is none). */
  const stopLocked = () => {
    if (native && lockedRef.current?.active) void sessions.stop().then(() => sessions.clear());
  };

  // The phone's side (in the app only): the sequence finished, or was paused or
  // stopped, on the lock screen.
  useEffect(() => {
    if (!lockedState) return;
    if (lockedState.active) {
      if (!clockRef.current?.fromTimer) clockRef.current = { startMs: lockedState.startedAt, fromTimer: true };
      setStarted(true);
      setRunning(!lockedState.paused);
      runRef.current = lockedState.paused ? null : { atMs: Date.now(), leftMs: Math.max(0, (lockedState.phaseEndsAt ?? Date.now()) - Date.now()) };
      return;
    }
    if (lockedState.completed) finishRef.current();
    else {
      runRef.current = null;
      setRunning(false);
    }
    void sessions.clear();
  }, [lockedState]);
  // Leaving the page ends the phone's run too (the sequence isn't logged unfinished).
  useEffect(
    () => () => {
      if (lockedRef.current?.active) void sessions.stop().then(() => sessions.clear());
    },
    []
  );

  /** Back to pose 1, timer idle, a fresh session clock (OURS restart row). */
  const restart = () => {
    stopLocked();
    setComplete(null);
    setStarted(false);
    runRef.current = null;
    setRunning(false);
    clockRef.current = { startMs: Date.now(), fromTimer: false };
    goTo(0);
  };

  const select = (i: number) => {
    if (complete) {
      // Leaves the completion state; a new run starts (no log until it finishes).
      setComplete(null);
      setStarted(false);
      clockRef.current = { startMs: Date.now(), fromTimer: false };
    }
    goTo(i);
  };

  const leftMs = timed ? remainingMs : pose.seconds * 1000;
  const leftS = Math.ceil(leftMs / 1000);
  const drain = timed && !complete ? 1 - leftMs / (pose.seconds * 1000) : 0;
  const timerLabel = !started ? t("Start timer") : running ? t("Pause timer") : t("Resume timer");

  return { timed, idx, pose, next, running, started, complete, toast, setToast, toggleTimer, restart, select, goTo, finish, leftMs, leftS, drain, timerLabel };
}
