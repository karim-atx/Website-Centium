import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  FileText,
  Trash2,
  Repeat,
  Check,
  X,
  Dumbbell,
  Paperclip,
} from "lucide-react";
import clsx from "clsx";

/** Opens an attachment in a new tab. Signed at the click — the TTL is minutes. */
async function openAttachment(path: string) {
  const result = await attachmentUrl(path);
  if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
}

type View = "year" | "month" | "week" | "day";

const repeatOptions: { value: CalendarEvent["repeat"]; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const eventColorOptions = ["#7D6BB5", "#6F9993", "#4C8FD1", "#9C4F7C", "#D9A441", "#241F1B"];

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
const minutesOf = (hhmm?: string) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const blankDraft = (date: string) => ({
  title: "",
  date,
  allDay: false,
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeat: "none" as CalendarEvent["repeat"],
  notes: "",
  color: eventColorOptions[0],
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
  const { calendarEvents, updateCalendarEvent, authUserId, profileReady } = useApp();
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft(selectedDate));
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const eventsByDate = useMemo(() => {
    const map: Record<string, ClientCalendarEvent[]> = {};
    events.forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [events]);

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
    setEditingId(null);
    setDraft(blankDraft(selectedDate));
    setConfirmDelete(false);
    setComposeOpen(true);
  };

  const openEdit = (e: ClientCalendarEvent) => {
    if (!isMine(e)) return;
    setEditingId(e.id);
    setConfirmDelete(false);
    setSaveError(null);
    setDraft({
      title: e.title,
      date: e.date,
      allDay: e.allDay,
      startTime: e.startTime ?? "09:00",
      endTime: e.endTime ?? "10:00",
      location: e.location ?? "",
      repeat: e.repeat,
      notes: e.notes ?? "",
      color: e.color ?? eventColorOptions[0],
    });
    setComposeOpen(true);
  };

  const saveEvent = async () => {
    if (!draft.title.trim() || !authUserId || saving) return;
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
    const when = e.allDay ? "All day" : `${dayLabel} ${e.startTime} – ${e.endTime}`;
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

  const eventCard = (e: ClientCalendarEvent) => {
    const mine = isMine(e);
    const status = e.invite?.status;
    return (
      <Card
        key={e.id}
        className="space-y-2"
        style={{
          borderLeft: `4px solid ${e.color ?? "#7D6BB5"}`,
          // A declined event stays on the calendar, and looking different is
          // how it says so at a glance rather than only in its badge.
          opacity: status === "declined" ? 0.6 : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <button className="min-w-0 text-left flex-1" onClick={() => openEdit(e)} disabled={!mine}>
            <p className="text-sm font-semibold text-charcoal">{e.title}</p>
            <p className="text-xs text-charcoal-faint">
              {e.allDay ? "All day" : `${e.startTime} – ${e.endTime}`}
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
          {/* AN INVITEE MAY OPEN THE ATTACHMENT, which the bucket's select
              policy allows and which nothing on this screen offered until
              Phase 2 put files on events at all. Signed at the click, never
              held: the TTL is minutes. */}
          {e.attachmentPath && (
            <button
              onClick={() => void openAttachment(e.attachmentPath!)}
              className="tap flex items-center gap-1 text-xs font-semibold text-primary mt-1"
            >
              <Paperclip size={11} /> Open attachment
            </button>
          )}
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
          ) : null}
        </div>

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
      </Card>
    );
  };

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. The circular
          "+" keeps its exact meaning (openCompose), just a gradient chip
          instead of a flat primary fill. */}
      <div className="flex items-start justify-between gap-3 mb-[13px]">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Calendar</p>
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

      <div className="flex gap-[6px] mb-[13px]">
        {(["year", "month", "week", "day"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              "tap rounded-full px-[13px] py-[7px] text-[11px] capitalize whitespace-nowrap",
              view === v ? "font-extrabold bg-team-lavender text-white" : "font-semibold bg-team-lavender/[0.15] text-primary-deep-text"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* "Next up": the real nearest event, not the mockup's fixed example
          — hidden entirely when there is nothing upcoming to show. */}
      {view === "month" && nextUp && (
        <div
          className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
          style={{ background: "var(--gradient-board)" }}
        >
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66]">Next up</p>
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
          <div className="rounded-[15px] bg-white dark:bg-[#221C2E] border border-team-nav-accent/[0.16] dark:border-team-nav-accent/[0.28] px-3.5 py-[13px] mb-[13px]">
            <div className="flex items-center justify-between mb-[11px]">
              <button onClick={() => goMonth(-1)} className="tap w-[26px] h-[26px] rounded-full bg-team-lavender/[0.18] flex items-center justify-center text-primary-deep-text">
                <ChevronLeft size={13} />
              </button>
              <p className="text-[13.5px] font-extrabold tracking-[-0.02em] text-charcoal">
                {monthNames[cursor.month]} {cursor.year}
              </p>
              <button onClick={() => goMonth(1)} className="tap w-[26px] h-[26px] rounded-full bg-team-lavender/[0.18] flex items-center justify-center text-primary-deep-text">
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-[2px] mb-1">
              {"SMTWTFS".split("").map((d, i) => (
                <div key={i} className="text-center text-[8.5px] font-bold tracking-[.1em] text-charcoal/[0.42]">
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
                const isToday = iso === toISO(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(iso)}
                    className={clsx(
                      "tap aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold",
                      isSelected ? "font-extrabold text-white" : isToday ? "bg-team-lavender/[0.16] text-primary-deep-text font-bold" : "text-charcoal"
                    )}
                    style={isSelected ? { background: "var(--gradient-lavender-accent)" } : undefined}
                  >
                    {day}
                    <span className="w-[3.5px] h-[3.5px] rounded-full" style={{ background: hasEvents ? (isSelected ? "#fff" : "#6F9993") : "transparent" }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iteration 6 "Team": a day agenda beneath the grid — the
              selected day's real events, tinted rows keyed to each
              event's own colour. Month view no longer jumps to Day on tap
              (the view pills above still reach the full hour timeline);
              selecting a date now just updates this list in place. */}
          <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">{selectedDateLabel}</p>
          {selectedEvents.length === 0 ? (
            <p className="text-[11.5px] text-charcoal-faint">No events</p>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {selectedEvents.map((e) => {
                const mine = isMine(e);
                const color = e.color ?? "#7D6BB5";
                return (
                  <button
                    key={e.id}
                    onClick={() => openEdit(e)}
                    disabled={!mine}
                    className="tap flex items-center gap-[11px] rounded-[15px] px-3.5 py-3 text-left"
                    style={{ background: `${color}29`, opacity: e.invite?.status === "declined" ? 0.6 : undefined }}
                  >
                    <span className="w-[3px] h-8 rounded-full shrink-0" style={{ background: color }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-bold text-charcoal truncate">{e.title}</span>
                      <span className="block text-[10px] text-charcoal-tertiary truncate">
                        {e.allDay ? "All day" : `${e.startTime} – ${e.endTime}`}
                        {e.repeat !== "none" && ` · repeats ${e.repeat}`}
                        {e.location && ` · ${e.location}`}
                      </span>
                    </span>
                    {e.invite && <Check size={12} className="text-primary-deep-text/60 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Everything below (Week/Year/Day views, the compose sheet) is
          reached only via the view pills above and is unchanged — the
          manifest's screen-level pass here is scoped to the Month view. */}
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
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedDate(addDaysISO(selectedDate, -7))} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
                  <ChevronLeft size={16} />
                </button>
                <p className="font-display font-semibold text-charcoal">{rangeLabel}</p>
                <button onClick={() => setSelectedDate(addDaysISO(selectedDate, 7))} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
                  <ChevronRight size={16} />
                </button>
              </div>
              {/* V10 (QA 10.0): "have all the dates from sunday to saturday
                  be under each other in boxes with each[event list] to
                  their respective sides not under" — a day box column with
                  that day's events beside it, instead of the label sitting
                  above a full-width event stack. */}
              <div className="space-y-2.5">
                {weekDays.map((iso) => {
                  const dayEvents = eventsByDate[iso] ?? [];
                  const isToday = iso === toISO(today.getFullYear(), today.getMonth(), today.getDate());
                  const d = new Date(`${iso}T00:00:00`);
                  return (
                    <div key={iso} className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          setSelectedDate(iso);
                          setView("day");
                        }}
                        className={clsx(
                          "tap shrink-0 w-14 rounded-2xl flex flex-col items-center justify-center py-2 gap-0.5",
                          isToday ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
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
        <div className="grid grid-cols-3 gap-3">
          {monthNames.map((name, m) => (
            <button
              key={name}
              onClick={() => {
                setCursor({ year: cursor.year, month: m });
                setView("month");
              }}
              className="tap rounded-2xl bg-cream-card border border-charcoal/[0.06] shadow-soft py-4 flex flex-col items-center gap-1"
            >
              <span className="text-sm font-semibold text-charcoal">{name.slice(0, 3)}</span>
              <span className="text-[10px] text-charcoal-faint">
                {Object.keys(eventsByDate).filter((d) => d.startsWith(`${cursor.year}-${pad(m + 1)}`)).length} events
              </span>
            </button>
          ))}
        </div>
      )}

      {view === "day" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <ChevronLeft size={16} />
            </button>
            <p className="font-display font-semibold text-charcoal">{selectedDateLabel}</p>
            <button onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <ChevronRight size={16} />
            </button>
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
              <div key={h} className="absolute left-0 right-0 border-t border-charcoal/[0.06] flex items-start" style={{ top: h * HOUR_PX }}>
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
                const mine = isMine(e);
                return (
                  <button
                    key={e.id}
                    onClick={() => openEdit(e)}
                    disabled={!mine}
                    className="tap absolute left-0 right-1 rounded-xl px-2.5 py-1.5 text-left overflow-hidden shadow-soft"
                    style={{
                      top,
                      height,
                      background: `${e.color ?? "#7D6BB5"}22`,
                      borderLeft: `3px solid ${e.color ?? "#7D6BB5"}`,
                      opacity: e.invite?.status === "declined" ? 0.6 : undefined,
                    }}
                  >
                    <p className="text-xs font-semibold text-charcoal truncate flex items-center gap-1">
                      {e.title}
                      {/* The timeline block is too small for the badge and the
                          buttons; the day list above carries both. This says
                          only that the event is an invitation. */}
                      {e.invite && <Check size={10} className="shrink-0" />}
                    </p>
                    <p className="text-[10px] text-charcoal-faint truncate">
                      {e.startTime} – {e.endTime}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <BottomSheet open={composeOpen} onClose={() => setComposeOpen(false)} title={editingId ? "Edit Event" : "New Event"}>
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Doctor's appointment"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-3">
            <span className="text-sm font-semibold text-charcoal">All day</span>
            <button
              onClick={() => setDraft((d) => ({ ...d, allDay: !d.allDay }))}
              className={clsx("tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors", draft.allDay ? "bg-primary justify-end" : "bg-charcoal/10 justify-start")}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {!draft.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Starts</span>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Ends</span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Location</span>
            <input
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="Clinic, gym, video call…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Color</span>
            <div className="flex gap-2">
              {eventColorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft((d) => ({ ...d, color: c }))}
                  aria-label={`Color ${c}`}
                  className="tap w-7 h-7 rounded-full"
                  style={{ background: c, boxShadow: draft.color === c ? "0 0 0 2px rgb(var(--c-cream)), 0 0 0 4px " + c : undefined }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 flex items-center gap-1.5">
              <Repeat size={12} /> Repeat
            </span>
            <div className="flex flex-wrap gap-2">
              {repeatOptions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDraft((d) => ({ ...d, repeat: r.value }))}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    draft.repeat === r.value ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={3}
              placeholder="Anything else to remember…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>

          {saveError && (
            <p className="text-xs font-semibold text-status-high text-center">{saveError}</p>
          )}

          <Button
            fullWidth
            size="lg"
            onClick={() => void saveEvent()}
            disabled={!draft.title.trim() || saving}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Save event"}
          </Button>

          {editingId && (
            <Button
              fullWidth
              variant="outline"
              disabled={saving}
              className="!border-teal/30 !text-teal-dark"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                  return;
                }
                void removeEvent();
              }}
            >
              <Trash2 size={15} /> {confirmDelete ? "Tap again to confirm" : "Delete event"}
            </Button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
