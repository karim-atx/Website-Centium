import { strict as assert } from "node:assert";
import { test } from "node:test";
import { providerHeading, whichMusic, type MusicPrefs } from "./whichMusic.ts";

const PRO = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";
const ITEM = "https://music.apple.com/us/album/abbey-road-remastered/1441164426";
const FAV = "https://music.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI";
const prefs = (fav: string | null, service: MusicPrefs["service"] = "spotify"): MusicPrefs => ({ service, favourites: { workout: fav } });

test("the professional's or gym's playlist comes first, and the member's own beside it", () => {
  const out = whichMusic({ provider: { url: PRO, heading: "Rana's playlist" }, item: { url: ITEM, heading: "Routine" }, moment: "workout", prefs: prefs(FAV) });
  assert.deepEqual(
    out.map((e) => (e.kind === "playlist" ? e.heading : e.kind)),
    ["Rana's playlist", "Your music"]
  );
  const alone = whichMusic({ provider: { url: PRO, heading: "House playlist" }, moment: "workout", prefs: prefs(null) });
  assert.deepEqual(alone.map((e) => (e.kind === "playlist" ? e.heading : e.kind)), ["House playlist"]);
});

test("then the item's own, then the favourite, then the music app", () => {
  assert.equal((whichMusic({ item: { url: ITEM, heading: "Cook-along" }, moment: "cooking", prefs: prefs(FAV) })[0] as { url: string }).url, ITEM);
  assert.equal((whichMusic({ moment: "workout", prefs: prefs(FAV) })[0] as { url: string }).url, FAV);
  assert.deepEqual(whichMusic({ moment: "workout", prefs: prefs(null, "apple_music") }), [{ kind: "open_app", service: "apple_music", url: "https://music.apple.com/" }]);
  assert.deepEqual(whichMusic({ moment: "sleep", prefs: null }), [{ kind: "choose_app" }]);
});

test("a favourite for another moment doesn't count, and a refused link is ignored", () => {
  assert.equal(whichMusic({ moment: "sleep", prefs: prefs(FAV) })[0].kind, "open_app");
  assert.equal(whichMusic({ provider: { url: "https://evil.example/x", heading: "x" }, moment: "workout", prefs: prefs(null) })[0].kind, "open_app");
});

test("the heading uses the first name", () => {
  assert.equal(providerHeading("Rana Haddad"), "Rana's playlist");
  assert.equal(providerHeading("Charles"), "Charles' playlist");
  assert.equal(providerHeading(""), "Playlist");
});
