// FX: vibration for in-app banners, incoming calls and achievements (Batch C,
// Karim 2026-11-11, items 23-30). The rules, pure, so they are tested on their
// own; haptics.ts wires them to the phone.
//
// ONLY IN THE APP. A browser plays nothing for these moments (item 29: only
// Android Chrome could, it can't honour silent mode, and iOS Safari has no
// vibration at all).
//
// THREE GATES, in this order, before anything plays:
//   1. the "Vibration" switch (Settings › Notifications › On this phone),
//      device-local, default on;
//   2. the page is visible;
//   3. the phone says haptics are allowed (CentiumNative.hapticsAllowed, App
//      #31: Android checks the vibrator, the ringer and the system's touch
//      feedback; iOS answers yes and mutes them itself under System Haptics).
//      Its answer is kept 30 s. A build without the method answers no, so old
//      builds stay silent.
//
// ONLY IMPACTS AND NOTIFICATIONS, never Haptics.vibrate: iOS plays that
// through the old sound path, which ignores System Haptics.
//
// NO DRUM ROLLS: a moment with a key plays at most once per key per session,
// and two moments are at least 1.5 s apart.
//
// THE SWITCH TICK (FX follow-up): every toggle switch turned on or off plays
// the phone's selection feedback (UISelectionFeedbackGenerator on iOS; the
// plugin's selection pattern on Android). Same three gates; a reduced answer
// still plays it, since it is already the lightest there is. It is not a
// "moment": the 1.5 s gap doesn't apply to it and it doesn't hold one back,
// so turning several switches plays one tick each. Only a single tap's
// doubles are dropped (TICK_GAP_MS). switchTicks.ts says when to call it.

export type HapticKind = "banner" | "celebrate";
export type ImpactWeight = "light" | "medium" | "heavy";

export type HapticsAllowed = { allowed: boolean; reduced: boolean };

/** What the rules need from the page and the phone (haptics.ts gives the real ones). */
export interface HapticsDeps {
  isNative(): boolean;
  /** The "Vibration" switch. */
  switchOn(): boolean;
  visible(): boolean;
  /** CentiumNative.hapticsAllowed(); may reject (an old build). */
  hapticsAllowed(): Promise<HapticsAllowed>;
  impact(weight: ImpactWeight): Promise<void>;
  success(): Promise<void>;
  /** The selection tick: Haptics.selectionStart, selectionChanged, selectionEnd. */
  selection(): Promise<void>;
  /** navigator.vibrate, for the three web vibrations that predate FX. */
  vibrate(ms: number): void;
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  /** Calls `fn` when the page goes hidden; returns the unsubscribe. */
  onHidden(fn: () => void): () => void;
}

/** How long the phone's answer is kept. */
export const ALLOWED_TTL_MS = 30_000;
/** The least time between two moments. */
export const MIN_GAP_MS = 1_500;
/** Celebrate: Success, then Medium at +140 ms and Heavy at +280 ms (reduced: Success only). */
export const CELEBRATE_STEPS: readonly { at: number; weight: ImpactWeight }[] = [
  { at: 140, weight: "medium" },
  { at: 280, weight: "heavy" },
];
/** Ring: two Medium impacts 150 ms apart, then 1.2 s of quiet, repeated (reduced: one impact a cycle). */
export const RING_PAIR_MS = 150;
export const RING_PAUSE_MS = 1_200;
/** Two switch ticks closer than this are one tap's double (a switch inside a switch row). */
export const TICK_GAP_MS = 80;

const NOT_ALLOWED: HapticsAllowed = { allowed: false, reduced: false };

export interface Haptics {
  /** Plays a moment; resolves to whether it played (for tests). Never rejects. */
  play(kind: HapticKind, opts?: { key?: string }): Promise<boolean>;
  /** A switch turned on or off; resolves to whether it played (for tests). Never rejects. */
  tick(): Promise<boolean>;
  /** The incoming-call ring, until stopRing() or the page goes hidden. */
  startRing(): void;
  stopRing(): void;
  /** The scanners' and the EMOM beeper's web vibration, behind the switch (item 27). */
  vibrate(ms: number): void;
}

export function createHaptics(d: HapticsDeps): Haptics {
  let cached: { at: number; value: HapticsAllowed } | null = null;
  let lastAt = -Infinity;
  let lastTickAt = -Infinity;
  const played = new Set<string>();
  let ring: { stop: () => void } | null = null;

  const allowed = async (): Promise<HapticsAllowed> => {
    if (cached && d.now() - cached.at < ALLOWED_TTL_MS) return cached.value;
    let value = NOT_ALLOWED;
    try {
      const r = await d.hapticsAllowed();
      value = { allowed: r?.allowed === true, reduced: r?.reduced === true };
    } catch {
      // No such method (a build before App #31) or no plugin: silent.
    }
    cached = { at: d.now(), value };
    return value;
  };

  const safe = (p: Promise<void>) => {
    p.catch(() => undefined);
  };

  const play = async (kind: HapticKind, opts?: { key?: string }): Promise<boolean> => {
    if (!d.isNative() || !d.switchOn() || !d.visible()) return false;
    const key = opts?.key;
    if (key !== undefined && played.has(key)) return false;
    if (d.now() - lastAt < MIN_GAP_MS) return false;
    // Taken before the phone answers, so two pills mounting in the same
    // moment (or Strict Mode's second effect) can't both pass.
    if (key !== undefined) played.add(key);
    lastAt = d.now();
    const a = await allowed();
    if (!a.allowed || !d.visible()) return false;
    try {
      if (kind === "banner") {
        safe(d.impact("light"));
      } else {
        safe(d.success());
        if (!a.reduced) {
          for (const step of CELEBRATE_STEPS) d.setTimeout(() => safe(d.impact(step.weight)), step.at);
        }
      }
    } catch {
      return false;
    }
    return true;
  };

  const tick = async (): Promise<boolean> => {
    if (!d.isNative() || !d.switchOn() || !d.visible()) return false;
    if (d.now() - lastTickAt < TICK_GAP_MS) return false;
    lastTickAt = d.now();
    const a = await allowed();
    if (!a.allowed || !d.visible()) return false;
    try {
      safe(d.selection());
    } catch {
      return false;
    }
    return true;
  };

  const stopRing = () => {
    const r = ring;
    ring = null;
    r?.stop();
  };

  const startRing = () => {
    if (ring || !d.isNative() || !d.switchOn() || !d.visible()) return;
    let stopped = false;
    const timers = new Set<unknown>();
    const later = (fn: () => void, ms: number) => {
      const id = d.setTimeout(() => {
        timers.delete(id);
        if (!stopped) fn();
      }, ms);
      timers.add(id);
    };
    const unsubscribe = d.onHidden(stopRing);
    const self = {
      stop: () => {
        stopped = true;
        timers.forEach((id) => d.clearTimeout(id));
        timers.clear();
        unsubscribe();
      },
    };
    ring = self;
    // The phone is asked once, at the start.
    void allowed().then((a) => {
      if (stopped || !a.allowed) {
        if (ring === self) stopRing();
        return;
      }
      const cycle = () => {
        safe(d.impact("medium"));
        if (!a.reduced) later(() => safe(d.impact("medium")), RING_PAIR_MS);
        later(cycle, RING_PAIR_MS + RING_PAUSE_MS);
      };
      cycle();
    });
  };

  const vibrate = (ms: number) => {
    if (!d.switchOn()) return;
    try {
      d.vibrate(ms);
    } catch {
      // Unsupported: most desktops and all of iOS.
    }
  };

  return { play, tick, startRing, stopRing, vibrate };
}
