import { useCallback, useEffect, useState } from "react";
import { Pencil, Star, ThumbsUp, User } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton, PinnedCta } from "../ui/PinnedCta";
import { MemberTag } from "./MemberTag";
import {
  deleteGymReview,
  editGymReview,
  fetchReviewsPage,
  toggleReviewHelpful,
  writeGymReview,
  type GymReview,
  type ReviewSort,
  type ReviewSummary,
} from "../../services/venues";
import { reviewAge } from "../../services/venues/venueLogic";

// MO1.4.2.3 Gym page › Reviews (backend stage 4d): the rating summary with
// its five bars, the sort chips, the review cards and "Write a review"
// (MO1.2.1.2's flow: stars, then the text). Measured on the 2x frame.
//
// gym_reviews is unreadable by any client role; gym_review_summary() and
// gym_reviews_page() apply redaction, venue visibility and minor-name
// suppression. So:
// - The author is a FIRST NAME ("Layal", not the frame's "Layal C."):
//   profiles has no surname column (flagged in the doc).
// - A minor's review comes back with no name (a stored decision); it reads
//   "Anonymous reviewer", neutral rather than an error.
// - A redacted review keeps its row and loses its content: "This review was
//   removed."
// - Sorts are recent / highest / lowest. "With photos" is not implemented
//   (review photos need storage and moderation; the function refuses it with
//   ATX93), so it isn't offered. Photos and the gym's reply aren't stored.

const SORTS: { key: ReviewSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
];
const PAGE = 20;
const BODY_MAX = 2000;

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.5}
          aria-hidden
          className={i < Math.round(value) ? "fill-gold text-gold" : "fill-charcoal/10 text-charcoal/10"}
        />
      ))}
    </span>
  );
}

