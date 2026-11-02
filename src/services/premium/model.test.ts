import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessPlansOn,
  awaitingPurchase,
  choiceAlreadyMade,
  choosePlanLevelArgs,
  planChoiceLine,
  memberStatus,
  memberStatusLine,
  memberStatusTitle,
  mayPrompt,
  mustChooseLevel,
  onboardingPlanStep,
  planHomeCard,
  planLevelPriceText,
  memberStatusGiver,
  giverLineParts,
  offerUsesCredit,
  parseCandidates,
  parseFreeLimits,
  parseGymPasses,
  parseHiringCredits,
  parseLevel,
  parseLevelPrices,
  parseMyPasses,
  parseMyPremium,
  parseSwitches,
  passReasonText,
  planLevelName,
  planPageFeatureSource,
  premiumCodeMessage,
  premiumOn,
  promptAllowed,
  showBuyInApp,
  showPremiumBadge,
  STORE_APPS_LIVE,
  trialCardDue,
  type MyPremium,
  type PassReason,
  type PromptContext,
} from "./model.ts";
import { FREE_MEDITATIONS, HIRING_CREDIT_PRICES, PREMIUM_FEATURES, featureEntry, freeAllowanceText, hiringCreditPricesText, type PremiumFeature } from "./features.ts";

// Round G1 · the pure decisions: off behaves as today, the prompt rules (G6),
// the reasons, the codes and the features table.

const ROW = {
  premium_on: true,
  preview: false,
  premium: false,
  source: null,
  ends_at: null,
  is_trial: false,
  limits: { history_days: 14, barcode_scans_per_day: 3, own_routines: 3, habits: 3, recipes: 10, locked_journal_folders: 1 },
  may_prompt_upgrade: true,
  monthly_price: 9.99,
  yearly_price: 99.99,
  trial_days: 7,
};
const on = (over: Record<string, unknown> = {}): MyPremium => parseMyPremium([{ ...ROW, ...over }]);
const off = (over: Record<string, unknown> = {}): MyPremium => parseMyPremium([{ ...ROW, premium_on: false, limits: null, ...over }]);

test("off (and loading, and unreadable) behaves as today: no badge, no buy block, no prompt, today's grid", () => {
  for (const p of [null, undefined, off(), off({ premium: true, source: "admin_comp" }), parseMyPremium(null), parseMyPremium("x")]) {
    assert.equal(premiumOn(p), false);
    assert.equal(showPremiumBadge(p), false);
    assert.equal(showBuyInApp(p), false);
    assert.equal(planPageFeatureSource(p), "today");
    assert.equal(memberStatus(p), null);
    assert.equal(promptAllowed({ premium: p ?? null, age: "adult", path: "/app", inSupport: false }), false);
  }
  // premium is never true while the switch is off, whatever the row says
  assert.equal(off({ premium: true }).premium, false);
  assert.deepEqual(parseSwitches(null), { premiumOn: false, businessPlansOn: false, preview: false });
  assert.equal(businessPlansOn(null), false);
  assert.equal(businessPlansOn(parseSwitches([{ premium_on: true, business_plans_on: false }])), false);
  assert.equal(mustChooseLevel(null), false);
  assert.equal(awaitingPurchase(null), false);
  assert.equal(mustChooseLevel(parseLevel([{ business_plans_on: false, must_choose_level: true }])), false);
  assert.equal(awaitingPurchase(parseLevel([{ business_plans_on: false, awaiting_purchase: true }])), false);
  assert.equal(planHomeCard(parseLevel([{ business_plans_on: false, must_choose_level: true, awaiting_purchase: true }])), null);
  assert.equal(planHomeCard(null), null);
  assert.equal(offerUsesCredit("role", null), false);
  assert.equal(offerUsesCredit("role", parseHiringCredits([{ credits_on: false }])), false);
});

test("on: the badge with Premium, the buy block without it", () => {
  assert.equal(showPremiumBadge(on({ premium: true })), true);
  assert.equal(showBuyInApp(on({ premium: true })), false);
  assert.equal(showPremiumBadge(on()), false);
  assert.equal(showBuyInApp(on()), true);
  assert.equal(planPageFeatureSource(on()), "features");
  assert.equal(parseSwitches([{ premium_on: true, business_plans_on: true, preview: true }]).preview, true);
});

