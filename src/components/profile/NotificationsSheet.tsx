import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { fetchMessageNotifications, setMessageNotifications } from "../../services/preferences";
import { enablePush, pushSupported } from "../../services/push";

type LocalKey = "mealReminders" | "workoutReminders" | "streakAlerts" | "weeklySummary";

const rows: { key: LocalKey | "messages"; label: string; desc: string }[] = [
  { key: "mealReminders", label: "Meal reminders", desc: "Nudges to log breakfast, lunch, dinner & snacks" },
  { key: "workoutReminders", label: "Workout reminders", desc: "Reminders for your scheduled routines" },
  { key: "streakAlerts", label: "Streak alerts", desc: "When a streak is about to reset" },
  // V9 (QA 9.0): "Notifications should now include notifications for
  // messages" — the label works for Client, Professional and Business alike.
  { key: "messages", label: "Messages", desc: "“New message from …” when someone writes to you. Never the message itself." },
  { key: "weeklySummary", label: "Weekly summary", desc: "A recap of your week every Monday" },
];

// V7 (QA 7.0): "press on notifications to specify what notifications I
// would like to be on" — replaces the single all-or-nothing toggle.
//
// MESSAGES IS THE ONE ROW STORED ON THE SERVER. The message-push trigger reads
// app_preferences.notification_professional_messages (Database
// 20261001060000), so turning it off stops notifications being sent at all,
// on every device. It used to be a switch saved only in this browser that
// nothing read. The other rows are still device settings.
export const NotificationsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { notificationPrefs, updateNotificationPrefs, authUserId } = useApp();
  const [messages, setMessages] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authUserId) return;
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
  }, [open, authUserId]);

  const toggleMessages = async (on: boolean) => {
    if (!authUserId || saving) return;
    setSaving(true);
    setNote(null);
    const before = messages;
    setMessages(on);
    const saved = await setMessageNotifications(authUserId, on);
    if (saved.status !== "ok") {
      setMessages(before);
      setNote(saved.message);
      setSaving(false);
      return;
    }
    updateNotificationPrefs({ professionalMessages: saved.enabled });
    // Turning it on from a tap is the moment to ask this device for
    // permission; without a subscription here nothing can arrive on it.
    if (saved.enabled && pushSupported() && Notification.permission !== "granted") {
      const r = await enablePush(authUserId);
      if (r.status !== "ok") setNote(`${r.message} You'll still see new messages in the app.`);
    }
    setSaving(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      <div className="space-y-4 animate-fade-slide-up">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal">{r.label}</p>
              <p className="text-[11px] text-charcoal-faint">{r.desc}</p>
            </div>
            {r.key === "messages" ? (
              <Toggle
                checked={messages ?? true}
                disabled={messages === null || saving}
                onChange={(v) => void toggleMessages(v)}
                label={r.label}
              />
            ) : (
              <Toggle
                checked={notificationPrefs[r.key]}
                onChange={(v) => updateNotificationPrefs({ [r.key]: v })}
                label={r.label}
              />
            )}
          </div>
        ))}
        {note && <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2">{note}</p>}
      </div>
    </BottomSheet>
  );
};
