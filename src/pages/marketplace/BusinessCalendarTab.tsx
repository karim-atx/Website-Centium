import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { mockBusinessCustomers } from "../../data/mockBusinessCustomers";
import type { BusinessClass } from "../../types";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Trash2 } from "lucide-react";
import clsx from "clsx";

type View = "year" | "month" | "week" | "day";
const classTypeOptions = ["Group fitness", "Yoga", "Spin", "HIIT", "Personal training", "Physio session"];

const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }));
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

const blankDraft = (date: string) => ({
  title: "",
  classType: classTypeOptions[0],
  date,
  startTime: "09:00",
  endTime: "10:00",
  maxCapacity: "10",
  professionalId: "",
  clientIds: [] as string[],
  notes: "",
});

// V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI here
// in a button found in the More's page. This serves as a calendar where the
// business can add single or multiple clients at once to affiliated
// professionals and/or classes and will sync accordingly" — same Year/
// Month/Week/Day shell as the Professional/Client calendars, built on top
// of the existing businessClasses store (which already syncs into the
// affiliated professional's own calendar — see CalendarTab.tsx).
export default function BusinessCalendarTab() {
  const { user, businessClasses, addBusinessClass, removeBusinessClass, businessEmployees } = useApp();
  const employees = user.businessId ? businessEmployees[user.businessId] ?? [] : [];
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState(blankDraft(selectedDate));

  const eventsByDate = useMemo(() => {
    const map: Record<string, BusinessClass[]> = {};
    businessClasses.forEach((c) => {
      (map[c.date] ??= []).push(c);
    });
    return map;
  }, [businessClasses]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const cells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

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

  const toggleClient = (id: string) =>
    setDraft((d) => ({ ...d, clientIds: d.clientIds.includes(id) ? d.clientIds.filter((i) => i !== id) : [...d.clientIds, id] }));

  const save = () => {
    if (!draft.title.trim()) return;
    addBusinessClass({
      title: draft.title.trim(),
      classType: draft.classType,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      maxCapacity: Number(draft.maxCapacity) || 10,
      professionalId: draft.professionalId || undefined,
      clientIds: draft.clientIds.length ? draft.clientIds : undefined,
      notes: draft.notes.trim() || undefined,
    });
    setComposeOpen(false);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const eventCard = (c: BusinessClass) => {
    const professional = employees.find((e) => e.professionalId === c.professionalId);
    const clients = mockBusinessCustomers.filter((cu) => c.clientIds?.includes(cu.id));
    return (
      <Card key={c.id} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-charcoal">{c.title}</p>
          <p className="text-xs text-primary-dark font-medium">{c.classType}</p>
          <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-1">
            <Clock size={11} /> {c.startTime}–{c.endTime}
            {professional ? ` · ${professional.professionalName}` : ""}
          </p>
          {clients.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
              <Users size={11} /> {clients.map((cu) => cu.name).join(", ")}
            </p>
          )}
        </div>
        <button onClick={() => removeBusinessClass(c.id)} aria-label={`Delete ${c.title}`} className="tap text-charcoal-faint shrink-0">
          <Trash2 size={14} />
        </button>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        showBack
        right={
          <button onClick={openCompose} className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft" aria-label="New event">
            <Plus size={18} />
          </button>
        }
      />

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["year", "month", "week", "day"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx("tap px-4 py-1.5 rounded-full text-xs font-bold capitalize", view === v ? "bg-primary text-white" : "text-charcoal-faint")}
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
                    isSelected ? "bg-primary text-white font-bold" : isToday ? "bg-primary-pale text-primary-dark font-semibold" : "text-charcoal hover:bg-cream-soft"
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
          const rangeLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(
            `${weekDays[6]}T00:00:00`
          ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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
                        onClick={() => { setSelectedDate(iso); setView("day"); }}
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
          <div className="space-y-2.5">
            {selectedEvents.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-sm text-charcoal-faint">No events this day.</p>
              </Card>
            ) : (
              selectedEvents.map(eventCard)
            )}
          </div>
        </>
      )}

      <BottomSheet open={composeOpen} onClose={() => setComposeOpen(false)} title="New Event">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Morning HIIT"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Class type</span>
            <select
              value={draft.classType}
              onChange={(e) => setDraft((d) => ({ ...d, classType: e.target.value }))}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {classTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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

          {employees.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Affiliated professional</span>
              <div className="flex flex-wrap gap-2">
                {employees.map((e) => (
                  <button
                    key={e.professionalId}
                    onClick={() => setDraft((d) => ({ ...d, professionalId: d.professionalId === e.professionalId ? "" : e.professionalId }))}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      draft.professionalId === e.professionalId ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {e.professionalName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Clients (single or multiple)</span>
            <div className="flex flex-wrap gap-2">
              {mockBusinessCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleClient(c.id)}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    draft.clientIds.includes(c.id) ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {c.name}
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
              placeholder="Anything to remember…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>

          <Button fullWidth size="lg" onClick={save} disabled={!draft.title.trim()}>
            Save event
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
