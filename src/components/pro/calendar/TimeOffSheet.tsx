import React, { useEffect, useState } from "react";
import { Calendar as CalendarIcon, CalendarX, Coffee, Plane, Repeat } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { TimeField } from "../../calendar/EventComposeSheet";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { textPx } from "../../../theme/textSize";
import { range12 } from "../../../utils/time12";
import { INK } from "../proInk";
import { addTimeOff, deleteTimeOff, replaceTimeOff } from "../../../services/pro/calendar";
import { FieldButton, FieldInput, SwitchRow } from "./calendarFields";
import { dayDate, fieldDate, timeOffDates, type TimeOffEntry, type TimeOffRepeat } from "./calendarModel";

/**
 * Release 3 · W4 CA14 Time off · Detail and edit and CA15 Delete
 * confirmation (source/gen/r6a.js timeOffDetail6, timeOffDelete6). Never
 * "Breaks and time off" (HANDOVER f CA design notes).
 *
 * DB-4 instructor_unavailable_dates, pro-wide (business_id null), which also
 * blocks this professional's slots in every business (the Release 3
 * follow-up). One row per date with optional hours; the entry's name is the
 * row's reason. A repeat is written as its dates (one insert, so the rows stay
 * one entry): the table holds no rule, so a repeat runs until a chosen date.
 */

const REPEATS: { value: TimeOffRepeat; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Every week" },
];
const repeatLabel = (r: TimeOffRepeat) => REPEATS.find((x) => x.value === r)!.label;

