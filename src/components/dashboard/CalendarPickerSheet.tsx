import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Local getters, formatted by hand — d is built with the local `new Date(y,
// m, day)` constructor, so going through toISOString() here would round-trip
// through UTC and silently land on the wrong day in any UTC+ timezone.
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// V4 (QA 4.0): a top-anchored dropdown that slides down, rather than the
// shared BottomSheet's slide-up-from-bottom pattern — a calendar picker
// reads as an extension of the date bar it's opened from, not a full
// modal form. Portaled to <body> for the same reason as BottomSheet (an
// ancestor's `animate-fade-slide-up` transform would otherwise clip a
// `position: fixed` popover to that ancestor's box).
export const CalendarPickerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}> = ({ open, onClose, selectedDate, today, onSelect }) => {
  const [cursor, setCursor] = useState(() => new Date(`${selectedDate}T00:00:00`));

  useEffect(() => {
    if (open) setCursor(new Date(`${selectedDate}T00:00:00`));
  }, [open, selectedDate]);

  if (!open) return null;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-20 sm:pt-24">
        <div className="relative w-full sm:max-w-sm bg-cream rounded-3xl shadow-lift p-5 animate-drop-down">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-charcoal">Choose a date</p>
            <button
              onClick={onClose}
              className="tap w-7 h-7 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal-soft hover:bg-charcoal/10"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-charcoal">{monthLabel}</p>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-charcoal-faint py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = toIso(d);
              const isSelected = iso === selectedDate;
              const isToday = iso === today;
              return (
                <button
                  key={i}
                  onClick={() => {
                    onSelect(iso);
                    onClose();
                  }}
                  className={clsx(
                    "tap aspect-square rounded-xl text-sm font-medium flex items-center justify-center",
                    isSelected
                      ? "bg-primary text-white font-bold"
                      : isToday
                      ? "bg-primary-pale text-primary-dark font-bold"
                      : "text-charcoal hover:bg-cream-soft"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
