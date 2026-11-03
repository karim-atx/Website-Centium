import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { logMeditationSession } from "../../services/meditation";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { meditationKind, sessionSeconds } from "../../services/meditation/logic";
import { t, tk } from "../../i18n/core";
import type { Pose } from "./PoseSequence";

// The Stretching / Yoga sequence: its timer, the session clock and the one
// meditation_sessions write when it finishes (the rules are written out above
// PoseSequence). Shared by the mobile PoseSequence and the web Meditation page
// (website viewport v1, WC-MI.4); moved here unchanged from PoseSequence.

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

  // Pauses when the page is hidden (S6).
  useEffect(() => {
    if (!running) return;
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
  }, [running]);

  const toggleTimer = () => {
    if (running) {
      pause();
      return;
    }
    if (!clockRef.current?.fromTimer) clockRef.current = { startMs: Date.now(), fromTimer: true };
    runRef.current = { atMs: Date.now(), leftMs: remainingMs };
    setStarted(true);
    setRunning(true);
  };

  /** Back to pose 1, timer idle, a fresh session clock (OURS restart row). */
  const restart = () => {
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
