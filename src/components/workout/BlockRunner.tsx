import React, { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Plus, Minus, Volume2, VolumeX } from "lucide-react";
import type { BlockKind, BlockResult, WorkoutBlock } from "../../types";
import { blockHeading, formatClock } from "../../services/workout/prescription";
import { blockRunHint } from "../../services/workout/results";
import {
  capReached,
  elapsedSeconds,
  intervalPosition,
  isRunning,
  pause,
  remainingSeconds,
  resume,
  startedStopwatch,
  stoppedStopwatch,
  type Stopwatch,
} from "../../services/workout/clock";

// Running a block, as opposed to reading one.
//
// EACH KIND NEEDS A DIFFERENT INSTRUMENT, which is the reason this is not one
// generic card with a timer bolted on. An AMRAP needs a countdown and a tally
// of rounds; an EMOM needs to know which round it is on and how long until the
// next one starts; a For Time needs a stopwatch that stops when you say so; a
// superset needs no clock at all and would be insulted by one.
//
// NOTHING HERE COUNTS TICKS. Every number is derived from a start timestamp by
// services/workout/clock — see that file's header. The one-second interval
// below exists ONLY to provoke a re-render, and the display is correct even
// when it does not fire, which is what makes these timers survive the screen
// locking and the app being backgrounded.

/** Matches the rails BlockCard uses, so a block looks like itself everywhere. */
const RAIL: Record<BlockKind, { rail: string; tint: string; ink: string }> = {
  superset: { rail: "#7D6BB5", tint: "rgba(125,107,181,0.08)", ink: "#5F5093" },
  amrap: { rail: "#4F8F8A", tint: "rgba(79,143,138,0.09)", ink: "#3C6B65" },
  emom: { rail: "#3F6E93", tint: "rgba(63,110,147,0.08)", ink: "#3F6E93" },
  for_time: { rail: "#8A5878", tint: "rgba(138,88,120,0.08)", ink: "#8A5878" },
};

/** Re-renders once a second while something is running. See the header. */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    // Re-read on wake as well as on the interval: a phone that was asleep for
    // ten minutes fires `visibilitychange` immediately and the interval up to
    // a second later, and the ten-minute-stale frame in between is exactly
    // what somebody sees when they pick the phone back up.
    const onWake = () => setNow(Date.now());
    const id = window.setInterval(onWake, 1000);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [active]);
  return now;
}

/**
 * A short beep, for the top of an EMOM interval.
 *
 * WebAudio rather than an audio file: no asset to ship, no autoplay policy to
 * fight once the context has been resumed by a real tap, and nothing to fail
 * silently if a network request for a sound does not land mid-workout.
 * Vibration is attempted alongside and ignored where unsupported, which is
 * most desktops and all of iOS Safari.
 */
function useBeeper(enabled: boolean) {
  const ctxRef = React.useRef<AudioContext | null>(null);
  return React.useCallback(() => {
    if (!enabled) return;
    try {
      navigator.vibrate?.(180);
    } catch {
      // Unsupported. Not worth a branch — the beep is the primary signal.
    }
    try {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = (ctxRef.current ??= new Ctor());
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // A blocked or unavailable AudioContext is not a reason to stop a set.
    }
  }, [enabled]);
}

export const BlockRunner: React.FC<{
  block: WorkoutBlock;
  ordinal: number;
  result: BlockResult | undefined;
  onResult: (patch: Partial<BlockResult>) => void;
  /** Starts the session's own clock the first time anything here is used. */
  onStarted: () => void;
  children: React.ReactNode;
}> = ({ block, ordinal, result, onResult, onStarted, children }) => {
  const colors = RAIL[block.kind];
  const heading = blockHeading(block, ordinal);

  return (
    <section
      aria-label={heading}
      className="overflow-hidden mb-6"
      style={{
        borderRadius: 16,
        background: colors.tint,
        borderLeft: `4px solid ${colors.rail}`,
      }}
    >
      <div style={{ padding: "10px 12px 8px" }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: colors.ink }}>{heading}</p>
        <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#8C8378" }}>{blockRunHint(block)}</p>
      </div>

      {block.kind !== "superset" && (
        <div style={{ padding: "0 8px 8px" }}>
          <ScoreBoard
            block={block}
            result={result}
            onResult={onResult}
            onStarted={onStarted}
            ink={colors.ink}
          />
        </div>
      )}

      <div style={{ background: "#FFFFFF", margin: "0 6px 6px", borderRadius: 12, padding: "10px 10px 2px" }}>
        {children}
      </div>
    </section>
  );
};

