import type { HealthMetric, HealthMetricPoint } from "../../types";

// Turning stored readings into the shape the Health and Home widgets draw.
//
// PURE, AND SEPARATE FROM ./index.ts, which opens a Supabase client. Every
// rule below — what counts as a trend, when a sparkline may be drawn, what an
// average is an average OF — is a decision about honesty rather than about
// fetching, and a test of it should not need a database.
//
// WHAT THIS REPLACES. `healthMetrics` in data/mockHealthData.ts: five metrics
// each carrying a seven-value literal (`[107.6, 107.3, …]`), a `current` and a
// `trend`, with real dates stapled on so a chart labelled "last 7 days" was
// the last 7 days of invented numbers. Every sparkline, every weekly average
// and every "↓ 0.6 kg this week" on both Home and Health came from there.

/** The app-side name for each metric, and how it is stored and shown. */
export interface MetricMeta {
  /** The public.health_metrics enum value. */
  dbType: "weight" | "water" | "heart_rate" | "steps" | "sleep" | "calories_burned";
  label: string;
  unit: string;
  /** Decimal places when the value is written out. Steps are whole. */
  precision: number;
  /**
   * True when the value is SHOWN as a duration rather than a decimal.
   *
   * Sleep is the only one, and it needs its own flag because `precision`
   * would otherwise round an intermediate value before the h/m conversion
   * reads it: a real average of 7.25 h rounds to 7.3 and then formats as
   * "7h18", three minutes of sleep nobody had. Durations are rounded once,
   * at the last step, by formatMetric.
   */
  duration?: boolean;
}

export const HEALTH_METRIC_META: Record<HealthMetric["type"], MetricMeta> = {
  weight: { dbType: "weight", label: "Weight", unit: "kg", precision: 1 },
  heartRate: { dbType: "heart_rate", label: "Heart Rate", unit: "bpm", precision: 0 },
  steps: { dbType: "steps", label: "Steps", unit: "steps", precision: 0 },
  sleep: { dbType: "sleep", label: "Sleep", unit: "h", precision: 1, duration: true },
  water: { dbType: "water", label: "Water", unit: "ml", precision: 0 },
  caloriesBurned: { dbType: "calories_burned", label: "Calories burned", unit: "kcal", precision: 0 },
};

/** Day-keyed readings, one value per local day — the shape getHealthMetrics returns. */
export type MetricSeries = Record<string, number>;

/**
 * A metric with real readings behind it.
 *
 * `current` and `trend` are NULLABLE and that is the whole point. The mock
 * shape typed both as plain numbers, so every consumer that had nothing to
 * show reached for a zero — and a zero is a reading. `?? 0` on a trend is how
 * a client who had never stepped on a scale came to be shown "↓ 0 kg"
 * (a8499e4): nought is not greater than nought, so the arrow always pointed
 * down. Null travels instead, and each widget decides what to render in its
 * absence.
 */
export interface MetricReadings {
  type: HealthMetric["type"];
  label: string;
  unit: string;
  /** Oldest first, one point per day that actually has a reading. */
  history: HealthMetricPoint[];
  /** The most recent reading, or null when there are none. */
  current: number | null;
  /** Last minus first across the window. Null under two readings. */
  trend: number | null;
}

/**
 * The minimum number of readings a line may be drawn through.
 *
 * TWO, because one point is not a trend and not a shape. A single reading
 * drawn as a sparkline is a flat line implying a week of measurements that
 * were never taken, and as a "trend" it is a comparison against itself.
 */
export const MIN_POINTS_FOR_TREND = 2;

/**
 * Builds one metric's readings from its day-keyed series.
 *
 * ONLY REAL DAYS APPEAR. A week is not padded out to seven points, and a day
 * without a reading is not carried forward from the day before or filled with
 * a zero — it is simply absent, so a fortnightly weigh-in draws two points a
 * fortnight apart rather than fourteen, twelve of which nobody measured.
 */
