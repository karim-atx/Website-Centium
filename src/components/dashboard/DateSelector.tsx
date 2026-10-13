import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { CalendarPickerSheet } from "./CalendarPickerSheet";
import { JumpToToday } from "../ui/JumpToToday";

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

// Iteration 6 "Team" §1.1: a pill-shaped day navigator with the same
// lavender border as the bottom-nav pill, replacing the plain card.
/**
 * `partB` (FO1 #7-#8, v6 Part B): the pill's 0.5px #8F68F6@28% border in both
 * modes (X-09) and 44px hit areas on the 24px chevrons. Off by default, so
 * Home is unchanged.
 */
export const DateSelector: React.FC<{ partB?: boolean }> = ({ partB = false }) => {
  const { selectedDate, goToPrevDate, goToNextDate, goToToday, goToDate, today } = useApp();
  const isToday = selectedDate === today;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={`flex items-center justify-between gap-2.5 rounded-full bg-white dark:bg-[#1C1F28] px-3 py-2 mb-[13px] animate-fade-slide-up ${
        partB ? "" : "border border-team-nav-accent/[0.28] dark:border-team-nav-accent/[0.34]"
      }`}
      style={partB ? { border: "0.5px solid rgb(var(--c-team-nav-accent) / 0.28)" } : undefined}
    >
      <button
        onClick={goToPrevDate}
        className={`tap relative w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-team-nav-idle ${partB ? "before:absolute before:-inset-[10px] before:content-['']" : ""}`}
        aria-label="Previous day"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="flex items-center gap-[7px] min-w-0">
        <button onClick={() => setPickerOpen(true)} className="tap flex items-center gap-[7px] min-w-0">
          <CalendarDays size={14} className="text-team-nav-accent shrink-0" />
          <span className="text-[12.5px] font-bold text-charcoal whitespace-nowrap">{dayLabel(selectedDate)}</span>
        </button>
        {!isToday && (
          <JumpToToday
            onClick={() => {
              goToToday();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </span>
      <button
        onClick={goToNextDate}
        className={`tap relative w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-team-nav-idle ${partB ? "before:absolute before:-inset-[10px] before:content-['']" : ""}`}
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
