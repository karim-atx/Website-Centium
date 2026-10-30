import { appLocale } from "../../i18n/format";
// MO1.8 #64 / MO1.8.13 O11: the time zone label "(GMT±HH:MM) City", from
// the engine's own data (Intl), with the offset in force right now (so it is
// DST-aware). The board shows Rio Branco as GMT-03:00; it is -05:00, and this
// formatter prints the real offset (V6-149). Offsets are not clock times, so
// they stay ±HH:MM in every locale (MO1.8 O8).

/** Minutes east of UTC for `zone` at `at`, or null when the engine can't say. */
export function zoneOffsetMinutes(zone: string, at: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat(appLocale("en-US"), {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    if (!Number.isFinite(asUtc)) return null;
    const whole = Math.floor(at.getTime() / 1000) * 1000;
    return Math.round((asUtc - whole) / 60000);
  } catch {
    return null;
  }
}

/** "+03:00" / "-05:00" / "+05:45". */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** The city: the last IANA segment, "_" as a space ("America/Rio_Branco" → "Rio Branco"). */
export function zoneCity(zone: string): string {
  if (zone === "UTC" || zone === "Etc/UTC") return "UTC";
  const last = zone.split("/").pop() ?? zone;
  return last.replace(/_/g, " ");
}

/** "(GMT+03:00) Riyadh". A zone the engine can't resolve shows its city only. */
export function zoneDisplay(zone: string, at: Date = new Date()): string {
  const minutes = zoneOffsetMinutes(zone, at);
  const city = zoneCity(zone);
  return minutes === null ? city : `(GMT${formatOffset(minutes)}) ${city}`;
}

export interface ZoneOption {
  zone: string;
  label: string;
  city: string;
}

/**
 * The wheel's list (MO1.8.13 K1, K2, O11): the engine's zones sorted by city
 * A–Z, Etc/* hidden unless stored, and a stored zone the engine doesn't list
 * inserted at its city position (it would otherwise vanish from its own
 * picker). Where the engine can't list zones, the stored and device zones.
 */
export function buildZoneOptions(
  all: string[],
  stored: string | null,
  device: string | null,
  at: Date = new Date()
): ZoneOption[] {
  const base = all.length > 0 ? all : ([stored, device].filter(Boolean) as string[]);
  const zones = new Set(base.filter((z) => !z.startsWith("Etc/") || z === stored));
  if (stored) zones.add(stored);
  return [...zones]
    .map((zone) => ({ zone, label: zoneDisplay(zone, at), city: zoneCity(zone) }))
    .sort((a, b) => a.city.localeCompare(b.city, "en") || a.zone.localeCompare(b.zone, "en"));
}

/**
 * MO1.8.13 S1: case-insensitive match on the city and on the full IANA name
 * ("Ri" → Riga, Riyadh, Rio Branco, Rio de Janeiro; "Asia" or "America/Sao"
 * work too). Matches from the start of a word or a zone segment, so "Ri"
 * doesn't pull in every "America/…" zone.
 */
export function filterZones(options: ZoneOption[], query: string): ZoneOption[] {
  const q = query.trim().toLowerCase().replace(/_/g, " ");
  if (!q) return options;
  // Rank: city starts with it, then a later word of the city, then the zone
  // name; A–Z within each (so "Ri" puts Riga, Rio Branco, Riyadh first).
  const rank = (o: ZoneOption): number => {
    const city = o.city.toLowerCase();
    const zone = o.zone.toLowerCase().replace(/_/g, " ");
    if (city.startsWith(q)) return 0;
    if (city.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
    const segs = zone.split("/");
    return segs.some((_, i) => segs.slice(i).join("/").startsWith(q)) ? 2 : -1;
  };
  const ranked = options.map((o) => ({ o, r: rank(o) })).filter((x) => x.r >= 0);
  return ranked.sort((a, b) => a.r - b.r).map((x) => x.o);
}
