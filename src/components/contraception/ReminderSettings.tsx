import React, { useState } from "react";
import { Card } from "../ui/Card";
import { useApp } from "../../context/AppContext";
import { isPill, updatePlan, type ContraceptionPlan } from "../../services/contraception";
import type { NotificationDetail } from "../../services/cycle/types";
import * as G from "../../services/contraception/guidance";

// Reminders: what is sent, when, and how much it says.
//
// THE SWITCHES AND THE DETAIL LEVEL LIVE ON cycle_settings; the TIME lives on
// the plan, as `reminder_time`, because it is a property of the pack rather
// than of the account — changing method changes when the reminder makes sense.
//
// WHICH IS WHY THE PILL ROW AND THE TIME ARE HIDDEN FOR EVERY OTHER METHOD.
// reminder_time is a pill-only column: contraception_plans_schedule_shape_
// check requires it to be null for a ring or an implant, so planRow() nulls
// it, so a time field on a ring plan would be a control that silently does
// nothing. A ring has no daily dose to be reminded of either.
//
// NEUTRAL IS THE DEFAULT AND IT IS EXPLAINED RATHER THAN ASSUMED. A phone on a
// table shows its notifications to whoever is in the room, and what somebody
// takes is not the app's to disclose to a flatmate reading over a shoulder.
// The copy says exactly what each option puts on a lock screen, so the choice
// is an informed one instead of a preference nobody understands.

const DETAILS: readonly NotificationDetail[] = ["neutral", "detailed"];

export const ReminderSettings: React.FC<{ plan: ContraceptionPlan }> = ({ plan }) => {
  const { cycleSettings, saveCycleSettingsAndReload, reloadContraception } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No settings row yet means nothing to switch — the tracker creates one on
  // first open, and guessing a default here would write somebody's preference
  // for them.
  if (!cycleSettings) return null;

  const save = async (patch: Parameters<typeof saveCycleSettingsAndReload>[0]) => {
    setBusy(true);
    setError(null);
    const result = await saveCycleSettingsAndReload(patch);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't save that.");
  };

  const saveTime = async (value: string) => {
    setBusy(true);
    setError(null);
    const result = await updatePlan(plan.id, { ...plan, reminderTime: value || null });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    reloadContraception();
  };

  return (
    <Card className="mb-3">
      <p className="text-[11px] font-bold text-charcoal mb-2">{G.REMINDERS_TITLE}</p>

      {isPill(plan.method) && (
        <Row
          label={G.PILL_REMINDER_LABEL}
          help={G.PILL_REMINDER_HELP}
          on={cycleSettings.pillReminder}
          disabled={busy}
          onToggle={() => void save({ pillReminder: !cycleSettings.pillReminder })}
        />
      )}
      <Row
        label={G.METHOD_REMINDER_LABEL}
        help={G.METHOD_REMINDER_HELP}
        on={cycleSettings.methodReminders}
        disabled={busy}
        onToggle={() => void save({ methodReminders: !cycleSettings.methodReminders })}
      />

      {isPill(plan.method) && (
        <div className="flex items-center justify-between gap-3 py-2 border-t border-charcoal/8 mt-1">
          <p className="text-[12.5px] text-charcoal">{G.REMINDER_TIME_LABEL}</p>
          <input
            type="time"
            disabled={busy}
            value={(plan.reminderTime ?? "").slice(0, 5)}
            onChange={(e) => void saveTime(e.target.value)}
            className="shrink-0 rounded-lg bg-cream-soft px-2.5 py-1.5 text-[12.5px] text-charcoal"
          />
        </div>
      )}

      <p className="mt-2.5 text-[11px] font-bold text-charcoal mb-1.5">{G.DETAIL_TITLE}</p>
      <div className="flex gap-2">
        {DETAILS.map((d) => {
          const on = cycleSettings.notificationDetail === d;
          return (
            <button
              key={d}
              disabled={busy}
              onClick={() => void save({ notificationDetail: d })}
              className={`tap flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
                on ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
              }`}
            >
              {G.DETAIL_LABEL[d]}
              {d === "neutral" && " · default"}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-[1.45] text-charcoal-faint">
        {G.DETAIL_HELP[cycleSettings.notificationDetail]}
      </p>

      <p className="mt-2 text-[10px] leading-[1.45] text-charcoal-faint">
        {G.TIMEZONE_HELP} ({cycleSettings.timezone})
      </p>

      {error && <p className="mt-2 text-[11px] font-semibold text-status-high">{error}</p>}
    </Card>
  );
};

const Row: React.FC<{
  label: string;
  help: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ label, help, on, disabled, onToggle }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="min-w-0">
      <p className="text-[12.5px] text-charcoal">{label}</p>
      <p className="text-[10.5px] text-charcoal-faint leading-snug">{help}</p>
    </div>
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`tap shrink-0 w-11 h-6 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-charcoal/20"
      }`}
    >
      <span
        className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  </div>
);
