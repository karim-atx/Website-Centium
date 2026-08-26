import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus, Timer } from "lucide-react";
import clsx from "clsx";

/** Small metronome control meant for the corner of the workout logger.
 * Uses the Web Audio API directly — no audio files needed. */
export const Metronome: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [running, setRunning] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const tick = () => {
    const ctx = ctxRef.current;
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
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, bpm]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "tap w-9 h-9 rounded-full flex items-center justify-center shadow-soft",
          running ? "bg-teal text-white" : "bg-cream-card text-charcoal-soft"
        )}
        aria-label="Metronome"
      >
        <Timer size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 bg-cream-card rounded-2xl shadow-lift p-4 w-48 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Metronome
          </p>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setBpm((b) => Math.max(30, b - 5))}
              className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal"
            >
              <Minus size={12} />
            </button>
            <span className="text-lg font-bold text-charcoal">{bpm} BPM</span>
            <button
              onClick={() => setBpm((b) => Math.min(200, b + 5))}
              className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal"
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className={clsx(
              "tap w-full rounded-xl py-2 text-sm font-semibold",
              running ? "bg-teal text-white" : "bg-primary text-white"
            )}
          >
            {running ? "Stop" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
};
