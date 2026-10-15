import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";
import {
  assignInstructor,
  classFieldsOf,
  createClass,
  deleteClass,
  fetchClassBookings,
  fetchInstructors,
  fetchMyClasses,
  type BusinessClassRow,
  type ClassBookingLite,
  type ClassDraft,
  type Instructor,
} from "../../../services/business-classes";
import {
  cancelClassSession,
  classInstructorConflicts,
  editClass,
  endClassSeries,
  fetchSeries,
  moveClassSession,
  saveClassSeries,
  type CancelResult,
  type InstructorConflict,
  type SeriesRow,
} from "../../../services/business-classes/schedule";
import type { RepeatRule } from "../../../services/business-classes/scheduleRules";
import type { Session } from "./scheduleModel";

// The Schedule's data: this business's classes, the bookings on them, the
// team that can teach them and (B9) the repeating series and the instructor
// clashes. One store per account, shared by the list, the week grid, the
// session page and the class rules, so moving between them shows the last
// answer at once and refreshes behind it (OP1-083 O1).
//
// LIVE DATA (OP1-074 S9): realtime on bookings is BACKEND (B15); until then a
// 2-minute poll while the page is visible, the HANDOVER §2.3 fallback.
//
// B9 WRITES go through the server functions (save_class_series, edit_class,
// move_class_session, assign_class_instructor, cancel_class_session,
// end_class_series): a series edit or a split changes many rows, so those
// re-read the schedule rather than patching it here.

export interface ScheduleState {
  uid: string | null;
  businessId: string | null;
  classes: BusinessClassRow[];
  bookings: ClassBookingLite[];
  instructors: Instructor[];
  instructorsLoaded: boolean;
  /** B9 class_series rows (empty when none or not readable). */
  series: SeriesRow[];
  /** B9 class_instructor_conflicts(); null when it couldn't be read (the local check stands in). */
  clashes: InstructorConflict[] | null;
  loading: boolean;
  /** The first load failed (nothing to show). */
  error: boolean;
  /** When the shown data was read. */
  loadedAt: number | null;
}

const EMPTY: ScheduleState = {
  uid: null,
  businessId: null,
  classes: [],
  bookings: [],
  instructors: [],
  instructorsLoaded: false,
  series: [],
  clashes: null,
  loading: true,
  error: false,
  loadedAt: null,
};

