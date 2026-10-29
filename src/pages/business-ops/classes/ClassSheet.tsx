import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Calendar as CalendarIcon, ChevronDown, Clock, ImagePlus, Minus, Plus, RotateCw, WifiOff, X } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
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
  slashDate,
  type RepeatRule,
} from "../../../services/business-classes/scheduleRules";
import { prepareClassCover, type SeriesRow } from "../../../services/business-classes/schedule";
import { ImageApprovalBadge, ImageApprovalNote, useOwnImage } from "../../../components/moderation/ImageApproval";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type { MarketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
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
import { BoardSwitch, FieldBox, fieldStyle, useMarketColours } from "./parts";
import { normalisePrice, repeatProblem, ruleOf, type ClassForm, type RepeatKind } from "./classForm";
import { InstructorPicker } from "./InstructorPicker";
import { useClassTeam } from "./useClassTeam";
import { NO_INSTRUCTOR, busyDayOf, clashBody, clashRows, clashTitle, firstNameOf, livePeople, teamPeople, type ClashBusy, type ClashClass, type PickerPerson } from "./instructorTeam";
import { CentredDialog } from "../../business-market/listingParts";
import { HIRING_ERROR_TEXT } from "../../../services/hiring/model";
import { conflictsFor, durationMinutes, durationOptions, everyText, initialOf, isLegacyType, joinAnd, longDate, mondayOf, addDays, running, type SessionLite } from "./scheduleModel";

// Market + Share 3.0 · B-MA.6 Add or edit a class (Business Marketplace
// Screens `classEdit`, markup lines 409–427, script `classFields`; HANDOVER
// §4 "Bottom sheets"). The MasterBottomSheet (the app's BottomSheet defaults:
// band #F0EEFD, 1px #7248F8, radius 32, 53 title bar 20 / 800, 26 close ring;
// body --sbody radius 22 padding 20; pinned footer padding 8 20 34 under a 1px
// --srule) with the fields grid: two columns, gap 10, of --sgrey boxes
// (radius 14, padding 12 14; label 13 / 500 --slabel 8 above a --sfield field
// radius 10 padding 11 13, 14 / 19): Name (span 2), Type, Instructor, Date,
// Time, Duration, Capacity, Price, Repeat; CTA "Save class" (50, radius 16,
// --fill, 15 / 700 --onfill).
//
// Instructor (W4, B-MA.6 `classEdit` "Instructor · from Team"): the field
// opens the InstructorPicker sheet (Business Hiring Screens `instrPicker` /
// `instrNoTeam`). Its rows are the Team (my_team, DB8) once it answers, and
// until then the live instructors (accepted business_employees,
// fetchInstructors; D-35 backfills them as existing_team members). "Go to
// Hiring" / "Post an opening" park the draft and open Hiring. The server's
// Team check (Database #38: save_class_series / edit_class name only a Team
// professional, business_team_professional, ATX76) shows under the field.
//
// KEPT live (PLAN §3.4), in the sheet's chrome, as span-2 boxes under the
// drawn grid: the Repeat editor (Daily / Weekly / Every 2 weeks / Custom every
// N weeks, the "On" days Monday first, Ends never / on a date / after N, the
// summary and "Next:"), "only this / all future" scope (the series' rule read
// only; the date locked), the field-error banner and per-field errors, the
// moved-class line, the capacity hints and floor, Show on Explore and the
// spots open on Centium (B13 MK-04, the old Spots tab), notes for the
// instructor, and the class page's cover photo, about, level and what to
// bring (B9 EX-01; Round C Release 2: a picked cover is kept here, shown from
// the device, and sent for approval by the page once the class or series is
// saved, with the pending or refused one's badge and note when editing). The
// instructor clash is the board's CentredDialog
// `assignConflict` ("{first} has a clash", busy times only): the server
// refuses any clash (ATXD9), so the board's "Assign anyway" can't exist; its
// actions are "Go back" (to the Time field, the live "Change time") and the
// live "Choose someone else" (opens the picker). Closing an edited sheet asks
// first. Time + Duration are the live start / end: the end follows
// the start, keeping the length.

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];
const FIELD_ORDER: ClassField[] = ["name", "date", "times", "capacity", "price"];
const FIELD_WORD: Record<ClassField, string> = { name: "name", date: "date", times: "times", capacity: "capacity", price: "price" };

/** How much bigger the sheet's 14 px field text is drawn than its spec (Larger text boost × root scaling). */
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
  /** The session being edited. */
  editing?: BusinessClassRow | null;
  /** Booked count of the session being edited (capacity floor). */
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
  /** `rule` is the repeat a new class asks for (null: one class); `cover` a newly picked cover photo, sent for approval after the save. */
  onSave: (draft: ClassDraft, rule: RepeatRule | null, cover: File | null) => Promise<{ ok: true } | { ok: false; message: string; code?: "capacity" | "permission" | "busy" }>;
  /** The business the class belongs to: the Team (my_team) is read for it. */
  businessId?: string | null;
  /** The picker's "Go to Hiring" / "Post an opening": leave for Hiring with the draft kept. */
  onGoToHiring: (form: ClassForm) => void;
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
  return <SheetBody key={epoch} {...props} open={open} mode={mode} initial={initial} onClose={onClose} />;
}

