// The Round J native modules, as types (App-Centium ROUND_J.md §2.7, §3,
// §4.4, §5.3, §6, §7.5). Each module in src/platform/ implements its
// interface as its native half lands, Android first, then iOS with no change
// here. Screens are written against these, and the browser harness stubs them.
//
// Every module's `available()` is featureAvailable(feature) (features.ts),
// plus a module-specific reason where the person can fix it.

export type Unsubscribe = () => void;

// ---- Health Connect / Apple Health (§2) ----

/** What is read (Karim, D1): weight and body fat only while recovery-sensitive mode is off. */
export type HealthType = "steps" | "sleep" | "exercise" | "heart_rate" | "weight" | "body_fat";

export type HealthAvailability = {
  ok: boolean;
  reason?: "not_native" | "unsupported" | "needs_install" | "needs_update";
};

export interface HealthModule {
  available(): Promise<HealthAvailability>;
  /** Which store the phone has: copy names "Health Connect" or "Apple Health". */
  provider(): "android_health" | "apple_health";
  status(): Promise<{
    connected: boolean;
    granted: HealthType[];
    lastSyncedAt: string | null;
    accessState: "ok" | "access_off" | "error" | null;
  }>;
  /** Shows the system's permission sheet; weight and body fat are left out while recovery-sensitive. */
  connect(opts: { recoverySensitive: boolean }): Promise<{ granted: HealthType[]; refused: HealthType[] }>;
  /** Reads what changed (30 days on the first sync) and saves it through the Database. */
  syncNow(): Promise<{ saved: number; skipped: number; error?: "offline" | "server" | "access_off" }>;
  /** The system's own access screen for Centium (to withdraw a type: apps can't do that themselves). */
  openSettings(): Promise<void>;
  disconnect(opts: { removeSyncedData: boolean }): Promise<void>;
  /** Stops reading weight and body fat at once when the mode turns on. */
  setRecoverySensitive(on: boolean): Promise<void>;
}

// ---- Native push (§3) ----

export type PushPermission = "granted" | "denied" | "prompt";

export interface PushModule {
  available(): Promise<{ ok: boolean }>;
  permission(): Promise<PushPermission>;
  /** Shows the system prompt (Android 13+); only after the person tapped "Turn on". */
  enable(): Promise<PushPermission>;
  /** The phone's notification settings for Centium, for "Off in your phone's settings". */
  openSettings(): Promise<void>;
}

// ---- Camera (§4) ----

export type ScanResult = { code: string; format: string } | { cancelled: true };

export interface CameraModule {
  available(): Promise<{ scan: boolean; readText: boolean; capture: boolean }>;
  scan(opts: { kind: "food" | "pass" }): Promise<ScanResult>;
  /** The front desk: scans pass after pass until `stop`. */
  scanContinuous(onCode: (r: { code: string; format: string }) => void): Promise<{ stop: () => Promise<void> }>;
  /** On-device text reading (Latin script). Pages in reading order, lines joined with "\n". */
  readText(src: { from: "camera" } | { from: "file"; file: Blob }): Promise<{ pages: string[] } | { cancelled: true }>;
  /** A photo taken inside Centium, never saved to the gallery, without EXIF. */
  capturePhoto(opts: { purpose: "progress" }): Promise<{ file: Blob } | { cancelled: true }>;
  /** Blocks screenshots and the Recents preview while a progress-photo screen is open. */
  protectScreen(on: boolean): Promise<void>;
}

// ---- Widgets and shortcuts (§5) ----

export type WidgetSnapshot = {
  language: "en" | "ar";
  /** useHideNumbers(): true while recovery-sensitive mode is on or still unknown. */
  hideNumbers: boolean;
  updatedAt: string;
  steps?: { today: number; goal: number | null };
  water?: { todayMl: number; goalMl: number | null };
  /** The first six of today's habits. */
  habits?: { name: string; done: boolean }[];
  workout?: { title: string; subtitle: string | null } | null;
};

export interface WidgetsModule {
  available(): Promise<{ ok: boolean }>;
  update(snapshot: WidgetSnapshot): Promise<void>;
  clear(): Promise<void>;
}

// ---- Calendar (§6) ----

export type PhoneCalendarEvent = {
  /** The Centium id, so a later sync moves or removes it. */
  id: string;
  /** Already neutral ("Centium booking") when "Hide details on lock screen" is on. */
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  url: string | null;
};

export interface CalendarModule {
  available(): Promise<{ ok: boolean }>;
  status(): Promise<{ enabled: boolean; permission: "granted" | "denied" | "prompt" }>;
  /** Asks for calendar access and makes the phone-only "Centium" calendar. */
  enable(): Promise<{ granted: boolean }>;
  /** Removes the "Centium" calendar and every event in it. */
  disable(): Promise<void>;
  /** Makes the calendar match this list: adds, moves and removes. */
  sync(events: PhoneCalendarEvent[]): Promise<{ added: number; updated: number; removed: number }>;
}

// ---- Sessions that keep running with the screen locked (§7) ----

export type SessionCue = "inhale" | "exhale" | "hold" | "run" | "walk" | "rest" | "bell" | "none";

export type SessionPhase = {
  /** Shown on the lock screen, already translated. */
  label: string;
  /** Null for an open phase (a distance rep): it ends on "Next". */
  seconds: number | null;
  cue: SessionCue;
};

export type SessionTimeline = {
  /** The website's kind, e.g. "box_breathing", "stretching_sequence", "run_intervals". */
  kind: string;
  /** The lock screen's title, already translated. */
  title: string;
  phases: SessionPhase[];
  /** How many times the phases run; 0 is until stopped (breathing). */
  repeat: number;
  /** The website's own key for the screen that started it, e.g. "breathing:box". */
  resultKey: string;
};

/** Where a session is. Times are epoch ms, so a countdown is right after the phone slept. */
export type SessionState = {
  active: boolean;
  paused: boolean;
  kind: string;
  resultKey: string;
  phaseIndex: number;
  /** Rounds finished so far. */
  round: number;
  startedAt: number;
  phaseStartedAt: number;
  /** When the current phase ends; null while paused, for an open phase, or once ended. */
  phaseEndsAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
  endedAt: number | null;
  /** True when it ran to its end; false when it was stopped. */
  completed: boolean;
};

export interface SessionsModule {
  available(): Promise<{ ok: boolean }>;
  start(timeline: SessionTimeline): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  /** Ends the current phase now (an open phase, or skipping ahead). */
  next(): Promise<void>;
  /** Jumps to a phase of the current round (a pose picked from the list). */
  jumpTo(index: number): Promise<void>;
  stop(): Promise<void>;
  /** The running session, or an ended one whose result the website hasn't taken yet. */
  current(): Promise<SessionState | null>;
  /** The result is saved: forget the ended session. */
  clear(): Promise<void>;
  onState(listener: (state: SessionState) => void): Unsubscribe;
}
