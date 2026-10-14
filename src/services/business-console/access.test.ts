import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAccess, cleanPermissions, laneOf, seatCan, seatMeets, staffAreas, type EmploymentRow } from "./access.ts";

const emp = (over: Partial<EmploymentRow> = {}): EmploymentRow => ({
  business_id: "b1",
  permissions: ["members"],
  accepted_at: "2026-10-01T00:00:00Z",
  role: "front_desk",
  ...over,
});
const names = new Map([
  ["b1", { name: "Friend Fitness", type: "gym" }],
  ["b2", { name: "Flow Studio", type: "studio" }],
]);

describe("console access (B7)", () => {
  it("the owned business wins and can do everything", () => {
    const a = buildAccess({ id: "own", business_name: "Mine", business_type: "gym" }, [emp()], names, "b1");
    assert.equal(a.current?.businessId, "own");
    assert.equal(a.current?.isOwner, true);
    assert.ok(seatCan(a.current, "revenue"));
    assert.ok(seatMeets(a.current, "owner"));
    assert.equal(a.seats.length, 2);
  });

  it("an unaccepted employment, or one with no permissions, is no seat", () => {
    const a = buildAccess(null, [emp({ accepted_at: null }), emp({ business_id: "b2", permissions: [] })], names, null);
    assert.equal(a.current, null);
    assert.deepEqual(a.seats, []);
  });

  it("staff get the chosen seat, else the first, with only their permissions", () => {
    const rows = [emp(), emp({ business_id: "b2", permissions: ["schedule", "venues"], role: "manager" })];
    const chosen = buildAccess(null, rows, names, "b2");
    assert.equal(chosen.current?.businessName, "Flow Studio");
    assert.ok(seatCan(chosen.current, "venues"));
    assert.ok(!seatCan(chosen.current, "members"));
    assert.ok(!seatMeets(chosen.current, "owner"));
    assert.equal(buildAccess(null, rows, names, "gone").current?.businessId, "b1");
  });

  it("unknown permission strings never widen access", () => {
    assert.deepEqual(cleanPermissions(["members", "admin", "members", "venues"]), ["members", "venues"]);
  });

  it("staff areas follow the permissions and the business type", () => {
    const a = buildAccess(null, [emp({ permissions: ["front_desk", "members"] })], names, null);
    const keys = staffAreas(a.current!).map((x) => x.key);
    assert.deepEqual(keys, ["members", "frontdesk", "team"]);
    assert.equal(laneOf("studio"), "classes");
    assert.equal(laneOf("supplement_store"), "store");
    assert.equal(laneOf(null), "unknown");
  });
});
