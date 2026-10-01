import type { BloodMarker } from "../../types";
import {
  CHECKIN_EVERY_DAYS,
  CHECKIN_EVERY_DAYS_AFTER_STOPPING,
  CHECKIN_WEEKLY_MONTHS_AFTER_STOPPING,
  PLAN,
  type Phase,
  type PlanRow,
} from "./guidance";

/** The plan rows for this phase and sex. With no phase chosen yet, every row. */
export function planRowsFor(phase: Phase | null, sex: string | undefined): PlanRow[] {
  return PLAN.filter((r) => (phase === null || r.phases.includes(phase)) && (!r.sex || r.sex === sex));
}

/**
 * "Last checked" for one row, as a YYYY-MM-DD day or null: the newest BP
 * reading, the newest lab panel holding one of the row's markers, or the
 * newest check-in. The pregnancy test is nothing the app records.
 */
export function lastChecked(
  row: PlanRow,
  data: { latestBpDay: string | null; markers: BloodMarker[]; lastCheckIn: string | null }
): string | null {
  switch (row.source.kind) {
    case "bp":
      return data.latestBpDay;
    case "checkin":
      return data.lastCheckIn;
    case "labs": {
      const keys = row.source.markers;
      let newest: string | null = null;
      for (const m of data.markers) {
        if (!m.markerKey || !keys.includes(m.markerKey)) continue;
        const d = m.history[m.history.length - 1]?.date ?? null;
        if (d && (!newest || d > newest)) newest = d;
      }
      return newest;
    }
    default:
      return null;
  }
}

const DAY_MS = 86_400_000;
const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / DAY_MS;

function addMonths(day: string, months: number): string {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1 + months, +day.slice(8, 10)));
  return d.toISOString().slice(0, 10);
}

/** Every 2 weeks; weekly for 3 months after "stopped" was chosen. */
export function checkInEveryDays(phase: Phase | null, stoppedOn: string | null, today: string): number {
  if (phase === "stopped" && stoppedOn && today < addMonths(stoppedOn, CHECKIN_WEEKLY_MONTHS_AFTER_STOPPING)) {
    return CHECKIN_EVERY_DAYS_AFTER_STOPPING;
  }
  return CHECKIN_EVERY_DAYS;
}

/** Due when there has never been one, or the interval has passed since the last. */
export function checkInDue(lastCheckIn: string | null, phase: Phase | null, stoppedOn: string | null, today: string): boolean {
  if (!lastCheckIn) return true;
  return dayNumber(today) - dayNumber(lastCheckIn) >= checkInEveryDays(phase, stoppedOn, today);
}
