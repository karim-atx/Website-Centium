import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { mockProfessionals } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import type { ProfessionalType } from "../../types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Star, ShieldCheck, UserCheck, Pencil, BadgeCheck } from "lucide-react";
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

const typeLabels: Record<ProfessionalType, string> = {
  trainer: "Personal Trainers",
  dietitian: "Dietitians",
  physiotherapist: "Physiotherapists",
  doctor: "Doctors / GPs",
};

export default function Professionals() {
  const navigate = useNavigate();
  const { user, connectedProfessionalIds, professionalReviews, submitProfessionalReview } = useApp();
  const [type, setType] = useState<ProfessionalType | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);
  const myLinkedReview = professionalReviews.find((r) => r.professionalId === LINKED_PROFESSIONAL_REVIEW_ID);
  const [reviewRating, setReviewRating] = useState(myLinkedReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(myLinkedReview?.text ?? "");

  const isConnected = (p: { id: string; connected?: boolean }) =>
    p.connected || connectedProfessionalIds.includes(p.id);
  // V10 (QA 10.0): "hired professionals should get updated every time the
  // client hires a professional" — show every currently hired professional
  // (up to one per specialty), not just the first match in array order.
  const connectedList = mockProfessionals.filter(isConnected);
  const filtered = type ? mockProfessionals.filter((p) => p.type === type) : mockProfessionals;

  // Professionals get an entirely different dashboard here (client roster,
  // not a directory to browse) — separate UI per QA, not just a banner.
  if (user.accountType === "professional") {
    return <ProfessionalDashboard />;
  }

  return (
    <div>
      <PageHeader title="Professionals" subtitle="Trainers, dietitians, physiotherapists & doctors" showBack />

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

      {connectedList.map((connected) => (
        <Card
          key={connected.id}
          interactive
          onClick={() => navigate(`/app/professionals/${connected.id}`)}
          className="mb-6 bg-gradient-to-br from-primary to-primary-dark !text-white animate-fade-slide-up"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {(() => {
                const Icon = professionalTypeIcon[connected.type];
                return <Icon size={22} className="text-white" />;
              })()}
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">My {typeLabels[connected.type].replace(/s$/, "")}</p>
              <p className="font-display font-semibold text-lg">{connected.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <ShieldCheck size={13} /> Client since August 2026
          </div>
        </Card>
      ))}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        <Chip active={type === null} onClick={() => setType(null)}>
          All
        </Chip>
        {(Object.keys(typeLabels) as ProfessionalType[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {typeLabels[t]}
          </Chip>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="animate-fade-slide-up">
            <div className="flex items-start gap-3.5 mb-3">
              <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = professionalTypeIcon[p.type];
                  return <Icon size={19} className="text-primary-dark" />;
                })()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-charcoal text-sm">{p.name}</p>
                  <span className="flex items-center gap-1 text-xs font-bold text-gold shrink-0">
                    <Star size={12} className="fill-gold" /> {p.rating}
                  </span>
                </div>
                <p className="text-xs text-primary-dark font-medium">{p.specialty}</p>
                <p className="text-xs text-charcoal-faint">{p.location} · {p.reviews} reviews</p>
              </div>
            </div>
            <p className="text-xs text-charcoal-soft mb-3.5 leading-relaxed">{p.bio}</p>
            <Button size="sm" fullWidth variant={isConnected(p) ? "secondary" : "primary"} onClick={() => navigate(`/app/professionals/${p.id}`)}>
              View Profile
            </Button>
          </Card>
        ))}
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
        </div>
      </BottomSheet>
    </div>
  );
}
