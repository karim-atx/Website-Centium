import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUDIENCES, BUSINESS_ANNUAL_NOTE, DEFAULT_BILLING, SAVE_BADGE, annualSaving, formatPrice, priceFor } from "./pricing.ts";

// Centium landing v29, batch 3: the landing's prices live in one config file
// (Karim's figures) and the cards follow one rule for monthly, annual and
// business. These pin both.

const plan = (aud: number, name: string) => {
  const p = AUDIENCES[aud].plans.find((x) => x.name === name);
  assert.ok(p, name + " missing");
  return p;
};

describe("pricing config (Karim's prices)", () => {
  it("has the three audiences in order, with their plans in order", () => {
    assert.deepEqual(
      AUDIENCES.map((a) => a.label),
      ["Individuals", "Professionals", "Businesses"],
    );
    assert.deepEqual(
      AUDIENCES.map((a) => a.plans.map((p) => p.name)),
      [["Free", "Premium"], ["Free", "Starter", "Growth", "Pro", "Unlimited"], ["Business", "Extra seats"]],
    );
  });

  it("carries every monthly and annual figure exactly", () => {
    const figures = AUDIENCES.map((a) => a.plans.map((p) => [p.name, p.monthly, p.annual]));
    assert.deepEqual(figures, [
      [
        ["Free", 0, 0],
        ["Premium", 9.99, 99.99],
      ],
      [
        ["Free", 0, 0],
        ["Starter", 14.99, 149.99],
        ["Growth", 34.99, 349.99],
        ["Pro", 74.99, 749.99],
        ["Unlimited", 99.99, 999.99],
      ],
      [
        ["Business", 29, null],
        ["Extra seats", 59.99, null],
      ],
    ]);
    assert.equal(plan(1, "Free").caption, "1 client");
    assert.equal(plan(2, "Business").caption, "Includes 5 seats");
    assert.equal(plan(2, "Extra seats").caption, "Blocks of 5 seats");
  });

  it("starts on annual billing with the Save 16% badge, and every annual price saves 16%", () => {
    assert.equal(DEFAULT_BILLING, "annual");
    assert.equal(SAVE_BADGE, "Save 16%");
    for (const a of AUDIENCES) for (const p of a.plans) if (p.annual && p.monthly) assert.equal(annualSaving(p), 16, p.name);
  });

  it("recommends Premium, Growth and Business", () => {
    assert.deepEqual(
      AUDIENCES.map((a) => a.plans.filter((p) => p.recommended).map((p) => p.name)),
      [["Premium"], ["Growth"], ["Business"]],
    );
  });

  it("sends plan buttons to the app, business ones to Contact", () => {
    for (const a of AUDIENCES) for (const p of a.plans) assert.equal(p.cta, p.business ? "Talk to us" : "Get Started");
  });
});

describe("the monthly / annual / business rule", () => {
  it("shows the monthly price and 'Billed monthly' under Monthly", () => {
    assert.deepEqual(priceFor(plan(0, "Premium"), "monthly"), { value: 9.99, label: "$9.99", unit: "/ month", note: "Billed monthly", comingSoon: false });
    assert.deepEqual(priceFor(plan(1, "Growth"), "monthly"), { value: 34.99, label: "$34.99", unit: "/ month", note: "Billed monthly", comingSoon: false });
  });

  it("shows the yearly price and 'Billed annually' under Annual", () => {
    assert.deepEqual(priceFor(plan(0, "Premium"), "annual"), { value: 99.99, label: "$99.99", unit: "/ year", note: "Billed annually", comingSoon: false });
    assert.deepEqual(priceFor(plan(1, "Unlimited"), "annual"), { value: 999.99, label: "$999.99", unit: "/ year", note: "Billed annually", comingSoon: false });
  });

  it("keeps free plans at $0, free forever, in both periods", () => {
    for (const bill of ["monthly", "annual"] as const) {
      assert.deepEqual(priceFor(plan(0, "Free"), bill), { value: 0, label: "$0", unit: "", note: "Free forever", comingSoon: false });
      assert.deepEqual(priceFor(plan(1, "Free"), bill), { value: 0, label: "$0", unit: "", note: "Free forever", comingSoon: false });
    }
  });

  it("keeps the business monthly price under Annual and says annual billing is coming soon", () => {
    assert.deepEqual(priceFor(plan(2, "Business"), "annual"), { value: 29, label: "$29", unit: "/ month + revenue share", note: BUSINESS_ANNUAL_NOTE, comingSoon: true });
    assert.equal(BUSINESS_ANNUAL_NOTE, "Annual billing coming soon");
    assert.deepEqual(priceFor(plan(2, "Extra seats"), "annual"), {
      value: 59.99,
      label: "$59.99",
      unit: "/ month per 5 seats",
      note: "Annual billing coming soon",
      comingSoon: true,
    });
    assert.deepEqual(priceFor(plan(2, "Business"), "monthly"), { value: 29, label: "$29", unit: "/ month + revenue share", note: "Billed monthly", comingSoon: false });
    assert.deepEqual(priceFor(plan(2, "Extra seats"), "monthly"), { value: 59.99, label: "$59.99", unit: "/ month per 5 seats", note: "Billed monthly", comingSoon: false });
  });

  it("formats whole dollars without cents", () => {
    assert.equal(formatPrice(0), "$0");
    assert.equal(formatPrice(29), "$29");
    assert.equal(formatPrice(9.99), "$9.99");
    assert.equal(formatPrice(999.99), "$999.99");
  });

  it("gives every audience a footnote and a compare table as wide as its plans", () => {
    for (const a of AUDIENCES) {
      assert.ok(a.footnote.length > 0);
      for (const row of a.compare) assert.equal(row.length, a.plans.length + 1, a.label + ": " + row[0]);
    }
  });
});
