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
  /**
   * "Sync in the background" (App-Centium ROUND_K.md §2.4, D-EL4): whether this
   * phone's Health Connect can read in the background at all, and whether it
   * does. Off by default.
   */
  background(): Promise<{ available: boolean; on: boolean }>;
  /**
   * Turns it on (asking Health Connect for its background permission, in its
   * own sheet, the first time) or off. "refused": the member said no in that
   * sheet; "unavailable": not on this phone, or not connected.
   */
  setBackground(on: boolean): Promise<HealthBackgroundState>;
}

export type HealthBackgroundState = "on" | "off" | "refused" | "unavailable";

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

/**
 * Why a camera screen closed without a result: the person closed it, chose
 * the screen's way out (`alt`, e.g. "Type it instead"), the camera permission
 * is off ("denied": say where to allow it, openSettings), or there is no
 * usable camera.
 */
export type CameraCancel = { cancelled: true; reason: "closed" | "alt" | "denied" | "unavailable" | "failed" };

export type ScanCode = { code: string; format: string };
export type ScanResult = ScanCode | CameraCancel;

/** The scanner's full-screen words, already translated. */
export type ScanWords = {
  /** What to point at, e.g. "Point the camera at the barcode". */
  prompt: string;
  /** The way out shown as a button, e.g. "Type it instead"; none when omitted. */
  alt?: string;
};

/** A pass's result, shown on the scanner for a moment before the next. */
export type ScanFeedback = { tone: "ok" | "warn" | "error"; title: string; detail?: string };

export interface CameraModule {
  available(): Promise<{ scan: boolean; readText: boolean; capture: boolean }>;
  /** One code. "food": EAN-13/8, UPC-A/E. "pass": a QR code (a member pass, a voucher). */
  scan(opts: { kind: "food" | "pass" } & ScanWords): Promise<ScanResult>;
  /**
   * The front desk: QR pass after pass until closed. Each read waits for
   * `onCode`'s answer, shown on the scanner; `onClosed` says why it closed.
   */
  scanContinuous(opts: ScanWords & {
    onCode: (r: ScanCode) => Promise<ScanFeedback>;
    onClosed: (reason: CameraCancel["reason"]) => void;
  }): Promise<{ stop: () => Promise<void> }>;
  /**
   * On-device text reading (Latin script). One entry per page (a PDF's first
   * six), lines joined with "\n" and kept whole across a table's columns.
   * `pages` limits a PDF to those pages (0-based); the others come back empty.
   */
  readText(file: Blob, opts?: { pages?: number[] }): Promise<{ pages: string[] }>;
  /**
   * Gets the text reader ready before readText (Karim, 2026-11-05): on
   * Android, Google Play services downloads it on first use. Resolves at once
   * when it is already there; `onDownload` (0 to 1) is called only while it
   * downloads. "offline": no network, or the download stalled.
   */
  prepareReader(onDownload?: (fraction: number) => void): Promise<{ ready: boolean; reason?: "offline" | "failed" }>;
  /** A photo taken inside Centium: never saved to the gallery, without EXIF. */
  capturePhoto(opts: { purpose: "progress" | "report" }): Promise<{ file: File } | CameraCancel>;
  /** Blocks screenshots and the Recents preview while a progress-photo screen is open. */
  protectScreen(on: boolean): Promise<void>;
  /** Centium's page in the phone's settings, to allow the camera after "Don't allow". */
  openSettings(): Promise<void>;
}

// ---- Widgets and shortcuts (§5) ----

/**
 * What the widgets show (§5.1). A part left out says "Open Centium to see
 * today" on its widget. The phone hides every figure while `hideNumbers` is
 * true (and when it is missing), and everything once `updatedAt` is from an
 * earlier day.
 */
export type WidgetSnapshot = {
  language: "en" | "ar";
  /** useHideNumbers(): true while recovery-sensitive mode is on or still unknown. */
  hideNumbers: boolean;
  /** When these values were read (ISO). Over 30 minutes old, a widget says "Updated 14:05". */
  updatedAt: string;
  steps?: { today: number; goal: number | null };
  water?: { todayMl: number; goalMl: number | null };
  /** The first six of today's habits; an empty list reads "No habits for today". */
  habits?: { name: string; done: boolean }[];
  /**
   * Today's routine or programme session; null reads "Nothing planned today".
   * `subtitle` is its day ("Week 2 · Day 3"), never volume or kcal; it is
   * left out while `hideNumbers` is on.
   */
  workout?: { title: string; subtitle: string | null } | null;
};

export type WidgetKind = "steps" | "water" | "habits" | "workout";

export interface WidgetsModule {
  available(): Promise<{ ok: boolean }>;
  update(snapshot: WidgetSnapshot): Promise<void>;
  clear(): Promise<void>;
  /**
   * The phone's own "Add to home screen" sheet for one widget, for an "Add
   * widget" button. `ok` is false where the launcher can't do it (then say
   * "Long-press your home screen, then Widgets").
   */
  pin(kind: WidgetKind): Promise<{ ok: boolean }>;
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
  /** Centium's page in the phone's settings, to allow calendar access after "Don't allow". */
  openSettings(): Promise<void>;
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
