import { strict as assert } from "node:assert";
import { test } from "node:test";
import { freePeriodBlocksConnecting, freePeriodLine, type FreePeriodFacts } from "./freePeriodCopy.ts";

const now = new Date("2026-10-05T12:00:00Z");
const free = (endsAt: string, may = true): FreePeriodFacts => ({
  source: "default",
  freePeriodEndsAt: endsAt,
  mayConnectClients: may,
});

test("counts whole days left, rounded up", () => {
  assert.equal(freePeriodLine(free("2026-10-17T12:00:00Z"), now), "Free plan: 12 days left to connect clients");
  assert.equal(freePeriodLine(free("2026-10-17T11:00:00Z"), now), "Free plan: 12 days left to connect clients");
  assert.equal(freePeriodLine(free("2026-10-06T11:00:00Z"), now), "Free plan: 1 day left to connect clients");
});

test("the last hours still read 1 day, never 0", () => {
  assert.equal(freePeriodLine(free("2026-10-05T12:30:00Z"), now), "Free plan: 1 day left to connect clients");
});

test("nothing to count for a paid or seated professional, or once it has ended", () => {
  assert.equal(freePeriodLine({ ...free("2026-10-17T12:00:00Z"), source: "own_subscription" }, now), null);
  assert.equal(freePeriodLine({ ...free("2026-10-17T12:00:00Z"), source: "business_seat" }, now), null);
  assert.equal(freePeriodLine(free("2026-10-01T12:00:00Z", false), now), null);
  assert.equal(freePeriodLine(null, now), null);
});

test("blocks connecting exactly when the database says it may not", () => {
  assert.equal(freePeriodBlocksConnecting(free("2026-10-01T12:00:00Z", false)), true);
  assert.equal(freePeriodBlocksConnecting(free("2026-10-17T12:00:00Z", true)), false);
  // A paid professional whose old date has passed can still connect.
  assert.equal(
    freePeriodBlocksConnecting({ source: "own_subscription", freePeriodEndsAt: "2026-01-01T00:00:00Z", mayConnectClients: true }),
    false
  );
  assert.equal(freePeriodBlocksConnecting(null), false);
});
