import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Baby, Bell, CalendarClock, Droplet, Eye, Globe, Moon, Pill, RefreshCw, Trash2, XCircle } from "lucide-react";
import { CycleCalendarIcon } from "../icons/PartBIcons";
import { CONDITIONS, PERIOD_REMINDER_DAYS, SETTINGS_LIMITS, type Condition, type CycleSettings } from "../../services/cycle/types";
import * as G from "../../services/cycle/guidance";
import * as PG from "../../services/pregnancy/guidance";
import { METHOD_LABEL } from "../../services/contraception/guidance";
import type { Pregnancy } from "../../services/pregnancy";
import { gestationOn } from "../../services/pregnancy";
import type { Method } from "../../services/contraception";
import { zonePlace } from "../settings/timezoneOptions";
import { CycleCard, CycleFooter, CycleHelp, CycleRow, CycleSection, OptionButton, type, useCycleMode } from "./cycleUi";

// HE1.10.b, the Settings tab, in the open Settings layout: lavender section
// lines, one-line rows with 36 tiles, toggles and chevrons. Every repo
// function stays (K1-K5): the pregnancy section (start / week · day ·
// trimester + end / loss / postpartum), the time zone value, the
// contraception value, the conditions help line, and the tracker switch that
// Profile also shows. Every row opens its own frame: HE1.10.b.1, .b.2, MO1.8.3
// (period-due reminders later, V6-81), Settings › Time zone, .b.3, .b.4, .b.5.
// Sections sit 26 under a help line (HE1.10.b: help 248+31.9, next row
// 341.4) and 32 under a row (the MO1.8 rule; positions unnumbered).

type Patch = Partial<CycleSettings>;

