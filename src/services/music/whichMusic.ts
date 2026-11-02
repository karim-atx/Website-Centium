import { playlistServiceOf, SERVICE_HOME, type PlaylistService } from "./playlistLink";
import { getLanguage, t } from "../../i18n/core";

/**
 * Round E · which music a screen shows, in the agreed order:
 *   1. the professional's or gym's playlist ("{name}'s playlist", "House playlist");
 *   2. the item's own (a member's routine, a recipe, a meal plan);
 *   3. the member's favourite for the moment (Settings › Your music);
 *   4. "open your music app" (the chosen app's home; or, with none chosen,
 *      the way to Settings › Your music).
 * The first that exists is shown. When a professional's or gym's playlist
 * and the member's own favourite both exist, BOTH are shown: "{name}'s
 * playlist" first, then "Your music".
 */

export type MusicMoment = "workout" | "mind" | "sleep" | "cooking";

export interface MusicPrefs {
  /** The member's music app, or null (not chosen). */
  service: PlaylistService | null;
  favourites: Partial<Record<MusicMoment, string | null>>;
}

export type MusicEntry =
  | { kind: "playlist"; url: string; heading: string; whose: "provider" | "item" | "member" }
  | { kind: "open_app"; service: PlaylistService; url: string }
  | { kind: "choose_app" };

export interface MusicSources {
  /** The professional's or gym's playlist and the heading it shows under. */
  provider?: { url: string | null | undefined; heading: string } | null;
  /** The item's own playlist (routine, recipe, meal plan). */
  item?: { url: string | null | undefined; heading: string } | null;
  moment: MusicMoment;
  prefs: MusicPrefs | null;
}

const usable = (url: string | null | undefined): url is string => !!url && playlistServiceOf(url) !== null;

export function whichMusic({ provider, item, moment, prefs }: MusicSources): MusicEntry[] {
  const favourite = prefs?.favourites[moment];
  const own: MusicEntry | null = usable(favourite) ? { kind: "playlist", url: favourite, heading: t("Your music"), whose: "member" } : null;
  if (provider && usable(provider.url)) {
    const first: MusicEntry = { kind: "playlist", url: provider.url, heading: provider.heading, whose: "provider" };
    return own ? [first, own] : [first];
  }
  if (item && usable(item.url)) return [{ kind: "playlist", url: item.url, heading: item.heading, whose: "item" }];
  if (own) return [own];
  return [prefs?.service ? { kind: "open_app", service: prefs.service, url: SERVICE_HOME[prefs.service] } : { kind: "choose_app" }];
}

/** "Rana's playlist" from a first name (or the whole name when that's all there is). */
export function providerHeading(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  if (!first) return t("Playlist");
  // English drops the s after a name ending in s ("James' playlist"); other languages use the key.
  return getLanguage() === "en" && /s$/i.test(first) ? `${first}' playlist` : t("{name}'s playlist", { name: first });
}
