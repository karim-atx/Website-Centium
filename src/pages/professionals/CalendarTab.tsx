import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import { ChevronLeft, ChevronRight, Plus, MapPin, Link2, FileText, Trash2, Repeat } from "lucide-react";
import clsx from "clsx";

type View = "month" | "year";

const repeatOptions: { value: CalendarEvent["repeat"]; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" })
);

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const blankDraft = (date: string) => ({
  title: "",
  date,
  allDay: true,
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeat: "none" as CalendarEvent["repeat"],
  inviteeIds: [] as string[],
  url: "",
  notes: "",
  attachmentName: "",
});

export default function CalendarTab() {
  const { calendarEvents, addCalendarEvent, removeCalendarEvent, professionalClients } = useApp();
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState(blankDraft(selectedDate));

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [calendarEvents]);

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
    setDraft(blankDraft(selectedDate));
    setComposeOpen(true);
  };

  const toggleInvitee = (id: string) =>
    setDraft((d) => ({
      ...d,
      inviteeIds: d.inviteeIds.includes(id) ? d.inviteeIds.filter((i) => i !== id) : [...d.inviteeIds, id],
    }));

  const saveEvent = () => {
    if (!draft.title.trim()) return;
    addCalendarEvent({
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime,
      endTime: draft.allDay ? undefined : draft.endTime,
      location: draft.location.trim() || undefined,
      repeat: draft.repeat,
      invitees: draft.inviteeIds
        .map((id) => professionalClients.find((c) => c.id === id)?.name)
        .filter((n): n is string => !!n),
      url: draft.url.trim() || undefined,
      notes: draft.notes.trim() || (draft.attachmentName ? `Attachment: ${draft.attachmentName}` : undefined),
    });
    setComposeOpen(false);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Calendar"
        right={
          <button
            onClick={openCompose}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shadow-soft"
            aria-label="New event"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["month", "year"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              "tap px-4 py-1.5 rounded-full text-xs font-bold capitalize",
              view === v ? "bg-sohati text-white" : "text-charcoal-faint"
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
          <div className="grid grid-cols-7 gap-1 mb-6">
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
                    "tap aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm",
                    isSelected
                      ? "bg-sohati text-white font-bold"
                      : isToday
                      ? "bg-sohati-pale text-sohati-dark font-semibold"
                      : "text-charcoal hover:bg-cream-soft"
                  )}
                >
                  {day}
                  {hasEvents && (
                    <span className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-sohati")} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            {selectedDateLabel}
          </p>
          <div className="space-y-2">
            {selectedEvents.length === 0 ? (
              <Card className="text-center py-6">
                <p className="text-sm text-charcoal-faint">No events this day.</p>
              </Card>
            ) : (
              selectedEvents.map((e) => (
                <Card key={e.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
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
                    {e.invitees && e.invitees.length > 0 && (
                      <p className="text-xs text-charcoal-faint mt-1">With {e.invitees.join(", ")}</p>
                    )}
                    {e.url && (
                      <p className="flex items-center gap-1 text-xs text-sohati mt-1 truncate">
                        <Link2 size={11} /> {e.url}
                      </p>
                    )}
                    {e.notes && (
                      <p className="flex items-start gap-1 text-xs text-charcoal-faint mt-1">
                        <FileText size={11} className="mt-0.5 shrink-0" /> {e.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeCalendarEvent(e.id)}
                    aria-label={`Delete ${e.title}`}
                    className="tap text-charcoal-faint shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </Card>
              ))
            )}
          </div>
        </>
      )}

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

      <BottomSheet open={composeOpen} onClose={() => setComposeOpen(false)} title="New Event">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Session with client"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          <div className="flex items-center justify-between bg-cream-soft rounded-xl px-3.5 py-3">
            <span className="text-sm font-semibold text-charcoal">All day</span>
            <button
              onClick={() => setDraft((d) => ({ ...d, allDay: !d.allDay }))}
              className={clsx(
                "tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors",
                draft.allDay ? "bg-sohati justify-end" : "bg-charcoal/10 justify-start"
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
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Ends</span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
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
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

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
                      ? "bg-sohati text-white border-sohati"
                      : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {professionalClients.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Invitees</span>
              <div className="flex flex-wrap gap-2">
                {professionalClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleInvitee(c.id)}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      draft.inviteeIds.includes(c.id)
                        ? "bg-sohati text-white border-sohati"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">URL</span>
            <input
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Attachment</span>
            <input
              type="file"
              onChange={(e) => setDraft((d) => ({ ...d, attachmentName: e.target.files?.[0]?.name ?? "" }))}
              className="w-full text-xs text-charcoal-faint file:mr-3 file:rounded-lg file:border-0 file:bg-cream-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-charcoal-soft"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={3}
              placeholder="Anything else to remember…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20 resize-none"
            />
          </label>

          <Button fullWidth size="lg" onClick={saveEvent} disabled={!draft.title.trim()}>
            Save event
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
