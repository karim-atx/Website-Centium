import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
import { ActivityLevelSheet } from "../../components/profile/ActivityLevelSheet";
import { EditBodyStatsSheet } from "../../components/profile/EditBodyStatsSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { mockProfessionals } from "../../data/mockProfessionals";
import { professionalTypeIcon } from "../../utils/icons";
import { LINKED_PROFESSIONAL_REVIEW_ID } from "../professionals/Professionals";
import {
  Target,
  ChevronRight,
  LogOut,
  Camera,
  Image,
  Trash2,
  Activity,
  Pencil,
  Star,
} from "lucide-react";

const accountTypeLabel: Record<string, string> = {
  customer: "Customer",
  professional: "Professional",
  business: "Business",
};

export default function Profile() {
  const { user, updateProfile, signOut, connectedProfessionalIds, professionalReviews } = useApp();
  const navigate = useNavigate();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [activityLevelOpen, setActivityLevelOpen] = useState(false);
  const [bodyStatsOpen, setBodyStatsOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ avatarUrl: reader.result as string });
      setAvatarSheetOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    signOut();
    navigate("/onboarding");
  };

  // V6 (QA 6.0): weight/height/age, connected professionals and Goals are
  // client-only concepts — hidden for both professional and business
  // accounts, whose own profile has nothing to do with personal tracking.
  const hidesClientFields = user.accountType === "professional" || user.accountType === "business";
  const connectedProfessionals = hidesClientFields
    ? []
    : mockProfessionals.filter((p) => p.connected || connectedProfessionalIds.includes(p.id));

  // V4 (QA 4.0) trimmed to Goals + Help; V5 (QA 5.0) removes Help too —
  // Settings (reachable from More) already covers everything it pointed to.
  const sections = hidesClientFields
    ? []
    : [
        { icon: Target, label: "Goals", onClick: () => setGoalsOpen(true) },
        { icon: Activity, label: "Activity Level", onClick: () => setActivityLevelOpen(true) },
      ];

  return (
    <div>
      <PageHeader title="My Profile" showBack />

      <div className="flex items-center gap-4 mb-2 animate-fade-slide-up">
        <button
          onClick={() => setAvatarSheetOpen(true)}
          aria-label="Change profile picture"
          className="tap relative w-16 h-16 rounded-full bg-ember-pale flex items-center justify-center text-2xl font-bold text-ember-dark overflow-hidden shrink-0"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName.charAt(0)
          )}
        </button>
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">{user.firstName}</h2>
          <span className="inline-block text-[10px] font-bold text-charcoal-soft bg-cream-soft rounded-full px-2 py-0.5 mt-1">
            {accountTypeLabel[user.accountType]}
            {user.customerSubtype ? ` · ${user.customerSubtype}` : ""}
            {user.professionalSubtype ? ` · ${user.professionalSubtype}` : ""}
          </span>
        </div>
      </div>

      {/* V7 (QA 7.0): surfaces ratings/reviews clients have left for this
          professional — the same review a client submits from the "Your
          professional" card on their own Professionals tab. */}
      {user.accountType === "professional" && (
        <Card className="mb-6 mt-4 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Ratings & Reviews
          </p>
          {(() => {
            const review = professionalReviews.find((r) => r.professionalId === LINKED_PROFESSIONAL_REVIEW_ID);
            if (!review) {
              return <p className="text-sm text-charcoal-faint">No reviews from clients yet.</p>;
            }
            return (
              <>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={15} className={i < review.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                  ))}
                </div>
                {review.text && <p className="text-sm text-charcoal-soft leading-relaxed">{review.text}</p>}
              </>
            );
          })()}
        </Card>
      )}

      {!hidesClientFields && (
        <div className="relative mb-6 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center animate-fade-slide-up">
              <p className="text-lg font-bold text-charcoal">{user.weightKg}</p>
              <p className="text-[11px] text-charcoal-faint">kg</p>
            </Card>
            <Card className="text-center animate-fade-slide-up">
              <p className="text-lg font-bold text-charcoal">{user.heightCm}</p>
              <p className="text-[11px] text-charcoal-faint">cm</p>
            </Card>
            <Card className="text-center animate-fade-slide-up">
              <p className="text-lg font-bold text-charcoal">{user.age}</p>
              <p className="text-[11px] text-charcoal-faint">years</p>
            </Card>
          </div>
          {/* V7 (QA 7.0): one shared edit mark for weight/height/age instead
              of a separate edit affordance per box. */}
          <button
            onClick={() => setBodyStatsOpen(true)}
            aria-label="Edit weight, height and age"
            className="tap absolute -top-2 -right-2 w-7 h-7 rounded-full bg-charcoal text-cream flex items-center justify-center shadow-soft"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}

      {connectedProfessionals.length > 0 && (
        <div className="mb-6 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Connected professionals
          </p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {connectedProfessionals.map((p) => {
              const Icon = professionalTypeIcon[p.type];
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/professionals/${p.id}`)}
                  className="tap shrink-0 flex items-center gap-2.5 bg-cream-card rounded-2xl pl-2.5 pr-4 py-2.5 shadow-soft"
                >
                  <span className="w-9 h-9 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-sohati-dark" />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-charcoal whitespace-nowrap">{p.name}</p>
                    <p className="text-[10px] text-charcoal-faint whitespace-nowrap">{p.specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sections.length > 0 && (
      <Card padded={false} className="divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {sections.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <s.icon size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">{s.label}</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        ))}
      </Card>
      )}

      <button
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center gap-2 rounded-2xl border border-ember/30 text-ember-dark text-sm font-semibold py-3.5 mt-5"
      >
        <LogOut size={15} />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <ActivityLevelSheet open={activityLevelOpen} onClose={() => setActivityLevelOpen(false)} />
      <EditBodyStatsSheet open={bodyStatsOpen} onClose={() => setBodyStatsOpen(false)} />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
      />
      <BottomSheet open={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} hideHeader>
        <div className="space-y-2.5 animate-fade-slide-up">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Camera size={18} className="text-sohati" />
            <span className="text-sm font-semibold text-charcoal">Take a photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Image size={18} className="text-sohati" />
            <span className="text-sm font-semibold text-charcoal">Choose from library</span>
          </button>
          <button
            onClick={() => {
              updateProfile({ avatarUrl: undefined });
              setAvatarSheetOpen(false);
            }}
            disabled={!user.avatarUrl}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Trash2 size={18} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Remove photo</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