export const CycleSettingsTab: React.FC<{
  settings: CycleSettings;
  busy: boolean;
  save: (patch: Patch) => Promise<boolean>;
  onTrackerChange: (on: boolean) => void;
  pregnancy: Pregnancy | null;
  lastEndedPregnancy: Pregnancy | null;
  today: string;
  method: Method | null;
  timezone: string | null;
  sharedWith: number | null;
  onStartPregnancy: () => void;
  onEndPregnancy: () => void;
  onResume: () => void;
  onContraception: () => void;
  onReminders: () => void;
  onTimezone: () => void;
  onSharing: () => void;
  onDeleteAll: () => void;
}> = (p) => {
  const { settings } = p;
  const pregnancyWeek = p.pregnancy ? gestationOn(p.today, p.pregnancy) : null;
  const zoneCity = p.timezone ? zonePlace(p.timezone) : G.SETTINGS_TIMEZONE_NOT_SET;

  return (
    <div data-cycle-tab="settings">
      <CycleSection label={G.SETTINGS_TRACKING} style={{ marginTop: 26 }}>
        <CycleRow
          glyph={<CycleCalendarIcon size={18} />}
          title="Cycle tracking"
          toggle={{ checked: settings.trackerEnabled, onChange: p.onTrackerChange, disabled: p.busy, label: "Cycle tracking" }}
          last
        />
        <CycleHelp style={{ marginTop: 2 }}>{settings.trackerEnabled ? G.TRACKER_OFF_KEEPS_DATA : G.SWITCH_ON_TO_TRACK}</CycleHelp>
      </CycleSection>

      <CycleSection label={G.SETTINGS_YOUR_CYCLE} style={{ marginTop: 26 }}>
        <NumberRow
          icon={RefreshCw}
          label={G.SETTINGS_CYCLE_LENGTH}
          value={settings.typicalCycleLength}
          limits={SETTINGS_LIMITS.cycleLength}
          disabled={p.busy}
          onSave={(v) => p.save({ typicalCycleLength: v })}
        />
        <NumberRow
          icon={Droplet}
          label={G.SETTINGS_PERIOD_LENGTH}
          value={settings.typicalPeriodLength}
          limits={SETTINGS_LIMITS.periodLength}
          disabled={p.busy}
          onSave={(v) => p.save({ typicalPeriodLength: v })}
        />
        <NumberRow
          icon={Moon}
          label={G.SETTINGS_LUTEAL_LENGTH}
          value={settings.lutealLength}
          limits={SETTINGS_LIMITS.lutealLength}
          disabled={p.busy}
          onSave={(v) => p.save({ lutealLength: v })}
          last
        />
        <CycleHelp style={{ marginTop: 2 }}>{G.LENGTHS_HELP}</CycleHelp>
      </CycleSection>

      <CycleSection label={G.SETTINGS_PREGNANCY} style={{ marginTop: 26 }}>
        {p.pregnancy ? (
          <>
            <CycleRow
              icon={Baby}
              title="Pregnancy tracking"
              subtitle={pregnancyWeek ? `Week ${pregnancyWeek.week} · day ${pregnancyWeek.day} · trimester ${pregnancyWeek.trimester}` : undefined}
            />
            <CycleRow icon={XCircle} title={PG.END_TITLE} onClick={p.onEndPregnancy} last />
          </>
        ) : (
          <CycleRow icon={Baby} title={PG.START_TITLE} onClick={p.onStartPregnancy} last />
        )}
        {/* K1: after a loss, the one thing offered is a way back; after a
            birth, how rough the estimates will be. Repo copy verbatim. */}
        {!p.pregnancy && p.lastEndedPregnancy?.outcome === "loss" && !settings.trackerEnabled && (
          <CycleCard style={{ marginTop: 12 }} ariaLabel={PG.LOSS_TITLE}>
            <p className="text-charcoal" style={type(13.5, 20.3, 600)}>
              {PG.LOSS_TITLE}
            </p>
            <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 4 })}>
              {PG.LOSS_BODY}
            </p>
            <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 6 })}>
              {PG.LOSS_SUPPORT}
            </p>
            <button
              type="button"
              disabled={p.busy}
              onClick={p.onResume}
              className="tap text-primary-dark disabled:opacity-40"
              style={{ marginTop: 6, minHeight: 44, ...type(13, 19.5, 700) }}
            >
              {PG.LOSS_RESUME}
            </button>
          </CycleCard>
        )}
        {!p.pregnancy &&
          p.lastEndedPregnancy?.outcome === "birth" &&
          p.lastEndedPregnancy.postpartumUntil !== null &&
          p.lastEndedPregnancy.postpartumUntil >= p.today && (
            <CycleCard style={{ marginTop: 12 }} ariaLabel={PG.POSTPARTUM_TITLE}>
              <p className="text-charcoal" style={type(13.5, 20.3, 600)}>
                {PG.POSTPARTUM_TITLE}
              </p>
              <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 4 })}>
                {PG.POSTPARTUM_BODY}
              </p>
            </CycleCard>
          )}
      </CycleSection>

      <CycleSection label={G.SETTINGS_MORE} style={{ marginTop: 32 }}>
        <CycleRow
          icon={Pill}
          title={G.SETTINGS_CONTRACEPTION}
          value={p.method && p.method !== "none" ? METHOD_LABEL[p.method] : G.SETTINGS_CONTRACEPTION_SET_UP}
          onClick={p.onContraception}
        />
        {/* Period-due reminder (Database B2 columns, B4 sender period_due;
            V6-81 built now). Off by default; 1-3 days before; the lock-screen
            wording follows notification_detail on the same row. */}
        <CycleRow
          icon={CalendarClock}
          title={G.PERIOD_REMINDER_TITLE}
          subtitle={G.PERIOD_REMINDER_SUB}
          toggle={{ checked: settings.periodReminder, onChange: (on) => void p.save({ periodReminder: on }), disabled: p.busy, label: G.PERIOD_REMINDER_TITLE }}
        />
        {settings.periodReminder && (
          <div style={{ paddingBlock: "0 12px", paddingInline: "50px 0" }}>
            <div className="flex" role="radiogroup" aria-label={G.PERIOD_REMINDER_DAYS_LABEL} style={{ gap: 6 }}>
              {Array.from({ length: PERIOD_REMINDER_DAYS.max - PERIOD_REMINDER_DAYS.min + 1 }, (_, i) => PERIOD_REMINDER_DAYS.min + i).map((d) => (
                <OptionButton
                  key={d}
                  role="radio"
                  selected={settings.periodReminderDays === d}
                  disabled={p.busy}
                  onClick={() => void p.save({ periodReminderDays: d })}
                >
                  {G.PERIOD_REMINDER_DAYS_OPTION(d)}
                </OptionButton>
              ))}
            </div>
            <CycleHelp style={{ marginTop: 6 }}>{G.PERIOD_REMINDER_WORDING[settings.notificationDetail]}</CycleHelp>
          </div>
        )}
        <CycleRow icon={Bell} title={G.SETTINGS_REMINDERS} value={G.SETTINGS_REMINDERS_VALUE} onClick={p.onReminders} />
        <CycleRow icon={Globe} title={G.TIMEZONE_TITLE} value={zoneCity} onClick={p.onTimezone} last />
      </CycleSection>

      <CycleSection label={G.SETTINGS_CONDITIONS} style={{ marginTop: 32 }}>
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }} role="group" aria-label={G.SETTINGS_CONDITIONS}>
          {CONDITIONS.map((c) => {
            const on = settings.conditions.includes(c);
            return (
              <OptionButton
                key={c}
                selected={on}
                disabled={p.busy}
                onClick={() =>
                  void p.save({
                    conditions: on ? settings.conditions.filter((x) => x !== c) : ([...settings.conditions, c] as Condition[]),
                  })
                }
              >
                {G.CONDITION_LABEL[c]}
              </OptionButton>
            );
          })}
        </div>
        <CycleHelp style={{ marginTop: 6 }}>{G.CONDITIONS_HELP}</CycleHelp>
      </CycleSection>

      <CycleSection label={G.SETTINGS_DATA} style={{ marginTop: 26 }}>
        <CycleRow
          icon={Eye}
          title={G.SETTINGS_WHO_CAN_SEE}
          value={p.sharedWith === null ? undefined : p.sharedWith === 0 ? G.SETTINGS_ONLY_YOU : G.SETTINGS_SHARED_WITH(p.sharedWith)}
          onClick={p.onSharing}
        />
        <CycleRow icon={Trash2} title={G.DELETE_ALL_TITLE} destructive onClick={p.onDeleteAll} last />
      </CycleSection>

      <CycleFooter />
    </div>
  );
};

