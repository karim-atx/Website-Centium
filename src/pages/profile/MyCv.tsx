import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CvEditor } from "../../components/cv/CvEditor";
import { CvView } from "../../components/cv/CvView";
import { VerifiedCheck } from "../../components/cv/CvBadges";
import { useMyCv } from "../../components/cv/useMyCv";
import { useApp } from "../../context/AppContext";
import { fetchMyProfile, type ProfessionalProfile } from "../../services/professional-profile";
import { cvIsEmpty, previewAsClient } from "../../services/professional-cv";
import { professionalRole } from "../../services/connected-professional";
import { todayLocal } from "../../utils/date";

/**
 * Profile › My CV: every CV section with its add/edit/delete sheets, and a
 * "Preview as a client" that renders the CV through the same component the
 * public profile uses, with the same filters the public views apply.
 */
export default function MyCv() {
  const { user } = useApp();
  const { cv, setCv, error, reload, userId } = useMyCv();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [listing, setListing] = useState<ProfessionalProfile | null>(null);

  // Bio and location come from the listing row: "About" on the public profile
  // IS the existing bio, not a second copy of it.
  useEffect(() => {
    if (!previewOpen || !userId) return;
    let cancelled = false;
    void fetchMyProfile(userId).then((r) => {
      if (!cancelled && r.ok) setListing(r.profile);
    });
    return () => {
      cancelled = true;
    };
  }, [previewOpen, userId]);

  if (user.accountType !== "professional") return <Navigate to="/app/profile" replace />;

  const preview = cv ? previewAsClient(cv, todayLocal()) : null;
  const role = professionalRole({ specialty: null, subtype: user.professionalSubtype ?? null });

  return (
    <div>
      <PageHeader title="My CV" subtitle="Shown on your public profile. Tap a section to edit." showBack />

      {error && !cv && <p className="text-sm text-status-high mb-4">{error}</p>}
      {!cv && !error && <p className="text-sm text-charcoal-faint">Loading your CV…</p>}

      {cv && userId && (
        <>
          <CvEditor variant="full" userId={userId} cv={cv} setCv={setCv} reload={reload} />
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="tap mt-3.5 w-full min-h-[48px] rounded-[14px] border border-primary/30 bg-cream-card text-sm font-bold text-primary-deep-text"
          >
            Preview as a client
          </button>
        </>
      )}

      {cv && preview && (
        <BottomSheet open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview as a client" size="tall">
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[19px] font-extrabold text-charcoal break-words">{user.firstName}</p>
                {preview.licences.some((l) => l.verified) && <VerifiedCheck size={18} />}
              </div>
              {cv.profile.headline && <p className="text-[13px] font-semibold text-primary-deep-text mt-0.5">{cv.profile.headline}</p>}
              <p className="text-[12.5px] text-charcoal-soft mt-0.5">
                {[role, listing?.location].filter(Boolean).join(" · ")}
              </p>
            </div>
            {listing?.bio && (
              <div>
                <p className="section-label text-charcoal-soft mb-1.5">About</p>
                <p className="text-sm leading-relaxed text-charcoal whitespace-pre-line">{listing.bio}</p>
              </div>
            )}
            {cvIsEmpty(preview, cv.profile.skills) ? (
              <p className="text-sm text-charcoal-soft">Nothing on your CV is visible to clients yet.</p>
            ) : (
              <CvView cv={preview} skills={cv.profile.skills} />
            )}
            <p className="text-[11.5px] text-charcoal-soft leading-relaxed">
              Clients see your CV once you're listed in Explore, and your own clients always can. Licences without a name, and
              expired ones you haven't chosen to show, are left out.
            </p>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
