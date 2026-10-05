import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";

/**
 * The account-deletion confirm, shared by Settings and the Privacy page (it
 * used to live inside Settings, and Privacy reached it by asking Settings to
 * swap sheets; Privacy is its own page now).
 *
 * The old copy claimed this was permanent and could not be undone. Neither
 * was true: deletion runs after a 30-day grace period during which it can be
 * cancelled, and saying so is the point.
 */
export const DeleteAccountSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { deleteAccount } = useApp();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <BottomSheet open={open} onClose={onClose} title="Delete account">
      <div className="space-y-4 animate-fade-slide-up">
        <p className="text-sm text-charcoal-soft leading-relaxed">
          Your account will be scheduled for deletion in 30 days. After that your food logs, workouts,
          health metrics and connections are permanently removed.
        </p>
        <p className="text-sm text-charcoal-soft leading-relaxed">
          You can change your mind at any point in those 30 days. Sign back in and choose “Cancel
          deletion”.
        </p>
        {deleteError && <p className="text-xs font-semibold text-status-high text-center">{deleteError}</p>}
        <button
          onClick={async () => {
            if (deleting) return;
            setDeleteError(null);
            setDeleting(true);
            const result = await deleteAccount();
            setDeleting(false);
            // Only leave on a confirmed success. A failed request keeps the
            // user signed in with their data intact and says what happened.
            if (!result.ok) {
              setDeleteError(result.message ?? "Could not schedule deletion.");
              return;
            }
            onClose();
            navigate("/app/onboarding");
          }}
          disabled={deleting}
          className="tap w-full rounded-2xl bg-status-high text-white dark:text-[#0D0B1A] text-sm font-semibold py-3.5 disabled:opacity-60"
        >
          {deleting ? "Scheduling…" : "Schedule my account for deletion"}
        </button>
        <button onClick={onClose} className="tap w-full rounded-2xl bg-cream-soft text-charcoal text-sm font-semibold py-3.5">
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
};
