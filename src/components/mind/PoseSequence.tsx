import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Toast } from "../ui/Toast";
import { logMeditationSession } from "../../services/meditation";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { formatMeditationTime, meditationKind, sessionSeconds } from "../../services/meditation/logic";
import { meditationPoseV2Urls, type MeditationPoseV2 } from "../../utils/assetUrls";

// Stretching and Yoga, v6 MO1.1.4.1 / MO1.1.4.2: the current pose in a
// lavender hero (ring with the pose animation, "POSE n OF 6", name, meta, a
// Next row), then the numbered Sequence with the current card open.
//
// FIGURES: the v2 pose art (motion-specs "Meditation poses v2"): the hero
// plays the current pose's 208 px GIF at 104 (3.5 s loop, only the current
// pose animates); the list shows 88 px first-frame thumbnails at 40. Until the
// GIF has loaded, if it fails, and under Reduce motion the hero shows the
// 208 px first-frame still instead (MO1.1.4.1 O3, MO1.1.4.2 O2 / O3 / S7).
// Dark mode uses the re-grounded set (V6-100; see assetUrls).
//
// STRETCHING TIMER (MO1.1.4.1 S6, V6-144): the ring is the start / pause
// button. It counts the pose's seconds down by the wall clock (not by ticks),
// drains the ring, and at 0 moves on to the next pose; after pose 6 the
// sequence is complete. It pauses when the page is hidden. Yoga has no timer
// (its ring reads "Hold").
//
// THE SESSION (MO1.1.4.1 S7, MO1.1.4.2 S2, V6-144 "log a sequence only when
// finished"): written once, when the sequence finishes (pose 6's timer ends or
// "NEXT Finish" is tapped), as meditation_sessions {kind stretching_sequence /
// yoga_sequence, completed true}. Its clock starts at the first timer start
// (Stretching) or when the tab opened / the sequence restarted (Yoga, and
// Stretching tapped through without the timer). A sequence left unfinished
// (tab switch, back) is not logged. Under the table's 10 s floor nothing is
// saved ("Too short to save.").

export interface Pose {
  id: string;
  name: string;
  /** The line under the name: a stretch's "target · type · Ns", a pose's subtitle. */
  meta: string;
  seconds: number;
  instructions: string;
  /** The v2 pose art key (public/meditation/v2/<art>.*). */
  art: MeditationPoseV2;
  /** Yoga: the difficulty pill. */
  difficulty?: { label: string; className: string };
}

// MO1.1.4.1 #8: a 150 graphic; the ring measured on the 2x frame is 128
// across its outer edge, 3 pt stroke (r 62.5), centred. Inside it the disc
// (#EBE7F7 measured; dark #242730 derived, = the dark GIF ground).
const RING_BOX = 150;
const RING_R = 62.5;
const RING_C = 2 * Math.PI * RING_R;
const DISC = 2 * (RING_R - 1.5); // 122: fills the ring inside its stroke
const DISC_AT = (RING_BOX - DISC) / 2; // 14
// #9: the 104 GIF sits 23 in from the graphic's left and 16 from its top.
const GIF = 104;
const GIF_X = 23;
const GIF_Y = 16;

const SAVE_FAILED = "Couldn't save. Try again.";

type SaveState = "saving" | "saved" | "short" | "hidden";

/** The hero image: the still until the GIF loads (or always, under Reduce motion). */
function HeroArt({ art, reduced, dark }: { art: MeditationPoseV2; reduced: boolean; dark: boolean }) {
  const urls = meditationPoseV2Urls(art);
  const set = dark ? urls.dark : urls;
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const showGif = !reduced && failed !== set.gif;
  return (
    <>
      <img
        src={set.still}
        alt=""
        width={GIF}
        height={GIF}
        className="absolute"
        style={{ left: GIF_X - DISC_AT, top: GIF_Y - DISC_AT, width: GIF, height: GIF }}
      />
      {showGif && (
        <img
          key={set.gif}
          src={set.gif}
          alt=""
          width={GIF}
          height={GIF}
          onLoad={() => setLoaded(set.gif)}
          onError={() => setFailed(set.gif)}
          className="absolute"
          style={{ left: GIF_X - DISC_AT, top: GIF_Y - DISC_AT, width: GIF, height: GIF, opacity: loaded === set.gif ? 1 : 0 }}
        />
      )}
    </>
  );
}

