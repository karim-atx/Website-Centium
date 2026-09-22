import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { PlantSpecies } from "../../context/AppContext";
import { mondayFirstWeek } from "../../utils/week";
import { localDayOf } from "../../utils/date";

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
  const {
    today,
    foodLog,
    waterByDate,
    workoutLog,
    journalEntries,
    plantStage,
    setPlantStage,
    plantSpecies,
    cyclePlantSpecies,
    user,
    setUser,
  } = useApp();
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
  //
  // Dates are serialised with `localDayOf`, not `.toISOString()` — the
  // latter converts to UTC first, which shifts every date back a day for
  // anyone east of UTC (e.g. Beirut, UTC+3) and misaligns the streak from
  // the weekday it's paired with. Today is `continue`d past rather than
  // `break`ing the loop when it isn't earned yet: today is very often
  // not-yet-earned whenever this runs (most of the day, until the last
  // sub-goal lands), and breaking there zeroed the streak most mornings
  // even when yesterday's run was intact. Only a completed PAST day that
  // wasn't earned actually ends the streak.
  let dayStreak = 0;
  {
    const cursor = new Date(`${today}T00:00:00`);
    for (;;) {
      const d = localDayOf(cursor);
      const subGoals = [
        foodLog.some((e) => e.date === d),
        (waterByDate[d] ?? 0) > 0,
        workoutLog.some((w) => w.date === d && w.completed),
        journalEntries.some((e) => e.date === d),
      ].filter(Boolean).length;
      if (subGoals < 2) {
        if (d === today) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
      dayStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const earnedThisWeek = days.filter((d) => !d.isFuture && d.earned).length;

  // Flower stage: one stage per earned day this week, capped at 7. Once it
  // reaches 7 it stays fully coloured into later weeks for as long as the
  // day streak above has stayed unbroken since the day it got there — a new
  // Monday does not reset it. Today is always pending and neither breaks
  // nor extends that carryover on its own; only a completed PAST day that
  // wasn't earned ends it (this replaces the old permanent high-water-mark
  // formula `Math.max(plantStage, earnedThisWeek)`, which could never fall
  // back down even after a later broken streak).
  const wasFull = user.plantFullSince != null;
  let streakUnbroken = wasFull;
  if (wasFull) {
    const fullSince = user.plantFullSince as string;
    const cursor = new Date(`${today}T00:00:00`);
    for (;;) {
      const d = localDayOf(cursor);
      if (d < fullSince) break; // walked back past the day it became full without a break
      if (d !== today && !dayState(d).earned) {
        streakUnbroken = false;
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Clamped to a minimum of 1: at earnedThisWeek === 0 this would otherwise
  // compute stage 0 and request `/plant-${prefix}0.png`, which has no
  // corresponding asset under public/ for any species (only stage1..7
  // exist) — a real broken-image bug, not a cosmetic one.
  const displayStage = wasFull && streakUnbroken ? 7 : Math.max(1, Math.min(7, earnedThisWeek));
  useEffect(() => {
    if (displayStage !== plantStage) setPlantStage(displayStage);
  }, [displayStage, plantStage, setPlantStage]);

  // `plantFullSince` — persisted on the account/user record, not a
  // device-local `usePersistentState` key like `plantStage`, so carryover
  // survives a device change or reinstall — records the day the flower most
  // recently reached stage 7. Set the first time it gets there; cleared the
  // moment the streak backing it breaks, so a later climb back to 7 starts a
  // fresh carryover window instead of reusing a stale date.
  useEffect(() => {
    if (displayStage === 7 && user.plantFullSince == null) {
      setUser((prev) => ({ ...prev, plantFullSince: today }));
    } else if (wasFull && !streakUnbroken) {
      setUser((prev) => ({ ...prev, plantFullSince: null }));
    }
  }, [displayStage, wasFull, streakUnbroken, today, user.plantFullSince, setUser]);

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
