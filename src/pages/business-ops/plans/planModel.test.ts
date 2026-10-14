import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  figuresLine,
  initials,
  isEarly,
  membersLine,
  payWith,
  planIcon,
  previewLines,
  limitLabel,
  commitmentLabel,
  classesLabel,
  billingForKind,
  classTypeOptions,
  archiveBody,
  archivedToast,
  statusLine,
  previewPrice,
  priceLine,
  sharedNames,
  shortDate,
  switchNote,
} from "./planModel.ts";

test("price lines read per billing", () => {
  const base = { sessionsInPack: null, validForDays: null };
  assert.equal(priceLine({ ...base, kind: "membership", price: "$100", billing: "monthly" }), "$100 a month");
  assert.equal(priceLine({ ...base, kind: "membership", price: "$1080", billing: "annually" }), "$1080 a year");
  assert.equal(priceLine({ ...base, kind: "membership", price: "$270", billing: "quarterly" }), "$270 every 3 months");
  assert.equal(priceLine({ ...base, kind: "day_pass", price: "$15", billing: "daily" }), "$15 a day");
  assert.equal(priceLine({ ...base, kind: "class_pack", price: "$120", billing: "monthly", sessionsInPack: 10 }), "$120 for 10 classes");
  assert.equal(priceLine({ ...base, kind: "drop_in", price: "$18", billing: "daily" }), "$18 a class");
  assert.equal(priceLine({ ...base, kind: "intro_offer", price: "$20", billing: "monthly", validForDays: 7 }), "$20 for 7 days");
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
  const x = { runsClasses: true, classes: null, limit: null, sessions: null, validForDays: null, commitMonths: null, noticeDays: null };
  assert.deepEqual(previewLines({ ...x, kind: "membership", price: "$75", period: "monthly" }), ["$75 a month · unlimited classes", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "membership", price: "$75", period: "yearly", runsClasses: false }), ["$75 a year", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "day_pass", price: "$15", period: "monthly" }), ["$15 a day · all classes", ""]);
  // OP1-176 full form.
  assert.deepEqual(
    previewLines({ ...x, kind: "membership", price: "$75", period: "every_3_months", limit: 12, classes: ["Spin 45", "Strength Basics", "Lunch HIIT"], commitMonths: 6, noticeDays: 30 }),
    ["$75 every 3 months · up to 12 classes every 3 months", "Spin 45, Strength Basics, Lunch HIIT · 6 months, 30 days' notice"]
  );
  assert.deepEqual(previewLines({ ...x, kind: "class_pack", price: "$65", period: "monthly", sessions: 5, validForDays: 60 }), ["$65 for 5 classes · valid 2 months", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "drop_in", price: "$18", period: "monthly", classes: ["Spin 45", "Yoga Flow"] }), ["$18 a class · Spin 45 and Yoga Flow", ""]);
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

test("B7 field values: no limit is never 0, commitment, classes, billing per type", () => {
  assert.equal(limitLabel(null, "monthly"), "Unlimited");
  assert.equal(limitLabel(0, "monthly"), "Unlimited");
  assert.equal(limitLabel(12, "monthly"), "Up to 12 a month");
  assert.equal(commitmentLabel(0, 0), "None, cancel anytime");
  assert.equal(commitmentLabel(6, 30), "6 months, 30 days' notice");
  assert.equal(classesLabel(null), "All classes");
  assert.equal(classesLabel(["Spin 45"]), "Spin 45");
  assert.equal(classesLabel(["A", "B", "C"]), "3 class types");
  assert.equal(billingForKind("membership", "every_6_months", null), "semiannually");
  assert.equal(billingForKind("day_pass", "monthly", null), "daily");
  assert.equal(billingForKind("class_pack", "monthly", 90), "quarterly");
  assert.deepEqual(classTypeOptions([" Spin ", "spin", "", "x".repeat(61)]), { ok: ["Spin"], tooLong: ["x".repeat(61)] });
});

test("archive and pause copy", () => {
  assert.equal(archiveBody(0), "It's removed from Explore and can't be bought.");
  assert.equal(archiveBody(6), "It's removed from Explore and can't be bought. The 6 current members keep it until it ends.");
  assert.equal(archivedToast("Student monthly", 1), "Student monthly archived. 1 member keeps it until it ends.");
  assert.equal(statusLine("paused"), "Paused: nobody new can buy it. Members keep their plan and renewals continue.");
});
