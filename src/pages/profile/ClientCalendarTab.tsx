import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JumpToToday } from "../../components/ui/JumpToToday";
import { calendarJump } from "../../components/ui/calendarJump";

import { CtaButton } from "../../components/ui/PinnedCta";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { Toast } from "../../components/ui/Toast";
import { EventComposeSheet, type EventDraft } from "../../components/calendar/EventComposeSheet";
import { playlistFieldValid } from "../../components/music/PlaylistField";
import { EventDetailSheet } from "../../components/calendar/EventDetailSheet";
import { RateClassSheet } from "../../components/marketplace/RateClassSheet";
import { InstructorReviewDialog } from "../../components/market/InstructorReviewDialog";
import { findReviewTarget, sentText, type ReviewTarget } from "../../services/instructor-reviews";
import { useStrip } from "../business-market/listingParts";
import { RepeatScopePopup, type RepeatScope } from "../../components/calendar/RepeatScopePopup";
import { dayBefore, expandOccurrences, occurrenceKey, type ExceptionMap } from "../../components/calendar/occurrences";
import { saveRepeating } from "../../components/calendar/saveRepeating";
import type { EventAlert } from "../../components/calendar/eventAlert";
import { fetchInviteExtras, type InviteExtra } from "../../components/calendar/inviteExtras";
import { monthReminderLine, packLine, reminderLine } from "../../components/calendar/inviteLines";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnline } from "../../hooks/useOnline";
import { YearScroll } from "../../components/calendar/YearScroll";
import {
  DEFAULT_EVENT_COLOUR,
  EVENT_SWATCHES,
  eventColours,
  nearestEventSwatch,
} from "../../components/calendar/eventColour";
import { COLOR_THEMES } from "../../theme/colorThemes";
import { linkLabel, minutesOf, normaliseLink } from "../../components/calendar/calendarTime";
import { hourLabel12, range12 } from "../../utils/time12";
import { useIsDark } from "../../hooks/useIsDark";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import {
  createEvent,
  deleteEvent,
  endSeries,
  attachmentUrl,
  getCalendar,
  respondToInvite,
  setInviteAlert,
  setOccurrence,
  updateEvent,
  type ClientCalendarEvent,
} from "../../services/calendar";
import { isUuid } from "../../services/food";
import { fetchMyBookedClasses, type BookedClass, type LinkedBooking } from "../../services/business-classes";
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
  AlertCircle,
  Bell,
} from "lucide-react";
import clsx from "clsx";
import { monthLeadingBlanks, startOfWeekISO } from "../../utils/week";
import { weekLetters } from "../../components/dashboard/widgets/weekLetters";
import { t, tk, tx } from "../../i18n/core";
import { useBack } from "../../hooks/useBack";
import { appLocale } from "../../i18n/format";

/** Opens an attachment in a new tab. Signed at the click — the TTL is minutes. */
async function openAttachment(path: string) {
  const result = await attachmentUrl(path);
  if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
}

type View = "year" | "month" | "week" | "day";
const VIEWS: View[] = ["year", "month", "week", "day"];

/** v6 MO1.6 #5: the New event button's gradient. Light is the shared
    lavender accent (#AEA1DC to #6F5FA6). Dark starts on the dark primary
    (#A991FE) and ends on the light gradient's own end stop (#6F5FA6, derived
    in the handover): on this button only, since the shared token paints other
    screens. Each theme's end stop is its light gradient's. */
const NEW_EVENT_DARK_END: Record<string, string> = {
  centium: "#6F5FA6",
  sky: "#235AF6",
  rose: "#CA1A69",
  gold: "#886400",
  coral: "#BB4103",
};

/** "October 2026", in the app's language (read when drawn). */
const monthYear = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString(appLocale("en-US"), { month: "long", year: "numeric" });

const VIEW_LABEL: Record<View, string> = { year: tk("Year"), month: tk("Month"), week: tk("Week"), day: tk("Day") };

