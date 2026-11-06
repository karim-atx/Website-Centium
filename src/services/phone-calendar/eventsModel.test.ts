import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, buildPhoneEvents, BOOKINGS_PATH, calendarWindow, CLIENT_CALENDAR_PATH, localIso, TEACHING_PATH, type BookedEventIn, type PhoneEventsInput } from "./eventsModel.ts";

const TODAY = "2026-11-06";
const booking = (over: Partial<BookedEventIn> = {}): BookedEventIn => ({
  id: "e1",
  title: "Spin class · Harbour Gym",
  date: TODAY,
  allDay: false,
  startTime: "18:00",
  endTime: "18:45",
  location: "Harbour Gym, Hamra",
  mine: true,
  sourceKind: "class_booking",
  ...over,
});
const base: PhoneEventsInput = { accountType: "customer", today: TODAY, booked: [booking()], taught: null, hideDetails: false, neutralTitle: "Centium booking" };

describe("buildPhoneEvents", () => {
  it("writes a booking with a stable id, its times as ISO and its in-app path", () => {
    assert.deepEqual(buildPhoneEvents(base), [
      { id: "event:e1", title: "Spin class · Harbour Gym", start: localIso(TODAY, "18:00"), end: localIso(TODAY, "18:45"), allDay: false, location: "Harbour Gym, Hamra", url: BOOKINGS_PATH },
    ]);
    // The same row gives the same id on every sync.
    assert.equal(buildPhoneEvents(base)[0].id, buildPhoneEvents({ ...base, booked: [booking({ title: "Moved" })] })[0].id);
  });

  it("keeps the past 7 days and the next 90 only", () => {
    assert.deepEqual(calendarWindow(TODAY), { from: "2026-10-30", to: "2027-02-04" });
    const days = [-8, -7, 0, 90, 91].map((n) => addDays(TODAY, n));
    const out = buildPhoneEvents({ ...base, booked: days.map((d, n) => booking({ id: `e${n}`, date: d })) });
    assert.deepEqual(out.map((e) => e.id), ["event:e1", "event:e2", "event:e3"]);
  });

  it("takes bookings, hires, appointments and accepted places; nothing else", () => {
    const out = buildPhoneEvents({
      ...base,
      booked: [
        booking({ id: "class", sourceKind: "class_booking" }),
        booking({ id: "hire", sourceKind: "hire" }),
        booking({ id: "appt", sourceKind: "appointment" }),
        booking({ id: "own", sourceKind: undefined }),
        booking({ id: "coach", sourceKind: "appointment", scheduledForClient: true }),
        booking({ id: "place", mine: false, sourceKind: undefined, invite: { status: "accepted" } }),
        booking({ id: "pending", mine: false, sourceKind: undefined, invite: { status: "pending" } }),
        booking({ id: "declined", mine: false, sourceKind: undefined, invite: { status: "declined" } }),
      ],
    });
    assert.deepEqual(out.map((e) => e.id).sort(), ["event:appt", "event:class", "event:hire", "event:place"]);
    assert.equal(out.find((e) => e.id === "event:place")?.url, CLIENT_CALENDAR_PATH);
  });

  it("an all-day booking is its date; a missing end time is an hour", () => {
    const [allDay] = buildPhoneEvents({ ...base, booked: [booking({ allDay: true, startTime: undefined, endTime: undefined })] });
    assert.equal(allDay.allDay, true);
    assert.equal(allDay.start, TODAY);
    assert.equal(allDay.end, TODAY);
    const [open] = buildPhoneEvents({ ...base, booked: [booking({ endTime: undefined })] });
    assert.equal(open.end, localIso(TODAY, "19:00"));
  });

  it("Hide details on lock screen: every title is neutral and no location is written", () => {
    const out = buildPhoneEvents({
      ...base,
      accountType: "professional",
      hideDetails: true,
      taught: [{ classSessionId: "s1", title: "Morning HIIT", location: "Cedar Studio", date: TODAY, start: "07:00", end: "08:00", status: "scheduled" }],
    });
    assert.deepEqual(out.map((e) => e.title), ["Centium booking", "Centium booking"]);
    assert.deepEqual(out.map((e) => e.location), [null, null]);
  });

  it("a professional also gets the classes they teach, cancelled ones left out", () => {
    const out = buildPhoneEvents({
      ...base,
      accountType: "professional",
      taught: [
        { classSessionId: "s1", title: "Morning HIIT", location: "Cedar Studio", date: TODAY, start: "07:00", end: "08:00", status: "scheduled" },
        { classSessionId: "s2", title: "Yoga", location: null, date: TODAY, start: "09:00", end: "10:00", status: "cancelled" },
      ],
    });
    assert.deepEqual(out.map((e) => [e.id, e.url]), [["class:s1", TEACHING_PATH], ["event:e1", BOOKINGS_PATH]]);
    // A client is never given taught classes, even if a list is passed.
    assert.equal(buildPhoneEvents({ ...base, taught: [{ classSessionId: "s1", title: "x", location: null, date: TODAY, start: "07:00", end: "08:00", status: "scheduled" }] }).length, 1);
  });

  it("a business account gets nothing", () => {
    assert.deepEqual(buildPhoneEvents({ ...base, accountType: "business" }), []);
  });
});