const ctx = (over: Partial<PromptContext> = {}): PromptContext => ({ premium: on(), age: "adult", path: "/app/food", inSupport: false, lastShownDay: null, today: "2026-11-02", ...over });

test("prompt rules (G6): once per feature per day; never in recovery mode, on Get support, for under-18s or with Premium", () => {
  assert.equal(mayPrompt(ctx()), true);
  assert.equal(mayPrompt(ctx({ lastShownDay: "2026-11-02" })), false);
  assert.equal(mayPrompt(ctx({ lastShownDay: "2026-11-01" })), true);
  assert.equal(mayPrompt(ctx({ premium: null })), false, "loading");
  assert.equal(mayPrompt(ctx({ premium: on({ may_prompt_upgrade: false }) })), false, "recovery-sensitive");
  assert.equal(mayPrompt(ctx({ premium: on({ premium: true }) })), false, "has Premium");
  assert.equal(mayPrompt(ctx({ premium: off() })), false, "switch off");
  assert.equal(mayPrompt(ctx({ age: "minor" })), false);
  assert.equal(mayPrompt(ctx({ age: "unknown-age" })), false);
  assert.equal(mayPrompt(ctx({ path: "/app/get-support" })), false);
  assert.equal(mayPrompt(ctx({ path: "/app/get-support/x" })), false);
  assert.equal(mayPrompt(ctx({ inSupport: true })), false, "GetSupportPopup open");
});

test("the trial card stays hidden while the store apps aren't live (G7 b)", () => {
  assert.equal(STORE_APPS_LIVE, false);
  const base = { premium: on(), age: "adult" as const, recoverySensitive: false, seen: false };
  assert.equal(trialCardDue({ ...base, storeAppsLive: STORE_APPS_LIVE }), false);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true }), true);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true, seen: true }), false);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true, recoverySensitive: true }), false);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true, age: "minor" }), false);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true, premium: on({ premium: true }) }), false);
  assert.equal(trialCardDue({ ...base, storeAppsLive: true, premium: null }), false);
});

test("my_premium parses the handover's row", () => {
  const p = on();
  assert.deepEqual(p.limits, ROW.limits);
  assert.equal(p.monthlyPrice, 9.99);
  assert.equal(p.yearlyPrice, 99.99);
  assert.equal(p.trialDays, 7);
  assert.equal(on({ limits: null }).limits, null);
  assert.equal(on({ source: "nonsense" }).source, null);
  assert.deepEqual(parseFreeLimits(ROW.limits), ROW.limits);
  assert.equal(parseFreeLimits({ history_days: 14 }), null);
});

test("member status (EA): the giver's name on a pass (G fixes), today's wording without one", () => {
  const pro = memberStatus(on({ premium: true, source: "professional_pass", from_name: "Rana" }))!;
  assert.equal(on({ from_name: "  Rana " }).fromName, "Rana");
  assert.equal(on({ from_name: "" }).fromName, null);
  assert.equal(memberStatusGiver(pro), "Rana");
  assert.equal(memberStatusTitle(pro), "Premium from Rana");
  const gym = memberStatus(on({ premium: true, source: "gym_pass", from_name: "Iron Works" }))!;
  assert.equal(memberStatusTitle(gym), "Premium from Iron Works");
  // null falls back to today's wording
  const noName = memberStatus(on({ premium: true, source: "gym_pass", from_name: null }))!;
  assert.equal(memberStatusGiver(noName), null);
  assert.equal(memberStatusTitle(noName), "Premium with your gym membership");
  // a comp or a store purchase never names anyone, even if a name came back
  const comp = memberStatus(on({ premium: true, source: "admin_comp", from_name: "Admin" }))!;
  assert.equal(memberStatusGiver(comp), null);
  assert.equal(memberStatusTitle(comp), "Premium");
  // the sentence splits around the name so it can sit in <bdi>
  assert.deepEqual(giverLineParts(), { before: "Premium from ", after: "" });
  // the switch off: no card at all, whatever the name
  assert.equal(memberStatus(off({ premium: true, source: "professional_pass", from_name: "Rana" })), null);
});

