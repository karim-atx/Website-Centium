import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
import { ProfessionalBioCard } from "../../components/profile/ProfessionalBioCard";
import { ActivityLevelSheet } from "../../components/profile/ActivityLevelSheet";
import { CertificationSheet } from "../../components/profile/CertificationSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { useIsAmbassador } from "../../hooks/useIsAmbassador";
import { ReviewsAboutMeCard } from "../../components/professionals/ReviewsAboutMeCard";
import { AVATAR_ACCEPT, removeAvatar, uploadAvatar } from "../../services/avatar";
import { DataSharingSection } from "../../components/professionals/DataSharingSection";
import { MembershipsCard } from "../../components/profile/MembershipsCard";
import { fetchLinkedProfessionals, type LinkedProfessional } from "../../services/consent";
import { updateBodyMetric, updateDateOfBirth, updateSex } from "../../services/profile";
import type { Sex } from "../../types";
import { validateHeightCm, validateWeightKg } from "../../utils/bodyMetrics";
import {
  ageFromDateOfBirth,
  formatDisplayDate,
  isoDateYearsAgo,
  validateDateOfBirth,
  MIN_AGE,
  MAX_AGE,
} from "../../utils/date";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Camera,
  Image,
  Trash2,
  Crown,
  BadgeCheck,
  FileText,
  Award,
  Flag,
  Gauge,
  HeartHandshake,
  KeyRound,
  Plus,
} from "lucide-react";
import { Toggle } from "../../components/ui/Toggle";
import { TrackerQuestion } from "../../components/cycle/TrackerQuestion";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { HealthChecksSetting } from "../../components/health-checks/HealthChecksSetting";
import { CredentialsPopup } from "../../components/profile/CredentialsPopup";
import { ProfessionalCodeCard } from "../../components/profile/ProfessionalCodeCard";
import { CycleTrackingRow } from "../../components/profile/CycleTrackingRow";
import { initials } from "../../components/professionals/typeColour";

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
    authUserId,
    premiumPlan,
    recoverySensitive,
    setRecoverySensitive,
    setRecoverySensitiveIntroSeen,
  } = useApp();
  const isAmbassador = useIsAmbassador();
  const navigate = useNavigate();
  const [justToggledRecovery, setJustToggledRecovery] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [activityLevelOpen, setActivityLevelOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  // V8 (QA 8.0) made each of age/height/weight editable by tapping the card
  // itself. That still holds — what changed is where the edit happens and
  // what it does. These values now persist to `profiles`, so an edit has to
  // be able to fail and say so; an inline input committing on blur has
  // nowhere to put an error or a saving state. Each card therefore opens a
  // sheet, matching the date-of-birth editor.
  const [metricOpen, setMetricOpen] = useState<"weightKg" | "heightCm" | null>(null);
  // Sex, editable after onboarding for the first time. It was collected once
  // and then unreachable, while four things read it -- the BMR constant behind
  // every calorie target, the test recommendations, the exercise-library
  // figure, and now the cycle tracker's default.
  const [sexOpen, setSexOpen] = useState(false);
  const [sexSaving, setSexSaving] = useState(false);
  const [sexError, setSexError] = useState<string | null>(null);
  const [metricDraft, setMetricDraft] = useState("");
  const [metricError, setMetricError] = useState<string | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [savingDob, setSavingDob] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // A REAL UPLOAD NOW, not a FileReader. What this used to do was read the
  // file into a base64 `data:` URL and put it in local state — so the picture
  // lived in one browser's localStorage, profiles.avatar_url stayed empty,
  // and nobody else ever saw it: not a coach looking at their client list,
  // not the other side of a message thread, not the same person on a second
  // device. See services/avatar.
  //
  // LOCAL STATE IS UPDATED LAST, from the URL the server gave back, so what
  // is on screen is what is actually stored rather than an optimistic guess
  // that a failed upload would leave standing.
  const handleAvatarFile = async (file: File) => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await uploadAvatar(authUserId, file, user.avatarUrl);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message);
      return;
    }
    updateProfile({ avatarUrl: result.url });
    setAvatarSheetOpen(false);
  };

  const handleAvatarRemove = async () => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await removeAvatar(authUserId, user.avatarUrl);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message ?? "Couldn't remove your picture.");
      return;
    }
    updateProfile({ avatarUrl: undefined });
    setAvatarSheetOpen(false);
  };

  const openMetricEditor = (field: "weightKg" | "heightCm") => {
    setMetricDraft(String(user[field]));
    setMetricError(null);
    setMetricOpen(field);
  };

  const saveMetric = async () => {
    if (!metricOpen) return;
    const value = Number(metricDraft);
    const message =
      metricOpen === "weightKg" ? validateWeightKg(value) : validateHeightCm(value);
    if (message) {
      setMetricError(message);
      return;
    }
    if (!authUserId) {
      setMetricError("You need to be signed in to change this.");
      return;
    }
    setSavingMetric(true);
    const result = await updateBodyMetric(
      authUserId,
      metricOpen === "weightKg" ? "weight_kg" : "height_cm",
      value
    );
    setSavingMetric(false);
    if (!result.ok) {
      setMetricError(result.message ?? "Could not save that. Try again.");
      return;
    }
    // Mirror locally so the card updates immediately; the next profile
    // hydration reads the same value back from the server.
    updateProfile({ [metricOpen]: value });
    setMetricOpen(null);
  };

  const saveSex = async (sex: Sex) => {
    if (!authUserId) {
      setSexError("You need to be signed in to change this.");
      return;
    }
    setSexSaving(true);
    setSexError(null);
    const result = await updateSex(authUserId, sex);
    setSexSaving(false);
    if (!result.ok) {
      setSexError(result.message ?? "Could not save that. Try again.");
      return;
    }
    // RECALCULATES, NEVER DELETES. updateProfile feeds the new value straight
    // back into calculateTDEE and the health checks. MO11: it writes no
    // tracker data either — cycle and pregnancy visibility is derived from sex
    // (and any opt-in) at render, so switching back restores everything.
    updateProfile({ sex });
    setSexOpen(false);
  };

  const openDobEditor = () => {
    setDobDraft(user.dateOfBirth ?? "");
    setDobError(null);
    setDobOpen(true);
  };

  const saveDob = async () => {
    const message = validateDateOfBirth(dobDraft);
    if (message) {
      setDobError(message);
      return;
    }
    if (!authUserId) {
      setDobError("You need to be signed in to change this.");
      return;
    }
    setSavingDob(true);
    const result = await updateDateOfBirth(authUserId, dobDraft);
    setSavingDob(false);
    if (!result.ok) {
      setDobError(result.message ?? "Could not save that. Try again.");
      return;
    }
    // Mirror into local state so the card updates immediately; the next
    // profile hydration will read the same value back from the server.
    updateProfile({ dateOfBirth: dobDraft, age: ageFromDateOfBirth(dobDraft) ?? user.age });
    setDobOpen(false);
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

  // Real relationships only. This used to list `mockProfessionals` filtered
  // by `connectedProfessionalIds` — the browse directory's local "Connect"
  // bookmarks, whose ids ("pr1") are not accounts. Those entries can't hold
  // a consent grant, so surfacing them beside data-sharing controls would
  // offer settings that could never be written. Same reason the mock roster
  // and the default-on grants went.
  const [connectedProfessionals, setConnectedProfessionals] = useState<LinkedProfessional[]>([]);
  const [sharingFor, setSharingFor] = useState<LinkedProfessional | null>(null);
  // "Connect with a professional code" reveals the code box (C7).
  const [connectOpen, setConnectOpen] = useState(false);
  // Safety & content starts collapsed (C5).
  const [safetyOpen, setSafetyOpen] = useState(false);

  // After a code connects: the list again, and the box closes.
  const reloadProfessionals = async () => {
    const result = await fetchLinkedProfessionals();
    if (result.status === "ok") setConnectedProfessionals(result.professionals);
    setConnectOpen(false);
  };

  useEffect(() => {
    if (hidesClientFields || !authUserId) {
      setConnectedProfessionals([]);
      return;
    }
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled) return;
      if (result.status === "ok") setConnectedProfessionals(result.professionals);
    });
    return () => {
      cancelled = true;
    };
  }, [hidesClientFields, authUserId]);

  // MO1.5 / MO1.5.1 (R15, batch C). A centred hero (avatar, name, account
  // chip, Credentials) between two tiles that keep tap-to-edit (weight and
  // sex on the left, height and age on the right); then Memberships, the
  // professionals card, Training plan as two tiles, Safety & content
  // collapsed, and Sign Out as a text link. Colours are today's (C12).
  const tile = (
    top: { value: React.ReactNode; unit: string; onClick: () => void; label: string },
    bottom: { value: React.ReactNode; unit: string; onClick: () => void; label: string }
  ) => (
    <div className="rounded-2xl bg-cream-card border border-charcoal/[0.08] flex flex-col overflow-hidden min-w-0">
      {[top, bottom].map((part, i) => (
        <button
          key={part.unit}
          type="button"
          onClick={part.onClick}
          aria-label={part.label}
          className={clsx(
            "tap flex-1 flex flex-col items-center justify-center px-1 py-3",
            i === 1 && "border-t border-charcoal/[0.08] mx-3"
          )}
        >
          <span className="text-[20px] font-bold leading-tight text-charcoal tabular-nums capitalize">{part.value}</span>
          <span className="text-[11px] text-charcoal-faint">{part.unit}</span>
        </button>
      ))}
    </div>
  );

  const sectionLabel = (text: string, id?: string) => (
    <p id={id} className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
      {text}
    </p>
  );

  return (
    <div>
      <PageHeader title="My Profile" showBack />

      <div
        className={clsx(
          "mb-6 animate-fade-slide-up",
          hidesClientFields
            ? "flex flex-col items-center"
            : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,1fr)] gap-2.5 items-stretch"
        )}
      >
        {!hidesClientFields &&
          tile(
            {
              value: user.weightKg,
              unit: "kg",
              onClick: () => openMetricEditor("weightKg"),
              label: `Weight, ${user.weightKg} kg. Edit`,
            },
            {
              value: user.sex,
              unit: "sex",
              onClick: () => {
                setSexError(null);
                setSexOpen(true);
              },
              label: `Sex, ${user.sex}. Edit`,
            }
          )}

        <div className="flex flex-col items-center text-center min-w-0">
          <button
            onClick={() => setAvatarSheetOpen(true)}
            aria-label="Change profile picture"
            className="tap relative w-[84px] h-[84px] rounded-full bg-teal-pale flex items-center justify-center text-[34px] font-bold text-charcoal-soft dark:text-teal-deep-text overflow-hidden shrink-0"
          >
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.firstName.charAt(0)}
          </button>
          <h2 className="mt-2.5 font-display text-[20px] font-bold leading-tight text-charcoal flex items-center justify-center gap-1.5 max-w-full">
            {/* Wraps rather than truncating: the centre column is narrow. */}
            <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]">{user.firstName}</span>
            {premiumPlan && <Crown size={15} className="text-gold fill-gold shrink-0" aria-label="Centium Premium" />}
            {/* QA 11.0 ambassador badge: a granted status (ambassador_grants,
                read through is_ambassador()), not "one referral". */}
            {isAmbassador && <Award size={15} className="text-primary-dark shrink-0" aria-label="Centium Ambassador" />}
          </h2>
          <span className="inline-block text-[11px] font-bold text-charcoal-soft bg-cream-soft rounded-full px-2.5 py-0.5 mt-1.5 max-w-full truncate">
            {accountTypeLabel[user.accountType]}
            {user.customerSubtype ? ` · ${user.customerSubtype}` : ""}
            {user.professionalSubtype ? ` · ${user.professionalSubtype}` : ""}
          </span>
          {/* QA 12.0: Credentials shows everything relevant, including the
              social accounts. Customers only, as before: a professional's
              socials live on their public listing. */}
          {user.accountType === "customer" && (
            <button
              type="button"
              onClick={() => setCredentialsOpen(true)}
              className="tap mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary-pale px-3.5 py-1.5 text-[13px] font-semibold text-primary-deep-text"
            >
              <KeyRound size={14} aria-hidden />
              Credentials
            </button>
          )}
        </div>

        {!hidesClientFields &&
          tile(
            {
              value: user.heightCm,
              unit: "cm",
              onClick: () => openMetricEditor("heightCm"),
              label: `Height, ${user.heightCm} cm. Edit`,
            },
            {
              // No date of birth on file (an older account): a dash, not the
              // default age the local profile falls back to.
              value: user.dateOfBirth ? user.age : "–",
              unit: "years",
              onClick: openDobEditor,
              label: user.dateOfBirth ? `Age, ${user.age}. Date of birth` : "Add your date of birth",
            }
          )}
      </div>

      {/* QA 12.0: "The bio should be first followed by rating/reviews then
          certification." */}
      {user.accountType === "professional" && <ProfessionalBioCard />}
      {/* V7 (QA 7.0): the ratings and reviews clients left. */}
      {user.accountType === "professional" && <ReviewsAboutMeCard className="mb-6 animate-fade-slide-up" />}
      {/* My CV: licences, experience, education and the rest. */}
      {user.accountType === "professional" && (
        <Card padded={false} className="mb-3 animate-fade-slide-up">
          <button onClick={() => navigate("/app/profile/cv")} className="tap w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <FileText size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">My CV</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        </Card>
      )}
      {/* V8 (QA 8.0): certification lives in My Profile. */}
      {user.accountType === "professional" && (
        <Card padded={false} className="mb-6 animate-fade-slide-up">
          <button onClick={() => setCertOpen(true)} className="tap w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <BadgeCheck size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">Certification</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        </Card>
      )}

      {/* Task R: right under the sex tile, because switching to female or
          other is when a tracker somebody never chose to switch off is found
          off. Also on Health, where the Cycle card would be. */}
      <TrackerQuestion className="mb-6" />

      {/* Task T: only for an older account with no date of birth. */}
      <DobPromptCard className="mb-6" />

      {/* Business memberships: invitations to answer, memberships to leave,
          and the code box. Customers only. */}
      {user.accountType === "customer" && <MembershipsCard />}

      {/* MO1.5 "Professionals" / MO1.5.1 "Connected professionals": the real
          relationships, each opening its own data-sharing controls, and the
          code box to connect another (C7, C9). Customers only. */}
      {user.accountType === "customer" && (
        <section className="mb-6 animate-fade-slide-up">
          {sectionLabel(connectedProfessionals.length > 0 ? "Connected professionals" : "Professionals")}
          {connectedProfessionals.length === 0 ? (
            <Card>
              <ProfessionalCodeCard onConnected={() => void reloadProfessionals()} />
            </Card>
          ) : (
            <div className="space-y-2.5">
              {connectedProfessionals.map((p) => (
                <button
                  key={p.professionalId}
                  type="button"
                  onClick={() => setSharingFor(p)}
                  className="tap w-full flex items-center gap-3 rounded-2xl border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
                >
                  <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden text-[14px] font-bold text-primary-dark">
                    {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(p.name)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-charcoal truncate">{p.name}</span>
                    <span className="block text-xs text-charcoal-faint">Manage data sharing</span>
                  </span>
                  <ChevronRight size={16} className="text-charcoal-tertiary shrink-0 rtl:-scale-x-100" aria-hidden />
                </button>
              ))}
              {connectOpen ? (
                <Card>
                  <ProfessionalCodeCard onConnected={() => void reloadProfessionals()} />
                </Card>
              ) : (
                <button
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  className="tap w-full flex items-center gap-3 rounded-2xl border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
                >
                  <span className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                    <Plus size={18} className="text-primary-dark" />
                  </span>
                  <span className="flex-1 min-w-0 text-[15px] font-semibold text-charcoal">Connect with a professional code</span>
                  <ChevronRight size={16} className="text-charcoal-tertiary shrink-0 rtl:-scale-x-100" aria-hidden />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* MO1.5 "Training plan" (C4): Goals and Activity Level as two tiles,
          opening the same sheets as before. Customers only. */}
      {!hidesClientFields && (
        <section className="mb-6 animate-fade-slide-up">
          {sectionLabel("Training plan")}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: Flag, label: "Goals", onClick: () => setGoalsOpen(true) },
              { icon: Gauge, label: "Activity Level", onClick: () => setActivityLevelOpen(true) },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={s.onClick}
                className="tap flex items-center gap-2 rounded-2xl border border-charcoal/[0.08] bg-cream-card px-3 py-3.5 text-start min-w-0"
              >
                <span className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center shrink-0" aria-hidden>
                  <s.icon size={16} className="text-charcoal-soft" />
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold leading-tight text-charcoal">{s.label}</span>
                <ChevronRight size={15} className="text-charcoal-tertiary shrink-0 rtl:-scale-x-100" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* QA 12.0 Safety & content (Recovery-sensitive experience, copy as
          given), now collapsible and collapsed by default (C5), holding one
          Recovery card with Cycle tracking (moved from Settings, C6), then
          Advanced health monitoring. Customers only. */}
      {user.accountType === "customer" && (
        <section className="mb-6">
          <button
            type="button"
            onClick={() => setSafetyOpen((o) => !o)}
            aria-expanded={safetyOpen}
            aria-controls="safety-content"
            className="tap w-full flex items-center justify-between gap-3 mb-2.5 text-start"
          >
            <span className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Safety & content</span>
            <ChevronDown
              size={16}
              aria-hidden
              className={clsx("text-charcoal-tertiary transition-transform", safetyOpen && "rotate-180")}
            />
          </button>
          {safetyOpen && (
            <div id="safety-content" className="animate-fade-slide-up">
              <Card className="mb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center shrink-0" aria-hidden>
                      <HeartHandshake size={16} className="text-primary-dark" />
                    </span>
                    <span className="text-sm font-bold text-charcoal">Recovery-sensitive experience</span>
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
                {/* QA 13.0: when the toggle is on it shows the text under. */}
                {recoverySensitive && (
                  <p className="text-xs text-charcoal-faint leading-relaxed">
                    Personalize food tracking to reduce number-focused and potentially triggering content. You control
                    what is shown, and you can change this at any time.
                  </p>
                )}
                {justToggledRecovery && (
                  <p className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed">
                    Your experience has been updated: calorie totals, weight-related content, deficit language, and streaks
                    are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness instead.
                  </p>
                )}
                {/* Task X: what is true, said instead of a pause that paused
                    nothing: where the setting lives, and who sees it. */}
                <p className="text-[11px] text-charcoal-faint mt-2 leading-relaxed">
                  Saved to your account, so it's the same on every device you sign in on. Professionals you work with are
                  never told whether it's on.
                </p>
                <p className="text-[11px] text-charcoal-faint leading-relaxed mt-3 pt-3 border-t border-charcoal/[0.06]">
                  This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a{" "}
                  <button onClick={() => navigate("/app/professionals")} className="tap text-primary-dark font-semibold underline">
                    professional
                  </button>
                  .
                </p>
                <div className="mt-3.5 pt-3.5 border-t border-charcoal/[0.06]">
                  <CycleTrackingRow />
                </div>
              </Card>
              <HealthChecksSetting />
            </div>
          )}
        </section>
      )}

      {/* Cycle tracking for a professional: same switch, same rule as it had
          in Settings (every account type), in its own section here (C6). */}
      {user.accountType === "professional" && (
        <section className="mb-6">
          {sectionLabel("Health tracking")}
          <Card>
            <CycleTrackingRow />
          </Card>
        </section>
      )}

      {/* Sign Out as a text link (MO1.5), still tap-twice to confirm. */}
      <button
        onClick={handleSignOut}
        className="tap mx-auto mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-[15px] font-semibold text-teal-dark"
      >
        <LogOut size={16} aria-hidden />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <ActivityLevelSheet open={activityLevelOpen} onClose={() => setActivityLevelOpen(false)} />
      {user.accountType === "professional" && (
        <CertificationSheet key={certOpen ? "cert-open" : "cert-closed"} open={certOpen} onClose={() => setCertOpen(false)} />
      )}

      {/* Keyed on open, so every opening starts from what is saved: tapping
          outside discards the edits (C10). */}
      {user.accountType === "customer" && (
        <CredentialsPopup
          key={credentialsOpen ? "cred-open" : "cred-closed"}
          open={credentialsOpen}
          onClose={() => setCredentialsOpen(false)}
        />
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        capture="user"
        className="hidden"
        // Cleared after every pick so choosing the SAME file again still fires
        // onChange — otherwise a rejected photo cannot be retried without
        // picking something else first. Same fix the capture flows carry.
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) void handleAvatarFile(picked);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) void handleAvatarFile(picked);
        }}
      />
      {/* Weight and height. One sheet for both — the fields differ only by
          label, unit and bound, and two near-identical sheets would drift. */}
      <BottomSheet open={sexOpen} onClose={() => setSexOpen(false)} title="Sex">
        <div className="animate-fade-slide-up">
          <p className="text-[12.5px] text-charcoal-soft mb-3 leading-relaxed">
            Used to estimate your calorie needs and to suggest which health checks may be
            relevant.
          </p>
          <div className="flex flex-col gap-2">
            {(["female", "male", "other"] as Sex[]).map((option) => (
              <button
                key={option}
                onClick={() => void saveSex(option)}
                disabled={sexSaving}
                className={`tap w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize disabled:opacity-40 ${
                  user.sex === option
                    ? "bg-primary-fill text-on-primary-fill"
                    : "bg-cream-soft text-charcoal"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {sexError && (
            <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
              {sexError}
            </p>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={metricOpen !== null}
        onClose={() => setMetricOpen(null)}
        title={metricOpen === "weightKg" ? "Weight" : "Height"}
      >
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block relative">
            <input
              autoFocus
              value={metricDraft}
              onChange={(e) => {
                setMetricDraft(e.target.value.replace(/[^\d.]/g, ""));
                setMetricError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void saveMetric()}
              inputMode="decimal"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 pr-12 text-charcoal focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-charcoal-faint">
              {metricOpen === "weightKg" ? "kg" : "cm"}
            </span>
          </label>

          <p className="text-[11px] text-charcoal-faint">
            {metricOpen === "weightKg"
              ? "Used for your calorie targets, and shown to any professional you share weight with."
              : "Used for your calorie targets and BMI-based health recommendations."}
          </p>

          {metricError && <p className="text-xs font-semibold text-status-high">{metricError}</p>}

          <Button fullWidth size="lg" disabled={!metricDraft || savingMetric} onClick={saveMetric}>
            {savingMetric ? "Saving…" : "Save"}
          </Button>
        </div>
      </BottomSheet>

      {/* Date of birth, not age. Writes straight to profiles.date_of_birth. */}
      <BottomSheet open={dobOpen} onClose={() => setDobOpen(false)} title="Date of birth">
        {user.dateOfBirth ? (
          // Task T: LOCKED ONCE SET. The database refuses a change or a clear
          // (ATX51), so a saved date is shown, not offered as an input that
          // could never save. Only support can correct it.
          <div className="space-y-4 animate-fade-slide-up">
            <div className="rounded-2xl bg-cream-soft px-4 py-3.5">
              <p className="text-base font-semibold text-charcoal tabular-nums">
                {formatDisplayDate(user.dateOfBirth)}
              </p>
              {ageFromDateOfBirth(user.dateOfBirth) !== undefined && (
                <p className="text-xs text-charcoal-faint mt-0.5">
                  {ageFromDateOfBirth(user.dateOfBirth)} years old
                </p>
              )}
            </div>
            <p className="text-[11px] text-charcoal-faint">
              Your age is calculated from this, and is used for calorie targets and health
              recommendations. A date of birth can't be changed once it's saved.
            </p>
            <p className="text-sm text-charcoal-soft">
              Need to correct it?{" "}
              <Link to="/contact" className="font-semibold text-primary-deep-text underline">
                Contact support
              </Link>
            </p>
          </div>
        ) : (
        <div className="space-y-4 animate-fade-slide-up">
          <input
            type="date"
            value={dobDraft}
            min={isoDateYearsAgo(MAX_AGE)}
            max={isoDateYearsAgo(MIN_AGE)}
            onChange={(e) => {
              setDobDraft(e.target.value);
              setDobError(null);
            }}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-charcoal focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />

          {dobDraft && ageFromDateOfBirth(dobDraft) !== undefined && (
            <p className="text-xs text-charcoal-faint">
              {ageFromDateOfBirth(dobDraft)} years old
            </p>
          )}

          <p className="text-[11px] text-charcoal-faint">
            Your age is calculated from this, and is used for calorie targets and health
            recommendations. Check it before saving: it can't be changed afterwards.
          </p>

          {dobError && <p className="text-xs font-semibold text-status-high">{dobError}</p>}

          <Button fullWidth size="lg" disabled={!dobDraft || savingDob} onClick={saveDob}>
            {savingDob ? "Saving…" : "Save"}
          </Button>
        </div>
        )}
      </BottomSheet>

      {/* Second entry point to the same controls the Professionals tab shows.
          Reuses DataSharingSection narrowed to one professional rather than
          duplicating the toggles, so both paths read and write the same
          client_access_grants rows. */}
      <BottomSheet
        open={!!sharingFor}
        onClose={() => setSharingFor(null)}
        title="Data sharing"
      >
        {sharingFor && <DataSharingSection professionalId={sharingFor.professionalId} />}
      </BottomSheet>

      <BottomSheet open={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} hideHeader>
        <div className="space-y-2.5 animate-fade-slide-up">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Camera size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Take a photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Image size={18} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Choose from library</span>
          </button>
          <button
            onClick={() => void handleAvatarRemove()}
            disabled={!user.avatarUrl || avatarBusy}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left disabled:opacity-40"
          >
            <Trash2 size={18} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Remove photo</span>
          </button>

          {/* The sheet stays open while this runs, so there is somewhere for
              both states to land. Uploading a picture is a round trip now
              rather than a local read, and it can genuinely fail. */}
          {avatarBusy && (
            <p className="text-center text-xs font-semibold text-charcoal-faint">Saving…</p>
          )}
          {avatarError && (
            <p className="text-center text-xs font-semibold text-status-high">{avatarError}</p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
