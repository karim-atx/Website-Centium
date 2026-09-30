import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import {
  fetchMyAffiliation,
  fetchMyProfile,
  leaveAffiliation,
  type Affiliation,
} from "../../services/professional-profile";
import { Building2, LogOut } from "lucide-react";

// The professional's Explore tab: their affiliation with a business, and
// nothing else.
//
// THE JOB POSTINGS ARE GONE, AND REMOVED RATHER THAN EMPTIED. Four categories
// listed "businesses hiring", built from mockGyms, mockClasses and
// mockMarketplaceListings — invented venues — and then invented three more
// facts per row on top of them: Part-time/Full-time, Hiring/Not hiring, and an
// "Apply by" date, all derived from `hash(id)`. The detail sheet behind a card
// offered "Message business", which set a local flag and sent nothing, and
// "Share credentials directly", which did the same.
//
// AN EMPTY STATE WOULD HAVE BEEN A DIFFERENT LIE. "No openings yet" promises a
// list that fills in, and there is no job, vacancy or posting table anywhere in
// the schema for one to fill from — nor a way for a business to write one. So
// the section is gone until a business can actually post a vacancy, and the
// page keeps what was always real: the affiliation, read from the server, and
// the credentials sheet.
//
// Navigation is unaffected: /app/explore still renders this page, which still
// has content.

export default function ProfessionalExplore() {
  const { authUserId } = useApp();
  const [error, setError] = useState<string | null>(null);
  /**
   * THE REAL AFFILIATION, read from the server rather than local state.
   *
   * This screen used to call `affiliateWithBusiness()`, which matched a typed
   * id against a localStorage directory and set a localStorage flag. Nothing
   * about that reached the database, while PublicListingSheet read the actual
   * `professional_profiles.affiliated_business_id` — so the two surfaces
   * disagreed, and the one that gates `listed_publicly` was the one the user
   * could not see. Both now read the same source.
   */
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [leaving, setLeaving] = useState(false);
  const affiliated = !!affiliation;

  // Read once when the screen opens, from the same pair PublicListingSheet
  // uses, so the two cannot drift apart again.
  useEffect(() => {
    let cancelled = false;
    if (!authUserId) return;
    void (async () => {
      const result = await fetchMyProfile(authUserId);
      // A failed read leaves the card hidden rather than asserting "not
      // affiliated", which would be the same false certainty this fix removed.
      if (cancelled || !result.ok) return;
      const aff = await fetchMyAffiliation(result.profile?.affiliatedBusinessId ?? null);
      if (!cancelled) setAffiliation(aff);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  /**
   * Leaving is a real write; joining is not offered because it cannot be one.
   * `business_employees_delete_professional` is `auth.uid() = professional_id`,
   * so a professional may always leave — while inserting requires being the
   * business, which is why the "enter an ID to join" form is gone rather than
   * reworked.
   */
  const leave = async () => {
    setLeaving(true);
    const result = await leaveAffiliation();
    setLeaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setAffiliation(null);
  };

  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle={affiliated ? "Your affiliation" : "Your business affiliation"}
        showBack
      />

      {/* QA 12.0: "you should be able to access the business without any
          ID" — browsing and opening a listing's detail (message/submit
          credentials) no longer depends on having entered a business's
          affiliate ID first; that ID only remains what it always was, the
          mechanism for formally joining a business's team. */}
      {affiliated && (
        <Card className="bg-gradient-to-br from-primary to-primary-dark !text-white mb-6 animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-white" />
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Affiliated with</p>
              <p className="font-display font-semibold text-lg">{affiliation?.businessName}</p>
            </div>
          </div>
          <p className="text-xs text-white/80 mb-4">
            You can still browse and reach out to other listings below. Leaving delists you from this
            business's team.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void leave()}
            disabled={leaving}
            className="!bg-white/15 !text-white"
          >
            <LogOut size={13} /> {leaving ? "Leaving…" : "Leave business"}
          </Button>
          {error && <p className="text-xs font-semibold text-white mt-2">{error}</p>}
        </Card>
      )}

      {/* NO "ENTER AN ID TO JOIN" FORM, and its absence is the schema's rule
          rather than an omission. business_employees_insert_business_owner
          requires auth.uid() to be the BUSINESS's profile_id, so a
          professional cannot add themselves to a team however they are asked
          for the id — the business adds them. This used to be an input that
          matched against a localStorage directory and set a localStorage flag,
          which is why it appeared to work. */}
      {!affiliated && (
        <Card className="mb-6 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Not affiliated with a business
          </p>
          <p className="text-[11px] text-charcoal-faint">
            A business adds you to their team from their own account. Reach out to one directly and
            they can add you — there is nothing to enter here.
          </p>
        </Card>
      )}

    </div>
  );
}
