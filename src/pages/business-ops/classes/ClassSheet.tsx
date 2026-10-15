import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Calendar as CalendarIcon, ChevronDown, ChevronRight, Clock, ImagePlus, Minus, Plus, Repeat, RotateCw, WifiOff, X } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Toggle } from "../../../components/ui/Toggle";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { fromParts, minuteOptions, minutesOf, fromMinutes, toParts, type Meridiem, type TimeParts } from "../../../components/calendar/calendarTime";
import { DAY_LETTERS, DAY_LONG } from "../../../utils/week";
import {
  ABOUT_MAX,
  BRING_MAX_CHARS,
  BRING_MAX_ITEMS,
  CLASS_LEVELS,
  bringList,
  isoWeekday,
  nextLine,
  repeatSummary,
  seriesDates,
  shortDay,
  slashDate,
  type RepeatRule,
} from "../../../services/business-classes/scheduleRules";
import type { SeriesRow } from "../../../services/business-classes/schedule";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  CLASS_SAVE_FAILED,
  CLASS_TYPES,
  validateClassDraft,
  type BusinessClassRow,
  type ClassDraft,
  type ClassField,
  type Instructor,
} from "../../../services/business-classes";
import { useOps, type OpsColors } from "./opsTheme";
import { normalisePrice, repeatProblem, ruleOf, type ClassForm, type RepeatKind } from "./classForm";
import { conflictsFor, initialOf, isLegacyType, joinAnd, longDate, mondayOf, addDays, running, shortDate, type SessionLite } from "./scheduleModel";

// The New Class / Edit class sheet (OP1-146 … 155, AN3-010 … 070, OURS-AN3
// edit). ClassFlowsV6 is the base (lead, V6-164 notes): the field values,
// errors, banner, spinner, conflict and discard dialogs are its markup. The
// Cancel / Save row is pinned (HANDOVER §2.2, OP1-147 "Footer").
//
// B9 (CL-01): Repeat is live on a new class (AN3-041 … 048: menu, "On" day
// chips Monday first per X-13, Ends never / on a date / after N, summary and
// "Next:" box); one save_class_series call makes every class 12 weeks ahead.
// Editing "This and all future sessions" (OP1-085) shows the series' rule
// read-only and keeps the date (the split point); "Only this session" hides
// Repeat (OURS-AN3 A3). A booked class can now change date and time: members
// are told (move_class_session / edit_class), so the old lock is gone and the
// A5 line says so. The instructor clash is refused by the server in any
// business (ATXD9), so the AN3-066 dialog no longer offers "Save anyway".
// B9 (EX-01): the class page's cover, About, Level and What to bring (OURS
// layout: no business frame draws them). The payment type is the
// single-method mode (AN3-028): cash is always on; Whish is "Soon".

/** The Run by menu value of "No one yet" (clears the choice). */
const NO_ONE = "__none";
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];
const FIELD_ORDER: ClassField[] = ["name", "date", "times", "capacity", "price"];
const FIELD_WORD: Record<ClassField, string> = { name: "name", date: "date", times: "times", capacity: "capacity", price: "price" };

/**
 * How much bigger the sheet's 14 px field text is drawn than its spec: the
 * Larger text boost (+2 px) times any browser / system text scaling of the
 * root font (16 px at 1x).
 */
function textScale(): number {
  if (typeof window === "undefined") return 1;
  const root = getComputedStyle(document.documentElement);
  const boost = parseFloat(root.getPropertyValue("--text-boost")) || 0;
  const rootScale = (parseFloat(root.fontSize) || 16) / 16;
  return ((14 + boost) / 14) * rootScale;
}

type Banner = { kind: "fields" | "fail" | "offline" | "permission"; text: string } | null;

const REPEAT_LABEL: Record<RepeatKind, string> = { none: "Does not repeat", daily: "Daily", weekly: "Weekly", biweekly: "Every 2 weeks", custom: "Custom" };
const REPEAT_ORDER: RepeatKind[] = ["none", "daily", "weekly", "biweekly", "custom"];
/** The dates a new series is checked against for clashes: its first 12 weeks (the horizon save_class_series makes). */
const SERIES_CHECK_DAYS = 84;

export interface ClassSheetProps {
  open: boolean;
  mode: "create" | "edit";
  /** Edit only: one session, or this and every later one of its series (OP1-085). */
  scope?: "this" | "future";
  /** The series of the session being edited, for the read-only Repeat line. */
  series?: SeriesRow | null;
  /** B9 EX-01: uploads a cover to class-covers and returns its public URL. */
  onUploadCover?: (file: File) => Promise<{ ok: true; url: string } | { ok: false; message: string }>;
  /** The session being edited. */
  editing?: BusinessClassRow | null;
  /** Booked count of the session being edited (capacity floor, date/time lock). */
  bookedCount?: number;
  initial: ClassForm;
  today: string;
  instructors: Instructor[];
  instructorsLoaded: boolean;
  /** Every session of the business, for the conflict check and "{n} classes this week". */
  sessions: SessionLite[];
  online: boolean;
  people: "clients" | "members";
  onClose: () => void;
  /** `rule` is the repeat a new class asks for (null: one class). */
  onSave: (draft: ClassDraft, rule: RepeatRule | null) => Promise<{ ok: true } | { ok: false; message: string; code?: "capacity" | "permission" | "busy" }>;
  /** Run by's "Add an employee": leave for Team with the draft kept. */
  onAddEmployee: (form: ClassForm) => void;
}

export function ClassSheet(props: ClassSheetProps) {
  const { open, mode, initial, onClose } = props;
  // A fresh form state per opening.
  const [epoch, setEpoch] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setEpoch((e) => e + 1);
  }
  return (
    <SheetBody key={epoch} {...props} open={open} mode={mode} initial={initial} onClose={onClose} />
  );
}

