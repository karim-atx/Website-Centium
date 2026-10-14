import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  figuresLine,
  initials,
  isEarly,
  membersLine,
  payWith,
  planIcon,
  previewLine1,
  previewPrice,
  priceLine,
  sharedNames,
  shortDate,
  switchNote,
} from "./planModel.ts";

test("price lines read per billing", () => {
  assert.equal(priceLine({ price: "$100", billing: "monthly" }), "$100 a month");
  assert.equal(priceLine({ price: "$1080", billing: "annually" }), "$1080 a year");
  assert.equal(priceLine({ price: "$15", billing: "daily" }), "$15 a day");
});

test("tile icons follow type and billing", () => {
  assert.equal(planIcon({ kind: "membership", billing: "monthly" }), "repeat");
  assert.equal(planIcon({ kind: "membership", billing: "annually" }), "calendar-range");
  assert.equal(planIcon({ kind: "day_pass", billing: "daily" }), "sun");
});

test("members lines count people, singular and plural", () => {
  assert.equal(membersLine("membership", 1), "1 active member");
  assert.equal(membersLine("membership", 74), "74 active members");
  assert.equal(membersLine("day_pass", 2), "2 active passes");
});

test("the figures line only says what the data supports", () => {
  assert.equal(figuresLine([], null), "Add your first plan to start selling memberships.");
  const plans = [
    { name: "Monthly", status: "active" as const },
    { name: "Day pass", status: "active" as const },
  ];
  assert.equal(figuresLine(plans, null), "");
  assert.equal(figuresLine(plans, new Map([["Monthly", 0]])), "Members show here once someone buys a plan on Explore.");
  assert.equal(
    figuresLine(plans, new Map([["Monthly", 2], ["Day pass", 1]])),
    "Monthly is the most popular plan: 2 of 3 members."
  );
});

test("the switch note names both types with the right article", () => {
  assert.equal(
    switchNote("membership", "class_pack"),
    "Switched from Membership. Name, price and payment type were kept; the fields below them changed to fit a class pack."
  );
  assert.equal(
    switchNote("day_pass", "intro_offer"),
    "Switched from Day pass. Name, price and payment type were kept; the fields below them changed to fit an intro offer."
  );
});

test("preview lines follow the source templates", () => {
  assert.equal(previewPrice("75"), "$75");
  assert.equal(previewPrice("$8.5"), "$8.50");
  assert.equal(previewPrice("abc"), null);
  assert.equal(previewLine1("membership", "$75", "monthly", true), "$75 a month · unlimited classes");
  assert.equal(previewLine1("membership", "$75", "yearly", false), "$75 a year");
  assert.equal(previewLine1("day_pass", "$15", "monthly", true), "$15 a day · all classes");
  assert.equal(payWith("Cash"), "Pay with cash");
  assert.equal(payWith("Cash or Whish Money"), "Pay with cash or Whish Money");
});

test("small helpers", () => {
  assert.equal(shortDate("2026-09-02"), "2 Sep");
  assert.equal(initials("Taylor"), "T");
  assert.equal(initials("Mary Ann"), "MA");
  assert.deepEqual([...sharedNames([{ name: "A" }, { name: "B" }, { name: "A" }])], ["A"]);
});

test("early data: first members under 14 days ago, this month", () => {
  assert.equal(isEarly("2026-10-05", "2026-10-14"), true);
  assert.equal(isEarly("2026-09-30", "2026-10-02"), false);
  assert.equal(isEarly("2026-10-01", "2026-10-20"), false);
  assert.equal(isEarly(null, "2026-10-14"), false);
  const plans = [{ name: "Monthly", status: "active" as const }];
  assert.equal(figuresLine(plans, new Map([["Monthly", 3]]), true), "Your first members joined this month.");
  assert.equal(figuresLine(plans, new Map([["Monthly", 0]]), true), "Members show here once someone buys a plan on Explore.");
});
