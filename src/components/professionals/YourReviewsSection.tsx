import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Star } from "lucide-react";
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
  /** Re-reads the list after a save or withdraw, so the row's count moves with it. */
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);

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
  }, [authUserId, version]);

  if (!authUserId || (!error && (!list || list.length === 0))) return null;

  // Decision 23 (kept-list 39): the section is one "Your reviews (N)" row on
  // the directory page (N = the reviews this client has written), expanding in
  // place to the same cards, so every review action stays reachable — for an
  // unlisted or past professional this is the only place it is. A listed
  // professional's review is also on their profile page (MO1.2.1 "My review").
  // The row's look is not drawn: it takes the directory card's shell (r20,
  // white, 0.08 hairline) and the empty state's primary.tint tile.
  const written = (list ?? []).filter((p) => p.myReviewId).length;

  return (
    <section className="mb-6" aria-label="Your reviews">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="your-reviews-list"
        onClick={() => setExpanded((v) => !v)}
        className="tap w-full min-h-[56px] flex items-center gap-3 rounded-[20px] bg-cream-card border border-charcoal/[0.08] px-4 py-2.5 text-left"
      >
        <span className="w-9 h-9 rounded-[11px] bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center shrink-0 text-th-7d67d9 dark:text-primary-accent">
          <Star size={17} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="flex-1 min-w-0 text-[14px] font-semibold text-charcoal">Your reviews ({written})</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`shrink-0 text-charcoal-faint transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div id="your-reviews-list" className="mt-3 animate-fade-slide-up">
          {error ? (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2">{error}</p>
          ) : (
            <div className="space-y-3">
              {list!.map((p) => (
                <ReviewableRow key={p.professionalId} professional={p} onChanged={() => setVersion((v) => v + 1)} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

function ReviewableRow({ professional: p, onChanged }: { professional: ReviewableProfessional; onChanged: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const reviews = useProfessionalReviews(p.professionalId);
  const { mine, myStatus } = reviews;
  const save = async (rating: number, body: string, nameVisible: boolean) => {
    const message = await reviews.save(rating, body, nameVisible);
    if (!message) onChanged();
    return message;
  };
  const withdraw = async () => {
    const message = await reviews.withdraw();
    if (!message) onChanged();
    return message;
  };
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
