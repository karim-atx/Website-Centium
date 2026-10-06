import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Design refinement §6.6: a real metronome mark, drawn at lucide's stroke
// weight so it sits with the rest of the set — replaces the generic timer
// glyph.
const MetronomeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 20 10.6 4h2.8L19.2 20Z" />
    <path d="M6.9 15.6h10.2" />
    <path d="M12 19 16.6 7.4" />
    <circle cx="15.7" cy="9.8" r="1.35" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * WO22's pendulum, from the handover's assets/icons/metronome.svg (120×112):
 * lavender body, purple arm with a teal weight pivoting at (60, 92), base,
 * and the beat dot at the top. The arm and dot are driven from outside.
 */
const Pendulum: React.FC<{ angle: number; swingSeconds: number; beat: number; showDot: boolean; pulse: boolean; soft: boolean }> = ({
  angle,
  swingSeconds,
  beat,
  showDot,
  pulse,
  soft,
}) => (
  <svg width={120} height={112} viewBox="0 0 120 112" aria-hidden style={{ display: "block", margin: "0 auto" }}>
    <path d="M44 10 H76 L98 104 H22 Z" fill="rgb(var(--th-c3b3fb))" />
    <path d="M49 18 H71 L88 96 H32 Z" fill="rgb(var(--th-e4ddfd))" />
    <g
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: "60px 92px",
        transition: `transform ${swingSeconds}s ease-in-out`,
      }}
    >
      <line x1="60" y1="92" x2="60" y2="22" stroke="rgb(var(--th-7d67d9))" strokeWidth={3.5} strokeLinecap="round" />
      <rect x="52" y="40" width="16" height="11" rx="3.5" fill="rgb(var(--th-4f8f8a))" />
    </g>
    <circle cx="60" cy="92" r="5" fill="rgb(var(--th-7d67d9))" />
    <rect x="18" y="102" width="84" height="6" rx="3" fill="rgb(var(--th-aea1dc))" />
    {showDot && (
      // Re-keyed on every beat so the pulse replays in time with the click.
      <circle
        key={beat}
        cx="60"
        cy="6"
        r="3.5"
        fill="rgb(var(--th-8f68f6))"
        style={pulse ? { transformOrigin: "60px 6px", animation: soft ? "metro-beat-soft 0.45s ease-out" : "metro-beat 0.35s ease-out" } : undefined}
      />
    )}
  </svg>
);

/**
 * WO22 · Metronome popup, from the metronome icon in the logger header.
 *
 * Stopped: arm upright and still. Running: one swing per beat, 60 / BPM
 * seconds per side, driven by the SAME interval that plays the click so the
 * picture and the sound stay in step (03 WO22), with a subtle pulse of the
 * beat dot; − / + change the speed immediately; Start becomes Stop. Reduced
 * motion: no swing, a soft pulse of the dot on each beat. Web Audio only —
 * no audio files. The popup keeps its width and only grows by the
 * illustration's height.
 */
export const Metronome: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const dark = useIsDark();
  // Mobile v5.1 R3 (no light islands): the − / + glyphs have no token at
  // #8A8594; dark lifts them to text.secondary (7.3:1 on surface.soft).
  const stepInk = dark ? "#B8B3C7" : "#8A8594";
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  // The in-app Reduce motion switch or the OS setting.
  const reducedMotion = useReducedMotion();

  const tick = () => {
    const ctx = ctxRef.current;
    setBeat((b) => b + 1);
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  useEffect(() => {
    if (running) {
      if (!ctxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AudioCtx();
      }
      tick();
      intervalRef.current = window.setInterval(tick, (60 / bpm) * 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBeat(0);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, bpm]);

  const swingSeconds = 60 / bpm;
  // One swing per beat: each tick sends the arm to the other side.
  const angle = running && !reducedMotion && beat > 0 ? (beat % 2 === 1 ? -14 : 14) : 0;

  const stepButton = "tap relative flex items-center justify-center rounded-full before:absolute before:-inset-[8px] before:content-['']";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "tap w-[34px] h-[34px] rounded-full flex items-center justify-center shadow-soft",
          running ? "bg-teal-fill text-on-primary-fill" : "bg-cream-card text-charcoal-soft"
        )}
        aria-label="Metronome"
        aria-expanded={open}
      >
        <MetronomeIcon size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-11 z-20 w-48 animate-fade-slide-up"
          style={{ background: "rgb(var(--c-cream-card))", borderRadius: 20, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}
        >
          <style>{`@keyframes metro-beat { 0% { transform: scale(1.7); opacity: 1; } 100% { transform: scale(1); opacity: 0.85; } } @keyframes metro-beat-soft { 0% { opacity: 0.25; } 100% { opacity: 1; } }`}</style>
          <p
            className="uppercase"
            style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", color: "rgb(var(--c-charcoal-muted))" }}
          >
            Metronome
          </p>
          <Pendulum angle={angle} swingSeconds={swingSeconds} beat={beat} showDot={running} pulse={beat > 0} soft={reducedMotion} />
          <div className="flex items-center justify-between" style={{ margin: "12px 0" }}>
            <button
              onClick={() => setBpm((b) => Math.max(30, b - 5))}
              aria-label="Slower"
              className={stepButton}
              style={{ width: 28, height: 28, background: "rgb(var(--c-cream-soft))", color: stepInk }}
            >
              <Minus size={13} />
            </button>
            <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>
              {bpm} BPM
            </span>
            <button
              onClick={() => setBpm((b) => Math.min(200, b + 5))}
              aria-label="Faster"
              className={stepButton}
              style={{ width: 28, height: 28, background: "rgb(var(--c-cream-soft))", color: stepInk }}
            >
              <Plus size={13} />
            </button>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            aria-pressed={running}
            className="tap w-full"
            style={{
              height: 44,
              borderRadius: 12,
              // Idle is primary-fill. Running is the board's #7D67D9 in light
              // mode; dark mode uses the deeper brand shade.
              background: running ? (dark ? "rgb(var(--c-primary-deep-text))" : "rgb(var(--th-7d67d9))") : "rgb(var(--c-primary-fill))",
              color: "rgb(var(--c-on-primary-fill))",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {running ? "Stop" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
};
