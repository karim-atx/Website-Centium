import React from "react";
import { useApp } from "../../context/AppContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const DateSelector: React.FC = () => {
  const { selectedDate, goToPrevDate, goToNextDate, goToToday, today } = useApp();
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center justify-between bg-cream-card rounded-2xl px-3 py-2.5 mb-5 shadow-soft animate-fade-slide-up">
      <button
        onClick={goToPrevDate}
        className="tap w-8 h-8 rounded-full flex items-center justify-center text-charcoal-faint hover:bg-cream-soft"
        aria-label="Previous day"
      >
        <ChevronLeft size={16} />
      </button>
      <button onClick={!isToday ? goToToday : undefined} className="tap flex items-center gap-2">
        <span className="text-sm font-semibold text-charcoal">
          {isToday ? "Today" : dayLabel(selectedDate)}
          {isToday && <span className="text-charcoal-faint font-normal"> — {dayLabel(selectedDate)}</span>}
        </span>
        {!isToday && (
          <span className="text-[10px] font-bold text-sohati bg-sohati-pale rounded-full px-2 py-0.5">
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
    </div>
  );
};
