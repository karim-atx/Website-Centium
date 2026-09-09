import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import type { ProfessionalType } from "../../types";
import type { Enums } from "../../../lib/supabase/database.types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Star, ShieldCheck, UserCheck, Pencil, BadgeCheck, AtSign, Globe2, XIcon } from "lucide-react";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { professionalTypeIcon } from "../../utils/icons";

// V7 (QA 7.0): a professional's own account has no id in the static
// mockProfessionals directory — reviews for the client's actual linked
// professional (the code-based relationship, not the browse directory) are
// stored under this sentinel so the professional's own Profile can read
// what their clients rated them.
export const LINKED_PROFESSIONAL_REVIEW_ID = "me";

const linkedIcon = (subtype?: string) =>
  subtype && subtype in professionalTypeIcon ? professionalTypeIcon[subtype as ProfessionalType] : UserCheck;

// Keyed on the DATABASE enum, not the app's four-value ProfessionalType. The
// two nearly agree, except professional_subtype also has 'other' — a real
// account can hold it, so a directory that only knew four would silently drop
// those professionals from every filter.
type Subtype = Enums<"professional_subtype">;

const subtypeLabels: Record<Subtype, string> = {
  trainer: "Personal Trainers",
  dietitian: "Dietitians",
  physiotherapist: "Physiotherapists",
  doctor: "Doctors / GPs",
  other: "Other",
};

const subtypeLabel = (s: Subtype | null): string => (s ? subtypeLabels[s] : "Professional");

const listingIcon = (s: Subtype | null) =>
  s && s in professionalTypeIcon ? professionalTypeIcon[s as ProfessionalType] : UserCheck;

