import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";

const rows: { key: keyof ReturnType<typeof useApp>["notificationPrefs"]; label: string; desc: string }[] = [
  { key: "mealReminders", label: "Meal reminders", desc: "Nudges to log breakfast, lunch, dinner & snacks" },
  { key: "workoutReminders", label: "Workout reminders", desc: "Reminders for your scheduled routines" },
  { key: "streakAlerts", label: "Streak alerts", desc: "When a streak is about to reset" },
  // V9 (QA 9.0): "Notifications should now include notifications for
  // messages" — generalized so the label makes sense across Client,
  // Professional and Business UI (this sheet is shared by all three).
  { key: "professionalMessages", label: "Messages", desc: "New messages in any of your chats" },
  { key: "weeklySummary", label: "Weekly summary", desc: "A recap of your week every Monday" },
];

// V7 (QA 7.0): "press on notifications to specify what notifications I
// would like to be on" — replaces the single all-or-nothing toggle.
export const NotificationsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { notificationPrefs, updateNotificationPrefs } = useApp();

  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      <div className="space-y-4 animate-fade-slide-up">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">{r.label}</p>
              <p className="text-[11px] text-charcoal-faint">{r.desc}</p>
            </div>
            <Toggle
              checked={notificationPrefs[r.key]}
              onChange={(v) => updateNotificationPrefs({ [r.key]: v })}
              label={r.label}
            />
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};
