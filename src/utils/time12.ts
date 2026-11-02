// The one 12-hour clock (v6 X-14, V6-146): every time the app shows is
// 12-hour, uppercase meridiem after a space, hour unpadded: "8:40 AM",
// "12:05 PM". A range that stays in one half of the day names the meridiem
// once ("6:00 to 7:00 PM"); one that crosses noon or midnight names both
// ("11:30 AM to 1:00 PM"). Stored values are untouched: the database keeps
// "HH:MM" / "HH:MM:SS" `time` columns and timestamps, and this only formats
// them. A 24-hour face appears only where a handover draws an explicit
// 12 / 24 switch (AN1 day clock, MA1-016 hours sheet); those pass their own
// choice and are not this module's concern.
//
// Pure (no DOM, no locale), so node --test loads it and every surface reads
// the same whatever the device's own hour cycle is.
//
// Round G (EH6): the words follow the app's language. The meridiem shown is
// t("AM") / t("PM") (Arabic «ص» / «م»), and a default range reads
// t("{start} to {end}"). The Clock12 / split values keep the raw "AM" / "PM"
// (callers compare them); a caller's own joiner ("–") is kept as given.

import { t } from "../i18n/core";

export type Meridiem = "AM" | "PM";

export interface Clock12 {
  /** 1 to 12. */
  hour: number;
  /** 0 to 59. */
  minute: number;
  meridiem: Meridiem;
}

/** Minutes since midnight from "H:MM", "HH:MM" or "HH:MM:SS"; null when unreadable. */
export function minutesOfDay(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^\s*(\d{1,2}):(\d{1,2})(?::\d{1,2}(?:\.\d+)?)?\s*$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  // "24:00" (a `time` column's end of day) reads as midnight.
  return (h % 24) * 60 + min;
}

/** The 12-hour parts of a minutes-since-midnight value. */
export function clockParts(minutes: number): Clock12 {
  const t = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(t / 60);
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: t % 60, meridiem: h24 < 12 ? "AM" : "PM" };
}

const hm = (p: Clock12) => `${p.hour}:${String(p.minute).padStart(2, "0")}`;

/** "8:40 AM" from minutes since midnight. */
export function formatMinutes12(minutes: number): string {
  const p = clockParts(minutes);
  return `${hm(p)} ${t(p.meridiem)}`;
}

/**
 * "8:40 AM" always in English, for text the app SAVES (openings.schedule_label):
 * stored text never takes the viewer's language.
 */
export function time12En(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const m = minutesOfDay(hhmm);
  if (m === null) return hhmm;
  const p = clockParts(m);
  return `${hm(p)} ${p.meridiem}`;
}

/**
 * "8:40 AM" from a stored "HH:MM" / "HH:MM:SS" time. An empty value gives "";
 * an unreadable one is returned as it came (never invents a time).
 */
export function time12(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const m = minutesOfDay(hhmm);
  return m === null ? hhmm : formatMinutes12(m);
}

/** "8:40 AM" for an instant (a Date or an ISO timestamp), in the device's local time. */
export function clock12(at: Date | string | number): string {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return formatMinutes12(d.getHours() * 60 + d.getMinutes());
}

/**
 * The clock split for a date block that sets the meridiem on its own line
 * (V6-148 Explore: "8:00" with "AM" below).
 */
export function time12Split(hhmm: string | null | undefined): { time: string; meridiem: Meridiem } | null {
  const m = minutesOfDay(hhmm);
  if (m === null) return null;
  const p = clockParts(m);
  return { time: hm(p), meridiem: p.meridiem };
}

/** The same split for an instant, in the device's local time. */
export function clock12Split(at: Date | string | number): { time: string; meridiem: Meridiem } | null {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const p = clockParts(d.getHours() * 60 + d.getMinutes());
  return { time: hm(p), meridiem: p.meridiem };
}

/** A range of minutes since midnight: "6:00 to 7:00 PM", "11:30 AM to 1:00 PM". */
export function rangeMinutes12(start: number, end: number, joiner?: string): string {
  const a = clockParts(start);
  const b = clockParts(end);
  const from = a.meridiem === b.meridiem ? hm(a) : `${hm(a)} ${t(a.meridiem)}`;
  const to = `${hm(b)} ${t(b.meridiem)}`;
  return joiner === undefined ? t("{start} to {end}", { start: from, end: to }) : `${from}${joiner}${to}`;
}

/**
 * A range of stored times: "6:00 to 7:00 PM". With only a start, the start
 * alone; with neither, "". An unreadable end falls back to the start alone.
 */
export function range12(start: string | null | undefined, end: string | null | undefined, joiner?: string): string {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  if (a === null) return b === null ? "" : formatMinutes12(b);
  if (b === null) return formatMinutes12(a);
  return rangeMinutes12(a, b, joiner);
}

/** A range of two instants, in the device's local time. */
export function rangeClock12(start: Date | string | number, end: Date | string | number, joiner?: string): string {
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(a.getTime())) return Number.isNaN(b.getTime()) ? "" : clock12(b);
  if (Number.isNaN(b.getTime())) return clock12(a);
  return rangeMinutes12(a.getHours() * 60 + a.getMinutes(), b.getHours() * 60 + b.getMinutes(), joiner);
}

/**
 * An hour label for a time axis: "6 AM", "12 PM" (no minutes on the hour).
 * `hour` is 0 to 24, 24 reading as midnight.
 */
export function hourLabel12(hour: number): string {
  const p = clockParts(hour * 60);
  return `${p.hour} ${t(p.meridiem)}`;
}
