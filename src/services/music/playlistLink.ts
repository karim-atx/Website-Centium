/**
 * Round E · the playlist link: one rule for every "Playlist (optional)" field.
 *
 * THE SAME RULE AS THE SERVER (Database 20261224020000, playlist_link_problem):
 * https only, at most 500 characters, the host exactly open.spotify.com,
 * music.apple.com or music.youtube.com, and a playlist or an album. The
 * server is what decides; this copy is for the field to say what's wrong as
 * the member types, in the same three codes. Pure, so it is tested against
 * the server's own examples.
 *
 * No sign-in to any service, nothing read from anyone's account: a link is
 * only ever stored, looked up publicly (services/music/lookup) and opened.
 */

export type PlaylistService = "spotify" | "apple_music" | "youtube_music";
export type PlaylistProblem = "ATXN0" | "ATXN1" | "ATXN2";

export const SERVICE_LABEL: Record<PlaylistService, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
};

/** The services in the order they are offered. */
export const SERVICES: PlaylistService[] = ["spotify", "apple_music", "youtube_music"];

/** Each service's home page: "open your music app" (a universal link opens the app). */
export const SERVICE_HOME: Record<PlaylistService, string> = {
  spotify: "https://open.spotify.com/",
  apple_music: "https://music.apple.com/",
  youtube_music: "https://music.youtube.com/",
};

const HOSTS: Record<string, PlaylistService> = {
  "open.spotify.com": "spotify",
  "music.apple.com": "apple_music",
  "music.youtube.com": "youtube_music",
};

const SPOTIFY = /^https:\/\/open\.spotify\.com\/(intl-[a-z]{2}(-[a-z]{2})?\/)?(playlist|album)\/[A-Za-z0-9]{22}\/?(\?[^#]*)?$/;
const APPLE = /^https:\/\/music\.apple\.com\/[a-z]{2}\/(playlist\/([^/?#]+\/)?pl\.[A-Za-z0-9-]+|album\/([^/?#]+\/)?[0-9]+)\/?(\?[^#]*)?$/;
const YOUTUBE = /^https:\/\/music\.youtube\.com\/(playlist\?([^#]*&)?list=[A-Za-z0-9_-]+(&[^#]*)?|browse\/MPREb_[A-Za-z0-9_-]+\/?(\?[^#]*)?)$/;

/** The host as the server reads it: everything up to the first / ? or #. */
const hostOf = (url: string) => url.match(/^https:\/\/([^/?#]*)/)?.[1] ?? null;

/** null when the link is acceptable (or empty), else the server's code. */
export function playlistLinkProblem(url: string | null | undefined): PlaylistProblem | null {
  if (url === null || url === undefined || url === "") return null;
  if (url.length > 500 || !url.startsWith("https://") || /[\s\p{Cc}\\]/u.test(url)) return "ATXN0";
  const service = HOSTS[hostOf(url) ?? ""];
  if (!service) return "ATXN1";
  if (service === "spotify") return SPOTIFY.test(url) ? null : "ATXN2";
  if (service === "apple_music") return APPLE.test(url) && !/[?&]i=/.test(url) ? null : "ATXN2";
  return YOUTUBE.test(url) ? null : "ATXN2";
}

/** The service of an acceptable link, else null. */
export function playlistServiceOf(url: string | null | undefined): PlaylistService | null {
  if (!url || playlistLinkProblem(url) !== null) return null;
  return HOSTS[hostOf(url) ?? ""] ?? null;
}

/** Whether the link is an album (else a playlist), for the label. */
export function isAlbum(url: string): boolean {
  return /\/album\//.test(url) || /music\.youtube\.com\/browse\/MPREb_/.test(url);
}

/**
 * What a member pasted, tidied the way a person means it: surrounding spaces
 * gone, and a bare "open.spotify.com/…" given its https://. Nothing else is
 * changed: what is left is checked exactly as the server will check it.
 */
export function tidyPlaylistInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^(open\.spotify\.com|music\.apple\.com|music\.youtube\.com)\//i.test(t)) return `https://${t}`;
  if (/^http:\/\/(open\.spotify\.com|music\.apple\.com|music\.youtube\.com)\//i.test(t)) return `https://${t.slice(7)}`;
  return t;
}

/** The field's line for a link: the service it was recognised as, or what's wrong. */
export function playlistFieldMessage(url: string): { ok: true; service: PlaylistService; label: string } | { ok: false; message: string } | null {
  if (!url) return null;
  const problem = playlistLinkProblem(url);
  if (problem === null) {
    const service = playlistServiceOf(url)!;
    return { ok: true, service, label: `${SERVICE_LABEL[service]} ${isAlbum(url) ? "album" : "playlist"}` };
  }
  if (problem === "ATXN0") {
    return { ok: false, message: url.length > 500 ? "That link is too long. Copy the share link from the app." : "Paste the full link, starting with https://" };
  }
  if (problem === "ATXN1") {
    const host = (hostOf(url) ?? "").toLowerCase();
    if (/(^|\.)spotify\.link$|^spoti\.fi$|^youtu\.be$|^(www\.)?youtube\.com$/.test(host)) {
      return {
        ok: false,
        message: host.includes("youtu")
          ? "Use a YouTube Music link (music.youtube.com), not a YouTube one."
          : "Short links can't be checked. Open it in Spotify, then copy the full link.",
      };
    }
    return { ok: false, message: "Only Spotify, Apple Music and YouTube Music links work here." };
  }
  const service = HOSTS[hostOf(url) ?? ""];
  return { ok: false, message: `That's a ${service ? SERVICE_LABEL[service] : "music"} link, but not a playlist or an album.` };
}

/** The server's refusal as a sentence (a save raises ATXN0, ATXN1 or ATXN2). */
export function playlistSaveError(code: string | null | undefined): string | null {
  if (code === "ATXN0") return "Paste the full playlist link, starting with https://";
  if (code === "ATXN1") return "Only Spotify, Apple Music and YouTube Music links work here.";
  if (code === "ATXN2") return "That link isn't a playlist or an album.";
  return null;
}