// ---------------------------------------------------------------------------

/**
 * A length row (HE1.10.b #16-#29): − and + 28 × 28 r9 15/22.5 700 #5F5093 on
 * #F5F4FE (dark #C3B3FB / #303141), gap 6, dimmed at a limit; the value
 * 13.5/20.3 800 tnum "5 d". Tapping the value turns it into an inline input
 * (numeric keypad) 52 × 32 r9 with a 1.1 border and "Done" 13/19.5 700
 * #7D6BB5; out of range: the border and an inline error #C2453F (dark
 * #E8837C, * derived from the range-status dark) with AlertCircle 13, and
 * Done dimmed to 0.5 and disabled. A failed save reverts (the stored value
 * shows again) and the page's toast says so.
 */
const NumberRow: React.FC<{
  icon: typeof RefreshCw;
  label: string;
  value: number;
  limits: { min: number; max: number };
  disabled?: boolean;
  onSave: (v: number) => Promise<boolean>;
  last?: boolean;
}> = ({ icon, label, value, limits, disabled, onSave, last }) => {
  const { dark } = useCycleMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const n = Number(draft);
  const valid = draft !== "" && Number.isInteger(n) && n >= limits.min && n <= limits.max;
  const errorInk = dark ? "#E8837C" : "#C2453F";
  const errorId = React.useId();

  const done = async () => {
    if (!valid) return;
    setEditing(false);
    if (n !== value) await onSave(n);
  };

  const step = (d: number) => void onSave(Math.min(limits.max, Math.max(limits.min, value + d)));
  const stepper = (sym: string, d: number, atLimit: boolean, aria: string) => (
    <button
      type="button"
      onClick={() => step(d)}
      disabled={disabled || atLimit || editing}
      aria-label={aria}
      className="tap shrink-0 grid place-items-center bg-th-f5f4fe dark:bg-th-303141 text-primary-deep-text disabled:opacity-40"
      style={{ width: 28, height: 28, borderRadius: 9, ...type(15, 22.5, 700) }}
    >
      {sym}
    </button>
  );

  return (
    <div>
      <CycleRow
        icon={icon}
        title={label}
        last={last && !(editing && !valid)}
        trailing={
          <span className="shrink-0 flex items-center" style={{ gap: 6 }}>
            {stepper("−", -1, value <= limits.min, `Decrease ${label.toLowerCase()}`)}
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={label}
                aria-invalid={!valid || undefined}
                aria-describedby={!valid ? errorId : undefined}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void done();
                  if (e.key === "Escape") {
                    setDraft(String(value));
                    setEditing(false);
                  }
                }}
                className="text-center bg-cream-card text-charcoal outline-none"
                style={{
                  width: 52,
                  height: 32,
                  borderRadius: 9,
                  border: `1.1px solid ${valid ? "rgb(var(--c-primary))" : errorInk}`,
                  fontVariantNumeric: "tabular-nums",
                  ...type(14, 21, 800),
                }}
              />
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setDraft(String(value));
                  setEditing(true);
                }}
                aria-label={`${label}, ${value} days. Tap to type a number`}
                className="tap text-center text-charcoal"
                style={{ minWidth: 40, ...type(13.5, 20.3, 800, { fontVariantNumeric: "tabular-nums" }) }}
              >
                {value} d
              </button>
            )}
            {stepper("+", 1, value >= limits.max, `Increase ${label.toLowerCase()}`)}
            {editing && (
              <button
                type="button"
                onClick={() => void done()}
                disabled={!valid}
                className="tap text-primary-dark"
                style={{ marginInlineStart: 2, opacity: valid ? 1 : 0.5, ...type(13, 19.5, 700) }}
              >
                Done
              </button>
            )}
          </span>
        }
      />
      {editing && !valid && (
        <p id={errorId} role="alert" className="flex items-center" style={{ gap: 5, marginBlock: "-6px 4px", marginInline: "50px 0", color: errorInk, ...type(11.5, 17.3, 600) }}>
          <AlertCircle size={13} aria-hidden className="shrink-0" />
          {G.LENGTH_RANGE_ERROR(limits.min, limits.max)}
        </p>
      )}
    </div>
  );
};
