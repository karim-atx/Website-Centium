import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { playlistSaveError, type PlaylistService } from "./playlistLink";
import type { MusicMoment, MusicPrefs } from "./whichMusic";

// Round E · "Your music" (Database 20261224040000): on app_preferences, the
// member's own row (app_preferences_select_own; no professional, business or
// public read). music_service is the chosen app; music_<moment>_playlist_url
// the favourite for workout, mind, sleep and cooking (the service beside each
// is generated). Most members have no row: no row means nothing chosen.
//
// The columns are newer than the generated types, so this boundary reads
// through an untyped view of the client (as business-market does).
const db = typed as unknown as SupabaseClient;

export const MUSIC_MOMENTS: { key: MusicMoment; label: string }[] = [
  { key: "workout", label: "Workout" },
  { key: "mind", label: "Mind" },
  { key: "sleep", label: "Sleep" },
  { key: "cooking", label: "Cooking" },
];

const COLS = "music_service, music_workout_playlist_url, music_mind_playlist_url, music_sleep_playlist_url, music_cooking_playlist_url";

type Row = {
  music_service: PlaylistService | null;
  music_workout_playlist_url: string | null;
  music_mind_playlist_url: string | null;
  music_sleep_playlist_url: string | null;
  music_cooking_playlist_url: string | null;
};

const toPrefs = (r: Row | null): MusicPrefs => ({
  service: r?.music_service ?? null,
  favourites: {
    workout: r?.music_workout_playlist_url ?? null,
    mind: r?.music_mind_playlist_url ?? null,
    sleep: r?.music_sleep_playlist_url ?? null,
    cooking: r?.music_cooking_playlist_url ?? null,
  },
});

export async function fetchMusicPrefs(): Promise<MusicPrefs | null> {
  const { data, error } = await db.from("app_preferences").select(COLS).maybeSingle();
  if (error) {
    console.error("[music] Could not read Your music:", error.code, error.message);
    return null;
  }
  return toPrefs((data as Row | null) ?? null);
}

export type MusicPatch = { service?: PlaylistService | null } & Partial<Record<MusicMoment, string | null>>;

/** Saves part of "Your music". Update first, insert if there's no row (see setHideReadReceipts). */
export async function saveMusicPrefs(ownerId: string, patch: MusicPatch): Promise<{ ok: true; prefs: MusicPrefs } | { ok: false; message: string }> {
  const row: Record<string, string | null> = {};
  if ("service" in patch) row.music_service = patch.service ?? null;
  for (const m of ["workout", "mind", "sleep", "cooking"] as const) if (m in patch) row[`music_${m}_playlist_url`] = patch[m] || null;
  const fail = (code: string | undefined, message: string) => {
    console.error("[music] Could not save Your music:", code, message);
    return { ok: false as const, message: playlistSaveError(code) ?? "Couldn't save that. Try again." };
  };
  const updated = await db.from("app_preferences").update(row).eq("owner_id", ownerId).select(COLS);
  if (updated.error) return fail(updated.error.code, updated.error.message);
  if (updated.data && updated.data.length > 0) return { ok: true, prefs: toPrefs(updated.data[0] as Row) };
  const inserted = await db.from("app_preferences").insert({ owner_id: ownerId, ...row }).select(COLS).single();
  if (!inserted.error) return { ok: true, prefs: toPrefs(inserted.data as Row) };
  if (inserted.error.code === "23505") {
    const retry = await db.from("app_preferences").update(row).eq("owner_id", ownerId).select(COLS);
    if (!retry.error && retry.data?.length) return { ok: true, prefs: toPrefs(retry.data[0] as Row) };
  }
  return fail(inserted.error.code, inserted.error.message);
}

// One read per page load, shared by every screen that shows "Play your music".
let cached: Promise<MusicPrefs | null> | null = null;
const listeners = new Set<(p: MusicPrefs | null) => void>();

export function loadMusicPrefs(): Promise<MusicPrefs | null> {
  if (!cached) {
    cached = fetchMusicPrefs();
    void cached.then((p) => p === null && (cached = null));
  }
  return cached;
}

/** After a save: every mounted screen sees the new choice. */
export function publishMusicPrefs(p: MusicPrefs) {
  cached = Promise.resolve(p);
  listeners.forEach((l) => l(p));
}

export function subscribeMusicPrefs(l: (p: MusicPrefs | null) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
