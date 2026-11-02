import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askOutcome,
  directoryFallback,
  directoryLimitText,
  edgeRefusalOf,
  exportErrorText,
  exportFileName,
  historyLine,
  isMissingFunction,
  limitReached,
  limitReachedText,
  limitsApply,
  lockedFolderCount,
  noticeText,
  offerNeedsPremium,
  ownHabitCount,
  ownRoutineCount,
  parseHistoryFrom,
  parseMultiplier,
  parsePremiumBooking,
  parsePremiumOnly,
  parseScansLeft,
  parseStreakShields,
  premiumBookingOpensAt,
  premiumOnlyLocked,
  premiumRefusalOf,
  scansLeftText,
  shieldStreaksText,
  showDoubled,
  showDoublePointsLine,
  showWaitlistPriority,
} from "./g2.ts";
import { premiumCodeMessage, type FreeLimits, type MyPremium } from "./model.ts";

const LIMITS: FreeLimits = { history_days: 14, barcode_scans_per_day: 3, own_routines: 3, habits: 3, recipes: 10, locked_journal_folders: 1 };
const base: MyPremium = {
  premiumOn: true,
  preview: false,
  premium: false,
  source: null,
  endsAt: null,
  isTrial: false,
  limits: LIMITS,
  mayPromptUpgrade: true,
  monthlyPrice: 9.99,
  yearlyPrice: 99.99,
  trialDays: 7,
};
const off: MyPremium = { ...base, premiumOn: false, limits: null, mayPromptUpgrade: false };
const premium: MyPremium = { ...base, premium: true, limits: null, mayPromptUpgrade: false };
const pro: MyPremium = { ...base, limits: null, mayPromptUpgrade: false }; // a professional: the switch on, no limits

// ---- fail open ----

test("a missing function (PGRST202, 42883, 404) is what falls back; nothing else does", () => {
  assert.equal(isMissingFunction({ code: "PGRST202" }), true);
  assert.equal(isMissingFunction({ code: "42883" }), true);
  assert.equal(isMissingFunction({ status: 404 }), true);
  assert.equal(isMissingFunction(null), false);
  assert.equal(directoryFallback({ code: "PGRST202" }), true);
  assert.equal(directoryFallback({ code: "ATX02", message: "too many directory requests -- try again in 12 minutes" }), false);
  assert.equal(directoryFallback({ code: "42501" }), false);
  assert.equal(directoryFallback({ message: "Failed to fetch" }), false);
});

test("off, loading, Premium or a professional: no limit, no Premium label", () => {
  for (const p of [null, undefined, off, premium, pro]) {
    assert.equal(limitsApply(p), false);
    assert.equal(limitReached(p, "own_routines", 99), false);
  }
  assert.equal(premiumOnlyLocked(null), false);
  assert.equal(premiumOnlyLocked(off), false);
  assert.equal(premiumOnlyLocked(premium), false);
  assert.equal(premiumOnlyLocked(base), true);
});

// ---- the limit checks ----

test("limit checks: only a new addition at the limit; members over it keep everything", () => {
  assert.equal(limitReached(base, "own_routines", 2), false);
  assert.equal(limitReached(base, "own_routines", 3), true);
  assert.equal(limitReached(base, "own_routines", 7), true); // over already: the next one prompts, nothing is taken away
  assert.equal(limitReached(base, "habits", 2), false);
  assert.equal(limitReached(base, "habits", 3), true);
  assert.equal(limitReached(base, "recipes", 9), false);
  assert.equal(limitReached(base, "recipes", 10), true);
  assert.equal(limitReached(base, "locked_journal_folders", 0), false);
  assert.equal(limitReached(base, "locked_journal_folders", 1), true);
  assert.equal(limitReached(base, "recipes", NaN), false);
});

test("what counts: adopted templates count, a professional's copies and habits never do", () => {
  assert.equal(ownRoutineCount([{}, { assignedByProfessionalId: null }, { assignedByProfessionalId: "pro-1" }]), 2);
  assert.equal(ownHabitCount([{ id: "a" }, { id: "b" }, { id: "c" }], (id) => id === "b"), 2);
  assert.equal(lockedFolderCount([{ locked: true }, { locked: false }, {}]), 1);
});

// ---- ATXQ2 ----

