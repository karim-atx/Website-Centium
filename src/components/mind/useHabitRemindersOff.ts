import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchNotificationPrefs } from "../../services/preferences";
import { habitRemindersOff, type HabitRemindersOff } from "../../services/habits/reminder";

/**
 * Why a habit reminder would not arrive, read once from MO1.8.3's switches
 * while `enabled` (the panel is open and the field shown). Null until read,
 * and on a failed read: the hint never guesses.
 */
export function useHabitRemindersOff(enabled: boolean): HabitRemindersOff {
  const { authUserId } = useApp();
  const [off, setOff] = useState<HabitRemindersOff>(null);
  useEffect(() => {
    if (!enabled || !authUserId) return;
    let live = true;
    void fetchNotificationPrefs(authUserId).then((r) => {
      if (live && r.status === "ok") setOff(habitRemindersOff(r.prefs));
    });
    return () => {
      live = false;
    };
  }, [enabled, authUserId]);
  return off;
}
