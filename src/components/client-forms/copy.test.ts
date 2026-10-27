import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { consentBox, consentLine } from "./copy.ts";

describe("client forms consent box (Release A)", () => {
  it("names the professional, and reads the fallback mid-sentence", () => {
    assert.equal(consentBox("Rami"), "Share these answers with Rami");
    assert.equal(consentBox("Your professional"), "Share these answers with your professional");
  });
});

describe("client forms consent line", () => {
  it("names photos and measurements when they're shown", () => {
    assert.equal(consentLine("Rami", "check_in"), "Your answers go to Rami when you send. Rami sees your photos and measurements with this check-in only.");
    assert.equal(consentLine("Dana", "intake"), "Your answers go to Dana when you send. Dana sees your photos and measurements with this form only.");
  });

  it("names neither photos nor measurements when recovery mode hides both", () => {
    assert.equal(consentLine("Rami", "check_in", true), "Your answers go to Rami when you send. Rami sees them with this check-in only.");
    assert.equal(consentLine("Dana", "intake", true), "Your answers go to Dana when you send. Dana sees them with this form only.");
    for (const kind of ["check_in", "intake"] as const) assert.doesNotMatch(consentLine("Rami", kind, true), /photo|measurement/i);
  });
});
