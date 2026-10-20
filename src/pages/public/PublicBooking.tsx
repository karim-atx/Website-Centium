import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { professionalByHandle, type HandleProfile } from "../../services/public-pro";
import { BookingFlow } from "./BookingFlow";
import { ProHero, PublicCard, PublicFrame, PublicMessage, PublicSkeleton } from "./publicKit";

/**
 * Release 3 · W7 the public booking page, {site}/p/{handle}/book. The
 * professional from professional_by_handle (anon), then BookingFlow: session
 * types, Monday-first weeks of open times, and the booking, which needs
 * sign-in. Signed out, Sign in / Create an account remember this page with
 * the chosen session and time (?service=…&slot=…), so the visitor comes back
 * to it with the time still chosen.
 */
export default function PublicBooking() {
  const { handle = "" } = useParams();
  const [params] = useSearchParams();
  const { authReady, authUserId } = useApp();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "found"; pro: HandleProfile }>({
    status: "loading",
  });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void professionalByHandle(handle).then((r) => {
      if (!live) return;
      if (!r.ok) setState({ status: "error", message: r.message });
      else if (!r.data) setState({ status: "missing" });
      else setState({ status: "found", pro: r.data });
    });
    return () => {
      live = false;
    };
  }, [handle, reload]);

  useEffect(() => {
    document.title = state.status === "found" ? `Book ${state.pro.firstName} · Centium` : "Book a session · Centium";
  }, [state]);

  if (state.status === "loading" || !authReady) {
    return (
      <PublicFrame>
        <PublicSkeleton />
      </PublicFrame>
    );
  }
  if (state.status === "error") {
    return (
      <PublicFrame>
        <PublicMessage title="Couldn't load this page" line={state.message} onRetry={() => setReload((n) => n + 1)} />
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

  const { pro } = state;
  const base = `/p/${pro.handle}/book`;
  return (
    <PublicFrame label={`Book a session with ${pro.firstName}`}>
      <Link to={`/p/${pro.handle}`} className="tap self-start inline-flex items-center gap-1 min-h-11 text-[13px] font-bold text-charcoal-soft">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden /> Profile
      </Link>
      <ProHero name={pro.firstName} avatarUrl={pro.avatarUrl} subtype={pro.subtype} specialty={pro.specialty} headline={pro.headline} licenceVerified={pro.licenceVerified} />
      <PublicCard>
        <BookingFlow
          professionalId={pro.profileId}
          firstName={pro.firstName}
          signedIn={!!authUserId}
          initialServiceId={params.get("service")}
          initialSlot={params.get("slot")}
          returnPathFor={(serviceId, slot) => `${base}?service=${encodeURIComponent(serviceId)}${slot ? `&slot=${encodeURIComponent(slot.startsAt)}` : ""}`}
        />
      </PublicCard>
    </PublicFrame>
  );
}
