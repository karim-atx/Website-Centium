import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Promotion } from "../../services/business-market/promoLogic.ts";
import {
  ANY_ID,
  audienceWord,
  chipOfStatus,
  draftOf,
  editPatch,
  featuredLine,
  itemForPromotion,
  offerUsed,
  placementCard,
  promoActions,
  promoDates,
  promoName,
  promoTarget,
  promoText,
  promoTypes,
  recordedLine,
  usesText,
  valueFor,
  type Promotable,
} from "./promoModel.ts";

const promo: Promotion = {
  id: "p1",
  name: "Strength Basics, 25% off",
  targetKind: "class",
  targetId: "c1",
  type: "percent_off",
  value: 25,
  code: null,
  useLimit: null,
  startsOn: "2026-10-06",
  endsOn: "2026-10-19",
  audience: "new",
  showOnListing: true,
  pausedAt: null,
  endedAt: null,
};
const klass: Promotable = { id: "c1", kind: "class", title: "Strength Basics", field: "Strength Basics · Mon 7:30 PM", sub: "Class", preview: "8 spots left" };

test("app types are the DB's promo_type; the OURS 7 days free is gone", () => {
  assert.deepEqual(promoTypes("gym").map((t) => t.value), ["percent_off", "first_free", "bring_friend"]);
  assert.deepEqual(promoTypes("store").map((t) => t.value), ["percent_off", "free_delivery"]);
  assert.deepEqual(promoTypes("classes").map((t) => t.value), ["percent_off", "first_free", "first_n_free", "bring_friend"]);
  assert.equal(promoText("classes", "first_n_free", 3).field, "First 3 classes free");
  assert.equal(promoText("classes", "first_n_free", null).chip, "2 free");
  assert.equal(valueFor("first_n_free", null), 2);
  assert.equal(valueFor("bring_friend", 25), null);
  assert.equal(valueFor("percent_off", 25), 25);
});

test("what is promoted maps onto target_kind / target_id", () => {
  assert.deepEqual(promoTarget(klass), { kind: "class", id: "c1" });
  assert.deepEqual(promoTarget({ id: "o1", kind: "offering" }), { kind: "product", id: "o1" });
  assert.deepEqual(promoTarget({ id: "m1", kind: "plan" }), { kind: "plan", id: "m1" });
  assert.deepEqual(promoTarget({ id: "d1", kind: "day_pass" }), { kind: "day_pass", id: "d1" });
  assert.deepEqual(promoTarget({ id: "offer:First class free", kind: "offer" }), { kind: "any", id: null });
});

test("names: the drawn shapes, at most 60 characters", () => {
  assert.equal(promoName("classes", "Strength Basics", "percent_off", 25), "Strength Basics, 25% off");
  assert.equal(promoName("classes", "First class free", "first_free", null), "First class free");
  assert.equal(promoName("classes", "Lunch HIIT", "bring_friend", null), "Lunch HIIT, bring a friend free");
  assert.ok(promoName("classes", "x".repeat(80), "percent_off", 10).length <= 60);
});

test("a row finds its item, or a stand-in", () => {
  assert.equal(itemForPromotion(promo, [klass], new Map()).id, "c1");
  const past = itemForPromotion({ ...promo, targetId: "gone" }, [], new Map([["gone", "Old class"]]));
  assert.equal(past.title, "Old class");
  const offer: Promotable = { id: "offer:First class free", kind: "offer", title: "First class free", field: "First class free", sub: "Offer", preview: "" };
  assert.equal(itemForPromotion({ ...promo, targetKind: "any", targetId: null, name: "First class free" }, [offer], new Map()).id, offer.id);
  assert.equal(itemForPromotion({ ...promo, targetKind: "any", targetId: null, name: "Spring, 10% off" }, [], new Map()).id, ANY_ID);
});

