import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
//
// Master handover (CentiumFrame `ovCalendarLav`): its own lavender chrome —
// a #EDEAFE shell with a #7155CA hairline and a centred 20px title, a white
// panel beneath holding a #F6F4FE month bar, #5B3FE4 weekday letters and
// chevrons, and the selected day filled #AB9ED7. There is no close button;
// tapping the backdrop closes it.
export const CalendarPickerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}> = ({ open, onClose, selectedDate, onSelect }) => {
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
        <div
          className="relative w-full sm:max-w-sm shadow-lift overflow-hidden animate-drop-down"
          style={{ background: "#EDEAFE", borderRadius: 28, border: "1px solid #7155CA" }}
        >
          <div className="flex items-center justify-center" style={{ height: 37 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em", color: "#7155CA" }}>
              Choose a date
            </p>
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: "22px 22px 0 0", padding: "14px 12px 16px" }}>
            <div
              className="flex items-center justify-between"
              style={{ background: "#F6F4FE", borderRadius: 16, height: 40, padding: "0 12px", marginBottom: 10 }}
            >
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="tap flex items-center justify-center"
                style={{ width: 26, height: 26, color: "#5B3FE4" }}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} strokeWidth={2.2} />
              </button>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#241F1B" }}>{monthLabel}</p>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="tap flex items-center justify-center"
                style={{ width: 26, height: 26, color: "#5B3FE4" }}
                aria-label="Next month"
              >
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="grid grid-cols-7" style={{ gap: 2, marginBottom: 2 }}>
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{ fontSize: 13, fontWeight: 600, color: "#5B3FE4", padding: "6px 0" }}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7" style={{ gap: 2 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = toIso(d);
                const isSelected = iso === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      onSelect(iso);
                      onClose();
                    }}
                    className="tap aspect-square flex items-center justify-center"
                    style={{
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 500,
                      background: isSelected ? "#AB9ED7" : "transparent",
                      color: isSelected ? "#FFFFFF" : "#000000",
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
