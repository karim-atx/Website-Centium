import { supabase } from "../../../lib/supabase/client";
import type { Tables, TablesInsert } from "../../../lib/supabase/database.types";
import type { CalendarEvent } from "../../types";

// The client's own calendar, and the invitations they have received.
//
// WHAT THIS REPLACES. calendarEvents was `usePersistentState` with no service
// behind it, and ClientCalendarTab decided what belonged to you with:
//
//   calendarEvents.filter((e) => e.createdByClient || e.invitees?.includes(user.firstName))
//
// `invitees` was an array of NAMES. Two accounts whose owner is called Sarah
// saw each other's events, and an invitation could not survive a rename, could
// not be answered, and could not be notified. The schema refused that array
// when calendar_events was written and said so in the migration; this is the
// client half of the join table that replaced it.
//
// SCOPED TO THE CLIENT TAB ON PURPOSE. The professional's CalendarTab writes
// the same local store and is Phase 2, so nothing here touches AppContext's
// `calendarEvents`. Wiring both surfaces to the server at once would mean
// changing a screen this phase has no mandate to test.
//
// UPDATE IS COLUMN-SCOPED, which decides the shape of saveEvent below.
// `authenticated` holds UPDATE on eleven columns only — not owner_id, not
// created_by_client, not source_template_assignment_id. A PostgREST .upsert()
// compiles to ON CONFLICT DO UPDATE SET every column in the payload, so it
// would be refused with 42501 the moment it included owner_id. That has
// already cost this project two debugging sessions; insert and update are
// written separately here.

/** Exactly the columns `authenticated` may UPDATE. Verified against column_privileges. */
type EditableRow = Pick<
  TablesInsert<"calendar_events">,
  | "title"
  | "event_date"
  | "all_day"
  | "start_time"
  | "end_time"
  | "location"
  | "url"
  | "notes"
  | "repeat"
  | "color"
>;

/**
 * How an invitation stands, derived rather than stored.
 *
 * The table has no status column: `responded_at is null` means unanswered,
 * and `accepted` carries the answer, with a CHECK tying them both ways. This
 * mirrors that rather than inventing a fourth state the database cannot hold.
 */
export type InviteStatus = "pending" | "accepted" | "declined";

export interface CalendarInvite {
  /** calendar_event_invitees.id — what a response writes to. */
  id: string;
  status: InviteStatus;
}

/** A calendar event as the client's screen needs it. */
export interface ClientCalendarEvent extends CalendarEvent {
  /** Owned by this account, and therefore editable. */
  mine: boolean;
  /** Present when this event arrived as an invitation. */
  invite?: CalendarInvite;
}

export type CalendarReadResult =
  | { ok: true; events: ClientCalendarEvent[] }
  | { ok: false; message: string };

export type CalendarWriteResult =
  | { ok: true; event: ClientCalendarEvent }
  | { ok: false; message: string };

const COLUMNS =
  "id, owner_id, title, event_date, all_day, start_time, end_time, location, url, notes, repeat, color, created_by_client";

type EventRow = Pick<
  Tables<"calendar_events">,
  | "id"
  | "owner_id"
  | "title"
  | "event_date"
  | "all_day"
  | "start_time"
  | "end_time"
  | "location"
  | "url"
  | "notes"
  | "repeat"
  | "color"
  | "created_by_client"
>;

/**
 * Times come back as `HH:MM:SS` from a `time` column; the UI's inputs and its
 * comparisons are `HH:MM`. Trimmed on the way in rather than at each of the
 * four places that render one.
 */
const toHHMM = (t: string | null): string | undefined => (t ? t.slice(0, 5) : undefined);

function toEvent(row: EventRow, userId: string, invite?: CalendarInvite): ClientCalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    allDay: row.all_day,
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    notes: row.notes ?? undefined,
    repeat: row.repeat,
    color: row.color ?? undefined,
    createdByClient: row.created_by_client,
    mine: row.owner_id === userId,
    invite,
  };
}

function statusOf(accepted: boolean | null, respondedAt: string | null): InviteStatus {
  if (respondedAt === null || accepted === null) return "pending";
  return accepted ? "accepted" : "declined";
}

/**
 * Everything on this client's calendar: their own events, plus every event
 * they have been invited to.
 *
 * TWO QUERIES, NOT ONE. RLS lets an owner, an invitee and an assigning
 * professional all select calendar_events, so an unfiltered read would quietly
 * mix in rows from the third path with no way to tell them apart. Asking for
 * owned rows explicitly and invited rows through the join table means every
 * row arrives labelled by how it got here.
 *
 * DECLINED INVITATIONS ARE INCLUDED, deliberately and per the migration: the
 * invitee keeps their SELECT after declining, and an event that vanished
 * without explanation would be worse than one marked declined.
 */