export function GymReviews({
  gymId,
  gymName,
  summary,
  onChanged,
}: {
  gymId: string;
  gymName: string;
  summary: ReviewSummary | null;
  /** Re-read the summary (the header pill and the card) after a write. */
  onChanged: () => void;
}) {
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [reviews, setReviews] = useState<GymReview[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);

  const load = useCallback(
    async (offset = 0) => {
      const r = await fetchReviewsPage(gymId, sort, PAGE, offset);
      if (!r.ok) {
        setError(r.message);
        setReviews((prev) => prev ?? []);
        return;
      }
      setError(null);
      setMore(r.value.length === PAGE);
      setReviews((prev) => (offset === 0 ? r.value : [...(prev ?? []), ...r.value]));
    },
    [gymId, sort]
  );

  useEffect(() => {
    void (async () => {
      await load(0);
    })();
  }, [load]);

  const mine = reviews?.find((r) => r.isMine) ?? null;

  const helpful = async (r: GymReview) => {
    const res = await toggleReviewHelpful(r.id);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setReviews((prev) =>
      (prev ?? []).map((x) =>
        x.id === r.id ? { ...x, viewerFoundHelpful: res.value, helpfulCount: x.helpfulCount + (res.value === x.viewerFoundHelpful ? 0 : res.value ? 1 : -1) } : x
      )
    );
  };

  const total = summary?.total ?? 0;
  const maxCount = Math.max(1, ...(summary?.counts ?? [0]));

  return (
    <div className="mt-4 flex flex-col">
      {/* #7: the summary card, r18, 1 px rgba(36,31,27,.08), padding 16,
          gap 18: the average 38/800, Star 13 gold, "N reviews" 11.5/400;
          the five bars (digit 11/700, gold bar on its track, count 11/400). */}
      <div className="rounded-[18px] border border-charcoal/[0.08] bg-cream-card p-4 flex items-center gap-[18px]">
        <div className="flex flex-col items-center shrink-0 w-[110px]">
          <span className="text-[38px] font-extrabold leading-none text-charcoal tabular-nums">{total > 0 ? summary!.average.toFixed(1) : "–"}</span>
          <span className="mt-2">
            <Stars value={summary?.average ?? 0} size={13} />
          </span>
          <span className="mt-1 text-[11.5px] text-charcoal-faint">
            {total} {total === 1 ? "review" : "reviews"}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5" aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((n, i) => {
            const c = summary?.counts[i] ?? 0;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="w-2 text-[11px] font-bold text-charcoal-soft tabular-nums">{n}</span>
                <span className="flex-1 h-[5px] rounded-full bg-cream-soft overflow-hidden" aria-hidden>
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${(c / maxCount) * 100}%` }} />
                </span>
                <span className="w-6 text-end text-[11px] text-charcoal-faint tabular-nums">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* #8: the sort chips, 30 tall, gap 6: active #9A8CD6 with white 12/700,
          others outlined 12/600 text.secondary. */}
      <div role="radiogroup" aria-label="Sort reviews" className="mt-[13px] flex gap-1.5">
        {SORTS.map((s) => {
          const on = s.key === sort;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setReviews(null);
                setSort(s.key);
              }}
              className={`tap h-[30px] px-3.5 rounded-full text-[12px] whitespace-nowrap ${
                on ? "bg-th-9a8cd6 text-white font-bold dark:bg-primary-fill dark:text-on-primary-fill" : "border border-charcoal/10 font-semibold text-charcoal-soft"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2.5">
        {reviews === null ? (
          [0, 1].map((i) => <div key={i} aria-hidden className="h-[147px] rounded-[18px] bg-cream-soft animate-pulse" />)
        ) : reviews.length === 0 ? (
          <p className="mt-6 mb-0 text-center text-[12.5px] text-charcoal-faint">No reviews yet. Be the first to write one.</p>
        ) : (
          reviews.map((r) => (
            // #9–12: r18, 1 px rgba(36,31,27,.08), padding 14 16; a 30
            // avatar disc, the name 13.5/700, Star 13 and the age 11/400, the
            // text 13/400 text.secondary, "Helpful · N" 11.5/600 with ThumbsUp 13.
            <article key={r.id} className="rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-4 py-3.5">
              {r.redacted ? (
                <p className="m-0 text-[13px] italic text-charcoal-faint">This review was removed.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[30px] h-[30px] rounded-full bg-primary-pale flex items-center justify-center shrink-0 text-th-a79ad5 dark:text-primary-dark" aria-hidden>
                      <User size={17} strokeWidth={2} fill="currentColor" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-bold text-charcoal truncate">{r.isMine ? "You" : (r.authorName ?? "Anonymous reviewer")}</span>
                        {r.authorIsMember && <MemberTag label="Member" tone="member" />}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Stars value={r.rating ?? 0} size={13} />
                        <span className="text-[11px] text-charcoal-faint">
                          {reviewAge(r.createdAt)}
                          {r.editedAt ? " · edited" : ""}
                        </span>
                      </span>
                    </span>
                  </div>
                  {r.body && <p className="mt-2.5 mb-0 text-[13px] leading-[1.55] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">{r.body}</p>}
                  <div className="mt-2.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void helpful(r)}
                      disabled={r.isMine}
                      aria-pressed={r.viewerFoundHelpful}
                      className={`tap inline-flex items-center gap-1.5 text-[11.5px] font-semibold disabled:opacity-60 ${
                        r.viewerFoundHelpful ? "text-th-7d67d9 dark:text-primary-dark" : "text-charcoal-faint"
                      }`}
                    >
                      <ThumbsUp size={13} strokeWidth={1.75} aria-hidden className={r.viewerFoundHelpful ? "fill-current" : ""} />
                      Helpful · {r.helpfulCount}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        )}
        {more && (
          <button type="button" onClick={() => void load(reviews?.length ?? 0)} className="tap h-10 text-[13px] font-bold text-th-7d67d9 dark:text-primary-dark">
            Show more reviews
          </button>
        )}
      </div>

      <div aria-hidden style={{ height: 60 }} />
      {/* #13: "Write a review" with Pencil 15/1.75; your own review is
          edited from the same button. */}
      <PinnedCta
        primary={{
          label: mine && !mine.redacted ? "Edit your review" : "Write a review",
          icon: <Pencil size={15} strokeWidth={1.75} aria-hidden />,
          onClick: () => setWriteOpen(true),
          disabled: reviews === null || (!!mine && mine.redacted),
          className: "!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill",
        }}
      />

      <BottomSheet open={writeOpen} onClose={() => setWriteOpen(false)} title={`Rate ${gymName}`}>
        <ReviewForm
          key={mine?.id ?? "new"}
          gymName={gymName}
          existing={mine}
          onDone={async () => {
            setWriteOpen(false);
            setSort("recent");
            await load(0);
            onChanged();
          }}
          gymId={gymId}
        />
      </BottomSheet>
    </div>
  );
}

/** MO1.2.1.2's flow for a gym: 34 pt stars on a 44 pitch, the text, Submit. */
function ReviewForm({ gymId, gymName, existing, onDone }: { gymId: string; gymName: string; existing: GymReview | null; onDone: () => Promise<void> }) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [text, setText] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const over = text.length > BODY_MAX;
  const empty = !text.trim();

  const submit = async () => {
    if (busy || over || empty) return;
    setBusy(true);
    const r = existing ? await editGymReview(existing.id, rating, text) : await writeGymReview(gymId, rating, text);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await onDone();
  };

  const remove = async () => {
    if (!existing || busy) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const r = await deleteGymReview(existing.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await onDone();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-2.5" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i + 1} onClick={() => setRating(i + 1)} aria-label={`${i + 1} star${i === 0 ? "" : "s"}`} className="tap">
            <Star size={34} strokeWidth={1.5} className={i < rating ? "fill-gold text-gold" : "text-charcoal/15"} />
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-faint mb-2.5 block">Your review</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`How has ${gymName} been?`}
          rows={5}
          aria-invalid={over || undefined}
          className="w-full h-[209px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </label>
      {over && <p className="m-0 text-xs font-semibold text-status-high">A review can be up to {BODY_MAX.toLocaleString("en")} characters.</p>}
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-status-high">
          {error}
        </p>
      )}
      <CtaButton
        size="page"
        label={existing ? "Save changes" : "Submit review"}
        loading={busy}
        disabled={over || empty}
        onClick={() => void submit()}
        className="!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill"
      />
      {existing && (
        <button type="button" onClick={() => void remove()} disabled={busy} className="tap min-h-[44px] w-full text-xs font-semibold text-status-high">
          {confirmDelete ? "Tap again to delete your review" : "Delete review"}
        </button>
      )}
    </div>
  );
}