test("ATXQ2 maps its detail to the limit; ATXQ1 to the call's feature", () => {
  assert.deepEqual(premiumRefusalOf({ code: "ATXQ2", details: "own_routines" }), { code: "ATXQ2", feature: "own_routines" });
  assert.deepEqual(premiumRefusalOf({ code: "ATXQ2", details: "barcode_scans_per_day" }), { code: "ATXQ2", feature: "barcode_scans_per_day" });
  assert.deepEqual(premiumRefusalOf({ code: "ATXQ2", details: "nonsense" }), { code: "ATXQ2", feature: null });
  assert.deepEqual(premiumRefusalOf({ message: "ATXQ2: the free plan keeps 3 habits", details: "habits" }), { code: "ATXQ2", feature: "habits" });
  assert.deepEqual(premiumRefusalOf({ code: "ATXQ1" }, "lab_report_scanning"), { code: "ATXQ1", feature: "lab_report_scanning" });
  assert.equal(premiumRefusalOf({ code: "ATX02" }), null);
  assert.equal(premiumRefusalOf(null), null);
});

test("premiumCodeMessage words ATXQ2 by its detail, plainly", () => {
  assert.equal(premiumCodeMessage("ATXQ2", { detail: "own_routines" }), "You've reached the free plan's routines.");
  assert.equal(premiumCodeMessage("ATXQ2", { detail: "habits" }), "You've reached the free plan's habits.");
  assert.equal(premiumCodeMessage("ATXQ2", { detail: "recipes" }), "You've reached the free plan's recipes.");
  assert.equal(premiumCodeMessage("ATXQ2", { detail: "locked_journal_folders" }), "You've reached the free plan's locked folders.");
  assert.equal(premiumCodeMessage("ATXQ2", { detail: "barcode_scans_per_day" }), limitReachedText("barcode_scans_per_day"));
  assert.equal(premiumCodeMessage("ATXQ2", {}), "You've reached a free plan limit.");
  assert.equal(premiumCodeMessage(null, { message: "ATXQ2: the free plan keeps 10 recipes", detail: "recipes" }), "You've reached the free plan's recipes.");
});

test("the host: a limit check counts once a day and falls back to the notice; a refusal never doubles its sentence; a tap always answers", () => {
  assert.equal(askOutcome("limit", true, false), "sheet");
  assert.equal(askOutcome("limit", true, true), "notice");
  assert.equal(askOutcome("limit", false, false), "notice"); // recovery-sensitive mode, under-18s
  assert.equal(askOutcome("refusal", true, false), "sheet");
  assert.equal(askOutcome("refusal", true, true), "none");
  assert.equal(askOutcome("refusal", false, false), "none");
  assert.equal(askOutcome("tap", true, true), "sheet");
  assert.equal(askOutcome("tap", false, false), "notice");
  assert.equal(noticeText("own_routines", LIMITS), "The free plan keeps 3 routines of your own.");
  assert.equal(noticeText("locked_journal_folders", LIMITS), "The free plan keeps 1 locked journal folder.");
  assert.equal(noticeText("online_food_search", LIMITS), "That's part of Centium Premium.");
});

// ---- barcode ----

test("barcode: the scans left when a number, nothing for null; the Edge Function's 403s", () => {
  assert.equal(parseScansLeft(2), 2);
  assert.equal(parseScansLeft(0), 0);
  assert.equal(parseScansLeft(null), null);
  assert.equal(parseScansLeft("x"), null);
  assert.equal(scansLeftText(2), "2 free scans left today");
  assert.equal(scansLeftText(1), "1 free scan left today");
  assert.equal(scansLeftText(null), null);
  assert.equal(edgeRefusalOf(403, "free_limit_reached"), "free_limit_reached");
  assert.equal(edgeRefusalOf(403, "premium_required"), "premium_required");
  assert.equal(edgeRefusalOf(429, "rate_limited"), null);
  assert.equal(edgeRefusalOf(403, "other"), null);
});

// ---- the history line ----

test("the history line: nothing off, loading or uncapped; the date only where no prompt may show", () => {
  const fmt = (d: string) => `<${d}>`;
  assert.equal(historyLine(null, "2026-10-20", true, fmt), null);
  assert.equal(historyLine(off, "2026-10-20", true, fmt), null);
  assert.equal(historyLine(base, null, true, fmt), null);
  assert.deepEqual(historyLine(base, "2026-10-20", true, fmt), { text: "Showing from <2026-10-20>. Older history comes with Premium.", asks: true });
  assert.deepEqual(historyLine(base, "2026-10-20", false, fmt), { text: "Showing from <2026-10-20>.", asks: false });
  assert.equal(parseHistoryFrom("2026-10-20"), "2026-10-20");
  assert.equal(parseHistoryFrom(null), null);
  assert.equal(parseHistoryFrom(42), null);
});

// ---- the export ----

