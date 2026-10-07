import { useEffect, useState, type ReactNode } from "react";
import {
  AtSign,
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  Dumbbell,
  Gift,
  GlassWater,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Moon,
  NotebookPen,
  Store,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "../../components/ui/PageHeader";
import { Toggle } from "../../components/ui/Toggle";
import { Button } from "../../components/ui/Button";
import { WheelPicker } from "../../components/ui/WheelPicker";
import { SettingsBody, SettingsRow, SettingsSection, settingsRowClass } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import {
  describeQuietWindow,
  fetchNotificationPrefs,
  SAME_QUIET_TIME_MESSAGE,
  sameQuietTime,
  saveNotificationPrefs,
  wrapsMidnight,
  type NotificationPrefKey,
  type NotificationPrefs,
  type NotificationToggleKey,
} from "../../services/preferences";
import {
  enablePush,
  isThisDeviceRegistered,
  pushSupported,
  unsubscribeFromPush,
} from "../../services/push";
import { fromParts, minuteOptions, toParts, type Meridiem } from "../../components/calendar/calendarTime";
import { pushUnavailableReason } from "./platform";

// MO1.8.3 Notifications, as a page (was a sheet); handover-complete pass:
// every group and row the frame draws, Quiet hours included.
//
// EVERY ROW IS THE ACCOUNT'S, ON THE SERVER (Stage A2): one app_preferences
// column per switch, quiet hours as three (services/preferences/
// notifications.ts has the map). They apply on every device and the server
// enforces them all in should_notify(). The values shown are the row's own:
// nothing is shown until it has loaded (switches disabled), a failed load says
// so with Try again, and the defaults are the database's, never this file's.
//
// THE LEAD CARD IS TWO THINGS, and the switch is on only when both are:
//   1. notification_allow, the account's master (BR-12). Off, the server sends
//      nothing at all, on any device.
//   2. This browser: its push permission plus this account's
//      push_subscriptions row for it (unchanged from before A2).
// Turning it ON writes notification_allow = true (if it was off), then asks
// the browser (enablePush: the OS prompt) and registers the device. Turning it
// OFF writes notification_allow = false, then removes this device's row, as
// before. A failed column write stops there with its message in the status
// line; a failed push step leaves the column as written (it is the account's
// choice, for every device) and shows the push message. On a browser that
// cannot receive push at all, the switch is the column alone.
//
// BR-12 dimming, as before: every row dims while the switch is off, except
// Messages when the browser has blocked notifications (see messagesDimmed).
// With notification_allow off, Messages dims too: the server sends nothing.
//
// A failed save puts the switch back and shows the inline danger line under
// the group it belongs to (K1).
//
// As drawn, the rows carry no subtitles; what each switch does is read to
// screen readers instead.

type Row = { key: NotificationToggleKey; label: string; desc: string; icon: typeof Bell };
type Group = { label: string; rows: Row[] };

const QUIET = "Quiet hours";

// MO1.8.3's groups, rows, order and glyphs (all 17 / 1.75).
const GROUPS: Group[] = [
  {
    label: "Reminders",
    rows: [
      { key: "mealReminders", label: "Food logging", desc: "Nudges to log breakfast, lunch, dinner & snacks", icon: UtensilsCrossed },
      { key: "workoutReminders", label: "Workouts", desc: "Reminders for your scheduled routines", icon: Dumbbell },
      { key: "water", label: "Water", desc: "Reminders to log your water", icon: GlassWater },
      { key: "habits", label: "Habits", desc: "Reminders for today's habits", icon: ListChecks },
      { key: "journal", label: "Journal", desc: "A nudge to write in your journal", icon: NotebookPen },
    ],
  },
  {
    label: "Progress",
    rows: [
      { key: "streakAlerts", label: "Streaks and achievements", desc: "When a streak is about to reset", icon: Trophy },
      { key: "weeklySummary", label: "Weekly summary", desc: "A recap of your week every Monday", icon: CalendarCheck },
    ],
  },
  {
    label: "Community",
    rows: [
      { key: "forumReplies", label: "Replies to my posts", desc: "When someone replies to your forum posts", icon: MessageCircle },
      { key: "mentions", label: "Mentions", desc: "When someone mentions you in the forum", icon: AtSign },
    ],
  },
  {
    label: "Professionals",
    rows: [
      // V9 (QA 9.0): the label works for Client, Professional and Business alike.
      { key: "professionalMessages", label: "Messages", desc: "“New message from …” when someone writes to you. Never the message itself.", icon: MessagesSquare },
      { key: "calendarEvents", label: "Calendar events", desc: "Reminders for events in your calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Account",
    rows: [
      { key: "memberships", label: "Memberships", desc: "Updates about your gym and studio memberships", icon: Store },
      { key: "referralRewards", label: "Referral rewards", desc: "When a referral earns you a reward", icon: Gift },
    ],
  },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];

/**
 * MO1.8.3 From / To: the label on the left, the time on the right in
 * 14 / 700 primary.accent with a ChevronDown 16 / 1.75 in the muted grey, 6
 * apart (measured on the 2x board). A tap opens the inline wheel under the
 * row (Foundations "Inline wheel picker": hour, minute in 5-minute steps,
 * AM/PM, then a full-width Done); the wheel updates the shown time as it
 * turns, and the time is saved when the wheel closes.
 */
function TimeRow({
  label,
  value,
  spoken,
  open,
  onToggle,
  onChange,
  dimmed,
  divider,
}: {
  label: string;
  divider: boolean;
  /** "HH:MM", or null before the row has loaded. */
  value: string | null;
  /** Read after the time, e.g. "the next morning" for a window past midnight. */
  spoken?: string;
  open: boolean;
  onToggle: () => void;
  onChange: (hhmm: string) => void;
  dimmed: boolean;
}) {
  const parts = toParts(value ?? "");
  const set = (p: Partial<typeof parts>) => onChange(fromParts({ ...parts, ...p }));
  return (
    <div inert={dimmed || undefined} aria-disabled={dimmed || undefined} className={clsx("relative", dimmed && "opacity-40")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={value === null}
        aria-expanded={open}
        aria-label={value === null ? label : `${label}, ${value}${spoken ? `, ${spoken}` : ""}`}
        // The row sits alone in its wrapper, so the shared last-row rule
        // would hide every divider: From keeps its own, To (the section's
        // last row) has none, and an open wheel hides it.
        className={clsx("tap", settingsRowClass, open ? "before:!hidden" : divider && "before:!block")}
      >
        <span aria-hidden className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-th-f0edf9 text-primary-accent dark:bg-th-aea1dc/[0.14]">
          <Clock size={17} strokeWidth={1.75} />
        </span>
        <span className="flex-1 min-w-0 text-[14px] font-semibold leading-5 text-charcoal">{label}</span>
        <span className="shrink-0 flex items-center gap-1.5">
          <span className="text-[14px] font-bold tabular-nums text-primary-accent">{value ?? "--:--"}</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className={clsx("text-charcoal-faint transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open && (
        <div className="pb-3 ps-[50px]">
          <WheelPicker
            columns={[
              {
                label: "Hours",
                value: parts.hour,
                options: HOURS.map((h) => ({ value: h, label: String(h) })),
                onChange: (v) => set({ hour: Number(v) }),
              },
              {
                label: "Minutes",
                value: parts.minute,
                options: minuteOptions(parts.minute).map((m) => ({ value: m, label: String(m).padStart(2, "0") })),
                onChange: (v) => set({ minute: Number(v) }),
              },
              {
                label: "AM or PM",
                value: parts.meridiem,
                options: MERIDIEMS.map((m) => ({ value: m, label: m })),
                onChange: (v) => set({ meridiem: v as Meridiem }),
              },
            ]}
          />
          <Button fullWidth onClick={onToggle} className="mt-3 h-12 rounded-[14px] text-[15px]">
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

/** Inline error line in danger under the group it belongs to (MO1.8.3 states, K1). */
function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-[12px] text-status-high">
      {children}
    </p>
  );
}

export default function NotificationsPage() {
  const { authUserId } = useApp();

  // --- the account's values (app_preferences) --------------------------------
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState<ReadonlySet<NotificationPrefKey>>(new Set());
  // The K1 line, per group (the master's goes in its status line instead).
  const [notes, setNotes] = useState<Record<string, string>>({});
  const setNote = (group: string, message: string | null) =>
    setNotes((n) => {
      const next = { ...n };
      if (message) next[group] = message;
      else delete next[group];
      return next;
    });

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchNotificationPrefs(authUserId).then((r) => {
      if (cancelled) return;
      if (r.status === "ok") setPrefs(r.prefs);
      else setLoadError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, loadAttempt]);

  /**
   * Shows the change at once, saves only its columns, and on failure puts
   * the old values back. Returns the error sentence, or null when saved.
   */
  const save = async (patch: Partial<NotificationPrefs>): Promise<string | null> => {
    if (!authUserId || !prefs) return "Your settings haven't loaded yet.";
    const keys = Object.keys(patch) as NotificationPrefKey[];
    const before: Partial<NotificationPrefs> = {};
    for (const k of keys) Object.assign(before, { [k]: prefs[k] });
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    setSaving((s) => new Set([...s, ...keys]));
    const r = await saveNotificationPrefs(authUserId, patch);
    setSaving((s) => new Set([...s].filter((k) => !keys.includes(k))));
    if (r.status === "ok") {
      // Only this save's columns: another row may be mid-save.
      const saved: Partial<NotificationPrefs> = {};
      for (const k of keys) Object.assign(saved, { [k]: r.prefs[k] });
      setPrefs((p) => (p ? { ...p, ...saved } : p));
      return null;
    }
    setPrefs((p) => (p ? { ...p, ...before } : p));
    return r.message;
  };

  // --- the device: permission + registration --------------------------------
  const [pushAvailable] = useState(pushSupported);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushNote, setPushNote] = useState<string | null>(null);

  useEffect(() => {
    if (!pushAvailable) return;
    let cancelled = false;
    void isThisDeviceRegistered().then((r) => {
      if (!cancelled) setRegistered(r);
    });
    return () => {
      cancelled = true;
    };
  }, [pushAvailable]);

  const permission = pushAvailable ? Notification.permission : "denied";
  const deviceOn = pushAvailable && permission === "granted" && registered === true;
  const allow = prefs?.allow ?? null;
  // The lead switch: the account's master AND (where push exists) this device.
  const on = allow === true && (!pushAvailable || deviceOn);

  const setMaster = async (next: boolean) => {
    if (busy || !prefs) return;
    setBusy(true);
    setPushNote(null);
    if (prefs.allow !== next) {
      const failed = await save({ allow: next });
      if (failed) {
        setPushNote(failed);
        setBusy(false);
        return;
      }
    }
    if (pushAvailable) {
      if (next) {
        // Two steps that fail differently: the OS answer, then this device's
        // row. A granted permission with a failed registration is its own
        // message rather than a silent "On" that never rings.
        const r = await enablePush(authUserId);
        if (r.status !== "ok") setPushNote(r.message);
      } else {
        const r = await unsubscribeFromPush();
        if (r.status !== "ok") setPushNote(r.message);
      }
      setRegistered(await isThisDeviceRegistered());
    }
    setBusy(false);
  };

  const deviceLine = !prefs
    ? loadError
      ? "Couldn't load"
      : "Loading…"
    : busy
    ? pushAvailable
      ? "Registering this device…"
      : "Saving…"
    : pushNote
    ? pushNote
    : !prefs.allow
    ? "Off"
    : !pushAvailable
    ? pushUnavailableReason()
    : deviceOn
    ? "On"
    : permission === "denied"
    ? "Blocked in browser settings"
    : "Off";

  // BR-12. The master off on the account dims everything. Otherwise dimmed
  // only where this device's switch could be turned on: on a browser that
  // can't receive push at all, dimming would trap the account-wide settings
  // behind a switch that can never move.
  const deviceDim = pushAvailable && !deviceOn;
  const dimmed = allow === false || deviceDim;
  // Messages dims with the others (MO1.8.3, BR-12 "every row dims"), except
  // where the browser has blocked notifications: the switch above can't turn
  // on from the app then, and dimming would lock the account-wide Messages
  // setting (which applies on every device) out of reach on this one.
  const messagesDimmed = allow === false || (deviceDim && permission !== "denied");

  const toggleRow = async (group: string, key: NotificationToggleKey, value: boolean) => {
    setNote(group, null);
    const failed = await save({ [key]: value });
    if (failed) {
      setNote(group, failed);
      return;
    }
    // Messages: turning it on from a tap is the moment to ask this device for
    // permission; without a subscription here nothing can arrive on it. As
    // the old Notifications sheet did, unchanged; the lead card then
    // reflects it.
    if (key === "professionalMessages" && value && pushSupported() && Notification.permission !== "granted") {
      const r = await enablePush(authUserId);
      if (r.status !== "ok") setNote(group, `${r.message} You'll still see new messages in the app.`);
      setRegistered(await isThisDeviceRegistered());
    }
  };

  // --- Quiet hours: one wheel open at a time, saved when it closes -----------
  const [wheel, setWheel] = useState<"from" | "to" | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const quietOff = dimmed || !prefs?.quietHoursEnabled;
  const wheelKey = (end: "from" | "to") => (end === "from" ? "quietHoursFrom" : "quietHoursTo");

  /** Closes the open wheel, saving its time. False when refused (From = To). */
  const commitWheel = async (): Promise<boolean> => {
    if (!wheel || !prefs || draft === null) {
      setWheel(null);
      setDraft(null);
      return true;
    }
    const key = wheelKey(wheel);
    const other = wheel === "from" ? prefs.quietHoursTo : prefs.quietHoursFrom;
    if (draft === prefs[key]) {
      setWheel(null);
      setDraft(null);
      return true;
    }
    // app_preferences_quiet_hours_check: from <> to. Refused here, the wheel
    // stays open so it can be turned again.
    if (sameQuietTime(draft, other)) {
      setNote(QUIET, SAME_QUIET_TIME_MESSAGE);
      return false;
    }
    setWheel(null);
    setDraft(null);
    setNote(QUIET, null);
    const failed = await save({ [key]: draft });
    if (failed) setNote(QUIET, failed);
    return true;
  };

  const toggleWheel = async (end: "from" | "to") => {
    if (!prefs) return;
    if (wheel === end) {
      await commitWheel();
      return;
    }
    if (wheel && !(await commitWheel())) return;
    setWheel(end);
    setDraft(prefs[wheelKey(end)]);
  };

  const shown = (end: "from" | "to") => (wheel === end && draft !== null ? draft : prefs ? prefs[wheelKey(end)] : null);
  const from = shown("from");
  const to = shown("to");
  const wraps = from !== null && to !== null && wrapsMidnight(from, to);

  return (
    <div>
      {/* MO1.8.3 draws the 27 / 700 title on a 40 line, gap 6 (as Settings). */}
      <PageHeader title="Notifications" showBack tightBack />

      {/* MO1.8.3: 24 pt side insets; the lead card 14 under the title (79). */}
      <SettingsBody className="-mt-1.5">
      {/* The lead card, new since the redesign, so the handover's own light
          colours (decision 22): rgba(154,140,214,0.12) (measured #F3F1FA), a
          #9A8CD6 tile and the status in #7D67D9. MO1.8.3: radius 20, padding
          20, gap 14, a 48 pt tile with Bell 22 / 1.75, the title 17 / 600 and
          the status 13 / 700. */}
      <div className={clsx("flex items-center gap-3.5 rounded-[20px] bg-th-9a8cd6/[0.12] dark:bg-primary-pale p-5", loadError ? "mb-3" : "mb-8")}>
        <span className="w-12 h-12 rounded-2xl bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill flex items-center justify-center shrink-0" aria-hidden>
          <Bell size={22} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-charcoal">Allow notifications</p>
          <p className="text-[13px] font-bold text-primary-accent mt-px" role="status">
            {deviceLine}
          </p>
        </div>
        <Toggle
          checked={on}
          onChange={(v) => void setMaster(v)}
          disabled={!prefs || busy || (pushAvailable && registered === null)}
          label="Allow notifications"
          // MO1.8.3's lead switch, drawn larger than the rows' (decision 23).
          lead
        />
      </div>
      {loadError && (
        <div className="mb-8">
          <ErrorLine>
            {loadError}{" "}
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setLoadAttempt((n) => n + 1);
              }}
              className="tap font-semibold underline"
            >
              Try again
            </button>
          </ErrorLine>
        </div>
      )}

      {GROUPS.map((g) => (
        <SettingsSection key={g.label} label={g.label}>
          {g.rows.map((r) => (
            <SettingsRow
              key={r.key}
              icon={r.icon}
              title={r.label}
              srDescription={r.desc}
              dimmed={r.key === "professionalMessages" ? messagesDimmed : dimmed}
              toggle={{
                // Off and disabled until the row has loaded: never a guess.
                checked: prefs?.[r.key] ?? false,
                disabled: !prefs || saving.has(r.key),
                onChange: (v) => void toggleRow(g.label, r.key, v),
              }}
            />
          ))}
          {notes[g.label] && <ErrorLine>{notes[g.label]}</ErrorLine>}
        </SettingsSection>
      ))}

      <SettingsSection label={QUIET}>
        <SettingsRow
          icon={Moon}
          title={QUIET}
          // The window as the server reads it: in this person's timezone,
          // wrapping midnight when From is later than To (the normal case),
          // and suppressed rather than delivered at the end.
          srDescription={from !== null && to !== null ? describeQuietWindow(from, to) : undefined}
          dimmed={dimmed}
          toggle={{
            checked: prefs?.quietHoursEnabled ?? false,
            disabled: !prefs || saving.has("quietHoursEnabled"),
            onChange: (v) => {
              if (!v) {
                setWheel(null);
                setDraft(null);
              }
              setNote(QUIET, null);
              void save({ quietHoursEnabled: v }).then((failed) => failed && setNote(QUIET, failed));
            },
          }}
        />
        <TimeRow
          label="From"
          value={from}
          open={wheel === "from" && !quietOff}
          onToggle={() => void toggleWheel("from")}
          onChange={(v) => {
            setDraft(v);
            setNote(QUIET, null);
          }}
          dimmed={quietOff}
          divider
        />
        <TimeRow
          label="To"
          value={to}
          spoken={wraps ? "the next morning" : undefined}
          open={wheel === "to" && !quietOff}
          onToggle={() => void toggleWheel("to")}
          onChange={(v) => {
            setDraft(v);
            setNote(QUIET, null);
          }}
          dimmed={quietOff}
          divider={false}
        />
        {notes[QUIET] && <ErrorLine>{notes[QUIET]}</ErrorLine>}
      </SettingsSection>
      </SettingsBody>
    </div>
  );
}
