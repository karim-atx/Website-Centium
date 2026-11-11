import { isPill, SCHEDULED_METHODS, type Method } from "../../services/contraception/schedule";
import type { CycleSettings } from "../../services/cycle/types";
import { tk } from "../../i18n/core";

/** Settings › Notifications' Health group: its label, and the id Cycle › Settings › Reminders opens at (#health). */
export const HEALTH_GROUP = tk("Health");
export const HEALTH_GROUP_ID = "notifications-health";

// FW (G6, decision D4): what Settings › Notifications' Contraception row
// stands for. Pure, so its rules are tested on their own.
//
// NO NEW COLUMN: the row mirrors the switch the Contraception page shows for
// the active plan, which is the one queue_contraception_reminders() reads for
// it. A pill: pill_reminder (method_reminders sends nothing for a pill). A
// ring, patch, injection, implant or IUD: method_reminders. No plan yet: both,
// so whichever applies once a method is set up starts as the person chose.

export type CycleReminderPatch = Partial<Pick<CycleSettings, "pillReminder" | "methodReminders" | "periodReminder">>;

export function contraceptionSwitch(
  method: Method | null,
  settings: Pick<CycleSettings, "pillReminder" | "methodReminders"> | null
): { shown: boolean; checked: boolean; patch: (on: boolean) => CycleReminderPatch } {
  const s = settings ?? { pillReminder: false, methodReminders: false };
  if (method && isPill(method)) return { shown: true, checked: s.pillReminder, patch: (on) => ({ pillReminder: on }) };
  if (method && SCHEDULED_METHODS.includes(method)) return { shown: true, checked: s.methodReminders, patch: (on) => ({ methodReminders: on }) };
  // Condoms, "something else", none: nothing for either switch to send.
  if (method) return { shown: false, checked: false, patch: () => ({}) };
  return { shown: true, checked: s.pillReminder || s.methodReminders, patch: (on) => ({ pillReminder: on, methodReminders: on }) };
}
