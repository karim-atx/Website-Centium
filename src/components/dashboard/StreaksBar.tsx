import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { PlantSpecies } from "../../context/AppContext";
import { mondayFirstWeek } from "../../utils/week";

const WEEKDAY_CAPS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// README → Assets: each species' file prefix under public/.
const SPECIES_PREFIX: Record<PlantSpecies, string> = {
  tulip: "cf",
  rose: "rose",
  sunflower: "sf",
  daisy: "daisy",
  lily: "lily",
};

// Iteration 6 "Team" §1.2 + §8: the gradient board — a growing plant, a
// unified day streak, and a Monday-first week row of leaf + 4 sub-goal
// dots per day. Each day's 4 sub-goals (food logged, water logged, workout
// completed, journal written) are computed from the actual logs; growth
// stage and species live in AppContext (see the comment there) so they
// persist and can only move forward, never reset by a quiet week.
export const StreaksBar: React.FC = () => {
  const { today, foodLog, waterByDate, workoutLog, journalEntries, plantStage, setPlantStage, plantSpecies, cyclePlantSpecies } =
    useApp();
  const navigate = useNavigate();

  const week = mondayFirstWeek(today);
  const dayState = (d: string) => {
    const subGoals = [
      foodLog.some((e) => e.date === d),
      (waterByDate[d] ?? 0) > 0,
      workoutLog.some((w) => w.date === d && w.completed),
      journalEntries.some((e) => e.date === d),
    ];
    const met = subGoals.filter(Boolean).length;
    return { met, earned: met >= 2, partial: met === 1 };
  };

  const days = week.map((d) => ({ date: d, isToday: d === today, isFuture: d > today, ...dayState(d) }));
  const todayState = days.find((d) => d.isToday);

  // The unified day streak: consecutive earned days walking back from
  // today (a real computation, not the old 4-category auto-streak numbers,
  // which the redesign's single headline number no longer represents).
  let dayStreak = 0;
  {
    const cursor = new Date(`${today}T00:00:00`);
    for (;;) {
      const d = cursor.toISOString().slice(0, 10);
      const subGoals = [
        foodLog.some((e) => e.date === d),
        (waterByDate[d] ?? 0) > 0,
        workoutLog.some((w) => w.date === d && w.completed),
        journalEntries.some((e) => e.date === d),
      ].filter(Boolean).length;
      if (subGoals < 2) break;
      dayStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const earnedThisWeek = days.filter((d) => !d.isFuture && d.earned).length;
  // "A missed week leaves the plant where it stopped; it resumes rather
  // than resetting" — the displayed stage is the higher of the persisted
  // high-water mark and this week's real progress so far, and a new high
  // is written back so it survives into next week even if this week then
  // goes quiet.
  const displayStage = Math.max(plantStage, Math.min(7, earnedThisWeek));
  useEffect(() => {
    if (displayStage > plantStage) setPlantStage(displayStage);
  }, [displayStage, plantStage, setPlantStage]);

  return (
    // A plain div, not a button: it holds its own nested button (the plant
    // head's species-cycle tap target), and a <button> inside a <button>
    // is invalid HTML — React warns and some browsers mis-handle the
    // nested click entirely.
    <div
      onClick={() => navigate("/app/mind")}
      role="button"
      tabIndex={0}
      className="tap w-full text-left rounded-[22px] p-[18px] mb-[13px] overflow-hidden animate-fade-slide-up cursor-pointer"
      style={{ background: "var(--gradient-board)" }}
    >
      <div className="relative flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            cyclePlantSpecies();
          }}
          aria-label="Change plant species"
          className="tap w-[76px] h-[140px] shrink-0 flex items-center justify-center"
        >
          {/* README → Interactions: "220ms cross-fade with a light scale-up
              pop on the new head" — `animate-pop` (already used elsewhere
              for this exact shape of transition) is the closest existing
              match rather than a new keyframe for one tap gesture. */}
          <img
            key={plantSpecies}
            src={`/plant-${SPECIES_PREFIX[plantSpecies]}${displayStage}.png`}
            alt=""
            className="w-[86px] h-[152px] object-contain block animate-pop"
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="flex items-baseline gap-[5px]">
                <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">{dayStreak}</span>
                <span className="text-[12px] font-bold text-white/[0.86]">day streak</span>
              </p>
              <p className="mt-[5px] text-[10.5px] text-white/[0.66]">{todayState?.met ?? 0} of 4 goals done today</p>
            </div>
            <span className="text-[9.5px] font-bold text-white bg-white/20 rounded-full px-[9px] py-1 whitespace-nowrap shrink-0">This week</span>
          </div>

          <div className="flex items-start gap-px mt-[11px] pt-[11px] border-t border-white/[0.24]">
            {days.map((d, i) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
                <span className={`text-[8px] tracking-[.1em] ${d.isToday ? "font-extrabold text-white" : "font-bold text-white/[0.62]"}`}>
                  {WEEKDAY_CAPS[i]}
                </span>
                <span className="h-[22px] flex items-center justify-center">
                  <img
                    src={d.isFuture || d.met === 0 ? "/leaf-faint.png" : d.earned ? "/leaf-full.png" : "/leaf-bright.png"}
                    alt=""
                    className="w-[21px] h-[21px] object-contain block"
                  />
                </span>
                <span className="flex gap-[2px]">
                  {Array.from({ length: 4 }, (_, dot) => (
                    <span
                      key={dot}
                      className="w-1 h-1 rounded-full"
                      style={{ background: dot < d.met ? "#fff" : "rgba(255,255,255,.3)" }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
