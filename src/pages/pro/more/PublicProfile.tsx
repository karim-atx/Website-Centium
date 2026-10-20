import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, Eye, Pencil, Share2 } from "lucide-react";
import ProfessionalDetail from "../../professionals/ProfessionalDetail";
import { HireAvailabilityNotice } from "../../../components/hire-pro/HireAvailabilityNotice";
import { HireBookPair } from "../../../components/pro/profile/kit";
import { HandleSheet, ShareProfileSheet } from "../../../components/pro/profile/ProfileSheets";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { typeLabel } from "../../../components/pro/profile/typeLabel";
import { averageOf, licenceFacts } from "../../../components/pro/profile/profileModel";
import { useMyCv } from "../../../components/cv/useMyCv";
import { INK } from "../../../components/pro/proInk";
import { useApp } from "../../../context/AppContext";
import { useEffectiveProfessionalTier } from "../../../hooks/useEffectiveProfessionalTier";
import { useMyProfessionalPlan } from "../../../hooks/useMyProfessionalPlan";
import { useReviewsAboutMe } from "../../../hooks/useProfessionalReviews";
import { hireGate } from "../../../services/hires/proLogic";
import { capLabel, effectiveTierLabel } from "../../../services/subscription-tiers";
import { fetchMyProfile, type ProfessionalProfile } from "../../../services/professional-profile";
import type { DirectoryListing } from "../../../services/directory";
import { textPx } from "../../../theme/textSize";
import { WhatToShareSheet } from "../../../components/share/WhatToShareSheet";
import { useProSubtype } from "../../../hooks/useProSubtype";

/**
 * Release 3 · W6 MO3 v3 public profile preview (/app/more/public-profile) and
 * MO15 v2 Share profile. The page IS the client's professional page
 * (ProfessionalDetail, through its optional preview props), so the preview is
 * exactly what a client sees; for a professional not listed yet, it is built
 * from their own rows. On top:
 * - "Preview as client" (30 high r9999 card, Eye 13, 11.5 / 800 primary.deep)
 *   and Share (MO15), top right; Edit (MO14);
 * - HireAvailabilityNotice when clients can't hire right now (hireGate, as Home);
 * - the MO16 v2 toast after a service is added (r16 16 from the edges, r16
 *   card, sheet shadow, CircleCheck 18 good, 13 / 600);
 * - the pinned Hire and Book a session pair (r16 fixPin16): equal halves,
 *   stacked with Hire on top at 360 and with Larger text. In the preview the
 *   buttons say what clients can do; they never book or hire yourself.
 */
