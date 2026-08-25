import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { CalendarEvent } from "../../types";
import { ChevronLeft, ChevronRight, Plus, MapPin, Link2, FileText, Trash2, Repeat, Pencil, Store } from "lucide-react";
import clsx from "clsx";

// V7 (QA 7.0): Year → Month → Day, Month selected by default.
type View = "year" | "month" | "day";

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

export default function CalendarTab() {
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, professionalClients, businessClasses, businessDirectory, user } = useApp();
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft(selectedDate));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // V8 (QA 8.0): "business-scheduled events involving an affiliated
  // professional show on BOTH the business's and the professional's
  // calendars" — classes a business assigned to this professional (via the
  // "me" stand-in id already used across the affiliation system) are folded
  // into the same calendar, read-only. The "bc" id prefix (set in
  // addBusinessClass) is how the rest of this file tells them apart from
  // events the professional created themselves.
  const businessCalendarEvents = useMemo<CalendarEvent[]>(() => {
    const businessName = businessDirectory.find((b) => b.id === user.affiliatedBusinessId)?.businessName;
    return businessClasses
      .filter((c) => c.professionalId === "me")
      .map((c) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        allDay: false,
        startTime: c.startTime,
        endTime: c.endTime,
        repeat: "none" as const,
        notes: `Scheduled by ${businessName ?? "your affiliated business"}${c.notes ? ` — ${c.notes}` : ""}`,
        color: "#D9A441",
      }));
  }, [businessClasses, businessDirectory, user.affiliatedBusinessId]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    [...calendarEvents, ...businessCalendarEvents].forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return map;
  }, [calendarEvents, businessCalendarEvents]);

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
      inviteeIds: professionalClients.filter((c) => e.invitees?.includes(c.name)).map((c) => c.id),
      url: e.url ?? "",
      notes: e.notes ?? "",
      attachmentName: "",
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
      invitees: draft.inviteeIds
        .map((id) => professionalClients.find((c) => c.id === id)?.name)
        .filter((n): n is string => !!n),
      url: draft.url.trim() || undefined,
      notes: draft.notes.trim() || (draft.attachmentName ? `Attachment: ${draft.attachmentName}` : undefined),
      color: draft.color,
    };

    if (editingId) {
      updateCalendarEvent(editingId, base);
    } else {
      addCalendarEvent(base);
      // V7 (QA 7.0): a repeat selection now actually generates the
      // recurring occurrences, each its own editable/deletable event.
      if (draft.repeat !== "none") {
        const horizon = draft.repeat === "daily" ? 30 : draft.repeat === "weekly" ? 12 : 12;
        for (let i = 1; i <= horizon; i++) {
          const occurrenceDate =
            draft.repeat === "daily"
              ? addDaysISO(draft.date, i)
              : draft.repeat === "weekly"
              ? addDaysISO(draft.date, i * 7)
              : addMonthsISO(draft.date, i);
          addCalendarEvent({ ...base, date: occurrenceDate });
        }
      }
    }
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

  // V8 (QA 8.0): business-scheduled classes ride along in the same calendar
  // (see businessCalendarEvents above) but aren't this professional's to
  // edit or delete — the "bc" id prefix set in addBusinessClass is how they're
  // told apart from events the professional created themselves.
  const isFromBusiness = (e: CalendarEvent) => e.id.startsWith("bc");

  const eventCard = (e: CalendarEvent) => {
    const readOnly = isFromBusiness(e);
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
        </button>
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
              <button onClick={() => removeCalendarEvent(e.id)} aria-label={`Delete ${e.title}`} className="tap text-charcoal-faint">
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
        {(["year", "month", "day"] as View[]).map((v) => (
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
                const readOnly = isFromBusiness(e);
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
                        ? "bg-sohati text-white border-sohati"
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

          {professionalClients.length > 0 && (
            <label className="block">
              {/* V8 (QA 8.0): "Change the invitees UI from toggle-Chip-buttons
                  to an actual dropdown." Native multi-select — cmd/ctrl+click
                  to pick more than one, same as any standard form control. */}
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
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
                size={Math.min(4, professionalClients.length)}
              >
                {professionalClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prefix ? `${c.prefix} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-charcoal-faint mt-1.5">Hold Ctrl/Cmd to select more than one.</p>
            </label>
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
            {editingId ? "Save changes" : "Save event"}
          </Button>

          {editingId && (
            <Button
              fullWidth
              variant="outline"
              className="!border-ember/30 !text-ember-dark"
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
