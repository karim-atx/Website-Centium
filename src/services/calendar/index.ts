import { supabase } from "../../../lib/supabase/client";
import type { Tables, TablesInsert } from "../../../lib/supabase/database.types";
import type { CalendarEvent } from "../../types";
import { signedUrlFor, uploadPrivateFile } from "../storage";

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
  /** Owned by this account. NOT the same as editable — see assignmentSourced. */
  mine: boolean;
  /**
   * Written onto this calendar by assign_template_to_client, not by the
   * person whose calendar it is.
   *
   * OWNED BUT NOT THEIRS TO CHANGE, and the distinction is a product one
   * rather than a permission one. The client IS the owner_id, so
   * calendar_events_update_own and _delete_own both admit them — measured,
   * not inferred: an update renamed the row and a delete removed it, both
   * without error. The reason the UI refuses anyway is that
   * assign_template_to_client deletes and re-inserts this row on every
   * re-assignment, so an edit survives only until the coach next moves the
   * day, and a delete comes back. Offering an action that silently reverts
   * later is worse than not offering it.
   */
  assignmentSourced: boolean;
  /** Present when this event arrived as an invitation. */
  invite?: CalendarInvite;
  /** Storage path in calendar-attachments; signed per view, never stored as a URL. */
  attachmentPath?: string;
  /**
   * A session THIS account scheduled for somebody else, read through
   * calendar_events_select_assigning_professional. Owned by the client, shown
   * on the professional's calendar because it is their working day — and
   * read-only here for the same reason it is read-only for the client:
   * assign_template_to_client rewrites the row on every re-assignment.
   */
  scheduledForClient?: boolean;
}

export type CalendarReadResult =
  | { ok: true; events: ClientCalendarEvent[] }
  | { ok: false; message: string };

export type CalendarWriteResult =
  | { ok: true; event: ClientCalendarEvent }
  | { ok: false; message: string };

const COLUMNS =
  "id, owner_id, title, event_date, all_day, start_time, end_time, location, url, notes, repeat, color, created_by_client, attachment_path";

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
> & {
  // Not in the generated Row type yet — the column is newer than the last
  // regeneration of database.types.ts, like calendar_event_invitees.
  attachment_path: string | null;
};

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
    // Only meaningful on a row you own: somebody else's event being
    // assignment-sourced is not a thing this screen can see or act on.
    assignmentSourced: row.owner_id === userId && !row.created_by_client,
    attachmentPath: row.attachment_path ?? undefined,
    invite,
  };
}

function statusOf(accepted: boolean | null, respondedAt: string | null): InviteStatus {
  if (respondedAt === null || accepted === null) return "pending";
  return accepted ? "accepted" : "declined";
}

/**
 * Everything on this account's calendar: their own events, plus every event
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
export async function getCalendar(userId: string): Promise<CalendarReadResult> {
  // EVERY EVENT ON THIS CALENDAR, whoever created it. Phase 1 pinned
  // created_by_client to true and so hid the sessions a professional had
  // scheduled — which are the events a client is least able to afford to
  // miss, and which V9 asked this screen to show in the first place ("syncs
  // up with anything the connected professional might add").
  //
  // The third SELECT path — an assigning professional reading their own
  // client's row — cannot reach here, because that policy only matches when
  // auth.uid() owns the template, and this query pins owner_id to the caller.
  const owned = await supabase
    .from("calendar_events")
    .select(COLUMNS)
    .eq("owner_id", userId)
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

  // THE THIRD READ PATH, AND IT IS WHY calendar_events_select_assigning_
  // professional EXISTS. A session a professional scheduled for a client is
  // owned by the CLIENT, so the owner query above cannot see it — but it is
  // the professional's working day, and their calendar was the one place it
  // never appeared.
  //
  // NO OWNER FILTER, DELIBERATELY: that policy already restricts these rows to
  // assignments whose template this account owns, so RLS is the filter. The
  // two predicates here narrow it to assignment-sourced rows so the query
  // cannot accidentally widen if another policy is added later. For anyone who
  // is not an assigning professional — every client — it returns nothing.
  const scheduled = await supabase
    .from("calendar_events")
    .select(COLUMNS)
    .eq("created_by_client", false)
    .not("source_template_assignment_id", "is", null);

  if (scheduled.error) {
    console.error("[calendar] Could not load scheduled sessions:", scheduled.error.message);
  }

  const events: ClientCalendarEvent[] = (owned.data ?? []).map((r) => toEvent(r as unknown as EventRow, userId));

  const seen = new Set(events.map((e) => e.id));
  for (const row of scheduled.data ?? []) {
    const event = toEvent(row as unknown as EventRow, userId);
    // A client owns their own assignment-sourced rows and has already seen
    // them above; this only adds the ones belonging to somebody else.
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    events.push({ ...event, scheduledForClient: true });
  }

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
  return { ok: true, event: toEvent(data as unknown as EventRow, userId) };
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
  return { ok: true, event: toEvent(data as unknown as EventRow, userId) };
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

// ===========================================================================
// PHASE 2: the inviting side.
//
// Everything above is what a person does with their own calendar and the
// invitations on it. Everything below is what a professional or a business
// does when they put an event on somebody else's — choosing who, seeing what
// each of them said, and attaching a file the invitees can open.
// ===========================================================================

/** Someone this account is entitled to invite, with their answer if asked. */
export interface InviteeRow {
  /** calendar_event_invitees.id, absent until they are actually invited. */
  inviteId?: string;
  userId: string;
  name: string;
  status?: InviteStatus;
}

