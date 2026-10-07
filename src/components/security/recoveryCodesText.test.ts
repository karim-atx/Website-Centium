import { test } from "node:test";
import assert from "node:assert/strict";
import { recoveryCodesClipboard, recoveryCodesFile } from "./recoveryCodesText.ts";

test("Copy all puts one code per line, dropping blanks", () => {
  assert.equal(recoveryCodesClipboard([" AAAA-BBBB", "CCCC-DDDD ", "", "  "]), "AAAA-BBBB\nCCCC-DDDD");
  assert.equal(recoveryCodesClipboard([]), "");
});

test("Download is a header, a blank line, then the same codes", () => {
  const file = recoveryCodesFile(["AAAA-BBBB", "CCCC-DDDD"]);
  const lines = file.split("\n");
  assert.equal(lines[0], "Centium recovery codes");
  assert.equal(lines[2], "");
  assert.deepEqual(lines.slice(3, 5), ["AAAA-BBBB", "CCCC-DDDD"]);
  assert.ok(file.endsWith("\n"));
});