test("the export: a dated file name and ATX02's sentence", () => {
  assert.equal(exportFileName(new Date(2026, 10, 2, 9)), "centium-export-2026-11-02.json");
  assert.equal(exportErrorText("ATX02"), "You can export 3 times a day. Try again tomorrow.");
  assert.equal(exportErrorText("XX000"), "Couldn't export your data. Try again.");
});

// ---- perks ----

test("2x points: a doubled row only with the switch on; the quiet line for a free member, never hidden numbers", () => {
  assert.equal(parseMultiplier(2), 2);
  assert.equal(parseMultiplier(undefined), 1);
  assert.equal(showDoubled(base, 2), true);
  assert.equal(showDoubled(off, 2), false);
  assert.equal(showDoubled(base, 1), false);
  assert.equal(showDoublePointsLine(base, false), true);
  assert.equal(showDoublePointsLine(base, true), false);
  assert.equal(showDoublePointsLine(premium, false), false);
  assert.equal(showDoublePointsLine(off, false), false);
});

test("streak shields: shields_on false or unreadable shows nothing", () => {
  assert.equal(parseStreakShields(null), null);
  assert.equal(parseStreakShields([{ shields_on: false, shields_left: null, used: [] }]), null);
  assert.deepEqual(parseStreakShields([{ shields_on: true, shields_left: 1, used: [{ day: "2026-10-30", streaks: ["logging", "workout"] }] }]), {
    shieldsOn: true,
    shieldsLeft: 1,
    used: [{ day: "2026-10-30", streaks: ["logging", "workout"] }],
  });
  assert.equal(shieldStreaksText(["logging", "workout"]), "Logging, Workout");
});

test("Premium-only offers: the mark only when the server says so; free members meet the prompt", () => {
  assert.equal(parsePremiumOnly(true), true);
  assert.equal(parsePremiumOnly(undefined), false);
  assert.equal(offerNeedsPremium(true, base), true);
  assert.equal(offerNeedsPremium(true, premium), false);
  assert.equal(offerNeedsPremium(true, off), false);
  assert.equal(offerNeedsPremium(false, base), false);
});

// ---- early booking ----

test("the early-booking date: book_class's window less the business's early days, only before everyone can book", () => {
  const now = new Date("2026-11-02T10:00:00Z");
  const starts = "2026-11-20T10:00:00Z"; // 18 days away
  // Window 14: everyone from 6 Nov; 3 early days: Premium from 3 Nov.
  assert.equal(premiumBookingOpensAt(base, starts, 14, 3, now)?.toISOString(), "2026-11-03T10:00:00.000Z");
  // Already open to everyone: nothing to say.
  assert.equal(premiumBookingOpensAt(base, starts, 20, 3, now), null);
  // No early days, the switch off, or nothing known.
  assert.equal(premiumBookingOpensAt(base, starts, 14, 0, now), null);
  assert.equal(premiumBookingOpensAt(off, starts, 14, 3, now), null);
  assert.equal(premiumBookingOpensAt(null, starts, 14, 3, now), null);
  assert.equal(premiumBookingOpensAt(base, null, 14, 3, now), null);
  assert.equal(premiumBookingOpensAt(base, starts, null, 3, now), null);
  // Premium's own day may already have passed: still the date (in the past) while free members wait.
  assert.equal(premiumBookingOpensAt(base, "2026-11-17T10:00:00Z", 14, 7, now)?.toISOString(), "2026-10-27T10:00:00.000Z");
});

test("the business's settings and the waitlist line", () => {
  assert.deepEqual(parsePremiumBooking({ premium_early_booking_days: 3, premium_waitlist_priority: true }), { earlyDays: 3, waitlistPriority: true });
  assert.deepEqual(parsePremiumBooking([{ premium_early_booking_days: 9, premium_waitlist_priority: false }]), { earlyDays: 7, waitlistPriority: false });
  assert.equal(parsePremiumBooking({}), null);
  assert.equal(parsePremiumBooking(null), null);
  assert.equal(showWaitlistPriority(base, { earlyDays: 0, waitlistPriority: true }), true);
  assert.equal(showWaitlistPriority(off, { earlyDays: 0, waitlistPriority: true }), false);
  assert.equal(showWaitlistPriority(base, null), false);
});

// ---- EG ----

test("the directory's ATX02 reads calmly, with the minutes when the server gives them", () => {
  assert.equal(directoryLimitText("too many directory requests -- try again in 12 minutes"), "The directory is busy for you right now. Try again in 12 minutes.");
  assert.equal(directoryLimitText("too many directory requests -- try again in 1 minutes"), "The directory is busy for you right now. Try again in 1 minute.");
  assert.equal(directoryLimitText(null), "The directory is busy for you right now. Try again in a few minutes.");
});
