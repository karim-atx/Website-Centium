import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNearby } from "./model.ts";

// Shapes captured from professionals_in_area in a rolled-back psql (Release B, 20261217020000).
const ROWS = [
  { professional_id: "a1", first_name: "Rami", avatar_url: null, professional_subtype: "coach_instructor", specialty: null, location: "Beirut", headline: "Coach", bio: null, skills: [], monthly_rate: null, consultation_rate: null, payment_modalities: [], average_rating: null, review_count: null, has_verified_licence: false, approx_lat: 33.9, approx_lng: 35.48, area_label: "Hamra", distance_band: "under 2 km", band_rank: 1, work_mode: "in_person", service_radius_km: 10, session_places: ["in_clinic"], is_online_only: false, has_area: true, country_code: "LB" },
  { professional_id: "a2", first_name: "Dana", avatar_url: null, professional_subtype: "dietitian", specialty: null, location: "Beirut", headline: null, bio: null, skills: [], monthly_rate: null, consultation_rate: null, payment_modalities: [], average_rating: null, review_count: null, has_verified_licence: true, approx_lat: null, approx_lng: null, area_label: null, distance_band: "online", band_rank: 7, work_mode: "online", service_radius_km: 25, session_places: [], is_online_only: true, has_area: false, country_code: "LB" },
];

test("parseNearby: a row with a point is a pin; one without is an online result; the cursor is the last row", () => {
  const page = parseNearby(ROWS);
  assert.deepEqual(page.professionals.map((p) => [p.profileId, p.lat, p.lng, p.workMode, p.countryCode]), [["a1", 33.9, 35.48, "in_person", "LB"]]);
  assert.deepEqual(page.online.map((p) => [p.profileId, p.isOnlineOnly, p.hasArea, p.reviewCount]), [["a2", true, false, 0]]);
  assert.equal("lat" in page.online[0]!, false);
  assert.deepEqual(page.last, { band: 7, id: "a2" });
  assert.equal(page.count, 2);
  assert.deepEqual(parseNearby([]), { professionals: [], online: [], last: null, count: 0 });
});
