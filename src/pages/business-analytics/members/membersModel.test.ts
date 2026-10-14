import { test } from "node:test";
import assert from "node:assert/strict";
import { activeValue, pagesOf, vocabOf } from "./membersModel.ts";

test("members: Growth's Active members comes from business_people for gyms only", () => {
  const gym = pagesOf("gym");
  const growth = gym.find((p) => p.key === "growth")!;
  assert.equal(activeValue(growth, vocabOf("gym"), { activeTotal: 1240 }), "1,240");
  assert.equal(activeValue(growth, vocabOf("gym"), { activeTotal: null }), null);
  assert.equal(activeValue(gym.find((p) => p.key === "first90")!, vocabOf("gym"), { activeTotal: 3 }), null);
  const classesGrowth = pagesOf("classes").find((p) => p.key === "growth")!;
  assert.equal(activeValue(classesGrowth, vocabOf("classes"), { activeTotal: 3 }), null);
});
