import { useEffect, useState } from "react";
import { Bell, CalendarCheck, Dumbbell, MessagesSquare, Trophy, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Toggle } from "../../components/ui/Toggle";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { fetchMessageNotifications, setMessageNotifications } from "../../services/preferences";
import {
  enablePush,
  isThisDeviceRegistered,
  pushSupported,
  unsubscribeFromPush,
} from "../../services/push";
import { pushUnavailableReason } from "./platform";

// MO1.8.3 Notifications, as a page (was a sheet), on the data that exists
// today (C29).
//
// THE LEAD CARD IS THIS DEVICE. "Allow notifications" is the browser's push
// permission plus this account's push_subscriptions row for this browser:
// on asks the browser (Notification.requestPermission) and registers the
// device; off removes the row, so nothing is sent here any more. While it is
// off every row below is dimmed and disabled (BR-12), Messages included,
// unless the browser has blocked notifications (see messagesDimmed). This used to be the
// Push notifications row's "Allow / Re-check" pill on Settings.
//
// THE ROWS ARE THE ONES WITH DATA, under the board's group names. Messages is
// the one stored on the server (app_preferences.notification_professional_
// messages, read by the message-push trigger); the other four are this
// device's settings, as they were, and nothing sends those reminders yet
// (backlog). Water, Habits, Journal, Community, Calendar events, Memberships,
// Referral rewards and Quiet hours have no column and no sender, so they are
// left out rather than drawn as switches that do nothing.

type LocalKey = "mealReminders" | "workoutReminders" | "streakAlerts" | "weeklySummary";

const GROUPS: { label: string; rows: { key: LocalKey | "messages"; label: string; desc: string; icon: typeof Bell }[] }[] = [
  {
    label: "Reminders",
    rows: [
      { key: "mealReminders", label: "Food logging", desc: "Nudges to log breakfast, lunch, dinner & snacks", icon: UtensilsCrossed },
      { key: "workoutReminders", label: "Workouts", desc: "Reminders for your scheduled routines", icon: Dumbbell },
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
    label: "Professionals",
    rows: [
      // V9 (QA 9.0): the label works for Client, Professional and Business alike.
      { key: "messages", label: "Messages", desc: "“New message from …” when someone writes to you. Never the message itself.", icon: MessagesSquare },
    ],
  },
];

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

  return (
    <div>
      <PageHeader title="Notifications" showBack sub />

      {/* The lead card: primary-pale, as the app's other tinted cards. MO1.8.3:
          radius 20, padding 20, gap 14, a 48 pt tile with Bell 22 / 1.75, the
          title 17 / 600 and the status 13 / 700. */}
      <div className="flex items-center gap-3.5 rounded-[20px] bg-primary-pale p-5 mb-8">
        <span className="w-12 h-12 rounded-2xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0" aria-hidden>
          <Bell size={22} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-charcoal">Allow notifications</p>
          <p className="text-[13px] font-bold text-primary-deep-text mt-px" role="status">
            {deviceLine}
          </p>
        </div>
        <Toggle
          checked={on}
          onChange={(v) => void setDevice(v)}
          disabled={!pushAvailable || busy || registered === null}
          label="Allow notifications on this device"
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
                subtitle={r.desc}
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
                subtitle={r.desc}
                dimmed={dimmed}
                toggle={{
                  checked: notificationPrefs[r.key as LocalKey],
                  onChange: (v) => updateNotificationPrefs({ [r.key]: v }),
                }}
              />
            )
          )}
        </SettingsSection>
      ))}

      {note && <p className="mt-4 text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2">{note}</p>}
    </div>
  );
}
