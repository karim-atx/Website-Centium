// Where to get support, and the self-harm phrase list for the on-device check
// (Round C Release 2). The lines are Karim's: Embrace Lifeline 1564, 112 and
// the Red Cross 140 in Lebanon; elsewhere the local emergency number and
// findahelpline.com.

import { EMERGENCY_NUMBERS } from "../health-checks/guidance";
import type { Phrase } from "./normalise";

export type SupportPlace = "lebanon" | "elsewhere";

export const HELPLINE_DIRECTORY = "https://findahelpline.com";

/**
 * Lebanon when the notice names it (country_code, known for professionals),
 * else when the device is on Beirut time, as the health-check warning card
 * decides it.
 */
export function supportPlace(countryCode: string | null | undefined, timezone: string | null | undefined): SupportPlace {
  if (countryCode) return countryCode.toUpperCase() === "LB" ? "lebanon" : "elsewhere";
  return timezone === EMERGENCY_NUMBERS.lebanon.timezone ? "lebanon" : "elsewhere";
}

export function supportLines(place: SupportPlace): {
  numbers: { name: string; number: string }[];
  local: boolean;
  directory: string;
} {
  if (place === "lebanon")
    return {
      numbers: [
        { name: "Embrace Lifeline", number: "1564" },
        { name: "Emergency", number: "112" },
        { name: "Red Cross", number: "140" },
      ],
      local: false,
      directory: HELPLINE_DIRECTORY,
    };
  return { numbers: [], local: true, directory: HELPLINE_DIRECTORY };
}

/** self_harm_phrases()'s rows → the matcher's phrases (anything unreadable is skipped). */
export function parsePhrases(data: unknown): Phrase[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => (r ?? {}) as { normalised?: unknown; language?: unknown })
    .filter((r) => typeof r.normalised === "string" && r.normalised.trim())
    .map((r) => ({ normalised: String(r.normalised).trim(), language: typeof r.language === "string" ? r.language : "en" }));
}
