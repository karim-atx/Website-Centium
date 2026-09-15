import { useCallback, useEffect, useState } from "react";
import {
  createEvent,
  deleteEvent,
  fetchInviteCandidates,
  fetchInvitees,
  getCalendar,
  setEventInvitees,
  updateEvent,
  uploadEventAttachment,
  type CalendarEventDraft,
  type ClientCalendarEvent,
  type InviteeRow,
} from "../services/calendar";

// The server-backed calendar, shared by the professional's tab and the
// business's.
//
// A HOOK RATHER THAN THE SAME 150 LINES TWICE. Both screens need the identical
// plumbing — hydrate, create, edit, delete, diff the invitee list, attach a
// file, reload — and both are already large components whose calendar grids
// differ but whose data layer does not. Two copies would drift, and the first
// thing to drift would be the invitee diff, which is the part that quietly
// destroys other people's answers when it is wrong.

export interface UseServerCalendar {
  events: ClientCalendarEvent[];
  /** Invitees on the events this account owns, keyed by event id. */
  invitees: Record<string, InviteeRow[]>;
  /** Everyone this account is entitled to invite. */
  candidates: InviteeRow[];
  loadError: string | null;
  saving: boolean;
  saveError: string | null;
  setSaveError: (message: string | null) => void;
  reload: () => Promise<void>;
  saveEvent: (
    editingId: string | null,
    draft: CalendarEventDraft,
    inviteeIds: string[],
    repeatOccurrences?: string[]
  ) => Promise<boolean>;
  removeEvent: (eventId: string) => Promise<boolean>;
  attachFile: (eventId: string, file: File) => Promise<boolean>;
}

export function useServerCalendar(
  authUserId: string | null,
  profileReady: boolean
): UseServerCalendar {
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [invitees, setInvitees] = useState<Record<string, InviteeRow[]>>({});
  const [candidates, setCandidates] = useState<InviteeRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!authUserId) return;
    const result = await getCalendar(authUserId);
    if (!result.ok) {
      // A failed read keeps whatever is on screen. Blanking a calendar looks
      // exactly like losing everything on it.
      setLoadError(result.message);
      return;
    }
    setLoadError(null);
    setEvents(result.events);
    // Only events this account owns can have invitees it may read, so asking
    // about the rest would be a request the policy answers with nothing.
    const owned = result.events.filter((e) => e.mine).map((e) => e.id);
    setInvitees(await fetchInvitees(owned));
  }, [authUserId]);

  // One effect for both reads. They fire together, they are cancelled
  // together, and keeping them apart bought nothing except a second place to
  // forget the readiness gate.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      await reload();
      const rows = await fetchInviteCandidates(authUserId);
      if (!cancelled) setCandidates(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, authUserId, reload]);

  const saveEvent = useCallback(
    async (
      editingId: string | null,
      draft: CalendarEventDraft,
      inviteeIds: string[],
      repeatOccurrences: string[] = []
    ): Promise<boolean> => {
      if (!authUserId || saving) return false;
      setSaving(true);
      setSaveError(null);

      const result = editingId
        ? await updateEvent(authUserId, editingId, draft)
        : await createEvent(authUserId, draft);

      if (!result.ok) {
        setSaving(false);
        setSaveError(result.message);
        return false;
      }

      // INVITEES SECOND, AND A FAILURE HERE IS REPORTED WITHOUT UNDOING THE
      // EVENT. The event saved; refusing to admit that because the guest list
      // did not would be worse than saying which half worked. The message
      // carries the ATX code's own meaning — see describeInviteError.
      const guests = await setEventInvitees(result.event.id, inviteeIds);

      // Recurrence is generated as independent rows, matching what the local
      // version did: each occurrence is its own editable, deletable event
      // rather than a rule nothing in the schema stores. Only on creation —
      // editing one occurrence has never fanned out to the others.
      if (!editingId) {
        for (const date of repeatOccurrences) {
          const extra = await createEvent(authUserId, { ...draft, date });
          if (extra.ok && inviteeIds.length > 0) {
            await setEventInvitees(extra.event.id, inviteeIds);
          }
        }
      }

      await reload();
      setSaving(false);
      if (!guests.ok) {
        setSaveError(guests.message ?? "Couldn't update the invitations.");
        return false;
      }
      return true;
    },
    [authUserId, saving, reload]
  );

  const removeEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!authUserId || saving) return false;
      setSaving(true);
      setSaveError(null);
      const result = await deleteEvent(authUserId, eventId);
      setSaving(false);
      if (!result.ok) {
        setSaveError(result.message ?? "Couldn't delete that event.");
        return false;
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return true;
    },
    [authUserId, saving]
  );

  const attachFile = useCallback(
    async (eventId: string, file: File): Promise<boolean> => {
      if (!authUserId) return false;
      setSaving(true);
      setSaveError(null);
      const result = await uploadEventAttachment(eventId, authUserId, file);
      setSaving(false);
      if (!result.ok) {
        setSaveError(result.message ?? "That file couldn't be attached.");
        return false;
      }
      await reload();
      return true;
    },
    [authUserId, reload]
  );

  return {
    events,
    invitees,
    candidates,
    loadError,
    saving,
    saveError,
    setSaveError,
    reload,
    saveEvent,
    removeEvent,
    attachFile,
  };
}
