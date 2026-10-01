import { strict as assert } from "node:assert";
import { test } from "node:test";
import { groupSources, SOURCE_GROUPS, type ClinicalSource } from "./groups.ts";

const s = (key: string, feature: string, sortOrder: number, year: number | null = null): ClinicalSource => ({
  key,
  feature,
  organisation: "Org",
  title: key,
  url: `https://example.org/${key}`,
  sortOrder,
  year,
});

test("groups in the page's order, each by sort_order, with neutral headings", () => {
  const groups = groupSources([
    s("figo", "cycle", 10),
    s("ada", "labs", 20),
    s("kdigo", "labs", 30, 2024),
    s("bjgp", "monitoring", 130, 2024),
    s("aha_home", "blood_pressure", 70),
    s("aha", "blood_pressure", 60),
    s("ace", "exercise", 160),
    s("cosrh", "contraception", 170),
    s("acog", "pregnancy", 90),
  ]);
  assert.deepEqual(
    groups.map((g) => g.heading),
    ["Blood pressure", "Lab results", "Health checks", "Cycle", "Contraception", "Pregnancy", "Exercise"]
  );
  assert.deepEqual(groups[0].sources.map((x) => x.key), ["aha", "aha_home"]);
  assert.deepEqual(groups[1].sources.map((x) => x.key), ["ada", "kdigo"]);
});

test("no heading names the mode; an unknown feature is shown last, never dropped", () => {
  assert.ok(SOURCE_GROUPS.every((g) => !/monitor|advanced/i.test(g.heading)));
  const groups = groupSources([s("a", "labs", 1), s("new", "nutrition", 5)]);
  assert.deepEqual(groups.map((g) => g.heading), ["Lab results", "Other sources"]);
  assert.equal(groups.flatMap((g) => g.sources).length, 2);
});
