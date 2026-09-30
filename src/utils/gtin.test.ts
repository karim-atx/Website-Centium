import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeGtin } from "./gtin.ts";

// Every expected value here was produced by public.normalize_gtin on the
// local database, so the client and the database agree code for code.
const FROM_DATABASE: [string, string | null][] = [
  ["5012345678900", "5012345678900"],
  ["012345678905", "0012345678905"],
  ["12345678905", null],
  ["01234565", "0012345000065"],
  ["96385074", "0000096385074"],
  ["00123456789012", "0123456789012"],
  ["10123456789019", null],
  ["5012345678901", null],
  ["abc", null],
  ["501-2345 678900", "5012345678900"],
  ["04210009", "0000004210009"],
  ["01234533", null],
  ["01234574", null],
  ["0123456789012", "0123456789012"],
  ["", null],
];

test("normalizeGtin matches public.normalize_gtin", () => {
  for (const [input, expected] of FROM_DATABASE) assert.equal(normalizeGtin(input), expected, input);
});
