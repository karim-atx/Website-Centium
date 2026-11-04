import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { anyCentiumMethod, entryMethodsProblem, maskExternalId, normalizeExternalId, systemNameForSave, toEntrySystem, type EntryMethods } from "./entrySystem.ts";

const m = (o: Partial<EntryMethods> = {}): EntryMethods => ({ qr: true, passCode: true, nfc: false, bluetooth: false, system: "none", systemName: null, ...o });

describe("entry methods", () => {
  it("needs a Centium method or an own system", () => {
    assert.equal(entryMethodsProblem(m()), null);
    assert.notEqual(entryMethodsProblem(m({ qr: false, passCode: false })), null);
    assert.equal(entryMethodsProblem(m({ qr: false, passCode: false, system: "kisi" })), null);
    assert.equal(anyCentiumMethod(m({ qr: false, passCode: false, nfc: true })), true);
  });

  it("needs a name for other, one line of up to 80", () => {
    assert.notEqual(entryMethodsProblem(m({ system: "other", systemName: "  " })), null);
    assert.equal(entryMethodsProblem(m({ system: "other", systemName: "DoorLink" })), null);
    assert.notEqual(entryMethodsProblem(m({ system: "key_cards", systemName: "a\nb" })), null);
    assert.notEqual(entryMethodsProblem(m({ system: "key_cards", systemName: "x".repeat(81) })), null);
  });

  it("saves no name for none, and trims", () => {
    assert.equal(systemNameForSave(m({ system: "none", systemName: "Old" })), null);
    assert.equal(systemNameForSave(m({ system: "salto", systemName: "  Front door " })), "Front door");
    assert.equal(systemNameForSave(m({ system: "salto", systemName: " " })), null);
  });

  it("reads an unknown value as none", () => {
    assert.equal(toEntrySystem("kisi"), "kisi");
    assert.equal(toEntrySystem("door"), "none");
    assert.equal(toEntrySystem(null), "none");
  });
});

describe("external ID", () => {
  it("trims, treats blank as no ID, refuses over 64 or a second line", () => {
    assert.equal(normalizeExternalId("  A1 "), "A1");
    assert.equal(normalizeExternalId("   "), null);
    assert.equal(normalizeExternalId("x".repeat(64)), "x".repeat(64));
    assert.equal(normalizeExternalId("x".repeat(65)), false);
    assert.equal(normalizeExternalId("a\nb"), false);
  });

  it("masks to the last 4", () => {
    assert.equal(maskExternalId("CARD-88231"), "•••• 8231");
    assert.equal(maskExternalId("812"), "812");
    assert.equal(maskExternalId(null), null);
  });
});
