import React, { useState } from "react";
import { Bell, Calendar as CalendarIcon, ChevronDown, Clock, Link as LinkIcon, Repeat } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { PopupMenu } from "../ui/PopupMenu";
import { WheelPicker } from "../ui/WheelPicker";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import type { CalendarEvent } from "../../types";
import { EVENT_SWATCHES } from "./eventColour";
import { ALERT_OPTIONS, alertLabel, type EventAlert } from "./eventAlert";
import { fieldTime, fromParts, minuteOptions, minutesOf, fromMinutes, toParts, type Meridiem, type TimeParts } from "./calendarTime";
import { useBackCloses } from "../../hooks/useBackCloses";

// MO1.6.4 New event (and MO1.6.4.1, its date popup), in the lavender-header
// sheet. Field order as the frame draws it: Title, Location, Date with All
// day beside it, Starts / Ends (each opening a wheel under the field), Color
// (twelve swatches, 8 + 4), Repeat | Alert half and half (MO1.6.4.2's menu),
// Notes, Link, Save event. Not drawn but kept: Edit mode and Delete (the only
// way to change or remove an event a person made).
//
// Alert is stored on the event (calendar_events.alert, Stage 2) and delivered
// by the database's sweep to the owner; see eventAlert.ts.

export interface EventDraft {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  repeat: CalendarEvent["repeat"];
  notes: string;
  color: string;
  url: string;
  /** The calendar_alert enum value; "none" = None. */
  alert: EventAlert;
}

const REPEAT_OPTIONS: { value: CalendarEvent["repeat"]; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];

const FIELD = "w-full h-10 rounded-xl bg-cream-soft border border-charcoal/10 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";
const LABEL = "text-xs font-semibold text-charcoal-soft mb-1.5 block";

/** The DD/MM/YYYY MO1.6.4 draws ("01/10/2026"). */
const dateLabel = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB");

