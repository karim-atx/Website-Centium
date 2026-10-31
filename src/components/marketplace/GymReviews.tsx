import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Star, ThumbsUp, User } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PinnedCta } from "../ui/PinnedCta";
import { MemberTag } from "./MemberTag";
import { ReviewForm } from "./ReviewForm";
import { MarketEmptyCard, MarketSkeleton } from "../market/MarketStates";
import { FOCUS_CSS } from "../market/usePress";
import { useIsDark } from "../../hooks/useIsDark";
import { marketPalette, type MarketPalette } from "../../theme/marketTokens";
import { linePx, textPx } from "../../theme/textSize";
import {
  deleteGymReview,
  editGymReview,
  fetchBusinessReviewsPage,
  fetchMyReviews,
  fetchReviewsPage,
  toggleReviewHelpful,
  writeBusinessReview,
  writeGymReview,
  type GymReview,
  type ReviewSort,
  type ReviewSummary,
} from "../../services/venues";
import { reviewAge, summaryOf } from "../../services/venues/venueLogic";
import { useApp } from "../../context/AppContext";

// MO1.4.2.3 Gym page › Reviews (backend stage 4d): the rating summary with
// its five bars, the sort chips, the review cards and "Write a review"
// (MO1.2.1.2's flow: stars, then the text). Market + Share 3.0 W2: not drawn
// on the board, so kept and restyled in its chrome (marketPalette, radius 18
// cards on 0.5px --hair, the sub-segmented sort track, MarketStates for
// loading and empty). Shared with the business page (businessId).
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
//   ATX93), so it isn't offered. Photos aren't stored.
// - B14 (RP-02): the business's public reply shows under its review
//   ("{name} replied", AN13-024 row 6 style; AN13-001 K2), and a review
//   written from a class booking names the class after its age.
// - B14 follow-up: the same list for a business with no venue
//   (businessId): business_reviews_public (signed out too; no helpful
//   votes, member tag or class), the card summed from the loaded reviews,
//   and the author's own review from my_reviews(), so "Write a review"
//   becomes "Edit your review" instead of answering ATX92.

const SORTS: { key: ReviewSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
];
const PAGE = 20;

/** Five stars: --gold for the rating, --swoff for the rest. */
function Stars({ value, size, m }: { value: number; size: number; m: MarketPalette }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`${Math.round(value)} out of 5 stars`} role="img">
      {Array.from({ length: 5 }, (_, i) => {
        const c = i < Math.round(value) ? m.gold : m.swoff;
        return <Star key={i} size={size} strokeWidth={1.5} aria-hidden fill={c} color={c} />;
      })}
    </span>
  );
}