export async function getClientCalendar(userId: string): Promise<CalendarReadResult> {
  // Own events. created_by_client is pinned to true so this stays the
  // client's own calendar: an owned row with created_by_client false was
  // written by assign_template_to_client and belongs to the professional-side
  // surfaces, which are Phase 2.
  const owned = await supabase
    .from("calendar_events")
    .select(COLUMNS)
    .eq("owner_id", userId)
    .eq("created_by_client", true)
    .order("event_date", { ascending: true });

  if (owned.error) {
    console.error("[calendar] Could not load your events:", owned.error.message);
    return { ok: false, message: "Couldn't load your calendar. Check your connection and try again." };
  }

  // calendar_event_invitees is absent from database.types.ts — the table is
  // newer than the last generation of that file, exactly as is_admin was.
  // The query is real; only the typing is missing, so the client is cast here
  // rather than the generated file hand-edited, which regeneration would undo.
  const invitesClient = supabase as unknown as {
    from: (table: "calendar_event_invitees") => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => PromiseLike<{
          data:
            | {
                id: string;
                accepted: boolean | null;
                responded_at: string | null;
                calendar_events: EventRow | null;
              }[]
            | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const invited = await invitesClient
    .from("calendar_event_invitees")
    .select(`id, accepted, responded_at, calendar_events (${COLUMNS})`)
    .eq("invited_user_id", userId);

  if (invited.error) {
    console.error("[calendar] Could not load your invitations:", invited.error.message);
    return { ok: false, message: "Couldn't load your calendar. Check your connection and try again." };
  }

  const events: ClientCalendarEvent[] = (owned.data ?? []).map((r) => toEvent(r as EventRow, userId));

  for (const row of invited.data ?? []) {
    // A null embed means the event is gone and the cascade has not caught up,
    // or RLS refused it. Either way there is nothing to put on a calendar.
    if (!row.calendar_events) continue;
    events.push(
      toEvent(row.calendar_events, userId, {
        id: row.id,
        status: statusOf(row.accepted, row.responded_at),
      })
    );
  }

  return { ok: true, events };
}

export interface CalendarEventDraft {
  title: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  url?: string;
  notes?: string;
  repeat: CalendarEvent["repeat"];
  color?: string;
}

function toRow(draft: CalendarEventDraft): EditableRow {
  return {
    title: draft.title,
    event_date: draft.date,
    all_day: draft.allDay,
    // An all-day event has no times. Sending the picker's leftovers would
    // store a start and end nobody chose and nothing renders.
    start_time: draft.allDay ? null : draft.startTime ?? null,
    end_time: draft.allDay ? null : draft.endTime ?? null,
    location: draft.location?.trim() || null,
    url: draft.url?.trim() || null,
    notes: draft.notes?.trim() || null,
    repeat: draft.repeat,
    color: draft.color ?? null,
  };
}

export async function createEvent(
  userId: string,
  draft: CalendarEventDraft
): Promise<CalendarWriteResult> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...toRow(draft), owner_id: userId, created_by_client: true })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[calendar] Could not create event:", error?.message);
    return { ok: false, message: "Couldn't save that event. Try again." };
  }
  return { ok: true, event: toEvent(data as EventRow, userId) };
}

/**
 * Edits an owned event.
 *
 * `owner_id` IS IN THE FILTER, not the payload. The policy already restricts
 * this to your own rows, so the extra `.eq` changes nothing about what is
 * permitted — it is there so a bug that passed somebody else's id fails as
 * zero rows rather than silently relying on RLS being the only guard.
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  draft: CalendarEventDraft
): Promise<CalendarWriteResult> {
  const { data, error } = await supabase
    .from("calendar_events")
    .update(toRow(draft))
    .eq("id", eventId)
    .eq("owner_id", userId)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[calendar] Could not update event:", error?.message);
    return { ok: false, message: "Couldn't save your changes. Try again." };
  }
  return { ok: true, event: toEvent(data as EventRow, userId) };
}

export async function deleteEvent(
  userId: string,
  eventId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("owner_id", userId);

  if (error) {
    console.error("[calendar] Could not delete event:", error.message);
    return { ok: false, message: "Couldn't delete that event. Try again." };
  }
  return { ok: true };
}

/**
 * Answers an invitation.
 *
 * WRITES TWO COLUMNS AND NOTHING ELSE, which is all the grant allows:
 * `grant update (responded_at, accepted)`. Naming any other column here would
 * be refused with 42501 rather than ignored, so the narrowness is enforced
 * either way — this just says it at the call site too.
 *
 * DECLINING DOES NOT DELETE THE ROW. The invitee keeps their SELECT on both
 * the invitation and the event, so a declined event stays on the calendar
 * marked as declined, and the owner can still see who declined.
 */
export async function respondToInvite(
  inviteId: string,
  accepted: boolean
): Promise<{ ok: boolean; message?: string }> {
  const client = supabase as unknown as {
    from: (table: "calendar_event_invitees") => {
      update: (values: { accepted: boolean; responded_at: string }) => {
        eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };

  const { error } = await client
    .from("calendar_event_invitees")
    .update({ accepted, responded_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    console.error("[calendar] Could not record your response:", error.message);
    return { ok: false, message: "Couldn't save your response. Try again." };
  }
  return { ok: true };
}
