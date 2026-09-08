import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatDisplayDate } from "../../utils/date";

const GRACE_PERIOD_DAYS = 30;

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
  const { deletionRequestedAt, cancelDeletion } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deletionRequestedAt) return null;

  // The sweep runs daily at 03:00 UTC, so the real deletion lands between 30
  // and 31 days out. The date shown is the earliest it could happen, which is
  // the one that matters to someone deciding whether to cancel.
  const scheduled = new Date(deletionRequestedAt);
  scheduled.setUTCDate(scheduled.getUTCDate() + GRACE_PERIOD_DAYS);
  const scheduledDate = scheduled.toISOString().slice(0, 10);

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
            It will be deleted on {formatDisplayDate(scheduledDate)}, along with your food
            logs, workouts and health data. Cancel any time before then to keep it.
          </p>
          {error && (
            <p className="text-[11.5px] font-semibold text-status-high mt-1.5">{error}</p>
          )}
        </div>
        <button
          onClick={handleCancel}
          disabled={busy}
          className="tap shrink-0 rounded-xl bg-white text-charcoal text-[11.5px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Cancel deletion"}
        </button>
      </div>
    </div>
  );
};