export function buildMetricReadings(
  type: HealthMetric["type"],
  series: MetricSeries | undefined
): MetricReadings {
  const meta = HEALTH_METRIC_META[type];
  const history: HealthMetricPoint[] = Object.entries(series ?? {})
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const current = history.length > 0 ? history[history.length - 1].value : null;
  const trend =
    history.length >= MIN_POINTS_FOR_TREND
      ? round(history[history.length - 1].value - history[0].value, meta.precision)
      : null;

  return { type, label: meta.label, unit: meta.unit, history, current, trend };
}

/** True when there are enough real points to draw a line through. */
export function canDrawSparkline(readings: MetricReadings): boolean {
  return readings.history.length >= MIN_POINTS_FOR_TREND;
}

/**
 * The mean of the readings that exist, or null when there are none.
 *
 * AVERAGED OVER DAYS THAT HAVE A READING, never over the length of the window.
 * Dividing three weigh-ins by seven days reports a number nobody weighed, and
 * for steps it would quietly halve a real average by counting unmeasured days
 * as zero-step days.
 */
export function averageOf(readings: MetricReadings, precision?: number): number | null {
  if (readings.history.length === 0) return null;
  const sum = readings.history.reduce((total, point) => total + point.value, 0);
  const meta = HEALTH_METRIC_META[readings.type];
  // A duration is rounded once, by formatMetric, for the reason on
  // MetricMeta.duration.
  const places = precision ?? (meta.duration ? 6 : meta.precision);
  return round(sum / readings.history.length, places);
}

/** The readings inside a day window ending today, oldest first. */
export function withinDays(
  readings: MetricReadings,
  days: number,
  today: string
): MetricReadings {
  const cutoff = shiftDay(today, -(days - 1));
  const history = readings.history.filter((p) => p.date >= cutoff);
  const meta = HEALTH_METRIC_META[readings.type];
  return {
    ...readings,
    history,
    current: history.length > 0 ? history[history.length - 1].value : null,
    trend:
      history.length >= MIN_POINTS_FOR_TREND
        ? round(history[history.length - 1].value - history[0].value, meta.precision)
        : null,
  };
}

/**
 * How a trend is spoken, or nothing at all.
 *
 * NO ARROW OVER NOTHING. Returns null both when there is no trend to report
 * and when the change is exactly zero — an unchanged weight is worth saying
 * plainly, never as "↑ 0 kg", and a fabricated direction is worse than a
 * missing one.
 */
export function trendLabel(readings: MetricReadings, period = "this week"): string | null {
  if (readings.trend === null) return null;
  if (readings.trend === 0) return `No change ${period}`;
  const arrow = readings.trend > 0 ? "↑" : "↓";
  const meta = HEALTH_METRIC_META[readings.type];
  const size = round(Math.abs(readings.trend), meta.precision);
  return `${arrow} ${formatNumber(size, meta.precision)} ${meta.unit} ${period}`;
}

/** The headline number, written the way its metric is written. */
export function formatMetric(type: HealthMetric["type"], value: number): string {
  const meta = HEALTH_METRIC_META[type];
  if (type === "sleep") {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }
  if (meta.precision === 0) return Math.round(value).toLocaleString();
  return formatNumber(value, meta.precision);
}

/** What a card says where a number would go, when there is no reading. */
export const NO_READINGS = "No readings yet";

/**
 * The invitation under an empty card.
 *
 * ONLY WHERE THE USER CAN ACT. Weight and water have a manual-entry sheet, so
 * an empty card can point at it. Steps, sleep, heart rate and calories burned
 * have no entry path anywhere in this app and no device sync behind them
 * either, so there is nothing truthful to tell somebody to do — an empty card
 * for those says it is empty and stops.
 */
export function emptyHint(type: HealthMetric["type"]): string | null {
  if (type === "weight") return "Log your weight to start tracking";
  if (type === "water") return "Log what you drink to start tracking";
  return null;
}

// --- small shared helpers -----------------------------------------------------

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number, places: number): string {
  return places === 0 ? String(Math.round(value)) : String(round(value, places));
}

/** yyyy-mm-dd arithmetic in UTC, so it never lands on a neighbouring date. */
function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}
