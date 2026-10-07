import { useEffect, useState } from "react";
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
import { fetchMessageNotifications, setMessageNotifications } from "../../services/preferences";
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
// THE LEAD CARD IS THIS DEVICE. "Allow notifications" is the browser's push
// permission plus this account's push_subscriptions row for this browser:
// on asks the browser (Notification.requestPermission) and registers the
// device; off removes the row, so nothing is sent here any more. While it is
// off every row below is dimmed and disabled (BR-12), Messages included,
// unless the browser has blocked notifications (see messagesDimmed). This used to be the
// Push notifications row's "Allow / Re-check" pill on Settings.
//
// ONE ROW IS STORED ON THE SERVER: Messages (app_preferences.notification_
// professional_messages, read by the message-push trigger). Every other row,
// and Quiet hours with its From / To, is this device's setting
// (notificationPrefs), and nothing sends those reminders yet: they need
// preference columns and senders (backlog). Quiet hours starts off for that
// reason, so it never promises a silence the message push would break.
//
// As drawn, the rows carry no subtitles; what each switch does is read to
// screen readers instead.

type Prefs = ReturnType<typeof useApp>["notificationPrefs"];
type LocalKey = Exclude<keyof Prefs, "professionalMessages" | "quietHours" | "quietFrom" | "quietTo">;

type Row = { key: LocalKey | "messages"; label: string; desc: string; icon: typeof Bell };

