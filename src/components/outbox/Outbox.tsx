import React, { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { BottomSheet } from "../ui/BottomSheet";
import { ConfirmCard } from "../ui/ConfirmCard";
import { describeQueued, OUTBOX_EVENT, queuedLogs, type QueuedLog } from "../../services/health-log/offlineQueue";
import { OUTBOX_DROPPED_EVENT } from "../health/log/useLogQueue";
import { tn } from "../../i18n/core";

// The offline outbox on screen (Round D, D22 / D23; PLAN D-S20, undrawn, in
// the existing chip and sheet styles).
//
// - "{n} waiting to save": a small amber chip at the top of the page while
//   anything is kept on this device. Tap: a sheet saying what is waiting and
//   that it saves on reconnect ("Saving…" once back online).
// - Sign-out: when anything is waiting, a warning first, then the queue is
//   cleared by signOut() (it is health data on a possibly shared device).

/** The current account's waiting entries, kept in step with the queue. */
export function useOutbox(): QueuedLog[] {
  const { authUserId } = useApp();
  const [items, setItems] = useState<{ uid: string | null; list: QueuedLog[] }>(() => ({ uid: authUserId, list: authUserId ? queuedLogs(authUserId) : [] }));
  useEffect(() => {
    if (!authUserId) return;
    const read = () => setItems({ uid: authUserId, list: queuedLogs(authUserId) });
    read();
    window.addEventListener(OUTBOX_EVENT, read);
    // Another tab's queue changes arrive through storage.
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(OUTBOX_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [authUserId]);
  return items.uid === authUserId ? items.list : [];
}

const ROW_WORD: Record<QueuedLog["kind"], string> = {
  water: "Water",
  weight: "Weight",
  bp: "Blood pressure",
  food: "Food",
  habit: "Habit",
  workout: "Workout",
  message: "Message",
  goal: "Goal",
};

/** One line per waiting entry. Numbers are left out on purpose (recovery mode, and the sheet is a status, not a log). */
function rowLine(q: QueuedLog): string {
  switch (q.kind) {
    case "food":
      return q.params.food.name;
    case "workout":
      return q.session.routineName;
    case "message":
      return q.text.length > 60 ? `${q.text.slice(0, 57)}…` : q.text;
    case "habit":
      return q.done ? "Ticked" : "Unticked";
    case "goal":
      return q.metric === "water" ? "Water goal" : "Steps goal";
    default:
      return "Logged";
  }
}

export const OutboxStatus: React.FC = () => {
  const items = useOutbox();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState<string | null>(null);

  useEffect(() => {
    const onDropped = (e: Event) => {
      const d = (e as CustomEvent<{ kind: QueuedLog["kind"]; message?: string }>).detail;
      setDropped(`${ROW_WORD[d.kind]} couldn't be saved${d.message ? `: ${d.message}` : "."}`);
    };
    window.addEventListener(OUTBOX_DROPPED_EVENT, onDropped);
    return () => window.removeEventListener(OUTBOX_DROPPED_EVENT, onDropped);
  }, []);

  if (items.length === 0 && !dropped) return null;
  return (
    <div className="mb-3 flex flex-col items-start gap-1.5" data-outbox="">
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap inline-flex items-center gap-1.5 min-h-[32px] rounded-full px-3 bg-status-caution-bg text-status-caution text-[12px] font-bold"
          aria-label={`${items.length} waiting to save. Show what is waiting`}
        >
          <CloudUpload size={14} aria-hidden />
          {online ? "Saving…" : `${items.length} waiting to save`}
        </button>
      )}
      {dropped && (
        <p role="alert" className="text-[12px] font-semibold text-status-high">
          {dropped}{" "}
          <button type="button" className="underline" onClick={() => setDropped(null)}>
            Dismiss
          </button>
        </p>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Waiting to save">
        <p className="text-[13px] leading-[19px] text-charcoal-soft">
          {describeQueued(items) || "Nothing is waiting."} {items.length === 1 ? "is" : "are"} kept on this device and will save
          when you reconnect. Keep this app open or open it again once you're online.
        </p>
        <ul className="mt-3 flex flex-col divide-y divide-charcoal/[0.06] rounded-2xl border border-charcoal/[0.08] bg-cream-card">
          {items.map((q) => (
            <li key={q.id} className="flex items-center gap-3 px-3.5 min-h-[44px]">
              <span className="w-24 shrink-0 text-[12px] font-bold text-charcoal-faint">{ROW_WORD[q.kind]}</span>
              <span className="flex-1 min-w-0 truncate text-[13px] text-charcoal">{rowLine(q)}</span>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
};

/**
 * Sign-out with a warning when anything is waiting (D23): "2 food entries
 * haven't saved yet. Sign out anyway?". Returns the request function and the
 * dialog to render next to the button.
 */
export function useSignOutGuard(signOut: () => unknown): { requestSignOut: () => void; guardDialog: React.ReactNode } {
  const items = useOutbox();
  const [asking, setAsking] = useState(false);
  const requestSignOut = () => {
    if (items.length > 0) setAsking(true);
    else void signOut();
  };
  const what = describeQueued(items);
  const guardDialog = (
    <ConfirmCard
      open={asking}
      tone="destructive"
      title={`${what.charAt(0).toUpperCase()}${what.slice(1)} ${items.length === 1 ? "hasn't" : "haven't"} saved yet`}
      subtitle="Signing out removes them from this device. Connect to the internet first to keep them."
      confirmLabel="Sign out anyway"
      cancelLabel="Stay signed in"
      onCancel={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        void signOut();
      }}
    />
  );
  return { requestSignOut, guardDialog };
}

/** The warning line for a sign-out confirmation that already exists, or null when nothing is waiting. */
export function signOutWarning(items: readonly QueuedLog[]): string | null {
  if (items.length === 0) return null;
  const what = describeQueued(items);
  return tn(
    items.length,
    "{what} hasn't saved yet. Signing out removes it from this device.",
    "{what} haven't saved yet. Signing out removes them from this device.",
    { what: `${what.charAt(0).toUpperCase()}${what.slice(1)}` },
  );
}
