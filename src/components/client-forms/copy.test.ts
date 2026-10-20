import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { consentLine } from "./copy.ts";

describe("client forms consent line", () => {
  it("names photos and measurements, or photos only when recovery mode hides the measurements", () => {
    assert.equal(consentLine("Rami", "check_in"), "Your answers go to Rami when you send. Rami sees your photos and measurements with this check-in only.");
    assert.equal(consentLine("Rami", "check_in", true), "Your answers go to Rami when you send. Rami sees your photos with this check-in only.");
    assert.equal(consentLine("Dana", "intake", true), "Your answers go to Dana when you send. Dana sees your photos with this form only.");
  });
});