/** The instrument: a countdown, an interval timer or a stopwatch. */
const ScoreBoard: React.FC<{
  block: WorkoutBlock;
  result: BlockResult | undefined;
  onResult: (patch: Partial<BlockResult>) => void;
  onStarted: () => void;
  ink: string;
}> = ({ block, result, onResult, onStarted, ink }) => {
  const [watch, setWatch] = useState<Stopwatch>(stoppedStopwatch);
  const [sound, setSound] = useState(true);
  const now = useTick(isRunning(watch));
  const beep = useBeeper(sound);

  const start = () => {
    setWatch((w) => (isRunning(w) ? pause(w, Date.now()) : w.pausedMs > 0 ? resume(w, Date.now()) : startedStopwatch(Date.now())));
    onStarted();
  };
  const reset = () => setWatch(stoppedStopwatch());

  const rounds = result?.roundsCompleted ?? 0;
  const bump = (by: number) => onResult({ roundsCompleted: Math.max(0, rounds + by) });

  // --- AMRAP: a countdown and a tally ---------------------------------------
  if (block.kind === "amrap") {
    const cap = block.timeCapSeconds ?? 0;
    const left = cap ? remainingSeconds(watch, cap, now) : elapsedSeconds(watch, now);
    const over = cap > 0 && capReached(watch, cap, now);
    return (
      <Panel>
        <Clock value={formatClock(left)} ink={over ? "#B0402F" : ink} label={over ? "Time" : cap ? "Remaining" : "Elapsed"} />
        <Transport running={isRunning(watch)} onToggle={start} onReset={reset} />
        <Counter label="Rounds" value={rounds} onChange={bump} ink={ink} />
        <NumberBox
          label="Extra reps"
          value={result?.extraReps}
          onChange={(v) => onResult({ extraReps: v })}
          placeholder="0"
        />
      </Panel>
    );
  }

  // --- EMOM: which round, and how long until the next ------------------------
  if (block.kind === "emom") {
    const interval = block.intervalSeconds ?? 60;
    const planned = block.rounds ?? 0;
    const pos = intervalPosition(watch, interval, planned || 1, now);
    return (
      <EmomPanel
        pos={pos}
        planned={planned}
        running={isRunning(watch)}
        onToggle={start}
        onReset={reset}
        beep={beep}
        sound={sound}
        onSound={() => setSound((v) => !v)}
        rounds={rounds}
        onBump={bump}
        ink={ink}
      />
    );
  }

  // --- For Time: a stopwatch, and a Finish that records it -------------------
  const cap = block.timeCapSeconds ?? 0;
  const elapsed = elapsedSeconds(watch, now);
  const hitCap = cap > 0 && capReached(watch, cap, now);
  const finished = result?.timeSeconds != null;
  const wasCapped = finished && result!.capped === true;
  return (
    <Panel>
      <Clock
        value={formatClock(finished ? result!.timeSeconds! : hitCap ? cap : elapsed)}
        ink={hitCap ? "#B0402F" : ink}
        label={finished ? (result!.capped ? "Capped" : "Finished") : hitCap ? "At the cap" : "Elapsed"}
      />
      {!finished && <Transport running={isRunning(watch)} onToggle={start} onReset={reset} />}
      {block.rounds ? <Counter label="Rounds" value={rounds} onChange={bump} ink={ink} /> : null}
      {/* ROUNDS PLUS REPS IS THE SCORE OF A CAPPED PIECE, and the clock is
          not — it reads the cap, the same value for everyone it stopped. The
          field appears only once the cap has actually been recorded, because
          extra_reps is legal only on a capped row: the constraint refuses it
          on a finished one, where there is no remainder to have. */}
      {wasCapped && (
        <NumberBox
          label="Reps in the unfinished round"
          value={result?.extraReps}
          onChange={(v) => onResult({ extraReps: v })}
          placeholder="0"
        />
      )}
      {finished ? (
        <button
          onClick={() =>
            // The reps go with the cap they belonged to. Leaving them behind
            // would produce a finished For Time carrying a remainder, which
            // the CHECK refuses and which would cost the whole session at
            // save time.
            onResult({ timeSeconds: undefined, capped: undefined, extraReps: undefined })
          }
          className="tap text-[11px] font-semibold"
          style={{ color: ink }}
        >
          Undo finish
        </button>
      ) : (
        <button
          onClick={() => {
            // time_seconds is NOT NULL and > 0 for this kind, so a block that
            // was never started cannot be recorded at all.
            const seconds = hitCap ? cap : elapsed;
            if (seconds <= 0) return;
            setWatch((w) => pause(w, Date.now()));
            onResult({ timeSeconds: seconds, capped: hitCap || undefined });
          }}
          disabled={elapsed <= 0}
          className="tap text-[11px] font-bold"
          style={{
            borderRadius: 999,
            padding: "6px 14px",
            background: elapsed <= 0 ? "#E6E2DC" : ink,
            color: elapsed <= 0 ? "#A79F94" : "#FFFFFF",
          }}
        >
          {hitCap ? "Record cap" : "Finish"}
        </button>
      )}
    </Panel>
  );
};


