import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseShareCard } from "./shareCards";

test("programme_share reads the allowlisted keys", () => {
  const c = parseShareCard([{ kind: "programme_share", payload: { template_id: "t1", name: " Strength A ", duration_weeks: 4, exercise_count: "12", note: "" } }]);
  assert.deepEqual(c, { kind: "programme_share", templateId: "t1", name: "Strength A", durationWeeks: 4, exerciseCount: 12, note: null, playlistUrl: null });
});

test("session_share reads title, start, length, place and its event", () => {
  const c = parseShareCard({ kind: "session_share", payload: { title: "Group run", starts_at: "2026-10-17T06:00:00Z", duration_min: 60, location: "Park" } });
  assert.deepEqual(c, { kind: "session_share", title: "Group run", startsAt: "2026-10-17T06:00:00Z", durationMin: 60, location: "Park", note: null, eventId: null, playlistUrl: null });
  const withEvent = parseShareCard({ kind: "session_share", payload: { title: "Group run", event_id: "e1" } });
  assert.equal(withEvent?.kind === "session_share" && withEvent.eventId, "e1");
});

test("meal_plan_share reads name, days and note, and nothing else", () => {
  const c = parseShareCard({ kind: "meal_plan_share", payload: { meal_plan_id: "p1", name: "Simple week", days: 7, note: "Try this one", kcal_target: 2200, protein_pct: 30 } });
  assert.deepEqual(c, { kind: "meal_plan_share", mealPlanId: "p1", name: "Simple week", days: 7, note: "Try this one", playlistUrl: null });
});

const SPOTIFY = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";

test("Round E: playlist_share reads the link, title and note", () => {
  const c = parseShareCard({ kind: "playlist_share", payload: { playlist_url: SPOTIFY, playlist_service: "spotify", title: " Leg day ", note: "Loud one" } });
  assert.deepEqual(c, { kind: "playlist_share", playlistUrl: SPOTIFY, title: "Leg day", note: "Loud one" });
  const bare = parseShareCard({ kind: "playlist_share", payload: { playlist_url: SPOTIFY } });
  assert.deepEqual(bare, { kind: "playlist_share", playlistUrl: SPOTIFY, title: null, note: null });
  // A link the shared rule refuses is no card at all.
  assert.equal(parseShareCard({ kind: "playlist_share", payload: { playlist_url: "https://evil.example/x" } }), null);
  assert.equal(parseShareCard({ kind: "playlist_share", payload: { title: "No link" } }), null);
});

test("Round E: the other cards carry their parent's playlist when it had one", () => {
  const p = parseShareCard({ kind: "programme_share", payload: { template_id: "t1", name: "Strength A", playlist_url: SPOTIFY, playlist_service: "spotify" } });
  assert.equal(p?.kind === "programme_share" && p.playlistUrl, SPOTIFY);
  const s = parseShareCard({ kind: "session_share", payload: { title: "Run", playlist_url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" } });
  assert.equal(s?.kind === "session_share" && s.playlistUrl, null);
  const m = parseShareCard({ kind: "meal_plan_share", payload: { meal_plan_id: "p1", name: "Week", playlist_url: "https://music.apple.com/us/album/abbey-road-remastered/1441164426" } });
  assert.equal(m?.kind === "meal_plan_share" && m.playlistUrl, "https://music.apple.com/us/album/abbey-road-remastered/1441164426");
});

test("other kinds and broken payloads are not share cards", () => {
  assert.equal(parseShareCard({ kind: "plans_offer", payload: { plans: [] } }), null);
  assert.equal(parseShareCard({ kind: "programme_share", payload: {} }), null);
  assert.equal(parseShareCard({ kind: "meal_plan_share", payload: { days: 3 } }), null);
  assert.equal(parseShareCard(null), null);
  assert.equal(parseShareCard([]), null);
});
