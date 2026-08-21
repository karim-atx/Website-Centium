import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { CalendarPickerSheet } from "./CalendarPickerSheet";

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const DateSelector: React.FC = () => {
  const { selectedDate, goToPrevDate, goToNextDate, goToToday, goToDate, today } = useApp();
  const isToday = selectedDate === today;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex items-center justify-between bg-cream-card rounded-2xl px-3 py-2.5 mb-5 shadow-soft animate-fade-slide-up">
      <button
        onClick={goToPrevDate}
        className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-faint hover:bg-cream-soft"
        aria-label="Previous day"
      >
        <ChevronLeft size={16} />
      </button>
      <button onClick={() => setPickerOpen(true)} className="tap flex items-center gap-1.5">
        <CalendarDays size={14} className="text-charcoal-faint" />
        <span className="text-sm font-semibold text-charcoal">
          {isToday ? "Today" : dayLabel(selectedDate)}
          {isToday && <span className="text-charcoal-faint font-normal"> — {dayLabel(selectedDate)}</span>}
        </span>
        {!isToday && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              goToToday();
            }}
            className="text-[10px] font-bold text-sohati bg-sohati-pale rounded-full px-2 py-0.5"
          >
            Jump to today
          </span>
        )}
      </button>
      <button
        onClick={goToNextDate}
        className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-faint hover:bg-cream-soft"
        aria-label="Next day"
      >
        <ChevronRight size={16} />
      </button>

      <CalendarPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={selectedDate}
        today={today}
        onSelect={goToDate}
      />
    </div>
  );
};
