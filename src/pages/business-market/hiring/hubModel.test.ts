import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicantTag,
  bannerStub,
  busyText,
  countLine,
  daysLabel,
  emptyForm,
  feeNote,
  footLine,
  hiredLine,
  hiredState,
  offerBody,
  offerPayText,
  offerStartDate,
  offerTitle,
  openingTag,
  parseForm,
  payLine,
  personRating,
  scheduleLine,
  sentStrip,
  hiredStrip,
  seriesOptions,
  sessionOptions,
  startsText,
  tabOf,
  teamButtonText,
} from "./hubModel.ts";
import type { BusinessClassRow } from "../../../services/business-classes/types.ts";

// Local times built from local Dates, so the tests hold in any time zone.
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();

const base = { applicantCount: 0, newApplicantCount: 0, hiredName: null, hiredAt: null, hiredPath: null, closedAt: null } as const;

test("tabs and the count line", () => {
  assert.equal(tabOf(null), "open");
  assert.equal(tabOf("filled"), "filled");
  assert.equal(tabOf("nope"), "open");
  assert.equal(countLine("open", 3), "3 open");
  assert.equal(countLine("filled", 2), "2 filled");
  assert.equal(countLine("closed", 1), "1 closed");
  assert.equal(countLine("open", 0), "No openings");
  assert.equal(teamButtonText(null), "Team");
  assert.equal(teamButtonText(3), "Team · 3");
});

test("tags", () => {
  assert.equal(openingTag({ status: "open", type: "role" }), "ROLE");
  assert.equal(openingTag({ status: "open", type: "class_slot" }), "CLASS SLOT");
  assert.equal(openingTag({ status: "filled", type: "role" }), "FILLED");
  assert.equal(openingTag({ status: "closed", type: "class_slot" }), "CLOSED");
  assert.equal(applicantTag({ status: "APPLIED", isNew: true }), "NEW");
  assert.equal(applicantTag({ status: "APPLIED", isNew: false }), "APPLIED");
  assert.equal(applicantTag({ status: "SHORTLISTED", isNew: true }), "SHORTLISTED");
});

test("schedule line: 12-hour, month first", () => {
  assert.equal(daysLabel([7]), "Sun");
  assert.equal(daysLabel([3, 1]), "Mon and Wed");
  assert.equal(daysLabel([1, 3, 5]), "Mon, Wed and Fri");
  assert.equal(daysLabel([1, 2, 3, 4, 5]), "Mon to Fri");
  assert.equal(scheduleLine({ type: "role", className: "Spin 45", startsAt: at(2026, 11, 1, 10), weekdays: [7], classesPerMonth: 4 }), "Spin 45 · Sun 10:00 AM · 4 classes a month");
  assert.equal(scheduleLine({ type: "class_slot", className: "Spin 45", startsAt: at(2026, 10, 24, 9), weekdays: [], classesPerMonth: null }), "Spin 45 · Sat, Oct 24, 9:00 AM · one-off");
  assert.equal(scheduleLine({ type: "role", className: null, startsAt: at(2026, 10, 26, 6), weekdays: [1, 2, 3, 4, 5], classesPerMonth: null }), "Mon to Fri 6:00 AM");
  assert.equal(scheduleLine({ type: "role", className: "Yoga", startsAt: null, weekdays: [], classesPerMonth: 1 }), "Yoga · 1 class a month");
});

test("pay line", () => {
  assert.equal(payLine({ pay: 80, payUnit: "per_class", positions: 1, status: "open" }), "$80 per class · 1 position");
  assert.equal(payLine({ pay: 60, payUnit: "per_slot", positions: 2, status: "open" }), "$60 for the slot · 2 positions");
  assert.equal(payLine({ pay: 900, payUnit: "per_month", positions: 1, status: "open" }), "$900 a month · 1 position");
  assert.equal(payLine({ pay: 60, payUnit: "per_class", positions: 1, status: "filled" }), "$60 per class");
  assert.equal(payLine({ pay: 37.5, payUnit: "per_slot", positions: 1, status: "closed" }), "$37.50 for the slot");
});

