import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import { useServerCalendar } from "../../hooks/useServerCalendar";
import { attachmentUrl } from "../../services/calendar";
import { fetchClassesAssignedToMe, type BusinessClassRow } from "../../services/business-classes";
import { acceptFor } from "../../services/storage";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Link2,
  FileText,
  Trash2,
  Repeat,
  Pencil,
  Store,
  Paperclip,
} from "lucide-react";
import clsx from "clsx";

/**
 * Opens an attachment in a new tab.
 *
 * Signed at the moment of the click and never held: signedUrlFor caps its own
 * TTL at minutes, so a URL kept in state would expire into a dead link.
 */
async function openAttachment(path: string) {
  const result = await attachmentUrl(path);
  if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
}

// V7 (QA 7.0): Year → Month → Day, Month selected by default.
// V9 (QA 9.0): "Alongside year monthly and daily I would like a weekly
// option as well."
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
const addMonthsISO = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
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
  // V7 (QA 7.0): all-day now defaults off — most events are scheduled at a
  // specific time, not blocking the whole day.
  allDay: false,
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeat: "none" as CalendarEvent["repeat"],
  inviteeIds: [] as string[],
  url: "",
  notes: "",
  attachmentName: "",
  color: eventColorOptions[0],
});

const HOUR_PX = 56;

/** A business_classes row assigned to this professional, plus who scheduled it. */
type AssignedClass = BusinessClassRow & { businessName: string };