test("member status (EA): pass, comp and store; never a price", () => {
  const d = (iso: string) => `D(${iso})`;
  const pro = memberStatus(on({ premium: true, source: "professional_pass" }))!;
  assert.equal(memberStatusTitle(pro), "Premium from your professional");
  assert.equal(memberStatusLine(pro, d), null);
  const ending = memberStatus(on({ premium: true, source: "gym_pass", ends_at: "2026-11-09T04:50:00Z" }))!;
  assert.equal(memberStatusTitle(ending), "Premium with your gym membership");
  assert.equal(memberStatusLine(ending, d), "Until D(2026-11-09T04:50:00Z)");
  const comp = memberStatus(on({ premium: true, source: "admin_comp", ends_at: "2027-01-01T00:00:00Z" }))!;
  assert.equal(memberStatusTitle(comp), "Premium");
  assert.equal(memberStatusLine(comp, d), "Until D(2027-01-01T00:00:00Z)");
  const store = memberStatus(on({ premium: true, source: "store", ends_at: "2027-01-01T00:00:00Z" }))!;
  assert.equal(memberStatusLine(store, d), "Managed in the app store");
  for (const s of [pro, ending, comp, store]) assert.doesNotMatch(`${memberStatusTitle(s)} ${memberStatusLine(s, d) ?? ""}`, /\$|\d+\.\d\d/);
  assert.equal(memberStatus(on({ premium: false, source: "professional_pass" })), null);
});

test("every pass refusal reason has its own plain sentence; an unknown one a safe line", () => {
  const reasons: PassReason[] = ["self", "not_your_client", "already_given", "not_verified", "no_paid_plan", "no_passes_left", "too_soon", "no_activity", "shared_sign_in"];
  const fallback = passReasonText("something_new");
  const seen = new Set<string>();
  for (const r of reasons) {
    const s = passReasonText(r);
    assert.notEqual(s, fallback, r);
    assert.match(s, /\.$/, r);
    assert.doesNotMatch(s, /_/, r);
    seen.add(s);
  }
  assert.equal(seen.size, reasons.length);
  assert.equal(passReasonText(null), fallback);
  assert.match(passReasonText("too_soon"), /14 days/);
});

test("the Round G1 codes: Q0, Q1, Q3, Q4, Q6 as sentences; Q2, Q5 and others are not ours", () => {
  assert.equal(premiumCodeMessage("ATXQ0"), "That isn't available yet.");
  assert.equal(premiumCodeMessage("ATXQ1"), "That's part of Centium Premium.");
  // G fixes 3: two sentences, with no "paid", "payment", "charge" or "bank transfer"; the level is chosen on the web
  assert.equal(premiumCodeMessage("ATXQ3", { message: "ATXQ3: choose your business plan before you add a venue" }), "Choose your business plan first.");
  assert.equal(premiumCodeMessage("ATXQ3", { message: "ATXQ3: choose your business plan before you submit your verification" }), "Choose your business plan first.");
  assert.equal(premiumCodeMessage("ATXQ3"), "Choose your business plan first.");
  assert.equal(
    premiumCodeMessage("ATXQ3", { message: "ATXQ3: the business has not bought its plan in the Centium app yet -- approval waits until the store purchase is confirmed" }),
    "Your verification is approved once your plan purchase is confirmed."
  );
  assert.equal(
    premiumCodeMessage("ATXQ3", { message: "ATXQ3: the business has not paid its plan yet -- mark its plan charge paid before approving" }),
    "Your verification is approved once your plan purchase is confirmed."
  );
  assert.equal(premiumCodeMessage("ATXQ3", { message: "ATXQ3: the plan purchase is not confirmed yet" }), "Your verification is approved once your plan purchase is confirmed.");
  for (const m of ["", "ATXQ3: not paid"]) assert.doesNotMatch(premiumCodeMessage("ATXQ3", { message: m })!, /paid|payment|charge|bank transfer/i);
  assert.equal(premiumCodeMessage("ATXQ4"), "Buy a hiring credit in the Centium app to send this offer.");
  assert.equal(premiumCodeMessage("ATXQ6", { detail: "too_soon" }), passReasonText("too_soon"));
  assert.equal(premiumCodeMessage("ATXQ6", { message: "ATXQ6: this client cannot have Premium through you yet (no_activity)" }), passReasonText("no_activity"));
  assert.equal(premiumCodeMessage(undefined, { message: "ATXQ4: buy a hiring credit in the Centium app to send this offer" }), premiumCodeMessage("ATXQ4"));
  for (const c of ["ATXQ5", "ATX03", "ATXD7", undefined]) assert.equal(premiumCodeMessage(c), null, String(c));
});

