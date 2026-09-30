import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { WheelPicker, type WheelColumn } from "./WheelPicker";
import { currentMonth, formatMonth, isMonthValue, MONTH_NAMES, type MonthValue } from "../../services/professional-cv/cvDates";

const PRESENT = "present";

/**
 * A month-and-year field: a button that opens the shared wheel picker with two
 * columns, Month and Year. Month precision only — the CV never stores a day.
 *
 * `allowPresent` adds "Present" at the top of the Year column for end dates;
 * choosing it means "still ongoing", which the tables store as a missing end.
 * `value` is then null with `present` true. Optional fields get a Clear.
 */
export const MonthYearField: React.FC<{
  id: string;
  label: string;
  value: MonthValue | null;
  onChange: (value: MonthValue | null) => void;
  /** End dates: offer "Present". */
  allowPresent?: boolean;
  /** Whether a missing value currently reads as "Present". */
  present?: boolean;
  optional?: boolean;
  disabled?: boolean;
  /** Earliest year offered. */
  fromYear?: number;
  /** Latest year offered (defaults to this year, or +15 for expiry dates). */
  toYear?: number;
}> = ({ id, label, value, onChange, allowPresent, present, optional, disabled, fromYear, toYear }) => {
  const [open, setOpen] = useState(false);
  const now = currentMonth();
  const thisYear = Number(now.slice(0, 4));
  const last = toYear ?? thisYear;
  const first = fromYear ?? thisYear - 60;

  // The wheel's working value, committed on Done.
  const initial = (): { year: string; month: string } => {
    if (isMonthValue(value)) return { year: value.slice(0, 4), month: value.slice(5, 7) };
    if (allowPresent && present) return { year: PRESENT, month: now.slice(5, 7) };
    const y = Math.min(Math.max(thisYear, first), last);
    return { year: String(y), month: now.slice(5, 7) };
  };
  const [draft, setDraft] = useState(initial);

  const years: { value: string; label: string }[] = [];
  if (allowPresent) years.push({ value: PRESENT, label: "Present" });
  for (let y = last; y >= first; y--) years.push({ value: String(y), label: String(y) });

  // The month stays selectable while "Present" is chosen, and is simply not
  // used on Done. Disabling it made "pick the month, then the year" silently
  // drop the month whenever the wheel opened on Present.
  const columns: WheelColumn<string>[] = [
    {
      label: "Month",
      flex: 1.2,
      value: draft.month,
      onChange: (m) => setDraft((d) => ({ ...d, month: m })),
      options: MONTH_NAMES.map((name, i) => ({
        value: String(i + 1).padStart(2, "0"),
        label: name,
      })),
    },
    {
      label: "Year",
      value: draft.year,
      onChange: (y) => setDraft((d) => ({ ...d, year: y })),
      options: years,
    },
  ];

  const shown = isMonthValue(value) ? formatMonth(value) : allowPresent && present ? "Present" : "";

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className="text-xs font-semibold text-charcoal-soft">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          setDraft(initial());
          setOpen(true);
        }}
        className="tap w-full min-h-[48px] flex items-center justify-between gap-2 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-left text-sm disabled:opacity-60"
      >
        <span className={shown ? "text-charcoal truncate" : "text-charcoal-faint truncate"}>
          {shown || "Month, year"}
        </span>
        <CalendarDays size={15} className="text-charcoal-faint shrink-0" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <div className="flex gap-2.5">
            {optional && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                onChange(draft.year === PRESENT ? null : `${draft.year}-${draft.month}`);
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        }
      >
        <WheelPicker columns={columns as WheelColumn<string | number>[]} />
      </BottomSheet>
    </div>
  );
};
