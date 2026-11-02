import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toggle } from "../ui/Toggle";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { TimeWheel, partBSheetTone } from "../health/log/LogSheetParts";
import { useIsDark } from "../../hooks/useIsDark";
import { CycleDateField, OptionButton, hair, type, useCycleMode } from "../cycle/cycleUi";
import { useApp } from "../../context/AppContext";
import {
  SCHEDULED_METHODS,
  isDevice,
  isPill,
  startPlan,
  updatePlan,
  validatePlan,
  type ContraceptionPlan,
  type Method,
  type PlanShape,
} from "../../services/contraception";
import * as G from "../../services/contraception/guidance";
import { MONDAY_FIRST_JS_WEEKDAYS } from "../../utils/week";
import { getLanguage, t, tk } from "../../i18n/core";

// Setting up, or changing, the method.
//
// ONE FORM PER SCHEDULE SHAPE, matching `contraception_plans_schedule_shape_
// check` branch for branch — and the row is REBUILT FROM SCRATCH on save
// (planRow), because the constraint does not just require the right columns,
// it requires every other method's to be null. Editing a pill plan into a ring
// plan while leaving active_days set is refused by the database as a 23514 the
// user could do nothing about.
//
// CHANGING METHOD ENDS THE OLD PLAN rather than editing it, so the history
// still says what was used when. Editing the SAME method's details edits in
// place, because a corrected pack date is not a new method.

const METHODS: readonly Method[] = [
  "pill_combined",
  "pill_progestin",
  "ring",
  "patch",
  "injection",
  "implant",
  "iud_hormonal",
  "iud_copper",
  "condom",
  "other",
  "none",
];

// Stored as a JS weekday (0 = Sunday); listed Monday first (X-13, reorder only).
const WEEKDAYS = [tk("Sunday"), tk("Monday"), tk("Tuesday"), tk("Wednesday"), tk("Thursday"), tk("Friday"), tk("Saturday")];

