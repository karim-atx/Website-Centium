/**
 * Task T: which time zone the profile should hold. Pure, so it is tested
 * without a browser or a server.
 *
 * profiles.timezone is the one zone the app writes (Database 20261007000000),
 * and profiles.timezone_chosen_at (20261007010000) says whether a person
 * picked it by hand: null means the zone follows the device, set means it is
 * theirs and the device must not overwrite it.
 */

export interface ProfileTimezone {
  timezone: string | null;
  /** When the user picked the zone by hand; null = follows the device. */
  chosenAt: string | null;
}

/**
 * The zone to write from the device on load, or null for "leave it alone".
 *
 * Only while the zone follows the device (chosenAt null), and only when it is
 * missing or the device reports something different. A device that cannot
 * say (null) never writes: a guess must not replace a real answer.
 */
export function deviceZoneUpdate(stored: ProfileTimezone, device: string | null): string | null {
  if (!device) return null;
  if (stored.chosenAt !== null) return null;
  if (stored.timezone === device) return null;
  return device;
}

/** "Asia/Beirut" as "Asia/Beirut", readable: underscores become spaces. */
export function zoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}
