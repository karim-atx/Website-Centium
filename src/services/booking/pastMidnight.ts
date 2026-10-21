// ATXAA (Database 20261128000000): a booking can't run past midnight in the
// staff member's timezone, because a calendar event holds one date and a
// start and end time. Every booking path raises it: request_professional_booking,
// book_appointment and book_appointment_for refuse it when the booking is
// made, and accept_booking_request refuses an older request that crosses.
// One set of words for every screen. Pure, so node:test loads it.

export const PAST_MIDNIGHT_CODE = "ATXAA";

/** Shown to whoever is booking (client, visitor or the business booking for a client). */
export const PAST_MIDNIGHT_MESSAGE =
  "A session cannot run past midnight. Choose a start time that lets it finish on the same day, or book it as two sessions.";

/** Shown to a professional accepting a request whose time crosses midnight: they can't change its time, so they decline it. */
export const PAST_MIDNIGHT_ACCEPT_MESSAGE =
  "This session runs past midnight, so it can't go on your calendar. Decline it and ask the client to choose an earlier start or book two sessions.";