type DateKey = "startedOn" | "packStartDate" | "insertedOn" | "firstAppliedOn" | "lastGivenOn" | "replaceBy";
type NumKey = "activeDays" | "breakDays" | "weeksIn" | "weeksOut" | "intervalWeeks";
const pad2 = (n: number) => String(n).padStart(2, "0");
const parseTime = (t: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return m ? { h: Number(m[1]), m: Number(m[2]) } : { h: 21, m: 0 };
};

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MethodSetupSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  plan: ContraceptionPlan | null;
  onSaved: () => void;
}> = ({ open, onClose, plan, onSaved }) => {
  const { authUserId } = useApp();
  const dark = useIsDark();
  const { hc } = useCycleMode();
  const today = todayISO();
  const [picking, setPicking] = useState<{ key: DateKey; max?: string; title: string } | null>(null);

  const [draft, setDraft] = useState<PlanShape>(
    plan ?? { method: "pill_combined", startedOn: today, packStartDate: today, activeDays: 21, breakDays: 7 }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed each time the sheet opens, onto whatever is stored.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = plan?.id ?? "new";
  if (open && openedFor !== key) {
    setOpenedFor(key);
    setDraft(plan ?? { method: "pill_combined", startedOn: today, packStartDate: today, activeDays: 21, breakDays: 7 });
    setError(null);
  } else if (!open && openedFor !== null) {
    setOpenedFor(null);
  }

  const set = <K extends keyof PlanShape>(k: K, v: PlanShape[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /**
   * SWITCHING METHOD CLEARS THE OTHER METHOD'S FIELDS in the draft too, so the
   * form never shows a ring's weeks beside a pill's pack. Sensible starting
   * values come with each shape.
   */
  const chooseMethod = (method: Method) => {
    const base: PlanShape = { method, startedOn: draft.startedOn };
    if (isPill(method)) {
      setDraft({ ...base, packStartDate: today, activeDays: 21, breakDays: 7 });
    } else if (method === "ring") {
      setDraft({ ...base, insertedOn: today, weeksIn: 3, weeksOut: 1 });
    } else if (method === "patch") {
      setDraft({ ...base, firstAppliedOn: today, changeWeekday: new Date().getDay(), patchFreeWeek: true });
    } else if (method === "injection") {
      setDraft({ ...base, lastGivenOn: today, intervalWeeks: 12 });
    } else if (isDevice(method)) {
      setDraft({ ...base, insertedOn: today, replaceBy: "" });
    } else {
      setDraft(base);
    }
  };

  const save = async () => {
    if (!authUserId) return;
    const invalid = validatePlan(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    // SAME METHOD = AN EDIT; a different one is a new plan, which ends the old.
    const result =
      plan && plan.method === draft.method
        ? await updatePlan(plan.id, draft)
        : await startPlan(authUserId, draft);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  };

  // HE1.10.b.2 S3 / K3: the Part B lavender-header sheet (chrome "partB",
  // pinned Save), field labels 12/16 600 #8C8378, smooth-square options,
  // 44 r12 fields; dates open the standard calendar popup; the pill's
  // reminder time is the 12-hour wheel (X-14). The change day lists Monday
  // first and still stores 0 = Sunday (X-13, reorder only).
  const fieldStyle: React.CSSProperties = {
    height: 44,
    borderRadius: 12,
    padding: "0 12px",
    border: `0.5px solid ${hair(dark, hc, 0.1)}`,
    ...type(14, 21, 400),
  };
  const field = "w-full bg-cream-soft text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = (text: string) => (
    <p className="text-charcoal-faint" style={type(12, 16, 600, { marginBlock: "16px 6px", marginInlineStart: 2 })}>
      {text}
    </p>
  );
  const dateField = (key: DateKey, labelText: string, max?: string) => (
    <>
      {label(labelText)}
      <CycleDateField value={(draft[key] as string | null | undefined) || null} onClick={() => setPicking({ key, max, title: labelText })} ariaLabel={labelText} />
    </>
  );
  const numberField = (key: NumKey, labelText: string, min: number, max: number) => (
    <div>
      {label(labelText)}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-label={labelText}
        className={field}
        style={fieldStyle}
        value={(draft[key] as number | null | undefined) ?? ""}
        onChange={(e) => set(key, (e.target.value === "" ? null : Number(e.target.value)) as PlanShape[NumKey])}
      />
    </div>
  );
  const time = parseTime(draft.reminderTime);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={plan ? G.CHANGE_METHOD : G.SETUP_TITLE}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <div>
            {error && (
              <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginBottom: 10 })}>
                {t(error)}
              </p>
            )}
            <CtaButton label={t("Save")} disabled={!authUserId} loading={busy} onClick={() => void save()} style={{ lineHeight: "21px" }} />
          </div>
        }
      >
        <div className="flex flex-wrap" role="radiogroup" aria-label={t("Method")} style={{ gap: 6 }}>
          {METHODS.map((m) => (
            <OptionButton key={m} role="radio" size="sheet" selected={draft.method === m} onClick={() => chooseMethod(m)}>
              {G.METHOD_LABEL[m]}
            </OptionButton>
          ))}
        </div>
        <p className="text-charcoal-faint" style={type(11, 16, 400, { marginTop: 8 })}>
          {G.NOT_A_PRESCRIBER}
        </p>

        {dateField("startedOn", t("Started on"), today)}

        {/* --- the pill --- */}
        {isPill(draft.method) && (
          <>
            {dateField("packStartDate", t("First day of this pack"))}
            <div className="grid grid-cols-2" style={{ columnGap: 10 }}>
              {numberField("activeDays", t("Active days"), 20, 28)}
              {numberField("breakDays", t("Break days"), 0, 7)}
            </div>
            {label(G.REMINDER_TIME_LABEL)}
            {draft.reminderTime ? (
              <>
                <TimeWheel
                  value={time}
                  minuteStep={5}
                  onChange={(v) => set("reminderTime", `${pad2(v.h)}:${pad2(v.m)}`)}
                />
                <button type="button" onClick={() => set("reminderTime", null)} className="tap text-charcoal-faint" style={{ minHeight: 36, ...type(12, 18, 600) }}>
                  {t("No reminder time")}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => set("reminderTime", "21:00")} className="tap text-primary-dark" style={{ minHeight: 36, ...type(13, 19.5, 700) }}>
                {t("Set a time")}
              </button>
            )}
          </>
        )}

        {/* --- the ring --- */}
        {draft.method === "ring" && (
          <>
            {dateField("insertedOn", t("Put in on"))}
            <div className="grid grid-cols-2" style={{ columnGap: 10 }}>
              {numberField("weeksIn", t("Weeks in"), 1, 4)}
              {numberField("weeksOut", t("Weeks out"), 0, 2)}
            </div>
          </>
        )}

        {/* --- the patch --- */}
        {draft.method === "patch" && (
          <>
            {dateField("firstAppliedOn", t("First patch on"))}
            {label(t("Change day"))}
            <div className="flex flex-wrap" role="radiogroup" aria-label={t("Change day")} style={{ gap: 6 }}>
              {MONDAY_FIRST_JS_WEEKDAYS.map((i) => (
                <OptionButton key={i} role="radio" size="sheet" selected={(draft.changeWeekday ?? 0) === i} onClick={() => set("changeWeekday", i)}>
                  <span aria-hidden>{getLanguage() === "en" ? WEEKDAYS[i].slice(0, 3) : t(WEEKDAYS[i])}</span>
                  <span className="sr-only">{t(WEEKDAYS[i])}</span>
                </OptionButton>
              ))}
            </div>
            <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 14 }}>
              <span className="text-charcoal" style={type(14, 19, 600)}>
                {t("I have a patch-free week")}
              </span>
              <Toggle checked={draft.patchFreeWeek ?? false} onChange={(v) => set("patchFreeWeek", v)} label={t("I have a patch-free week")} />
            </div>
          </>
        )}

        {/* --- the injection --- */}
        {draft.method === "injection" && (
          <>
            {dateField("lastGivenOn", t("Last injection"))}
            {numberField("intervalWeeks", t("Every (weeks)"), 4, 16)}
          </>
        )}

        {/* --- implant and IUDs --- */}
        {isDevice(draft.method) && (
          <>
            {dateField("insertedOn", t("Fitted on"))}
            {dateField("replaceBy", t("Replace by"))}
            <p className="text-charcoal-faint" style={type(11, 16, 400, { marginTop: 6 })}>
              {G.DEVICE_NOTE}
            </p>
          </>
        )}

        {/* Methods with no schedule say so, rather than showing an empty form. */}
        {!SCHEDULED_METHODS.includes(draft.method) && (
          <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 14 })}>
            {t("There's no schedule to keep for this one. It's recorded so the rest of the app knows what you use.")}
          </p>
        )}
      </BottomSheet>
      <CalendarPickerSheet
        variant="partB"
        open={picking !== null}
        onClose={() => setPicking(null)}
        selectedDate={(picking && (draft[picking.key] as string | null | undefined)) || today}
        today={today}
        maxDate={picking?.max}
        title={picking?.title}
        onSelect={(d) => {
          if (picking) set(picking.key, d as PlanShape[DateKey]);
          setPicking(null);
        }}
      />
    </>
  );
};
