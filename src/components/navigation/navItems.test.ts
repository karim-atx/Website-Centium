import { test } from "node:test";
import assert from "node:assert/strict";
import { businessTabs, isBusinessTabActive } from "./navItems";

const lit = (kind: Parameters<typeof businessTabs>[0], path: string) =>
  businessTabs(kind)
    .filter((t) => isBusinessTabActive(t, path))
    .map((t) => t.label);

test("Memberships lights Marketplace, as B-MA.5 draws it; the front-desk routes keep Front desk", () => {
  assert.deepEqual(lit("gym", "/app/business/gym"), ["Marketplace"]);
  assert.deepEqual(lit("gym", "/app/business/gym/plans/abc"), ["Marketplace"]);
  assert.deepEqual(lit("gym", "/app/business/marketplace"), ["Marketplace"]);
  assert.deepEqual(lit("gym", "/app/business/operations"), ["Front desk"]);
  assert.deepEqual(lit("gym", "/app/business/classes"), ["Front desk"]);
  assert.deepEqual(lit("gym", "/app/business/venue"), ["Front desk"]);
  assert.deepEqual(lit("classes", "/app/business/classes/xyz"), ["Schedule"]);
  assert.deepEqual(lit("store", "/app/business/products"), ["Products"]);
  assert.deepEqual(lit("gym", "/app/business/redeem"), ["Marketplace"]);
  assert.deepEqual(lit("store", "/app/business/redeem"), ["Products"]);
  assert.deepEqual(lit("gym", "/app/business/hiring"), ["Marketplace"]);
  assert.deepEqual(lit("classes", "/app/business/hiring/team"), ["Marketplace"]);
  assert.deepEqual(lit("gym", "/app/business/notifications"), ["Marketplace"]);
});

test("the professional's Marketplace lights More, as P-MA draws it", async () => {
  const { proTabs, isProTabActive } = await import("./navItems");
  for (const lane of ["full_coaching", "nutrition", "clinical_overview"] as const) {
    const lit = (path: string) => proTabs(lane).filter((t) => isProTabActive(t, path)).map((t) => t.label);
    assert.deepEqual(lit("/app/pro/marketplace/overview"), ["More"]);
    assert.deepEqual(lit("/app/pro/marketplace/offers/new"), ["More"]);
    assert.deepEqual(lit("/app/pro"), ["Home"]);
  }
});
