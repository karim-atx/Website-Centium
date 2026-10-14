import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";
import {
  assignInstructor,
  createClass,
  deleteClass,
  fetchClassBookings,
  fetchInstructors,
  fetchMyClasses,
  updateClass,
  type BusinessClassRow,
  type ClassBookingLite,
  type ClassDraft,
  type Instructor,
} from "../../../services/business-classes";
import type { Session } from "./scheduleModel";

// The Schedule's data: this business's classes, the bookings on them and the
// team that can teach them. One store per account, shared by the list, the
// week grid, the session page and the class rules, so moving between them
// shows the last answer at once and refreshes behind it (OP1-083 O1).
//
// LIVE DATA (OP1-074 S9): realtime on bookings is BACKEND (B15); until then a
// 2-minute poll while the page is visible, the HANDOVER §2.3 fallback.

export interface ScheduleState {
  uid: string | null;
  businessId: string | null;
  classes: BusinessClassRow[];
  bookings: ClassBookingLite[];
  instructors: Instructor[];
  instructorsLoaded: boolean;
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

async function load(uid: string): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    if (state.uid !== uid) state = { ...EMPTY, uid };
    set({ loading: true });
    const r = await fetchMyClasses(uid);
    if (!r.ok) {
      // Keep whatever is on screen (offline: the last answer stays, O3).
      set({ loading: false, error: state.loadedAt === null });
      return;
    }
    const [b, team] = await Promise.all([
      fetchClassBookings(r.classes.map((c) => c.id)),
      r.businessId ? fetchInstructors(r.businessId) : Promise.resolve({ ok: true as const, instructors: [] }),
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
      loading: false,
      error: false,
      loadedAt: Date.now(),
    });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

const sortRows = (rows: BusinessClassRow[]) =>
  [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

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
    }));
  }, [data.classes, data.bookings]);

  const create = useCallback(async (draft: ClassDraft) => {
    if (!state.businessId) return { ok: false as const, message: "Save your business profile first. Classes are scheduled under it." };
    const r = await createClass(state.businessId, draft);
    if (r.ok) set({ classes: sortRows([...state.classes.filter((c) => c.id !== r.created.id), r.created]) });
    return r;
  }, []);

  const update = useCallback(async (classId: string, draft: ClassDraft) => {
    const r = await updateClass(classId, draft);
    if (r.ok) set({ classes: sortRows(state.classes.map((c) => (c.id === classId ? r.updated : c))) });
    return r;
  }, []);

  const assign = useCallback(async (classId: string, professionalId: string | null) => {
    const r = await assignInstructor(classId, professionalId);
    if (r.ok) set({ classes: state.classes.map((c) => (c.id === classId ? r.updated : c)) });
    return r;
  }, []);

  const remove = useCallback(async (classId: string) => {
    // V6-55: Delete only for a class with no bookings (a delete cascades the
    // bookings with no word to anyone). Re-read right before deleting, so a
    // booking made since the page loaded is never removed with it.
    const fresh = await fetchClassBookings([classId]);
    if (!fresh.ok) return { ok: false as const, message: "Couldn't delete the class. Check your connection and try again." };
    if (fresh.bookings.length > 0) {
      set({ bookings: [...state.bookings.filter((b) => b.classId !== classId), ...fresh.bookings] });
      return { ok: false as const, message: "Someone has booked this class, so it can't be deleted." };
    }
    const r = await deleteClass(classId);
    if (r.ok) set({ classes: state.classes.filter((c) => c.id !== classId), bookings: state.bookings.filter((b) => b.classId !== classId) });
    return r;
  }, []);

  const nameOf = useCallback(
    (id: string | null) => (id ? data.instructors.find((i) => i.professionalId === id)?.firstName ?? "Unnamed" : ""),
    [data.instructors]
  );

  return {
    ...data,
    // Until the first answer, a load in flight is "loading" (never the empty card, OP1-080 O2).
    loading: data.loading || (data.loadedAt === null && !data.error),
    sessions,
    online,
    kind,
    /** Per-type vocabulary (V6-160): the Classes type says "clients", a gym "members". */
    people: kind === "classes" ? "clients" : "members",
    reload,
    create,
    update,
    assign,
    remove,
    nameOf,
  };
}

export type ScheduleApi = ReturnType<typeof useSchedule>;
