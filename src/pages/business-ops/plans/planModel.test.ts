import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  archiveBody,
  billingChipOf,
  billingForKind,
  cardMeta,
  classesLabel,
  classTypeOptions,
  cleanIncludes,
  commitmentLabel,
  durationLabel,
  includesProblem,
  initials,
  limitLabel,
  memberLine,
  oneTimeKind,
  payWith,
  previewLines,
  previewPrice,
  priceLine,
  priceProblem,
  sharedNames,
  shortDate,
  sortMembers,
  statusChip,
  statusLine,
  switchNote,
  typeChips,
  untilLabel,
} from "./planModel.ts";

test("price lines read per billing", () => {
  const base = { sessionsInPack: null, validForDays: null };
  assert.equal(priceLine({ ...base, kind: "membership", price: "$100", billing: "monthly" }), "$100 a month");
  assert.equal(priceLine({ ...base, kind: "membership", price: "$270", billing: "quarterly" }), "$270 every 3 months");
  assert.equal(priceLine({ ...base, kind: "day_pass", price: "$15", billing: "daily" }), "$15 a day");
  assert.equal(priceLine({ ...base, kind: "class_pack", price: "$120", billing: "monthly", sessionsInPack: 10 }), "$120 for 10 classes");
  assert.equal(priceLine({ ...base, kind: "drop_in", price: "$18", billing: "daily" }), "$18 a class");
  assert.equal(priceLine({ ...base, kind: "intro_offer", price: "$20", billing: "monthly", validForDays: 7 }), "$20 for 7 days");
});

test("card duration and meta follow bizPlans (1 day, 30 / 90 / 180 days, includes joined with ·)", () => {
  const base = { sessionsInPack: null, validForDays: null, includes: null };
  assert.equal(durationLabel({ ...base, kind: "day_pass", billing: "daily" }), "1 day");
  assert.equal(durationLabel({ ...base, kind: "membership", billing: "monthly" }), "30 days");
  assert.equal(durationLabel({ ...base, kind: "membership", billing: "quarterly" }), "90 days");
  assert.equal(durationLabel({ ...base, kind: "membership", billing: "semiannually" }), "180 days");
  assert.equal(durationLabel({ ...base, kind: "membership", billing: "annually" }), "365 days");
  assert.equal(durationLabel({ ...base, kind: "class_pack", billing: "monthly", sessionsInPack: 10, validForDays: 60 }), "10 classes · 60 days");
  assert.equal(durationLabel({ ...base, kind: "drop_in", billing: "daily" }), "1 class");
  assert.equal(
    cardMeta({ ...base, kind: "membership", billing: "semiannually", includes: ["Gym floor, lockers, showers", " 2 classes a week ", ""] }),
    "180 days · Gym floor, lockers, showers · 2 classes a week"
  );
  assert.equal(cardMeta({ ...base, kind: "membership", billing: "monthly" }), "30 days");
});

test("status chips and member lines", () => {
  assert.deepEqual(statusChip("active"), { label: "Active", tone: "good" });
  assert.deepEqual(statusChip("paused"), { label: "Paused", tone: "warn" });
  assert.deepEqual(statusChip("hidden"), { label: "Hidden", tone: "soft" });
  const f = { active: 128, soldMonth: 3, soldToday: 0 };
  assert.equal(memberLine({ kind: "membership", dbStatus: "active" }, f), "128 members");
  assert.equal(memberLine({ kind: "membership", dbStatus: "active" }, { ...f, active: 1 }), "1 member");
  assert.equal(memberLine({ kind: "membership", dbStatus: "paused" }, f), "Not on sale");
  assert.equal(memberLine({ kind: "day_pass", dbStatus: "active" }, { ...f, soldMonth: 21 }), "21 sold this month");
  assert.equal(memberLine({ kind: "day_pass", dbStatus: "active" }, { ...f, soldMonth: 21, soldToday: 2 }), "21 sold this month · 2 today");
  assert.equal(memberLine({ kind: "intro_offer", dbStatus: "active" }, { ...f, soldMonth: 4 }), "4 used this month");
  assert.equal(memberLine({ kind: "membership", dbStatus: "active" }, { active: 0, soldMonth: 0, soldToday: 0, isNew: true }), "New · no members yet");
  assert.equal(memberLine({ kind: "membership", dbStatus: "active" }, { active: null, soldMonth: null, soldToday: null }), null);
  assert.equal(memberLine({ kind: "day_pass", dbStatus: "active" }, { active: 3, soldMonth: null, soldToday: null }), null);
});

test("billing chips map to the live enum (D-16)", () => {
  assert.equal(billingChipOf("membership", "quarterly"), "quarterly");
  assert.equal(billingChipOf("membership", null), null);
  assert.equal(billingChipOf("day_pass", "daily"), "daily");
  assert.equal(billingChipOf("class_pack", "quarterly"), "daily");
  assert.equal(billingForKind("membership", "semiannually", null), "semiannually");
  assert.equal(billingForKind("membership", null, null), "monthly");
  assert.equal(billingForKind("day_pass", "monthly", null), "daily");
  assert.equal(billingForKind("class_pack", null, 90), "quarterly");
  assert.equal(oneTimeKind(["membership", "day_pass", "drop_in"]), "day_pass");
  assert.equal(oneTimeKind(["membership", "class_pack", "drop_in"]), "drop_in");
  assert.equal(oneTimeKind(["membership"]), null);
});