export const PoseSequence: React.FC<{ poses: Pose[]; kind: "stretching" | "yoga" }> = ({ poses, kind }) => {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const reduced = useReducedMotion();
  const dark = useIsDark();
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

  /** The finished sequence: seconds saved (null under the 10 s floor), seconds shown, save state. */
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
  const fade = reduced ? undefined : "animate-[pose-fade_300ms_cubic-bezier(0.22,1,0.36,1)_both]";

  const timerLabel = !started ? "Start timer" : running ? "Pause timer" : "Resume timer";

  // The ring, its disc and the label, shared by the pose and completion states.
  const graphic = (inner: React.ReactNode, label: React.ReactNode) => (
    <>
      <svg viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} className="absolute inset-0 -rotate-90" aria-hidden>
        {/* K4: the track shows once the ring drains: primary-dark @16%. */}
        <circle cx={RING_BOX / 2} cy={RING_BOX / 2} r={RING_R} fill="none" strokeWidth="3" className="stroke-primary-dark/[0.16]" />
        <circle
          cx={RING_BOX / 2}
          cy={RING_BOX / 2}
          r={RING_R}
          fill="none"
          strokeWidth="3"
          strokeLinecap={drain > 0 ? "round" : undefined}
          className="stroke-primary-dark"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * drain}
          style={{ transition: running ? "stroke-dashoffset 0.12s linear" : undefined }}
        />
      </svg>
      <span
        className="absolute rounded-full overflow-hidden bg-[#EBE7F7] dark:bg-[#242730]"
        style={{ left: DISC_AT, top: DISC_AT, width: DISC, height: DISC }}
      >
        {inner}
      </span>
      {label}
    </>
  );

  // #10: 11/16.5 800 primary-dark, 150 wide at y 111.5 in the graphic.
  const countLabel = (
    <span
      className="absolute left-0 w-full text-center text-[11px] leading-[16.5px] font-extrabold text-primary-dark tabular-nums"
      style={{ top: 111.5 }}
    >
      {timed ? `${leftS}s` : "Hold"}
    </span>
  );

  const nextRowClass =
    // #14: m 14, pad 12 0 0 0, border-top 0.547723 px primary-dark @16%.
    // The line is a 0.547723 px tall layer, not a border: Chromium snaps
    // border widths under 1 px up to 1 px, a layer keeps the literal height.
    "tap relative w-full mt-3.5 pt-[12.547723px] flex items-center gap-2 text-left";
  const nextRule = <span aria-hidden className="absolute inset-x-0 top-0 h-[0.547723px] bg-primary-dark/[0.16]" />;
  const nextLabelClass = "text-[10.5px] leading-[15.8px] font-bold tracking-[0.8px] uppercase text-charcoal-muted shrink-0";
  const nextNameClass = "flex-1 min-w-0 text-[12.5px] leading-[18.8px] font-semibold text-charcoal truncate";

  return (
    <div>
      <style>{`@keyframes pose-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {/* #7: the hero, 4 under the fixed area (16 under the tabs), pad 18 16
          14, r22, #F0EDF9 / #303141, 20 above "Sequence". */}
      <div className="mt-1 rounded-[22px] bg-primary-pale px-4 pt-[18px] pb-3.5 mb-5">
        {complete ? (
          <div key="done" className={fade}>
            <div className="flex items-center gap-3.5">
              <span className="relative shrink-0" style={{ width: RING_BOX, height: RING_BOX }}>
                {graphic(
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check size={40} strokeWidth={2.5} className="text-primary-dark" aria-hidden />
                  </span>,
                  null
                )}
              </span>
              <div className="min-w-0 flex-1" role="status">
                <p className="text-[10px] leading-[14px] font-bold tracking-[1.2px] uppercase text-primary-dark">Sequence complete</p>
                <p className="mt-1 text-[16px] leading-[21px] font-bold text-charcoal">Nice work</p>
                <p className="mt-[3px] text-[11.5px] leading-[16px] text-charcoal-muted">
                  {poses.length} {timed ? "stretches" : "poses"} · {formatMeditationTime(complete.shown)}
                </p>
                {complete.save !== "hidden" && (
                  <p className="mt-2 text-[11px] leading-[16px] font-semibold text-charcoal-soft">
                    {complete.save === "saving" ? "Saving…" : complete.save === "saved" ? "Saved to your practice" : "Too short to save."}
                  </p>
                )}
              </div>
            </div>
            <button onClick={restart} className={nextRowClass}>
              {nextRule}
              <span className={nextLabelClass}>Again</span>
              <span className={nextNameClass}>Start from pose 1</span>
              <RotateCcw size={14} className="text-charcoal-faint shrink-0" aria-hidden />
            </button>
          </div>
        ) : (
          <div key="pose" className={fade}>
            <div className="flex items-center gap-3.5">
              {timed ? (
                <button
                  type="button"
                  onClick={toggleTimer}
                  aria-label={timerLabel}
                  className="tap relative shrink-0 rounded-full"
                  style={{ width: RING_BOX, height: RING_BOX }}
                >
                  {graphic(<HeroArt art={pose.art} reduced={reduced} dark={dark} />, countLabel)}
                </button>
              ) : (
                <span className="relative shrink-0" style={{ width: RING_BOX, height: RING_BOX }}>
                  {graphic(<HeroArt art={pose.art} reduced={reduced} dark={dark} />, countLabel)}
                </span>
              )}
              {/* #11-#14: 10/14 700 ls 1.2, 16/21 700 (two lines max), 11.5/16,
                  the pill 11 under the meta. */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-[14px] font-bold tracking-[1.2px] uppercase text-primary-dark">
                  Pose {idx + 1} of {poses.length}
                </p>
                <p className="mt-1 text-[16px] leading-[21px] font-bold text-charcoal line-clamp-2">{pose.name}</p>
                <p className="mt-[3px] text-[11.5px] leading-[16px] text-charcoal-muted">{pose.meta}</p>
                {pose.difficulty && (
                  <span
                    className={clsx(
                      "inline-block mt-[11px] text-[10px] leading-[15px] font-bold uppercase rounded-full px-2 py-0.5 whitespace-nowrap",
                      pose.difficulty.className
                    )}
                  >
                    {pose.difficulty.label}
                  </span>
                )}
              </div>
            </div>
            {/* #14-#17: the Next row; on the last pose it reads "NEXT Finish"
                and completes the sequence (S2). */}
            <button onClick={next ? () => goTo(idx + 1) : finish} className={nextRowClass}>
              {nextRule}
              <span className={nextLabelClass}>Next</span>
              <span className={nextNameClass}>{next ? next.name : "Finish"}</span>
              <ChevronRight size={14} className="text-charcoal-faint shrink-0 rtl:rotate-180" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* #18: 10.5/14 700 ls 1.3 uppercase, m 0 4 8 4. */}
      <p className="mb-2 px-1 text-[10.5px] leading-[14px] font-bold tracking-[1.3px] uppercase text-charcoal-muted">Sequence</p>
      <div className="space-y-2">
        {poses.map((p, i) => {
          const current = !complete && i === idx;
          const urls = meditationPoseV2Urls(p.art);
          return (
            <button
              key={p.id}
              onClick={() => {
                // K3: tapping the current row does nothing (no collapse).
                if (!current) select(i);
              }}
              aria-current={current ? "step" : undefined}
              className={clsx(
                // #19 / #27: r16, padding 12 14, border 1.09545 px.
                "tap relative w-full text-left rounded-[16px] px-3.5 py-3 border-[1.09545px]",
                current ? "bg-cream-card border-primary" : "bg-cream-soft border-transparent"
              )}
            >
              {/* #22 / #30: the number dot, 16 across, 9/13.5 800, 10 / 8 in. */}
              <span
                className={clsx(
                  "absolute left-2.5 top-2 z-10 w-4 h-4 rounded-full text-[9px] leading-[13.5px] font-extrabold flex items-center justify-center",
                  current
                    ? "bg-primary-fill text-on-primary-fill"
                    : "bg-cream-card text-primary-dark shadow-[0_1px_2px_rgba(36,31,27,0.12)] dark:shadow-none"
                )}
              >
                {i + 1}
              </span>
              <span className="flex items-center gap-3">
                {/* #20 / #28: the 44 tile (current primary @16%, solid #5B48B8
                    under High contrast, O11); #21 / #29 the 40 thumbnail r10. */}
                <span
                  className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
                    current ? "bg-primary/[0.16] [.high-contrast_&]:bg-primary" : "bg-cream-card"
                  )}
                >
                  <img
                    src={dark ? urls.dark.thumb : urls.thumb}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-10 h-10 rounded-[10px]"
                  />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] leading-[19px] font-semibold text-charcoal truncate">{p.name}</span>
                  {/* K4: rows that carry a pill show no subtitle. */}
                  {!p.difficulty && <span className="block text-[11.5px] leading-[16px] text-charcoal-muted truncate">{p.meta}</span>}
                </span>
                {p.difficulty && (
                  <span
                    className={clsx(
                      "text-[10px] leading-[15px] font-bold uppercase rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap",
                      p.difficulty.className
                    )}
                  >
                    {p.difficulty.label}
                  </span>
                )}
                {current ? (
                  <ChevronUp size={15} className="text-charcoal-faint shrink-0" aria-hidden />
                ) : (
                  <ChevronDown size={15} className="text-charcoal-faint shrink-0" aria-hidden />
                )}
              </span>
              {current && (
                // #26: m 10 0 2 56, 12/19.2 #5B5349 / #B8B3C7.
                <span className="block mt-2.5 mb-0.5 ml-14 text-[12px] leading-[19.2px] text-charcoal-soft">{p.instructions}</span>
              )}
            </button>
          );
        })}
      </div>
      <Toast open={!!toast} message={toast ?? ""} tone="error" onExpire={() => setToast(null)} />
    </div>
  );
};

export default PoseSequence;
