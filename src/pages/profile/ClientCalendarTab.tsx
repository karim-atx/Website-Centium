import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JumpToToday } from "../../components/ui/JumpToToday";
import { calendarJump } from "../../components/ui/calendarJump";

import { Button } from "../../components/ui/Button";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { EventComposeSheet, type EventDraft } from "../../components/calendar/EventComposeSheet";
import { YearScroll } from "../../components/calendar/YearScroll";
import {
  DEFAULT_EVENT_COLOUR,
  EVENT_SWATCHES,
  eventColours,
  nearestEventSwatch,
} from "../../components/calendar/eventColour";
import { COLOR_THEMES } from "../../theme/colorThemes";
import { linkLabel, minutesOf, normaliseLink, range12 } from "../../components/calendar/calendarTime";
import { useIsDark } from "../../hooks/useIsDark";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import {
  createEvent,
  deleteEvent,
  attachmentUrl,
  getCalendar,
  respondToInvite,
  updateEvent,
  type ClientCalendarEvent,
} from "../../services/calendar";
import { isUuid } from "../../services/food";
import { fetchMyBookedClasses, type BookedClass } from "../../services/business-classes";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  FileText,
  Check,
  X,
  Dumbbell,
  Ticket,
  Paperclip,
  Link as LinkIcon,
} from "lucide-react";
import clsx from "clsx";
import { useBack } from "../../hooks/useBack";

/** Opens an attachment in a new tab. Signed at the click — the TTL is minutes. */
async function openAttachment(path: string) {
  const result = await attachmentUrl(path);
  if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
}

type View = "year" | "month" | "week" | "day";
const VIEWS: View[] = ["year", "month", "week", "day"];

/** The view pills' own light colours, kept on the segmented tabs (decision 15). */
const TAB_LIGHT = {
  activeFill: "rgb(var(--c-primary-fill))",
  activeInk: "rgb(var(--c-on-primary-fill))",
  idleFill: "rgb(var(--c-team-lavender) / 0.15)",
  idleInk: "rgb(var(--c-primary-deep-text))",
};

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" })
);

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
};
const startOfWeekISO = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
};
// `color` is the swatch nearest the active theme's primary (E11; see
// nearestEventSwatch).
const blankDraft = (date: string, color: string): EventDraft => ({
  title: "",
  date,
  allDay: false,
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeat: "none" as CalendarEvent["repeat"],
  notes: "",
  color,
  url: "",
});

const HOUR_PX = 56;

