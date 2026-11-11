import React, { useState, type ReactNode } from "react";
import { CalendarClock, Pill, Tablets } from "lucide-react";
import { SettingsRow, SettingsSection } from "../ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { isPill } from "../../services/contraception/schedule";
import * as CG from "../../services/contraception/guidance";
import * as YG from "../../services/cycle/guidance";
import type { CycleSettings } from "../../services/cycle/types";
import { contraceptionSwitch, HEALTH_GROUP, HEALTH_GROUP_ID, type CycleReminderPatch } from "./healthNotificationModel";
import { time12 } from "../../utils/time12";
import { t } from "../../i18n/core";

// FW (G6, decision D4): the health reminders, in Settings at last.
//
// ONE SOURCE OF TRUTH. Contraception and Period read and write the cycle
// pages' OWN switches (cycle_settings.pill_reminder / method_reminders /
// period_reminder; healthNotificationModel says which): no new column, so the
// Contraception page, Cycle › Settings and these rows always agree.
// Medications is the account-wide master over every medication's own
// notify_enabled (app_preferences.notification_medications, which had no
// switch), saved by the page with its other app_preferences rows.
//
// WHO SEES WHAT (MO11): Contraception and Period only where the cycle
// features are offered (AppContext cycleOffered: female or other, or a
// profile that opted in), and Contraception not for a method with nothing to
// remind about. The page leaves the whole group out for business accounts.
//
// A switch turned ON from a device that can't receive push asks for it first
// (the page's askDevice, from the tap), then saves either way: the setting is
// the account's and another device may be registered. The lead card says
// what this device gets.

export const HealthNotificationGroup: React.FC<{
  dimmed: boolean;
  /** notification_medications, from the page's app_preferences row. */
  medications: { checked: boolean; disabled: boolean; onChange: (on: boolean) => void };
  /** Raises the push prompt when this device can't receive push; the error sentence, or null. */
  askDevice: () => Promise<string | null>;
  /** Sets (or clears) the page's error line for this group. */
  setNote: (message: string | null) => void;
  /** The page's error line, after the rows. */
  children?: ReactNode;
}> = ({ dimmed, medications, askDevice, setNote, children }) => {
  const { cycleOffered, cycleSettings, cycleSettingsLoaded, contraceptionPlan, contraceptionPlanLoaded, saveCycleSettingsAndReload } = useApp();
  const [saving, setSaving] = useState(false);
  // Shown at once and kept until the settings are read again (a new object),
  // or put back on failure: the page's rule for its own rows.
  const [shownAhead, setShownAhead] = useState<{ over: CycleSettings | null; patch: CycleReminderPatch } | null>(null);
  const settings: CycleSettings | null =
    cycleSettings && shownAhead && shownAhead.over === cycleSettings ? { ...cycleSettings, ...shownAhead.patch } : cycleSettings;

  const method = contraceptionPlan?.method ?? null;
  const contraception = contraceptionSwitch(method, settings);
  const pill = !!method && isPill(method);

  const saveCycle = async (patch: CycleReminderPatch, on: boolean) => {
    if (saving || Object.keys(patch).length === 0) return;
    setNote(null);
    setSaving(true);
    setShownAhead({ over: cycleSettings, patch });
    const device = on ? await askDevice() : null;
    const r = await saveCycleSettingsAndReload(patch);
    setSaving(false);
    if (!r.ok) {
      setShownAhead(null);
      setNote(r.message ?? CG.SAVE_FAILED);
    } else if (device) setNote(device);
  };

  const pillTime = pill ? (contraceptionPlan?.reminderTime ?? "").slice(0, 5) : "";
  const contraceptionSub = !contraceptionPlanLoaded
    ? undefined
    : !method
      ? t("Set up your method on the Contraception page")
      : pill
        ? pillTime
          ? t("Daily at {time}", { time: time12(pillTime) })
          : t("No reminder time set")
        : undefined;

  return (
    <SettingsSection id={HEALTH_GROUP_ID} label={t(HEALTH_GROUP)} className="scroll-mt-24">
      {cycleOffered && contraception.shown && (
        <SettingsRow
          icon={Pill}
          title={t("Contraception")}
          subtitle={contraceptionSub}
          srDescription={pill ? t(CG.PILL_REMINDER_HELP) : t(CG.METHOD_REMINDER_HELP)}
          dimmed={dimmed}
          toggle={{
            checked: contraception.checked,
            disabled: !cycleSettingsLoaded || !contraceptionPlanLoaded || saving,
            onChange: (v) => void saveCycle(contraception.patch(v), v),
          }}
        />
      )}
      {cycleOffered && (
        <SettingsRow
          icon={CalendarClock}
          title={t(YG.PERIOD_REMINDER_TITLE)}
          // queue_period_reminders needs the tracker on: say so rather than
          // show a switch that sends nothing.
          subtitle={
            !settings
              ? undefined
              : !settings.trackerEnabled
                ? t("Needs cycle tracking on")
                : settings.periodReminder
                  ? YG.PERIOD_REMINDER_DAYS_OPTION(settings.periodReminderDays)
                  : undefined
          }
          srDescription={t(YG.PERIOD_REMINDER_SUB)}
          dimmed={dimmed}
          toggle={{
            checked: settings?.periodReminder ?? false,
            disabled: !cycleSettingsLoaded || saving,
            onChange: (v) => void saveCycle({ periodReminder: v }, v),
          }}
        />
      )}
      <SettingsRow
        icon={Tablets}
        title={t("Medications")}
        srDescription={t("Reminders at the dose times you set for each medication. They never name the medicine.")}
        dimmed={dimmed}
        toggle={medications}
      />
      {children}
    </SettingsSection>
  );
};
