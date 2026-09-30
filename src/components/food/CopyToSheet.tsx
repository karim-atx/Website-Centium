import { useState } from "react";
import { Copy } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { WheelPicker } from "../ui/WheelPicker";
import { shiftDate } from "../../utils/date";
import { COPY_MEALS, COPY_MEAL_LABEL, copyDayLabel } from "../../utils/copyTo";
import type { MealType } from "../../types";

// Handover 2026-09-29 FO1.1 "Copy to…": where copied diary entries go. An
// iOS-style wheel in two columns, Day and Meal, defaulting to Tomorrow and
// the entries' own meal; "Copy n items" confirms, the sheet's X cancels.

/** How far the Day wheel scrolls back and forward from today. */
const DAY_RANGE = 30;

export const CopyToSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  count: number;
  today: string;
  meal: MealType;
  busy?: boolean;
  onConfirm: (day: string, meal: MealType) => void;
}> = ({ open, onClose, count, today, meal, busy, onConfirm }) => {
  const [day, setDay] = useState(() => shiftDate(today, 1));
  const [toMeal, setToMeal] = useState<MealType>(meal);
  const days = Array.from({ length: DAY_RANGE * 2 + 1 }, (_, i) => shiftDate(today, i - DAY_RANGE));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Copy to…"
      footer={
        <button
          onClick={() => onConfirm(day, toMeal)}
          disabled={busy}
          className="tap w-full inline-flex items-center justify-center disabled:opacity-60"
          style={{ height: 52, gap: 8, borderRadius: 16, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}
        >
          <Copy size={16} /> {busy ? "Copying…" : `Copy ${count} item${count === 1 ? "" : "s"}`}
        </button>
      }
    >
      <WheelPicker
        columns={[
          {
            label: "Day",
            flex: 1.2,
            value: day,
            options: days.map((d) => ({ value: d, label: copyDayLabel(d, today) })),
            onChange: (v) => setDay(String(v)),
          },
          {
            label: "Meal",
            value: toMeal,
            options: COPY_MEALS.map((m) => ({ value: m, label: COPY_MEAL_LABEL[m] })),
            onChange: (v) => setToMeal(v as MealType),
          },
        ]}
      />
      <div className="flex" style={{ marginTop: 8, color: "#9A94B3", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em" }}>
        <span className="text-center" style={{ flex: 1.2 }}>
          DAY
        </span>
        <span className="text-center" style={{ flex: 1 }}>
          MEAL
        </span>
      </div>
    </BottomSheet>
  );
};
