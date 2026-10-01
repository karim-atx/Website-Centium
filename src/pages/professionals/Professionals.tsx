import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { fetchLinkedProfessionals } from "../../services/consent";
import type { ProfessionalType } from "../../types";
import type { Enums } from "../../../lib/supabase/database.types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Star, ShieldCheck, UserCheck, Pencil } from "lucide-react";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { VerifiedCheck, VerifiedExplainer } from "../../components/cv/CvBadges";
import { DirectoryCard } from "../../components/professionals/DirectoryCard";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { NearbyView } from "../../components/professionals/NearbyView";
import { List, Map as MapIcon } from "lucide-react";
import { CvView } from "../../components/cv/CvView";
import { cvIsEmpty, fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import {
  fetchConnectedProfessional,
  professionalRole,
  type ConnectedProfessional,
} from "../../services/connected-professional";
import { professionalTypeIcon } from "../../utils/icons";

// LINKED_PROFESSIONAL_REVIEW_ID USED TO LIVE HERE, and it was the literal
// string "me": a sentinel key under which a client's review of their linked
// professional was stored in localStorage, and which the professional's own
// Profile read back — from their own device, where no client had ever written
// it. Reviews are professional_reviews rows keyed on the professional's real
// account uuid now, so the sentinel is gone rather than left as an import
// nothing can honour.

const linkedIcon = (subtype?: string) =>
  subtype && subtype in professionalTypeIcon ? professionalTypeIcon[subtype as ProfessionalType] : UserCheck;

// Keyed on the DATABASE enum, not the app's four-value ProfessionalType. The
// two nearly agree, except professional_subtype also has 'other' — a real
// account can hold it, so a directory that only knew four would silently drop
// those professionals from every filter.
type Subtype = Enums<"professional_subtype">;

// The chip labels, shared with the card (SUBTYPE_LABELS).
const subtypeLabels: Record<Subtype, string> = SUBTYPE_LABELS;

export default function Professionals() {
  const { user, authUserId, theme } = useApp();
  /**
   * LIST OR MAP. The list is the directory, unchanged and open to everyone;
   * the map needs an account (the database's search is signed-in only) and
   * asks for a location only once it is chosen. The category chips filter both.
   */
  const [view, setView] = useState<"list" | "map">("list");
  const [type, setType] = useState<Subtype | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // THE REVIEW NEEDS AN ACCOUNT, NOT A CODE. This card is rendered from
  // `user.linkedProfessionalCode`, local onboarding state — fine for showing a
  // name, useless for writing a row, because professional_reviews.professional_id
  // is a uuid. The real relationship comes from professional_clients via
  // fetchLinkedProfessionals, which is what the review is attached to.
  const [linkedProfessionalId, setLinkedProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled || result.status !== "ok") return;
      // One card, one professional: this surface has only ever shown a single
      // linked professional, so the first active relationship is the subject.
      setLinkedProfessionalId(result.professionals[0]?.professionalId ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The linked professional's profile and CV, read when the sheet opens.
  const [linkedDetail, setLinkedDetail] = useState<ConnectedProfessional | null>(null);
  const [linkedCv, setLinkedCv] = useState<PublicCv | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  // The profile is read as soon as the relationship is known — the card shows
  // the real name — and the CV when the sheet opens.
  useEffect(() => {
    if (!linkedProfessionalId) return;
    let cancelled = false;
    void fetchConnectedProfessional(linkedProfessionalId).then((detail) => {
      if (cancelled) return;
      if (!detail.ok) setLinkedError(detail.message);
      else setLinkedDetail(detail.professional);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedProfessionalId]);

  useEffect(() => {
    if (!linkedProfileOpen || !linkedProfessionalId) return;
    let cancelled = false;
    void fetchPublicCv(linkedProfessionalId).then((cv) => {
      if (cancelled) return;
      if (!cv.ok) {
        setLinkedError(cv.message);
        return;
      }
      setLinkedError(null);
      setLinkedCv(cv.cv);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedProfileOpen, linkedProfessionalId]);

  // THE CARD FOLLOWS THE REAL RELATIONSHIP. It used to render only from
  // `user.linkedProfessionalCode`, which is set when a code is redeemed during
  // onboarding on this device — so a client connected any other way (an
  // accepted hire request, another device) never saw it at all.
  const hasLinkedProfessional = !!linkedProfessionalId || !!user.linkedProfessionalCode;
  const linkedName = linkedDetail?.firstName ?? user.linkedProfessionalName ?? "Your professional";
  const linkedSubtype = linkedDetail?.subtype ?? user.linkedProfessionalSubtype;

  const {
    mine: myLinkedReview,
    error: reviewError,
    save: saveLinkedReview,
    remove: removeLinkedReview,
  } = useProfessionalReviews(linkedProfessionalId);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  // Opt-in, defaulting off — the same shape as the column.
  const [showMyName, setShowMyName] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);

  const openReviewSheet = () => {
    setReviewRating(myLinkedReview?.rating ?? 5);
    setReviewText(myLinkedReview?.body ?? "");
    setShowMyName(myLinkedReview?.reviewerNameVisible ?? false);
    setConfirmDeleteReview(false);
    setReviewOpen(true);
  };

  const submitLinkedReview = async () => {
    if (savingReview) return;
    setSavingReview(true);
    const ok = await saveLinkedReview(reviewRating, reviewText, showMyName);
    setSavingReview(false);
    if (ok) setReviewOpen(false);
  };

  const deleteLinkedReview = async () => {
    if (!confirmDeleteReview) {
      setConfirmDeleteReview(true);
      setTimeout(() => setConfirmDeleteReview(false), 3000);
      return;
    }
    setSavingReview(true);
    const ok = await removeLinkedReview();
    setSavingReview(false);
    if (ok) setReviewOpen(false);
  };

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
      <PageHeader
        title="Professionals"
        subtitle="Trainers, dietitians, physiotherapists & doctors"
        showBack
        right={
          <div role="group" aria-label="Show as" className="flex rounded-full border border-charcoal/10 bg-cream-card p-0.5 shrink-0">
            {(
              [
                { v: "list", label: "List", Icon: List },
                { v: "map", label: "Map", Icon: MapIcon },
              ] as const
            ).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`tap flex items-center gap-1 h-9 px-3 rounded-full text-[13px] font-bold ${
                  view === v ? "bg-primary text-white dark:text-[#0D0B1A]" : "text-charcoal-soft"
                }`}
              >
                <Icon size={14} aria-hidden /> {label}
              </button>
            ))}
          </div>
        }
      />

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
      {hasLinkedProfessional && (
        <Card
          interactive
          onClick={() => setLinkedProfileOpen(true)}
          className="mb-6 bg-gradient-to-br from-hero-from to-hero-to dark:from-primary/35 dark:to-primary/15 !text-white animate-fade-slide-up"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {(() => {
                const Icon = linkedIcon(linkedSubtype);
                return <Icon size={22} className="text-white" />;
              })()}
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Your professional</p>
              <p className="font-display font-semibold text-lg">{linkedName}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <ShieldCheck size={13} /> Linked to your account
            </div>
            {/* Disabled until the real relationship resolves. The card is
                rendered from local state, so it can be on screen a moment
                before professional_clients has answered — and a review sheet
                with nothing to attach the review to is worse than a button
                that waits. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openReviewSheet();
              }}
              disabled={!linkedProfessionalId}
              className="tap flex items-center gap-1 text-xs font-semibold text-white bg-white/15 rounded-full px-2.5 py-1 disabled:opacity-50"
            >
              <Pencil size={11} /> {myLinkedReview ? "Edit review" : "Rate & Review"}
            </button>
          </div>
          {myLinkedReview && (
            <div className="flex items-center gap-1 mt-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={13} className={i < myLinkedReview.rating ? "fill-white text-white" : "text-white/25"} />
              ))}
              {myLinkedReview.editedAt && (
                <span className="ml-1 text-[10px] font-semibold text-white/70 uppercase tracking-wide">
                  Edited
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      {/* The mock "My Dietitian" card that used to sit here is gone with
          mockProfessionals. It rendered a hired relationship with a person who
          had no account, beside the real linked-professional card directly
          above — two cards that looked alike where one was true. The real one
          covers this case. */}

      <div className="flex gap-2 scroll-row no-scrollbar pb-1 mb-5">
        <Chip active={type === null} onClick={() => setType(null)}>
          All
        </Chip>
        {(Object.keys(subtypeLabels) as Subtype[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {subtypeLabels[t]}
          </Chip>
        ))}
      </div>

      {view === "map" && (
        <NearbyView authUserId={authUserId} dark={theme === "dark"} subtype={type} directory={listings ?? []} />
      )}

      <div className={`space-y-3 ${view === "map" ? "hidden" : ""}`}>
        {filtered.map((p) => (
          <DirectoryCard key={p.profileId} listing={p} />
        ))}

        {/* The check's meaning, said once under the list rather than on
            every card — and only when a card actually carries one. */}
        {filtered.some((p) => p.hasVerifiedLicence) && <VerifiedExplainer />}

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
        title={`Rate ${linkedName.split(" ")[0]}`}
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
          {/* Same wording as the listing sheet, and same reason: the toggle
              controls who ELSE sees the name, not whether the professional can
              work out who wrote it. */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showMyName}
              onChange={(e) => setShowMyName(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-charcoal-soft leading-relaxed">
              Show my first name on this review —{" "}
              <span className="text-charcoal-faint">
                your professional can see who left it either way.
              </span>
            </span>
          </label>
          {reviewError && <p className="text-xs font-semibold text-status-high">{reviewError}</p>}
          <Button fullWidth size="lg" onClick={() => void submitLinkedReview()} disabled={savingReview}>
            {savingReview ? "Saving…" : myLinkedReview ? "Save changes" : "Submit review"}
          </Button>
          {myLinkedReview && (
            <button
              onClick={() => void deleteLinkedReview()}
              disabled={savingReview}
              className="tap w-full text-center text-xs font-semibold text-status-high py-2"
            >
              {confirmDeleteReview ? "Tap again to delete your review" : "Delete review"}
            </button>
          )}
        </div>
      </BottomSheet>

      {/* THE CONNECTED PROFESSIONAL'S REAL PROFILE AND CV. This sheet used to
          read a certification, bio, phone, website and socials from fields on
          this device that nothing ever wrote, so it always said "No
          certification uploaded yet." It now reads connected_professional_summary
          and the public CV views, which a connected client may always read —
          the same CV and Verified marks the public profile shows. The document
          itself is never shown to clients; the badge is what a client gets. */}
      <BottomSheet open={linkedProfileOpen} onClose={() => setLinkedProfileOpen(false)} title={linkedName} size="tall">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
              {linkedDetail?.avatarUrl ? (
                <img src={linkedDetail.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (() => {
                  const Icon = linkedIcon(linkedSubtype);
                  return <Icon size={22} className="text-primary-dark" />;
                })()
              )}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span className="font-display font-semibold text-lg text-charcoal truncate">
                  {linkedName}
                </span>
                {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={18} />}
              </p>
              {linkedDetail?.headline && (
                <p className="text-[13px] font-semibold text-primary-deep-text break-words">{linkedDetail.headline}</p>
              )}
              <p className="text-xs text-charcoal-soft">
                {[linkedDetail ? professionalRole(linkedDetail) : null, linkedDetail?.location].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {linkedError && <p className="text-sm text-status-high">{linkedError}</p>}
          {!linkedError && !linkedCv && linkedProfessionalId && <p className="text-sm text-charcoal-faint">Loading…</p>}

          {linkedDetail?.bio && (
            <div>
              <p className="text-xs font-bold text-charcoal-soft uppercase tracking-[0.06em] mb-1.5">About</p>
              <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">{linkedDetail.bio}</p>
            </div>
          )}

          {linkedCv && (cvIsEmpty(linkedCv, linkedDetail?.skills ?? []) ? (
            <p className="text-sm text-charcoal-faint">
              {linkedName.split(" ")[0]} hasn't added a CV yet.
            </p>
          ) : (
            <CvView cv={linkedCv} skills={linkedDetail?.skills ?? []} />
          ))}
          {linkedDetail?.hasVerifiedLicence && <VerifiedExplainer />}
        </div>
      </BottomSheet>
    </div>
  );
}