test("footer lines", () => {
  const now = new Date(2026, 9, 22);
  assert.deepEqual(footLine({ ...base, status: "open", applicantCount: 3, newApplicantCount: 2 }, false), { text: "3 applicants · 2 new", tone: "pdark" });
  assert.deepEqual(footLine({ ...base, status: "open", applicantCount: 1 }, false), { text: "1 applicant", tone: "pdark" });
  assert.deepEqual(footLine({ ...base, status: "open" }, false), { text: "No applicants yet", tone: "faint" });
  assert.deepEqual(footLine({ ...base, status: "open" }, true), { text: "Posted just now · no applicants yet", tone: "pdark" });
  assert.deepEqual(footLine({ ...base, status: "filled", hiredName: "Sami Tannous", hiredAt: "2026-09-14", hiredPath: "direct" }, false), { text: "Hired Sami Tannous · Sep 14, 2026 · direct offer", tone: "teal" });
  assert.deepEqual(footLine({ ...base, status: "filled", hiredName: "Rana Khoury", hiredAt: "2026-03-02", hiredPath: "opening" }, false), { text: "Hired Rana Khoury · Mar 2, 2026", tone: "teal" });
  assert.deepEqual(footLine({ ...base, status: "closed", closedAt: "2026-10-03" }, false, now), { text: "Closed Oct 3 · no hire", tone: "faint" });
  assert.deepEqual(footLine({ ...base, status: "closed", closedAt: "2025-10-03" }, false, now), { text: "Closed Oct 3, 2025 · no hire", tone: "faint" });
});

test("banner stub", () => {
  assert.deepEqual(bannerStub(24), { n: "24", unit: "days left" });
  assert.deepEqual(bannerStub(1), { n: "1", unit: "day left" });
  assert.deepEqual(bannerStub(0), { n: "Last", unit: "day" });
});

test("people lines (business wording)", () => {
  assert.equal(personRating({ rating: 4.8, reviewCount: 38, onTeam: true, distanceKm: 1.2 }), "4.8 · 38 reviews · on your Team");
  assert.equal(personRating({ rating: 4.6, reviewCount: 12, onTeam: false, distanceKm: 3.1 }), "4.6 · 12 reviews · 3.1 km");
  assert.equal(personRating({ rating: null, reviewCount: 0, onTeam: false, distanceKm: 4 }), "New · 4.0 km");
  assert.equal(personRating({ rating: 4.8, reviewCount: 38, onTeam: true, distanceKm: 1.2 }, false), "4.8 · 38 reviews · 1.2 km");
  assert.deepEqual(hiredLine(2), { text: "Hired via Centium · 2 roles", hired: true });
  assert.deepEqual(hiredLine(1), { text: "Hired via Centium · 1 role", hired: true });
  assert.deepEqual(hiredLine(0), { text: "New to Centium", hired: false });
  assert.equal(hiredState("2026-11-01"), "Hired · starts Sun, Nov 1 · on your Team");
  assert.equal(hiredState(null), "Hired · on your Team");
});

test("offer dialog strings", () => {
  assert.equal(offerTitle("Rana Khoury", false), "Offer Rana the role?");
  assert.equal(offerTitle("Rana Khoury", true), "Send this offer?");
  assert.equal(offerBody("Rana Khoury"), "Rana accepts in Opportunities. The hire is confirmed when they do.");
  assert.equal(offerPayText("role", 80, "per_class", 4), "$80 per class · 4 a month");
  assert.equal(offerPayText("role", 900, "per_month", null), "$900 a month");
  assert.equal(offerPayText("class_slot", 60, "per_slot", null), "$60 for the slot");
  assert.equal(startsText("2026-11-01"), "Sun, Nov 1, 2026");
  assert.equal(
    feeNote({ type: "role", minimumApplied: false, onTeam: true, name: "Rana Khoury", direct: false }),
    "Charged once when the hire is confirmed and added to your Centium bill. Rana is already on your Team: a new opening is a new hire.",
  );
  assert.equal(
    feeNote({ type: "role", minimumApplied: true, onTeam: false, name: "Sami Tannous", direct: false }),
    "The minimum for a role is $25. Charged once when the hire is confirmed and added to your Centium bill.",
  );
  assert.equal(
    feeNote({ type: "role", minimumApplied: false, onTeam: false, name: "Rana Khoury", direct: true }),
    "Charged once when the hire is confirmed and added to your Centium bill. Nothing recurring.",
  );
  assert.equal(sentStrip("Rana Khoury"), "Offer sent to Rana Khoury. Rana accepts in Opportunities.");
  assert.equal(hiredStrip(25.6), "Hired · one-time fee $25.60 added to your Centium bill");
  assert.equal(busyText({ start: at(2026, 11, 1, 10), end: at(2026, 11, 1, 11) }), "Sun, Nov 1, 10:00 to 11:00 AM");
});