function SheetBody({
  open,
  mode,
  scope = "this",
  series,
  onUploadCover,
  editing,
  bookedCount = 0,
  initial,
  today,
  instructors,
  instructorsLoaded,
  sessions,
  people,
  onClose,
  onSave,
  onAddEmployee,
}: ClassSheetProps) {
  const c = useOps();
  const reduced = useReducedMotion();
  const uid = useId();
  const [form, setForm] = useState<ClassForm>(initial);
  const [errors, setErrors] = useState<Partial<Record<ClassField, string>>>({});
  const [checked, setChecked] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openWheel, setOpenWheel] = useState<"start" | "end" | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflict, setConflict] = useState<{ hits: SessionLite[]; dates: number; elsewhere?: string } | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [untilOpen, setUntilOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [repeatErr, setRepeatErr] = useState<string | null>(null);
  const [bringDraft, setBringDraft] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState<string | null>(null);
  const [repeatEl, setRepeatEl] = useState<HTMLButtonElement | null>(null);
  const [repeatGroupEl, setRepeatGroupEl] = useState<HTMLDivElement | null>(null);
  const [levelEl, setLevelEl] = useState<HTMLButtonElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);
  const countRef = useRef<HTMLInputElement | null>(null);
  const [capFocus, setCapFocus] = useState<"focus" | "typing" | null>(null);
  const [lastValidCap, setLastValidCap] = useState(initial.capacity);
  // OP1-147 A1: above 1.3x text the type / name row stacks to one column.
  const [stackTypeRow] = useState(() => textScale() > 1.3);
  // The client id for this sheet's insert: a Retry re-sends the same one (AN3-068 S1).
  const clientId = useMemo(() => (mode === "create" ? crypto.randomUUID() : undefined), [mode]);

  // Menu anchors as state (read while rendering the menus).
  const [typeEl, setTypeEl] = useState<HTMLButtonElement | null>(null);
  const [runEl, setRunEl] = useState<HTMLButtonElement | null>(null);
  const [runGroupEl, setRunGroupEl] = useState<HTMLDivElement | null>(null);
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<ClassField, HTMLElement | null>>>({});
  const startRef = useRef<HTMLButtonElement | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  // B9: a booked class may move (members are told); only a series edit keeps
  // its date, which is where the series splits (edit_class 'future').
  const dateLocked = mode === "edit" && scope === "future";
  const moved = mode === "edit" && (form.date !== initial.date || form.startTime !== initial.startTime || form.endTime !== initial.endTime);
  const capFloor = mode === "edit" ? Math.max(CAPACITY_MIN, bookedCount) : CAPACITY_MIN;

  const draftOf = (f: ClassForm): ClassDraft => ({
    id: clientId,
    title: f.title,
    classType: f.classType,
    date: f.date,
    startTime: f.startTime,
    endTime: f.endTime,
    maxCapacity: /^\d+$/.test(f.capacity.trim()) ? Number(f.capacity.trim()) : NaN,
    professionalId: f.professionalId || undefined,
    notes: f.notes.trim() || undefined,
    price: normalisePrice(f.price) ?? "x",
    paymentType: f.paymentType,
    about: f.about.trim() || null,
    level: f.level || null,
    whatToBring: bringList(f.bring),
    coverUrl: f.coverUrl || null,
    // B13 MK-04: never above the capacity (business_classes_centium_spots_ok).
    centiumSpots: f.centiumSpots === null ? null : Math.max(0, Math.min(f.centiumSpots, /^d+$/.test(f.capacity.trim()) ? Number(f.capacity.trim()) : f.centiumSpots)),
    listedOnExplore: f.listedOnExplore,
  });

  const validate = (f: ClassForm) => {
    const e = validateClassDraft(draftOf(f), mode === "create" ? today : undefined);
    // A typed capacity that is not a whole number reads as AN3-040's line.
    const capRaw = f.capacity.trim();
    if (capRaw && !/^\d+$/.test(capRaw)) e.capacity = "Enter a whole number from 1 to 200.";
    if (mode === "edit" && /^\d+$/.test(capRaw) && Number(capRaw) < bookedCount) {
      e.capacity = `${bookedCount} spots are already booked. Capacity can't go below ${bookedCount}.`;
    }
    return e;
  };

  // After the first failed Save, flagged fields re-check as they change (AN3-064 S2).
  const update = (patch: Partial<ClassForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (checked && mode === "create") setRepeatErr(repeatProblem(next));
      if (checked) {
        const e = validate(next);
        setErrors((old) => {
          const kept: Partial<Record<ClassField, string>> = {};
          for (const k of Object.keys(old) as ClassField[]) if (e[k]) kept[k] = e[k];
          setBanner((b) => (b?.kind === "fields" ? (Object.keys(kept).length ? { kind: "fields", text: fieldsBanner(kept) } : null) : b));
          return kept;
        });
      }
      return next;
    });
  };

  const requestClose = () => {
    if (saving) return; // AN3-051 rows 4 and 6: leaving is not offered while saving.
    if (dirty) setDiscardOpen(true);
    else onClose();
  };

  const scrollToFirst = (e: Partial<Record<ClassField, string>>) => {
    const first = FIELD_ORDER.find((k) => e[k]);
    if (!first) return;
    const el = fieldRefs.current[first];
    if (el) {
      el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      const focusable = el.querySelector<HTMLElement>("input, button");
      focusable?.focus({ preventScroll: true });
    }
  };

  const doSave = async () => {
    setSaving(true);
    setFailed(false);
    const timeout = new Promise<{ ok: false; message: string }>((r) => window.setTimeout(() => r({ ok: false, message: CLASS_SAVE_FAILED }), 15_000));
    const r = await Promise.race([onSave(draftOf(form), mode === "create" ? ruleOf(form) : null), timeout]);
    setSaving(false);
    if (r.ok) return; // the page closes the sheet and shows the toast
    if ("code" in r && r.code === "busy") {
      // ATXD9: the server's clash check, any business (AN3-066 O3: never says where).
      setConflict({ hits: [], dates: 1, elsewhere: r.message });
      return;
    }
    if ("code" in r && r.code === "capacity") {
      setErrors({ capacity: `${bookedCount} spots are already booked. Capacity can't go below ${bookedCount}.` });
      setChecked(true);
      return;
    }
    if ("code" in r && r.code === "permission") {
      setBanner({ kind: "permission", text: "Couldn't save the class. Only the business owner can add classes right now." });
      return;
    }
    setFailed(true);
    setBanner(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? { kind: "offline", text: "You're offline. The class isn't saved yet. Tap Retry when you're back online. Everything you entered is kept." }
        : { kind: "fail", text: mode === "edit" ? "Couldn't save your changes. Check your connection and tap Retry. Everything you entered is kept." : CLASS_SAVE_FAILED }
    );
  };

  const save = async () => {
    if (saving) return;
    setOpenWheel(null);
    const e = validate(form);
    setChecked(true);
    if (Object.keys(e).length) {
      setErrors(e);
      setBanner({ kind: "fields", text: fieldsBanner(e) });
      scrollToFirst(e);
      return;
    }
    const rp = mode === "create" ? repeatProblem(form) : null;
    setRepeatErr(rp);
    if (rp) {
      setBanner({ kind: "fields", text: "Fix 1 field to save: repeat." });
      repeatGroupEl?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      return;
    }
    setErrors({});
    if (banner?.kind === "fields") setBanner(null);
    // Conflict check (CL-02 / V6-164: every venue of the business), named from
    // the schedule so the dialog can say which class. The server refuses any
    // clash too, in any business (ATXD9), which comes back from the save. A
    // new series is checked on every date of its first 12 weeks (AN3-066 O2).
    const rule = mode === "create" ? ruleOf(form) : null;
    const dates = rule ? seriesDates({ ...rule, untilOn: rule.untilOn ?? addDays(form.date, SERIES_CHECK_DAYS) }, 200, SERIES_CHECK_DAYS) : [form.date];
    const pid = form.professionalId || null;
    // A series edit carries its new times to later dates; checking this date is the drawn rule.
    let hits: SessionLite[] = [];
    let clashDates = 0;
    for (const d of dates) {
      const h = conflictsFor({ date: d, startTime: form.startTime, endTime: form.endTime, professionalId: pid }, sessions, editing?.id);
      if (h.length) {
        clashDates += 1;
        hits = hits.concat(h);
      }
    }
    if (hits.length) {
      setConflict({ hits, dates: clashDates });
      return;
    }
    await doSave();
  };

  const nameOf = (id: string) => instructors.find((i) => i.professionalId === id)?.firstName ?? "";
  const weekFrom = mondayOf(form.date || today);
  const weekTo = addDays(weekFrom, 6);
  const classesThisWeek = (id: string) => running(sessions as (SessionLite & { cancelled?: boolean })[]).filter((s) => s.professionalId === id && s.date >= weekFrom && s.date <= weekTo && s.id !== editing?.id).length;

  const runOptions: PopupMenuOption<string>[] = [
    ...instructors.map((i) => {
      const n = classesThisWeek(i.professionalId);
      return {
        value: i.professionalId,
        label: i.firstName,
        note: n === 0 ? "No classes this week" : n === 1 ? "1 class this week" : `${n} classes this week`,
        icon: <Avatar c={c} name={i.firstName} size={24} />,
      };
    }),
    // V6-164: instructor optional. The app's unassign is kept as a last row.
    { value: NO_ONE, label: "No one yet" },
  ];

  const typeOptions: PopupMenuOption<string>[] = [
    ...(isLegacyType(form.classType, CLASS_TYPES) ? [{ value: form.classType, label: form.classType, note: "Saved before this list" }] : []),
    ...CLASS_TYPES.map((t) => ({ value: t, label: t })),
  ];

  const blankUntouched = mode === "create" && !dirty;
  const editUnchanged = mode === "edit" && !dirty;

  // Repeat (AN3-041 … 048). Weekly / Every 2 weeks / Custom pre-select the
  // Date field's weekday (AN3-043 O1); a day chip toggles, at least one stays on.
  const rp = form.repeat;
  const rule = mode === "create" ? ruleOf(form) : null;
  const pickRepeat = (k: RepeatKind) => {
    const weekdays = rp.weekdays.length ? rp.weekdays : form.date ? [isoWeekday(form.date)] : [];
    update({ repeat: { ...rp, kind: k, weekdays, interval: k === "custom" ? Math.max(1, rp.interval) : rp.interval } });
  };
  const toggleDay = (w: number) => {
    const on = rp.weekdays.includes(w);
    if (on && rp.weekdays.length === 1) return;
    update({ repeat: { ...rp, weekdays: on ? rp.weekdays.filter((x) => x !== w) : [...rp.weekdays, w].sort((a, b) => a - b) } });
  };
  const levelLabel = CLASS_LEVELS.find((l) => l.value === form.level)?.label ?? "";
  const addBring = () => {
    const next = bringList([...form.bring, bringDraft]);
    if (next.length !== form.bring.length) update({ bring: next });
    setBringDraft("");
  };
  const pickCover = async (file: File | undefined) => {
    if (!file || !onUploadCover) return;
    setCoverBusy(true);
    setCoverErr(null);
    const r = await onUploadCover(file);
    setCoverBusy(false);
    if (r.ok) update({ coverUrl: r.url });
    else setCoverErr(r.message);
  };

  const setStart = (hhmm: string) => {
    // Ends follows, keeping the class length (EventComposeSheet rule, OP1-149 S2).
    const len = Math.max(5, minutesOf(form.endTime) - minutesOf(form.startTime));
    update({ startTime: hhmm, endTime: fromMinutes(minutesOf(hhmm) + len) });
  };

  const capNum = /^\d+$/.test(form.capacity.trim()) ? Number(form.capacity.trim()) : null;
  const capInvalid = !!errors.capacity || (capFocus === "typing" && form.capacity.trim() !== "" && (capNum === null || capNum < capFloor || capNum > CAPACITY_MAX));
  const capHelp = (() => {
    if (errors.capacity) return { text: errors.capacity, ink: c.high };
    if (!capFocus) return null;
    if (form.capacity.trim() !== "" && capNum === null) return { text: "Enter a whole number from 1 to 200.", ink: c.high };
    if (capNum !== null && capNum > CAPACITY_MAX) return { text: "Enter a whole number from 1 to 200.", ink: c.high };
    if (mode === "edit" && capNum !== null && capNum < bookedCount) return { text: `${bookedCount} spots are already booked. Capacity can't go below ${bookedCount}.`, ink: c.high };
    if (capNum === CAPACITY_MIN) return { text: "Minimum is 1 spot.", ink: c.faint };
    if (capNum === CAPACITY_MAX) return { text: "Maximum is 200 spots per class.", ink: c.faint };
    return { text: capFocus === "typing" ? "1 to 200 spots." : "Type a number or use − and +.", ink: c.faint };
  })();
  // B13 MK-04: the Centium spots stepper runs 0 to the capacity, then "All free spots" (null).
  const exploreCap = capNum ?? (Number(lastValidCap) || 0);
  const exploreSpots = form.centiumSpots === null ? null : Math.min(form.centiumSpots, exploreCap);
  const stepCap = (d: number) => {
    const base = capNum ?? (Number(lastValidCap) || 10);
    const next = Math.min(CAPACITY_MAX, Math.max(capFloor, base + d));
    setLastValidCap(String(next));
    update({ capacity: String(next) });
  };
  // AN3-036 O2 (OURS): holding − or + repeats the step, after 400 ms then every
  // 100 ms, until release. The release after a repeat adds no extra step.
  const stepRef = useRef(stepCap);
  useEffect(() => {
    stepRef.current = stepCap;
  });
  const repeat = useRef<{ wait: number; tick: number; fired: boolean; release: AbortController } | null>(null);
  const stopRepeat = useCallback(() => {
    const r = repeat.current;
    if (!r) return;
    window.clearTimeout(r.wait);
    window.clearInterval(r.tick);
    r.release.abort();
  }, []);
  useEffect(() => stopRepeat, [stopRepeat]);
  const startRepeat = (d: number) => {
    stopRepeat();
    const r = { wait: 0, tick: 0, fired: false, release: new AbortController() };
    r.wait = window.setTimeout(() => {
      r.tick = window.setInterval(() => {
        r.fired = true;
        stepRef.current(d);
      }, 100);
    }, 400);
    repeat.current = r;
    window.addEventListener("pointerup", stopRepeat, { signal: r.release.signal });
    window.addEventListener("pointercancel", stopRepeat, { signal: r.release.signal });
  };
  const stepClick = (d: number) => {
    if (repeat.current?.fired) {
      repeat.current = null;
      return;
    }
    stepCap(d);
  };

  const fieldBox = (err: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    height: 40,
    borderRadius: 12,
    background: c.soft,
    border: `${err && c.hc ? 2 : 1}px solid ${err ? c.high : c.inputBd}`,
    padding: "0 12px",
    fontSize: textPx(14),
    color: c.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    ...extra,
  });
  const label = (text: string, htmlFor?: string) => (
    <label htmlFor={htmlFor} className="block" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: linePx(16), color: c.inkSoft, marginBottom: 6 }}>
      {text}
    </label>
  );
  const errLine = (text: string | undefined, id: string) =>
    text ? (
      <span id={id} className="block" style={{ marginTop: 6, fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: c.high }}>
        {text}
      </span>
    ) : null;

  const timeField = (which: "start" | "end") => {
    const value = which === "start" ? form.startTime : form.endTime;
    const isOpen = openWheel === which;
    const parts = toParts(value);
    const set = (p: Partial<TimeParts>) => {
      const next = fromParts({ ...parts, ...p });
      if (which === "start") setStart(next);
      else update({ endTime: next });
    };
    const lbl = which === "start" ? "Starts" : "Ends";
    return (
      <div className="relative min-w-0">
        {label(lbl)}
        <button
          ref={which === "start" ? startRef : undefined}
          type="button"
          onClick={() => setOpenWheel(isOpen ? null : which)}
          aria-expanded={isOpen}
          aria-label={`${lbl}, ${time12(value)}`}
          aria-invalid={!!errors.times || undefined}
          aria-describedby={errors.times ? `${uid}-times` : undefined}
          className="tap text-left disabled:opacity-60"
          style={fieldBox(!!errors.times, isOpen ? { border: `1px solid ${c.pDark}`, boxShadow: c.focusRing } : undefined)}
        >
          <span className="tabular-nums">{time12(value)}</span>
          <Clock size={16} strokeWidth={1.75} style={{ color: c.faint }} className="shrink-0" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[5]" onClick={() => setOpenWheel(null)} aria-hidden />
            <div
              className="absolute left-0 right-0 z-[6]"
              style={{ top: "calc(100% + 6px)", borderRadius: 16, background: c.card, border: `1px solid ${c.menuBd}`, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 6 }}
            >
              <WheelPicker
                band="business"
                columns={[
                  { label: "Hours", value: parts.hour, options: HOURS.map((h) => ({ value: h, label: String(h) })), onChange: (v) => set({ hour: Number(v) }) },
                  {
                    label: "Minutes",
                    value: parts.minute,
                    options: minuteOptions(parts.minute).map((m) => ({ value: m, label: String(m).padStart(2, "0") })),
                    onChange: (v) => set({ minute: Number(v) }),
                  },
                  { label: "AM or PM", value: parts.meridiem, options: MERIDIEMS.map((m) => ({ value: m, label: m })), onChange: (v) => set({ meridiem: v as Meridiem }) },
                ]}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const saveLabel = saving ? "Saving…" : failed ? "Retry" : mode === "edit" ? "Save changes" : "Save class";
  const footer = (
    <div>
      {banner && (
        <div
          role="alert"
          className="flex items-start"
          style={{ gap: 10, borderRadius: 14, padding: "12px 14px", background: c.bannerBg, color: c.bannerInk, marginBottom: 12, animation: "class-banner-in .18s ease both" }}
        >
          <style>{`@keyframes class-banner-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
          {banner.kind === "fields" || banner.kind === "permission" ? (
            <AlertCircle size={16} strokeWidth={2.2} className="shrink-0" style={{ marginTop: 1 }} aria-hidden />
          ) : (
            <WifiOff size={16} strokeWidth={2.2} className="shrink-0" style={{ marginTop: 1 }} aria-hidden />
          )}
          <span style={{ fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600 }}>{banner.text}</span>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 10 }}>
        <button
          type="button"
          onClick={requestClose}
          aria-disabled={saving || undefined}
          className="tap"
          style={{ height: 52, borderRadius: 16, border: `1px solid ${c.hc ? c.faint : c.border}`, background: "transparent", fontSize: textPx(14), fontWeight: 700, color: c.inkSoft }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={blankUntouched || editUnchanged}
          aria-busy={saving || undefined}
          aria-disabled={saving || undefined}
          aria-label={saving ? "Saving class" : failed ? "Retry saving the class" : undefined}
          className="tap relative flex items-center justify-center overflow-hidden"
          style={{ height: 52, borderRadius: 16, color: c.onFill, fontSize: textPx(14), fontWeight: 700, gap: 8, background: "transparent" }}
        >
          {/* The fill carries the 0.4 / 0.7 opacity; the label stays full (AN3-051 O6). */}
          <span aria-hidden className="absolute inset-0" style={{ background: c.fill, opacity: blankUntouched || editUnchanged ? 0.4 : saving ? 0.7 : 1, borderRadius: 16 }} />
          {saving && <Spinner reduced={reduced} />}
          {failed && !saving && <RotateCw size={15} strokeWidth={2.4} className="relative" aria-hidden />}
          <span className="relative">{saveLabel}</span>
        </button>
      </div>
    </div>
  );

  const runName = form.professionalId ? nameOf(form.professionalId) : "";

  return (
    <>
      <BottomSheet
        open={open}
        onClose={requestClose}
        title={mode === "edit" ? "Edit class" : "New Class"}
        tone="business"
        maxHeightPct={90}
        animateExit
        closeOnScrim={false}
        footer={footer}
        footerBottom={30}
        bodyPadding={{ top: 20, right: 20, bottom: 8, left: 20 }}
      >
        <div ref={setBodyEl} role="form" aria-label={mode === "edit" ? "Edit class" : "New Class"} className="flex flex-col" style={{ gap: 16, pointerEvents: saving ? "none" : undefined }}>
          {/* Type + name (AN3-010 rows 10-12) */}
          <div ref={(el) => void (fieldRefs.current.name = el)} style={{ scrollMarginTop: 20 }}>
            <div className="grid" style={{ gridTemplateColumns: stackTypeRow ? "minmax(0,1fr)" : "118px minmax(0,1fr)", gap: 10 }}>
              <div className="min-w-0">
                {label("Class type")}
                <button
                  ref={setTypeEl}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={typeOpen}
                  aria-label={form.classType ? `Class type, ${form.classType}` : "Class type, not chosen"}
                  onClick={() => setTypeOpen(true)}
                  className="tap text-left"
                  style={fieldBox(false)}
                >
                  <span className="truncate" style={{ color: form.classType ? c.ink : c.faint }}>
                    {form.classType || "Type"}
                  </span>
                  <ChevronDown size={14} style={{ color: c.faint }} className="shrink-0" />
                </button>
              </div>
              <div className="min-w-0">
                {label("Class name", `${uid}-name`)}
                <input
                  id={`${uid}-name`}
                  value={form.title}
                  maxLength={60}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="e.g. Morning HIIT"
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                  className="class-sheet-input min-w-0 text-ellipsis focus:outline-none"
                  style={{ ...fieldBox(!!errors.name), caretColor: c.pDark }}
                />
              </div>
            </div>
            {errLine(errors.name, `${uid}-name-err`)}
          </div>

          {/* Date (AN3-010 row 13; V6-162 "Tue 6 Oct 2026") */}
          <div ref={(el) => void (fieldRefs.current.date = el)} style={{ scrollMarginTop: 20 }}>
            {label("Date")}
            <button
              type="button"
              disabled={dateLocked}
              onClick={() => setDateOpen(true)}
              aria-label={`Date, ${longDate(form.date)}`}
              aria-invalid={!!errors.date || undefined}
              className="tap text-left disabled:opacity-60"
              style={fieldBox(!!errors.date)}
            >
              <span className="tabular-nums truncate">{longDate(form.date)}</span>
              <CalendarIcon size={16} strokeWidth={1.75} style={{ color: c.faint }} className="shrink-0" />
            </button>
            {errLine(errors.date, `${uid}-date`)}
            {dateLocked && (
              <p style={{ margin: "6px 0 0", fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: c.faint }}>
                The change starts from this date. Earlier sessions keep their details.
              </p>
            )}
          </div>

          {/* Starts / Ends */}
          <div ref={(el) => void (fieldRefs.current.times = el)} style={{ scrollMarginTop: 20 }}>
            <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
              {timeField("start")}
              {timeField("end")}
            </div>
            {errLine(errors.times, `${uid}-times`)}
            {/* OURS-AN3 A5: a booked class moved, its people are told. */}
            {moved && bookedCount > 0 && (
              <p style={{ margin: "8px 0 0", borderRadius: 12, background: c.soft, padding: "10px 12px", fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft }}>
                {bookedCount} booked {bookedCount === 1 ? people.slice(0, -1) : people} {bookedCount === 1 ? "gets" : "get"} a message about the change.
              </p>
            )}
          </div>

          {/* Repeat (AN3-041 … 048, B9 CL-01): new classes; a series edit shows its rule. */}
          {mode === "create" && (
            <div ref={setRepeatGroupEl} style={{ scrollMarginTop: 20 }}>
              {label("Repeat")}
              <button
                ref={setRepeatEl}
                type="button"
                aria-haspopup="menu"
                aria-expanded={repeatOpen}
                aria-label={`Repeat, ${REPEAT_LABEL[rp.kind]}`}
                onClick={() => setRepeatOpen(true)}
                className="tap text-left"
                style={fieldBox(false, {
                  justifyContent: "flex-start",
                  border: `1px solid ${repeatOpen || rp.kind !== "none" ? c.pDark : c.inputBd}`,
                  boxShadow: repeatOpen ? c.focusRing : "none",
                })}
              >
                <Repeat size={15} strokeWidth={1.9} style={{ color: c.faint }} className="shrink-0" aria-hidden />
                <span className="flex-1 min-w-0 truncate">{REPEAT_LABEL[rp.kind]}</span>
                <ChevronDown size={16} style={{ color: c.faint }} className="shrink-0" />
              </button>
              {rp.kind !== "none" && rule && (
                <div className="flex flex-col" style={{ marginTop: 10, borderRadius: 16, border: `1px solid ${c.inputBd}`, padding: 12, gap: 12 }}>
                  {rp.kind === "custom" && (
                    <div className="flex items-center" style={{ gap: 8, fontSize: textPx(12.5), fontWeight: 600, color: c.ink }}>
                      <span>Every</span>
                      <span className="inline-flex items-center" style={{ height: 34, borderRadius: 10, background: c.soft, border: `1px solid ${c.inputBd}` }}>
                        <button type="button" aria-label="Fewer weeks" disabled={rp.interval <= 1} onClick={() => update({ repeat: { ...rp, interval: rp.interval - 1 } })} className="tap h-full flex items-center justify-center disabled:opacity-30" style={{ width: 34, color: c.pDark }}>
                          <Minus size={14} strokeWidth={2.4} />
                        </button>
                        <span aria-live="polite" className="tabular-nums text-center" style={{ minWidth: 20, fontWeight: 800 }}>
                          {rp.interval}
                        </span>
                        <button type="button" aria-label="More weeks" disabled={rp.interval >= 4} onClick={() => update({ repeat: { ...rp, interval: rp.interval + 1 } })} className="tap h-full flex items-center justify-center disabled:opacity-30" style={{ width: 34, color: c.pDark }}>
                          <Plus size={14} strokeWidth={2.4} />
                        </button>
                      </span>
                      <span>{rp.interval === 1 ? "week" : "weeks"}</span>
                    </div>
                  )}
                  {rp.kind !== "daily" && (
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: textPx(11), fontWeight: 700, color: c.faint }}>On</p>
                      <div role="group" aria-label="Repeat on" className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
                        {DAY_LETTERS.map((t, i) => {
                          const w = i + 1;
                          const on = rp.weekdays.includes(w);
                          return (
                            <button
                              key={w}
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              aria-label={DAY_LONG[i]}
                              onClick={() => toggleDay(w)}
                              className="tap flex items-center justify-center"
                              style={{
                                aspectRatio: "1",
                                maxHeight: 40,
                                minHeight: 34,
                                borderRadius: 10,
                                fontSize: textPx(12.5),
                                fontWeight: on ? 800 : 600,
                                background: on ? (c.dark ? "#A991FE" : "#AB9ED7") : c.soft,
                                // AN3-043 row 4: white on #AB9ED7 · #A991FE (ClassFlowsV6 `ink`), both modes.
                                color: on ? "#FFFFFF" : c.inkSoft,
                                border: `1px solid ${on ? (c.dark ? "#A991FE" : "#AB9ED7") : c.dark ? "#393C44" : c.inputBd}`,
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div role="radiogroup" aria-label="Ends">
                    <p style={{ margin: "0 0 4px", fontSize: textPx(11), fontWeight: 700, color: c.faint }}>Ends</p>
                    {(
                      [
                        ["never", "Never"],
                        ["date", "On a date"],
                        ["count", "After"],
                      ] as const
                    ).map(([k, t], i) => {
                      const on = rp.ends === k;
                      return (
                        <div key={k} className="flex items-center" style={{ gap: 10, minHeight: 44, borderTop: i ? `1px solid ${c.inputBd}` : "none" }}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              update({ repeat: { ...rp, ends: k, until: k === "date" && !rp.until ? addDays(form.date || today, 56) : rp.until } });
                              if (k === "date") setUntilOpen(true);
                              if (k === "count") window.setTimeout(() => countRef.current?.focus(), 30);
                            }}
                            className="tap flex flex-1 items-center text-left"
                            style={{ gap: 10, minHeight: 44 }}
                          >
                            <span className="shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${on ? c.pDark : c.tert}` }}>
                              <span style={{ width: 8, height: 8, borderRadius: 999, background: on ? c.pDark : "transparent" }} />
                            </span>
                            <span style={{ fontSize: textPx(13), fontWeight: on ? 700 : 500, color: c.ink }}>{t}</span>
                          </button>
                          {k === "date" && (
                            <button
                              type="button"
                              aria-label={rp.until ? `Last date, ${longDate(rp.until)}` : "Choose the last date"}
                              onClick={() => {
                                update({ repeat: { ...rp, ends: "date", until: rp.until || addDays(form.date || today, 56) } });
                                setUntilOpen(true);
                              }}
                              className="tap inline-flex items-center tabular-nums whitespace-nowrap"
                              style={{ height: 34, padding: "0 10px", borderRadius: 10, background: c.soft, border: `1px solid ${on ? c.pDark : c.inputBd}`, fontSize: textPx(12.5), fontWeight: 700, color: c.ink }}
                            >
                              {rp.until ? slashDate(rp.until) : "Choose"}
                            </button>
                          )}
                          {k === "count" && (
                            <span className="inline-flex items-center whitespace-nowrap" style={{ height: 34, padding: "0 10px", borderRadius: 10, background: c.soft, border: `1px solid ${on ? c.pDark : c.inputBd}`, gap: 4, fontSize: textPx(12.5), fontWeight: 700, color: c.ink }}>
                              <input
                                ref={countRef}
                                inputMode="numeric"
                                aria-label="Number of sessions"
                                value={rp.count}
                                onFocus={() => rp.ends !== "count" && update({ repeat: { ...rp, ends: "count" } })}
                                onChange={(e) => update({ repeat: { ...rp, ends: "count", count: e.target.value.replace(/\D/g, "").slice(0, 3) } })}
                                className="class-sheet-input bg-transparent text-right tabular-nums focus:outline-none"
                                style={{ width: 30, border: 0, fontWeight: 700, color: c.ink, fontSize: textPx(12.5) }}
                              />
                              sessions
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderRadius: 12, background: c.dark ? "rgba(169,145,254,0.10)" : "#F7F6FD", padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 700, lineHeight: linePx(17), color: c.ink }}>{repeatSummary(rule, form.startTime)}</p>
                    {nextLine(rule) && (
                      <p style={{ margin: "3px 0 0", fontSize: textPx(11), lineHeight: linePx(15), color: c.inkSoft }}>Next: {nextLine(rule)}</p>
                    )}
                  </div>
                </div>
              )}
              {errLine(repeatErr ?? undefined, `${uid}-repeat`)}
            </div>
          )}
          {mode === "edit" && scope === "future" && series && (
            <div>
              {label("Repeat")}
              <div role="group" aria-label={`Repeat, ${repeatSummary(series, series.startTime)}`} style={fieldBox(false, { justifyContent: "flex-start", height: "auto", minHeight: 40, padding: "9px 12px" })}>
                <Repeat size={15} strokeWidth={1.9} style={{ color: c.faint }} className="shrink-0" aria-hidden />
                <span className="flex-1 min-w-0" style={{ lineHeight: linePx(20) }}>{repeatSummary(series, series.startTime)}</span>
              </div>
            </div>
          )}

          {/* Capacity + price */}
          <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <div className="min-w-0" ref={(el) => void (fieldRefs.current.capacity = el)} style={{ scrollMarginTop: 20 }}>
              {label("Max capacity", `${uid}-cap`)}
              <div
                className="grid items-center"
                style={{
                  gridTemplateColumns: "40px minmax(0,1fr) 40px",
                  height: 40,
                  borderRadius: 12,
                  background: c.soft,
                  border: `${capFocus || capInvalid ? 1.5 : 1}px solid ${capInvalid ? c.high : capFocus ? c.pDark : c.inputBd}`,
                  boxShadow: capInvalid && capFocus ? "0 0 0 3px rgba(192,57,43,0.14)" : capFocus ? c.focusRing : "none",
                }}
              >
                <button
                  type="button"
                  aria-label="Fewer spots"
                  disabled={capNum !== null && capNum <= capFloor}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={() => startRepeat(-1)}
                  onClick={() => stepClick(-1)}
                  className="tap h-full flex items-center justify-center disabled:opacity-30"
                  style={{ color: c.pDark }}
                >
                  <Minus size={15} strokeWidth={2.4} />
                </button>
                <input
                  id={`${uid}-cap`}
                  role="spinbutton"
                  inputMode="numeric"
                  aria-label="Max capacity"
                  aria-valuemin={capFloor}
                  aria-valuemax={CAPACITY_MAX}
                  aria-valuenow={capNum ?? undefined}
                  aria-invalid={capInvalid || undefined}
                  aria-describedby={capHelp ? `${uid}-cap-help` : undefined}
                  value={form.capacity}
                  onFocus={() => setCapFocus("focus")}
                  onBlur={() => {
                    setCapFocus(null);
                    if (form.capacity.trim() === "") update({ capacity: lastValidCap });
                    else if (capNum !== null && capNum >= capFloor && capNum <= CAPACITY_MAX) setLastValidCap(String(capNum));
                  }}
                  onChange={(e) => {
                    setCapFocus("typing");
                    update({ capacity: e.target.value.slice(0, 4) });
                  }}
                  className="class-sheet-input w-full min-w-0 bg-transparent text-center tabular-nums focus:outline-none"
                  style={{ fontSize: textPx(14), fontWeight: 700, color: c.ink, caretColor: c.pDark, border: 0 }}
                />
                <button
                  type="button"
                  aria-label="More spots"
                  disabled={capNum !== null && capNum >= CAPACITY_MAX}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={() => startRepeat(1)}
                  onClick={() => stepClick(1)}
                  className="tap h-full flex items-center justify-center disabled:opacity-30"
                  style={{ color: c.pDark }}
                >
                  <Plus size={15} strokeWidth={2.4} />
                </button>
              </div>
              {capHelp && (
                <span id={`${uid}-cap-help`} className="block" style={{ marginTop: 6, fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: capHelp.ink }}>
                  {capHelp.text}
                </span>
              )}
            </div>
            <div className="min-w-0" ref={(el) => void (fieldRefs.current.price = el)} style={{ scrollMarginTop: 20 }}>
              {label("Price", `${uid}-price`)}
              <div style={fieldBox(!!errors.price, { justifyContent: "flex-start" })}>
                <span aria-hidden style={{ fontSize: textPx(14), fontWeight: 700, color: c.faint }}>
                  $
                </span>
                <input
                  id={`${uid}-price`}
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => update({ price: e.target.value.slice(0, 10) })}
                  placeholder="0"
                  aria-invalid={!!errors.price || undefined}
                  aria-describedby={errors.price ? `${uid}-price-err` : undefined}
                  className="class-sheet-input flex-1 min-w-0 bg-transparent tabular-nums focus:outline-none"
                  style={{ fontSize: textPx(14), color: c.ink, caretColor: c.pDark, border: 0 }}
                />
              </div>
              {errLine(errors.price, `${uid}-price-err`)}
            </div>
          </div>

          {/* Run by (AN3-022 / 024) */}
          <div ref={setRunGroupEl} className="relative">
            {label("Run by")}
            <button
              ref={setRunEl}
              type="button"
              aria-haspopup="menu"
              aria-expanded={runOpen}
              aria-label={runName ? `Run by, ${runName}` : "Run by, not chosen"}
              onClick={() => setRunOpen(true)}
              className="tap text-left"
              style={fieldBox(false)}
            >
              <span className="flex items-center min-w-0" style={{ gap: 8 }}>
                {runName && <Avatar c={c} name={runName} size={24} />}
                <span className="truncate" style={{ color: runName ? c.ink : c.faint }}>
                  {!instructorsLoaded ? "Loading your team…" : runName || (instructors.length === 0 ? "No employees yet" : "Choose who runs it")}
                </span>
              </span>
              <ChevronDown size={14} style={{ color: c.faint }} className="shrink-0" />
            </button>
            {runOpen && instructorsLoaded && instructors.length === 0 && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setRunOpen(false)} aria-hidden />
                <div
                  role="dialog"
                  aria-label="Run by"
                  className="absolute left-0 right-0 z-[6]"
                  style={{ bottom: "calc(100% + 6px)", background: c.card, border: `1px solid ${c.menuBd}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 8 }}
                >
                  <p style={{ margin: "2px 4px 8px", fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint }}>Run by</p>
                  <div style={{ padding: "6px 6px 4px" }}>
                    <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 700, lineHeight: linePx(17), color: c.ink }}>No employees yet</p>
                    <p style={{ margin: "2px 0 0", fontSize: textPx(11), lineHeight: linePx(15), color: c.faint }}>Classes need someone to run them. Add a professional by business ID.</p>
                    <button
                      type="button"
                      onClick={() => onAddEmployee(form)}
                      className="tap inline-flex items-center"
                      style={{ marginTop: 10, gap: 4, fontSize: textPx(12), fontWeight: 800, color: c.pDark, minHeight: 32 }}
                    >
                      Add an employee
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Payment type: single mode (AN3-028) */}
          <div>
            {label("Payment type")}
            <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 700, lineHeight: linePx(20), color: c.ink }}>Cash</p>
            <p style={{ margin: "2px 0 0", fontSize: textPx(11), lineHeight: linePx(15), color: c.faint }}>The only payment method turned on in your settings.</p>
          </div>

          {/* Notes: the live field, kept (AN3-010 K1) */}
          <div>
            {label("Notes for the instructor (optional)", `${uid}-notes`)}
            <textarea
              id={`${uid}-notes`}
              value={form.notes}
              maxLength={300}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Anything they should know before the class"
              rows={3}
              className="class-sheet-input block w-full resize-none focus:outline-none"
              style={{
                minHeight: 76,
                borderRadius: 12,
                background: c.soft,
                border: `1px solid ${c.inputBd}`,
                padding: "10px 12px",
                fontSize: textPx(14),
                lineHeight: linePx(20),
                color: c.ink,
                caretColor: c.pDark,
              }}
            />
          </div>

          {/* B13 MK-04: Show on Explore and the Centium spots. No class-sheet frame
              draws them: the words are MA1-003 row 7i / MA1-040's (OURS layout). */}
          <div className="flex flex-col" style={{ gap: 14, borderTop: `1px solid ${c.divider}`, paddingTop: 16 }} data-class-explore="">
            <div className="flex items-start" style={{ gap: 12 }}>
              <div className="flex-1 min-w-0">
                <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), color: c.ink }}>Show on Explore</p>
                <p style={{ margin: "2px 0 0", fontSize: textPx(11.5), lineHeight: linePx(15), color: c.faint }}>
                  {form.listedOnExplore ? "New clients can find and book this class on Centium." : "Members only. It's off Explore, and members can still book it."}
                </p>
              </div>
              <Toggle size="business" checked={form.listedOnExplore} onChange={(on) => update({ listedOnExplore: on })} label={`Show ${form.title.trim() || "this class"} on Explore`} />
            </div>
            {form.listedOnExplore && (
              <div>
                {label("Spots open on Centium")}
                <div className="grid items-center" style={{ gridTemplateColumns: "40px minmax(0,1fr) 40px", height: 40, borderRadius: 12, background: c.soft, border: `1px solid ${c.inputBd}` }}>
                  <button
                    type="button"
                    aria-label="Fewer"
                    disabled={exploreSpots === 0}
                    onClick={() => update({ centiumSpots: exploreSpots === null ? exploreCap : Math.max(0, exploreSpots - 1) })}
                    className="tap h-full flex items-center justify-center disabled:opacity-30"
                    style={{ color: c.pDark }}
                  >
                    <Minus size={15} strokeWidth={2.4} />
                  </button>
                  <span role="status" aria-label={exploreSpots === null ? "All free spots open on Centium" : `${exploreSpots} spots open on Centium`} className="text-center tabular-nums" style={{ fontSize: textPx(14), fontWeight: 700, color: c.ink }}>
                    {exploreSpots === null ? "All free spots" : exploreSpots}
                  </span>
                  <button
                    type="button"
                    aria-label="More"
                    disabled={exploreSpots === null}
                    onClick={() => update({ centiumSpots: exploreSpots !== null && exploreSpots < exploreCap ? exploreSpots + 1 : null })}
                    className="tap h-full flex items-center justify-center disabled:opacity-30"
                    style={{ color: c.pDark }}
                  >
                    <Plus size={15} strokeWidth={2.4} />
                  </button>
                </div>
                <span className="block" style={{ marginTop: 6, fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: c.faint }}>
                  All the places people from Centium can take, including ones already booked. Members can always book any free spot.
                </span>
              </div>
            )}
          </div>

          {/* B9 EX-01: what the class page shows (OURS layout and strings; no business frame). */}
          <div className="flex flex-col" style={{ gap: 16, borderTop: `1px solid ${c.divider}`, paddingTop: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), color: c.ink }}>On the class page</p>
              <p style={{ margin: "2px 0 0", fontSize: textPx(11.5), lineHeight: linePx(15), color: c.faint }}>Optional. {people === "clients" ? "Clients" : "Members"} see these on Explore.</p>
            </div>
            <div>
              {label("Cover photo")}
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void pickCover(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {form.coverUrl ? (
                <div className="relative overflow-hidden" style={{ borderRadius: 14, border: `1px solid ${c.inputBd}`, aspectRatio: "16 / 9", background: c.soft }}>
                  <img src={form.coverUrl} alt="Class cover" className="w-full h-full object-cover" />
                  <div className="absolute flex" style={{ right: 8, bottom: 8, gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => coverInput.current?.click()}
                      disabled={coverBusy}
                      className="tap inline-flex items-center"
                      style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, background: "rgba(36,31,27,0.72)", color: "#FFFFFF", fontSize: textPx(12), fontWeight: 800 }}
                    >
                      {coverBusy ? "Uploading…" : "Change"}
                    </button>
                    <button
                      type="button"
                      aria-label="Remove the cover photo"
                      onClick={() => update({ coverUrl: "" })}
                      disabled={coverBusy}
                      className="tap inline-flex items-center justify-center"
                      style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(36,31,27,0.72)", color: "#FFFFFF" }}
                    >
                      <X size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={coverBusy || !onUploadCover}
                  className="tap w-full flex items-center justify-center disabled:opacity-60"
                  style={{ minHeight: 64, gap: 8, borderRadius: 14, border: `1px dashed ${c.hc ? c.border : c.tert}`, background: c.soft, fontSize: textPx(13), fontWeight: 700, color: c.pDark }}
                >
                  <ImagePlus size={17} strokeWidth={2} aria-hidden />
                  {coverBusy ? "Uploading…" : "Add a cover photo"}
                </button>
              )}
              <span className="block" style={{ marginTop: 6, fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: coverErr ? c.high : c.faint }}>
                {coverErr ?? "JPEG, PNG or WebP, up to 5 MB."}
              </span>
            </div>
            <div>
              {label("About this class", `${uid}-about`)}
              <textarea
                id={`${uid}-about`}
                value={form.about}
                maxLength={ABOUT_MAX}
                onChange={(e) => update({ about: e.target.value })}
                placeholder="What it's like and who it's for"
                rows={3}
                className="class-sheet-input block w-full resize-none focus:outline-none"
                style={{ minHeight: 76, borderRadius: 12, background: c.soft, border: `1px solid ${c.inputBd}`, padding: "10px 12px", fontSize: textPx(14), lineHeight: linePx(20), color: c.ink, caretColor: c.pDark }}
              />
            </div>
            <div className="relative">
              {label("Level")}
              <button
                ref={setLevelEl}
                type="button"
                aria-haspopup="menu"
                aria-expanded={levelOpen}
                aria-label={levelLabel ? `Level, ${levelLabel}` : "Level, not chosen"}
                onClick={() => setLevelOpen(true)}
                className="tap text-left"
                style={fieldBox(false)}
              >
                <span className="truncate" style={{ color: levelLabel ? c.ink : c.faint }}>
                  {levelLabel || "Not set"}
                </span>
                <ChevronDown size={14} style={{ color: c.faint }} className="shrink-0" />
              </button>
            </div>
            <div>
              {label("What to bring", `${uid}-bring`)}
              {form.bring.length > 0 && (
                <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 8 }}>
                  {form.bring.map((b) => (
                    <span key={b} className="inline-flex items-center" style={{ minHeight: 32, gap: 2, padding: "0 4px 0 10px", borderRadius: 999, background: c.pale, color: c.pDark, fontSize: textPx(12), fontWeight: 700 }}>
                      {b}
                      <button type="button" aria-label={`Remove ${b}`} onClick={() => update({ bring: form.bring.filter((x) => x !== b) })} className="tap inline-flex items-center justify-center" style={{ width: 28, height: 28 }}>
                        <X size={13} strokeWidth={2.6} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {form.bring.length < BRING_MAX_ITEMS && (
                <div className="flex" style={{ gap: 8 }}>
                  <input
                    id={`${uid}-bring`}
                    value={bringDraft}
                    maxLength={BRING_MAX_CHARS}
                    onChange={(e) => setBringDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBring();
                      }
                    }}
                    placeholder="e.g. Water bottle"
                    className="class-sheet-input min-w-0 flex-1 focus:outline-none"
                    style={{ ...fieldBox(false), caretColor: c.pDark }}
                  />
                  <button
                    type="button"
                    onClick={addBring}
                    disabled={!bringDraft.trim()}
                    className="tap shrink-0 disabled:opacity-45"
                    style={{ height: 40, padding: "0 14px", borderRadius: 12, border: `1px solid ${c.border}`, fontSize: textPx(12.5), fontWeight: 800, color: c.pDark }}
                  >
                    Add
                  </button>
                </div>
              )}
              <span className="block" style={{ marginTop: 6, fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: c.faint }}>
                Up to {BRING_MAX_ITEMS} items.
              </span>
            </div>
          </div>
        </div>
        <style>{`.class-sheet-input::placeholder { color: ${c.hc ? "rgb(var(--c-charcoal-soft))" : "rgb(var(--c-charcoal-faint))"}; opacity: 1; }`}</style>
      </BottomSheet>

      <PopupMenu
        open={typeOpen}
        onClose={() => setTypeOpen(false)}
        anchor={typeEl}
        options={typeOptions}
        selected={form.classType || null}
        onSelect={(v) => {
          update({ classType: v });
          setTypeOpen(false);
          typeEl?.focus();
        }}
        heading="Class type"
        align="left"
        width={182}
      />
      <PopupMenu
        open={runOpen && (instructors.length > 0 || !instructorsLoaded)}
        onClose={() => setRunOpen(false)}
        anchor={runEl}
        matchWidth={runGroupEl}
        options={runOptions}
        emptyNote={
          // AN3-022 O1: while the team loads, 2 skeleton rows (24 circle + 80×10 bar).
          !instructorsLoaded ? (
            <div aria-busy="true" aria-label="Loading your team">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center" style={{ gap: 9, padding: "9px 10px", marginTop: i ? 6 : 0 }}>
                  <span aria-hidden style={{ width: 24, height: 24, borderRadius: 999, background: c.soft }} />
                  <span aria-hidden style={{ width: 80, height: 10, borderRadius: 999, background: c.soft }} />
                </div>
              ))}
            </div>
          ) : undefined
        }
        selected={form.professionalId || null}
        clampTo={bodyEl?.parentElement ?? null}
        onSelect={(v) => {
          update({ professionalId: v === NO_ONE ? "" : v });
          setRunOpen(false);
          runEl?.focus();
        }}
        heading="Run by"
        backdrop={false}
      />
      <PopupMenu
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        anchor={repeatEl}
        matchWidth={repeatGroupEl}
        options={REPEAT_ORDER.map((k) => ({ value: k, label: REPEAT_LABEL[k] }))}
        selected={rp.kind}
        onSelect={(v) => {
          pickRepeat(v as RepeatKind);
          setRepeatOpen(false);
          repeatEl?.focus();
        }}
        heading="Repeat"
        backdrop={false}
      />
      <PopupMenu
        open={levelOpen}
        onClose={() => setLevelOpen(false)}
        anchor={levelEl}
        options={[...CLASS_LEVELS.map((l) => ({ value: l.value as string, label: l.label })), { value: "", label: "Not set" }]}
        selected={form.level}
        clampTo={bodyEl?.parentElement ?? null}
        onSelect={(v) => {
          update({ level: v as ClassForm["level"] });
          setLevelOpen(false);
          levelEl?.focus();
        }}
        heading="Level"
        align="left"
        width={200}
      />
      <CalendarPickerSheet
        open={untilOpen}
        onClose={() => setUntilOpen(false)}
        selectedDate={rp.until || form.date}
        today={today}
        minDate={form.date || today}
        title="Date"
        dayInk="ink"
        onSelect={(d) => {
          update({ repeat: { ...rp, ends: "date", until: d } });
          setUntilOpen(false);
        }}
      />
      <CalendarPickerSheet
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        selectedDate={form.date}
        today={today}
        minDate={mode === "create" ? today : undefined}
        title="Date"
        dayInk="ink"
        onSelect={(d) => {
          update({ date: d });
          setDateOpen(false);
        }}
      />
      {/* AN3-066 (+ O1 / O2 / O3). B9: the server refuses any clash (ATXD9),
          so the confirm is "Choose someone else" (opens Run by), not "Save anyway". */}
      <ConfirmCard
        open={!!conflict}
        layout="decision"
        title={
          conflict
            ? conflict.dates > 1
              ? `${nameOf(form.professionalId) || "This instructor"} is already teaching at ${conflict.dates} of these times`
              : `${nameOf(form.professionalId) || "This instructor"} is already teaching then`
            : ""
        }
        subtitle={
          conflict
            ? conflict.elsewhere
              ? conflict.elsewhere
              : conflict.dates > 1
                ? `First: ${conflict.hits[0].title}, ${shortDay(conflict.hits[0].date)}, ${time12(conflict.hits[0].startTime)} to ${time12(conflict.hits[0].endTime)}. Choose someone else or another time.`
                : conflict.hits.length === 1
                  ? `${conflict.hits[0].title}, ${shortDate(conflict.hits[0].date)}, ${time12(conflict.hits[0].startTime)} to ${time12(conflict.hits[0].endTime)}, overlaps this class. Choose someone else or another time.`
                  : `${conflict.hits[0].title} and ${conflict.hits.length - 1} more overlap this class. Choose someone else or another time.`
            : undefined
        }
        cancelLabel="Change time"
        confirmLabel="Choose someone else"
        onCancel={() => {
          setConflict(null);
          fieldRefs.current.times?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
          window.setTimeout(() => startRef.current?.focus({ preventScroll: true }), 50);
        }}
        onConfirm={() => {
          setConflict(null);
          runGroupEl?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          window.setTimeout(() => setRunOpen(true), reduced ? 0 : 250);
        }}
      />
      <ConfirmCard
        open={discardOpen}
        layout="decision"
        tone="destructive"
        title={mode === "edit" ? "Discard your changes?" : "Discard this class?"}
        subtitle={mode === "edit" ? "You haven't saved them yet. Your changes will be lost." : "You haven't saved it yet. Everything you entered will be lost."}
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        confirmStyle={{ background: c.dark ? "#E0786A" : "#C0392B", color: c.dark ? "#0D0B1A" : "#FFFFFF" }}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}

function fieldsBanner(e: Partial<Record<ClassField, string>>): string {
  const words = FIELD_ORDER.filter((k) => e[k]).map((k) => FIELD_WORD[k]);
  return `Fix ${words.length} ${words.length === 1 ? "field" : "fields"} to save: ${joinAnd(words)}.`;
}

export const Avatar: React.FC<{ c: OpsColors; name: string; size: number }> = ({ c, name, size }) => (
  <span
    aria-hidden
    className="shrink-0 inline-flex items-center justify-center"
    style={{ width: size, height: size, borderRadius: 999, background: c.tealPale, color: c.tealInk, fontSize: textPx(size >= 34 ? 12 : 11), fontWeight: 800 }}
  >
    {initialOf(name)}
  </span>
);

/** ClassFlowsV6's saving spinner, rotated in CSS so Reduce motion can stop it (AN3-051 row 2). */
const Spinner: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="relative block" style={{ animation: reduced ? undefined : "class-spin .9s linear infinite" }}>
    <style>{`@keyframes class-spin { to { transform: rotate(360deg) } }`}</style>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
    <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