test("edit patch: a started promotion sends only its end date (ATX10)", () => {
  const d = { ...draftOf(promo, klass), type: "first_free" as const, value: null, audience: "everyone" as const, to: "2026-11-15" };
  assert.deepEqual(editPatch(promo, "live", d, klass, "classes"), { ends_on: "2026-11-15" });
  assert.deepEqual(editPatch(promo, "paused", d, klass, "classes"), { ends_on: "2026-11-15" });
  const sched = editPatch(promo, "scheduled", d, klass, "classes");
  assert.equal(sched.type, "first_free");
  assert.equal(sched.value, null);
  assert.equal(sched.audience, "everyone");
  assert.equal(sched.name, "Strength Basics, first class free");
  assert.equal(sched.target_kind, undefined);
  assert.deepEqual(editPatch(promo, "scheduled", draftOf(promo, klass), klass, "classes"), {});
});

test("card: status chip, dates, stats, actions", () => {
  assert.equal(chipOfStatus("live"), "active");
  assert.equal(promoDates(promo, "live", "New clients only"), "Oct 6 to Oct 19 · new clients");
  assert.equal(promoDates({ ...promo, audience: "everyone" }, "scheduled", "New clients only"), "From Oct 6 · everyone");
  assert.equal(promoDates({ ...promo, endedAt: "2026-10-07T12:00:00" }, "ended", "New members only"), "Oct 6 to Oct 7 · new members");
  assert.equal(audienceWord("New customers only", "new"), "new customers");
  assert.equal(usesText("scheduled", { uses: 0, useLimit: null, people: 0, recorded: 0 }), "–");
  assert.equal(usesText("live", { uses: 1180, useLimit: null, people: 900, recorded: 0 }), "1,180");
  assert.equal(usesText("live", { uses: 4, useLimit: 100, people: 4, recorded: 0 }), "4 of 100");
  assert.equal(usesText("live", undefined), "–");
  assert.equal(recordedLine({ uses: 0, useLimit: null, people: 0, recorded: 0 }), null);
  assert.equal(recordedLine({ uses: 3, useLimit: null, people: 3, recorded: 1230 }), "$1,230 recorded on the payments that used it");
  assert.deepEqual(promoActions("live"), ["edit", "pause", "end"]);
  assert.deepEqual(promoActions("paused"), ["edit", "resume", "end"]);
  assert.deepEqual(promoActions("scheduled"), ["edit", "cancel"]);
  assert.deepEqual(promoActions("ended"), ["again"]);
});

test("offer row right text", () => {
  assert.equal(offerUsed("live", false, undefined), "Off");
  assert.equal(offerUsed("live", true, undefined), "Live now");
  assert.equal(offerUsed("live", true, { uses: 34, useLimit: null, people: 30, recorded: 0 }), "34 uses");
  assert.equal(offerUsed("paused", true, undefined), "Paused");
});

test("featured cards and the Featured line", () => {
  const base = { id: "f1", targetKind: "class" as const, targetId: "c1", area: "classes" as const, startsOn: "2026-10-06", endsOn: "2026-10-12", chargeStatus: "pending" as const, amount: 15 };
  assert.deepEqual(placementCard({ ...base, status: "requested" }, "2026-10-01"), { view: "awaiting", chip: "awaiting", dates: "Starts Oct 6 once paid", line: null });
  assert.equal(placementCard({ ...base, status: "live" }, "2026-10-06")?.dates, "Oct 6 to Oct 12 · 7 days left");
  assert.equal(placementCard({ ...base, status: "payment_not_received" }, "2026-10-14")?.line, "Your start date passed without a payment.");
  assert.equal(placementCard({ ...base, status: "cancelled" }, "2026-10-14"), null);
  const t = () => "Strength Basics";
  assert.deepEqual(featuredLine([{ ...base, status: "live" }], t, "2026-10-09"), { text: "Strength Basics is featured", right: "4 days left" });
  assert.deepEqual(featuredLine([{ ...base, status: "requested" }], t, "2026-10-01"), { text: "Strength Basics: awaiting payment", right: null });
  assert.equal(featuredLine([{ ...base, status: "ended" }], t, "2026-10-20"), null);
});