/**
 * Turns the guard trigger's SQLSTATEs into sentences.
 *
 * NONE OF THESE SHOULD BE REACHABLE from a correctly scoped picker, which is
 * exactly why they are worth translating. A refusal that only happens when
 * something else is already wrong is the one a user meets with no idea what
 * to do, and `new row violates...` helps nobody.
 */
function describeInviteError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? "";
  if (code === "ATX12") {
    // The picker only offers people from an active relationship, so reaching
    // this means the relationship ended between opening the sheet and saving.
    return "You can only invite people you currently work with. That connection may have ended — reopen this event and try again.";
  }
  if (code === "ATX10") {
    // assign_template_to_client's own events. Not offered for editing at all,
    // so this needs a real bug to reach.
    return "Sessions scheduled from a program can't have invitees.";
  }
  if (code === "ATX08") {
    return "That event no longer exists.";
  }
  return "Couldn't update the invitations. Try again.";
}

/**
 * Who this account may put an event in front of.
 *
 * MIRRORS can_invite_to_calendar RATHER THAN RE-DERIVING IT: an active
 * professional-client engagement either way round, or an employment
 * relationship either way round. The database is the authority — this is the
 * picker, and a picker that offered somebody the trigger would refuse is a
 * worse experience than one that is slightly conservative.
 */
export async function fetchInviteCandidates(userId: string): Promise<InviteeRow[]> {
  const pairs = new Set<string>();

  const clients = await supabase
    .from("professional_clients")
    .select("professional_id, client_id")
    .is("disconnected_at", null);
  for (const row of clients.data ?? []) {
    if (row.professional_id === userId) pairs.add(row.client_id);
    else if (row.client_id === userId) pairs.add(row.professional_id);
  }

  // Employment, both directions. business_id points at business_profiles.id,
  // so the ACCOUNT on the business side is business_profiles.profile_id —
  // getting that wrong would offer an id the trigger has never heard of.
  const employees = await supabase
    .from("business_employees")
    .select("professional_id, business_profiles (profile_id)");
  for (const row of (employees.data ?? []) as unknown as {
    professional_id: string;
    business_profiles: { profile_id: string } | null;
  }[]) {
    const businessAccount = row.business_profiles?.profile_id;
    if (!businessAccount) continue;
    if (businessAccount === userId) pairs.add(row.professional_id);
    else if (row.professional_id === userId) pairs.add(businessAccount);
  }

  if (pairs.size === 0) return [];

  // related_profile_summary rather than profiles: it is the view this app
  // already reads names through for exactly these relationships, and profiles
  // itself is not selectable for somebody else.
  const names = await supabase
    .from("related_profile_summary")
    .select("id, first_name")
    .in("id", [...pairs]);

  return (names.data ?? []).map((p) => ({
    userId: p.id as string,
    name: (p.first_name as string | null)?.trim() || "Unnamed",
  }));
}

