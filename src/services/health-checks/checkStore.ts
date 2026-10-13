import { useEffect, useSyncExternalStore } from "react";
import {
  createCustomCheck,
  deactivateReminder,
  deleteCustomCheck,
  fetchHealthCheckData,
  isGeneralKey,
  saveCheckState,
  saveReminder,
  updateCustomCheck,
  type ReminderRow,
} from "./remote";

/**
 * Stored health-check state (HE1.8.1 Mark as done, HE1.8.3 custom checks,
 * hidden checks, HE1.8.2 per-check reminders), on Database stage B2
 * (services/health-checks/remote.ts). V6-24: owner-only, never shared,
 * general catalogue only; included in health-data reset and deletion by the
 * database. Delivery of the reminders is stage B4 (neutral body, never the
 * check's name, V6-10); the MO1.8.3 Health checks switch is
 * app_preferences.notification_health_checks (services/preferences).
 *
 * One store per signed-in account, loaded on first use and after any write
 * fails, written optimistically and put back if the write is refused.
 *
 * NO-LEAK RULE: nothing here reads, names or links the Advanced health
 * monitoring plan, and the reminders here are not personal_reminders.
 */

export type CustomCheck = { id: string; name: string; intervalMonths: number };
export type ReminderRepeat = { kind: "none" } | { kind: "monthly" } | { kind: "yearly" } | { kind: "months"; n: number };
export type CheckReminder = { id?: string; checkId: string; date: string; time: string; repeat: ReminderRepeat };
export type WriteResult = { ok: true } | { ok: false; message: string };

type State = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  done: Record<string, string>;
  hidden: string[];
  custom: CustomCheck[];
  reminders: CheckReminder[];
};

let state: State = { userId: null, status: "idle", done: {}, hidden: [], custom: [], reminders: [] };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function toRepeat(r: ReminderRow): ReminderRepeat {
  if (r.repeat === "every_n_months") return { kind: "months", n: r.every_n ?? 1 };
  return { kind: r.repeat };
}
function fromRepeat(r: ReminderRepeat): { repeat: ReminderRow["repeat"]; every_n: number | null } {
  if (r.kind === "months") return { repeat: "every_n_months", every_n: r.n };
  return { repeat: r.kind, every_n: null };
}

export async function loadHealthChecks(userId: string): Promise<void> {
  if (state.userId !== userId) set({ userId, status: "loading", done: {}, hidden: [], custom: [], reminders: [] });
  else set({ status: "loading" });
  const r = await fetchHealthCheckData();
  if (state.userId !== userId) return;
  if (!r.ok) {
    set({ status: "error" });
    return;
  }
  const done: Record<string, string> = {};
  const hidden: string[] = [];
  for (const s of r.data.states) {
    if (s.done_on) done[s.check_key] = s.done_on;
    if (s.hidden) hidden.push(s.check_key);
  }
  for (const c of r.data.custom) if (c.done_on) done[c.id] = c.done_on;
  set({
    status: "ready",
    done,
    hidden,
    custom: r.data.custom.map((c) => ({ id: c.id, name: c.name, intervalMonths: c.interval_months })),
    reminders: r.data.reminders.map((x) => ({
      id: x.id,
      checkId: (x.state_key ?? x.custom_check_id) as string,
      date: x.remind_on,
      time: x.remind_at.slice(0, 5),
      repeat: toRepeat(x),
    })),
  });
}

/** Runs an optimistic change, then the write; puts the state back on failure. */
async function guarded(change: Partial<State>, write: () => Promise<{ ok: boolean; message?: string }>): Promise<WriteResult> {
  const before = state;
  set(change);
  const r = await write();
  if (!r.ok) {
    set({ done: before.done, hidden: before.hidden, custom: before.custom, reminders: before.reminders });
    return { ok: false, message: r.message ?? "Couldn't save. Try again." };
  }
  return { ok: true };
}

const uid = () => state.userId as string;

