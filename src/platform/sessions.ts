// Sessions that keep running with the screen locked (App-Centium ROUND_J.md
// §7): breathing, a stretching sequence, a guided script, a run's intervals.
//
// In the app the phone owns the clock (a foreground service): it plays a soft
// cue at each change, keeps the session on the lock screen with Pause / Next /
// Stop, and works out where it is from timestamps, so it is right after the
// phone slept. The screens read that state instead of counting ticks, and still
// save their result exactly as they do in a browser.
//
// Shown only where all three agree: the app, the "live_activities" switch
// (app_config; the same switch iOS's Live Activities will use), and a build
// that has the feature.
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useEffect, useState } from "react";
import { nativeFeatureOn } from "./appConfig";
import type { SessionState, SessionTimeline, SessionsModule } from "./contracts";
import { featureAvailable } from "./features";

interface CentiumSessionsPlugin {
  start(timeline: SessionTimeline): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  next(): Promise<void>;
  jumpTo(options: { index: number }): Promise<void>;
  stop(): Promise<void>;
  current(): Promise<{ state: SessionState | null }>;
  clear(): Promise<void>;
  addListener(eventName: "state", listener: (state: SessionState) => void): Promise<PluginListenerHandle>;
}

const CentiumSessions = registerPlugin<CentiumSessionsPlugin>("CentiumSessions");

export const sessions: SessionsModule = {
  async available() {
    const a = await featureAvailable("sessions");
    return { ok: a.ok && nativeFeatureOn("live_activities") };
  },
  start: (timeline) => CentiumSessions.start(timeline),
  pause: () => CentiumSessions.pause(),
  resume: () => CentiumSessions.resume(),
  next: () => CentiumSessions.next(),
  jumpTo: (index) => CentiumSessions.jumpTo({ index }),
  stop: () => CentiumSessions.stop(),
  current: async () => (await CentiumSessions.current()).state,
  clear: () => CentiumSessions.clear(),
  onState(listener) {
    const handle = CentiumSessions.addListener("state", listener);
    return () => void handle.then((h) => h.remove());
  },
};

/** Time spent in the session so far (or in all, once ended), pauses left out. */
export function sessionElapsedMs(s: SessionState, now: number): number {
  const end = s.endedAt ?? s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.pausedTotalMs);
}

/** Time spent in the current phase, pauses left out. */
export function phaseElapsedMs(s: SessionState, now: number): number {
  const end = s.endedAt ?? s.pausedAt ?? now;
  return Math.max(0, end - s.phaseStartedAt);
}

/**
 * For a screen that can hand its timing to the phone: whether it may, and
 * the session's latest state (null when none). `resultKey` picks this
 * screen's own session; another screen's is left alone.
 */
export function useLockedSession(resultKey: string): { native: boolean; state: SessionState | null } {
  const [native, setNative] = useState(false);
  const [state, setState] = useState<SessionState | null>(null);
  useEffect(() => {
    let alive = true;
    let off: (() => void) | null = null;
    void sessions.available().then(async (a) => {
      if (!alive || !a.ok) return;
      setNative(true);
      off = sessions.onState((s) => {
        if (s.resultKey === resultKey) setState(s);
      });
      const s = await sessions.current();
      if (alive && s?.resultKey === resultKey) setState(s);
    });
    return () => {
      alive = false;
      off?.();
    };
  }, [resultKey]);
  return { native, state };
}
