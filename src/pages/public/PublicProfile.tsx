import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, Star, UserRound } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { goldPill } from "../../components/professionals/typeColour";
import { CtaButton } from "../../components/pro/profile/kit";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { bookingAllowed, fetchPublicReviews, professionalByHandle, type HandleProfile } from "../../services/public-pro";
import type { ReviewRow } from "../../services/professional-reviews";
import { ReviewItem } from "../../components/professionals/ReviewItem";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { textPx } from "../../theme/textSize";
import { ProHero, PublicCard, PublicFrame, PublicMessage, PublicSkeleton, SignInButtons } from "./publicKit";

/**
 * Release 3 · W7 the public profile, {site}/p/{handle} (the MO15 share
 * link and its QR). professional_by_handle (anon) gives the name, photo,
 * type, headline and licence_verified; a listed professional's directory row
 * (public_professional_directory, also anon) adds the place, the rating and
 * the About text. "Book a session" shows when professional_booking_allowed
 * says the visitor may book; signed in, "Open in Centium" opens the client
 * profile (Hire, Message); signed out, Sign in / Create an account come back
 * here.
 *
 * Reviews (professional_reviews_public, anon): newest first, ten at a time,
 * every reviewer shown as "A client". Removed reviews are left out and a
 * withdrawn or removed reply comes back empty, so it is simply not shown.
 */
export default function PublicProfile() {
  const { handle = "" } = useParams();
  const navigate = useNavigate();
  const dark = useIsDark();
  const { authReady, authUserId } = useApp();
  type State =
    | { status: "loading" }
    | { status: "missing" }
    | { status: "error"; message: string }
    | { status: "found"; pro: HandleProfile; listing: DirectoryListing | null; canBook: boolean };
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!authReady) return;
    let live = true;
    void (async () => {
      const r = await professionalByHandle(handle);
      if (!live) return;
      if (!r.ok) return setState({ status: "error", message: r.message });
      if (!r.data) return setState({ status: "missing" });
      const [listing, allowed] = await Promise.all([fetchListing(r.data.profileId), bookingAllowed(r.data.profileId)]);
      if (!live) return;
      setState({ status: "found", pro: r.data, listing, canBook: allowed.ok && allowed.data });
    })();
    return () => {
      live = false;
    };
  }, [handle, reload, authReady, authUserId]);

  useEffect(() => {
    document.title = state.status === "found" ? `${state.pro.firstName} · Centium` : "Centium";
  }, [state]);

  if (state.status === "loading") {
    return (
      <PublicFrame>
        <PublicSkeleton />
      </PublicFrame>
    );
  }
  if (state.status === "error") {
    return (
      <PublicFrame>
        <PublicMessage title="Couldn't load this profile" line={state.message} onRetry={() => setReload((n) => n + 1)} />
      </PublicFrame>
    );
  }
  if (state.status === "missing") {
    return (
      <PublicFrame>
        <PublicMessage title="We couldn't find that professional" line="Check the link and try again." />
      </PublicFrame>
    );
  }

  const { pro, listing, canBook } = state;
  const gold = goldPill(dark);
  const rating = listing ? ratingLabel(listing.averageRating, listing.reviewCount) : null;
  const own = authUserId === pro.profileId;

  return (
    <PublicFrame label={`${pro.firstName}'s profile`}>
      <ProHero
        name={pro.firstName}
        avatarUrl={pro.avatarUrl}
        subtype={pro.subtype}
        specialty={pro.specialty ?? listing?.specialty}
        headline={pro.headline}
        licenceVerified={pro.licenceVerified}
        location={listing?.location}
      />
      {listing && (
        <div className="flex justify-center -mt-1">
          <span
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full font-bold"
            style={{ background: gold.bg, border: `1.1px solid ${gold.border}`, color: gold.ink, fontSize: textPx(11.5) }}
          >
            <Star size={13} aria-hidden style={{ fill: gold.star, color: gold.star }} />
            {rating?.kind === "average"
              ? `${rating.value} · ${reviewCountLabel(rating.count)}`
              : listing.reviewCount > 0
                ? `New · ${reviewCountLabel(listing.reviewCount)}`
                : "New · no reviews yet"}
          </span>
        </div>
      )}

      {listing?.bio?.trim() && (
        <section aria-label="About">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] px-1 mb-2 text-charcoal-faint">About</p>
          <div className="rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 p-4">
            <p className="text-[13px] text-charcoal-soft leading-[21.5px] whitespace-pre-line">{listing.bio.trim()}</p>
          </div>
        </section>
      )}

      {listing && listing.reviewCount > 0 && <PublicReviews professionalId={pro.profileId} firstName={pro.firstName} />}

      <PublicCard className="flex flex-col gap-2">
        {canBook && !own && <CtaButton full variant="secondary" icon={CalendarPlus} label="Book a session" onClick={() => navigate(`/p/${pro.handle}/book`)} />}
        {authUserId ? (
          <CtaButton
            full
            icon={UserRound}
            label={own ? "Open your profile" : "Open in Centium"}
            onClick={() => navigate(own ? "/app/more/public-profile" : `/app/professionals/${pro.profileId}`)}
          />
        ) : (
          <SignInButtons returnPath={`/p/${pro.handle}`} line={`Sign in or create an account to hire ${pro.firstName || "them"} or send a message.`} />
        )}
      </PublicCard>
    </PublicFrame>
  );
}

type ReviewsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reviews: ReviewRow[]; read: number; more: boolean; loadingMore: boolean; moreError: string | null };

function PublicReviews({ professionalId, firstName }: { professionalId: string; firstName: string }) {
  const [state, setState] = useState<ReviewsState>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void fetchPublicReviews(professionalId).then((r) => {
      if (!live) return;
      setState(r.ok ? { status: "ready", reviews: r.data.reviews, read: r.data.read, more: r.data.more, loadingMore: false, moreError: null } : { status: "error", message: r.message });
    });
    return () => {
      live = false;
    };
  }, [professionalId, reload]);

  const loadMore = async () => {
    if (state.status !== "ready" || state.loadingMore) return;
    // Rows read so far, not rows shown: removed reviews are read but not shown.
    const offset = state.read;
    setState({ ...state, loadingMore: true, moreError: null });
    const r = await fetchPublicReviews(professionalId, offset);
    setState((s) =>
      s.status !== "ready"
        ? s
        : r.ok
          ? { ...s, reviews: [...s.reviews, ...r.data.reviews.filter((x) => !s.reviews.some((y) => y.id === x.id))], read: s.read + r.data.read, more: r.data.more, loadingMore: false }
          : { ...s, loadingMore: false, moreError: r.message }
    );
  };

  // Nothing public to show (e.g. every review was removed): leave the section out.
  if (state.status === "ready" && state.reviews.length === 0) return null;

  return (
    <section aria-label="Reviews">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] px-1 mb-2 text-charcoal-faint">Reviews</p>
      {state.status === "loading" ? (
        <div role="status" aria-label="Loading reviews" className="rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 p-4 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-cream-soft shrink-0" />
              <div className="flex-1 flex flex-col gap-2 pt-1">
                <span className="h-3 w-24 rounded bg-cream-soft" />
                <span className="h-3 w-full rounded bg-cream-soft" />
              </div>
            </div>
          ))}
        </div>
      ) : state.status === "error" ? (
        <div className="rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 p-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-charcoal-soft">{state.message}</p>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="tap shrink-0 min-h-11 px-2 text-[13px] font-bold text-primary-deep-text">
            Retry
          </button>
        </div>
      ) : (
        <div className="rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 px-4">
          {state.reviews.map((r) => (
            <div key={r.id} className="py-3.5 border-b border-charcoal/[0.06] last:border-b-0">
              <ReviewItem review={r} layout="row" replyLabel={`Reply from ${firstName || "the professional"}`} />
            </div>
          ))}
          {(state.more || state.moreError) && (
            <div className="py-2 flex flex-col items-center">
              {state.moreError && <p className="text-[12px] text-charcoal-soft text-center pt-1">{state.moreError}</p>}
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={state.loadingMore}
                className="tap min-h-11 px-3 text-[13px] font-bold text-primary-deep-text disabled:opacity-60"
              >
                {state.loadingMore ? "Loading…" : state.moreError ? "Try again" : "Show more reviews"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
