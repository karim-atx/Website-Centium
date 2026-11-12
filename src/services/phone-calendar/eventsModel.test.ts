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
const base: PhoneEventsInput = { accountType: "customer", today: TODAY, booked: [booking()], taught: null, hideDetails: false, neutralTitle: "Centium booking", neutralEventTitle: "Centium event" };
/** The person's own event: no source_kind, no invitation. */
const ownEvent = (over: Partial<BookedEventIn> = {}): BookedEventIn => booking({ id: "p1", title: "Dentist", location: "Achrafieh", sourceKind: undefined, ...over });

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

  it("takes bookings, hires, appointments, accepted places and own events; nothing else", () => {
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
    assert.deepEqual(out.map((e) => e.id).sort(), ["event:appt", "event:class", "event:hire", "event:own", "event:place"]);
    assert.equal(out.find((e) => e.id === "event:place")?.url, CLIENT_CALENDAR_PATH);
    assert.equal(out.find((e) => e.id === "event:own")?.url, CLIENT_CALENDAR_PATH);
  });

  it("an own event is written as it is, inside the same window", () => {
    assert.deepEqual(buildPhoneEvents({ ...base, booked: [ownEvent()] }), [
      { id: "event:p1", title: "Dentist", start: localIso(TODAY, "18:00"), end: localIso(TODAY, "18:45"), allDay: false, location: "Achrafieh", url: CLIENT_CALENDAR_PATH },
    ]);
    const days = [-8, -7, 90, 91].map((n) => addDays(TODAY, n));
    const out = buildPhoneEvents({ ...base, booked: days.map((d, n) => ownEvent({ id: `p${n}`, date: d })) });
    assert.deepEqual(out.map((e) => e.id), ["event:p1", "event:p2"]);
  });

  it("a repeating own event is one phone event per occurrence, with that day's change or cancellation", () => {
    const weekly = ownEvent({ id: "gym", title: "Gym", date: "2026-10-23", repeat: "weekly", repeatUntil: "2026-11-27" });
    const out = buildPhoneEvents({
      ...base,
      booked: [weekly],
      exceptions: {
        gym: {
          "2026-11-06": { cancelled: true, override: null },
          "2026-11-13": { cancelled: false, override: { title: "Gym (late)", start_time: "20:00:00", end_time: "21:00:00" } },
        },
      },
    });
    // 23 Oct is before the window (30 Oct); 6 Nov is cancelled; the series ends 27 Nov.
    assert.deepEqual(out.map((e) => e.id), ["event:gym:2026-10-30", "event:gym:2026-11-13", "event:gym:2026-11-20", "event:gym:2026-11-27"]);
    const late = out.find((e) => e.id === "event:gym:2026-11-13");
    assert.equal(late?.title, "Gym (late)");
    assert.equal(late?.start, localIso("2026-11-13", "20:00"));
    assert.equal(late?.end, localIso("2026-11-13", "21:00"));
  });

  it("a programme session a coach put on the person's calendar goes in; one scheduled for a client stays out", () => {
    const out = buildPhoneEvents({
      ...base,
      booked: [ownEvent({ id: "programme" }), ownEvent({ id: "for-client", mine: false, scheduledForClient: true })],
    });
    assert.deepEqual(out.map((e) => e.id), ["event:programme"]);
  });

  it("a professional's own events open on their calendar", () => {
    const out = buildPhoneEvents({ ...base, accountType: "professional", booked: [ownEvent()] });
    assert.deepEqual(out.map((e) => e.url), [TEACHING_PATH]);
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
      booked: [booking(), ownEvent({ startTime: "20:00", endTime: "21:00" })],
      taught: [{ classSessionId: "s1", title: "Morning HIIT", location: "Cedar Studio", date: TODAY, start: "07:00", end: "08:00", status: "scheduled" }],
    });
    assert.deepEqual(out.map((e) => e.title), ["Centium booking", "Centium booking", "Centium event"]);
    assert.deepEqual(out.map((e) => e.location), [null, null, null]);
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