function SheetBody({
  open,
  mode,
  scope = "this",
  series,
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
  businessId,
  onGoToHiring,
}: ClassSheetProps) {
  const m = useMarketColours();
  const reduced = useReducedMotion();
  const uid = useId();
  const [form, setForm] = useState<ClassForm>(initial);
  const [errors, setErrors] = useState<Partial<Record<ClassField, string>>>({});
  const [checked, setChecked] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  // ATX76 (the server's Team-only rule), under the Instructor field.
  const [instrErr, setInstrErr] = useState<string | null>(null);
  const [durOpen, setDurOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflict, setConflict] = useState<{ hits: SessionLite[]; dates: number; elsewhere?: string } | null>(null);
  // my_team (Database Release 2); `pending` (a stack without it) keeps the live instructors.
  const [team, retryTeam] = useClassTeam(businessId, open);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [untilOpen, setUntilOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [repeatErr, setRepeatErr] = useState<string | null>(null);
  const [bringDraft, setBringDraft] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState<string | null>(null);
  // A newly picked cover (prepared, on this device until Save) and its preview.
  const [coverPick, setCoverPick] = useState<{ file: File; preview: string } | null>(null);
  // Remove also hides a pending cover in this sheet (it can't be taken back).
  const [coverCleared, setCoverCleared] = useState(false);
  // The owner's pending or refused cover: the series' for a `future` edit, else the class's.
  const coverOf = mode === "edit" && scope === "future" && editing?.seriesId ? { surface: "class_series_cover" as const, id: editing.seriesId } : { surface: "class_cover" as const, id: mode === "edit" ? editing?.id ?? null : null };
  const { image: ownCover } = useOwnImage(coverOf.surface, coverOf.id);
  useEffect(() => () => {
    if (coverPick) URL.revokeObjectURL(coverPick.preview);
  }, [coverPick]);
  const [repeatEl, setRepeatEl] = useState<HTMLButtonElement | null>(null);
  const [repeatGroupEl, setRepeatGroupEl] = useState<HTMLDivElement | null>(null);
  const [levelEl, setLevelEl] = useState<HTMLButtonElement | null>(null);
  const [durEl, setDurEl] = useState<HTMLButtonElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);
  const countRef = useRef<HTMLInputElement | null>(null);
  const [capFocus, setCapFocus] = useState<"focus" | "typing" | null>(null);
  const [lastValidCap, setLastValidCap] = useState(initial.capacity);
  // OP1-147 A1: above 1.3x text the two-column grid stacks to one column.
  const [stack] = useState(() => textScale() > 1.3);
  // The client id for this sheet's insert: a Retry re-sends the same one (AN3-068 S1).
  const clientId = useMemo(() => (mode === "create" ? crypto.randomUUID() : undefined), [mode]);

  // Menu anchors as state (read while rendering the menus).
  const [typeEl, setTypeEl] = useState<HTMLButtonElement | null>(null);
  const runRef = useRef<HTMLButtonElement | null>(null);
  const [runGroupEl, setRunGroupEl] = useState<HTMLDivElement | null>(null);
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<ClassField, HTMLElement | null>>>({});
  const startRef = useRef<HTMLButtonElement | null>(null);

  const dirty = !!coverPick || JSON.stringify(form) !== JSON.stringify(initial);
  // B9: a booked class may move (members are told); only a series edit keeps
  // its date, which is where the series splits (edit_class 'future').
  const dateLocked = mode === "edit" && scope === "future";
  const moved = mode === "edit" && (form.date !== initial.date || form.startTime !== initial.startTime || form.endTime !== initial.endTime);
  const capFloor = mode === "edit" ? Math.max(CAPACITY_MIN, bookedCount) : CAPACITY_MIN;

  const capOf = (f: ClassForm) => (/^\d+$/.test(f.capacity.trim()) ? Number(f.capacity.trim()) : NaN);
  const draftOf = (f: ClassForm): ClassDraft => ({
    id: clientId,
    title: f.title,
    classType: f.classType,
    date: f.date,
    startTime: f.startTime,
    endTime: f.endTime,
    maxCapacity: capOf(f),
    professionalId: f.professionalId || undefined,
    notes: f.notes.trim() || undefined,
    price: normalisePrice(f.price) ?? "x",
    paymentType: f.paymentType,
    about: f.about.trim() || null,
    level: f.level || null,
    whatToBring: bringList(f.bring),
    // Only a removal is written; a new cover goes for approval (onSave's `cover`).
    coverUrl: initial.coverUrl && !f.coverUrl ? null : undefined,
    // B13 MK-04: never above the capacity (business_classes_centium_spots_ok).
    centiumSpots: f.centiumSpots === null ? null : Math.max(0, Math.min(f.centiumSpots, Number.isFinite(capOf(f)) ? capOf(f) : f.centiumSpots)),
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
    const r = await Promise.race([onSave(draftOf(form), mode === "create" ? ruleOf(form) : null, coverPick?.file ?? null), timeout]);
    setSaving(false);
    if (r.ok) return; // the page closes the sheet and shows the toast
    // ATX76, the Team-only instructor rule (scheduleRules maps it to the note's words).
    if (r.message === HIRING_ERROR_TEXT.instructor_not_on_team) {
      setInstrErr(r.message);
      runGroupEl?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      return;
    }
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
    setWheelOpen(false);
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

  const weekFrom = mondayOf(form.date || today);
  const weekTo = addDays(weekFrom, 6);
  const classesThisWeek = (id: string) => running(sessions as (SessionLite & { cancelled?: boolean })[]).filter((s) => s.professionalId === id && s.date >= weekFrom && s.date <= weekTo && s.id !== editing?.id).length;
  // The picker's rows: the Team once my_team answers, else the live instructors (D-35).
  const pickerPeople: PickerPerson[] = team.s === "team" ? teamPeople(team.team) : livePeople(instructors, classesThisWeek);
  const pickerLoading = team.s === "loading" || (team.s === "pending" && !instructorsLoaded);
  /** The full name in Team mode, else the live first name (the field and the clash dialog). */
  const nameOf = (id: string) => pickerPeople.find((p) => p.id === id)?.name ?? instructors.find((i) => i.professionalId === id)?.firstName ?? "";

  const typeOptions: PopupMenuOption<string>[] = [
    ...(isLegacyType(form.classType, CLASS_TYPES) ? [{ value: form.classType, label: form.classType, note: "Saved before this list" }] : []),
    ...CLASS_TYPES.map((t) => ({ value: t, label: t })),
  ];

  // The clash dialog's values (B-MA.6 `assignConflict`).
  const clashFirst = firstNameOf(nameOf(form.professionalId));
  const clashRule = mode === "create" ? ruleOf(form) : null;
  const clashClass: ClashClass = {
    title: form.title.trim(),
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    weekdays: clashRule ? clashRule.weekdays : mode === "edit" && scope === "future" && series ? series.weekdays : null,
  };
  const clashHit = conflict && !conflict.elsewhere ? conflict.hits[0] ?? null : null;
  const clashBusy: ClashBusy = clashHit
    ? { startTime: clashHit.startTime, endTime: clashHit.endTime, dayText: null }
    : { startTime: null, endTime: null, dayText: busyDayOf(conflict?.elsewhere) };

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
    if (!file) return;
    setCoverBusy(true);
    setCoverErr(null);
    const r = await prepareClassCover(file);
    setCoverBusy(false);
    if (r.ok) setCoverPick({ file: r.file, preview: URL.createObjectURL(r.file) });
    else setCoverErr(r.message);
  };
  // What the owner sees: a new pick, else their pending cover, else the approved one.
  const coverState = coverPick || coverCleared ? null : ownCover;
  const coverSrc = coverPick?.preview ?? (coverState?.status === "pending" ? coverState.url : null) ?? (form.coverUrl || null);

  const length = Math.max(5, minutesOf(form.endTime) - minutesOf(form.startTime));
  const setStart = (hhmm: string) => {
    // Ends follows, keeping the class length (EventComposeSheet rule, OP1-149 S2).
    update({ startTime: hhmm, endTime: fromMinutes(minutesOf(hhmm) + length) });
  };

  const capNum = /^\d+$/.test(form.capacity.trim()) ? Number(form.capacity.trim()) : null;
  const capInvalid = !!errors.capacity || (capFocus === "typing" && form.capacity.trim() !== "" && (capNum === null || capNum < capFloor || capNum > CAPACITY_MAX));
  const capHelp = (() => {
    if (errors.capacity) return null; // the error line shows instead
    if (!capFocus) return null;
    if (form.capacity.trim() !== "" && capNum === null) return { text: "Enter a whole number from 1 to 200.", ink: m.high };
    if (capNum !== null && capNum > CAPACITY_MAX) return { text: "Enter a whole number from 1 to 200.", ink: m.high };
    if (mode === "edit" && capNum !== null && capNum < bookedCount) return { text: `${bookedCount} spots are already booked. Capacity can't go below ${bookedCount}.`, ink: m.high };
    if (capNum === CAPACITY_MIN) return { text: "Minimum is 1 spot.", ink: m.faint };
    if (capNum === CAPACITY_MAX) return { text: "Maximum is 200 spots per class.", ink: m.faint };
    return { text: capFocus === "typing" ? "1 to 200 spots." : "Type a number or use − and +.", ink: m.faint };
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

  const parts = toParts(form.startTime);
  const setTime = (p: Partial<TimeParts>) => setStart(fromParts({ ...parts, ...p }));

  const runName = form.professionalId ? nameOf(form.professionalId) || (!instructorsLoaded || team.s === "loading" ? "" : "Unnamed") : "";
  const runText = runName || (form.professionalId ? "Loading…" : NO_INSTRUCTOR);
  const saveLabel = saving ? "Saving…" : failed ? "Retry" : "Save class";
  const ctaOff = blankUntouched || editUnchanged;
  const repeatText =
    mode === "create"
      ? rp.kind === "none"
        ? REPEAT_LABEL.none
        : rp.kind === "daily"
          ? "Daily"
          : everyText(rp.weekdays.length ? rp.weekdays : [isoWeekday(form.date)], rp.kind === "biweekly" ? 2 : rp.kind === "custom" ? rp.interval : 1)
      : scope === "future" && series
        ? everyText(series.weekdays, series.intervalWeeks)
        : series
          ? "Only this session"
          : REPEAT_LABEL.none;

  const footer = (
    <div>
      {banner && (
        <div role="alert" className="flex items-start" style={{ gap: 10, borderRadius: 14, padding: "12px 14px", background: m.highbg, color: m.high, marginBottom: 10 }}>
          {banner.kind === "fields" || banner.kind === "permission" ? (
            <AlertCircle size={16} strokeWidth={2.2} className="shrink-0" style={{ marginTop: 1 }} aria-hidden />
          ) : (
            <WifiOff size={16} strokeWidth={2.2} className="shrink-0" style={{ marginTop: 1 }} aria-hidden />
          )}
          <span style={{ fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600 }}>{banner.text}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={ctaOff}
        aria-busy={saving || undefined}
        aria-disabled={saving || undefined}
        aria-label={saving ? "Saving class" : failed ? "Retry saving the class" : undefined}
        className="market-focus relative w-full flex items-center justify-center"
        style={{ height: 50, borderRadius: 16, color: m.onfill, fontSize: textPx(15), fontWeight: 700, gap: 8, background: m.fill, border: 0, opacity: ctaOff ? 0.4 : saving ? 0.7 : 1 }}
      >
        {saving && <Spinner reduced={reduced} />}
        {failed && !saving && <RotateCw size={15} strokeWidth={2.4} aria-hidden />}
        <span>{saveLabel}</span>
      </button>
    </div>
  );

  const fieldCss = `.cs-field:focus-within{border-color:${m.fill}!important}.cs-field input::placeholder,.cs-field textarea::placeholder,.cs-in::placeholder{color:${m.faint};opacity:1}`;
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", padding: 0, fontSize: textPx(14), lineHeight: linePx(19), color: m.ink, caretColor: m.pdark };
  const chevron = <ChevronDown size={14} style={{ color: m.faint }} className="shrink-0" aria-hidden />;
  const valueText = (text: string, placeholder?: boolean) => (
    <span className="truncate" style={{ color: placeholder ? m.faint : m.ink }}>
      {text}
    </span>
  );

  return (
    <>
      <BottomSheet open={open} onClose={requestClose} title={mode === "edit" ? "Edit class" : "Add class"} footer={footer} footerRule animateExit closeOnScrim={false} maxHeightPct={90}>
        <style>{FOCUS_CSS + fieldCss}</style>
        <div
          ref={setBodyEl}
          role="form"
          aria-label={mode === "edit" ? "Edit class" : "Add class"}
          className="grid"
          style={{ gridTemplateColumns: stack ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 10, pointerEvents: saving ? "none" : undefined, lineHeight: "normal" }}
        >
          {/* classFields, in order: Name (span 2), Type, Instructor, Date, Time, Duration, Capacity, Price, Repeat. */}
          <FieldBox m={m} label="Name" htmlFor={`${uid}-name`} span={stack ? 1 : 2} error={errors.name} errorId={`${uid}-name-err`} boxRef={(el) => void (fieldRefs.current.name = el)}>
            <div className="cs-field" style={fieldStyle(m, { error: !!errors.name })}>
              <input
                id={`${uid}-name`}
                value={form.title}
                maxLength={60}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Morning HIIT"
                aria-invalid={!!errors.name || undefined}
                aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                style={inputStyle}
              />
            </div>
          </FieldBox>

          <FieldBox m={m} label="Type">
            <button
              ref={setTypeEl}
              type="button"
              aria-haspopup="menu"
              aria-expanded={typeOpen}
              aria-label={form.classType ? `Type, ${form.classType}` : "Type, not chosen"}
              onClick={() => setTypeOpen(true)}
              className="market-focus"
              style={fieldStyle(m, { active: typeOpen })}
            >
              {valueText(form.classType || "Choose", !form.classType)}
              {chevron}
            </button>
          </FieldBox>

          <FieldBox m={m} label="Instructor · from Team" boxRef={setRunGroupEl} error={instrErr} errorId={`${uid}-instr`}>
            <button
              ref={runRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={runOpen}
              aria-label={`Instructor from your Team, ${runText}`}
              aria-invalid={!!instrErr || undefined}
              aria-describedby={instrErr ? `${uid}-instr` : undefined}
              onClick={() => setRunOpen(true)}
              className="market-focus"
              style={fieldStyle(m, { active: runOpen, error: !!instrErr })}
            >
              {valueText(runText, !runName)}
              {chevron}
            </button>
          </FieldBox>

          <FieldBox
            m={m}
            label="Date"
            error={errors.date}
            errorId={`${uid}-date`}
            hint={dateLocked ? "The change starts from this date. Earlier sessions keep their details." : undefined}
            boxRef={(el) => void (fieldRefs.current.date = el)}
          >
            <button
              type="button"
              disabled={dateLocked}
              onClick={() => setDateOpen(true)}
              aria-label={`Date, ${longDate(form.date)}`}
              aria-invalid={!!errors.date || undefined}
              className="market-focus disabled:opacity-60"
              style={fieldStyle(m, { error: !!errors.date })}
            >
              {valueText(longDate(form.date))}
              <CalendarIcon size={15} strokeWidth={1.75} style={{ color: m.faint }} className="shrink-0" aria-hidden />
            </button>
          </FieldBox>

          <FieldBox m={m} label="Time" boxRef={(el) => void (fieldRefs.current.times = el)}>
            <button
              ref={startRef}
              type="button"
              onClick={() => setWheelOpen((o) => !o)}
              aria-expanded={wheelOpen}
              aria-label={`Time, ${time12(form.startTime)}`}
              className="market-focus"
              style={fieldStyle(m, { active: wheelOpen })}
            >
              <span className="tabular-nums truncate">{time12(form.startTime)}</span>
              <Clock size={15} strokeWidth={1.75} style={{ color: m.faint }} className="shrink-0" aria-hidden />
            </button>
          </FieldBox>

          {wheelOpen && (
            <div style={{ gridColumn: stack ? "span 1" : "span 2", background: m.sgrey, borderRadius: 14, padding: 6 }}>
              <WheelPicker
                band="business"
                columns={[
                  { label: "Hours", value: parts.hour, options: HOURS.map((h) => ({ value: h, label: String(h) })), onChange: (v) => setTime({ hour: Number(v) }) },
                  { label: "Minutes", value: parts.minute, options: minuteOptions(parts.minute).map((x) => ({ value: x, label: String(x).padStart(2, "0") })), onChange: (v) => setTime({ minute: Number(v) }) },
                  { label: "AM or PM", value: parts.meridiem, options: MERIDIEMS.map((x) => ({ value: x, label: x })), onChange: (v) => setTime({ meridiem: v as Meridiem }) },
                ]}
              />
              <button type="button" onClick={() => setWheelOpen(false)} className="market-focus w-full" style={{ minHeight: 44, fontSize: textPx(13), fontWeight: 800, color: m.pdark, background: "transparent", border: 0 }}>
                Done
              </button>
            </div>
          )}

          <FieldBox m={m} label="Duration" error={errors.times} errorId={`${uid}-times`}>
            <button
              ref={setDurEl}
              type="button"
              aria-haspopup="menu"
              aria-expanded={durOpen}
              aria-label={`Duration, ${durationMinutes(form.startTime, form.endTime)} minutes, ends ${time12(form.endTime)}`}
              aria-invalid={!!errors.times || undefined}
              onClick={() => setDurOpen(true)}
              className="market-focus"
              style={fieldStyle(m, { error: !!errors.times, active: durOpen })}
            >
              {valueText(`${durationMinutes(form.startTime, form.endTime)} min`)}
              {chevron}
            </button>
          </FieldBox>

          <FieldBox
            m={m}
            label="Capacity"
            htmlFor={`${uid}-cap`}
            error={errors.capacity}
            errorId={`${uid}-cap-help`}
            hint={capHelp ? <span style={{ color: capHelp.ink }}>{capHelp.text}</span> : undefined}
            boxRef={(el) => void (fieldRefs.current.capacity = el)}
          >
            <div className="cs-field" style={{ ...fieldStyle(m, { error: capInvalid }), padding: 0, gap: 0 }}>
              <button
                type="button"
                aria-label="Fewer spots"
                disabled={capNum !== null && capNum <= capFloor}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={() => startRepeat(-1)}
                onClick={() => stepClick(-1)}
                className="market-focus hit flex items-center justify-center disabled:opacity-30 shrink-0"
                style={{ width: 36, height: 39, color: m.pdark, background: "transparent", border: 0 }}
              >
                <Minus size={15} strokeWidth={2.4} aria-hidden />
              </button>
              <input
                id={`${uid}-cap`}
                role="spinbutton"
                inputMode="numeric"
                aria-valuemin={capFloor}
                aria-valuemax={CAPACITY_MAX}
                aria-valuenow={capNum ?? undefined}
                aria-invalid={capInvalid || undefined}
                aria-describedby={capHelp || errors.capacity ? `${uid}-cap-help` : undefined}
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
                className="tabular-nums"
                style={{ ...inputStyle, textAlign: "center", fontWeight: 400 }}
              />
              <button
                type="button"
                aria-label="More spots"
                disabled={capNum !== null && capNum >= CAPACITY_MAX}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={() => startRepeat(1)}
                onClick={() => stepClick(1)}
                className="market-focus hit flex items-center justify-center disabled:opacity-30 shrink-0"
                style={{ width: 36, height: 39, color: m.pdark, background: "transparent", border: 0 }}
              >
                <Plus size={15} strokeWidth={2.4} aria-hidden />
              </button>
            </div>
          </FieldBox>

          <FieldBox m={m} label="Price" htmlFor={`${uid}-price`} error={errors.price} errorId={`${uid}-price-err`} boxRef={(el) => void (fieldRefs.current.price = el)}>
            <div className="cs-field" style={{ ...fieldStyle(m, { error: !!errors.price }), justifyContent: "flex-start", gap: 2 }}>
              <span aria-hidden style={{ color: m.ink }}>$</span>
              <input
                id={`${uid}-price`}
                inputMode="decimal"
                value={form.price}
                onChange={(e) => update({ price: e.target.value.slice(0, 10) })}
                placeholder="0"
                aria-invalid={!!errors.price || undefined}
                aria-describedby={errors.price ? `${uid}-price-err` : undefined}
                aria-label="Price in dollars, paid in cash at the venue"
                className="tabular-nums"
                style={inputStyle}
              />
            </div>
          </FieldBox>

          <FieldBox m={m} label="Repeat" boxRef={setRepeatGroupEl} error={repeatErr} errorId={`${uid}-repeat`}>
            {mode === "create" ? (
              <button
                ref={setRepeatEl}
                type="button"
                aria-haspopup="menu"
                aria-expanded={repeatOpen}
                aria-label={`Repeat, ${repeatText}`}
                onClick={() => setRepeatOpen(true)}
                className="market-focus"
                style={fieldStyle(m, { active: repeatOpen })}
              >
                {valueText(repeatText)}
                {chevron}
              </button>
            ) : (
              <div role="group" aria-label={`Repeat, ${repeatText}${scope === "future" && series ? `. ${repeatSummary(series, series.startTime)}` : ""}`} style={{ ...fieldStyle(m), color: m.ink2 }}>
                <span className="truncate">{repeatText}</span>
              </div>
            )}
          </FieldBox>

          {/* The kept Repeat editor (AN3-041 … 048, B9 CL-01): new classes only. */}
          {mode === "create" && rp.kind !== "none" && rule && (
            <div className="flex flex-col" style={{ gridColumn: stack ? "span 1" : "span 2", background: m.sgrey, borderRadius: 14, padding: "12px 14px", gap: 12 }}>
              {rp.kind === "custom" && (
                <div className="flex items-center" style={{ gap: 8, fontSize: textPx(13), fontWeight: 600, color: m.ink }}>
                  <span>Every</span>
                  <span className="inline-flex items-center" style={{ height: 36, borderRadius: 10, background: m.card }}>
                    <button type="button" aria-label="Fewer weeks" disabled={rp.interval <= 1} onClick={() => update({ repeat: { ...rp, interval: rp.interval - 1 } })} className="market-focus hit h-full flex items-center justify-center disabled:opacity-30" style={{ width: 36, color: m.pdark, background: "transparent", border: 0 }}>
                      <Minus size={14} strokeWidth={2.4} aria-hidden />
                    </button>
                    <span aria-live="polite" className="tabular-nums text-center" style={{ minWidth: 20, fontWeight: 800 }}>
                      {rp.interval}
                    </span>
                    <button type="button" aria-label="More weeks" disabled={rp.interval >= 4} onClick={() => update({ repeat: { ...rp, interval: rp.interval + 1 } })} className="market-focus hit h-full flex items-center justify-center disabled:opacity-30" style={{ width: 36, color: m.pdark, background: "transparent", border: 0 }}>
                      <Plus size={14} strokeWidth={2.4} aria-hidden />
                    </button>
                  </span>
                  <span>{rp.interval === 1 ? "week" : "weeks"}</span>
                </div>
              )}
              {rp.kind !== "daily" && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>On</p>
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
                          className="market-focus hit flex items-center justify-center"
                          style={{ aspectRatio: "1", maxHeight: 40, minHeight: 34, borderRadius: 10, fontSize: textPx(12.5), fontWeight: on ? 800 : 600, background: on ? m.segactive : m.card, color: on ? m.onfill : m.ink2, border: 0 }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div role="radiogroup" aria-label="Ends">
                <p style={{ margin: "0 0 2px", fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>Ends</p>
                {(
                  [
                    ["never", "Never"],
                    ["date", "On a date"],
                    ["count", "After"],
                  ] as const
                ).map(([k, t], i) => {
                  const on = rp.ends === k;
                  return (
                    <div key={k} className="flex items-center" style={{ gap: 10, minHeight: 44, borderTop: i ? `0.5px solid ${m.div}` : 0 }}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          update({ repeat: { ...rp, ends: k, until: k === "date" && !rp.until ? addDays(form.date || today, 56) : rp.until } });
                          if (k === "date") setUntilOpen(true);
                          if (k === "count") window.setTimeout(() => countRef.current?.focus(), 30);
                        }}
                        className="market-focus flex flex-1 items-center text-left"
                        style={{ gap: 10, minHeight: 44, background: "transparent", border: 0 }}
                      >
                        <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: 999, border: `${on ? 6 : 1.5}px solid ${on ? m.segactive : m.border}`, background: m.card, boxSizing: "border-box" }} />
                        <span style={{ fontSize: textPx(13.5), fontWeight: on ? 700 : 500, color: m.ink }}>{t}</span>
                      </button>
                      {k === "date" && (
                        <button
                          type="button"
                          aria-label={rp.until ? `Last date, ${longDate(rp.until)}` : "Choose the last date"}
                          onClick={() => {
                            update({ repeat: { ...rp, ends: "date", until: rp.until || addDays(form.date || today, 56) } });
                            setUntilOpen(true);
                          }}
                          className="market-focus inline-flex items-center tabular-nums whitespace-nowrap"
                          style={{ height: 36, padding: "0 10px", borderRadius: 10, background: m.card, border: `1px solid ${on ? m.fill : "transparent"}`, fontSize: textPx(12.5), fontWeight: 700, color: m.ink }}
                        >
                          {rp.until ? slashDate(rp.until) : "Choose"}
                        </button>
                      )}
                      {k === "count" && (
                        <span className="cs-field inline-flex items-center whitespace-nowrap" style={{ height: 36, padding: "0 10px", borderRadius: 10, background: m.card, border: `1px solid ${on ? m.fill : "transparent"}`, gap: 4, fontSize: textPx(12.5), fontWeight: 700, color: m.ink }}>
                          <input
                            ref={countRef}
                            inputMode="numeric"
                            aria-label="Number of sessions"
                            value={rp.count}
                            onFocus={() => rp.ends !== "count" && update({ repeat: { ...rp, ends: "count" } })}
                            onChange={(e) => update({ repeat: { ...rp, ends: "count", count: e.target.value.replace(/\D/g, "").slice(0, 3) } })}
                            className="tabular-nums"
                            style={{ width: 30, border: 0, background: "transparent", outline: "none", textAlign: "right", fontWeight: 700, color: m.ink, fontSize: textPx(12.5) }}
                          />
                          sessions
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ borderRadius: 10, background: m.card, padding: "10px 12px" }}>
                <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 700, lineHeight: linePx(17), color: m.ink }}>{repeatSummary(rule, form.startTime)}</p>
                {nextLine(rule) && <p style={{ margin: "3px 0 0", fontSize: textPx(11), lineHeight: linePx(15), color: m.ink2 }}>Next: {nextLine(rule)}</p>}
              </div>
            </div>
          )}
          {mode === "edit" && scope === "future" && series && (
            <p style={{ gridColumn: stack ? "span 1" : "span 2", margin: 0, padding: "0 4px", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>
              {repeatSummary(series, series.startTime)}. The change applies to this session and every later one.
            </p>
          )}

          {/* OURS-AN3 A5: a booked class moved, its people are told. */}
          {moved && bookedCount > 0 && (
            <p style={{ gridColumn: stack ? "span 1" : "span 2", margin: 0, borderRadius: 14, background: m.sgrey, padding: "10px 14px", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
              {bookedCount} booked {bookedCount === 1 ? people.slice(0, -1) : people} {bookedCount === 1 ? "gets" : "get"} a message about the change.
            </p>
          )}

          {/* B13 MK-04 (the old Spots tab): Show on Explore and the spots open on Centium. */}
          <div data-class-explore="" style={{ gridColumn: stack ? "span 1" : "span 2", background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
            <div className="flex items-center" style={{ gap: 12 }}>
              <div className="flex-1 min-w-0">
                <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 700, color: m.ink }}>Show on Explore</p>
                <p style={{ margin: "2px 0 0", fontSize: textPx(11.5), lineHeight: linePx(15), color: m.faint }}>
                  {form.listedOnExplore ? "New clients can find and book this class on Centium." : "Members only. It's off Explore, and members can still book it."}
                </p>
              </div>
              <BoardSwitch m={m} checked={form.listedOnExplore} onChange={(on) => update({ listedOnExplore: on })} label={`Show ${form.title.trim() || "this class"} on Explore`} />
            </div>
            {form.listedOnExplore && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>Spots on Centium</p>
                <div style={{ ...fieldStyle(m), padding: 0, gap: 0 }}>
                  <button
                    type="button"
                    aria-label="Fewer spots on Centium"
                    disabled={exploreSpots === 0}
                    onClick={() => update({ centiumSpots: exploreSpots === null ? exploreCap : Math.max(0, exploreSpots - 1) })}
                    className="market-focus hit flex items-center justify-center disabled:opacity-30 shrink-0"
                    style={{ width: 40, height: 39, color: m.pdark, background: "transparent", border: 0 }}
                  >
                    <Minus size={15} strokeWidth={2.4} aria-hidden />
                  </button>
                  <span role="status" aria-label={exploreSpots === null ? "All free spots open on Centium" : `${exploreSpots} spots open on Centium`} className="flex-1 text-center tabular-nums" style={{ fontSize: textPx(14), color: m.ink }}>
                    {exploreSpots === null ? "All free spots" : exploreSpots}
                  </span>
                  <button
                    type="button"
                    aria-label="More spots on Centium"
                    disabled={exploreSpots === null}
                    onClick={() => update({ centiumSpots: exploreSpots !== null && exploreSpots < exploreCap ? exploreSpots + 1 : null })}
                    className="market-focus hit flex items-center justify-center disabled:opacity-30 shrink-0"
                    style={{ width: 40, height: 39, color: m.pdark, background: "transparent", border: 0 }}
                  >
                    <Plus size={15} strokeWidth={2.4} aria-hidden />
                  </button>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: m.faint }}>
                  All the places people from Centium can take, including ones already booked. Members can always book any free spot.
                </p>
              </div>
            )}
          </div>

          <FieldBox m={m} label="Notes for the instructor (optional)" htmlFor={`${uid}-notes`} span={stack ? 1 : 2}>
            <textarea
              id={`${uid}-notes`}
              value={form.notes}
              maxLength={300}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Anything they should know before the class"
              rows={3}
              className="cs-in block w-full resize-none market-focus"
              style={{ ...fieldStyle(m), display: "block", minHeight: 76, outline: "none" }}
            />
          </FieldBox>

          {/* B9 EX-01: what the class page shows (OURS layout and strings; no business frame). */}
          <div style={{ gridColumn: stack ? "span 1" : "span 2", padding: "6px 4px 0" }}>
            <p style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 800, color: m.ink }}>On the class page</p>
            <p style={{ margin: "2px 0 0", fontSize: textPx(11.5), lineHeight: linePx(15), color: m.faint }}>Optional. {people === "clients" ? "Clients" : "Members"} see these on Explore.</p>
          </div>
          <FieldBox m={m} label="Cover photo" span={stack ? 1 : 2} error={coverErr} hint={coverErr ? undefined : "JPEG, PNG or WebP, up to 5 MB."}>
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
            {coverSrc ? (
              <div className="relative overflow-hidden" style={{ borderRadius: 10, aspectRatio: "16 / 9", background: m.card }}>
                <img src={coverSrc} alt="Class cover" className="w-full h-full object-cover" />
                <ImageApprovalBadge state={coverState} className="absolute left-2 top-2" />
                <div className="absolute flex" style={{ right: 8, bottom: 8, gap: 6 }}>
                  <button type="button" onClick={() => coverInput.current?.click()} disabled={coverBusy} className="market-focus hit inline-flex items-center" style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, background: "rgba(36,31,27,0.72)", color: "#FFFFFF", fontSize: textPx(12), fontWeight: 800, border: 0 }}>
                    {coverBusy ? "Uploading…" : "Change"}
                  </button>
                  <button
                    type="button"
                    aria-label="Remove the cover photo"
                    onClick={() => {
                      setCoverPick(null);
                      setCoverCleared(true);
                      update({ coverUrl: "" });
                    }}
                    disabled={coverBusy}
                    className="market-focus hit inline-flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(36,31,27,0.72)", color: "#FFFFFF", border: 0 }}>
                    <X size={16} strokeWidth={2.4} aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={coverBusy}
                className="market-focus w-full flex items-center justify-center disabled:opacity-60"
                style={{ minHeight: 64, gap: 8, borderRadius: 10, border: `1.5px dashed ${m.border}`, background: m.card, fontSize: textPx(13), fontWeight: 700, color: m.pdark }}
              >
                <ImagePlus size={17} strokeWidth={2} aria-hidden />
                {coverBusy ? "Uploading…" : "Add a cover photo"}
              </button>
            )}
            {coverState && !coverSrc ? <ImageApprovalBadge state={coverState} className="mt-2" /> : null}
            <ImageApprovalNote state={coverState} className="mt-2" />
          </FieldBox>
          <FieldBox m={m} label="About this class" htmlFor={`${uid}-about`} span={stack ? 1 : 2}>
            <textarea
              id={`${uid}-about`}
              value={form.about}
              maxLength={ABOUT_MAX}
              onChange={(e) => update({ about: e.target.value })}
              placeholder="What it's like and who it's for"
              rows={3}
              className="cs-in block w-full resize-none market-focus"
              style={{ ...fieldStyle(m), display: "block", minHeight: 76, outline: "none" }}
            />
          </FieldBox>
          <FieldBox m={m} label="Level" span={stack ? 1 : 2}>
            <button
              ref={setLevelEl}
              type="button"
              aria-haspopup="menu"
              aria-expanded={levelOpen}
              aria-label={levelLabel ? `Level, ${levelLabel}` : "Level, not chosen"}
              onClick={() => setLevelOpen(true)}
              className="market-focus"
              style={fieldStyle(m, { active: levelOpen })}
            >
              {valueText(levelLabel || "Not set", !levelLabel)}
              {chevron}
            </button>
          </FieldBox>
          <FieldBox m={m} label="What to bring" htmlFor={`${uid}-bring`} span={stack ? 1 : 2} hint={`Up to ${BRING_MAX_ITEMS} items.`}>
            {form.bring.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 8 }}>
                {form.bring.map((b) => (
                  <span key={b} className="inline-flex items-center" style={{ minHeight: 32, gap: 2, padding: "0 4px 0 10px", borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(12), fontWeight: 700 }}>
                    {b}
                    <button type="button" aria-label={`Remove ${b}`} onClick={() => update({ bring: form.bring.filter((x) => x !== b) })} className="market-focus hit inline-flex items-center justify-center" style={{ width: 28, height: 28, background: "transparent", border: 0, color: m.pdark }}>
                      <X size={13} strokeWidth={2.6} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {form.bring.length < BRING_MAX_ITEMS && (
              <div className="flex" style={{ gap: 8 }}>
                <div className="cs-field flex-1 min-w-0" style={fieldStyle(m)}>
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
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  onClick={addBring}
                  disabled={!bringDraft.trim()}
                  className="market-focus shrink-0 disabled:opacity-40"
                  style={{ minHeight: 41, padding: "0 14px", borderRadius: 10, border: `1px solid ${m.border}`, fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, background: m.card }}
                >
                  Add
                </button>
              </div>
            )}
          </FieldBox>
        </div>
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
        heading="Type"
        align="left"
        width={182}
      />
      <InstructorPicker
        open={runOpen}
        people={pickerPeople}
        loading={pickerLoading}
        error={team.s === "error" ? { offline: team.offline } : null}
        selected={form.professionalId}
        onClose={() => setRunOpen(false)}
        onRetry={retryTeam}
        onDone={(id) => {
          if (id !== form.professionalId) {
            update({ professionalId: id });
            setInstrErr(null);
          }
          setRunOpen(false);
          window.setTimeout(() => runRef.current?.focus(), 0);
        }}
        onGoToHiring={() => {
          setRunOpen(false);
          onGoToHiring(form);
        }}
      />
      <PopupMenu
        open={durOpen}
        onClose={() => setDurOpen(false)}
        anchor={durEl}
        options={durationOptions(durationMinutes(form.startTime, form.endTime)).map((d) => ({ value: String(d), label: `${d} min`, note: `Ends ${time12(fromMinutes(minutesOf(form.startTime) + d))}` }))}
        selected={String(durationMinutes(form.startTime, form.endTime))}
        clampTo={bodyEl?.parentElement ?? null}
        onSelect={(v) => {
          update({ endTime: fromMinutes(minutesOf(form.startTime) + Number(v)) });
          setDurOpen(false);
          durEl?.focus();
        }}
        heading="Duration"
        width={200}
      />
      <PopupMenu
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        anchor={repeatEl}
        options={REPEAT_ORDER.map((k) => ({ value: k, label: REPEAT_LABEL[k] }))}
        selected={rp.kind}
        onSelect={(v) => {
          pickRepeat(v as RepeatKind);
          setRepeatOpen(false);
          repeatEl?.focus();
        }}
        heading="Repeat"
        width={200}
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
      {/* B-MA.6 `assignConflict` (Business Hiring Screens dlg, width 338): busy
          times only, never what or where (AN3-066 O3). The server refuses any
          clash (ATXD9), so "Assign anyway" can't exist: "Go back" returns to
          the Time field (the live "Change time"), "Choose someone else" opens
          the picker (live). */}
      <CentredDialog
        open={!!conflict}
        width={338}
        pad="24px 22px 22px"
        actionsTop={18}
        tone="primary"
        title={clashTitle(clashFirst)}
        body={conflict ? clashBody(clashClass, clashFirst, conflict.elsewhere ? 1 : conflict.dates) : undefined}
        cancel="Go back"
        action="Choose someone else"
        onCancel={() => {
          setConflict(null);
          fieldRefs.current.times?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
          window.setTimeout(() => startRef.current?.focus({ preventScroll: true }), 50);
        }}
        onAction={() => {
          setConflict(null);
          runGroupEl?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          window.setTimeout(() => setRunOpen(true), reduced ? 0 : 250);
        }}
      >
        {conflict ? (
          <div style={{ marginTop: 14, borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "left" }}>
            {clashRows(clashClass, clashFirst, clashBusy).map((r, i) => (
              <div key={r.k} className="flex justify-between" style={{ gap: 12, padding: "8px 0", borderTop: i ? `0.5px solid ${m.div}` : 0, fontSize: textPx(12.5) }}>
                <span style={{ color: m.slabel }}>{r.k}</span>
                <span style={{ fontWeight: 700, textAlign: "right", color: m.ink }}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CentredDialog>
      <ConfirmCard
        open={discardOpen}
        layout="decision"
        tone="destructive"
        title={mode === "edit" ? "Discard your changes?" : "Discard this class?"}
        subtitle={mode === "edit" ? "You haven't saved them yet. Your changes will be lost." : "You haven't saved it yet. Everything you entered will be lost."}
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        confirmStyle={{ background: m.high, color: m.onfill }}
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

/** An instructor's initial on --tealbg / --tealink (the board's roster avatar colours). */
export const Avatar: React.FC<{ m: MarketPalette; name: string; size: number }> = ({ m, name, size }) => (
  <span aria-hidden className="shrink-0 inline-flex items-center justify-center" style={{ width: size, height: size, borderRadius: 999, background: m.tealbg, color: m.tealink, fontSize: textPx(size >= 32 ? 11.5 : 11), fontWeight: 800 }}>
    {initialOf(name)}
  </span>
);

/** The saving spinner, rotated in CSS so Reduce motion can stop it (AN3-051 row 2). */
const Spinner: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="block" style={{ animation: reduced ? undefined : "class-spin .9s linear infinite" }}>
    <style>{`@keyframes class-spin { to { transform: rotate(360deg) } }`}</style>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
    <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
