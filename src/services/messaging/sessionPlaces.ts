import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { describeBookingError, describeCancelError, parsePlaces, placesBatches, type SessionPlaces } from "./groupCardsModel";

// Round D · places on a session shared in a group (Database 20261223040000).
// Free sessions only, no waitlist:
// - shared_session_places(p_message_ids): up to 200 session cards at once;
// - book_shared_session(p_message_id) → invitee id: joins as an accepted
//   invitee, again is a no-op; ATXM0 full, ATXM1 paid, ATX10 started, 20 an
//   hour (ATX02); the professional's hub is told (pro.session.booked);
// - cancel_shared_session_booking(p_message_id): frees the place.
// Only members who can still act in the thread read or book. The
// professional sets calendar_events.capacity (1-500, null = no limit) on the
// event itself (pro Calendar).

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }> };
const rpc = () => supabase as unknown as Rpc;

export type Done = { ok: true } | { ok: false; message: string };

/** Places for these session cards, by message id. A refused or failed batch is left out (no line, no button). */
export async function fetchSessionPlaces(messageIds: string[]): Promise<Record<string, SessionPlaces>> {
  const out: Record<string, SessionPlaces> = {};
  for (const batch of placesBatches(messageIds)) {
    const { data, error } = await rpc().rpc("shared_session_places", { p_message_ids: batch });
    if (error) {
      // 42883: a database without Round D yet. Either way the cards draw as before.
      if (error.code !== "42883") console.error("[places] Could not read places:", error.code, error.message);
      continue;
    }
    Object.assign(out, parsePlaces(data));
  }
  return out;
}

export async function bookSharedSession(messageId: string, proFirstName: string): Promise<Done> {
  const { error } = await rpc().rpc("book_shared_session", { p_message_id: messageId });
  if (!error) return { ok: true };
  console.error("[places] book_shared_session refused:", error.code, error.message);
  return { ok: false, message: describeBookingError(error, proFirstName) };
}

export async function cancelSharedSessionBooking(messageId: string): Promise<Done> {
  const { error } = await rpc().rpc("cancel_shared_session_booking", { p_message_id: messageId });
  if (!error) return { ok: true };
  console.error("[places] cancel_shared_session_booking refused:", error.code, error.message);
  return { ok: false, message: describeCancelError(error) };
}

type EventsTable = {
  from: (t: "calendar_events") => {
    select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { capacity?: number | null } | null; error: PostgrestError | null }> } };
    update: (row: { capacity: number | null }) => { eq: (k: string, v: string) => PromiseLike<{ error: PostgrestError | null }> };
  };
};
const events = () => (supabase as unknown as EventsTable).from("calendar_events");

/** An own event's capacity: a number, null (no limit), or undefined when it can't be read. */
export async function fetchEventCapacity(eventId: string): Promise<number | null | undefined> {
  const { data, error } = await events().select("capacity").eq("id", eventId).maybeSingle();
  if (error || !data) return undefined;
  return typeof data.capacity === "number" ? data.capacity : null;
}

/** Sets an own event's places (1-500), or null for no limit. */
export async function saveEventCapacity(eventId: string, capacity: number | null): Promise<Done> {
  const { error } = await events().update({ capacity }).eq("id", eventId);
  if (!error) return { ok: true };
  console.error("[places] Could not save the capacity:", error.code, error.message);
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "23514") return { ok: false, message: "Places is a whole number from 1 to 500. Leave it empty for no limit." };
  return { ok: false, message: "The event is saved, but its places couldn't be. Try again." };
}
