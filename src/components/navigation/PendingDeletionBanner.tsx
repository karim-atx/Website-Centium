import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatDisplayDate } from "../../utils/date";
import { fetchDeletionSchedule } from "../../services/profile";
import { deletionRunDate } from "../../services/profile/deletionDate";

/**
 * Shown on every screen while an account is inside its deletion grace period.
 *
 * Deliberately app-wide rather than tucked into Settings. Signing in does not
 * cancel a pending deletion — that is an explicit action, so that logging in
 * cannot silently revive an account someone asked to delete — which means the
 * user has to be told, everywhere, rather than only if they happen to visit
 * the screen they requested it from.
 */
export const PendingDeletionBanner: React.FC = () => {
  const { deletionRequestedAt, cancelDeletion, authUserId } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A7: profiles.deletion_due_at, read for this request (stamped with it, so a
  // new request never shows the previous one's date).
  const [schedule, setSchedule] = useState<{ for: string; dueAt: string | null } | null>(null);

  useEffect(() => {
    if (!deletionRequestedAt || !authUserId) return;
    let cancelled = false;
    void fetchDeletionSchedule(authUserId).then((r) => {
      if (!cancelled) setSchedule({ for: deletionRequestedAt, dueAt: r?.dueAt ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [deletionRequestedAt, authUserId]);

  if (!deletionRequestedAt) return null;

  // THE DATE IS THE SERVER'S (A7). An admin can schedule a deletion on 3 or
  // 14 days' notice, so request + 30 would show a date weeks after the
  // account is gone. deletion_due_at is what the sweep uses; only when it
  // cannot be read does this fall back to request + 30, which is then also
  // what the sweep uses (coalesce(deletion_due_at, requested + 30 days)).
  // The sweep runs daily at 03:00 UTC, so this is the earliest it can happen,
  // the date that matters to someone deciding whether to cancel.
  // Until the read answers, no date at all: a fallback shown first could be
  // weeks late for an admin's 3-day notice.
  const loaded = !!schedule && schedule.for === deletionRequestedAt;
  const dueAt = loaded ? schedule.dueAt : null;
  const scheduledDate = deletionRunDate(deletionRequestedAt, dueAt);

  const handleCancel = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await cancelDeletion();
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Could not cancel the deletion.");
  };

  return (
    <div className="rounded-2xl bg-status-high-bg border border-status-high/25 px-4 py-3.5 mb-5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-status-high shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-charcoal">
            Your account is scheduled for deletion
          </p>
          <p className="text-[11.5px] text-charcoal-soft mt-0.5">
            {loaded
              ? `It will be deleted on ${formatDisplayDate(scheduledDate)}, along with your food logs, workouts and health data. Cancel any time before then to keep it.`
              : "It will be deleted along with your food logs, workouts and health data. Cancel to keep it."}
          </p>
          {error && (
            <p className="text-[11.5px] font-semibold text-status-high mt-1.5">{error}</p>
          )}
        </div>
        <button
          onClick={handleCancel}
          disabled={busy}
          className="tap shrink-0 rounded-xl bg-cream-card text-charcoal text-[11.5px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Cancel deletion"}
        </button>
      </div>
    </div>
  );
};