test("offer start date", () => {
  const today = new Date(2026, 9, 22); // Thu, Oct 22
  assert.equal(offerStartDate({ startsAt: at(2026, 11, 1, 10), weekdays: [7] }, today), "2026-11-01");
  assert.equal(offerStartDate({ startsAt: at(2026, 3, 6, 18, 30), weekdays: [5] }, today), "2026-10-23");
  assert.equal(offerStartDate({ startsAt: null, weekdays: [] }, today), "2026-10-22");
});

test("the opening form", () => {
  const f = emptyForm();
  assert.equal(parseForm(f, "post", null), null);
  const role = { ...f, title: "Sunday Spin instructor", pay: "80", classesPerMonth: "4" };
  assert.deepEqual(parseForm(role, "post", null)?.pay, 80);
  assert.equal(parseForm({ ...role, classesPerMonth: "" }, "post", null), null, "per class needs classes a month");
  assert.equal(parseForm({ ...role, classesPerMonth: "", payUnit: "per_month", pay: "900" }, "post", null)?.payUnit, "per_month");
  assert.equal(parseForm({ ...role, positions: "0" }, "post", null), null);
  assert.equal(parseForm({ ...role, pay: "abc" }, "post", null), null);
  assert.equal(parseForm(role, "offer", null), null, "a direct offer needs Starts");
  assert.equal(parseForm({ ...role, startsOn: "2026-11-02" }, "offer", null)?.startsOn, "2026-11-02");
  const slot = { ...f, type: "class_slot" as const, pay: "60", sessionId: "c1" };
  assert.equal(parseForm(slot, "post", null), null, "a slot needs its class");
  const p = parseForm(slot, "post", "Saturday Spin 45 cover");
  assert.equal(p?.title, "Saturday Spin 45 cover");
  assert.equal(p?.payUnit, "per_slot");
  assert.equal(p?.classesPerMonth, null);
});

test("live classes → series and sessions", () => {
  const row = (id: string, date: string, startTime: string, seriesId: string | null, extra: Partial<BusinessClassRow> = {}): BusinessClassRow => ({
    id,
    title: "Spin 45",
    classType: "Spin",
    date,
    startTime,
    endTime: "10:45",
    maxCapacity: 12,
    professionalId: null,
    notes: null,
    price: "",
    paymentType: null,
    seriesId,
    ...extra,
  });
  const classes = [
    row("a", "2026-10-25", "10:00", "s1"),
    row("b", "2026-11-01", "10:00", "s1"),
    row("c", "2026-10-24", "09:00", null),
    row("d", "2026-10-20", "09:00", "s2"),
    row("e", "2026-10-31", "09:00", null, { cancelledAt: "2026-10-01" }),
  ];
  assert.deepEqual(seriesOptions(classes, "2026-10-22"), [{ id: "s1", title: "Spin 45", perWeek: 1, label: "Spin 45 · Sun 10:00 AM" }]);
  const s = sessionOptions(classes, "2026-10-22");
  assert.deepEqual(
    s.map((x) => x.label),
    ["Spin 45 · Sat, Oct 24, 9:00 AM", "Spin 45 · Sun, Oct 25, 10:00 AM", "Spin 45 · Sun, Nov 1, 10:00 AM"],
  );
  assert.equal(s[0].slotTitle, "Saturday Spin 45 cover");
  assert.equal(sessionOptions([row("t", "2026-10-22", "07:00", null), row("u", "2026-10-22", "18:00", null)], "2026-10-22", "09:30").length, 1, "earlier today is gone");
});