/** The invitees on events this account owns, keyed by event id. */
export async function fetchInvitees(eventIds: string[]): Promise<Record<string, InviteeRow[]>> {
  if (eventIds.length === 0) return {};

  const client = supabase as unknown as {
    from: (table: "calendar_event_invitees") => {
      select: (columns: string) => {
        in: (
          column: string,
          values: string[]
        ) => PromiseLike<{
          data:
            | {
                id: string;
                calendar_event_id: string;
                invited_user_id: string;
                accepted: boolean | null;
                responded_at: string | null;
              }[]
            | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const rows = await client
    .from("calendar_event_invitees")
    .select("id, calendar_event_id, invited_user_id, accepted, responded_at")
    .in("calendar_event_id", eventIds);

  if (rows.error) {
    console.error("[calendar] Could not load invitees:", rows.error.message);
    return {};
  }

  const ids = [...new Set((rows.data ?? []).map((r) => r.invited_user_id))];
  const names = ids.length
    ? await supabase.from("related_profile_summary").select("id, first_name").in("id", ids)
    : { data: [] as { id: string | null; first_name: string | null }[] };
  const nameById = new Map(
    (names.data ?? []).map((p) => [p.id as string, (p.first_name as string | null)?.trim() || "Unnamed"])
  );

  const byEvent: Record<string, InviteeRow[]> = {};
  for (const r of rows.data ?? []) {
    (byEvent[r.calendar_event_id] ??= []).push({
      inviteId: r.id,
      userId: r.invited_user_id,
      // A name we cannot resolve is shown as such rather than dropped: the
      // owner still needs to know somebody is on the list.
      name: nameById.get(r.invited_user_id) ?? "Someone you work with",
      status: statusOf(r.accepted, r.responded_at),
    });
  }
  return byEvent;
}

/**
 * Makes the invitee list match `userIds` — inserting the new, deleting the gone.
 *
 * A DIFF RATHER THAN DELETE-ALL-THEN-INSERT, and the difference is other
 * people's answers. Clearing the list first would throw away every
 * responded_at and accepted on it, so re-saving an event after changing its
 * time would silently un-answer everybody who had already replied.
 */
export async function setEventInvitees(
  eventId: string,
  userIds: string[]
): Promise<{ ok: boolean; message?: string }> {
  const existing = await fetchInvitees([eventId]);
  const current = existing[eventId] ?? [];

  const wanted = new Set(userIds);
  const toAdd = userIds.filter((id) => !current.some((c) => c.userId === id));
  const toRemove = current.filter((c) => !wanted.has(c.userId));

  const client = supabase as unknown as {
    from: (table: "calendar_event_invitees") => {
      insert: (
        rows: { calendar_event_id: string; invited_user_id: string; invited_by: string }[]
      ) => PromiseLike<{ error: { code?: string; message?: string } | null }>;
      delete: () => {
        in: (column: string, values: string[]) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };

  if (toRemove.length > 0) {
    const removed = await client
      .from("calendar_event_invitees")
      .delete()
      .in(
        "id",
        toRemove.map((r) => r.inviteId!).filter(Boolean)
      );
    if (removed.error) {
      console.error("[calendar] Could not remove invitees:", removed.error.message);
      return { ok: false, message: "Couldn't update the invitations. Try again." };
    }
  }

  if (toAdd.length > 0) {
    const { data: session } = await supabase.auth.getSession();
    const me = session.session?.user.id;
    if (!me) return { ok: false, message: "You need to be signed in to invite someone." };

    const added = await client
      .from("calendar_event_invitees")
      .insert(toAdd.map((id) => ({ calendar_event_id: eventId, invited_user_id: id, invited_by: me })));
    if (added.error) {
      console.error("[calendar] Could not add invitees:", added.error.message);
      return { ok: false, message: describeInviteError(added.error) };
    }
  }

  return { ok: true };
}

/**
 * Attaches a file to an event, replacing the fake one.
 *
 * WHAT THIS REPLACES: the professional's compose sheet had a file input that
 * kept only `e.target.files?.[0]?.name` and folded it into the notes as
 * `Attachment: <filename>`. The bytes were never read. An event said it had a
 * document and there was no document.
 *
 * A FRESH OBJECT NAME EVERY TIME, which the column's own comment insists on:
 * an attachment is visible to invitees, so overwriting one in place would
 * change a document other people have already opened with nothing to signal
 * it. uploadPrivateFile generates the name, so this is true by construction.
 *
 * THE OLD OBJECT IS NOT DELETED, and cannot be: the bucket has no DELETE
 * policy, matching message-attachments, because removing a file a second
 * person may have opened is not a per-user decision. deletePrivateFile's type
 * refuses this bucket outright, which is where that rule is enforced.
 */
export async function uploadEventAttachment(
  eventId: string,
  userId: string,
  file: File
): Promise<{ ok: boolean; path?: string; message?: string }> {
  const upload = await uploadPrivateFile({ bucket: "calendar-attachments", userId, eventId, file });
  if (!upload.ok || !upload.path) {
    return { ok: false, message: upload.message ?? "That file couldn't be attached." };
  }

  // attachment_path is absent from database.types.ts for the same reason
  // calendar_event_invitees is: the column is newer than the last generation
  // of that file. The grant is real — `grant insert (attachment_path), update
  // (attachment_path) on calendar_events to authenticated`.
  const withAttachment = supabase.from("calendar_events") as unknown as {
    update: (values: { attachment_path: string }) => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };

  const { error } = await withAttachment.update({ attachment_path: upload.path }).eq("id", eventId);

  if (error) {
    console.error("[calendar] Could not record the attachment:", error.message);
    return { ok: false, message: "That file uploaded but couldn't be attached. Try again." };
  }
  return { ok: true, path: upload.path };
}

/** A short-lived URL for opening an attachment. Minted per view, never stored. */
export async function attachmentUrl(path: string) {
  return await signedUrlFor("calendar-attachments", path);
}