test("the features table: Karim's G5 keys, one prompt line each, numbers only from free_limits()", () => {
  const keys: PremiumFeature[] = [
    "history_days", "barcode_scans_per_day", "own_routines", "habits", "recipes", "locked_journal_folders", "meditations", "programme_preview_week",
    "journal_prompts", "online_food_search", "lab_report_scanning", "report_comparison", "biomarker_trends", "doctor_summary", "ai_voice_food_logging",
    // Round G2: the prompt for an offer kept for Premium members.
    "premium_offers",
  ];
  assert.deepEqual(PREMIUM_FEATURES.map((f) => f.key), keys);
  assert.deepEqual(PREMIUM_FEATURES.filter((f) => f.kind === "premium_only").map((f) => f.key), keys.slice(8));
  for (const f of PREMIUM_FEATURES) {
    assert.ok(f.prompt.length > 10 && /\.$/.test(f.prompt), f.key);
    assert.ok(f.label.length > 0, f.key);
    assert.doesNotMatch(`${f.label} ${f.prompt}`, /\d/, `${f.key}: a number is hard-coded`);
  }
  assert.deepEqual([...FREE_MEDITATIONS], ["Settle in", "Box breathing", "Wind down for sleep"]);
  const limits = parseFreeLimits(ROW.limits);
  assert.equal(freeAllowanceText("history_days", limits), "Free: the last 14 days");
  assert.equal(freeAllowanceText("locked_journal_folders", limits), "Free: 1 locked folder");
  assert.equal(freeAllowanceText("recipes", { ...limits!, recipes: 25 }), "Free: 25 recipes");
  assert.equal(freeAllowanceText("history_days", null), null, "never a guessed number");
  assert.equal(freeAllowanceText("doctor_summary", limits), null);
  assert.match(freeAllowanceText("meditations", null)!, /Settle in, Box breathing, Wind down for sleep/);
  assert.throws(() => featureEntry("nope" as PremiumFeature));
});

test("passes, the gym's opt-in, plan levels and hiring credits parse the handover's shapes", () => {
  const mine = parseMyPasses([{ allowance: 5, used: 2, verified: true, passes: [{ client_id: "c1", name: "Rana", starts_at: "2026-11-01T00:00:00Z", ends_at: null }, { name: "no id" }] }]);
  assert.deepEqual(mine, { allowance: 5, used: 2, verified: true, passes: [{ clientId: "c1", name: "Rana", startsAt: "2026-11-01T00:00:00Z", endsAt: null }] });
  assert.deepEqual(parseMyPasses(null), { allowance: 0, used: 0, verified: false, passes: [] });
  assert.deepEqual(parseCandidates([{ client_id: "c2", name: "Omar", eligible: false, reason: "too_soon" }]), [{ clientId: "c2", name: "Omar", eligible: false, reason: "too_soon" }]);
  assert.deepEqual(parseGymPasses([{ premium_for_members: true, cap: 50, used: 3 }]), { premiumForMembers: true, cap: 50, used: 3 });
  const prices = parseLevelPrices([{ seat_blocks: 2, seats: 15, monthly_price: 79, yearly_price: 789 }, { seat_blocks: 0, seats: 5, monthly_price: 29, yearly_price: 289.99 }, { seat_blocks: 1, seats: 10, monthly_price: 54, yearly_price: null }]);
  assert.deepEqual(prices.map((p) => p.seatBlocks), [0, 1, 2]);
  assert.equal(prices[1].yearlyPrice, null);
  assert.deepEqual(prices.map((p) => planLevelName(p, prices[0])), ["Base", "Base + 5 seats", "Base + 10 seats"]);
  const level = parseLevel([{ business_plans_on: true, must_choose_level: true, plan_active: false, awaiting_purchase: false, billing_period: "yearly" }]);
  assert.equal(mustChooseLevel(level), true);
  assert.equal(awaitingPurchase(level), false);
  assert.equal(level?.billingPeriod, "yearly");
  const credits = parseHiringCredits([{ credits_on: true, free: 2, packs: [{ quantity: 3, used: 1, remaining: 2, starts_at: "a", ends_at: "b" }] }]);
  // G fixes 3: my_hiring_credits has no prices any more (HIRING_CREDIT_PRICES is the one place)
  assert.deepEqual(Object.keys(credits).sort(), ["creditsOn", "free", "packs"]);
  assert.equal(credits.free, 2);
  assert.equal(credits.packs[0].remaining, 2);
  assert.equal(offerUsesCredit("role", credits), true);
  assert.equal(offerUsesCredit("class_slot", credits), false, "class-slot hires are unchanged");
});