export function GymReviews({
  gymId,
  businessId,
  gymName,
  summary: gymSummary,
  onChanged,
  pinned = true,
}: {
  /** A venue's reviews (gym_reviews_page) … */
  gymId?: string;
  /** … or a venue-less business's (business_reviews_public). */
  businessId?: string;
  gymName: string;
  summary: ReviewSummary | null;
  /** Re-read the summary (the header pill and the card) after a write. */
  onChanged: () => void;
  /** The write button pinned at the bottom (the gym page's Reviews tab), or in the flow. */
  pinned?: boolean;
}) {
  const { authUserId } = useApp();
  const m = marketPalette(useIsDark());
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [reviews, setReviews] = useState<GymReview[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [myBiz, setMyBiz] = useState<GymReview | null>(null);
  const biz = !gymId && !!businessId;

  // B14 follow-up: the author's own review of this business (my_reviews), signed in only.
  const loadMine = useCallback(async () => {
    if (!biz || !authUserId) return setMyBiz(null);
    const r = await fetchMyReviews();
    if (!r.ok) return;
    const m = r.value.find((x) => x.businessId === businessId && !x.gymId) ?? null;
    setMyBiz(
      m
        ? { id: m.reviewId, rating: m.rating, body: m.body, redacted: m.redacted, authorName: null, authorIsMember: false, createdAt: "", editedAt: null, helpfulCount: 0, viewerFoundHelpful: false, isMine: true, reply: null, classTitle: null }
        : null
    );
  }, [biz, authUserId, businessId]);
  useEffect(() => {
    void (async () => {
      await loadMine();
    })();
  }, [loadMine]);

  const load = useCallback(
    async (offset = 0) => {
      const r = biz ? await fetchBusinessReviewsPage(businessId!, sort, PAGE, offset) : await fetchReviewsPage(gymId!, sort, PAGE, offset);
      if (!r.ok) {
        setError(r.message);
        setReviews((prev) => prev ?? []);
        return;
      }
      setError(null);
      setMore(r.value.length === PAGE);
      setReviews((prev) => (offset === 0 ? r.value : [...(prev ?? []), ...r.value]));
    },
    [gymId, businessId, biz, sort]
  );

  useEffect(() => {
    void (async () => {
      await load(0);
    })();
  }, [load]);

  const mine = biz ? myBiz : (reviews?.find((r) => r.isMine) ?? null);
  // A business has no public summary reader: the card is the loaded reviews' once all are in.
  const summary = biz ? (reviews && !more ? summaryOf(reviews) : null) : gymSummary;

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
  const card: React.CSSProperties = { borderRadius: 18, border: `0.5px solid ${m.hair}`, background: m.card };
  const writeOff = reviews === null || (!!mine && mine.redacted);

  return (
    <div data-gym-reviews="" style={{ marginTop: 8, display: "flex", flexDirection: "column", lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {/* The summary in the board's card (radius 18, 0.5px --hair, --card,
          padding 16, gap 18): the average 38 / 800, the 13 gold stars,
          "N reviews" 11.5 --faint; the five bars (digit 11 / 700 --ink2, the
          --gold bar on a --soft track, the count 11 --faint). */}
      <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 110 }}>
          <span style={{ fontSize: textPx(38), fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{total > 0 ? summary!.average.toFixed(1) : "–"}</span>
          <span style={{ marginTop: 8 }}>
            <Stars value={summary?.average ?? 0} size={13} m={m} />
          </span>
          <span style={{ marginTop: 4, fontSize: textPx(11.5), color: m.faint }}>
            {total} {total === 1 ? "review" : "reviews"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }} aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((n, i) => {
            const c = summary?.counts[i] ?? 0;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, fontSize: textPx(11), fontWeight: 700, color: m.ink2, fontVariantNumeric: "tabular-nums" }}>{n}</span>
                <span aria-hidden style={{ flex: 1, height: 5, borderRadius: 999, background: m.soft, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", borderRadius: 999, background: m.gold, width: `${(c / maxCount) * 100}%` }} />
                </span>
                <span style={{ width: 24, textAlign: "end", fontSize: textPx(11), color: m.faint, fontVariantNumeric: "tabular-nums" }}>{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* The sort, on the board's sub-segmented track (--subtrack r12 p4 gap 4;
          34 tall r9 12; active --subactive / --onfill 700, idle --subink 600). */}
      <div role="radiogroup" aria-label="Sort reviews" style={{ marginTop: 12, display: "flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
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
              className="hit market-focus"
              style={{
                flex: 1,
                minWidth: 0,
                height: 34,
                borderRadius: 9,
                border: 0,
                background: on ? m.subactive : "transparent",
                color: on ? m.onfill : m.subink,
                font: "inherit",
                fontSize: textPx(12),
                fontWeight: on ? 700 : 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" style={{ margin: "12px 0 0", fontSize: textPx(12), fontWeight: 600, color: m.high }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {reviews === null ? (
          <MarketSkeleton radius={18} rows={3} count={2} label="Loading reviews" />
        ) : reviews.length === 0 ? (
          <MarketEmptyCard title="No reviews yet" body={`Reviews of ${gymName} will show here.`} />
        ) : (
          reviews.map((r) => (
            // A review: radius 18, 0.5px --hair, --card, padding 14 16; the 30
            // --pale disc, the name 13.5 / 700, the stars and the age 11
            // --faint, the text 13 / 19.5 --ink2, "Helpful · N" 11.5 / 600.
            <article key={r.id} style={{ ...card, padding: "14px 16px" }}>
              {r.redacted ? (
                <p style={{ margin: 0, fontSize: textPx(13), fontStyle: "italic", color: m.faint }}>This review was removed.</p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden style={{ width: 30, height: 30, borderRadius: 999, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={17} strokeWidth={2} fill="currentColor" />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="truncate" style={{ fontSize: textPx(13.5), fontWeight: 700 }}>
                          {r.isMine ? "You" : (r.authorName ?? "Anonymous reviewer")}
                        </span>
                        {r.authorIsMember && <MemberTag label="Member" tone="member" />}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Stars value={r.rating ?? 0} size={13} m={m} />
                        <span style={{ fontSize: textPx(11), color: m.faint }}>
                          {reviewAge(r.createdAt)}
                          {r.editedAt ? " · edited" : ""}
                          {r.classTitle ? ` · ${r.classTitle}` : ""}
                        </span>
                      </span>
                    </span>
                  </div>
                  {r.body && (
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "10px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2 }}>
                      {r.body}
                    </p>
                  )}
                  {/* The business's public reply: a 2px --fill rule, the head 11 / 800 --pdark, the text 12 / 17 --ink. */}
                  {r.reply && (
                    <div style={{ marginTop: 10, borderInlineStart: `2px solid ${m.fill}`, paddingInlineStart: 10 }}>
                      <p style={{ margin: 0, fontSize: textPx(11), fontWeight: 800, color: m.pdark }}>{gymName} replied</p>
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "2px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink }}>
                        {r.reply.body}
                      </p>
                    </div>
                  )}
                  {!biz && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => void helpful(r)}
                        disabled={r.isMine}
                        aria-pressed={r.viewerFoundHelpful}
                        className="hit market-focus"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: 0,
                          border: 0,
                          background: "none",
                          font: "inherit",
                          fontSize: textPx(11.5),
                          fontWeight: 600,
                          color: r.viewerFoundHelpful ? m.accent : m.faint,
                          opacity: r.isMine ? 0.6 : 1,
                          cursor: r.isMine ? "default" : "pointer",
                        }}
                      >
                        <ThumbsUp size={13} strokeWidth={1.75} aria-hidden fill={r.viewerFoundHelpful ? "currentColor" : "none"} />
                        Helpful · {r.helpfulCount}
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))
        )}
        {more && (
          <button
            type="button"
            onClick={() => void load(reviews?.length ?? 0)}
            className="hit market-focus"
            style={{ height: 40, border: 0, background: "none", font: "inherit", fontSize: textPx(13), fontWeight: 700, color: m.accent, cursor: "pointer" }}
          >
            Show more reviews
          </button>
        )}
      </div>

      {/* "Write a review" (Pencil 15); your own review is edited from the same button. */}
      {pinned ? (
        <>
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta
            primary={{
              label: mine && !mine.redacted ? "Edit your review" : "Write a review",
              icon: <Pencil size={15} strokeWidth={1.75} aria-hidden />,
              onClick: () => setWriteOpen(true),
              disabled: writeOff,
              className: "!bg-fill-pinned !text-on-primary-fill",
            }}
          />
        </>
      ) : (
        authUserId && (
          <button
            type="button"
            onClick={() => setWriteOpen(true)}
            disabled={writeOff}
            className="market-focus"
            style={{ ...card, marginTop: 12, width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, textAlign: "start", font: "inherit", color: m.ink, opacity: writeOff ? 0.6 : 1, cursor: writeOff ? "default" : "pointer" }}
          >
            <span style={{ width: 36, height: 36, borderRadius: 11, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: m.pdark }}>
              <Pencil size={17} aria-hidden />
            </span>
            <span className="truncate" style={{ minWidth: 0, flex: 1, fontSize: textPx(14), fontWeight: 600 }}>
              {mine && !mine.redacted ? "Edit your review" : "Write a review"}
            </span>
          </button>
        )
      )}

      <BottomSheet open={writeOpen} onClose={() => setWriteOpen(false)} title={`Rate ${gymName}`}>
        <GymReviewForm
          key={mine?.id ?? "new"}
          gymName={gymName}
          existing={mine}
          onDone={async () => {
            setWriteOpen(false);
            setSort("recent");
            await Promise.all([load(0), loadMine()]);
            onChanged();
          }}
          gymId={gymId}
          businessId={biz ? businessId : undefined}
        />
      </BottomSheet>
    </div>
  );
}

/** MO1.2.1.2's flow for a gym (or a venue-less business): write, or edit / delete your own. */
function GymReviewForm({ gymId, businessId, gymName, existing, onDone }: { gymId?: string; businessId?: string; gymName: string; existing: GymReview | null; onDone: () => Promise<void> }) {
  return (
    <ReviewForm
      initialRating={existing?.rating ?? 5}
      initialText={existing?.body ?? ""}
      placeholder={`How has ${gymName} been?`}
      submitLabel={existing ? "Save changes" : "Submit review"}
      // Stars alone are a review (write_gym_review / write_business_review since Database #38).
      textOptional
      onSubmit={async (rating, text) => {
        const r = existing
          ? await editGymReview(existing.id, rating, text)
          : businessId
            ? await writeBusinessReview(businessId, rating, text)
            : await writeGymReview(gymId!, rating, text);
        if (!r.ok) return r.message;
        await onDone();
        return null;
      }}
      onDelete={
        existing
          ? async () => {
              const r = await deleteGymReview(existing.id);
              if (!r.ok) return r.message;
              await onDone();
              return null;
            }
          : undefined
      }
    />
  );
}
