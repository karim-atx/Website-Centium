import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
import { ActivityLevelSheet } from "../../components/profile/ActivityLevelSheet";
import { CertificationSheet } from "../../components/profile/CertificationSheet";
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
  Star,
  Crown,
  BadgeCheck,
  Mail,
  Phone,
  Globe,
  Globe2,
  Award,
  AtSign,
  XIcon,
  HeartHandshake,
  BellOff,
} from "lucide-react";
import { Toggle } from "../../components/ui/Toggle";

const accountTypeLabel: Record<string, string> = {
  customer: "Customer",
  professional: "Professional",
  business: "Business",
};

export default function Profile() {
  const {
    user,
    updateProfile,
    signOut,
    connectedProfessionalIds,
    professionalReviews,
    premiumPlan,
    referralNextMonthDiscountPct,
    recoverySensitive,
    setRecoverySensitive,
    setRecoverySensitiveIntroSeen,
    remindersPaused,
    setRemindersPaused,
  } = useApp();
  const navigate = useNavigate();
  const [justToggledRecovery, setJustToggledRecovery] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [activityLevelOpen, setActivityLevelOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  // V8 (QA 8.0): "Remove the pencil edit logo. Instead each of the age,
  // height and weight is editable if pressed on separately. When you click
  // away from the edited box, the new value gets set. Do not include a
  // checkmark logo." — replaces the single shared edit-sheet affordance.
  const [editingField, setEditingField] = useState<"weightKg" | "heightCm" | "age" | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
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

  const startEditing = (field: "weightKg" | "heightCm" | "age") => {
    setEditingField(field);
    setFieldDraft(String(user[field]));
  };

  const commitEditing = () => {
    if (!editingField) return;
    const n = Number(fieldDraft);
    if (n > 0) updateProfile({ [editingField]: n });
    setEditingField(null);
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    signOut();
    navigate("/app/onboarding");
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
          className="tap relative w-16 h-16 rounded-full bg-teal-pale flex items-center justify-center text-2xl font-bold text-teal-dark overflow-hidden shrink-0"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName.charAt(0)
          )}
        </button>
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal flex items-center gap-1.5">
            {user.firstName}
            {premiumPlan && <Crown size={15} className="text-gold fill-gold shrink-0" aria-label="Centium Premium" />}
            {/* QA 11.0: "Similar to the logo that appears... if the client has
                a subscription, have another minimalistic logo that indicates
                they are an ambassador." This prototype has no real
                multi-account backend to detect someone else redeeming your
                code, so a successful referral is simulated on this same
                account (see ReferralSheet) and reused here as the trigger. */}
            {referralNextMonthDiscountPct > 0 && (
              <Award size={15} className="text-primary-dark shrink-0" aria-label="Centium Ambassador" />
            )}
          </h2>
          <span className="inline-block text-[10px] font-bold text-charcoal-soft bg-cream-soft rounded-full px-2 py-0.5 mt-1">
            {accountTypeLabel[user.accountType]}
            {user.customerSubtype ? ` · ${user.customerSubtype}` : ""}
            {user.professionalSubtype ? ` · ${user.professionalSubtype}` : ""}
          </span>
        </div>
      </div>

      {/* QA 12.0: "Reorganize the profile tab, The bio should be first
          followed by rating/reviews then certification. then credentials." */}
      {user.accountType === "professional" && (
        <Card className="mb-6 mt-4 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Bio</p>
          <textarea
            value={user.professionalBio ?? ""}
            onChange={(e) => updateProfile({ professionalBio: e.target.value })}
            placeholder="This will appear to clients on your Explore listing."
            rows={3}
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </Card>
      )}

      {/* V7 (QA 7.0): surfaces ratings/reviews clients have left for this
          professional — the same review a client submits from the "Your
          professional" card on their own Professionals tab. */}
      {user.accountType === "professional" && (
        <Card className="mb-6 animate-fade-slide-up">
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

      {/* V8 (QA 8.0): "move the certification button from More into My
          Profile tab instead" — was previously reachable only from More. */}
      {user.accountType === "professional" && (
        <Card padded={false} className="mb-6 animate-fade-slide-up">
          <button
            onClick={() => setCertOpen(true)}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <BadgeCheck size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">Certification</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        </Card>
      )}

      {/* QA 12.0: "credentials which when pressed shows you all relevant
          info including social media" — was an always-expanded card;
          now a single tappable summary row opening the same fields (plus
          socials) in a sheet, for both account types. */}
      {user.accountType === "professional" && (
        <Card padded={false} className="mb-6 animate-fade-slide-up">
          <button
            onClick={() => setCredentialsOpen(true)}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <Mail size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">Credentials</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        </Card>
      )}

      {!hidesClientFields && (
        <div className="grid grid-cols-3 gap-3 mb-6 mt-4">
          {(
            [
              { field: "weightKg" as const, value: user.weightKg, unit: "kg" },
              { field: "heightCm" as const, value: user.heightCm, unit: "cm" },
              { field: "age" as const, value: user.age, unit: "years" },
            ]
          ).map((f) => (
            <Card
              key={f.field}
              interactive={editingField !== f.field}
              onClick={() => editingField !== f.field && startEditing(f.field)}
              className="text-center animate-fade-slide-up"
            >
              {editingField === f.field ? (
                <input
                  autoFocus
                  value={fieldDraft}
                  onChange={(e) => setFieldDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={commitEditing}
                  onKeyDown={(e) => e.key === "Enter" && commitEditing()}
                  inputMode="decimal"
                  className="w-full text-lg font-bold text-charcoal text-center bg-transparent focus:outline-none"
                />
              ) : (
                <p className="text-lg font-bold text-charcoal">{f.value}</p>
              )}
              <p className="text-[11px] text-charcoal-faint">{f.unit}</p>
            </Card>
          ))}
        </div>
      )}

      {/* QA 12.0: "Reorder the widgets under the profile picture and name
          to have the weight, height and age first then credentials which
          when pressed shows you all relevant info including social media
          you can link like Instagram and X." */}
      {user.accountType === "customer" && (
        <Card padded={false} className="mb-6 animate-fade-slide-up">
          <button
            onClick={() => setCredentialsOpen(true)}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <Mail size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">Credentials</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        </Card>
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
                  onClick={() => navigate(`/app/professionals/${p.id}`)}
                  className="tap shrink-0 flex items-center gap-2.5 bg-cream-card rounded-2xl pl-2.5 pr-4 py-2.5 shadow-soft"
                >
                  <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary-dark" />
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
      <>
      {/* V8 (QA 8.0): "Have a common title fir Goals and Activity level" */}
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Goals & Activity
      </p>
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
      </>
      )}

      {/* QA 12.0: "Have a section called Safety & content, whereby it
          offers a togglable ED-sensitive mode... Avoid calling it a 'ED
          toggle' rather something like Recovery-sensitive experience...
          Do not make the user explain why they selected it... A
          Description would look like: [...]. the Confirmation after
          enabling: [...]. Pause option: [...]." Copy below is used as
          given.
          QA 13.0: "make Safety & content a title like goals and activity" —
          the label now sits outside the card as an eyebrow, matching the
          "Goals & Activity" pattern above, instead of being the card's
          first line. */}
      {user.accountType === "customer" && (
        <>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Safety & content
          </p>
          <Card className="mb-6 animate-fade-slide-up">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2.5 text-sm font-bold text-charcoal">
              <HeartHandshake size={16} className="text-primary-dark shrink-0" />
              Recovery-sensitive experience
            </span>
            <Toggle
              checked={recoverySensitive}
              onChange={(v) => {
                setRecoverySensitive(v);
                if (v) {
                  setJustToggledRecovery(true);
                  setRecoverySensitiveIntroSeen(false);
                  window.setTimeout(() => setJustToggledRecovery(false), 6000);
                }
              }}
              label="Recovery-sensitive experience"
            />
          </div>
          {/* QA 13.0: "Have it where when the toggle is on it shows the
              text under." */}
          {recoverySensitive && (
            <p className="text-xs text-charcoal-faint leading-relaxed">
              Personalize food tracking to reduce number-focused and potentially triggering content. You
              control what is shown, and you can change this at any time.
            </p>
          )}
          {justToggledRecovery && (
            <p className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed">
              Your experience has been updated: calorie totals, weight-related content, deficit language,
              and streaks are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness
              instead.
            </p>
          )}
          {recoverySensitive && (
            <>
              <button
                onClick={() => setRemindersPaused(!remindersPaused)}
                className="tap flex items-center gap-1.5 text-xs font-semibold text-primary-dark mt-3"
              >
                <BellOff size={13} /> {remindersPaused ? "Resume reminders" : "Pause reminders"}
              </button>
              {remindersPaused && (
                <p className="text-[11px] text-charcoal-faint mt-1.5 leading-relaxed">
                  Taking a break is okay. You can pause meal reminders and return whenever you're ready.
                </p>
              )}
            </>
          )}
          <p className="text-[11px] text-charcoal-faint leading-relaxed mt-3 pt-3 border-t border-charcoal/[0.06]">
            This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a{" "}
            <button onClick={() => navigate("/professionals")} className="tap text-primary-dark font-semibold underline">
              professional
            </button>
            .
          </p>
          </Card>
        </>
      )}

      <button
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center gap-2 rounded-2xl border border-teal/30 text-teal-dark text-sm font-semibold py-3.5 mt-5"
      >
        <LogOut size={15} />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <ActivityLevelSheet open={activityLevelOpen} onClose={() => setActivityLevelOpen(false)} />
      {user.accountType === "professional" && (
        <CertificationSheet open={certOpen} onClose={() => setCertOpen(false)} />
      )}

      <BottomSheet open={credentialsOpen} onClose={() => setCredentialsOpen(false)} title="Credentials">
        <div className="space-y-2.5 animate-fade-slide-up">
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Mail size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={user.email}
              readOnly
              className="flex-1 bg-transparent text-sm text-charcoal-faint focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <Phone size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={user.accountType === "professional" ? user.professionalPhone ?? "" : user.phone ?? ""}
              onChange={(e) =>
                updateProfile(
                  user.accountType === "professional"
                    ? { professionalPhone: e.target.value }
                    : { phone: e.target.value }
                )
              }
              placeholder="Phone number"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          {user.accountType === "professional" && (
            <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
              <Globe size={15} className="text-charcoal-faint shrink-0" />
              <input
                value={user.professionalWebsite ?? ""}
                onChange={(e) => updateProfile({ professionalWebsite: e.target.value })}
                placeholder="Website"
                className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
            </div>
          )}
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide pt-2">Social</p>
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <AtSign size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={user.accountType === "professional" ? user.professionalInstagram ?? "" : user.instagramHandle ?? ""}
              onChange={(e) =>
                updateProfile(
                  user.accountType === "professional"
                    ? { professionalInstagram: e.target.value }
                    : { instagramHandle: e.target.value }
                )
              }
              placeholder="Instagram"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          {user.accountType === "professional" && (
            <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
              <Globe2 size={15} className="text-charcoal-faint shrink-0" />
              <input
                value={user.professionalFacebook ?? ""}
                onChange={(e) => updateProfile({ professionalFacebook: e.target.value })}
                placeholder="Facebook"
                className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2.5 bg-cream-soft rounded-xl px-3.5 py-2.5">
            <XIcon size={15} className="text-charcoal-faint shrink-0" />
            <input
              value={user.accountType === "professional" ? user.professionalX ?? "" : user.xHandle ?? ""}
              onChange={(e) =>
                updateProfile(user.accountType === "professional" ? { professionalX: e.target.value } : { xHandle: e.target.value })
              }
              placeholder="X (Twitter)"
              className="flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-charcoal-faint pt-1">
            Whichever of these you fill in shows on your {user.accountType === "professional" ? "Explore listing" : "profile"}.
          </p>
        </div>
      </BottomSheet>

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
            <Camera size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Take a photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Image size={18} className="text-primary" />
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