export default function CalendarTab() {
  const { authUserId, profileReady } = useApp();
  // Classes a business scheduled for THIS professional, read from
  // business_classes by professional_id. They used to come from a localStorage
  // array a business account filled on its own device, so this overlay could
  // only ever show something when the business and the professional were the
  // same browser profile — which is to say, never in real use.
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const today = new Date();
  const {
    events,
    invitees,
    candidates,
    loadError,
    saving,
    saveError,
    setSaveError,
    reload: _reload,
    saveEvent: persistEvent,
    removeEvent: persistDelete,
    attachFile,
  } = useServerCalendar(authUserId, profileReady);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft(selectedDate));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // V8 (QA 8.0): "business-scheduled events involving an affiliated
  // professional show on BOTH the business's and the professional's
  // calendars" — classes a business assigned to this professional are folded
  // into the same calendar, read-only.
  //
  // FILTERED SERVER-SIDE ON professional_id, NOT ON THE STRING "me". That
  // stand-in was the local affiliation system's placeholder id; real rows
  // carry this account's uuid, and comparing a uuid to "me" would have matched
  // nothing forever while looking exactly like "no classes assigned". The
  // business's name is embedded in the same read rather than looked up in the
  // local businessDirectory, which knew nothing about a business on another
  // device either.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchClassesAssignedToMe(authUserId);
      // A failed read leaves the overlay as it was: an empty calendar is a
      // claim about somebody's day, and it should not be made on a dropped
      // connection.
      if (cancelled || !result.ok) return;
      setAssignedClasses(result.classes);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  const businessCalendarEvents = useMemo<CalendarEvent[]>(
    () =>
      assignedClasses.map((c) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        allDay: false,
        startTime: c.startTime,
        endTime: c.endTime,
        repeat: "none" as const,
        notes: `Scheduled by ${c.businessName}${c.notes ? ` — ${c.notes}` : ""}`,
        color: "#D9A441",
      })),
    [assignedClasses]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    [...events, ...businessCalendarEvents].forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [events, businessCalendarEvents]);

  // The overlay rows by id. Real business_classes ids are uuids, so the old
  // `id.startsWith("bc")` test — which keyed off the local store's minted
  // prefix — would now call every row editable, including the ones a business
  // scheduled and this professional has no policy to touch.
  const assignedIds = useMemo(() => new Set(assignedClasses.map((c) => c.id)), [assignedClasses]);

  /** A server event, or undefined for a business-class overlay row. */
  const serverEvent = (id: string) => events.find((e) => e.id === id);
  // A business class is synthesised in memory from businessClasses and has no
  // calendar_events row; an assignment-sourced session belongs to the client
  // and is deleted and re-inserted on every re-assignment. Neither is this
  // account's to edit here.
  const isEditable = (e: CalendarEvent) => {
    const row = serverEvent(e.id);
    return !!row && row.mine && !row.assignmentSourced;
  };

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

  const openEdit = (e: CalendarEvent) => {
    if (!isEditable(e)) return;
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
      // Real invitee rows now, not names matched against the roster.
      inviteeIds: (invitees[e.id] ?? []).map((i) => i.userId),
      url: e.url ?? "",
      notes: e.notes ?? "",
      attachmentName: "",
      color: e.color ?? eventColorOptions[0],
    });
    setComposeOpen(true);
  };

  const saveEvent = async () => {
    if (!draft.title.trim()) return;
    const payload = {
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location,
      repeat: draft.repeat,
      url: draft.url,
      // THE FAKE ATTACHMENT IS GONE from here. This used to fall back to
      // `Attachment: <filename>` in the notes when no note was typed — a
      // sentence about a file that had never been read, let alone stored. The
      // real upload runs after the event exists, because the object path is
      // keyed by the event id.
      notes: draft.notes,
      color: draft.color,
    };

    // V7 (QA 7.0): a repeat selection generates the recurring occurrences,
    // each its own editable/deletable event. Unchanged in intent; the dates
    // are computed here and the rows are written by the hook.
    const occurrences: string[] = [];
    if (!editingId && draft.repeat !== "none") {
      const horizon = draft.repeat === "daily" ? 30 : 12;
      for (let i = 1; i <= horizon; i++) {
        occurrences.push(
          draft.repeat === "daily"
            ? addDaysISO(draft.date, i)
            : draft.repeat === "weekly"
            ? addDaysISO(draft.date, i * 7)
            : addMonthsISO(draft.date, i)
        );
      }
    }

    const ok = await persistEvent(editingId, payload, draft.inviteeIds, occurrences);
    if (ok) setComposeOpen(false);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timedEvents = selectedEvents.filter((e) => !e.allDay);
  const allDayEvents = selectedEvents.filter((e) => e.allDay);

  // V8 (QA 8.0): business-scheduled classes ride along in the same calendar
  // (see businessCalendarEvents above) but aren't this professional's to
  // edit or delete — the "bc" id prefix set in addBusinessClass is how they're
  // told apart from events the professional created themselves.
  const isFromBusiness = (e: CalendarEvent) => assignedIds.has(e.id);

  const eventCard = (e: CalendarEvent) => {
    const readOnly = isFromBusiness(e) || !isEditable(e);
    return (
      <Card key={e.id} className="flex items-start justify-between gap-3" style={{ borderLeft: `4px solid ${e.color ?? "#7D6BB5"}` }}>
        <button className="min-w-0 text-left flex-1" onClick={() => !readOnly && openEdit(e)} disabled={readOnly}>
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
          {/* WHO IS COMING AND WHAT THEY SAID, straight from the join table.
              This line used to read `e.invitees.join(", ")` — an array of
              names with no answers in it, because a name cannot reply. */}
          {(invitees[e.id]?.length ?? 0) > 0 && (
            <p className="text-xs text-charcoal-faint mt-1">
              With{" "}
              {invitees[e.id]
                .map(
                  (i) =>
                    `${i.name}${
                      i.status === "accepted" ? " ✓" : i.status === "declined" ? " (declined)" : " (no reply)"
                    }`
                )
                .join(", ")}
            </p>
          )}
          {/* A session this account scheduled for a client: read through the
              assigning-professional policy, owned by the client, and shown
              here because it is this professional's working day. */}
          {serverEvent(e.id)?.scheduledForClient && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-bold text-teal-dark mt-1">
              Scheduled for a client
            </span>
          )}
          {e.url && (
            <p className="flex items-center gap-1 text-xs text-primary mt-1 truncate">
              <Link2 size={11} /> {e.url}
            </p>
          )}
          {e.notes && (
            <p className="flex items-start gap-1 text-xs text-charcoal-faint mt-1">
              <FileText size={11} className="mt-0.5 shrink-0" /> {e.notes}
            </p>
          )}
        </button>
        {/* OUTSIDE THE CARD'S OWN BUTTON, and it has to be: a <button> inside
            a <button> is invalid HTML, and React says so at runtime. Caught
            by the console during verification rather than by a type. */}
        {serverEvent(e.id)?.attachmentPath && (
          <button
            onClick={() => void openAttachment(serverEvent(e.id)!.attachmentPath!)}
            aria-label={`Open the attachment on ${e.title}`}
            className="tap shrink-0 self-start text-primary"
          >
            <Paperclip size={14} />
          </button>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {readOnly ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint" aria-label="From your affiliated business">
              <Store size={12} />
            </span>
          ) : (
            <>
              <button onClick={() => openEdit(e)} aria-label={`Edit ${e.title}`} className="tap text-charcoal-faint">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => void persistDelete(e.id)}
                aria-label={`Delete ${e.title}`}
                className="tap text-charcoal-faint"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div>
      {loadError && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {loadError}
        </p>
      )}
      <PageHeader
        title="Calendar"
        right={
          <button
            onClick={openCompose}
            className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft"
            aria-label="New event"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["year", "month", "week", "day"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              "tap px-4 py-1.5 rounded-full text-xs font-bold capitalize",
              view === v ? "bg-primary text-white" : "text-charcoal-faint"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "month" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => goMonth(-1)} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <ChevronLeft size={16} />
            </button>
            <p className="font-display font-semibold text-charcoal">
              {monthNames[cursor.month]} {cursor.year}
            </p>
            <button onClick={() => goMonth(1)} className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {"SMTWTFS".split("").map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-charcoal-faint py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const iso = toISO(cursor.year, cursor.month, day);
              const hasEvents = !!eventsByDate[iso]?.length;
              const isSelected = iso === selectedDate;
              const isToday = iso === toISO(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDate(iso);
                    setView("day");
                  }}
                  className={clsx(
                    "tap aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm",
                    isSelected
                      ? "bg-primary text-white font-bold"
                      : isToday
                      ? "bg-primary-pale text-primary-dark font-semibold"
                      : "text-charcoal hover:bg-cream-soft"
                  )}
                >
                  {day}
                  {hasEvents && (
                    <span className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* V9 (QA 9.0): "Alongside year monthly and daily I would like a
          weekly option as well." — one card per day of the week the
          selected date falls in, each listing its own events. */}
      {view === "week" &&
        (() => {
          const weekStart = startOfWeekISO(selectedDate);
          const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
          const weekEnd = weekDays[6];
          const rangeLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`;
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedDate(addDaysISO(selectedDate, -7))}
                  className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="font-display font-semibold text-charcoal">{rangeLabel}</p>
                <button
                  onClick={() => setSelectedDate(addDaysISO(selectedDate, 7))}
                  className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
                >
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
            <button
              onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
              className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="font-display font-semibold text-charcoal">{selectedDateLabel}</p>
            <button
              onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
              className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {allDayEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">All day</p>
              {allDayEvents.map(eventCard)}
            </div>
          )}

          {/* V8 (QA 8.0): "the 12am-11pm hour-row list in Day view always
              renders regardless of whether any events exist that day" —
              the hour grid is no longer hidden behind an events-only check. */}
          <div className="relative" style={{ height: HOUR_PX * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-charcoal/[0.06] flex items-start"
                style={{ top: h * HOUR_PX }}
              >
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
                const readOnly = isFromBusiness(e) || !isEditable(e);
                return (
                  <button
                    key={e.id}
                    onClick={() => !readOnly && openEdit(e)}
                    disabled={readOnly}
                    className="tap absolute left-0 right-1 rounded-xl px-2.5 py-1.5 text-left overflow-hidden shadow-soft"
                    style={{ top, height, background: `${e.color ?? "#7D6BB5"}22`, borderLeft: `3px solid ${e.color ?? "#7D6BB5"}` }}
                  >
                    <p className="text-xs font-semibold text-charcoal truncate flex items-center gap-1">
                      {e.title}
                      {readOnly && <Store size={10} className="shrink-0" />}
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
              placeholder="Session with client"
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
              className={clsx(
                "tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors",
                draft.allDay ? "bg-primary justify-end" : "bg-charcoal/10 justify-start"
              )}
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
              placeholder="Gym, clinic, video call…"
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
                  style={{
                    background: c,
                    boxShadow: draft.color === c ? "0 0 0 2px rgb(var(--c-cream)), 0 0 0 4px " + c : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {!editingId && (
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
                      draft.repeat === r.value
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {draft.repeat !== "none" && (
                <p className="text-[11px] text-charcoal-faint mt-2">
                  This will create separate {draft.repeat} events you can each edit or delete individually.
                </p>
              )}
            </div>
          )}

          {/* V8 (QA 8.0): "Change the invitees UI from toggle-Chip-buttons to
              an actual dropdown." Native multi-select — cmd/ctrl+click to pick
              more than one, same as any standard form control.

              THE LIST IS THE ENTITLEMENT, NOT THE ROSTER. It used to be
              `professionalClients`, local state, and the chosen names were
              written into an `invitees[]` array of strings. These are real
              accounts from an active relationship — the same set
              can_invite_to_calendar computes — so the picker cannot offer
              somebody the database would refuse. If it somehow does, ATX12
              comes back with a sentence rather than a constraint name. */}
          {candidates.length > 0 ? (
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Invitees</span>
              <select
                multiple
                value={draft.inviteeIds}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    inviteeIds: Array.from(e.target.selectedOptions, (o) => o.value),
                  }))
                }
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                size={Math.min(4, candidates.length)}
              >
                {candidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-charcoal-faint mt-1.5">Hold Ctrl/Cmd to select more than one.</p>

              {/* WHO SAID WHAT, on an event that already has invitations. The
                  migration kept declines visible for the owner precisely so
                  this can be shown — hiding them would leave a professional
                  unable to tell "declined" from "never invited". */}
              {editingId && (invitees[editingId]?.length ?? 0) > 0 && (
                <div className="mt-2.5 space-y-1">
                  {invitees[editingId].map((i) => (
                    <div key={i.userId} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-charcoal-soft truncate">{i.name}</span>
                      <span
                        className={clsx(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          i.status === "accepted"
                            ? "bg-primary-pale text-primary-dark"
                            : i.status === "declined"
                            ? "bg-cream-soft text-charcoal-faint"
                            : "bg-gold/15 text-gold"
                        )}
                      >
                        {i.status === "accepted"
                          ? "Accepted"
                          : i.status === "declined"
                          ? "Declined"
                          : "No reply yet"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </label>
          ) : (
            <p className="text-[11px] text-charcoal-faint">
              You can invite clients and colleagues you work with. Once a connection is active,
              they'll appear here.
            </p>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">URL</span>
            <input
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {/* A REAL UPLOAD, AND ONLY ONCE THE EVENT EXISTS. This input used to
              keep `e.target.files?.[0]?.name` and nothing else — the bytes
              were never read, and the filename was folded into the notes as
              "Attachment: report.pdf". An event claimed to carry a document
              that did not exist anywhere.

              The object path is <event_id>/<uploader_id>/<name>, so there is
              no event id to upload against until the event has been saved.
              Offering the control before then would mean holding the file
              through the save and hoping. */}
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Attachment</span>
            {editingId ? (
              <>
                {serverEvent(editingId)?.attachmentPath && (
                  <button
                    onClick={() => void openAttachment(serverEvent(editingId)!.attachmentPath!)}
                    className="tap mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <Paperclip size={12} /> Open current attachment
                  </button>
                )}
                <input
                  type="file"
                  accept={acceptFor("calendar-attachments")}
                  disabled={saving}
                  onChange={(e) => e.target.files?.[0] && void attachFile(editingId, e.target.files[0])}
                  className="w-full text-xs text-charcoal-faint file:mr-3 file:rounded-lg file:border-0 file:bg-cream-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-charcoal-soft"
                />
                <p className="text-[11px] text-charcoal-faint mt-1.5">
                  Invitees can open whatever you attach here.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-charcoal-faint">
                Save the event first, then reopen it to attach a file.
              </p>
            )}
          </label>

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
                void persistDelete(editingId).then((ok) => {
                  if (ok) setComposeOpen(false);
                });
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