export default function Professionals() {
  const navigate = useNavigate();
  const { user, professionalReviews, submitProfessionalReview } = useApp();
  const [type, setType] = useState<Subtype | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);
  const myLinkedReview = professionalReviews.find((r) => r.professionalId === LINKED_PROFESSIONAL_REVIEW_ID);
  const [reviewRating, setReviewRating] = useState(myLinkedReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(myLinkedReview?.text ?? "");

  // The real directory, replacing the static mockProfessionals array this
  // page browsed until now. Those entries were not accounts — their ids
  // ("pr1") could never hold a relationship — so every listing was a
  // dead end dressed as a profile. See services/directory.
  const [listings, setListings] = useState<DirectoryListing[] | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchPublicDirectory();
      if (cancelled) return;
      if (!result.ok) {
        setDirectoryError(result.message);
        setListings([]);
        return;
      }
      setDirectoryError(null);
      setListings(result.listings);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (listings ?? []).filter((l) => (type ? l.subtype === type : true));

  // Professionals get an entirely different dashboard here (client roster,
  // not a directory to browse) — separate UI per QA, not just a banner.
  if (user.accountType === "professional") {
    return <ProfessionalDashboard />;
  }

  return (
    <div>
      <PageHeader title="Professionals" subtitle="Trainers, dietitians, physiotherapists & doctors" showBack />

      {/* Real data-sharing controls. These hang off the client's actual
          relationships, not the browse directory below — appearing in the
          directory is a professional advertising themselves, which grants
          them nothing until a client redeems their code.

          Summarised rather than inline: the full toggle list grew to seven
          categories and took the whole first screen, pushing the roster and
          directory below the fold. See DataSharingSummary. */}
      <DataSharingSummary />

      {/* V7 (QA 7.0): a professional who added this client via a client code
          shows up here automatically — a separate identity from the static
          browse directory below, since it's not one of those listings. */}
      {user.linkedProfessionalCode && (
        <Card
          interactive
          onClick={() => setLinkedProfileOpen(true)}
          className="mb-6 bg-gradient-to-br from-primary to-primary-dark !text-white animate-fade-slide-up"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {(() => {
                const Icon = linkedIcon(user.linkedProfessionalSubtype);
                return <Icon size={22} className="text-white" />;
              })()}
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Your professional</p>
              <p className="font-display font-semibold text-lg">{user.linkedProfessionalName}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <ShieldCheck size={13} /> Linked to your account
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReviewOpen(true);
              }}
              className="tap flex items-center gap-1 text-xs font-semibold text-white bg-white/15 rounded-full px-2.5 py-1"
            >
              <Pencil size={11} /> {myLinkedReview ? "Edit review" : "Rate & Review"}
            </button>
          </div>
          {myLinkedReview && (
            <div className="flex items-center gap-1 mt-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={13} className={i < myLinkedReview.rating ? "fill-white text-white" : "text-white/25"} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* The mock "My Dietitian" card that used to sit here is gone with
          mockProfessionals. It rendered a hired relationship with a person who
          had no account, beside the real linked-professional card directly
          above — two cards that looked alike where one was true. The real one
          covers this case. */}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        <Chip active={type === null} onClick={() => setType(null)}>
          All
        </Chip>
        {(Object.keys(subtypeLabels) as Subtype[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {subtypeLabels[t]}
          </Chip>
        ))}
      </div>

      <div className="space-y-3">
        {/* No rating or review count: no such schema exists, and inventing one
            from nothing is the same class of error as a measured-looking
            zero. Rates are shown instead, which are real. */}
        {filtered.map((p) => (
          <Card key={p.profileId} className="animate-fade-slide-up">
            <div className="flex items-start gap-3.5 mb-3">
              <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (() => {
                    const Icon = listingIcon(p.subtype);
                    return <Icon size={19} className="text-primary-dark" />;
                  })()
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-charcoal text-sm truncate">{p.name}</p>
                {(p.specialty || p.subtype) && (
                  <p className="text-xs text-primary-dark font-medium truncate">
                    {p.specialty ?? subtypeLabel(p.subtype)}
                  </p>
                )}
                {(p.location || p.monthlyRate != null) && (
                  <p className="text-xs text-charcoal-faint truncate">
                    {[p.location, p.monthlyRate != null ? `$${p.monthlyRate}/mo` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {p.bio && <p className="text-xs text-charcoal-soft mb-3.5 leading-relaxed">{p.bio}</p>}
            <Button size="sm" fullWidth onClick={() => navigate(`/app/professionals/${p.profileId}`)}>
              View Profile
            </Button>
          </Card>
        ))}

        {/* Three outcomes, deliberately distinct. An empty directory is the
            expected steady state until professionals opt in, and saying so
            plainly beats a blank screen; a failed request is not the same
            thing and must not borrow that wording. */}
        {listings === null && !directoryError && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">Loading professionals…</p>
          </Card>
        )}
        {directoryError && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">{directoryError}</p>
          </Card>
        )}
        {listings !== null && !directoryError && filtered.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm font-semibold text-charcoal">
              {listings.length === 0 ? "No professionals listed yet" : "None in this category"}
            </p>
            <p className="text-xs text-charcoal-faint mt-1 leading-relaxed">
              {listings.length === 0
                ? "Professionals choose whether to appear here. If you already work with one, ask them for their client code to connect."
                : "Try a different category."}
            </p>
          </Card>
        )}
      </div>

      <BottomSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`Rate ${user.linkedProfessionalName?.split(" ")[0] ?? "your professional"}`}
      >
        <div className="space-y-5 animate-fade-slide-up">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }, (_, i) => {
              const filled = i < reviewRating;
              return (
                <button
                  key={i}
                  onClick={() => setReviewRating(i + 1)}
                  aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                  className="tap"
                >
                  <Star size={30} className={filled ? "fill-gold text-gold" : "text-charcoal/15"} />
                </button>
              );
            })}
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Your review</span>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How has your experience been?"
              rows={4}
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              submitProfessionalReview(LINKED_PROFESSIONAL_REVIEW_ID, reviewRating, reviewText.trim());
              setReviewOpen(false);
            }}
          >
            Submit review
          </Button>
        </div>
      </BottomSheet>

      {/* V8 (QA 8.0): "it should show on the professionals tab in the more
          tab within the Client UI as well when viewing their profile" —
          the certification the professional attached in their own UI. */}
      <BottomSheet open={linkedProfileOpen} onClose={() => setLinkedProfileOpen(false)} title={user.linkedProfessionalName}>
        <div className="space-y-4 animate-fade-slide-up">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
              {(() => {
                const Icon = linkedIcon(user.linkedProfessionalSubtype);
                return <Icon size={22} className="text-primary-dark" />;
              })()}
            </span>
            <div>
              <p className="font-display font-semibold text-lg text-charcoal">{user.linkedProfessionalName}</p>
              {user.linkedProfessionalSubtype && (
                <p className="text-xs text-charcoal-faint capitalize">{user.linkedProfessionalSubtype}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <BadgeCheck size={13} /> Certification
            </p>
            {user.linkedProfessionalCertificationUrl ? (
              user.linkedProfessionalCertificationUrl.startsWith("data:application/pdf") ? (
                <iframe
                  title="Certification"
                  src={user.linkedProfessionalCertificationUrl}
                  className="w-full h-64 rounded-2xl border border-charcoal/10"
                />
              ) : (
                <img
                  src={user.linkedProfessionalCertificationUrl}
                  alt="Certification"
                  className="w-full max-h-64 object-contain rounded-2xl border border-charcoal/10 bg-cream-soft"
                />
              )
            ) : (
              <p className="text-sm text-charcoal-faint">No certification uploaded yet.</p>
            )}
          </div>

          {user.linkedProfessionalBio && (
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Bio</p>
              <p className="text-sm text-charcoal-soft leading-relaxed">{user.linkedProfessionalBio}</p>
            </div>
          )}

          {(user.linkedProfessionalPhone || user.linkedProfessionalWebsite) && (
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Contact</p>
              <div className="space-y-1">
                {user.linkedProfessionalPhone && (
                  <p className="text-sm text-charcoal-soft">{user.linkedProfessionalPhone}</p>
                )}
                {user.linkedProfessionalWebsite && (
                  <p className="text-sm text-charcoal-soft">{user.linkedProfessionalWebsite}</p>
                )}
              </div>
            </div>
          )}

          {/* QA 12.0: "In the profile tab have the ability for the
              Professional to connect their socials... When connecting to
              socials it should show in the connect to a professional tab
              in the Clients UI." */}
          {(user.linkedProfessionalInstagram || user.linkedProfessionalFacebook || user.linkedProfessionalX) && (
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Social</p>
              <div className="space-y-1">
                {user.linkedProfessionalInstagram && (
                  <p className="flex items-center gap-1.5 text-sm text-charcoal-soft">
                    <AtSign size={13} className="text-charcoal-faint" /> {user.linkedProfessionalInstagram}
                  </p>
                )}
                {user.linkedProfessionalFacebook && (
                  <p className="flex items-center gap-1.5 text-sm text-charcoal-soft">
                    <Globe2 size={13} className="text-charcoal-faint" /> {user.linkedProfessionalFacebook}
                  </p>
                )}
                {user.linkedProfessionalX && (
                  <p className="flex items-center gap-1.5 text-sm text-charcoal-soft">
                    <XIcon size={13} className="text-charcoal-faint" /> {user.linkedProfessionalX}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