export const checkStoreActions = {
  markDone(checkId: string, day: string): Promise<WriteResult> {
    const write = () => (isGeneralKey(checkId) ? saveCheckState(uid(), checkId, { done_on: day }) : updateCustomCheck(checkId, { done_on: day }));
    return guarded({ done: { ...state.done, [checkId]: day } }, write);
  },
  undoDone(checkId: string): Promise<WriteResult> {
    const done = { ...state.done };
    delete done[checkId];
    const write = () => (isGeneralKey(checkId) ? saveCheckState(uid(), checkId, { done_on: null }) : updateCustomCheck(checkId, { done_on: null }));
    return guarded({ done }, write);
  },
  hide(checkId: string): Promise<WriteResult> {
    if (!isGeneralKey(checkId)) return Promise.resolve({ ok: false, message: "Couldn't save. Try again." });
    return guarded({ hidden: [...state.hidden.filter((h) => h !== checkId), checkId] }, () => saveCheckState(uid(), checkId, { hidden: true }));
  },
  show(checkId: string): Promise<WriteResult> {
    if (!isGeneralKey(checkId) || !state.hidden.includes(checkId)) return Promise.resolve({ ok: true });
    return guarded({ hidden: state.hidden.filter((h) => h !== checkId) }, () => saveCheckState(uid(), checkId, { hidden: false }));
  },
  /** Creates or renames a custom check; 2-60 characters, unique per person (case-insensitive). */
  async saveCustom(check: { id?: string; name: string; intervalMonths: number; doneOn?: string | null }, takenNames: string[]): Promise<WriteResult & { id?: string }> {
    const name = check.name.trim();
    if (name.length < 2 || name.length > 60) return { ok: false, message: "Use 2 to 60 characters." };
    const lower = name.toLowerCase();
    if (takenNames.some((n) => n.toLowerCase() === lower) || state.custom.some((c) => c.id !== check.id && c.name.toLowerCase() === lower)) {
      return { ok: false, message: "You already have this check." };
    }
    if (check.id) {
      const id = check.id;
      const r = await guarded(
        { custom: state.custom.map((c) => (c.id === id ? { ...c, name, intervalMonths: check.intervalMonths } : c)) },
        () => updateCustomCheck(id, { name, interval_months: check.intervalMonths })
      );
      return r.ok ? { ok: true, id } : r;
    }
    const r = await createCustomCheck(uid(), { name, interval_months: check.intervalMonths, done_on: check.doneOn ?? null });
    if (!r.ok) return { ok: false, message: r.message };
    set({ custom: [...state.custom, { id: r.data, name, intervalMonths: check.intervalMonths }], done: check.doneOn ? { ...state.done, [r.data]: check.doneOn } : state.done });
    return { ok: true, id: r.data };
  },
  deleteCustom(id: string): Promise<WriteResult> {
    const done = { ...state.done };
    delete done[id];
    return guarded(
      { custom: state.custom.filter((c) => c.id !== id), reminders: state.reminders.filter((r) => r.checkId !== id), done },
      () => deleteCustomCheck(id)
    );
  },
  async setReminder(r: CheckReminder): Promise<WriteResult> {
    const existing = state.reminders.find((x) => x.checkId === r.checkId);
    const subject = isGeneralKey(r.checkId) ? { state_key: r.checkId } : { custom_check_id: r.checkId };
    const before = state.reminders;
    set({ reminders: [...state.reminders.filter((x) => x.checkId !== r.checkId), { ...r, id: existing?.id }] });
    const res = await saveReminder(uid(), subject, { remind_on: r.date, remind_at: r.time, ...fromRepeat(r.repeat) }, existing?.id ?? null);
    if (!res.ok) {
      set({ reminders: before });
      return { ok: false, message: res.message };
    }
    set({ reminders: state.reminders.map((x) => (x.checkId === r.checkId ? { ...x, id: res.data } : x)) });
    return { ok: true };
  },
  removeReminder(checkId: string): Promise<WriteResult> {
    const existing = state.reminders.find((x) => x.checkId === checkId);
    if (!existing?.id) return Promise.resolve({ ok: true });
    const id = existing.id;
    return guarded({ reminders: state.reminders.filter((x) => x.checkId !== checkId) }, () => deactivateReminder(id));
  },
};

/** The store for the signed-in account; loads on first use. */
export function useHealthCheckStore(userId: string | null) {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!userId) return;
    if (state.userId !== userId || state.status === "idle") void loadHealthChecks(userId);
  }, [userId]);
  const mine = s.userId === userId;
  return {
    done: mine ? s.done : {},
    hidden: mine ? s.hidden : [],
    custom: mine ? s.custom : [],
    reminders: mine ? s.reminders : [],
    status: mine ? s.status : "loading",
    retry: () => userId && void loadHealthChecks(userId),
  };
}

/** "Every month" / "Every year" / "Every {n} months" / "Once" (OURS-health-check-reminders). */
export function repeatLabel(r: ReminderRepeat): string {
  if (r.kind === "monthly") return "Every month";
  if (r.kind === "yearly") return "Every year";
  if (r.kind === "months") return `Every ${r.n} months`;
  return "Once";
}
