import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ar from "./ar/index.ts";
import { ENERGY_LABEL, FLOW_LABEL, MOOD_LABEL, MUCUS_LABEL, SETTINGS_CONTRACEPTION_SET_UP } from "../services/cycle/guidance.ts";
import { EVENT_LABEL, PACK_ACTIVE } from "../services/contraception/guidance.ts";

// The cycle and contraception labels shown through tx(label, context): the
// catalogue test reads literal keys only, so these maps are checked here.
const CONTEXT_LABELS: [string, Record<string | number, string>][] = [
  ["flow", FLOW_LABEL],
  ["mood", MOOD_LABEL],
  ["energy", ENERGY_LABEL],
  ["mucus", MUCUS_LABEL],
  ["contraception", EVENT_LABEL],
  ["pill pack", { active: PACK_ACTIVE }],
  ["action", { setUp: SETTINGS_CONTRACEPTION_SET_UP }],
];

describe("cycle labels shown with a context", () => {
  for (const [context, labels] of CONTEXT_LABELS) {
    it(context, () => {
      const missing = Object.values(labels).filter((l) => !(`${l}|${context}` in ar));
      assert.deepEqual(missing, []);
    });
  }
});