const PRICES = parseLevelPrices([
  { seat_blocks: 0, seats: 5, monthly_price: 29, yearly_price: 289 },
  { seat_blocks: 1, seats: 10, monthly_price: 89, yearly_price: null },
  { seat_blocks: 2, seats: 15, monthly_price: 149, yearly_price: 1489 },
]);
const CHOOSE = parseLevel([{ business_plans_on: true, must_choose_level: true, plan_active: false, awaiting_purchase: false }]);
// A level chosen on the web, its purchase in the Centium app not confirmed yet.
const AWAITING = parseLevel([
  { business_plans_on: true, must_choose_level: false, plan_active: false, awaiting_purchase: true, chosen_seat_blocks: 1, chosen_billing_period: "yearly", bought_in_app: false },
]);
const ACTIVE = parseLevel([
  { business_plans_on: true, must_choose_level: false, plan_active: true, awaiting_purchase: false, seat_blocks: 1, billing_period: "monthly", renews_at: "2026-12-02T00:00:00Z", bought_in_app: true },
]);

test("business_plan_level (G fixes 3): awaiting_purchase, the chosen level and bought_in_app; the old fields are gone", () => {
  assert.equal(AWAITING?.awaitingPurchase, true);
  assert.equal(awaitingPurchase(AWAITING), true);
  assert.equal(AWAITING?.chosenSeatBlocks, 1);
  assert.equal(AWAITING?.chosenBillingPeriod, "yearly");
  assert.equal(ACTIVE?.boughtInApp, true);
  assert.equal(ACTIVE?.renewsAt, "2026-12-02T00:00:00Z");
  // awaiting_payment, pending_* and choice_due are not read (removed from the contract)
  for (const k of ["awaitingPayment", "pendingChargeId", "pendingAmount", "pendingSeatBlocks", "pendingBillingPeriod", "choiceDue"]) assert.equal(k in (AWAITING ?? {}), false, k);
  assert.equal(awaitingPurchase(parseLevel([{ business_plans_on: true, awaiting_payment: true }])), false, "the old name means nothing");
  // an active plan is never "awaiting purchase", whatever the row says
  assert.equal(awaitingPurchase(parseLevel([{ business_plans_on: true, plan_active: true, awaiting_purchase: true }])), false);
  assert.equal(ACTIVE?.seatBlocks, 1);
  assert.equal(ACTIVE?.billingPeriod, "monthly");
});

test("choose_business_plan_level takes exactly three arguments, and ATXD7 reads as already chosen", () => {
  assert.deepEqual(choosePlanLevelArgs("b1", 2, "yearly"), { p_business_id: "b1", p_seat_blocks: 2, p_period: "yearly" });
  assert.deepEqual(Object.keys(choosePlanLevelArgs("b1", 0, "monthly")).sort(), ["p_business_id", "p_period", "p_seat_blocks"]);
  assert.equal(choiceAlreadyMade("ATXD7"), true);
  for (const c of ["ATX03", "ATXQ0", "22023", null, undefined]) assert.equal(choiceAlreadyMade(c), false, String(c));
});