// MO1.8.3's groups, rows, order and glyphs (all 17 / 1.75).
const GROUPS: { label: string; rows: Row[] }[] = [
  {
    label: "Reminders",
    rows: [
      { key: "mealReminders", label: "Food logging", desc: "Nudges to log breakfast, lunch, dinner & snacks", icon: UtensilsCrossed },
      { key: "workoutReminders", label: "Workouts", desc: "Reminders for your scheduled routines", icon: Dumbbell },
      { key: "waterReminders", label: "Water", desc: "Reminders to log your water", icon: GlassWater },
      { key: "habitReminders", label: "Habits", desc: "Reminders for today's habits", icon: ListChecks },
      { key: "journalReminders", label: "Journal", desc: "A nudge to write in your journal", icon: NotebookPen },
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
      { key: "forumMentions", label: "Mentions", desc: "When someone mentions you in the forum", icon: AtSign },
    ],
  },
  {
    label: "Professionals",
    rows: [
      // V9 (QA 9.0): the label works for Client, Professional and Business alike.
      { key: "messages", label: "Messages", desc: "“New message from …” when someone writes to you. Never the message itself.", icon: MessagesSquare },
      { key: "calendarEvents", label: "Calendar events", desc: "Reminders for events in your calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Account",
    rows: [
      { key: "membershipUpdates", label: "Memberships", desc: "Updates about your gym and studio memberships", icon: Store },
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
 * AM/PM, then a full-width Done); the wheel updates as it turns.
 */
function TimeRow({
  label,
  value,
  open,
  onToggle,
  onChange,
  dimmed,
  divider,
}: {
  label: string;
  divider: boolean;
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (hhmm: string) => void;
  dimmed: boolean;
}) {
  const parts = toParts(value);
  const set = (p: Partial<typeof parts>) => onChange(fromParts({ ...parts, ...p }));
  return (
    <div inert={dimmed || undefined} aria-disabled={dimmed || undefined} className={clsx("relative", dimmed && "opacity-40")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${label}, ${value}`}
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
          <span className="text-[14px] font-bold tabular-nums text-primary-accent">{value}</span>
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

export default function NotificationsPage() {
  const { notificationPrefs, updateNotificationPrefs, authUserId } = useApp();

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
  const on = pushAvailable && permission === "granted" && registered === true;

  const setDevice = async (next: boolean) => {
    if (busy || !pushAvailable) return;
    setBusy(true);
    setPushNote(null);
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
    setBusy(false);
  };

  const deviceLine = !pushAvailable
    ? pushUnavailableReason()
    : busy
    ? "Registering this device…"
    : pushNote
    ? pushNote
    : on
    ? "On"
    : permission === "denied"
    ? "Blocked in browser settings"
    : "Off";

  // Dimmed only where the switch could be turned on. On a browser that can't
  // receive push at all, dimming would trap the account-wide Messages setting
  // behind a switch that can never move.
  const dimmed = pushAvailable && !on;
  // Messages dims with the others (MO1.8.3, BR-12 "every row dims"), except
  // where the browser has blocked notifications: the switch above can't turn
  // on from the app then, and dimming would lock the account-wide Messages
  // setting (which applies on every device) out of reach on this one.
  const messagesDimmed = dimmed && permission !== "denied";

  // --- Messages: the one server-backed row -----------------------------------
  const [messages, setMessages] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMessageNotifications().then((r) => {
      if (cancelled) return;
      if (r.status === "ok") {
        setMessages(r.enabled);
        setNote(null);
      } else setNote(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const toggleMessages = async (value: boolean) => {
    if (!authUserId || saving) return;
    setSaving(true);
    setNote(null);
    const before = messages;
    setMessages(value);
    const saved = await setMessageNotifications(authUserId, value);
    if (saved.status !== "ok") {
      setMessages(before);
      setNote(saved.message);
      setSaving(false);
      return;
    }
    updateNotificationPrefs({ professionalMessages: saved.enabled });
    // Turning it on from a tap is the moment to ask this device for
    // permission; without a subscription here nothing can arrive on it. As the
    // old Notifications sheet did, unchanged; the lead card then reflects it.
    if (saved.enabled && pushSupported() && Notification.permission !== "granted") {
      const r = await enablePush(authUserId);
      if (r.status !== "ok") setNote(`${r.message} You'll still see new messages in the app.`);
      setRegistered(await isThisDeviceRegistered());
    }
    setSaving(false);
  };

  // --- Quiet hours: one wheel open at a time ---------------------------------
  const [wheel, setWheel] = useState<"from" | "to" | null>(null);
  const quietOff = dimmed || !notificationPrefs.quietHours;

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
      <div className="flex items-center gap-3.5 rounded-[20px] bg-th-9a8cd6/[0.12] dark:bg-primary-pale p-5 mb-8">
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
          onChange={(v) => void setDevice(v)}
          disabled={!pushAvailable || busy || registered === null}
          label="Allow notifications on this device"
          // MO1.8.3's lead switch, drawn larger than the rows' (decision 23).
          lead
        />
      </div>

      {GROUPS.map((g) => (
        <SettingsSection key={g.label} label={g.label}>
          {g.rows.map((r) =>
            r.key === "messages" ? (
              <SettingsRow
                key={r.key}
                icon={r.icon}
                title={r.label}
                srDescription={r.desc}
                // The account's setting, saved on the server for every device.
                dimmed={messagesDimmed}
                toggle={{
                  checked: messages ?? true,
                  disabled: messages === null || saving,
                  onChange: (v) => void toggleMessages(v),
                }}
              />
            ) : (
              <SettingsRow
                key={r.key}
                icon={r.icon}
                title={r.label}
                srDescription={r.desc}
                dimmed={dimmed}
                toggle={{
                  checked: notificationPrefs[r.key as LocalKey],
                  onChange: (v) => updateNotificationPrefs({ [r.key]: v }),
                }}
              />
            )
          )}
          {/* Inline error line in danger under the group it belongs to
              (MO1.8.3 states: "Error ... under the affected element"). */}
          {g.label === "Professionals" && note && (
            <p role="alert" className="mt-2 text-[12px] text-status-high">
              {note}
            </p>
          )}
        </SettingsSection>
      ))}

      <SettingsSection label="Quiet hours">
        <SettingsRow
          icon={Moon}
          title="Quiet hours"
          srDescription="No reminders between these times"
          dimmed={dimmed}
          toggle={{
            checked: notificationPrefs.quietHours,
            onChange: (v) => {
              if (!v) setWheel(null);
              updateNotificationPrefs({ quietHours: v });
            },
          }}
        />
        <TimeRow
          label="From"
          value={notificationPrefs.quietFrom}
          open={wheel === "from" && !quietOff}
          onToggle={() => setWheel((w) => (w === "from" ? null : "from"))}
          onChange={(v) => updateNotificationPrefs({ quietFrom: v })}
          dimmed={quietOff}
          divider
        />
        <TimeRow
          label="To"
          value={notificationPrefs.quietTo}
          open={wheel === "to" && !quietOff}
          onToggle={() => setWheel((w) => (w === "to" ? null : "to"))}
          onChange={(v) => updateNotificationPrefs({ quietTo: v })}
          dimmed={quietOff}
          divider={false}
        />
      </SettingsSection>
      </SettingsBody>
    </div>
  );
}
