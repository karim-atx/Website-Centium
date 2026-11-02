import React, { useState } from "react";
import { Bell, BellOff, CalendarClock, Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { isPill, updatePlan, type ContraceptionPlan } from "../../services/contraception";
import type { NotificationDetail } from "../../services/cycle/types";
import { enablePush, permissionTriState, pushSupported } from "../../services/push";
import * as G from "../../services/contraception/guidance";
import { time12 } from "../../utils/time12";
import { TimeWheel } from "../health/log/LogSheetParts";
import { CycleHelp, CycleRow, CycleSection, OptionButton, type } from "../cycle/cycleUi";
import { t } from "../../i18n/core";

// Reminders (HE1.10.b.2 #25-#46): what is sent, when, and how much it says.
//
// THE SWITCHES AND THE DETAIL LEVEL LIVE ON cycle_settings; the TIME lives on
// the plan, as `reminder_time`, because it is a property of the pack rather
// than of the account. WHICH IS WHY THE PILL ROW AND THE TIME ARE HIDDEN FOR
// EVERY OTHER METHOD: reminder_time is a pill-only column
// (contraception_plans_schedule_shape_check).
//
// A SWITCH WITHOUT PUSH IS A SWITCH THAT DOES NOTHING: queue_contraception_
// reminders() sends an id-only push, so with no permission nothing arrives.
// The switches are disabled until push is on, and the prompt is raised by
// services/push's enablePush from a real button press (K2, the repo
// PUSH_NEEDED line and "Turn on notifications").
//
// NEUTRAL IS THE DEFAULT AND IT IS EXPLAINED RATHER THAN ASSUMED: the help
// line says exactly what each option puts on a lock screen.
//
// The reminder time is 12-hour (X-14) and opens an inline wheel (S5).
// Quiet hours for these reminders are backend B4 (V6-22): not built here.

const DETAILS: readonly NotificationDetail[] = ["neutral", "detailed"];

const parseTime = (t: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return m ? { h: Number(m[1]), m: Number(m[2]) } : { h: 21, m: 0 };
};
const pad = (n: number) => String(n).padStart(2, "0");

export const ReminderSettings: React.FC<{ plan: ContraceptionPlan; onError?: (message: string) => void }> = ({ plan, onError }) => {
  const { authUserId, cycleSettings, saveCycleSettingsAndReload, reloadContraception } = useApp();
  const [busy, setBusy] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(() => parseTime(plan.reminderTime));

  const [supported] = useState(pushSupported);
  const [pushAllowed, setPushAllowed] = useState<boolean | null>(() => (pushSupported() ? permissionTriState(Notification.permission) : null));
  const [pushError, setPushError] = useState<string | null>(null);

  // No settings row yet means nothing to switch.
  if (!cycleSettings) return null;

  const fail = (m?: string | null) => onError?.(m ?? G.SAVE_FAILED);

  const save = async (patch: Parameters<typeof saveCycleSettingsAndReload>[0]) => {
    setBusy(true);
    const result = await saveCycleSettingsAndReload(patch);
    setBusy(false);
    if (!result.ok) fail(result.message);
  };

  const saveTime = async (value: string) => {
    setBusy(true);
    const result = await updatePlan(plan.id, { ...plan, reminderTime: value || null });
    setBusy(false);
    if (!result.ok) {
      fail(result.message);
      return;
    }
    reloadContraception();
  };

  const turnPushOn = async () => {
    setBusy(true);
    setPushError(null);
    const result = await enablePush(authUserId);
    setBusy(false);
    if (result.status === "ok") {
      setPushAllowed(true);
      return;
    }
    if (result.status === "denied") setPushAllowed(false);
    else setPushAllowed(permissionTriState(Notification.permission));
    setPushError(result.message);
  };

  // GRANTED IS THE ONLY STATE THE SWITCHES OPEN ON.
  const reminders = pushAllowed === true;
  const stored = (plan.reminderTime ?? "").slice(0, 5);

  return (
    <CycleSection label={G.REMINDERS_TITLE} style={{ marginTop: 32 }}>
      {!reminders && (
        <div className="flex" style={{ gap: 8, marginTop: 12 }}>
          <BellOff size={14} aria-hidden className="shrink-0 text-charcoal-faint" style={{ marginTop: 2 }} />
          <div className="min-w-0">
            <CycleHelp>{!supported ? G.PUSH_UNSUPPORTED : pushAllowed === false ? G.PUSH_BLOCKED : G.PUSH_NEEDED}</CycleHelp>
            {supported && pushAllowed !== false && (
              <button
                type="button"
                onClick={() => void turnPushOn()}
                disabled={busy}
                className="tap text-primary-dark disabled:opacity-40"
                style={{ minHeight: 36, ...type(13, 19.5, 700) }}
              >
                {G.PUSH_ENABLE}
              </button>
            )}
            {pushError && (
              <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 4 })}>
                {t(pushError)}
              </p>
            )}
          </div>
        </div>
      )}

      {isPill(plan.method) && (
        <>
          <CycleRow
            icon={Bell}
            title={G.PILL_REMINDER_LABEL}
            subtitle={G.PILL_REMINDER_HELP}
            toggle={{
              checked: cycleSettings.pillReminder && reminders,
              disabled: busy || !reminders,
              onChange: () => void save({ pillReminder: !cycleSettings.pillReminder }),
            }}
          />
          <CycleRow
            icon={Clock}
            title={G.REMINDER_TIME_LABEL}
            value={stored ? time12(stored) : G.REMINDER_TIME_NOT_SET}
            onClick={busy || !reminders ? undefined : () => {
              setDraftTime(parseTime(plan.reminderTime));
              setWheelOpen((o) => !o);
            }}
            className={!reminders ? "opacity-40" : undefined}
          />
          {wheelOpen && reminders && (
            <div style={{ padding: "8px 0 4px" }}>
              <TimeWheel value={draftTime} onChange={setDraftTime} minuteStep={5} />
              <div className="flex justify-end" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setWheelOpen(false);
                    void saveTime(`${pad(draftTime.h)}:${pad(draftTime.m)}`);
                  }}
                  className="tap text-primary-dark"
                  style={{ minHeight: 44, padding: "0 4px", ...type(13, 19.5, 700) }}
                >
                  {t("Done")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <CycleRow
        icon={CalendarClock}
        title={G.METHOD_REMINDER_LABEL}
        subtitle={G.METHOD_REMINDER_HELP}
        toggle={{
          checked: cycleSettings.methodReminders && reminders,
          disabled: busy || !reminders,
          onChange: () => void save({ methodReminders: !cycleSettings.methodReminders }),
        }}
        last
      />

      <p className="text-charcoal-faint" style={type(12, 18, 600, { marginTop: 14 })}>
        {G.DETAIL_TITLE}
      </p>
      <div className="flex" role="radiogroup" aria-label={G.DETAIL_TITLE} style={{ gap: 6, marginTop: 6 }}>
        {DETAILS.map((d) => (
          <OptionButton
            key={d}
            role="radio"
            size="tall"
            className="flex-1 min-w-0"
            selected={cycleSettings.notificationDetail === d}
            disabled={busy}
            onClick={() => void save({ notificationDetail: d })}
          >
            {G.DETAIL_LABEL[d]}
          </OptionButton>
        ))}
      </div>
      <CycleHelp style={{ marginTop: 6 }}>{G.DETAIL_HELP[cycleSettings.notificationDetail]}</CycleHelp>
      {/* The zone is set in general Settings (task T) and governs every
          reminder; the Cycle Settings Time zone row shows which. */}
      <CycleHelp>{G.TIMEZONE_HELP}.</CycleHelp>
    </CycleSection>
  );
};
