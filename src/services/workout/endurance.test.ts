import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkPlan, serializePlan } from "./endurance.ts";
import type { EndurancePlan } from "../../types";

// The client-side mirror of valid_endurance_plan(). Each case names the SQL
// rule it stands for, so a drift between the two has somewhere to be noticed.

const steady = (over: Partial<EndurancePlan> = {}): EndurancePlan => ({
  version: 1,
  main: { type: "steady", step: { measure: "time", seconds: 600, target: { kind: "open" } } },
  ...over,
});

const accepted: { name: string; plan: EndurancePlan }[] = [
  { name: "a bare steady plan", plan: steady() },
  {
    name: "warm-up, intervals and cool-down",
    plan: {
      version: 1,
      warmup: { measure: "time", seconds: 600, target: { kind: "open" } },
      main: {
        type: "intervals",
        repeats: 6,
        work: { measure: "distance", meters: 800, target: { kind: "pace", min_sec_per_km: 260, max_sec_per_km: 270 } },
        recovery: { measure: "time", seconds: 120, target: { kind: "open" }, mode: "jog" },
      },
      cooldown: { measure: "time", seconds: 600, target: { kind: "open" } },
    },
  },
  {
    name: "a pace band with both ends equal",
    plan: steady({
      main: {
        type: "steady",
        step: { measure: "distance", meters: 5000, target: { kind: "pace", min_sec_per_km: 300, max_sec_per_km: 300 } },
      },
    }),
  },
  { name: "the zone bounds", plan: steady({ main: { type: "steady", step: { measure: "time", seconds: 60, target: { kind: "hr_zone", zone: 5 } } } }) },
  { name: "the effort bounds", plan: steady({ main: { type: "steady", step: { measure: "time", seconds: 60, target: { kind: "rpe", value: 10 } } } }) },
];

for (const c of accepted) {
  test(`checkPlan accepts: ${c.name}`, () => assert.equal(checkPlan(c.plan), null));
}

const refused: { name: string; plan: EndurancePlan; expect: RegExp }[] = [
  {
    name: "a zero-second step (SQL: seconds > 0)",
    plan: steady({ main: { type: "steady", step: { measure: "time", seconds: 0, target: { kind: "open" } } } }),
    expect: /time longer than zero/,
  },
  {
    name: "a fractional distance (SQL: meters = floor(meters))",
    plan: steady({ main: { type: "steady", step: { measure: "distance", meters: 800.5, target: { kind: "open" } } } }),
    expect: /distance longer than zero/,
  },
  {
    name: "zone 6 (SQL: zone between 1 and 5)",
    plan: steady({ main: { type: "steady", step: { measure: "time", seconds: 60, target: { kind: "hr_zone", zone: 6 } } } }),
    expect: /1 to 5/,
  },
  {
    name: "effort 11 (SQL: value between 1 and 10)",
    plan: steady({ main: { type: "steady", step: { measure: "time", seconds: 60, target: { kind: "rpe", value: 11 } } } }),
    expect: /1 to 10/,
  },
  {
    name: "a backwards pace band (SQL: min <= max)",
    plan: steady({
      main: {
        type: "steady",
        step: { measure: "distance", meters: 800, target: { kind: "pace", min_sec_per_km: 300, max_sec_per_km: 260 } },
      },
    }),
    expect: /faster pace goes first/,
  },
  {
    name: "101 repeats (SQL: repeats between 1 and 100)",
    plan: steady({
      main: {
        type: "intervals",
        repeats: 101,
        work: { measure: "time", seconds: 60, target: { kind: "open" } },
        recovery: { measure: "time", seconds: 60, target: { kind: "open" } },
      },
    }),
    expect: /1 to 100/,
  },
  {
    name: "a bad warm-up is caught before the main set",
    plan: steady({ warmup: { measure: "time", seconds: 0, target: { kind: "open" } } }),
    expect: /^Warm-up/,
  },
  {
    name: "a bad cool-down is caught too",
    plan: steady({ cooldown: { measure: "distance", meters: 0, target: { kind: "open" } } }),
    expect: /^Cool-down/,
  },
];

for (const c of refused) {
  test(`checkPlan refuses: ${c.name}`, () => {
    const problem = checkPlan(c.plan);
    assert.ok(problem, "expected a problem");
    assert.match(problem, c.expect);
  });
}

test("serializePlan drops keys the validator counts", () => {
  // The editor keeps a zone around while "None" is selected, and both a
  // seconds and a meters while the measure is being switched. Either would be
  // rejected by valid_endurance_target/step, which check key COUNTS.
  const messy = {
    version: 1,
    warmup: null,
    main: {
      type: "steady",
      step: {
        measure: "time",
        seconds: 600,
        meters: 800,
        target: { kind: "open", zone: 3, value: 7 },
      },
    },
    cooldown: null,
  } as unknown as EndurancePlan;

  assert.deepEqual(serializePlan(messy), {
    version: 1,
    main: { type: "steady", step: { measure: "time", seconds: 600, target: { kind: "open" } } },
  });
});

test("serializePlan keeps a recovery mode and omits an absent one", () => {
  const plan: EndurancePlan = {
    version: 1,
    main: {
      type: "intervals",
      repeats: 4,
      work: { measure: "time", seconds: 60, target: { kind: "rpe", value: 9 } },
      recovery: { measure: "time", seconds: 90, target: { kind: "open" }, mode: "walk" },
    },
  };
  const out = serializePlan(plan);
  assert.equal(out.main.type, "intervals");
  if (out.main.type !== "intervals") return;
  assert.equal(out.main.recovery.mode, "walk");
  assert.equal("mode" in out.main.work, false);
});

test("serializePlan omits warmup and cooldown rather than nulling them", () => {
  const out = serializePlan(steady());
  assert.equal("warmup" in out, false);
  assert.equal("cooldown" in out, false);
});
