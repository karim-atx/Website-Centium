import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import { ChevronLeft, ChevronRight, Plus, MapPin, FileText, Trash2, Repeat, User, Store } from "lucide-react";
import clsx from "clsx";

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
export default function ClientCalendarTab() {
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, user, businessDirectory } =
    useApp();
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft(selectedDate));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Events that involve this client: their own, or one a connected
  // professional invited them to by name.
  const myEvents = useMemo(
    () => calendarEvents.filter((e) => e.createdByClient || e.invitees?.includes(user.firstName)),
    [calendarEvents, user.firstName]
  );

  const isMine = (e: CalendarEvent) => !!e.createdByClient;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    myEvents.forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [myEvents]);

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
    if (!isMine(e)) return;
    setEditingId(e.id);
    setConfirmDelete(false);
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

  const saveEvent = () => {
    if (!draft.title.trim()) return;
    const base: Omit<CalendarEvent, "id"> = {
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime,
      endTime: draft.allDay ? undefined : draft.endTime,
      location: draft.location.trim() || undefined,
      repeat: draft.repeat,
      notes: draft.notes.trim() || undefined,
      color: draft.color,
      createdByClient: true,
    };
    if (editingId) updateCalendarEvent(editingId, base);
    else addCalendarEvent(base);
    setComposeOpen(false);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timedEvents = selectedEvents.filter((e) => !e.allDay);
  const allDayEvents = selectedEvents.filter((e) => e.allDay);

  const sourceLabel = (e: CalendarEvent) => {
    if (isMine(e)) return null;
    const businessName = businessDirectory.find((b) => b.id === user.affiliatedBusinessId)?.businessName;
    return e.notes?.startsWith("Scheduled by") ? e.notes : `From ${businessName ?? "your professional"}`;
  };

  const eventCard = (e: CalendarEvent) => {
    const mine = isMine(e);
    return (
      <Card key={e.id} className="flex items-start justify-between gap-3" style={{ borderLeft: `4px solid ${e.color ?? "#7D6BB5"}` }}>
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
          {mine && e.notes && (
            <p className="flex items-start gap-1 text-xs text-charcoal-faint mt-1">
              <FileText size={11} className="mt-0.5 shrink-0" /> {e.notes}
            </p>
          )}
        </button>
        {!mine && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint shrink-0" aria-label={sourceLabel(e) ?? undefined}>
            {e.invitees ? <User size={12} /> : <Store size={12} />}
          </span>
        )}
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        showBack
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
                  {hasEvents && <span className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />}
                </button>
              );
            })}
          </div>
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
                    style={{ top, height, background: `${e.color ?? "#7D6BB5"}22`, borderLeft: `3px solid ${e.color ?? "#7D6BB5"}` }}
                  >
                    <p className="text-xs font-semibold text-charcoal truncate flex items-center gap-1">
                      {e.title}
                      {!mine && (e.invitees ? <User size={10} /> : <Store size={10} />)}
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

          <Button fullWidth size="lg" onClick={saveEvent} disabled={!draft.title.trim()}>
            {editingId ? "Save changes" : "Save event"}
          </Button>

          {editingId && (
            <Button
              fullWidth
              variant="outline"
              className="!border-teal/30 !text-teal-dark"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                  return;
                }
                removeCalendarEvent(editingId);
                setComposeOpen(false);
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