let state: ScheduleState = EMPTY;
const listeners = new Set<() => void>();
const set = (next: Partial<ScheduleState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
let inflight: Promise<void> | null = null;
/** classId → the instructor a substitute replaced (this visit only, OP1-093). */
const covers = new Map<string, string>();

async function load(uid: string): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    if (state.uid !== uid) {
      state = { ...EMPTY, uid };
      covers.clear();
    }
    set({ loading: true });
    const r = await fetchMyClasses(uid);
    if (!r.ok) {
      // Keep whatever is on screen (offline: the last answer stays, O3).
      set({ loading: false, error: state.loadedAt === null });
      return;
    }
    const [b, team, series, clashes] = await Promise.all([
      fetchClassBookings(r.classes.map((c) => c.id)),
      r.businessId ? fetchInstructors(r.businessId) : Promise.resolve({ ok: true as const, instructors: [] }),
      r.businessId ? fetchSeries(r.businessId) : Promise.resolve({ ok: true as const, series: [] }),
      r.businessId ? classInstructorConflicts(r.businessId) : Promise.resolve({ ok: true as const, value: [] }),
    ]);
    if (!b.ok) {
      set({ loading: false, error: state.loadedAt === null });
      return;
    }
    set({
      businessId: r.businessId,
      classes: r.classes,
      bookings: b.bookings,
      instructors: team.ok ? team.instructors : state.instructors,
      instructorsLoaded: team.ok || state.instructorsLoaded,
      series: series.ok ? series.series : state.series,
      clashes: clashes.ok ? clashes.value : null,
      loading: false,
      error: false,
      loadedAt: Date.now(),
    });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** A fresh read after a write that changed more than one row (waits for any read in flight first). */
async function reread(): Promise<void> {
  if (!state.uid) return;
  if (inflight) await inflight;
  await load(state.uid);
}

const sortRows = (rows: BusinessClassRow[]) =>
  [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

type Fail = { ok: false; message: string; code?: "capacity" | "permission" | "busy" };

export function useSchedule() {
  const { authUserId, profileReady } = useApp();
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
  const online = useOnline();
  const kind = useBusinessNavKind();
  const uid = profileReady ? authUserId : null;

  useEffect(() => {
    if (!uid) return;
    void load(uid);
    // The 2-minute fallback for live data, only while visible.
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void load(uid);
    }, 120_000);
    return () => window.clearInterval(id);
  }, [uid]);

  const reload = useCallback(() => {
    if (uid) void load(uid);
  }, [uid]);

  const data = snap.uid === uid ? snap : EMPTY;

  const sessions: Session[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of data.bookings) counts.set(b.classId, (counts.get(b.classId) ?? 0) + 1);
    return data.classes.map((c) => ({
      id: c.id,
      title: c.title,
      classType: c.classType,
      date: c.date,
      startTime: c.startTime,
      endTime: c.endTime,
      maxCapacity: c.maxCapacity,
      professionalId: c.professionalId,
      booked: counts.get(c.id) ?? 0,
      cancelled: !!c.cancelledAt,
      seriesId: c.seriesId ?? null,
    }));
  }, [data.classes, data.bookings]);

  const create = useCallback(async (draft: ClassDraft) => {
    if (!state.businessId) return { ok: false as const, message: "Save your business profile first. Classes are scheduled under it." };
    const r = await createClass(state.businessId, draft);
    if (r.ok) set({ classes: sortRows([...state.classes.filter((c) => c.id !== r.created.id), r.created]) });
    return r;
  }, []);

  /**
   * B9 CL-01: a repeating class. One call creates every class of the rule 12
   * weeks ahead, all or nothing (an instructor clash on any date, ATXD9,
   * refuses the whole save). Returns the classes it made so far, in order.
   */
  const createSeries = useCallback(async (draft: ClassDraft, rule: RepeatRule): Promise<{ ok: true; seriesId: string; created: BusinessClassRow[] } | Fail> => {
    if (!state.businessId) return { ok: false, message: "Save your business profile first. Classes are scheduled under it." };
    const f = classFieldsOf(draft);
    if (!f.ok) return f;
    const r = await saveClassSeries(state.businessId, f.fields, rule);
    if (!r.ok) return { ok: false, message: r.message, code: r.refusal === "busy" ? "busy" : r.refusal === "denied" ? "permission" : undefined };
    await reread();
    const created = sortRows(state.classes.filter((c) => c.seriesId === r.value));
    return { ok: true, seriesId: r.value, created };
  }, []);

  /**
   * Edit one session, or (scope "future") this one and every later one of its
   * series that wasn't edited on its own (edit_class splits the series here).
   * A date change on one session goes through move_class_session (members'
   * calendars move and they're told); a time change does the same inside
   * edit_class. `told` counts the members a move told (0 when unknown).
   */
  const edit = useCallback(
    async (classId: string, scope: "this" | "future", draft: ClassDraft): Promise<{ ok: true; changed: number; told: number } | Fail> => {
      const before = state.classes.find((c) => c.id === classId);
      if (!before) return { ok: false, message: "This class isn't on your schedule any more." };
      const f = classFieldsOf(draft);
      if (!f.ok) return f;
      const fields = { ...f.fields };
      let told = 0;
      const timesChanged = draft.startTime !== before.startTime || draft.endTime !== before.endTime;
      if (scope === "this" && (draft.date !== before.date || timesChanged)) {
        const m = await moveClassSession(classId, draft.date, draft.startTime, draft.endTime);
        if (!m.ok) return { ok: false, message: m.message, code: m.refusal === "busy" ? "busy" : undefined };
        told = m.value;
      }
      if (scope === "this") {
        delete fields.start_time;
        delete fields.end_time;
      }
      const r = await editClass(classId, scope, fields);
      if (!r.ok) {
        await reread();
        return {
          ok: false,
          message: r.message,
          code: r.refusal === "capacity" ? "capacity" : r.refusal === "denied" ? "permission" : r.refusal === "busy" ? "busy" : undefined,
        };
      }
      if (before.professionalId !== (draft.professionalId || null)) covers.delete(classId);
      await reread();
      return { ok: true, changed: r.value, told };
    },
    []
  );

  /** B9 CL-04: assign (or clear) through assign_class_instructor; with `tell`, booked members get a notice. */
  const assign = useCallback(async (classId: string, professionalId: string | null, tell = false) => {
    const before = state.classes.find((c) => c.id === classId)?.professionalId ?? null;
    const r = await assignInstructor(classId, professionalId, tell);
    if (r.ok) {
      set({ classes: state.classes.map((c) => (c.id === classId ? r.updated : c)) });
      // OP1-093 row 3: remember who was replaced, for "Covering for {name}".
      // Kept for this visit only: the server keeps the class as edited on its
      // own (series_exception) but not who it replaced.
      const original = covers.get(classId) ?? before;
      if (original && professionalId && original !== professionalId) covers.set(classId, original);
      else covers.delete(classId);
      void reread();
    }
    return r;
  }, []);

  /** B9 CL-03: cancel one session (bookings released, members told, the row kept as cancelled). */
  const cancel = useCallback(async (classId: string, reason: string | null, people: "clients" | "members"): Promise<{ ok: true; value: CancelResult } | Fail> => {
    const r = await cancelClassSession(classId, reason, people);
    if (!r.ok) return { ok: false, message: r.message };
    set({
      classes: state.classes.map((c) => (c.id === classId ? { ...c, cancelledAt: new Date().toISOString(), cancelReason: reason?.trim() || null } : c)),
      bookings: state.bookings.filter((b) => b.classId !== classId),
    });
    void reread();
    return { ok: true, value: r.value };
  }, []);

  /** B9 CL-01: stop a series after `lastDate`; later classes nobody booked go, booked ones stay. */
  const endSeries = useCallback(async (seriesId: string, lastDate: string) => {
    const r = await endClassSeries(seriesId, lastDate);
    if (r.ok) await reread();
    return r;
  }, []);

  const coveringFor = useCallback((classId: string): string | null => covers.get(classId) ?? null, []);

  const remove = useCallback(async (classId: string) => {
    // Delete only for a class with no bookings: the server refuses one with
    // bookings (ATXE1), and the screens offer Cancel for it instead. Re-read
    // right before deleting, so a booking made since the page loaded is never
    // removed with it.
    const fresh = await fetchClassBookings([classId]);
    if (!fresh.ok) return { ok: false as const, message: "Couldn't delete the class. Check your connection and try again." };
    if (fresh.bookings.length > 0) {
      set({ bookings: [...state.bookings.filter((b) => b.classId !== classId), ...fresh.bookings] });
      return { ok: false as const, message: "Someone has booked this class, so it can't be deleted. Cancel it instead." };
    }
    const r = await deleteClass(classId);
    if (r.ok) set({ classes: state.classes.filter((c) => c.id !== classId), bookings: state.bookings.filter((b) => b.classId !== classId) });
    return r;
  }, []);

  const nameOf = useCallback(
    (id: string | null) => (id ? data.instructors.find((i) => i.professionalId === id)?.firstName ?? "Unnamed" : ""),
    [data.instructors]
  );

  const seriesOf = useCallback((seriesId: string | null | undefined) => (seriesId ? data.series.find((s) => s.id === seriesId) ?? null : null), [data.series]);

  return {
    ...data,
    // Until the first answer, a load in flight is "loading" (never the empty card, OP1-080 O2).
    loading: data.loading || (data.loadedAt === null && !data.error),
    sessions,
    online,
    kind,
    /** Per-type vocabulary (V6-160): the Classes type says "clients", a gym "members". */
    people: (kind === "classes" ? "clients" : "members") as "clients" | "members",
    reload,
    create,
    createSeries,
    edit,
    assign,
    cancel,
    endSeries,
    remove,
    nameOf,
    seriesOf,
    coveringFor,
  };
}

export type ScheduleApi = ReturnType<typeof useSchedule>;
