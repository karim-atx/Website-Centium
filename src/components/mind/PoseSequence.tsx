import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Pause, PersonStanding, Play, SkipForward } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import clsx from "clsx";
import { PinnedCta } from "../ui/PinnedCta";

// Stretching and Yoga, mobile v5.1 MO1.1.4.1 / MO1.1.4.2: the current pose in
// a hero with a timer ring and a Next preview, then the numbered sequence.
//
// THE TIMER (A15, not drawn on the board): each pose runs for its own
// seconds (yoga poses have none in the content, so 30 s). Start / Pause and
// Next are a pinned row; at zero it moves on to the next pose by itself and
// stops after the last. Tapping a pose in the sequence makes it current.
// Nothing is saved: only breathing writes meditation sessions.
//
// FIGURES (A14): yoga uses the six first-pass GIFs, still thumbnails in the
// list; stretches have no figures yet, so they show a generic icon.

export interface Pose {
  id: string;
  name: string;
  /** The line under the name: a stretch's "target · type · Ns", a pose's subtitle. */
  meta: string;
  seconds: number;
  instructions: string;
  /** Yoga: public/meditation/yoga/<image>.gif and .png. */
  image?: string;
  /** Yoga: the difficulty pill. */
  difficulty?: { label: string; className: string };
}

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

function Figure({ pose, size, animate }: { pose: Pose; size: number; animate: boolean }) {
  if (pose.image) {
    return (
      <img
        src={`/meditation/yoga/${pose.image}.${animate ? "gif" : "png"}`}
        alt=""
        width={size}
        height={size}
        // The GIFs are drawn on white. In dark, invert them (hue kept) and
        // screen-blend so the white becomes the card behind, not a light square.
        className="object-contain dark:invert dark:hue-rotate-180 dark:mix-blend-screen"
        style={{ width: size, height: size }}
      />
    );
  }
  return <PersonStanding size={Math.round(size * 0.42)} strokeWidth={1.5} className="text-primary-dark" />;
}

