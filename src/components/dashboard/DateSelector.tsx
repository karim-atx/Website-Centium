import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { CalendarPickerSheet } from "./CalendarPickerSheet";

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

// Iteration 6 "Team" §1.1: a pill-shaped day navigator with the same
// lavender border as the bottom-nav pill, replacing the plain card.
export const DateSelector: React.FC = () => {
  const { selectedDate, goToPrevDate, goToNextDate, goToToday, goToDate, today } = useApp();
  const isToday = selectedDate === today;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-2.5 rounded-full bg-white dark:bg-[#221C2E] border border-team-nav-accent/[0.28] dark:border-team-nav-accent/[0.34] px-3 py-2 mb-[13px] animate-fade-slide-up">
      <button
        onClick={goToPrevDate}
        className="tap w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-team-nav-idle"
        aria-label="Previous day"
      >
        <ChevronLeft size={15} />
      </button>
      <button onClick={() => setPickerOpen(true)} className="tap flex items-center gap-[7px] min-w-0">
        <CalendarDays size={14} className="text-team-nav-accent shrink-0" />
        <span className="text-[12.5px] font-bold text-charcoal whitespace-nowrap">{dayLabel(selectedDate)}</span>
        {!isToday && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              goToToday();
            }}
            className="text-[10px] font-bold text-team-nav-accent bg-team-nav-accent/[0.14] rounded-full px-2 py-0.5 shrink-0"
          >
            Jump to today
          </span>
        )}
      </button>
      <button
        onClick={goToNextDate}
        className="tap w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-team-nav-idle"
        aria-label="Next day"
      >
        <ChevronRight size={15} />
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
