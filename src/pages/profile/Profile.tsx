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
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
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
  CircleAlert,
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
  HandHeart,
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
  // The avatar's options menu, anchored to the avatar (decision 23, item 99).
  const [avatarAnchor, setAvatarAnchor] = useState<HTMLElement | null>(null);
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
    setConfirmSignOut(false);
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
    // MO1.5: 90 × 143, vertically centred beside the avatar (measured on the
    // 2x frame: border x 32–211, y 216–501), divider inset 22 (x 78–163).
    // Decision 23 (items 16–18): the frame's colours in light and dark, as
    // theme tokens: a 1px #6F9993 border and divider (teal-dark), values
    // #5F5093 (primary-deep-text) and units #AEA1DC (primary).
    <div className="h-[143px] rounded-2xl bg-cream-card border border-teal-dark flex flex-col overflow-hidden min-w-0">
      {[top, bottom].map((part, i) => (
        <button
          key={part.unit}
          type="button"
          onClick={part.onClick}
          aria-label={part.label}
          className={clsx(
            "tap flex-1 flex flex-col items-center justify-center px-1 py-3",
            i === 1 && "border-t border-teal-dark mx-[22px]"
          )}
        >
          {/* MO1.5 anatomy row 2: values 17px/700. */}
          <span className="text-[17px] font-bold leading-tight text-primary-deep-text tabular-nums capitalize">{part.value}</span>
          <span className="text-[11px] text-primary">{part.unit}</span>
        </button>
      ))}
    </div>
  );

  // MO1.5 / MO1.5.1 "Section label" (2x frame): 10.5/700 uppercase on a 14
  // line, 0.12em, no rule, inset 4 (glyphs from x 20.5), 8 above what it
  // labels. Handover-complete pass: was decision 20's section-label (11/600
  // with the 1.5 rule). The ink keeps its pre-R1 light colour (light rule).
  const LABEL_TYPE = "px-1 text-[10.5px] leading-[14px] font-bold uppercase tracking-[0.12em] text-charcoal-faint";
  const sectionLabel = (text: string, id?: string) => (
    <p id={id} className={clsx(LABEL_TYPE, "mb-2")}>
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
            : "grid grid-cols-[minmax(0,90px)_minmax(0,1fr)_minmax(0,90px)] gap-3 items-center"
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
            type="button"
            onClick={(e) => setAvatarAnchor(e.currentTarget)}
            aria-label="Change profile picture"
            aria-haspopup="menu"
            aria-expanded={!!avatarAnchor}
            className="tap relative w-[84px] h-[84px] rounded-full bg-teal-pale flex items-center justify-center text-[30px] font-bold text-charcoal-soft dark:text-teal-deep-text overflow-hidden shrink-0"
          >
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.firstName.charAt(0)}
          </button>
          {/* Decision 23 (item 98): the Premium crown and Ambassador badge are
              16 badges after the name, 5 apart, as the Professional card's
              verified badge (DirectoryCard). */}
          <h2 className="mt-2.5 font-display text-[20px] font-bold leading-tight text-charcoal flex items-center justify-center gap-[5px] max-w-full">
            {/* Wraps rather than truncating: the centre column is narrow. */}
            <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]">{user.firstName}</span>
            {premiumPlan && <Crown size={16} className="text-gold fill-gold shrink-0" aria-label="Centium Premium" />}
            {/* QA 11.0 ambassador badge: a granted status (ambassador_grants,
                read through is_ambassador()), not "one referral". */}
            {isAmbassador && <Award size={16} className="text-primary-dark shrink-0" aria-label="Centium Ambassador" />}
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
              // MO1.5: a 118 × 32 pill, radius 12 (measured on the 2x frame:
              // x 272–507, y 484–547), #F0EDF9 fill, #7D6BB5 key and label
              // (new chip, decision 22), KeyRound 14/1.75.
              className="tap mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-primary-pale px-3.5 py-1.5 text-[13px] font-semibold text-primary-dark"
            >
              <KeyRound size={14} strokeWidth={1.75} aria-hidden />
              Credentials
            </button>
          )}
          {/* The avatar menu closes when an option is picked, so the upload's
              two outcomes land here, under the hero: "Saving…" while it runs,
              and a failure as the Foundations inline danger line
              (CircleAlert 13 + 12/600 danger). */}
          {avatarBusy && (
            <p role="status" className="mt-2 text-xs font-semibold text-charcoal-faint">Saving…</p>
          )}
          {avatarError && (
            <p role="alert" className="mt-2 flex items-start gap-2 text-start text-xs font-semibold text-status-high">
              <CircleAlert size={13} strokeWidth={2} className="shrink-0 mt-px" aria-hidden />
              {avatarError}
            </p>
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
      {/* My CV (licences, experience, education and the rest), then
          certification (V8, QA 8.0). Decision 23 (item 103): both as the
          MO1.5.1 Join row: r18, a 32 r10 #F0EDF9 tile with a 16/1.75 glyph,
          15/600, ChevronRight 15, 8 between the rows. */}
      {user.accountType === "professional" && (
        <div className="mb-6 space-y-2 animate-fade-slide-up">
          {[
            { icon: FileText, label: "My CV", onClick: () => navigate("/app/profile/cv") },
            { icon: BadgeCheck, label: "Certification", onClick: () => setCertOpen(true) },
          ].map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={r.onClick}
              className="tap w-full flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
            >
              <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                <r.icon size={16} strokeWidth={1.75} className="text-primary-dark" />
              </span>
              <span className="flex-1 min-w-0 text-[15px] font-semibold text-charcoal">{r.label}</span>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* Task R: right under the sex tile, because switching to female or
          other is when a tracker somebody never chose to switch off is found
          off. Also on Health, where the Cycle card would be. */}
      {/* Decision 23 (item 100): both as r18 cards with a 36 #F0EDF9 icon
          tile, like the Recovery card (`tile`; Health and Home keep theirs). */}
      <TrackerQuestion className="mb-6" tile />

      {/* Task T: only for an older account with no date of birth. */}
      <DobPromptCard className="mb-6" tile />

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
            // MO1.5 anatomy row 4: the code card is radius 18 with 14 padding
            // (measured on the 2x frame, as the Memberships card).
            <Card padded={false} className="!rounded-[18px] p-3.5">
              <ProfessionalCodeCard onConnected={() => void reloadProfessionals()} />
            </Card>
          ) : (
            // MO1.5.1: 8 between the rows (2x frame: 1129 → 1146).
            <div className="space-y-2">
              {connectedProfessionals.map((p) => (
                <button
                  key={p.professionalId}
                  type="button"
                  onClick={() => setSharingFor(p)}
                  className="tap w-full flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3.5 text-start"
                >
                  {/* Handover-complete pass: initials always, as drawn (the
                      professional's photo, C9 / B4, is no longer shown here).
                      MO1.5.1 anatomy row 4: initials 12/700, name 14/600,
                      "Manage data sharing" 11.5/400, ChevronRight 15; avatar
                      32 measured on the 2x frame (x 62–125); row 61 tall,
                      radius 18 (2x frame: y 1008–1129). */}
                  <span className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center shrink-0 text-[12px] font-bold text-primary-dark" aria-hidden>
                    {initials(p.name)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold leading-tight text-charcoal truncate">{p.name}</span>
                    <span className="block text-[11.5px] leading-tight text-charcoal-faint">Manage data sharing</span>
                  </span>
                  <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
                </button>
              ))}
              {connectOpen ? (
                <Card padded={false} className="!rounded-[18px] p-3.5">
                  <ProfessionalCodeCard onConnected={() => void reloadProfessionals()} />
                </Card>
              ) : (
                <button
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  className="tap w-full flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start"
                >
                  {/* MO1.5.1: Plus 16/1.75 in a 32 r10 tile, row 58 with
                      12 padding (measured on the 2x frame: tile 1172–1235,
                      row 1146–1259). */}
                  <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                    <Plus size={16} strokeWidth={1.75} className="text-primary-dark" />
                  </span>
                  <span className="flex-1 min-w-0 text-[15px] font-semibold text-charcoal">Connect with a professional code</span>
                  <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
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
                // MO1.5: label 13/600, Flag / Gauge 14/1.75, ChevronRight 14;
                // tile 56 tall, radius 18, with a 28 r8 icon tile (measured on
                // the 2x MO1.5.1 frame: tile y 1352–1463, icon tile 58–113).
                // The icon tile is new (decision 22): #F0EDF9 with a #7D6BB5
                // glyph, as drawn.
                className="tap flex items-center gap-2 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3 py-[13px] text-start min-w-0"
              >
                <span className="w-7 h-7 rounded-lg bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                  <s.icon size={14} strokeWidth={1.75} className="text-primary-dark" />
                </span>
                <span className="flex-1 min-w-0 text-[13px] font-semibold leading-tight text-charcoal">{s.label}</span>
                <ChevronRight size={14} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
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
            // MO1.5 row 6: a 14 tall button, padding 0 4, the label then the
            // chevron, 8 above the card (row 7 at y 741). Collapsed
            // (MO1.5.1), Sign Out sits the section's 24 under the label.
            className={clsx(
              "tap w-full flex items-center justify-between gap-2 text-start",
              safetyOpen && "mb-2"
            )}
          >
            <span className={LABEL_TYPE}>Safety & content</span>
            {/* MO1.5.1 draws ChevronRight 14 while collapsed, MO1.5
                ChevronDown 14 while open. */}
            {safetyOpen ? (
              <ChevronDown size={14} aria-hidden className="text-charcoal-faint shrink-0 me-1" />
            ) : (
              <ChevronRight size={14} aria-hidden className="text-charcoal-faint shrink-0 me-1 rtl:-scale-x-100" />
            )}
          </button>
          {safetyOpen && (
            <div id="safety-content" className="animate-fade-slide-up">
              {/* MO1.5 anatomy row 7: radius 18, padding 16 16 18 (its own
                  values here; the shared Card stays as it is elsewhere). */}
              <Card padded={false} className="mb-3 !rounded-[18px] pt-4 px-4 pb-[18px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 min-w-0">
                    {/* MO1.5: HandHeart 17/1.5, title 14/600; the 36 icon
                        tile is #F0EDF9 (new, decision 22; 2x frame x 66–137). */}
                    <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                      <HandHeart size={17} strokeWidth={1.5} className="text-primary-dark" />
                    </span>
                    <span className="text-sm font-semibold text-charcoal">Recovery-sensitive experience</span>
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
                {/* MO1.5 anatomy rows 7–8 (measured on the 2x frame): the body
                    sits under the title (x 162, past the 36 tile and its 12
                    gap), 10 below the tile row, 12/400 on an 18 line, 8
                    between paragraphs with no rule; one inset rule, 16 above
                    and below, before Cycle tracking. */}
                <div className="ps-12 mt-2.5 pb-4 border-b border-charcoal/[0.06] space-y-2">
                  {/* QA 13.0: when the toggle is on it shows the text under. */}
                  {recoverySensitive && (
                    <p className="text-xs text-charcoal-faint leading-normal">
                      Personalize food tracking to reduce number-focused and potentially triggering content. You control
                      what is shown, and you can change this at any time.
                    </p>
                  )}
                  {justToggledRecovery && (
                    <p className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5 leading-relaxed">
                      Your experience has been updated: calorie totals, weight-related content, deficit language, and
                      streaks are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness instead.
                    </p>
                  )}
                  {/* Task X: what is true, said instead of a pause that paused
                      nothing: where the setting lives, and who sees it. */}
                  <p className="text-xs text-charcoal-faint leading-normal">
                    Saved to your account, so it's the same on every device you sign in on. Professionals you work with
                    are never told whether it's on.
                  </p>
                  <p className="text-xs text-charcoal-faint leading-normal">
                    This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a{" "}
                    <button onClick={() => navigate("/app/professionals")} className="tap text-primary-dark font-semibold underline">
                      professional
                    </button>
                    .
                  </p>
                </div>
                <div className="mt-4">
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

      {/* Sign Out as a text link (MO1.5). A 48 block (MO1.5 row 10: 358 ×
          48), 24 under the section above. Decision 23: neutral #5B5349
          (charcoal-soft) as MO1.5, MO1.5.1 and MO1.5.4 draw it (item 97), and
          the confirm is a centred popup like End membership (item 102). */}
      <button
        type="button"
        onClick={() => setConfirmSignOut(true)}
        className="tap mx-auto flex items-center justify-center gap-2 px-4 py-3.5 text-[14px] font-semibold text-charcoal-soft"
      >
        {/* MO1.5: 14/600 with LogOut 15/1.75. */}
        <LogOut size={15} strokeWidth={1.75} aria-hidden />
        Sign Out
      </button>

      <CentredPopup
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out?"
        icon={<LogOut size={22} />}
        body="You can sign back in at any time."
      >
        <CtaButton size="page" label="Sign Out" onClick={handleSignOut} />
        <button
          type="button"
          onClick={() => setConfirmSignOut(false)}
          className="tap mt-3 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft"
        >
          Cancel
        </button>
      </CentredPopup>

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

      {/* Decision 23 (item 99): the avatar's options as the Foundations
          dropdown menu anchored to the avatar, in place of a bottom sheet.
          Uploading is a round trip and can fail; its states show under the
          hero (above). */}
      <PopupMenu
        open={!!avatarAnchor}
        onClose={() => setAvatarAnchor(null)}
        anchor={avatarAnchor}
        width={200}
        align="left"
        options={[
          { value: "camera", label: "Take a photo", icon: <Camera size={15} strokeWidth={1.75} />, disabled: avatarBusy },
          { value: "library", label: "Choose from library", icon: <Image size={15} strokeWidth={1.75} />, disabled: avatarBusy },
          {
            value: "remove",
            label: "Remove photo",
            icon: <Trash2 size={15} strokeWidth={1.75} />,
            destructive: true,
            disabled: !user.avatarUrl || avatarBusy,
          },
        ]}
        onSelect={(v) => {
          if (v === "camera") cameraInputRef.current?.click();
          else if (v === "library") galleryInputRef.current?.click();
          else void handleAvatarRemove();
        }}
      />
    </div>
  );
}
