import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { injuryColumns, injuryMeta, injuryProblem, sortInjuries, type Injury } from "./model";

const TODAY = "2026-10-29";

describe("injuries", () => {
  it("checks a draft against the table's limits", () => {
    assert.equal(injuryProblem({ description: " ", bodyArea: "", since: "" }, TODAY), "Describe the injury.");
    assert.equal(injuryProblem({ description: "x".repeat(301), bodyArea: "", since: "" }, TODAY), "Keep the description under 300 characters.");
    assert.equal(injuryProblem({ description: "Sprain", bodyArea: "y".repeat(61), since: "" }, TODAY), "Keep the body area under 60 characters.");
    assert.equal(injuryProblem({ description: "Sprain", bodyArea: "", since: "2026-10-30" }, TODAY), "Choose a date that isn't in the future.");
    assert.equal(injuryProblem({ description: "Sprain", bodyArea: "Ankle", since: TODAY }, TODAY), null);
  });

  it("writes empty optional fields as null", () => {
    assert.deepEqual(injuryColumns({ description: " Sprain ", bodyArea: " ", since: "" }), { description: "Sprain", body_area: null, since: null });
  });

  it("lists current injuries first, newest first", () => {
    const i = (id: string, status: Injury["status"], createdAt: string): Injury => ({ id, description: id, bodyArea: null, since: null, status, createdAt });
    const list = sortInjuries([i("old", "active", "2026-01-01"), i("healed", "resolved", "2026-09-01"), i("new", "active", "2026-10-01")]);
    assert.deepEqual(list.map((x) => x.id), ["new", "old", "healed"]);
  });

  it("writes the row line", () => {
    assert.equal(injuryMeta({ bodyArea: "Knee", since: "2026-03-01", status: "active" }), "Knee · since 1 Mar 2026");
    assert.equal(injuryMeta({ bodyArea: null, since: null, status: "resolved" }), "healed");
    assert.equal(injuryMeta({ bodyArea: null, since: null, status: "active" }), "");
  });
});