test("type chips: drawn two first, then the live types offered", () => {
  assert.deepEqual(typeChips(["membership", "day_pass", "class_pack", "intro_offer", "drop_in"], true, "membership"), ["membership", "day_pass", "class_pack", "intro_offer", "drop_in"]);
  assert.deepEqual(typeChips(["membership", "day_pass", "class_pack", "intro_offer", "drop_in"], false, "membership"), ["membership", "day_pass", "intro_offer"]);
  assert.deepEqual(typeChips(["membership"], false, "drop_in"), ["membership", "drop_in"]);
  assert.deepEqual(typeChips(null, true, "membership").length, 5);
});

test("price and included lines", () => {
  assert.equal(priceProblem(""), "Enter a price for this plan.");
  assert.equal(priceProblem("  "), "Enter a price for this plan.");
  assert.equal(priceProblem("abc"), "Enter the price as a number, for example 45.");
  assert.equal(priceProblem("$45"), null);
  assert.equal(previewPrice("75"), "$75");
  assert.equal(previewPrice("$8.5"), "$8.50");
  assert.deepEqual(cleanIncludes([" Gym floor ", "", "gym floor", "Showers"]), ["Gym floor", "Showers"]);
  assert.equal(cleanIncludes(["", " "]), null);
  assert.equal(includesProblem(["x".repeat(121)]), "Each line can be 120 characters at most.");
  assert.equal(includesProblem(Array.from({ length: 21 }, (_, i) => `line ${i}`)), "Keep it to 20 lines.");
  assert.equal(includesProblem(["Gym floor"]), null);
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

test("preview lines follow the kept templates", () => {
  const x = { runsClasses: true, classes: null, limit: null, sessions: null, validForDays: null, commitMonths: null, noticeDays: null };
  assert.deepEqual(previewLines({ ...x, kind: "membership", price: "$75", billing: "monthly" }), ["$75 a month · unlimited classes", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "membership", price: "$75", billing: "annually", runsClasses: false }), ["$75 a year", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "day_pass", price: "$15", billing: "daily" }), ["$15 a day · all classes", ""]);
  assert.deepEqual(
    previewLines({ ...x, kind: "membership", price: "$75", billing: "quarterly", limit: 12, classes: ["Spin 45", "Strength Basics", "Lunch HIIT"], commitMonths: 6, noticeDays: 30 }),
    ["$75 every 3 months · up to 12 classes every 3 months", "Spin 45, Strength Basics, Lunch HIIT · 6 months, 30 days' notice"]
  );
  assert.deepEqual(previewLines({ ...x, kind: "class_pack", price: "$65", billing: "quarterly", sessions: 5, validForDays: 60 }), ["$65 for 5 classes · valid 2 months", ""]);
  assert.deepEqual(previewLines({ ...x, kind: "drop_in", price: "$18", billing: "daily", classes: ["Spin 45", "Yoga Flow"] }), ["$18 a class · Spin 45 and Yoga Flow", ""]);
  assert.equal(payWith("Cash or Whish Money"), "Pay with cash or Whish Money");
});

test("kept field values: no limit is never 0, commitment, classes", () => {
  assert.equal(limitLabel(null, "monthly"), "Unlimited");
  assert.equal(limitLabel(0, "monthly"), "Unlimited");
  assert.equal(limitLabel(12, "monthly"), "Up to 12 a month");
  assert.equal(commitmentLabel(0, 0), "None, cancel anytime");
  assert.equal(commitmentLabel(6, 30), "6 months, 30 days' notice");
  assert.equal(classesLabel(null), "All classes");
  assert.equal(classesLabel(["A", "B", "C"]), "3 class types");
  assert.deepEqual(classTypeOptions([" Spin ", "spin", "", "x".repeat(61)]), { ok: ["Spin"], tooLong: ["x".repeat(61)] });
  assert.equal(archiveBody(6), "It's removed from Explore and can't be bought. The 6 current members keep it until it ends.");
  assert.equal(statusLine("paused"), "Paused: nobody new can buy it. Members keep their plan and renewals continue.");
});

test("members: month-first dates, initials, order", () => {
  assert.equal(shortDate("2026-09-02"), "Sep 2");
  assert.equal(untilLabel("2026-11-15"), "Until Nov 15");
  assert.equal(untilLabel(null), "");
  assert.equal(initials("Maya K."), "MK");
  assert.equal(initials("Taylor"), "T");
  assert.deepEqual([...sharedNames([{ name: "A" }, { name: "B" }, { name: "A" }])], ["A"]);
  const sorted = sortMembers([
    { label: "Omar", expiresOn: null },
    { label: "Lea", expiresOn: "2026-11-02" },
    { label: "Maya", expiresOn: "2026-10-28" },
  ]);
  assert.deepEqual(sorted.map((m) => m.label), ["Maya", "Lea", "Omar"]);
});