/** " · repeats weekly" on the event lines. */
const REPEATS_LINE: Record<string, string> = { daily: tk("repeats daily"), weekly: tk("repeats weekly"), monthly: tk("repeats monthly") };
const repeatsLine = (r: string) => ` · ${REPEATS_LINE[r] ? t(REPEATS_LINE[r]) : `repeats ${r}`}`;

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
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
  // MO1.6.4 draws a new event's Alert as "None".
  alert: "none",
  repeatUntil: null,
  playlistUrl: "",
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
// THE LOCAL STORE IS READ FOR ONE THING ONLY: carrying pre-existing local
// events up to the server once (below). Nothing else writes it any more.
export default function ClientCalendarTab() {
  const back = useBack();
  const navigate = useNavigate();
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
  /** The day of the occurrence being edited (a repeat's series keeps its own first date). */
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);
  /** B3 (PB-O-64): which occurrences a save or delete of a repeating event applies to. */
  const [scopeAsk, setScopeAsk] = useState<"save" | "delete" | null>(null);
  const [draft, setDraft] = useState(() => blankDraft(selectedDate, newEventColour));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const dark = useIsDark();

  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  /** CU7: a professional's session invitation's pack and reminder lines, by invite id. */
  const [inviteExtras, setInviteExtras] = useState<Record<string, InviteExtra>>({});
  /** B3: one-off changes to this account's repeating events (calendar_event_exceptions). */
  const [exceptions, setExceptions] = useState<ExceptionMap>({});
  // OURS O-LD: false until the first read settles (success or failure), so
  // the event list shows skeleton rows on first load only.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  // OURS (MO1.6 K10): a failed invitation answer is a toast, not a page error.
  const [respondFailed, setRespondFailed] = useState(false);
  // OURS-Calendar-event-detail: the read-only sheet's event (id, so it shows
  // the latest status after an answer).
  const [detailId, setDetailId] = useState<string | null>(null);
  /** The invitee's own reminder being saved (PB-O-65), and a failure toast. */
  const [alertSaving, setAlertSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // B14 RP-04: Rate this class from a booked class that has ended.
  const [rate, setRate] = useState<{ bookingId: string; title: string; businessName: string } | null>(null);
  // Market + Share 3.0 W5 (D-43): Rate opens the InstructorReviewDialog when
  // the class had an instructor and my_class_bookings (DB4) says it's
  // reviewable (review_instructor, Database Release 2: one per member per
  // series); otherwise the live Rate sheet above (write_class_review, which
  // now writes the venue review only when nobody is named).
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewStrip, showReviewStrip] = useStrip();
  const rateSeq = useRef(0);
  const openRate = useCallback((r: { bookingId: string; title: string; businessName: string; classId?: string | null }) => {
    const n = ++rateSeq.current;
    void findReviewTarget(r.bookingId, r.classId ?? null).then((t) => {
      if (n !== rateSeq.current) return;
      if (t) setReviewTarget(t);
      else setRate({ bookingId: r.bookingId, title: r.title, businessName: r.businessName });
    });
  }, []);
  const online = useOnline();

  // Populate on launch, and keep whatever is on screen if the read fails —
  // the rule every hydration in this app follows. A failed read is not an
  // empty calendar, and blanking one would look exactly like losing data.
  const load = useCallback(async () => {
    if (!authUserId) return;
    const result = await getCalendar(authUserId);
    setLoaded(true);
    if (!result.ok) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setEvents(result.events);
    setExceptions(result.exceptions);
    // CU7: read beside the calendar; a failure only leaves the two lines off.
    if (result.events.some((e) => e.invite)) setInviteExtras(await fetchInviteExtras(authUserId));
  }, [authUserId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    void load();
  }, [profileReady, authUserId, load]);

  // OURS O-OF: coming back online after a failed read retries once.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current && loadError) void load();
    wasOnline.current = online;
  }, [online, loadError, load]);

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
  //
  // A ROW A BOOKING MADE is owned too, and is not editable here either (v6
  // MO1.6 B3, PB-O-62): the booking is what is changed or cancelled. Database
  // B3 marks it (calendar_events.source_kind / source_id) and refuses an edit
  // or delete from the client (ATXB3); the bookings' calendar_event_id links
  // still catch a row made before source_kind existed. (isMine is defined
  // below, once the booking links are known.)

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
  const [linkedBookings, setLinkedBookings] = useState<LinkedBooking[]>([]);
  /** The bookings read answered (or failed): the ?rate= deep link waits for it. */
  const [bookingsRead, setBookingsRead] = useState(false);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMyBookedClasses();
      if (cancelled) return;
      setBookingsRead(true);
      if (!result.ok) return;
      setBookedClasses(result.classes);
      setLinkedBookings(result.linked);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  // B14 follow-up: the review_prompt push opens /app/calendar?rate=<booking id>.
  // Once the bookings are read, Rate this class opens for that booking if it's
  // this account's and the class has ended; anything else is dropped quietly.
  // The param is cleared either way, so a reload doesn't reopen the sheet.
  const [params, setParams] = useSearchParams();
  const rateParam = params.get("rate");
  useEffect(() => {
    if (!rateParam || !bookingsRead) return;
    const legacy = bookedClasses.find((c) => c.bookingId === rateParam);
    const linked = linkedBookings.find((b) => b.bookingId === rateParam);
    const hit = legacy
      ? { title: legacy.title, businessName: legacy.businessName, date: legacy.date, endTime: legacy.endTime, classId: legacy.id }
      : linked
        ? { title: linked.title, businessName: linked.businessName, date: linked.date, endTime: linked.endTime, classId: linked.classId }
        : null;
    const ended = hit ? new Date(`${hit.date}T${hit.endTime}:00`).getTime() <= Date.now() : false;
    const next = new URLSearchParams(params);
    next.delete("rate");
    setParams(next, { replace: true });
    if (hit && ended) openRate({ bookingId: rateParam, title: hit.title, businessName: hit.businessName, classId: hit.classId });
  }, [rateParam, bookingsRead, bookedClasses, linkedBookings, params, setParams, openRate]);

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
        notes: `${t("Booked with {name}", { name: c.businessName })}${c.notes ? `: ${c.notes}` : ""}`,
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
        alert: "none" as const,
      })),
    [bookedClasses]
  );

  /** Overlay rows by id, so the card can tell them from calendar_events. */
  const bookedById = useMemo(() => new Map(bookedClasses.map((c) => [c.id, c])), [bookedClasses]);
  /** Calendar rows a booking made (book_class), by calendar_events id. */
  const linkedById = useMemo(() => new Map(linkedBookings.map((b) => [b.calendarEventId, b])), [linkedBookings]);
  /** Who a booked class is with, for an overlay row or a booking-made row. */
  const bookingOf = (e: ClientCalendarEvent) => bookedById.get(e.id) ?? linkedById.get(e.id) ?? null;
  const isMine = (e: ClientCalendarEvent) => e.mine && !e.assignmentSourced && !e.sourceKind && !linkedById.has(e.id);
  /** A tap on any event: own events edit (MO1.6.4), the rest open the detail sheet. */
  const openEvent = (e: ClientCalendarEvent) => (isMine(e) ? openEdit(e) : setDetailId(occurrenceKey(e)));

  // REPEATS ARE DRAWN ON EVERY DAY THEY FALL ON (B3, PB-O-63 / PB-O-64): a
  // series used to show on its first date only. Expanded over the years in
  // view (the cursor's and the selected day's, one either side for Year), by
  // the reminder sweep's own rule, stopping at repeat_until and applying this
  // account's one-off changes (occurrences.ts).
  const selectedYear = Number(selectedDate.slice(0, 4));
  const rangeFrom = `${Math.min(cursor.year, selectedYear) - 1}-01-01`;
  // Year scrolls on into later years, so it draws further ahead.
  const rangeTo = `${Math.max(cursor.year, selectedYear) + (view === "year" ? 5 : 1)}-12-31`;
  const occurrences = useMemo(
    () => expandOccurrences([...events, ...bookedClassEvents], exceptions, rangeFrom, rangeTo),
    [events, bookedClassEvents, exceptions, rangeFrom, rangeTo]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, ClientCalendarEvent[]> = {};
    occurrences.forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [occurrences]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = monthLeadingBlanks(cursor.year, cursor.month);
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
    setSaveError(null);
    setLinkError(false);
    setEditingId(null);
    setEditingOccurrence(null);
    setDraft(blankDraft(selectedDate, newEventColour));
    setConfirmDelete(false);
    setComposeOpen(true);
  };

  const openEdit = (e: ClientCalendarEvent) => {
    if (!isMine(e)) return;
    setEditingId(e.id);
    // The day tapped; for a repeat, the series keeps its own first date.
    setEditingOccurrence(e.date);
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
      // The saved calendar_events.alert (Stage 2).
      alert: e.alert,
      repeatUntil: e.repeatUntil ?? null,
      playlistUrl: e.playlistUrl ?? "",
    });
    setComposeOpen(true);
  };

  /** The series being edited, as stored (not an expanded occurrence). */
  const editingSeries = editingId ? events.find((e) => e.id === editingId) ?? null : null;
  const editingRepeats = !!editingSeries && editingSeries.repeat !== "none";

  const saveEvent = async (scope?: RepeatScope) => {
    if (!draft.title.trim() || !authUserId || saving) return;
    // http(s) only (B38): a bare host gets https://, anything else is refused.
    const url = normaliseLink(draft.url);
    if (draft.url.trim() && !url) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    // Round E: the playlist field already says what's wrong with the link.
    if (!playlistFieldValid(draft.playlistUrl ?? "")) return;
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
      alert: draft.alert,
      repeatUntil: draft.repeatUntil,
      playlistUrl: draft.playlistUrl,
    };
    // A REPEATING EVENT ASKS FIRST which occurrences change (B3, PB-O-64).
    if (editingSeries && editingRepeats && !scope) {
      setSaving(false);
      setScopeAsk("save");
      return;
    }
    setScopeAsk(null);
    if (editingSeries && editingRepeats && scope) {
      const r = await saveRepeating(authUserId, editingSeries, editingOccurrence ?? editingSeries.date, scope, payload);
      setSaving(false);
      if (!r.ok) {
        setSaveError(r.message ?? t("Couldn't save your changes. Try again."));
        return;
      }
      await load();
      setComposeOpen(false);
      return;
    }
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
    if (result.alertMessage) {
      // The event saved and its alert didn't. The sheet stays open on the
      // now-saved event (edit mode, the chosen alert still selected), so
      // "Save changes" retries the alert rather than creating a second event.
      setEditingId(result.event.id);
      setSaveError(result.alertMessage);
      return;
    }
    setComposeOpen(false);
  };

  const removeEvent = async (scope?: RepeatScope) => {
    if (!editingId || !authUserId || saving) return;
    if (editingSeries && editingRepeats) {
      if (!scope) {
        setScopeAsk("delete");
        return;
      }
      setScopeAsk(null);
      const occ = editingOccurrence ?? editingSeries.date;
      setSaving(true);
      setSaveError(null);
      // "This and following" from the first date is the whole series.
      const whole = scope === "all" || (scope === "following" && occ <= editingSeries.date);
      const r = whole
        ? await deleteEvent(authUserId, editingId)
        : scope === "following"
          ? await endSeries(authUserId, editingId, dayBefore(occ))
          : await setOccurrence(editingId, occ, { cancelled: true });
      setSaving(false);
      if (!r.ok) {
        setSaveError(r.message ?? t("Couldn't delete that event. Try again."));
        return;
      }
      await load();
      setComposeOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await deleteEvent(authUserId, editingId);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? t("Couldn't delete that event."));
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
      // The status was never changed on screen, so nothing to revert: the
      // shared toast says it didn't save (MO1.6 K10).
      setRespondFailed(true);
      return;
    }
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

  /** The invitee's own reminder (B3, PB-O-65). */
  const saveInviteAlert = async (e: ClientCalendarEvent, alert: EventAlert) => {
    if (!e.invite || alertSaving) return;
    setAlertSaving(true);
    const r = await setInviteAlert(e.invite.id, alert);
    setAlertSaving(false);
    if (!r.ok) {
      setToast(r.message ?? t("Couldn't save your reminder. Try again."));
      return;
    }
    setEvents((prev) =>
      prev.map((x) => (x.invite && x.invite.id === e.invite!.id ? { ...x, invite: { ...x.invite, alert } } : x))
    );
    // CU7: the reminder line reads the same column, so it follows the change.
    setInviteExtras((prev) => {
      const x = prev[e.invite!.id];
      if (!x?.reminder) return prev;
      return { ...prev, [e.invite!.id]: { ...x, reminder: { ...x.reminder, alert } } };
    });
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(appLocale("en-US"), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timedEvents = selectedEvents.filter((e) => !e.allDay);
  const allDayEvents = selectedEvents.filter((e) => e.allDay && !e.invite);
  // Every invitation for the day, timed or not — see the Day view below.
  const invitedEvents = selectedEvents.filter((e) => !!e.invite);

  const inviteLabel: Record<string, string> = {
    pending: t("Invitation"),
    accepted: t("Going"),
    declined: t("Declined"),
  };

  /** A tappable link on an event, in every view (MO1.6.4 note; B38). */
  // Month rows draw it 10 / 600 (MO1.6 K6), Week cards 12 / 600 (MO1.6.2 K5).
  const eventLink = (e: ClientCalendarEvent, size = 11, textClass = "text-xs") => {
    const href = normaliseLink(e.url);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(ev) => ev.stopPropagation()}
        className={clsx(
          "tap inline-flex items-center gap-1 max-w-full font-semibold text-primary-deep-text underline underline-offset-2 decoration-primary-deep-text/40 self-start",
          textClass
        )}
      >
        <LinkIcon size={size} className="shrink-0" aria-hidden />
        <span className="truncate">{linkLabel(href)}</span>
      </a>
    );
  };

  /** CU7: the pack and reminder lines for a session invitation (Day, Week). */
  const extraLines = (e: ClientCalendarEvent) => {
    const x = e.invite && e.invite.status !== "declined" ? inviteExtras[e.invite.id] : undefined;
    if (!x) return null;
    const pack = x.packLeft !== undefined ? packLine(x.price, x.packLeft) : null;
    const remind = x.reminder ? reminderLine(x.reminder.first, x.reminder.alert, x.reminder.alert2) : null;
    if (!pack && !remind) return null;
    return (
      <div className="flex flex-col gap-1 py-0.5">
        {pack && (
          <p className="flex items-center gap-1 text-xs text-charcoal-faint">
            <Ticket size={11} strokeWidth={2} className="shrink-0" aria-hidden />{pack}
          </p>
        )}
        {remind && (
          <p className="flex items-center gap-1 text-xs text-charcoal-faint">
            <Bell size={11} strokeWidth={2} className="shrink-0" aria-hidden />{remind}
          </p>
        )}
      </div>
    );
  };

  // MO1.6.2: the card tinted from the event's own colour, with its colour as
  // the side bar. Everything the old full card carried stays: notes, the
  // attachment, the invitation / Scheduled / Booked badge, the delisted note
  // and Accept / Decline.
  const eventCard = (e: ClientCalendarEvent) => {
    const status = e.invite?.status;
    // Present for an overlay row or a booking-made row: what distinguishes a
    // booked class from a calendar_events row the client happens not to own.
    const booked = bookingOf(e);
    const { tint, bar } = eventColours(e.color, dark);
    return (
      <div
        key={occurrenceKey(e)}
        // v6 MO1.6.2 #21 / #25: r24, padding 20, the side border 3.8 in the
        // event's own colour (V6-112: the PNG's colour over the table's
        // #241F1B; dark shade in dark), so a three-line card is 96.
        className="rounded-[24px] p-5 space-y-2"
        style={{
          background: tint,
          borderInlineStart: `3.8px solid ${bar}`,
          // A declined event stays on the calendar, and looking different is
          // how it says so at a glance rather than only in its badge.
          opacity: status === "declined" ? 0.6 : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Own events open the edit sheet; the rest the read-only detail
              (OURS-Calendar-event-detail). */}
          <button className="min-w-0 text-start flex-1" onClick={() => openEvent(e)}>
            <p className="text-sm font-semibold text-charcoal">{e.title}</p>
            <p className="text-xs text-charcoal-faint">
              {e.allDay ? t("All day") : range12(e.startTime, e.endTime)}
              {e.repeat !== "none" && repeatsLine(e.repeat)}
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
          {/* Decision 23 (item 111): the badges as the class card's spots
              line (Foundations Cards: 11/600), straight on the event tint
              with no pill of their own. The gold ones take the Foundations
              gold.text #9A7424 (dark #CAB082), fixed in every theme, since
              the gold itself is not readable as text on a tint. */}
          {status ? (
            <span
              className={clsx(
                "shrink-0 text-[11px] font-semibold",
                status === "accepted"
                  ? "text-primary-dark"
                  : status === "declined"
                  ? "text-charcoal-faint"
                  : "text-[#9A7424] dark:text-[#CAB082]"
              )}
            >
              {inviteLabel[status]}
            </span>
          ) : e.assignmentSourced ? (
            // SAYS WHOSE IT IS, because that is the honest answer to "why can
            // I not edit this?". The card is otherwise indistinguishable from
            // one the client typed, and a tap that does nothing with no
            // explanation reads as a broken screen.
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-teal-dark dark:text-teal-deep-text">
              <Dumbbell size={11} aria-hidden /> {t("Scheduled")}
            </span>
          ) : booked || e.sourceKind ? (
            // Same reasoning as the badge above, for the other kind of card
            // this screen cannot edit (a booking made it: B3 source_kind).
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#9A7424] dark:text-[#CAB082]">
              <Ticket size={11} aria-hidden /> {t("Booked")}
            </span>
          ) : null}
        </div>

        {/* CU7 (Release 3): a professional's session invitation says what it
            takes from the session pack and when the professional reminds
            you (r25 invCard25: column gap 4, padding 2 0, 12 charcoal-faint,
            11 icons). Not on a declined invitation. */}
        {extraLines(e)}

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
            <Paperclip size={11} /> {t("Open attachment")}
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
            {t("{name} is no longer listed on Explore. Your booking still stands.", { name: booked.businessName })}
          </p>
        )}

        {/* THE ONLY THING THIS SCREEN MAY WRITE ABOUT SOMEBODY ELSE'S EVENT.
            Everything above is read-only for an invitation; the grant is
            column-scoped to responded_at and accepted, so this is not a UI
            convention but the shape of what the server will accept. */}
        {/* Decision 23 (item 111): Accept / Decline as a Pinned CTA row pair
            in place: primary.tint secondary first, the filled primary
            second, 48 r14, gap 8, 15 icons. */}
        {e.invite && (
          <div className="flex gap-2">
            <CtaButton
              size="page"
              variant="secondary"
              label={status === "declined" ? t("Declined") : t("Decline")}
              icon={<X size={15} aria-hidden />}
              disabled={respondingTo === e.invite.id || status === "declined"}
              onClick={() => void respond(e, false)}
            />
            <CtaButton
              size="page"
              label={status === "accepted" ? t("Going") : t("Accept")}
              icon={<Check size={15} aria-hidden />}
              disabled={respondingTo === e.invite.id || status === "accepted"}
              onClick={() => void respond(e, true)}
            />
          </div>
        )}
      </div>
    );
  };

  const jump = calendarJump({ view, cursor, selectedDate, setCursor, setSelectedDate });

  /** MO1.6–MO1.6.3's header card: chevrons, the label, and Jump to today (B30).
      v6 MO1.6 #11-#14 / MO1.6.2 #10-#13: 40 tall, r16, padding 0 12, #F6F4FE
      (dark #2B2C3A, V6-92: the drawn #F6F4FE* would put light text on a near
      white fill); chevron boxes 26 (44 hit area through .tap), icons 16
      #5B3FE4 (dark #B7ABDE, V6-92: #5B3FE4* is 2.6:1 on the dark card); the
      label 15 / 22.5 600 on one line, truncating before Jump to today wraps. */
  const headerCard = (label: string, onPrev: () => void, onNext: () => void, prevLabel: string, nextLabel: string) => (
    <div className="flex items-center gap-2 rounded-2xl h-10 px-3" style={{ background: dark ? "rgb(var(--th-2b2c3a))" : "rgb(var(--th-f6f4fe))" }}>
      <button onClick={onPrev} aria-label={prevLabel} className="tap w-[26px] h-[26px] flex items-center justify-center text-th-5b3fe4 dark:text-th-b7abde shrink-0">
        <ChevronLeft size={16} strokeWidth={2.2} className="rtl:-scale-x-100" />
      </button>
      <p className="flex-1 min-w-0 text-center text-[15px] leading-[22.5px] font-semibold text-charcoal truncate">{label}</p>
      {jump.show && <JumpToToday onClick={jump.jump} />}
      <button onClick={onNext} aria-label={nextLabel} className="tap w-[26px] h-[26px] flex items-center justify-center text-th-5b3fe4 dark:text-th-b7abde shrink-0">
        <ChevronRight size={16} strokeWidth={2.2} className="rtl:-scale-x-100" />
      </button>
    </div>
  );

  /** OURS O-LD: a skeleton block (#F5F5F6 / #242730, 1.2 s pulse, static
      under Reduce motion). */
  const skeleton = (className: string) => (
    <div aria-hidden className={clsx("bg-cream-soft animate-skeleton-pulse", className)} />
  );

  const [yearJump, setYearJump] = useState(0);
  const todayIso = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  // The Week navigator's range, Monday to Sunday (MO1.6.2 #13), worked out
  // here because the navigator sits in the fixed header.
  const weekStart = startOfWeekISO(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const weekLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString(appLocale("en-US"), {
    month: "short",
    day: "numeric",
  })} – ${new Date(`${weekDays[6]}T00:00:00`).toLocaleDateString(appLocale("en-US"), {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  // The load state card (OURS O-ER / O-OF): under the fixed area, with
  // whatever was on screen kept under it.
  const statusCard =
    loadError || !online ? (
      <div
        role={loadError ? "alert" : "status"}
        className="flex items-center gap-3 rounded-[15px] bg-white dark:bg-[#1C1F28] border-[0.5px] border-team-nav-accent/[0.16] px-3.5 py-3 mb-[13px]"
      >
        <p className="flex-1 min-w-0 text-[12.5px] leading-[18.8px] font-semibold text-charcoal">
          {!online ? t("You're offline. Showing what was loaded.") : t("Couldn't load your calendar.")}
        </p>
        {online && (
          <button
            type="button"
            onClick={() => void load()}
            className="tap h-11 -my-3 shrink-0 text-[12.5px] font-bold text-th-5b3fe4 dark:text-th-b7abde"
          >
            {t("Retry")}
          </button>
        )}
      </div>
    ) : null;

  return (
    <div>
      {/* v6 MO1.6 #1 / MO1.6.2 #1: the header, the view tabs and (Week, Day)
          the navigator are one fixed area (the shared FixedHeader: page fill
          and hairline only once content passes under it, 120 ms, none under
          Reduce motion). Bottom padding 13 under the tabs, 16 under a
          navigator. Day's navigator is fixed like Week's (MO1.6 O7). */}
      <FixedHeader paddingBottom={view === "week" || view === "day" ? 16 : 13}>
        {/* Handover 2026-09-29 MO4.1: a back arrow beside the title. MO1.6
            #2-#6: back 36 (m 2 0 0 -6), the title 19 / 28.5 700 ls -0.6, the
            34 New event button (44 hit area through .tap). */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <button
              onClick={back}
              aria-label={t("Back")}
              className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ms-1.5 mt-0.5 transition-colors"
            >
              <ChevronLeft size={18} className="rtl:-scale-x-100" />
            </button>
            <h1 className="text-[19px] leading-[28.5px] font-bold tracking-[-0.6px] text-charcoal mt-[5px]">{t("Calendar")}</h1>
          </div>
          <button
            onClick={openCompose}
            aria-label={t("New event")}
            className="tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
            style={{
              background: dark
                ? `linear-gradient(150deg, rgb(var(--c-primary)), ${NEW_EVENT_DARK_END[colorTheme] ?? NEW_EVENT_DARK_END.centium})`
                : "var(--gradient-lavender-accent)",
            }}
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>

        {/* MO1.6 #7-#9: the views as full-width segmented tabs (44 in a 56
            track): idle #F5F4FE with #5B5349, active #A79AD5 with white
            (#5B48B8 under High contrast); dark track and idle #303141 with
            #B8B3C7 (darkTone partB), active #A991FE with #0D0B1A. A second
            tap on Year while in Year scrolls back to today's year (MO1.6.1). */}
        <SegmentedTabs
          className="mt-[13px]"
          items={VIEWS.map((v) => ({ key: v, label: tx(VIEW_LABEL[v], "calendar view") }))}
          activeKey={view}
          onChange={(k) => {
            if (k === "year" && view === "year") {
              setCursor((c) => ({ ...c, year: today.getFullYear() }));
              setYearJump((n) => n + 1);
              return;
            }
            setView(k as View);
          }}
          idleInk="rgb(var(--c-charcoal-soft))"
          darkTone="partB"
        />

        {view === "week" && (
          <div className="mt-[13px]">
            {headerCard(weekLabel, () => setSelectedDate(addDaysISO(selectedDate, -7)), () => setSelectedDate(addDaysISO(selectedDate, 7)), t("Previous week"), t("Next week"))}
          </div>
        )}
        {view === "day" && (
          <div className="mt-[13px]">
            {headerCard(selectedDateLabel, () => setSelectedDate(addDaysISO(selectedDate, -1)), () => setSelectedDate(addDaysISO(selectedDate, 1)), t("Previous day"), t("Next day"))}
          </div>
        )}
      </FixedHeader>

      {statusCard}

      {view === "month" && (
        <>
          {/* MO1.6 #10: 358 wide, r15, padding 13 14, white with a 0.5
              #8F68F6@16% border (dark #1C1F28, the same border). */}
          <div className="rounded-[15px] bg-white dark:bg-[#1C1F28] border-[0.5px] border-team-nav-accent/[0.16] px-3.5 py-[13px] mb-[13px]">
            {headerCard(monthYear(cursor.year, cursor.month), () => goMonth(-1), () => goMonth(1), t("Previous month"), t("Next month"))}

            {/* MO1.6 #15: weekday letters Monday first, 13 / 19.5 600 with 6
                above and below (31.5), #5B3FE4 (dark #B7ABDE, V6-92), 2 above
                the first row of days. */}
            <div className="grid grid-cols-7 gap-[2px] mt-2.5 mb-[2px]">
              {weekLetters().map((d, i) => (
                <div key={i} className="py-1.5 leading-[19.5px] flex items-center justify-center text-[13px] font-semibold text-th-5b3fe4 dark:text-th-b7abde">
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
                    aria-label={new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" })}
                    aria-pressed={isSelected}
                    // v6 MO1.6 #16-#20: cells r12, 15 / 22.5. The selected day
                    // #AB9ED7 with white 600 (the theme's own in other themes;
                    // #5B48B8 under High contrast; dark the primary fill
                    // #A991FE with #0D0B1A, V6-92: white on #AB9ED7* is
                    // 2.4:1). Other days #000000 500 (dark #F5F3FA, V6-92).
                    className={clsx(
                      "tap aspect-square rounded-[12px] flex flex-col items-center justify-center gap-0.5 text-[15px] leading-[22.5px]",
                      isSelected
                        ? "font-semibold bg-th-ab9ed7 text-white dark:bg-primary-fill dark:text-on-primary-fill [.high-contrast_&]:bg-primary-fill [.high-contrast_&]:text-on-primary-fill"
                        : isToday
                        ? "bg-team-lavender/[0.16] text-primary-deep-text font-semibold"
                        : "font-medium text-black dark:text-charcoal"
                    )}
                  >
                    {day}
                    {/* #17 / #20: the 3.5 dot, white on the selected day (dark
                        #1C1F28), else #6F9993 (dark #4F8F8A; the theme's
                        secondary pair). */}
                    <span
                      className={clsx(
                        "w-[3.5px] h-[3.5px] rounded-full",
                        !hasEvents ? "bg-transparent" : isSelected ? "bg-white dark:bg-[#1C1F28]" : "bg-th-6f9993 dark:bg-th-4f8f8a"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iteration 6 "Team": a day agenda beneath the grid — the
              selected day's real events, tinted rows keyed to each
              event's own colour. Selecting a date updates this list in
              place; the view tabs reach the full hour timeline. */}
          {/* MO1.6 #21: 9 / 13.5 700 ls 1.8 caps at 42% (dark 42% too,
              V6-113; High contrast lifts it to the full ink). */}
          <p className="mb-[9px] text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">{selectedDateLabel}</p>
          {!loaded ? (
            // OURS O-LD: two 57.7 r15 skeleton rows on first load only.
            <div className="flex flex-col gap-[7px]">
              {skeleton("h-[57.7px] rounded-[15px]")}
              {skeleton("h-[57.7px] rounded-[15px]")}
            </div>
          ) : selectedEvents.length === 0 ? (
            <p className="text-[11.5px] text-charcoal-faint">{t("No events")}</p>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {selectedEvents.map((e) => {
                const booked = bookingOf(e);
                const { tint, bar } = eventColours(e.color, dark);
                const link = eventLink(e, 10, "text-[10px]");
                // CU7: the professional's reminder (r25: 10 / 600 charcoal-faint, a 10 bell, 4 above).
                const rx = e.invite && e.invite.status !== "declined" ? inviteExtras[e.invite.id]?.reminder : undefined;
                const remind = rx ? monthReminderLine(rx.first, rx.alert, rx.alert2) : null;
                return (
                  // MO1.6 #22-#29: r15, padding 12 14, the event colour at
                  // 16% (dark shade in dark), a 3 pill gap 11, the title
                  // 12.5 / 18.8 700, the time line 10 / 15 #A79E93 / #9F9CAC.
                  <div
                    key={occurrenceKey(e)}
                    className="flex items-start gap-[11px] rounded-[15px] px-3.5 py-3"
                    style={{ background: tint, opacity: e.invite?.status === "declined" ? 0.6 : undefined }}
                  >
                    <span className="w-[3px] self-stretch min-h-8 rounded-full shrink-0" style={{ background: bar }} />
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <button onClick={() => openEvent(e)} className="tap flex items-center gap-2 text-start min-w-0">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] leading-[18.8px] font-bold text-charcoal truncate">{e.title}</span>
                          <span className="block text-[10px] leading-[15px] text-charcoal-tertiary truncate">
                            {e.allDay ? t("All day") : range12(e.startTime, e.endTime)}
                            {e.repeat !== "none" && repeatsLine(e.repeat)}
                            {e.location && ` · ${e.location}`}
                            {/* WHO IT IS WITH, ON THE DEFAULT VIEW. This compact
                                card is what Month renders — not eventCard — so the
                                full card's "Booked" badge never reaches the screen
                                most people land on. The subtitle already composes
                                from several optional parts; the business is one
                                more, and the delisted note rides with it because
                                there is nowhere else on this card to put it. */}
                            {booked && ` · ${booked.businessActive ? booked.businessName : t("{name} (no longer on Explore)", { name: booked.businessName })}`}
                          </span>
                        </span>
                        {/* K3 / K4: the invitation check in the time line's
                            #A79E93, the booked Ticket in Foundations gold.text
                            #9A7424 / #CAB082. */}
                        {e.invite && <Check size={12} aria-label={t("Invitation")} className="text-charcoal-tertiary shrink-0" />}
                        {booked && <Ticket size={12} aria-label={t("Booked")} className="text-[#9A7424] dark:text-[#CAB082] shrink-0" />}
                      </button>
                      {remind && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint">
                          <Bell size={10} strokeWidth={2} className="shrink-0" aria-hidden />{remind}
                        </span>
                      )}
                      {link}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "week" && (
        // V10 (QA 10.0): the days under each other in boxes with each day's
        // events beside it; Monday to Sunday (MO1.6.2 D1). Tapping a day box
        // opens it in Day view (B32). Rows 10 apart (59 pitch).
        <div className="space-y-2.5">
          {weekDays.map((iso) => {
            const dayEvents = eventsByDate[iso] ?? [];
            const isToday = iso === todayIso;
            const d = new Date(`${iso}T00:00:00`);
            return (
              <div key={iso} data-today={isToday || undefined} className="flex items-start gap-3">
                {/* MO1.6.2 #14-#20: 56 wide, padding 8 0, r16 #F5F5F6 with
                    #5B5349 (dark #242730 / #B8B3C7); today r12 #AB9ED7 with
                    white (dark primary fill with #0D0B1A, V6-92; #5B48B8
                    under High contrast); weekday 10 / 15 700 ls 0.3 caps,
                    date 16 / 16 700. */}
                <button
                  onClick={() => {
                    setSelectedDate(iso);
                    setView("day");
                  }}
                  aria-label={t("{date}, open in Day view", { date: d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }) })}
                  className={clsx(
                    "tap shrink-0 w-14 flex flex-col items-center justify-center py-2 gap-0.5",
                    isToday
                      ? "rounded-[12px] bg-th-ab9ed7 text-white dark:bg-primary-fill dark:text-on-primary-fill [.high-contrast_&]:bg-primary-fill [.high-contrast_&]:text-on-primary-fill"
                      : "rounded-2xl bg-cream-soft text-charcoal-soft"
                  )}
                >
                  <span className="text-[10px] leading-[15px] font-bold uppercase tracking-[0.3px]">
                    {d.toLocaleDateString(appLocale("en-US"), { weekday: "short" })}
                  </span>
                  <span className="text-base font-bold leading-none">{d.getDate()}</span>
                </button>
                <div className="flex-1 min-w-0 pt-2">
                  {!loaded ? (
                    // OURS O-LD: a 290 x 16 r8 bar beside each real day box.
                    skeleton("h-4 rounded-lg")
                  ) : dayEvents.length === 0 ? (
                    <p className="text-xs text-charcoal-faint">{t("No events")}</p>
                  ) : (
                    <div className="space-y-2">{dayEvents.map(eventCard)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          {/* INVITATIONS GET A LIST OF THEIR OWN IN DAY VIEW, above the
              timeline, because the timeline cannot carry them. A timed event
              renders there as a positioned block a few pixels tall — no room
              for a badge, let alone two buttons — and Day is where tapping a
              date in Month view lands. Without this, an invitation to a 4pm
              session was visible and unanswerable on the screen most people
              reach first. */}
          {/* Decision 23 (item 114): both list headings as the MO1.6 day
              label (9/700, charcoal 42%, tracked, uppercase). */}
          {invitedEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">
                {t("Invitations")}
              </p>
              {invitedEvents.map(eventCard)}
            </div>
          )}

          {allDayEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">{t("All day")}</p>
              {allDayEvents.map(eventCard)}
            </div>
          )}

          <div className="relative" style={{ height: HOUR_PX * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} data-hour={h} className="absolute start-0 end-0 border-t border-charcoal/[0.06] flex items-start" style={{ top: h * HOUR_PX }}>
                <span className="text-[9px] text-charcoal-faint -mt-1.5 pe-1.5 w-9 text-end shrink-0">
                  {hourLabel12(h)}
                </span>
              </div>
            ))}
            <div className="absolute start-10 end-0 top-0 bottom-0">
              {timedEvents.map((e) => {
                const start = minutesOf(e.startTime);
                const end = Math.max(minutesOf(e.endTime), start + 20);
                const top = (start / 60) * HOUR_PX;
                const height = Math.max(((end - start) / 60) * HOUR_PX, 26);
                // 30 minutes or less: one line, the time beside the title, so
                // it isn't cut off (the block is too short for two lines).
                const short = minutesOf(e.endTime) - start <= 30;
                const booked = bookingOf(e);
                const { tint, bar } = eventColours(e.color, dark);
                const href = normaliseLink(e.url);
                return (
                  <div
                    key={occurrenceKey(e)}
                    className="absolute start-0 end-1 rounded-xl overflow-hidden shadow-soft"
                    style={{
                      top,
                      height,
                      background: tint,
                      borderInlineStart: `3px solid ${bar}`,
                      opacity: e.invite?.status === "declined" ? 0.6 : undefined,
                    }}
                  >
                    <button
                      onClick={() => openEvent(e)}
                      className={clsx(
                        "tap w-full h-full px-2.5 text-start",
                        short ? "flex items-center gap-1.5 py-0" : "py-1.5",
                        href && "pe-9"
                      )}
                    >
                      <p className={clsx("text-xs font-semibold text-charcoal truncate flex items-center gap-1", short && "min-w-0")}>
                        <span className="truncate">{e.title}</span>
                        {/* The timeline block is too small for the badge and the
                            buttons; the day list above carries both. This says
                            only that the event is an invitation, or a booking. */}
                        {e.invite && <Check size={10} className="shrink-0" />}
                        {booked && <Ticket size={10} className="shrink-0 text-[#9A7424] dark:text-[#CAB082]" />}
                      </p>
                      {short ? (
                        <p className="text-[10px] text-charcoal-faint whitespace-nowrap shrink-0">{range12(e.startTime, e.endTime)}</p>
                      ) : (
                      <p className="text-[10px] text-charcoal-faint truncate">
                        {range12(e.startTime, e.endTime)}
                        {e.location ? ` · ${e.location}` : ""}
                        {booked && ` · ${booked.businessActive ? booked.businessName : t("{name} (no longer on Explore)", { name: booked.businessName })}`}
                      </p>
                      )}
                    </button>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("Open link, {link}", { link: linkLabel(href) })}
                        className="tap absolute top-0.5 end-0.5 w-8 h-8 flex items-center justify-center text-primary-deep-text"
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
          // A repeat asks which occurrences instead (that popup is the confirm).
          if (editingRepeats) {
            void removeEvent();
            return;
          }
          if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
          }
          void removeEvent();
        }}
        confirmDelete={confirmDelete}
      />

      <RepeatScopePopup
        mode={scopeAsk}
        busy={saving}
        onCancel={() => setScopeAsk(null)}
        onChoose={(scope) => void (scopeAsk === "delete" ? removeEvent(scope) : saveEvent(scope))}
      />

      {(() => {
        const detail = detailId ? occurrences.find((x) => occurrenceKey(x) === detailId) ?? null : null;
        // "View booking" (#13): the class page, where the booking is changed
        // or cancelled. A hire or an appointment has no page to open.
        const classId = detail ? (bookedById.get(detail.id)?.id ?? linkedById.get(detail.id)?.classId) : undefined;
        // An overlay row's notes start "Booked with …" for the cards; the
        // sheet says that in its status line, so it shows the class's own.
        const overlay = detail ? bookedById.get(detail.id) : undefined;
        const booking = detail ? bookingOf(detail) : null;
        const ended = !!detail && new Date(`${detail.date}T${detail.endTime ?? detail.startTime ?? "23:59"}`).getTime() < Date.now();
        return (
          <EventDetailSheet
            event={detail && overlay ? { ...detail, notes: overlay.notes || undefined } : detail}
            onClose={() => setDetailId(null)}
            dark={dark}
            booked={detail ? bookingOf(detail) : null}
            responding={!!detail?.invite && respondingTo === detail.invite.id}
            online={online}
            onRespond={(accepted) => detail && void respond(detail, accepted)}
            onOpenAttachment={(path) => void openAttachment(path)}
            bookingMade={!!detail?.sourceKind}
            onViewBooking={classId ? () => navigate(`/app/marketplace/class?id=${encodeURIComponent(classId)}`) : undefined}
            onRate={
              booking && ended && detail
                ? () => {
                    openRate({ bookingId: booking.bookingId, title: detail.title, businessName: booking.businessName, classId: classId ?? null });
                    setDetailId(null);
                  }
                : undefined
            }
            onInviteAlert={(alert) => detail && void saveInviteAlert(detail, alert)}
            alertSaving={alertSaving}
          />
        );
      })()}

      <RateClassSheet
        open={!!rate}
        bookingId={rate?.bookingId ?? null}
        classTitle={rate?.title ?? ""}
        businessName={rate?.businessName ?? ""}
        onClose={() => setRate(null)}
      />
      <InstructorReviewDialog
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSent={(target) => {
          setReviewTarget(null);
          showReviewStrip(sentText(target.professionalName, target.gymName), "success", { label: t("View"), onPress: () => navigate(`/app/professionals/${encodeURIComponent(target.professionalId)}`) });
        }}
      />
      {reviewStrip}

      {/* MO1.6 K10: a failed invitation answer, the shared toast with the
          danger icon (#C0392B / #F09A8E). */}
      <Toast
        open={respondFailed}
        message={t("Couldn't save your response. Try again.")}
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
        onExpire={() => setRespondFailed(false)}
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
        onExpire={() => setToast(null)}
      />
    </div>
  );
}