function TimeField({
  label,
  value,
  open,
  onOpen,
  onClose,
  onChange,
  notBefore,
}: {
  label: string;
  value: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (hhmm: string) => void;
  /** Ends: nothing earlier than this ("HH:MM") can be chosen. */
  notBefore?: string;
}) {
  const parts = toParts(value);
  const floor = notBefore ? minutesOf(notBefore) : -1;
  const tooEarly = (p: TimeParts) => minutesOf(fromParts(p)) < floor;
  const set = (p: Partial<TimeParts>) => {
    const next = { ...parts, ...p };
    if (!tooEarly(next)) onChange(fromParts(next));
  };
  return (
    <div className="relative min-w-0">
      <span className={LABEL}>{label}</span>
      <button
        type="button"
        onClick={open ? onClose : onOpen}
        aria-expanded={open}
        aria-label={`${label}, ${fieldTime(value)}`}
        className={`tap ${FIELD} flex items-center justify-between text-left`}
      >
        <span className="tabular-nums">{fieldTime(value)}</span>
        <Clock size={16} strokeWidth={1.75} className="text-charcoal-faint shrink-0" />
      </button>
      {open && (
        <>
          {/* Tap outside closes (MO1.6.4's rule); the wheel updates as it turns. */}
          <div className="fixed inset-0 z-[5]" onClick={onClose} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-[6] rounded-2xl bg-cream-card border border-team-nav-accent/[0.22] shadow-lift p-1.5">
            <WheelPicker
              columns={[
                {
                  label: "Hours",
                  value: parts.hour,
                  options: HOURS.map((h) => ({ value: h, label: String(h), disabled: tooEarly({ ...parts, hour: h }) })),
                  onChange: (v) => set({ hour: Number(v) }),
                },
                {
                  label: "Minutes",
                  value: parts.minute,
                  options: minuteOptions(parts.minute).map((m) => ({
                    value: m,
                    label: String(m).padStart(2, "0"),
                    disabled: tooEarly({ ...parts, minute: m }),
                  })),
                  onChange: (v) => set({ minute: Number(v) }),
                },
                {
                  label: "AM or PM",
                  value: parts.meridiem,
                  options: MERIDIEMS.map((m) => ({ value: m, label: m, disabled: tooEarly({ ...parts, meridiem: m }) })),
                  onChange: (v) => set({ meridiem: v as Meridiem }),
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

export const EventComposeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  editing: boolean;
  draft: EventDraft;
  setDraft: React.Dispatch<React.SetStateAction<EventDraft>>;
  todayIso: string;
  saving: boolean;
  error: string | null;
  linkError: boolean;
  onSave: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
}> = ({ open, onClose, editing, draft, setDraft, todayIso, saving, error, linkError, onSave, onDelete, confirmDelete }) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onClose);
  const [dateOpen, setDateOpen] = useState(false);
  const [wheel, setWheel] = useState<"start" | "end" | null>(null);
  // The open menu's anchor; null when closed.
  const [repeatAnchor, setRepeatAnchor] = useState<HTMLElement | null>(null);
  const [alertAnchor, setAlertAnchor] = useState<HTMLElement | null>(null);

  // A new start keeps the event's length, so Ends never falls behind Starts.
  const setStart = (hhmm: string) =>
    setDraft((d) => {
      const length = Math.max(0, minutesOf(d.endTime) - minutesOf(d.startTime));
      return { ...d, startTime: hhmm, endTime: fromMinutes(minutesOf(hhmm) + length) };
    });

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setWheel(null);
        setRepeatAnchor(null);
        setAlertAnchor(null);
        onClose();
      }}
      title={editing ? "Edit Event" : "New Event"}
    >
      <div className="space-y-4 animate-fade-slide-up">
        <label className="block">
          <span className={LABEL}>Title</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Doctor's appointment"
            className={`${FIELD} placeholder:text-charcoal-faint`}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Location</span>
          <input
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            placeholder="Clinic, gym, video call…"
            className={`${FIELD} placeholder:text-charcoal-faint`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="min-w-0">
            <span className={LABEL}>Date</span>
            <button
              type="button"
              onClick={() => setDateOpen(true)}
              aria-label={`Date, ${new Date(`${draft.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
              className={`tap ${FIELD} flex items-center justify-between text-left`}
            >
              <span className="tabular-nums">{dateLabel(draft.date)}</span>
              <CalendarIcon size={16} strokeWidth={1.75} className="text-charcoal-faint shrink-0" />
            </button>
          </div>
          <div className="h-10 rounded-xl bg-cream-soft flex items-center justify-between px-3">
            <span className="text-sm font-semibold text-charcoal">All day</span>
            <Toggle
              checked={draft.allDay}
              onChange={(v) => {
                setWheel(null);
                setDraft((d) => ({ ...d, allDay: v }));
              }}
              label="All day"
            />
          </div>
        </div>

        {!draft.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="Starts"
              value={draft.startTime}
              open={wheel === "start"}
              onOpen={() => setWheel("start")}
              onClose={() => setWheel(null)}
              onChange={setStart}
            />
            <TimeField
              label="Ends"
              value={draft.endTime}
              open={wheel === "end"}
              onOpen={() => setWheel("end")}
              onClose={() => setWheel(null)}
              onChange={(v) => setDraft((d) => ({ ...d, endTime: v }))}
              notBefore={draft.startTime}
            />
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Color</span>
          {/* MO1.6.4 / MO1.6.4.2 (2x frame): twelve 32 circles, 8 apart
              (pitch 40, x 42 → 122), wrapping into a row of eight and a row
              of four, the rows 8 apart (pitch 40, y 1063 → 1143). */}
          <div className="flex flex-wrap gap-2">
            {EVENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, color: c }))}
                aria-label={`Color ${c}`}
                aria-pressed={draft.color === c}
                className="tap w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
              >
                <span
                  aria-hidden
                  // The faint ring in dark keeps the near-black swatch visible on the sheet.
                  className="block w-8 h-8 rounded-full dark:ring-1 dark:ring-white/20"
                  // Selected: MO1.6.4 draws a 1 px gap and a 1 px #241F1B ring
                  // (measured on the 2x frame); the ring is the charcoal ink.
                  style={{
                    background: c,
                    boxShadow:
                      draft.color === c ? "0 0 0 1px rgb(var(--c-cream)), 0 0 0 2px rgb(var(--c-charcoal))" : undefined,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* MO1.6.4 row 11 / MO1.6.4.2 row 3: Repeat | Alert half and half,
            gap 12 (2x x 42–377 | 402–739), each a 12 icon + label over a 40
            field with ChevronDown 14. Both open the app dropdown; Alert's
            card (MO1.6.4.2, measured) is 168 of content lined up with the
            field's right edge, 6 under it, over the sheet without dimming,
            rows 36 and 6 apart with Check 13/3 on the chosen one. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 flex items-center gap-1.5">
              <Repeat size={12} aria-hidden /> Repeat
            </span>
            <button
              type="button"
              onClick={(e) => setRepeatAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={!!repeatAnchor}
              aria-label={`Repeat, ${REPEAT_OPTIONS.find((r) => r.value === draft.repeat)?.label ?? "Never"}`}
              className={`tap ${FIELD} flex items-center justify-between gap-2 text-left`}
            >
              <span className="truncate">{REPEAT_OPTIONS.find((r) => r.value === draft.repeat)?.label ?? "Never"}</span>
              <ChevronDown size={14} className="text-charcoal-faint shrink-0" aria-hidden />
            </button>
            <PopupMenu
              open={!!repeatAnchor}
              onClose={() => setRepeatAnchor(null)}
              anchor={repeatAnchor}
              options={REPEAT_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
              selected={draft.repeat}
              onSelect={(v) => {
                setDraft((d) => ({ ...d, repeat: v }));
                setRepeatAnchor(null);
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 flex items-center gap-1.5">
              <Bell size={12} aria-hidden /> Alert
            </span>
            <button
              type="button"
              onClick={(e) => setAlertAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={!!alertAnchor}
              aria-label={`Alert, ${alertLabel(draft.alert)}`}
              className={`tap ${FIELD} flex items-center justify-between gap-2 text-left`}
            >
              <span className="truncate">{alertLabel(draft.alert)}</span>
              <ChevronDown size={14} className="text-charcoal-faint shrink-0" aria-hidden />
            </button>
            <PopupMenu
              open={!!alertAnchor}
              onClose={() => setAlertAnchor(null)}
              anchor={alertAnchor}
              align="right"
              backdrop={false}
              options={ALERT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              selected={draft.alert}
              onSelect={(v) => {
                setDraft((d) => ({ ...d, alert: v }));
                setAlertAnchor(null);
              }}
            />
          </div>
        </div>

        <label className="block">
          <span className={LABEL}>Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
            placeholder="Anything else to remember…"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </label>

        <label className="block">
          <span className={LABEL}>Link</span>
          <span className={`${FIELD} flex items-center gap-2`}>
            <LinkIcon size={15} strokeWidth={1.75} className="text-charcoal-faint shrink-0" />
            <input
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="Add a link"
              aria-invalid={linkError || undefined}
              className="flex-1 min-w-0 h-full bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </span>
          {linkError && (
            <span className="mt-1.5 block text-xs font-semibold text-status-high">Links need to be a web address (http or https).</span>
          )}
        </label>

        {error && <p className="text-xs font-semibold text-status-high text-center">{error}</p>}

        <Button fullWidth size="lg" onClick={onSave} disabled={!draft.title.trim() || saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Save event"}
        </Button>

        {/* Decision 23 (item 118): the Foundations destructive text action
            (danger 13/700, centred), still tap-twice; 44 tall to keep the
            tap target. */}
        {editing && (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="tap w-full min-h-11 text-center text-[13px] font-bold text-status-high disabled:opacity-40"
          >
            {confirmDelete ? "Tap again to confirm" : "Delete event"}
          </button>
        )}
      </div>

      <CalendarPickerSheet
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        title="Date"
        selectedDate={draft.date}
        today={todayIso}
        onSelect={(day) => setDraft((d) => ({ ...d, date: day }))}
      />
    </BottomSheet>
  );
};
