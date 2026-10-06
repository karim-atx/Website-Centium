import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { fetchMyReviewables, type ReviewableProfessional } from "../../services/professional-reviews";
import { Card } from "../ui/Card";
import { MyReviewCard, ReviewFormSheet } from "./ReviewForms";

/**
 * "Your reviews": every professional this client may review, from
 * my_reviewable_professionals() — current and past, LISTED OR NOT. A past
 * client keeps the right to review (can_review_professional ignores
 * disconnected_at), and an unlisted professional has no listing page to
 * review them from, so this is where that right is reached.
 */
export const YourReviewsSection: React.FC<{ authUserId: string | null }> = ({ authUserId }) => {
  const [list, setList] = useState<ReviewableProfessional[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMyReviewables().then((r) => {
      if (cancelled) return;
      if (r.ok) setList(r.professionals);
      else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  if (!authUserId || (!error && (!list || list.length === 0))) return null;

  return (
    <section className="mb-6" aria-labelledby="your-reviews">
      <h2 id="your-reviews" className="section-label text-charcoal-soft mb-2">
        Your reviews
      </h2>
      {error ? (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2">{error}</p>
      ) : (
        <div className="space-y-3">
          {list!.map((p) => (
            <ReviewableRow key={p.professionalId} professional={p} />
          ))}
        </div>
      )}
    </section>
  );
};

function ReviewableRow({ professional: p }: { professional: ReviewableProfessional }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { mine, myStatus, save, withdraw } = useProfessionalReviews(p.professionalId);
  // Before the hook has answered, the list's own status stands in.
  const status = myStatus ?? p.myStatus;
  const note = [p.connectedNow ? null : "Worked with you before", p.listedPublicly ? null : "Not listed"]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1 px-1">
        <p className="min-w-0 text-sm font-semibold text-charcoal truncate">
          {p.firstName}
          {note && <span className="ml-1.5 text-[11px] font-semibold text-charcoal-faint">{note}</span>}
        </p>
        {/* Only a listed professional has a page to open. */}
        {p.listedPublicly && (
          <button
            type="button"
            onClick={() => navigate(`/app/professionals/${p.professionalId}`)}
            className="tap min-h-[44px] shrink-0 text-xs font-bold text-primary-deep-text"
          >
            View profile
          </button>
        )}
      </div>
      {p.myReviewId && !mine ? (
        <Card>
          <p className="text-sm text-charcoal-faint">Loading your review…</p>
        </Card>
      ) : (
      <MyReviewCard
        firstName={p.firstName}
        review={mine}
        status={status}
        onOpen={() => setOpen(true)}
        onWithdraw={withdraw}
      />
      )}
      <ReviewFormSheet
        open={open}
        onClose={() => setOpen(false)}
        firstName={p.firstName}
        existing={mine}
        onSave={save}
        onWithdraw={withdraw}
      />
    </div>
  );
}