// V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI here
// in a button found in the More's page. This serves as a calendar where the
// client can add events but also syncs up with anything the connected
// professional might add with the selected client as well as anything the
// gym... might add that involves the client" — reads the same shared
// calendarEvents/businessClasses stores the Professional/Business calendars
// write to, filtered to what actually involves this client, rather than a
// separate client-only event list.
//
// PHASE 1 (2026-09): REAL ROWS, AND THE NAME FILTER IS GONE. This screen used
// to decide what belonged to you with
//
//   calendarEvents.filter((e) => e.createdByClient || e.invitees?.includes(user.firstName))
//
// against a local, per-browser store. `invitees` was an array of NAMES, so two
// accounts whose owner is called Sarah saw each other's events — and an
// invitation could not be answered, could not survive a rename, and could not
// be notified. calendar_events has existed since the professional_business
// migration and calendar_event_invitees was added for exactly this; both were
// unused by any client code.
//
// THE SHARED LOCAL STORE IS LEFT ALONE. The professional's CalendarTab writes
// the same `calendarEvents` state and is Phase 2. Reading it here as well
// would put two sources behind one screen; it is used below for one thing
// only — carrying pre-existing local events up to the server once.
export default function ClientCalendarTab() {
  const back = useBack();
  const { calendarEvents, updateCalendarEvent, authUserId, profileReady, noteFeatureMilestone, colorTheme } =
    useApp();
  const newEventColour = nearestEventSwatch(
    COLOR_THEMES.find((t) => t.value === colorTheme)?.primary ?? DEFAULT_EVENT_COLOUR
  );

  // Explorer milestone: "Looking ahead". One row per account for ever — the repeat is
  // a primary-key conflict the service treats as the success it is. 
  useEffect(() => {
    noteFeatureMilestone("calendar");
  }, [noteFeatureMilestone]);
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => blankDraft(selectedDate, newEventColour));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const dark = useIsDark();

  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  // Populate on launch, and keep whatever is on screen if the read fails —
  // the rule every hydration in this app follows. A failed read is not an
  // empty calendar, and blanking one would look exactly like losing data.
  const load = useCallback(async () => {
    if (!authUserId) return;
    const result = await getCalendar(authUserId);
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    setLoadError(null);
    setEvents(result.events);
  }, [authUserId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    void load();
  }, [profileReady, authUserId, load]);

  // ONE-TIME UPLOAD OF LOCAL EVENTS, and there is real data to rescue even
  // though nothing is seeded: `calendarEvents` defaults to [], so every local
  // row is something a person actually typed, on a device where it was the
  // only copy.
  //
  // The candidate test is the id's own shape — a local id is not a uuid — the
  // same key custom meals and custom exercises use rather than a migration
  // flag. A successful upload rewrites the LOCAL id to the server's, so the
  // same event cannot qualify twice, and the professional's tab keeps showing
  // it meanwhile. The ref stops a failed attempt retrying in a loop.
  const uploadAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    if (uploadAttempted.current === authUserId) return;
    const pending = calendarEvents.filter((e) => e.createdByClient && !isUuid(e.id));
    if (pending.length === 0) return;
    uploadAttempted.current = authUserId;

    let cancelled = false;
    void (async () => {
      for (const local of pending) {
        const result = await createEvent(authUserId, {
          title: local.title,
          date: local.date,
          allDay: local.allDay,
          startTime: local.startTime,
          endTime: local.endTime,
          location: local.location,
          url: local.url,
          notes: local.notes,
          repeat: local.repeat,
          color: local.color,
        });
        if (!result.ok) {
          // Kept local, kept visible, not retried in a loop: the next visit
          // is the retry.
          console.error("[calendar] Could not upload a local event.");
          continue;
        }
        // DELIBERATELY NOT GUARDED BY `cancelled`, and this was measured
        // rather than reasoned about. The row exists on the server the moment
        // createEvent returns; rewriting the local id is not a UI update, it
        // is the record that the upload happened. Guarding it meant
        // StrictMode's mount/cleanup/mount cycle cancelled the first run
        // between the insert and the bookkeeping — the event was uploaded and
        // still looked local, so the next visit uploaded it again. In
        // production the same window opens any time someone leaves this
        // screen mid-upload.
        updateCalendarEvent(local.id, { id: result.event.id });
      }
      // Only the refresh cares whether this screen is still mounted.
      if (!cancelled) await load();
    })();

    return () => {
      cancelled = true;
    };
    // calendarEvents is read for the one-time upload and must not re-trigger
    // this every time the professional tab edits something.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, authUserId]);

  // EDITABLE, NOT MERELY OWNED, and the two differ in one case. An invitation
  // is somebody else's event, and the only thing this screen may write about
  // it is the answer. An assignment-scheduled session IS owned — the server
  // would accept an edit or a delete from the client, measured — but
  // assign_template_to_client deletes and re-inserts that row whenever the
  // coach moves the day, so a rename survives until then and a deletion comes
  // back. Offering the action would be offering a change that quietly undoes
  // itself.
  const isMine = (e: ClientCalendarEvent) => e.mine && !e.assignmentSourced;

  /**
   * Classes this account has booked, overlaid on the calendar.
   *
   * THE SAME SHAPE THE PROFESSIONAL'S TAB USES for business-scheduled classes:
   * a separate read, held in its own state, synthesised into calendar events
   * and merged only at eventsByDate. Not folded into `events` — these are
   * business_class_bookings rows, not calendar_events, and letting them into
   * the array that save/delete/respond all mutate is how an overlay row ends
   * up in a payload that has nowhere to put it.
   *
   * A FAILED READ LEAVES THE OVERLAY ALONE, for the reason every hydration on
   * this screen already gives: an empty calendar is a claim about somebody's
   * day, and a dropped connection is not entitled to make it.
   */
  const [bookedClasses, setBookedClasses] = useState<BookedClass[]>([]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMyBookedClasses();
      if (cancelled || !result.ok) return;
      setBookedClasses(result.classes);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  const bookedClassEvents = useMemo<ClientCalendarEvent[]>(
    () =>
      bookedClasses.map((c) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        allDay: false,
        startTime: c.startTime,
        endTime: c.endTime,
        repeat: "none" as const,
        // Same note shape as the professional's overlay — who it is with,
        // then whatever the class itself said — with the wording corrected for
        // direction: the client booked this, nobody scheduled it for them.
        notes: `Booked with ${c.businessName}${c.notes ? `: ${c.notes}` : ""}`,
        // The same gold the professional's tab gives business classes, so one
        // entity reads the same on both calendars.
        color: "#D9A441",
        // NOT MINE, WHICH IS WHAT MAKES IT READ-ONLY. isMine() already gates
        // the card's edit button, and the booking is not a calendar_events row
        // at all — there is nothing here for updateEvent or deleteEvent to
        // address. Cancelling a booking is a DELETE on
        // business_class_bookings, a different action on a different surface.
        mine: false,
        assignmentSourced: false,
      })),
    [bookedClasses]
  );

  /** Overlay rows by id, so the card can tell them from calendar_events. */
  const bookedById = useMemo(() => new Map(bookedClasses.map((c) => [c.id, c])), [bookedClasses]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ClientCalendarEvent[]> = {};
    [...events, ...bookedClassEvents].forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [events, bookedClassEvents]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goMonth = (delta: number) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setCursor({ year: y, month: m });
  };

  const openCompose = () => {
    setLinkError(false);
    setEditingId(null);
    setDraft(blankDraft(selectedDate, newEventColour));
    setConfirmDelete(false);
    setComposeOpen(true);
  };

  const openEdit = (e: ClientCalendarEvent) => {
    if (!isMine(e)) return;
    setEditingId(e.id);
    setConfirmDelete(false);
    setSaveError(null);
    setLinkError(false);
    setDraft({
      title: e.title,
      date: e.date,
      allDay: e.allDay,
      startTime: e.startTime ?? "09:00",
      endTime: e.endTime ?? "10:00",
      location: e.location ?? "",
      repeat: e.repeat,
      notes: e.notes ?? "",
      color: e.color ?? EVENT_SWATCHES[0],
      // Carried into the draft so saving an edit keeps the link; before the
      // Link field existed, an edit sent no url and the server cleared it.
      url: e.url ?? "",
    });
    setComposeOpen(true);
  };

  const saveEvent = async () => {
    if (!draft.title.trim() || !authUserId || saving) return;
    // http(s) only (B38): a bare host gets https://, anything else is refused.
    const url = normaliseLink(draft.url);
    if (draft.url.trim() && !url) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    setSaving(true);
    setSaveError(null);
    const payload = {
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location,
      repeat: draft.repeat,
      notes: draft.notes,
      color: draft.color,
      url: url ?? undefined,
    };
    const result = editingId
      ? await updateEvent(authUserId, editingId, payload)
      : await createEvent(authUserId, payload);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    // The row the server returned, not the draft: what is on screen is then
    // what is actually stored, including anything the database normalised.
    setEvents((prev) =>
      editingId
        ? prev.map((e) => (e.id === editingId ? result.event : e))
        : [...prev, result.event]
    );
    setComposeOpen(false);
  };

  const removeEvent = async () => {
    if (!editingId || !authUserId || saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await deleteEvent(authUserId, editingId);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? "Couldn't delete that event.");
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== editingId));
    setComposeOpen(false);
  };

  const respond = async (e: ClientCalendarEvent, accepted: boolean) => {
    if (!e.invite || respondingTo) return;
    setRespondingTo(e.invite.id);
    const result = await respondToInvite(e.invite.id, accepted);
    setRespondingTo(null);
    if (!result.ok) {
      setLoadError(result.message ?? "Couldn't save your response.");
      return;
    }
    setLoadError(null);
    // Declining keeps the event on the calendar, marked — the invitee keeps
    // their SELECT on both rows, and an event vanishing with no explanation
    // would be worse than one that says it was declined.
    setEvents((prev) =>
      prev.map((x) =>
        x.invite && x.invite.id === e.invite!.id
          ? { ...x, invite: { ...x.invite, status: accepted ? "accepted" : "declined" } }
          : x
      )
    );
  };

  // Iteration 6 "Team" §5 Calendar: a "Next up" hero — the real nearest
  // upcoming event (today or later), not the mockup's fixed example.
  const nextUp = useMemo(() => {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const todayIso = toISO(today.getFullYear(), today.getMonth(), today.getDate());
    const candidates = events
      .filter((e) => e.date > todayIso || (e.date === todayIso && !e.allDay && minutesOf(e.endTime) >= nowMinutes))
      .sort((a, b) => (a.date === b.date ? minutesOf(a.startTime) - minutesOf(b.startTime) : a.date < b.date ? -1 : 1));
    const e = candidates[0];
    if (!e) return null;
    const isToday = e.date === todayIso;
    const dayLabel = isToday
      ? "Today"
      : new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
    const when = e.allDay ? "All day" : `${dayLabel} ${range12(e.startTime, e.endTime)}`;
    let rel = "";
    if (isToday && !e.allDay) {
      const diffH = Math.max(0, Math.round(((minutesOf(e.startTime) - nowMinutes) / 60) * 10) / 10);
      rel = diffH < 1 ? "soon" : `in ${Math.round(diffH)}h`;
    } else if (!isToday) {
      const diffDays = Math.round((new Date(`${e.date}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000);
      rel = `in ${diffDays}d`;
    }
    return { event: e, when: e.location ? `${when} · ${e.location}` : when, rel };
  }, [events, today]);

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timedEvents = selectedEvents.filter((e) => !e.allDay);
  const allDayEvents = selectedEvents.filter((e) => e.allDay && !e.invite);
  // Every invitation for the day, timed or not — see the Day view below.
  const invitedEvents = selectedEvents.filter((e) => !!e.invite);

  const inviteLabel: Record<string, string> = {
    pending: "Invitation",
    accepted: "Going",
    declined: "Declined",
  };

  /** A tappable link on an event, in every view (MO1.6.4 note; B38). */
  const eventLink = (e: ClientCalendarEvent, size = 11) => {
    const href = normaliseLink(e.url);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(ev) => ev.stopPropagation()}
        className="tap inline-flex items-center gap-1 max-w-full text-xs font-semibold text-primary-deep-text underline underline-offset-2 decoration-primary-deep-text/40"
      >
        <LinkIcon size={size} className="shrink-0" aria-hidden />
        <span className="truncate">{linkLabel(href)}</span>
      </a>
    );
  };

  // MO1.6.2: the card tinted from the event's own colour, with its colour as
  // the side bar. Everything the old full card carried stays: notes, the
  // attachment, the invitation / Scheduled / Booked badge, the delisted note
  // and Accept / Decline.
  const eventCard = (e: ClientCalendarEvent) => {
    const mine = isMine(e);
    const status = e.invite?.status;
    // Present only for an overlay row, and the one thing that distinguishes
    // it from a calendar_events row the client happens not to own.
    const booked = bookedById.get(e.id);
    const { tint, bar } = eventColours(e.color, dark);
    return (
      <div
        key={e.id}
        className="rounded-[20px] px-4 py-3.5 space-y-2"
        style={{
          background: tint,
          borderLeft: `3px solid ${bar}`,
          // A declined event stays on the calendar, and looking different is
          // how it says so at a glance rather than only in its badge.
          opacity: status === "declined" ? 0.6 : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <button className="min-w-0 text-left flex-1" onClick={() => openEdit(e)} disabled={!mine}>
            <p className="text-sm font-semibold text-charcoal">{e.title}</p>
            <p className="text-xs text-charcoal-faint">
              {e.allDay ? "All day" : range12(e.startTime, e.endTime)}
              {e.repeat !== "none" && ` · repeats ${e.repeat}`}
            </p>
            {e.location && (
              <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-1">
                <MapPin size={11} /> {e.location}
              </p>
            )}
            {/* Notes show on an invitation too. They used to be hidden on
                anything not yours, which meant the one line explaining why
                you were invited was the line you could not read. */}
            {e.notes && (
              <p className="flex items-start gap-1 text-xs text-charcoal-faint mt-1">
                <FileText size={11} className="mt-0.5 shrink-0" /> {e.notes}
              </p>
            )}
          </button>
          {status ? (
            <span
              className={clsx(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                status === "accepted"
                  ? "bg-primary-pale text-primary-dark"
                  : status === "declined"
                  ? "bg-cream-soft text-charcoal-faint"
                  : "bg-gold/15 text-gold"
              )}
            >
              {inviteLabel[status]}
            </span>
          ) : e.assignmentSourced ? (
            // SAYS WHOSE IT IS, because that is the honest answer to "why can
            // I not edit this?". The card is otherwise indistinguishable from
            // one the client typed, and a tap that does nothing with no
            // explanation reads as a broken screen.
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-bold text-teal-dark">
              <Dumbbell size={10} /> Scheduled
            </span>
          ) : booked ? (
            // Same reasoning as the badge above, for the other kind of card
            // this screen cannot edit.
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
              <Ticket size={10} /> Booked
            </span>
          ) : null}
        </div>

        {eventLink(e)}

        {/* AN INVITEE MAY OPEN THE ATTACHMENT, which the bucket's select
            policy allows and which nothing on this screen offered until
            Phase 2 put files on events at all. Signed at the click, never
            held: the TTL is minutes. */}
        {e.attachmentPath && (
          <button
            onClick={() => void openAttachment(e.attachmentPath!)}
            className="tap flex items-center gap-1 text-xs font-semibold text-primary-deep-text"
          >
            <Paperclip size={11} /> Open attachment
          </button>
        )}

        {/* WHY THEY CANNOT FIND THIS BUSINESS ANY MORE. A business turning its
            Explore listing off does not cancel bookings people already hold,
            so the class stays — but it vanishes from search, from the
            directory, and from every other surface. Without this line the
            client is left with a session on their calendar and no way to look
            up who it is with. */}
        {booked && !booked.businessActive && (
          <p className="text-xs text-charcoal-faint italic">
            {booked.businessName} is no longer listed on Explore. Your booking still stands.
          </p>
        )}

        {/* THE ONLY THING THIS SCREEN MAY WRITE ABOUT SOMEBODY ELSE'S EVENT.
            Everything above is read-only for an invitation; the grant is
            column-scoped to responded_at and accepted, so this is not a UI
            convention but the shape of what the server will accept. */}
        {e.invite && (
          <div className="flex gap-2">
            <Button
              size="sm"
              fullWidth
              variant={status === "accepted" ? "primary" : "secondary"}
              disabled={respondingTo === e.invite.id || status === "accepted"}
              onClick={() => void respond(e, true)}
            >
              <Check size={13} /> {status === "accepted" ? "Going" : "Accept"}
            </Button>
            <Button
              size="sm"
              fullWidth
              variant="outline"
              disabled={respondingTo === e.invite.id || status === "declined"}
              onClick={() => void respond(e, false)}
            >
              <X size={13} /> {status === "declined" ? "Declined" : "Decline"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const jump = calendarJump({ view, cursor, selectedDate, setCursor, setSelectedDate });

  /** MO1.6–MO1.6.3's header card: chevrons, the label, and Jump to today (B30). */
  const headerCard = (label: string, onPrev: () => void, onNext: () => void, prevLabel: string, nextLabel: string) => (
    <div className="flex items-center gap-2 rounded-2xl h-10 px-3" style={{ background: dark ? "rgb(var(--th-2b2c3a))" : "rgb(var(--th-f6f4fe))" }}>
      <button onClick={onPrev} aria-label={prevLabel} className="tap w-7 h-7 -ml-1 flex items-center justify-center text-primary-deep-text shrink-0">
        <ChevronLeft size={16} strokeWidth={2.2} />
      </button>
      <p className="flex-1 min-w-0 text-center text-[15px] font-semibold text-charcoal truncate">{label}</p>
      {jump.show && <JumpToToday onClick={jump.jump} />}
      <button onClick={onNext} aria-label={nextLabel} className="tap w-7 h-7 -mr-1 flex items-center justify-center text-primary-deep-text shrink-0">
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
    </div>
  );

  const [yearJump, setYearJump] = useState(0);
  const todayIso = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. The circular
          "+" keeps its exact meaning (openCompose), just a gradient chip
          instead of a flat primary fill. */}
      {/* Handover 2026-09-29 MO4.1: a back arrow beside the title, the
          same button Mind's header uses. */}
      <div className="flex items-start justify-between gap-3 mb-[13px]">
        <div className="flex items-start gap-2.5">
          <button
            onClick={back}
            aria-label="Back"
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ml-1.5 mt-0.5 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal mt-[5px]">Calendar</p>
        </div>
        <button
          onClick={openCompose}
          aria-label="New event"
          className="tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-lavender-accent)" }}
        >
          <Plus size={16} className="text-white" />
        </button>
      </div>

      {/* A failed read leaves whatever was already on screen and says so,
          rather than blanking a calendar — which would be indistinguishable
          from having lost everything on it. */}
      {loadError && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {loadError}
        </p>
      )}

      {/* MO1.6: the views as full-width segmented tabs (44 in a 56 track).
          Light keeps the pills' colours (decision 15). A second tap on Year
          while in Year scrolls back to today's year (MO1.6.1). */}
      <SegmentedTabs
        className="mb-[13px]"
        items={VIEWS.map((v) => ({ key: v, label: v[0].toUpperCase() + v.slice(1) }))}
        activeKey={view}
        onChange={(k) => {
          if (k === "year" && view === "year") {
            setCursor((c) => ({ ...c, year: today.getFullYear() }));
            setYearJump((n) => n + 1);
            return;
          }
          setView(k as View);
        }}
        light={TAB_LIGHT}
      />

      {/* "Next up": the real nearest event, not the mockup's fixed example
          — hidden entirely when there is nothing upcoming to show. Not drawn
          on MO1.6, kept (B30). */}
      {view === "month" && nextUp && (
        <div
          className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
          style={{ background: "var(--gradient-board)" }}
        >
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66] dark:text-white/[0.8]">Next up</p>
          <div className="flex items-end justify-between gap-3 mt-[9px]">
            <div className="min-w-0">
              <p className="text-[19px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white truncate">{nextUp.event.title}</p>
              <p className="mt-[5px] text-[10.5px] text-white/[0.78]">{nextUp.when}</p>
            </div>
            {nextUp.rel && (
              <span className="text-[9.5px] font-bold text-white bg-white/20 rounded-full px-[9px] py-1 whitespace-nowrap shrink-0">{nextUp.rel}</span>
            )}
          </div>
        </div>
      )}

      {view === "month" && (
        <>
          <div className="rounded-[15px] bg-white dark:bg-[#1C1F28] border border-team-nav-accent/[0.16] dark:border-team-nav-accent/[0.28] px-3.5 py-[13px] mb-[13px]">
            {headerCard(`${monthNames[cursor.month]} ${cursor.year}`, () => goMonth(-1), () => goMonth(1), "Previous month", "Next month")}

            <div className="grid grid-cols-7 gap-[2px] mt-2.5 mb-1">
              {"SMTWTFS".split("").map((d, i) => (
                <div key={i} className="h-[31px] flex items-center justify-center text-[13px] font-semibold text-charcoal/[0.42] dark:text-charcoal/[0.55]">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-[2px]">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const iso = toISO(cursor.year, cursor.month, day);
                const hasEvents = !!eventsByDate[iso]?.length;
                const isSelected = iso === selectedDate;
                const isToday = iso === todayIso;
                return (
                  <button data-today={isToday || undefined}
                    key={i}
                    onClick={() => setSelectedDate(iso)}
                    aria-label={new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    aria-pressed={isSelected}
                    className={clsx(
                      "tap aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-[15px]",
                      isSelected ? "font-semibold text-white" : isToday ? "bg-team-lavender/[0.16] text-primary-deep-text font-semibold" : "font-medium text-charcoal"
                    )}
                    style={isSelected ? { background: "var(--gradient-lavender-accent)" } : undefined}
                  >
                    {day}
                    <span className="w-[3.5px] h-[3.5px] rounded-full" style={{ background: hasEvents ? (isSelected ? "#fff" : "rgb(var(--th-6f9993))") : "transparent" }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iteration 6 "Team": a day agenda beneath the grid — the
              selected day's real events, tinted rows keyed to each
              event's own colour. Selecting a date updates this list in
              place; the view tabs reach the full hour timeline. */}
          <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">{selectedDateLabel}</p>
          {selectedEvents.length === 0 ? (
            <p className="text-[11.5px] text-charcoal-faint">No events</p>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {selectedEvents.map((e) => {
                const mine = isMine(e);
                const { tint, bar } = eventColours(e.color, dark);
                const link = eventLink(e, 10);
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-[11px] rounded-[15px] px-3.5 py-3"
                    style={{ background: tint, opacity: e.invite?.status === "declined" ? 0.6 : undefined }}
                  >
                    <span className="w-[3px] self-stretch min-h-8 rounded-full shrink-0" style={{ background: bar }} />
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <button onClick={() => openEdit(e)} disabled={!mine} className="tap flex items-center gap-2 text-left min-w-0">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] font-bold text-charcoal truncate">{e.title}</span>
                          <span className="block text-[10px] text-charcoal-tertiary truncate">
                            {e.allDay ? "All day" : range12(e.startTime, e.endTime)}
                            {e.repeat !== "none" && ` · repeats ${e.repeat}`}
                            {e.location && ` · ${e.location}`}
                            {/* WHO IT IS WITH, ON THE DEFAULT VIEW. This compact
                                card is what Month renders — not eventCard — so the
                                full card's "Booked" badge never reaches the screen
                                most people land on. The subtitle already composes
                                from several optional parts; the business is one
                                more, and the delisted note rides with it because
                                there is nowhere else on this card to put it. */}
                            {bookedById.get(e.id) &&
                              ` · ${bookedById.get(e.id)!.businessName}${
                                bookedById.get(e.id)!.businessActive ? "" : " (no longer on Explore)"
                              }`}
                          </span>
                        </span>
                        {e.invite && <Check size={12} className="text-primary-deep-text/60 shrink-0" />}
                        {bookedById.has(e.id) && <Ticket size={12} className="text-gold shrink-0" />}
                      </button>
                      {link}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "week" &&
        (() => {
          const weekStart = startOfWeekISO(selectedDate);
          const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
          const rangeLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} – ${new Date(`${weekDays[6]}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`;
          return (
            <>
              <div className="mb-4">
                {headerCard(rangeLabel, () => setSelectedDate(addDaysISO(selectedDate, -7)), () => setSelectedDate(addDaysISO(selectedDate, 7)), "Previous week", "Next week")}
              </div>
              {/* V10 (QA 10.0): "have all the dates from sunday to saturday
                  be under each other in boxes with each[event list] to
                  their respective sides not under" — a day box column with
                  that day's events beside it. Tapping a day box still opens
                  it in Day view (B32). */}
              <div className="space-y-2.5">
                {weekDays.map((iso) => {
                  const dayEvents = eventsByDate[iso] ?? [];
                  const isToday = iso === todayIso;
                  const d = new Date(`${iso}T00:00:00`);
                  return (
                    <div key={iso} data-today={isToday || undefined} className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          setSelectedDate(iso);
                          setView("day");
                        }}
                        aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, open in Day view`}
                        className={clsx(
                          "tap shrink-0 w-14 rounded-2xl flex flex-col items-center justify-center py-2 gap-0.5",
                          isToday ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-soft"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-base font-bold leading-none">{d.getDate()}</span>
                      </button>
                      <div className="flex-1 min-w-0 pt-2">
                        {dayEvents.length === 0 ? (
                          <p className="text-xs text-charcoal-faint">No events</p>
                        ) : (
                          <div className="space-y-2">{dayEvents.map(eventCard)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

      {view === "year" && (
        <YearScroll
          year={cursor.year}
          todayIso={todayIso}
          eventDays={Object.keys(eventsByDate)}
          jumpSignal={yearJump}
          onOpenMonth={(y, m) => {
            setCursor({ year: y, month: m });
            setView("month");
          }}
        />
      )}

      {view === "day" && (
        <>
          <div className="mb-4">
            {headerCard(selectedDateLabel, () => setSelectedDate(addDaysISO(selectedDate, -1)), () => setSelectedDate(addDaysISO(selectedDate, 1)), "Previous day", "Next day")}
          </div>

          {/* INVITATIONS GET A LIST OF THEIR OWN IN DAY VIEW, above the
              timeline, because the timeline cannot carry them. A timed event
              renders there as a positioned block a few pixels tall — no room
              for a badge, let alone two buttons — and Day is where tapping a
              date in Month view lands. Without this, an invitation to a 4pm
              session was visible and unanswerable on the screen most people
              reach first. */}
          {invitedEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">
                Invitations
              </p>
              {invitedEvents.map(eventCard)}
            </div>
          )}

          {allDayEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">All day</p>
              {allDayEvents.map(eventCard)}
            </div>
          )}

          <div className="relative" style={{ height: HOUR_PX * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} data-hour={h} className="absolute left-0 right-0 border-t border-charcoal/[0.06] flex items-start" style={{ top: h * HOUR_PX }}>
                <span className="text-[9px] text-charcoal-faint -mt-1.5 pr-1.5 w-9 text-right shrink-0">
                  {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                </span>
              </div>
            ))}
            <div className="absolute left-10 right-0 top-0 bottom-0">
              {timedEvents.map((e) => {
                const start = minutesOf(e.startTime);
                const end = Math.max(minutesOf(e.endTime), start + 20);
                const top = (start / 60) * HOUR_PX;
                const height = Math.max(((end - start) / 60) * HOUR_PX, 26);
                // 30 minutes or less: one line, the time beside the title, so
                // it isn't cut off (the block is too short for two lines).
                const short = minutesOf(e.endTime) - start <= 30;
                const mine = isMine(e);
                const { tint, bar } = eventColours(e.color, dark);
                const href = normaliseLink(e.url);
                return (
                  <div
                    key={e.id}
                    className="absolute left-0 right-1 rounded-xl overflow-hidden shadow-soft"
                    style={{
                      top,
                      height,
                      background: tint,
                      borderLeft: `3px solid ${bar}`,
                      opacity: e.invite?.status === "declined" ? 0.6 : undefined,
                    }}
                  >
                    <button
                      onClick={() => openEdit(e)}
                      disabled={!mine}
                      className={clsx(
                        "tap w-full h-full px-2.5 text-left",
                        short ? "flex items-center gap-1.5 py-0" : "py-1.5",
                        href && "pr-9"
                      )}
                    >
                      <p className={clsx("text-xs font-semibold text-charcoal truncate flex items-center gap-1", short && "min-w-0")}>
                        <span className="truncate">{e.title}</span>
                        {/* The timeline block is too small for the badge and the
                            buttons; the day list above carries both. This says
                            only that the event is an invitation, or a booking. */}
                        {e.invite && <Check size={10} className="shrink-0" />}
                        {bookedById.has(e.id) && <Ticket size={10} className="shrink-0 text-gold" />}
                      </p>
                      {short ? (
                        <p className="text-[10px] text-charcoal-faint whitespace-nowrap shrink-0">{range12(e.startTime, e.endTime)}</p>
                      ) : (
                      <p className="text-[10px] text-charcoal-faint truncate">
                        {range12(e.startTime, e.endTime)}
                        {e.location ? ` · ${e.location}` : ""}
                        {bookedById.get(e.id) &&
                          ` · ${bookedById.get(e.id)!.businessName}${
                            bookedById.get(e.id)!.businessActive ? "" : " (no longer on Explore)"
                          }`}
                      </p>
                      )}
                    </button>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open link, ${linkLabel(href)}`}
                        className="tap absolute top-0.5 right-0.5 w-8 h-8 flex items-center justify-center text-primary-deep-text"
                      >
                        <LinkIcon size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <EventComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        editing={!!editingId}
        draft={draft}
        setDraft={setDraft}
        todayIso={todayIso}
        saving={saving}
        error={saveError}
        linkError={linkError}
        onSave={() => void saveEvent()}
        onDelete={() => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
          }
          void removeEvent();
        }}
        confirmDelete={confirmDelete}
      />
    </div>
  );
}