export const PoseSequence: React.FC<{ poses: Pose[] }> = ({ poses }) => {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [leftMs, setLeftMs] = useState(poses[0].seconds * 1000);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const tick = useRef<{ at: number } | null>(null);

  const select = (i: number) => {
    setIdx(i);
    setLeftMs(poses[i].seconds * 1000);
    setFinished(false);
  };

  // Wall-clock countdown, so a throttled background tab doesn't stretch a pose.
  useEffect(() => {
    if (!running) return;
    tick.current = { at: Date.now() };
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = now - (tick.current?.at ?? now);
      tick.current = { at: now };
      setLeftMs((ms) => Math.max(0, ms - dt));
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  // At zero: on to the next pose, or stop after the last.
  useEffect(() => {
    if (!running || leftMs > 0) return;
    const t = window.setTimeout(() => {
      if (idx < poses.length - 1) {
        setIdx(idx + 1);
        setLeftMs(poses[idx + 1].seconds * 1000);
      } else {
        setRunning(false);
        setFinished(true);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [running, leftMs, idx, poses]);

  const pose = poses[idx];
  const next = poses[idx + 1];
  const frac = 1 - leftMs / (pose.seconds * 1000);
  const secondsLeft = Math.ceil(leftMs / 1000);

  return (
    <div>
      {/* The hero: the current pose. */}
      <div className="rounded-[22px] bg-primary-pale px-4 pt-4 pb-3 mb-6">
        <div className="flex items-center gap-4">
          <span className="relative shrink-0 w-[118px] h-[118px] flex items-center justify-center">
            <svg viewBox="0 0 118 118" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="59" cy="59" r={RING_R} fill="none" strokeWidth="3" className="stroke-cream-card" />
              <circle
                cx="59"
                cy="59"
                r={RING_R}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                className="stroke-primary-dark"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - (running || frac > 0 ? frac : 1))}
                style={{ transition: "stroke-dashoffset 0.25s linear" }}
              />
            </svg>
            <span className="relative w-[96px] h-[96px] rounded-full bg-cream-card flex flex-col items-center justify-center overflow-hidden">
              {/* The count sits under the figure so a pose GIF never runs into it. */}
              <Figure pose={pose} size={pose.image ? 60 : 72} animate={!reduced} />
              <span className={clsx("text-[12px] font-bold leading-none text-primary-dark tabular-nums", pose.image ? "-mt-1" : "absolute bottom-2")}>
                {finished ? "Done" : `${secondsLeft}s`}
              </span>
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[.14em] uppercase text-primary-dark">
              Pose {idx + 1} of {poses.length}
            </p>
            <p className="mt-1 text-[17px] font-bold leading-tight text-charcoal">{pose.name}</p>
            <p className="mt-1 text-[12px] text-charcoal-muted">{pose.meta}</p>
            {pose.difficulty && (
              <span
                className={clsx("inline-block mt-2 text-[10px] font-bold uppercase rounded-full px-2 py-0.5", pose.difficulty.className)}
              >
                {pose.difficulty.label}
              </span>
            )}
          </div>
        </div>
        {next && (
          <button
            onClick={() => select(idx + 1)}
            className="tap w-full mt-3 pt-3 border-t border-charcoal/[0.08] flex items-center gap-3 text-left"
          >
            <span className="text-[11px] font-bold tracking-[.14em] uppercase text-charcoal-muted">Next</span>
            <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-charcoal truncate">{next.name}</span>
            <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
          </button>
        )}
      </div>

      {/* The sequence. */}
      <p className="mb-2.5 px-1 text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
        Sequence
      </p>
      <div className="space-y-2">
        {poses.map((p, i) => {
          const current = i === idx;
          return (
            <button
              key={p.id}
              onClick={() => {
                if (!current) {
                  setRunning(false);
                  select(i);
                }
              }}
              aria-current={current ? "step" : undefined}
              className={clsx(
                "tap relative w-full text-left rounded-[20px] px-3 py-3 border-[1.5px]",
                current ? "bg-cream-card border-primary" : "bg-cream-soft border-transparent"
              )}
            >
              <span
                className={clsx(
                  "absolute left-2 top-2 z-10 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                  current ? "bg-primary-fill text-on-primary-fill" : "bg-cream-card text-primary-dark border border-charcoal/[0.1]"
                )}
              >
                {i + 1}
              </span>
              <span className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-cream-card flex items-center justify-center shrink-0 overflow-hidden">
                  <Figure pose={p} size={40} animate={false} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-charcoal truncate">{p.name}</span>
                  {!p.difficulty && <span className="block text-[12px] text-charcoal-muted truncate">{p.meta}</span>}
                </span>
                {p.difficulty && (
                  <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5 shrink-0", p.difficulty.className)}>
                    {p.difficulty.label}
                  </span>
                )}
                {current ? (
                  <ChevronUp size={15} className="text-charcoal-faint shrink-0" />
                ) : (
                  <ChevronDown size={15} className="text-charcoal-faint shrink-0" />
                )}
              </span>
              {current && (
                <span className="block mt-2.5 ml-14 text-[13px] leading-relaxed text-charcoal-soft">{p.instructions}</span>
              )}
            </button>
          );
        })}
      </div>

      <PinnedCta
        primary={{
          label: running ? "Pause" : finished ? "Start again" : "Start",
          icon: running ? <Pause size={14} /> : <Play size={14} />,
          onClick: () => {
            if (running) setRunning(false);
            else {
              if (finished) select(0);
              setRunning(true);
            }
          },
        }}
        trailing={{
          icon: <SkipForward size={16} />,
          label: "Next pose",
          onClick: () => next && select(idx + 1),
          width: 44,
          disabled: !next,
          className: "!bg-cream-soft !text-charcoal-soft",
        }}
      />
    </div>
  );
};

export default PoseSequence;