test("a chosen level's line: its name and period, with the seat count from the prices", () => {
  assert.equal(planChoiceLine(1, "yearly", PRICES), "Base + 5 seats · Yearly");
  assert.equal(planChoiceLine(0, "monthly", PRICES), "Base · Monthly");
  assert.equal(planChoiceLine(2, null, PRICES), "Base + 10 seats");
  assert.equal(planChoiceLine(1, "monthly", null), "Base + 1 seat block · Monthly");
  assert.equal(planChoiceLine(null, "monthly", PRICES), null);
});

test("a level's price line per billing period; null when the period isn't priced", () => {
  const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
  assert.equal(planLevelPriceText(PRICES[0], "monthly"), `${usd(29)} a month`);
  assert.equal(planLevelPriceText(PRICES[0], "yearly"), `${usd(289)} a year`);
  assert.equal(planLevelPriceText(PRICES[1], "yearly"), null);
});

test("the onboarding plan step: only on the switch while a level must be chosen, and never a dead end", () => {
  const onS = { businessPlansOn: true };
  const offS = { businessPlansOn: false };
  const gate = (o: Partial<Parameters<typeof onboardingPlanStep>[0]>) =>
    onboardingPlanStep({ switches: onS, businessId: "b1", level: CHOOSE, levelLoading: false, chosen: false, carriedOn: false, ...o });
  assert.equal(gate({}), "plan");
  // Continue always carries on to the venue step, whatever the level says (nothing is bought here)
  assert.equal(gate({ carriedOn: true }), "skip");
  assert.equal(gate({ carriedOn: true, levelLoading: true, level: null }), "skip");
  assert.equal(gate({ carriedOn: true, chosen: true }), "skip");
  // chosen here: the step stays ("Now buy it in the Centium app") while the level reloads and after
  assert.equal(gate({ chosen: true, levelLoading: true, level: null }), "plan");
  assert.equal(gate({ chosen: true, level: AWAITING }), "plan");
  // a level chosen before (awaiting its purchase), bought, or a business created before the switch: today's steps
  assert.equal(gate({ level: AWAITING }), "skip");
  assert.equal(gate({ level: ACTIVE }), "skip");
  assert.equal(gate({ level: parseLevel([{ business_plans_on: true, must_choose_level: false }]) }), "skip");
  // the switch off for the business, or no answer: today's steps
  assert.equal(gate({ level: parseLevel([{ business_plans_on: false, must_choose_level: true }]) }), "skip");
  assert.equal(gate({ level: null }), "skip");
  // loading: the skeleton only when the switch is on for the owner; off or unknown, today's step
  assert.equal(gate({ level: null, levelLoading: true }), "loading");
  assert.equal(gate({ level: null, levelLoading: true, switches: offS }), "skip");
  assert.equal(gate({ level: null, levelLoading: true, switches: null }), "skip");
  // no business row yet (offline): today's step; the venue write says ATXQ3
  assert.equal(gate({ businessId: null }), "skip");
});

test("the business home card: choose the plan, buy it in the Centium app, or nothing", () => {
  assert.equal(planHomeCard(CHOOSE), "choose");
  assert.equal(planHomeCard(AWAITING), "awaiting_purchase");
  assert.equal(planHomeCard(ACTIVE), null);
  // choosing comes before anything else
  assert.equal(planHomeCard(parseLevel([{ business_plans_on: true, must_choose_level: true, awaiting_purchase: true }])), "choose");
  // the old fields give no card
  assert.equal(planHomeCard(parseLevel([{ business_plans_on: true, awaiting_payment: true, choice_due: true }])), null);
});

test("hiring credit prices come from one constant (G10: 1 for $39, 3 for $99), formatted in the app's language", () => {
  assert.deepEqual({ ...HIRING_CREDIT_PRICES }, { one: 39, three: 99 });
  const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
  assert.equal(hiringCreditPricesText(), `${usd(39)} for 1 hiring credit, ${usd(99)} for 3`);
});
