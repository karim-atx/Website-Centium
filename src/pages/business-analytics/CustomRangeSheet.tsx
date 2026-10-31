import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Toggle } from "../../components/ui/Toggle";
import { dateOf, dayMonth, daysBetween, isoOf, pickRangeDay, previousOf, type AnalyticsRange } from "./analyticsRange";
import { appLocale } from "../../i18n/format";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// AN5-061 · the Custom range sheet, shared by every Analytics section: From /
// To boxes (the active end bordered), a Monday-first month grid with the
// range band, "Compare with previous period" and Apply. Up to 12 months back;
// days after today can't be picked. First tap sets From, the next sets To;
// a day before From restarts.

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const weekdayDayMonth = (iso: string) => {
  const d = dateOf(iso);
  return `${WD[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};

export function CustomRangeSheet({
  open,
  onClose,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial: AnalyticsRange;
  onApply: (r: AnalyticsRange) => void;
}) {
  const today = isoOf(new Date());
  const earliest = useMemo(() => {
    const d = dateOf(today);
    d.setFullYear(d.getFullYear() - 1);
    return isoOf(d);
  }, [today]);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState<string | null>(initial.to);
  const [end, setEnd] = useState<"from" | "to">("from");
  const [compare, setCompare] = useState(initial.compare);
  const [month, setMonth] = useState(() => {
    const d = dateOf(initial.to > today ? today : initial.to);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFrom(initial.from > today ? today : initial.from);
      setTo(initial.to > today ? today : initial.to);
      setEnd("from");
      setCompare(initial.compare);
      const d = dateOf(initial.to > today ? today : initial.to);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => isoOf(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  }, [month]);

  // pickRangeDay is the rule (tested in analyticsRange.test.ts). The old
  // inline version also restarted whenever To was empty, which it always is
  // after the first tap, so the end of a range could never be chosen.
  const pick = (iso: string) => {
    const next = pickRangeDay({ from, to, end }, iso);
    setFrom(next.from);
    setTo(next.to);
    setEnd(next.end);
  };

  const count = to ? daysBetween(from, to) + 1 : 1;
  const prev = previousOf({ key: "custom", from, to: to ?? from, compare });
  const canPrev = isoOf(new Date(month.getFullYear(), month.getMonth(), 0)) >= earliest;
  const canNext = isoOf(new Date(month.getFullYear(), month.getMonth() + 1, 1)) <= today;
  const box = (which: "from" | "to", value: string | null) => (
    <button
      type="button"
      onClick={() => setEnd(which)}
      aria-pressed={end === which}
      className={clsx(
        "tap text-start rounded-[14px] bg-cream-card border-solid",
        end === which ? "border-[1.5px] border-primary-fill" : "border border-charcoal/[0.11] dark:border-charcoal/[0.08]"
      )}
      style={{ padding: "8px 12px" }}
    >
      <span className="block text-[10px] font-bold text-charcoal-faint">{which === "from" ? "From" : "To"}</span>
      <span className="block text-[14px] leading-[19px] font-extrabold text-charcoal">{value ? weekdayDayMonth(value) : "Choose a day"}</span>
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Custom range" tone="business">
      <div className="grid grid-cols-2 gap-[8px] mb-[14px]">
        {box("from", from)}
        {box("to", to)}
      </div>
      <div className="flex items-center justify-between mb-[8px]">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="tap w-[44px] h-[44px] flex items-center justify-center disabled:opacity-30"
        >
          <span className="w-[32px] h-[32px] rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center">
            <ChevronLeft size={16} strokeWidth={2.4} aria-hidden />
          </span>
        </button>
        <p className="text-[14px] font-extrabold text-charcoal" aria-live="polite">
          {month.toLocaleDateString(appLocale("en-GB"), { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="tap w-[44px] h-[44px] flex items-center justify-center disabled:opacity-30"
        >
          <span className="w-[32px] h-[32px] rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center">
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
          </span>
        </button>
      </div>
      <div className="grid grid-cols-7" aria-hidden>
        {DOW.map((d) => (
          <span key={d} className="text-center text-[10px] font-bold text-charcoal-faint" style={{ padding: "4px 0" }}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-[4px]" role="grid" aria-label="Choose the range">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`b${i}`} />;
          const disabled = iso > today || iso < earliest;
          const isStart = iso === from;
          const isEnd = !!to && iso === to;
          const inRange = !!to && iso >= from && iso <= to;
          const col = i % 7;
          const d = dateOf(iso);
          return (
            <div
              key={iso}
              className={clsx("relative h-[38px] flex items-center justify-center", inRange && !(isStart && isEnd) && "bg-primary-pale")}
              style={{
                borderStartStartRadius: inRange && (isStart || col === 0) ? 999 : 0,
                borderEndStartRadius: inRange && (isStart || col === 0) ? 999 : 0,
                borderStartEndRadius: inRange && (isEnd || col === 6) ? 999 : 0,
                borderEndEndRadius: inRange && (isEnd || col === 6) ? 999 : 0,
              }}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(iso)}
                aria-label={`${d.toLocaleDateString(appLocale("en-US"), { weekday: "long", day: "numeric", month: "long" })}${isStart ? ", range start" : isEnd ? ", range end" : ""}`}
                aria-pressed={isStart || isEnd}
                className={clsx(
                  "w-[36px] h-[36px] rounded-full text-[13px] tabular-nums disabled:opacity-30",
                  isStart || isEnd ? "bg-primary-fill text-on-primary-fill font-extrabold" : "text-charcoal font-semibold"
                )}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-charcoal/[0.06] mt-[14px] pt-[12px] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] leading-[17px] font-bold text-charcoal">Compare with previous period</p>
          <p className="text-[11px] leading-[15px] text-charcoal-faint">
            {dayMonth(prev.from, today)} to {dayMonth(prev.to, today)}
          </p>
        </div>
        <Toggle checked={compare} onChange={setCompare} size="onboarding" label="Compare with previous period" />
      </div>
      <p className="text-[11px] leading-[15px] text-charcoal-faint mt-[10px]">
        {count === 1 ? "1 day selected." : `${count} days selected.`} Up to 12 months back; days after today can't be picked.
      </p>
      <div className="grid gap-[10px] mt-[14px]" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
        <button type="button" onClick={onClose} className="tap h-[46px] rounded-[14px] border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] text-[13px] font-bold text-charcoal">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply({ key: "custom", from, to: to ?? from, compare })}
          className="tap h-[46px] rounded-[14px] bg-primary-fill text-on-primary-fill text-[13px] font-extrabold"
        >
          Apply range
        </button>
      </div>
    </BottomSheet>
  );
}

