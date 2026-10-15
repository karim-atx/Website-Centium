// Release 3 W1: the lane mapping, the navbar slot and the old-route redirects.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Constants } from "../../../lib/supabase/database.types";
import { LANE_FOR_TYPE, SLOT4, laneForType, legacyProRedirect, pickTab, slotRouteFor, CLIENT_TABS, LIBRARY_TABS } from "./subtypeLanes";

/**
 * THE SQL MAPPING FIXTURE: public.subtype_for_type as it stands on the local
 * stack (Database 20261124000000, read with pg_get_functiondef on 15 Oct 2026).
 * If the database function changes, paste the new body here: this test then
 * fails until LANE_FOR_TYPE agrees with it.
 */
const SUBTYPE_FOR_TYPE_SQL = `
  select case p_type
           when 'trainer'          then 'full_coaching'
           when 'physiotherapist'  then 'full_coaching'
           when 'coach_instructor' then 'full_coaching'
           when 'other'            then 'full_coaching'
           when 'dietitian'        then 'nutrition'
           when 'nutritionist'     then 'nutrition'
           when 'doctor'           then 'clinical_overview'
         end;
`;

test("LANE_FOR_TYPE mirrors subtype_for_type exactly", () => {
  const sql = Object.fromEntries([...SUBTYPE_FOR_TYPE_SQL.matchAll(/when '(\w+)'\s+then '(\w+)'/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual({ ...LANE_FOR_TYPE }, sql);
});

test("every professional_subtype enum value has a lane", () => {
  for (const t of Constants.public.Enums.professional_subtype) {
    assert.ok(LANE_FOR_TYPE[t], `no lane for ${t}`);
  }
  assert.equal(Object.keys(LANE_FOR_TYPE).length, Constants.public.Enums.professional_subtype.length);
});

test("decision mapping: other is Full coaching, never closest_group; no type reads as Full coaching", () => {
  assert.equal(laneForType("other"), "full_coaching");
  assert.equal(laneForType("physiotherapist"), "full_coaching");
  assert.equal(laneForType("doctor"), "clinical_overview");
  assert.equal(laneForType(null), "full_coaching");
});

test("navbar slot 4: Library, Meal plans, Insights", () => {
  assert.equal(SLOT4.full_coaching.label, "Library");
  assert.equal(SLOT4.nutrition.label, "Meal plans");
  assert.equal(SLOT4.clinical_overview.label, "Insights");
});

test("old professional routes redirect by lane", () => {
  assert.equal(legacyProRedirect("/app/professionals", "nutrition"), "/app/pro/clients");
  assert.equal(legacyProRedirect("/app/professionals/calendar", "clinical_overview"), "/app/pro/calendar");
  assert.equal(legacyProRedirect("/app/professionals/templates", "full_coaching"), "/app/pro/library/programmes");
  assert.equal(legacyProRedirect("/app/professionals/meal-plans", "full_coaching"), "/app/pro/library/meal-plans");
  assert.equal(legacyProRedirect("/app/professionals/meal-plans", "nutrition"), "/app/pro/meal-plans");
  assert.equal(legacyProRedirect("/app/professionals/templates", "clinical_overview"), "/app/pro/insights");
  assert.equal(legacyProRedirect("/app/professionals/health-metrics", "clinical_overview"), "/app/pro/insights");
  assert.equal(legacyProRedirect("/app/professionals/health-metrics", "full_coaching"), "/app/more/practice-insights");
});

test("a lane never lands on another lane's slot", () => {
  assert.equal(slotRouteFor("full_coaching", "library"), null);
  assert.equal(slotRouteFor("nutrition", "library"), "/app/pro/meal-plans");
  assert.equal(slotRouteFor("clinical_overview", "meal-plans"), "/app/pro/insights");
  assert.equal(slotRouteFor("full_coaching", "meal-plans"), "/app/pro/library/meal-plans");
  assert.equal(slotRouteFor("nutrition", "insights"), "/app/pro/clients");
  assert.equal(slotRouteFor("clinical_overview", "insights"), null);
});

test("tabs fall back to the lane's first", () => {
  assert.equal(pickTab(LIBRARY_TABS, undefined), "programmes");
  assert.equal(pickTab(CLIENT_TABS.clinical_overview, "plan"), "overview");
  assert.equal(pickTab(CLIENT_TABS.full_coaching, "notes"), "notes");
});

// FINAL_PLAN W1 rule: all professional time output goes through utils/time12.ts
// and all week grids through utils/week.ts. This greps the professional folders
// for the patterns that bypass them.
test("professional code has no 24-hour formats or Sunday-first weeks", () => {
  const roots = [path.join(process.cwd(), "src/pages/pro"), path.join(process.cwd(), "src/components/pro")];
  const files: string[] = [];
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".test.ts")) files.push(p);
    }
  };
  roots.forEach(walk);
  const bad: string[] = [];
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    if (/hour12\s*:\s*false/.test(s)) bad.push(`${f}: hour12: false`);
    if (/["'`]HH:mm/.test(s)) bad.push(`${f}: HH:mm`);
    if (/\[\s*["'](Sun|Sunday|S)["']\s*,\s*["'](Mon|Monday|M)["']/.test(s)) bad.push(`${f}: Sunday-first week`);
  }
  assert.deepEqual(bad, []);
});

test("shared component rules: ring status, conflicts, lock line", async () => {
  const { ringStatus, conflictBlocks, lockLineText } = await import("./proRules");
  assert.equal(ringStatus(70), "good");
  assert.equal(ringStatus(69), "watch");
  assert.equal(ringStatus(40), "watch");
  assert.equal(ringStatus(39), "poor");
  assert.equal(conflictBlocks("allergy_confirmed"), true);
  assert.equal(conflictBlocks("allergy_check"), false);
  assert.equal(conflictBlocks("restriction"), false);
  assert.equal(lockLineText("Lab results", "Sam"), "Lab results not shared, so hidden. Sam can change this any time.");
});
