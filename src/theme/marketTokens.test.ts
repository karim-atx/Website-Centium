import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../data/folderColors.ts";
import { TIERS_DARK, TIERS_LIGHT, clampRank, tierRank, tierStyle } from "./marketTokens.ts";

const TIERS = [
  { name: "Bronze", sortOrder: 1 },
  { name: "Silver", sortOrder: 2 },
  { name: "Gold", sortOrder: 3 },
  { name: "Platinum", sortOrder: 4 },
  { name: "Diamond", sortOrder: 5 },
];

test("tiers 1-3 are tokens.json verbatim (Bronze, Silver, Gold)", () => {
  assert.deepEqual([TIERS_LIGHT[1].fill, TIERS_LIGHT[1].ink, TIERS_LIGHT[1].border], ["#F3E8DD", "#8B5A2B", "rgba(139,90,43,0.24)"]);
  assert.deepEqual([TIERS_LIGHT[2].fill, TIERS_LIGHT[2].ink, TIERS_LIGHT[2].icon, TIERS_LIGHT[2].track], ["#EEF1F5", "#64748B", "#94A3B8", "rgba(100,116,139,0.16)"]);
  assert.deepEqual([TIERS_LIGHT[3].fill, TIERS_LIGHT[3].ink, TIERS_LIGHT[3].icon, TIERS_LIGHT[3].pill], ["#FDF3D6", "#9A7414", "#F6C445", "rgba(154,116,20,0.12)"]);
});

test("tiers 4-5 follow D-01", () => {
  assert.deepEqual([TIERS_LIGHT[4].fill, TIERS_LIGHT[4].ink, TIERS_LIGHT[4].icon], ["#EEF0F8", "#4F5B85", "#8C96C2"]);
  assert.deepEqual([TIERS_LIGHT[5].fill, TIERS_LIGHT[5].ink, TIERS_LIGHT[5].icon], ["#E6F4F7", "#2F6F80", "#5FB7CC"]);
});

test("tier inks on their fills: D-01 and dark at 4.5:1; the drawn Silver and Gold as drawn (4.20, 3.89), flagged", () => {
  const ratio = (t: { ink: string; fill: string }) => contrastRatio(t.ink, t.fill);
  // Handover colours exactly: the board's Silver and Gold inks sit under 4.5:1
  // on their own fills (W1.md question). They clear 3:1 (large text, icons).
  assert.ok(ratio(TIERS_LIGHT[1]) >= 4.5);
  assert.equal(ratio(TIERS_LIGHT[2]).toFixed(2), "4.20");
  assert.equal(ratio(TIERS_LIGHT[3]).toFixed(2), "3.89");
  for (const r of [4, 5] as const) assert.ok(ratio(TIERS_LIGHT[r]) >= 4.5, `rank ${r}`);
  for (const r of [1, 2, 3, 4, 5] as const) assert.ok(ratio(TIERS_DARK[r]) >= 4.5, `dark rank ${r}`);
});

test("rank comes from point_tiers' order, never the name", () => {
  assert.equal(tierRank(TIERS, "Gold"), 3);
  assert.equal(tierRank(TIERS, "Diamond"), 5);
  // A renamed tier keeps its place.
  assert.equal(tierRank([{ name: "Ember", sortOrder: 10 }, { name: "Ash", sortOrder: 20 }], "Ash"), 2);
  // Unknown or missing: rank 1.
  assert.equal(tierRank(TIERS, "Mythic"), 1);
  assert.equal(tierRank([], "Gold"), 1);
  assert.equal(tierRank(TIERS, null), 1);
});

test("ranks clamp to 1-5", () => {
  assert.equal(clampRank(0), 1);
  assert.equal(clampRank(9), 5);
  assert.equal(clampRank(Number.NaN), 1);
  assert.equal(tierStyle(7, false).rank, 5);
});
