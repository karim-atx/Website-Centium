import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, Star, UserRound } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { goldPill } from "../../components/professionals/typeColour";
import { CtaButton } from "../../components/pro/profile/kit";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { bookingAllowed, professionalByHandle, type HandleProfile } from "../../services/public-pro";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { textPx } from "../../theme/textSize";
import { ProHero, PublicCard, PublicFrame, PublicMessage, PublicSkeleton, SignInButtons } from "./publicKit";

/**
 * Release 3 · W7 the public profile, centium.app/p/{handle} (the MO15 share
 * link and its QR). professional_by_handle (anon) gives the name, photo,
 * type, headline and licence_verified; a listed professional's directory row
 * (public_professional_directory, also anon) adds the place, the rating and
 * the About text. "Book a session" shows when professional_booking_allowed
 * says the visitor may book; signed in, "Open in Centium" opens the client
 * profile (Hire, Message); signed out, Sign in / Create an account come back
 * here.
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
