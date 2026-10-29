import { strict as assert } from "node:assert";
import { test } from "node:test";
import { playlistFieldMessage, playlistLinkProblem, playlistServiceOf, tidyPlaylistInput } from "./playlistLink.ts";

// The server's own examples (Database 20261224020000), so the two rules can't drift.
const CASES: [string, string | null][] = [
  ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", null],
  ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=1a2b3c4d5e6f", null],
  ["https://open.spotify.com/intl-fr/album/4aawyAB9vmqN3uQ7FjRGTy", null],
  ["https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb", null],
  ["https://music.apple.com/lb/playlist/pl.u-8aAVZAoFZ8rBjK", null],
  ["https://music.apple.com/us/album/abbey-road-remastered/1441164426", null],
  ["https://music.apple.com/gb/album/1441164426?l=en", null],
  ["https://music.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI", null],
  ["https://music.youtube.com/playlist?list=OLAK5uy_kRWmJ5pGU2bS7sNsYI0IPfr9hiUEjcz4o&si=x", null],
  ["https://music.youtube.com/browse/MPREb_BQZvl3BFGay", null],
  ["http://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN0"],
  ["open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN0"],
  ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M ", "ATXN0"],
  ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=" + "a".repeat(480), "ATXN0"],
  ["javascript:alert(1)", "ATXN0"],
  ["https://evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN1"],
  ["https://open.spotify.com.evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN1"],
  ["https://user@open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN1"],
  ["https://open.spotify.com:8443/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN1"],
  ["https://Open.Spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", "ATXN1"],
  ["https://spotify.link/abc123", "ATXN1"],
  ["https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI", "ATXN1"],
  ["https://soundcloud.com/x/sets/y", "ATXN1"],
  ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "ATXN2"],
  ["https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF", "ATXN2"],
  ["https://open.spotify.com/playlist/short", "ATXN2"],
  ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M#x", "ATXN2"],
  ["https://music.apple.com/us/album/abbey-road-remastered/1441164426?i=1441164430", "ATXN2"],
];

test("the same answers as the server's rule", () => {
  for (const [url, want] of CASES) assert.equal(playlistLinkProblem(url), want, url);
  assert.equal(playlistLinkProblem(""), null);
  assert.equal(playlistLinkProblem(null), null);
});

test("the service is derived from the link", () => {
  assert.equal(playlistServiceOf(CASES[0][0]), "spotify");
  assert.equal(playlistServiceOf(CASES[3][0]), "apple_music");
  assert.equal(playlistServiceOf(CASES[7][0]), "youtube_music");
  assert.equal(playlistServiceOf("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"), null);
});

test("pasted links are tidied the way a person means them, nothing more", () => {
  assert.equal(tidyPlaylistInput("  https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M \n"), "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  assert.equal(tidyPlaylistInput("open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"), "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  assert.equal(tidyPlaylistInput("http://music.apple.com/us/album/x/1"), "https://music.apple.com/us/album/x/1");
  assert.equal(tidyPlaylistInput("https://evil.example/x"), "https://evil.example/x");
});

test("the field names the service, or says what's wrong", () => {
  assert.deepEqual(playlistFieldMessage("https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy"), { ok: true, service: "spotify", label: "Spotify album" });
  assert.deepEqual(playlistFieldMessage("https://music.youtube.com/playlist?list=PLx"), { ok: true, service: "youtube_music", label: "YouTube Music playlist" });
  const track = playlistFieldMessage("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
  assert.equal(track?.ok, false);
  assert.match((track as { message: string }).message, /Spotify link, but not a playlist or an album/);
  assert.match((playlistFieldMessage("https://spotify.link/abc") as { message: string }).message, /Short links/);
  assert.match((playlistFieldMessage("https://www.youtube.com/playlist?list=PLx") as { message: string }).message, /YouTube Music link/);
  assert.match((playlistFieldMessage("https://soundcloud.com/x") as { message: string }).message, /Only Spotify, Apple Music and YouTube Music/);
});
