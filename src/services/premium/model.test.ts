import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessPlansOn,
  choiceDue,
  memberStatus,
  memberStatusLine,
  memberStatusTitle,
  mayPrompt,
  mustPayFirst,
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
import { FREE_MEDITATIONS, PREMIUM_FEATURES, featureEntry, freeAllowanceText, type PremiumFeature } from "./features.ts";

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
  assert.equal(mustPayFirst(null), false);
  assert.equal(choiceDue(null), false);
  assert.equal(mustPayFirst(parseLevel([{ business_plans_on: false, must_pay_first: true }])), false);
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

test("member status (EA): pass, comp and store; never a price, never a name", () => {
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
  assert.equal(premiumCodeMessage("ATXQ3", { message: "ATXQ3: start your business plan before you add a venue" }), "Start your business plan before you add a venue.");
  assert.equal(premiumCodeMessage("ATXQ3", { message: "ATXQ3: start your business plan before you submit your verification" }), "Start your business plan before you submit your verification.");
  assert.equal(premiumCodeMessage("ATXQ3"), "Start your business plan first.");
  assert.equal(premiumCodeMessage("ATXQ4"), "No hiring credit free. A role offer needs one.");
  assert.equal(premiumCodeMessage("ATXQ6", { detail: "too_soon" }), passReasonText("too_soon"));
  assert.equal(premiumCodeMessage("ATXQ6", { message: "ATXQ6: this client cannot have Premium through you yet (no_activity)" }), passReasonText("no_activity"));
  assert.equal(premiumCodeMessage(undefined, { message: "ATXQ4: buy a hiring credit to send this offer" }), premiumCodeMessage("ATXQ4"));
  for (const c of ["ATXQ2", "ATXQ5", "ATX03", "ATXD7", undefined]) assert.equal(premiumCodeMessage(c), null, String(c));
});

test("the features table: Karim's G5 keys, one prompt line each, numbers only from free_limits()", () => {
  const keys: PremiumFeature[] = [
    "history_days", "barcode_scans_per_day", "own_routines", "habits", "recipes", "locked_journal_folders", "meditations", "programme_preview_week",
    "journal_prompts", "online_food_search", "lab_report_scanning", "report_comparison", "biomarker_trends", "doctor_summary", "ai_voice_food_logging",
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
  const level = parseLevel([{ business_plans_on: true, must_pay_first: true, plan_active: false, choice_due: false, billing_period: "yearly" }]);
  assert.equal(mustPayFirst(level), true);
  assert.equal(level?.billingPeriod, "yearly");
  assert.equal(choiceDue(parseLevel([{ business_plans_on: true, choice_due: true }])), true);
  const credits = parseHiringCredits([{ credits_on: true, free: 2, price_1: 39, price_3: 99, packs: [{ quantity: 3, used: 1, remaining: 2, starts_at: "a", ends_at: "b" }] }]);
  assert.equal(credits.free, 2);
  assert.equal(credits.packs[0].remaining, 2);
  assert.equal(offerUsesCredit("role", credits), true);
  assert.equal(offerUsesCredit("class_slot", credits), false, "class-slot hires are unchanged");
});
