import React, { useState } from "react";
import { FixedHeader } from "../ui/FixedHeader";
import { PinnedCta } from "../ui/PinnedCta";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { useApp } from "../../context/AppContext";
import { dueDateFromLmp, lmpFromDueDate, shiftDay, startPregnancy } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { t } from "../../i18n/core";
import { CycleDateField, CycleHelp, CycleSection, CycleTitleRow, OptionButton, longDate, type } from "../cycle/cycleUi";

// HE1.10.b.1 "Start pregnancy tracking", the repo StartPregnancySheet as a
// page (it replaced the sheet).
//
// TWO WAYS IN, BECAUSE PEOPLE ARRIVE WITH DIFFERENT NUMBERS. Somebody who has
// not had a scan knows their last period; somebody who has been scanned has a
// due date that is BETTER than counting from a period, and forcing them to
// back-calculate an LMP would be asking them to do arithmetic the app can do.
// Either one stores both (startPregnancy).
//
// THE OTHER DATE IS SHOWN AS IT IS CHOSEN, so nobody discovers afterwards
// that the app worked out a due date they disagree with.
//
// A LAST PERIOD CANNOT BE IN THE FUTURE and a due date cannot be in the past:
// the Part B calendar greys days after today for a last period and days
// before today for a due date (and a last period over 42 weeks back).
// The intro is PG.START_BODY verbatim (V6/S-09: the board line is a
// placeholder).

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 42 weeks: the longest dating the app accepts for a last period. */
const MAX_LMP_DAYS = 42 * 7;

export const StartPregnancyPage: React.FC<{ onBack: () => void; onStarted: () => void }> = ({ onBack, onStarted }) => {
  const { authUserId } = useApp();
  const [basis, setBasis] = useState<"lmp" | "due">("lmp");
  const [value, setValue] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const fieldError =
    value === null
      ? null
      : basis === "lmp" && value < shiftDay(today, -MAX_LMP_DAYS)
        ? t(G.START_LMP_TOO_LONG_AGO)
        : null;
  const derived = value && !fieldError ? (basis === "lmp" ? dueDateFromLmp(value) : lmpFromDueDate(value)) : null;

  const save = async () => {
    if (!authUserId || !value || fieldError) return;
    setBusy(true);
    setError(null);
    const result = await startPregnancy(authUserId, basis === "lmp" ? { lmpDate: value } : { dueDate: value });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onStarted();
  };

  return (
    <div className="animate-fade-slide-up" style={{ paddingBottom: 176 }} data-cycle-page="start-pregnancy">
      <FixedHeader paddingBottom={10}>
        <CycleTitleRow title={t(G.START_TITLE)} onBack={onBack} sub />
      </FixedHeader>
      <p className="text-charcoal-soft" style={type(12.5, 19.4, 400, { marginTop: 4 })}>
        {G.START_BODY}
      </p>

      <div className="flex" role="radiogroup" aria-label={t("How to work out the dates")} style={{ gap: 8, marginTop: 16 }}>
        {(
          [
            ["lmp", t(G.START_FROM_LMP)],
            ["due", t(G.START_FROM_DUE)],
          ] as const
        ).map(([key, label]) => (
          <OptionButton
            key={key}
            role="radio"
            size="tall"
            selected={basis === key}
            className="flex-1 min-w-0"
            onClick={() => {
              setBasis(key);
              setValue(null);
              setError(null);
            }}
          >
            {label}
          </OptionButton>
        ))}
      </div>

      <p className="text-charcoal-faint" style={type(12, 16, 600, { margin: "14px 0 6px 2px" })}>
        {basis === "lmp" ? t(G.START_LMP_LABEL) : t(G.START_DUE_LABEL)}
      </p>
      <CycleDateField
        value={value}
        onClick={() => setPickerOpen(true)}
        ariaLabel={basis === "lmp" ? t(G.START_LMP_LABEL) : t(G.START_DUE_LABEL)}
        invalid={!!fieldError}
      />
      {fieldError && (
        <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 6 })}>
          {fieldError}
        </p>
      )}
      {derived && (
        <p className="text-charcoal" style={type(12.5, 18.8, 700, { marginTop: 10 })}>
          {basis === "lmp" ? G.START_DERIVED_DUE(longDate(derived)) : G.START_DERIVED_LMP(longDate(derived))}
        </p>
      )}

      <CycleSection label={t(G.START_DUE_SECTION)} style={{ marginTop: 22 }}>
        <CycleHelp style={{ marginTop: 2 }}>{G.DUE_DATE_HELP}</CycleHelp>
      </CycleSection>

      {error && (
        <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 12 })}>
          {t(error)}
        </p>
      )}

      <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 600, { marginTop: 22 })}>
        {t(G.PROVIDER_FIRST)}
      </p>

      <PinnedCta
        primary={{
          label: t(G.START_CTA),
          onClick: () => void save(),
          disabled: !value || !!fieldError || !authUserId,
          loading: busy,
          className: "!bg-fill-pinned",
        }}
      />

      <CalendarPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={value ?? today}
        today={today}
        variant="partB"
        maxDate={basis === "lmp" ? today : undefined}
        minDate={basis === "due" ? today : shiftDay(today, -MAX_LMP_DAYS)}
        title={basis === "lmp" ? t(G.START_LMP_LABEL) : t(G.START_DUE_LABEL)}
        onSelect={(d) => {
          setValue(d);
          setPickerOpen(false);
        }}
      />
    </div>
  );
};
