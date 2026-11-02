// B10 · the Dashboard's Gym pieces (DA1-007 at a glance, DA1-009 early,
// DA1-010 empty; OURS-DA-gym-gauges #1 Entries). Pure, so node --test loads it.
//
// Data: desk_summary (Entries today, Right now), desk_entries (today's list
// and the hourly bars), venue_busy_times (the 4-week usual for "vs usual" and
// "Peak at"), and the venue's admitted check-ins per day for the petals
// (gym_check_ins, this week and last). Names: the Dashboard is not the desk,
// so a member shows by the masked label the members list carries ("Member
// #0042" unless shared, HANDOVER §4), never desk_entries' first name; a guest
// or a walk-in reads "Guest".

import { DENIED_LABEL, hourBins, hourCounts, hourShort, peakHour, rightNowLabel, type DeskSummary, type Entry } from "../../services/front-desk/frontDeskLogic";
import { clock12 } from "../../utils/time12";
import { t, tx } from "../../i18n/core";

export interface DashGym {
  summary: DeskSummary;
  /** Today's entries at the venue, newest first. */
  entries: Entry[];
  /** venue_busy_times(gym, 4): grid[weekday - 1][hour]. */
  busy: number[][];
  /** Admitted entries per local day (YYYY-MM-DD), this week and last. */
  days: Record<string, number>;
  /** Today's gym_hours row, or null when none is published. */
  todayHours: { closed: boolean; open_24h: boolean; opens_at: string | null; closes_at: string | null } | null;
}

export type GymBox = { value: string; label: string; delta?: string; tone?: "good" | "warn" | "bad" | "faint" };

export interface GymTodayModel {
  kind: "gym";
  boxes: GymBox[];
  bars: { h: number; label: string }[];
  hi: number;
  recent: { id: string; title: string; detail: string; pill: { text: string; tone: "good" | "bad" } }[];
  tip: string | null;
}

/** Ever any entry here (this week, last week, today, or in the 4-week averages). */
export function gymHasEntries(g: DashGym): boolean {
  return g.entries.length > 0 || Object.values(g.days).some((n) => n > 0) || g.busy.some((row) => row.some((v) => v > 0));
}

/** The usual count by now on this weekday: whole past hours plus the share of this one. */
export function usualSoFar(busy: number[][], now: Date): number {
  const row = busy[((now.getDay() + 6) % 7)] ?? [];
  const h = now.getHours();
  let sum = 0;
  for (let i = 0; i < h; i++) sum += row[i] ?? 0;
  return sum + (row[h] ?? 0) * (now.getMinutes() / 60);
}

const hourClock = (h: number) => clock12(new Date(2000, 0, 1, h, 0)).replace(":00", "");

/** DA1-007 row 6 detail: "{plan} · 6:42 PM", "Day pass · …", "Membership expired · …". */
export function dashEntryDetail(e: Entry): string {
  const at = clock12(e.at);
  if (e.result === "denied") return `${e.reason === "expired" ? t("Membership expired") : t(DENIED_LABEL[e.reason ?? "no_pass"])} · ${at}`;
  if (e.isDayPass) return `${t("Day pass")} · ${at}`;
  if (!e.personId) return `${t("Guest")} · ${at}`;
  return e.planName ? `${e.planName} · ${at}` : at;
}

/**
 * DA1-007: boxes Entries today ("+n vs usual"), Right now (Quiet / Steady /
 * Busy, "Peak at 6 PM"; no history = "–" with "Not enough data yet", never
 * "Quiet": HANDOVER_API B10), Renewals due; "Busy times today" bars, one per
 * opening hour; "Recent entries" (3). Early (DA1-009: no 4-week history):
 * no deltas, and the tip.
 */
export function gymTodayModel(g: DashGym, renewalsDue: number | null, labelOf: (personId: string) => string | null, now: Date): GymTodayModel {
  const s = g.summary;
  const early = s.rightNow === null;
  const usual = Math.round(usualSoFar(g.busy, now));
  const diff = s.entriesToday - usual;
  const peak = peakHour(g.busy[((now.getDay() + 6) % 7)] ?? []);
  const entryHours = [...new Set(g.entries.filter((e) => e.result === "in").map((e) => new Date(e.at).getHours()))];
  const hours = hourCounts(g.entries, hourBins(g.todayHours, entryHours, now.getHours()));
  const max = Math.max(0, ...hours.map((h) => h.count));
  return {
    kind: "gym",
    boxes: [
      {
        value: String(s.entriesToday),
        label: t("Entries today"),
        delta: early ? undefined : diff === 0 ? t("As usual") : t("{delta} vs usual", { delta: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}` }),
        tone: diff < 0 ? "warn" : "good",
      },
      s.rightNow === null
        ? { value: "–", label: t("Right now"), delta: rightNowLabel(null), tone: "faint" }
        : { value: rightNowLabel(s.rightNow), label: t("Right now"), delta: peak === null ? undefined : t("Peak at {time}", { time: hourClock(peak) }), tone: "good" },
      renewalsDue === null ? { value: "–", label: t("Renewals due") } : { value: String(renewalsDue), label: t("Renewals due"), delta: t("In the next 7 days"), tone: "warn" },
    ],
    bars: hours.map((h, i) => ({ h: max > 0 ? Math.round((h.count / max) * 100) : 0, label: i % 2 === 0 ? hourShort(h.hour) : "" })),
    hi: hours.findIndex((h) => h.hour === now.getHours()),
    recent: g.entries.slice(0, 3).map((e) => ({
      id: e.id,
      title: e.personId ? labelOf(e.personId) ?? t("Member") : e.result === "denied" && !e.isDayPass && !e.isGuest ? t("Unknown pass") : t("Guest"),
      detail: dashEntryDetail(e),
      pill: e.result === "in" ? { text: tx("In", "entry"), tone: "good" } : { text: t("Denied"), tone: "bad" },
    })),
    tip: early ? t("Busy times sharpen after two weeks of entries.") : null,
  };
}

/** OURS-DA-gym-gauges #1: entries per day this week, last week's ghost bars; sub "{Quiet|Steady|Busy} now". */
export function gymEntriesGauge(g: DashGym, week: string[], lastWeek: string[], today: string) {
  const vals = week.map((d) => g.days[d] ?? 0);
  const last = lastWeek.map((d) => g.days[d] ?? 0);
  const todayIdx = week.indexOf(today);
  const total = vals.slice(0, todayIdx + 1).reduce((a, b) => a + b, 0);
  const rn = g.summary.rightNow;
  return {
    spec: { kind: "petals" as const, vals, last, today: todayIdx },
    empty: false,
    label: t("Entries"),
    sub: rn === null ? t("This week") : t("{busy} now", { busy: rightNowLabel(rn) }),
    subTone: "good" as const,
    target: total,
    format: String,
  };
}