const EmomPanel: React.FC<{
  pos: { round: number; remaining: number; done: boolean };
  planned: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  beep: () => void;
  sound: boolean;
  onSound: () => void;
  rounds: number;
  onBump: (by: number) => void;
  ink: string;
}> = ({ pos, planned, running, onToggle, onReset, beep, sound, onSound, rounds, onBump, ink }) => {
  // The top of each interval, announced once. Keyed on the round number rather
  // than on the remaining seconds, so a phone waking mid-interval does not
  // fire a beep for a round that started while it was asleep.
  const lastRound = React.useRef(0);
  useEffect(() => {
    if (!running || pos.done) return;
    if (pos.round === lastRound.current) return;
    if (lastRound.current !== 0) beep();
    lastRound.current = pos.round;
  }, [pos.round, pos.done, running, beep]);

  return (
    <Panel>
      <Clock
        value={formatClock(pos.remaining)}
        ink={pos.done ? "#8C8378" : ink}
        label={pos.done ? "Done" : `Round ${pos.round}${planned ? ` of ${planned}` : ""}`}
      />
      <Transport running={running} onToggle={onToggle} onReset={onReset} />
      <button
        onClick={onSound}
        aria-pressed={sound}
        aria-label={sound ? "Mute the interval beep" : "Unmute the interval beep"}
        className="tap w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "#FFFFFF", color: sound ? ink : "#A79F94" }}
      >
        {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
      </button>
      <Counter label="Held" value={rounds} onChange={onBump} ink={ink} />
      {/* MISSING A ROUND IS A THING THAT HAPPENS, and an EMOM where you cannot
          say so records a workout nobody did. It is the same counter read the
          other way: rounds held out of rounds planned. */}
      {planned > 0 && (
        <span className="text-[10.5px] text-charcoal-faint">
          {planned - rounds > 0 ? `${planned - rounds} missed` : "all held"}
        </span>
      )}
    </Panel>
  );
};

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="flex flex-wrap items-center"
    style={{ gap: 10, background: "#FFFFFF", borderRadius: 12, padding: "9px 11px" }}
  >
    {children}
  </div>
);

const Clock: React.FC<{ value: string; ink: string; label: string }> = ({ value, ink, label }) => (
  <div style={{ minWidth: 78 }}>
    <p
      className="tabular-nums"
      style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: ink }}
    >
      {value}
    </p>
    <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: "#8C8378", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {label}
    </p>
  </div>
);

const Transport: React.FC<{ running: boolean; onToggle: () => void; onReset: () => void }> = ({
  running,
  onToggle,
  onReset,
}) => (
  <span className="flex items-center" style={{ gap: 6 }}>
    <button
      onClick={onToggle}
      aria-label={running ? "Pause the block timer" : "Start the block timer"}
      className="tap w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
    >
      {running ? <Pause size={13} fill="white" /> : <Play size={13} fill="white" />}
    </button>
    <button
      onClick={onReset}
      aria-label="Reset the block timer"
      className="tap w-8 h-8 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
    >
      <RotateCcw size={13} />
    </button>
  </span>
);

const Counter: React.FC<{ label: string; value: number; onChange: (by: number) => void; ink: string }> = ({
  label,
  value,
  onChange,
  ink,
}) => (
  <span className="flex items-center" style={{ gap: 6 }}>
    <button
      onClick={() => onChange(-1)}
      aria-label={`One fewer ${label.toLowerCase()}`}
      disabled={value <= 0}
      className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center disabled:opacity-40"
    >
      <Minus size={13} />
    </button>
    <span style={{ minWidth: 38, textAlign: "center" }}>
      <span className="tabular-nums" style={{ display: "block", fontSize: 19, fontWeight: 800, color: ink }}>
        {value}
      </span>
      <span style={{ display: "block", fontSize: 9, color: "#8C8378" }}>{label}</span>
    </span>
    <button
      onClick={() => onChange(1)}
      aria-label={`One more ${label.toLowerCase()}`}
      className="tap w-8 h-8 rounded-full flex items-center justify-center text-white"
      style={{ background: ink }}
    >
      <Plus size={14} />
    </button>
  </span>
);

const NumberBox: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block" style={{ width: 84 }}>
    <span style={{ display: "block", fontSize: 9, color: "#8C8378", marginBottom: 3 }}>{label}</span>
    <input
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^\d]/g, "");
        onChange(cleaned === "" ? undefined : Number(cleaned));
      }}
      placeholder={placeholder}
      inputMode="numeric"
      aria-label={label}
      className="w-full placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      style={{
        borderRadius: 9,
        background: "#FFFFFF",
        border: "1px solid rgba(36,31,27,0.1)",
        padding: "6px 9px",
        fontSize: 14,
        textAlign: "center",
        color: "#241F1B",
      }}
    />
  </label>
);