export default function PublicProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authUserId, professionalClients } = useApp();
  const { facts, setFacts } = useProfileFacts();
  const { cv } = useMyCv();
  const { reviews } = useReviewsAboutMe();
  const { effective: myTier } = useEffectiveProfessionalTier();
  const { plan } = useMyProfessionalPlan();
  const [own, setOwn] = useState<ProfessionalProfile | null | undefined>(undefined);
  const [shareOpen, setShareOpen] = useState(false);
  // W8 SH4: Share opens "What do you want to share?"; MO15 Share profile is its "Profile link" row.
  const [cardsOpen, setCardsOpen] = useState(false);
  const { lane } = useProSubtype();
  const [handleOpen, setHandleOpen] = useState(false);
  const [toast, setToast] = useState<string | null>((location.state as { toast?: string } | null)?.toast ?? null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMyProfile(authUserId).then((r) => live && setOwn(r.ok ? r.profile : null));
    return () => {
      live = false;
    };
  }, [authUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const avg = averageOf(reviews);
  const count = reviews.filter((r) => !r.redactedAt).length;

  // What a client would see if the directory had the row (it has none until listed).
  const fallback: DirectoryListing | null = useMemo(
    () =>
      authUserId && own !== undefined && cv
        ? {
            profileId: authUserId,
            name: user.firstName ?? "",
            avatarUrl: user.avatarUrl ?? null,
            subtype: user.professionalSubtype ?? null,
            specialty: own?.specialty ?? null,
            location: own?.location ?? null,
            bio: own?.bio ?? null,
            monthlyRate: own?.monthlyRate ?? null,
            consultationRate: own?.consultationRate ?? null,
            paymentModalities: own?.paymentModalities ?? [],
            averageRating: count >= 3 ? avg : null,
            reviewCount: count,
            headline: cv.profile.headline,
            skills: cv.profile.skills,
            hasVerifiedLicence: licenceFacts(cv.licences, cv.reviews).verified,
          }
        : null,
    [authUserId, own, cv, user.firstName, user.avatarUrl, user.professionalSubtype, avg, count]
  );

  const gate = hireGate({ mayConnectClients: plan ? plan.mayConnectClients : null, maxClients: myTier?.tier.maxClients, clientCount: professionalClients.length });
  const first = (user.firstName ?? "").split(" ")[0];
  const [note, setNote] = useState<string | null>(null);

  if (!authUserId || own === undefined || !cv) {
    return (
      <div aria-busy="true" role="status" aria-label="Loading">
        <div aria-hidden className="flex flex-col items-center gap-1.5 pt-[46px] mb-5">
          <span className="w-24 h-24 rounded-full bg-cream-soft mb-1.5" />
          <span className="w-40 h-[22px] rounded-md bg-cream-soft" />
          <span className="w-56 h-[15px] rounded-md bg-cream-soft" />
        </div>
        <div aria-hidden className="h-[98px] rounded-[20px] bg-cream-soft mb-5" />
      </div>
    );
  }

  const chip = (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span className="inline-flex items-center" style={{ gap: 5, height: 30, padding: "0 10px", borderRadius: 9999, background: INK.card, fontSize: textPx(11.5), fontWeight: 800, color: INK.prDeep }}>
        <Eye size={13} strokeWidth={2} aria-hidden />
        Preview as client
      </span>
      <button type="button" onClick={() => navigate("/app/more/edit-profile")} aria-label="Edit public profile" className="tap flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 9999, background: INK.card, border: "1px solid rgb(var(--c-charcoal) / 0.11)", color: INK.chS }}>
        <Pencil size={15} strokeWidth={2} aria-hidden />
      </button>
      <button type="button" onClick={() => setCardsOpen(true)} aria-label="Share" className="tap flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 9999, background: INK.card, border: "1px solid rgb(var(--c-charcoal) / 0.11)", color: INK.chS }}>
        <Share2 size={15} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );

  const above = (
    <>
      {toast && (
        <div role="status" className="flex items-center" style={{ gap: 10, borderRadius: 16, background: INK.card, boxShadow: "0 16px 40px rgba(0,0,0,0.12)", padding: "12px 14px", marginBottom: 12 }}>
          <CircleCheck size={18} strokeWidth={2} aria-hidden style={{ color: INK.good, flexShrink: 0 }} />
          <span className="flex-1" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
            {toast}
          </span>
        </div>
      )}
      <HireAvailabilityNotice gate={gate} planLabel={myTier ? effectiveTierLabel(myTier) : null} capLine={myTier ? capLabel(myTier.tier, professionalClients.length) : null} className="mb-4" />
    </>
  );

  const explain = () => setNote("Clients use these buttons. You can't book or hire yourself.");

  return (
    <>
      <ProfessionalDetail
        preview={{
          profileId: authUserId,
          fallbackListing: fallback,
          headerRight: chip,
          above,
          reviewsHref: "/app/more/reviews",
          pinned: (
            <div>
              {note && (
                <p role="status" style={{ marginBottom: 8, fontSize: textPx(12), fontWeight: 600, color: INK.chS, textAlign: "center", background: INK.card, borderRadius: 12, padding: "8px 10px" }}>
                  {note}
                </p>
              )}
              <HireBookPair firstName={first} onHire={explain} onBook={explain} />
            </div>
          ),
        }}
      />
      {lane && (
        <WhatToShareSheet
          open={cardsOpen}
          onClose={() => setCardsOpen(false)}
          lane={lane}
          onProfileLink={() => {
            setCardsOpen(false);
            setShareOpen(true);
          }}
        />
      )}
      <ShareProfileSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        name={user.firstName ?? ""}
        avatarUrl={user.avatarUrl ?? null}
        type={typeLabel(user.professionalSubtype)}
        rating={avg !== null ? { average: avg, count } : null}
        specialties={facts?.specialties ?? []}
        handle={facts?.handle ?? null}
        onChooseHandle={() => {
          setShareOpen(false);
          setHandleOpen(true);
        }}
      />
      <HandleSheet open={handleOpen} onClose={() => setHandleOpen(false)} handle={facts?.handle ?? null} onSaved={(h) => setFacts((f) => (f ? { ...f, handle: h } : f))} />
    </>
  );
}