export const TimeOffSheet: React.FC<{
  open: boolean;
  me: string;
  todayIso: string;
  /** null = a new time off on `date`. */
  entry: TimeOffEntry | null;
  date: string;
  /** The day it was opened from: CA15's "Only {day_date}". */
  onDay: string | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, me, todayIso, entry, date, onDay, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [first, setFirst] = useState(date);
  const [until, setUntil] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<TimeOffRepeat>("none");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [wheel, setWheel] = useState<"start" | "end" | null>(null);
  const [picker, setPicker] = useState<"first" | "until" | null>(null);
  const [repeatAnchor, setRepeatAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(entry?.reason ?? "");
    setFirst(entry?.dates[0] ?? date);
    setUntil(entry && entry.dates.length > 1 ? entry.dates[entry.dates.length - 1] : null);
    setRepeat(entry?.repeat === "none" && (entry?.dates.length ?? 0) > 1 ? "daily" : entry?.repeat ?? "none");
    setAllDay(entry ? entry.start === null : false);
    setStart(entry?.start ?? "12:00");
    setEnd(entry?.end ?? "13:00");
    setWheel(null);
    setError(null);
    setConfirm(false);
  }, [open, entry, date]);

  const title = name.trim() || (allDay ? "Time off" : "Break");
  const Icon = allDay ? Plane : Coffee;
  const dates = repeat === "none" ? [first] : timeOffDates(first, repeat, until);
  const canSave = !busy && (repeat === "none" || !!until) && (allDay || start < end);

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const draft = { dates, start: allDay ? null : start, end: allDay ? null : end, reason: name };
    const r = entry ? await replaceTimeOff(me, entry.ids, draft) : await addTimeOff(me, draft);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved();
    onClose();
  };

  const remove = async (ids: string[]) => {
    setBusy(true);
    const r = await deleteTimeOff(ids);
    setBusy(false);
    setConfirm(false);
    if (!r.ok) return setError(r.message);
    onSaved();
    onClose();
  };

  // CA15: "Lunch, every weekday 12:00 to 12:45" (times through range12).
  const whenLine = entry
    ? `${entry.reason || (entry.start === null ? "Time off" : "Break")}, ${[
        entry.repeat !== "none" ? repeatLabel(entry.repeat).toLowerCase() : entry.dates.length > 1 ? `${dayDate(entry.dates[0])} to ${dayDate(entry.dates[entry.dates.length - 1])}` : dayDate(entry.dates[0]),
        entry.start ? range12(entry.start, entry.end) : null,
      ]
        .filter(Boolean)
        .join(" ")}`
    : "";
  const oneDay = onDay && entry && entry.dates.length > 1 && entry.dates.includes(onDay) ? onDay : null;
  const thisRow = oneDay && entry ? entry.ids[entry.dates.indexOf(oneDay)] : null;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Time off"
        footer={<CtaButton size="sheet" className="w-full" label={entry ? "Save changes" : "Save time off"} loading={busy} disabled={!canSave} onClick={() => void save()} />}
      >
        <div className="flex items-center" style={{ gap: 12, borderRadius: 16, background: INK.raised, padding: 12, marginBottom: 16 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: INK.soft }}>
            <Icon size={18} strokeWidth={1.75} aria-hidden style={{ color: INK.chS }} />
          </span>
          <span className="min-w-0">
            <span className="block truncate" style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch }}>
              {title}
            </span>
            <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
              Clients can't book this time
            </span>
          </span>
        </div>
        <div className="flex flex-col" style={{ gap: 14 }}>
          <FieldButton label="Date" value={fieldDate(first)} icon={CalendarIcon} ariaLabel={`Date, ${fieldDate(first)}`} onClick={() => setPicker("first")} />
          <SwitchRow title="All day" checked={allDay} onChange={(v) => { setWheel(null); setAllDay(v); }} />
          {!allDay && (
            <div>
              <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
                <TimeField label="From" value={start} open={wheel === "start"} onOpen={() => setWheel("start")} onClose={() => setWheel(null)} onChange={setStart} minuteStep={15} />
                <TimeField label="To" value={end} open={wheel === "end"} onOpen={() => setWheel("end")} onClose={() => setWheel(null)} onChange={setEnd} notBefore={start} minuteStep={15} />
              </div>
              {wheel && <div aria-hidden style={{ height: 150 }} />}
            </div>
          )}
          <div>
            <FieldButton label="Repeat" labelIcon={Repeat} value={repeatLabel(repeat)} ariaLabel={`Repeat, ${repeatLabel(repeat)}`} open={!!repeatAnchor} onClick={(e) => setRepeatAnchor(e.currentTarget)} />
            <PopupMenu
              open={!!repeatAnchor}
              onClose={() => setRepeatAnchor(null)}
              anchor={repeatAnchor}
              matchWidth={repeatAnchor}
              options={REPEATS.map((r) => ({ value: r.value, label: r.label }))}
              selected={repeat}
              onSelect={(v) => {
                setRepeat(v);
                setRepeatAnchor(null);
              }}
            />
          </div>
          {repeat !== "none" && (
            <FieldButton label="Until" value={until ? fieldDate(until) : "Choose a date"} placeholder={!until} icon={CalendarIcon} ariaLabel={`Until, ${until ? fieldDate(until) : "no date chosen"}`} onClick={() => setPicker("until")} />
          )}
          <FieldInput label="Note" value={name} onChange={setName} placeholder="Only you see this" maxLength={200} />
        </div>
        {error && (
          <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 12 }}>
            {error}
          </p>
        )}
        {entry && (
          <button type="button" onClick={() => setConfirm(true)} className="tap block w-full text-center" style={{ marginTop: 20, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.hi }}>
            Delete time off
          </button>
        )}
      </BottomSheet>

      <CalendarPickerSheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === "until" ? "Until" : "Date"}
        selectedDate={picker === "until" ? until ?? first : first}
        today={todayIso}
        onSelect={(d) => {
          if (picker === "until") setUntil(d < first ? first : d);
          else {
            setFirst(d);
            if (until && until < d) setUntil(null);
          }
        }}
      />

      <CentredPopup
        open={confirm && !!entry}
        onClose={() => setConfirm(false)}
        title="Delete this time off?"
        icon={<CalendarX size={22} strokeWidth={2} aria-hidden />}
        body={`${whenLine}. Clients can book this time again.`}
      >
        <div className="flex flex-col" style={{ gap: 8 }}>
          {entry && entry.dates.length > 1 ? (
            <>
              <CtaButton size="page" label={entry.repeat === "none" ? "Delete every day" : `Delete for ${repeatLabel(entry.repeat).toLowerCase()}`} loading={busy} onClick={() => void remove(entry.ids)} />
              {thisRow && oneDay && <CtaButton size="page" variant="secondary" label={`Only ${dayDate(oneDay)}`} disabled={busy} onClick={() => void remove([thisRow])} />}
            </>
          ) : (
            entry && <CtaButton size="page" label="Delete time off" loading={busy} onClick={() => void remove(entry.ids)} />
          )}
          <CtaButton size="page" variant="outline" label="Keep it" disabled={busy} onClick={() => setConfirm(false)} />
        </div>
      </CentredPopup>
    </>
  );
};
