import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Award, CalendarCheck, Camera, ChevronRight, CircleAlert, Flag, Gauge, HandHeart, Image, KeyRound, LogOut, Package, Plus, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsAmbassador } from "../../hooks/useIsAmbassador";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { useWebLayout } from "../../components/web/useWebLayout";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
import { ActivityLevelSheet } from "../../components/profile/ActivityLevelSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Button } from "../../components/ui/Button";
import { AVATAR_ACCEPT, removeAvatar, submitAvatar } from "../../services/avatar";
import { ImageApprovalBadge, ImageApprovalNote, useOwnImage } from "../../components/moderation/ImageApproval";
import { DataSharingSection } from "../../components/professionals/DataSharingSection";
import { MembershipsCard } from "../../components/profile/MembershipsCard";
import { fetchLinkedProfessionals, type LinkedProfessional } from "../../services/consent";
import { LicencePendingTag } from "../../components/professionals/LicencePendingTag";
import { typeLabel } from "../../components/pro/profile/typeLabel";
import { updateBodyMetric, updateDateOfBirth, updateSex } from "../../services/profile";
import type { ActivityLevel, Goal, Sex } from "../../types";
import { validateHeightCm, validateWeightKg } from "../../utils/bodyMetrics";
import { ageFromDateOfBirth, formatDisplayDate, isoDateYearsAgo, validateDateOfBirth, MIN_AGE, MAX_AGE } from "../../utils/date";
import { PaneSwitch } from "../../components/business-more/paneWeb";
import { SelectableBox } from "../../components/ui/SelectableBox";
import { TrackerQuestion } from "../../components/cycle/TrackerQuestion";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { HealthChecksSetting } from "../../components/health-checks/HealthChecksSetting";
import { CredentialsPopup } from "../../components/profile/CredentialsPopup";
import { ProfessionalCodeCard } from "../../components/profile/ProfessionalCodeCard";
import { CycleTrackingRow } from "../../components/profile/CycleTrackingRow";
import { initials } from "../../components/professionals/typeColour";
import { SharingYourWinsRow } from "../../components/share/client/SharingYourWinsSheet";
import { signOutWarning, useOutbox } from "../../components/outbox/Outbox";
import { forumAccess } from "../../services/forum/rules";
import { t, tk, tn, tx } from "../../i18n/core";
import { PremiumBadge } from "../../components/premium/PremiumBadge";
import { PremiumStatusCard } from "../../components/premium/PremiumStatusCard";
import { SUB_GOAL_VALUE } from "../onboarding/client/clientModel";
import { MoLabel, MoLinkRow, MoPage } from "./web/moWeb";
import Profile from "./Profile";

// Website viewport v1 · WC-MO.1 My Profile (WC-MO More Web v7, frames
// WC-MO.1_*). REPO CHANGED: built from today's mobile Profile (every row,
// card, sheet and save it has) in the web layout: two equal columns 24 apart.
// The left one: the hero (flex 5, min 188, r20 #F7F7FC; the picture or the
// initial on #E4F0EE in its first half, the name 40/48 and the account chip
// in the second), the four stats as a 2 × 2 grid (flex 3, min 160; tiles r16
// with a 1px #79A8A1 border, caps label 13/20, value 26/30), My orders / My
// appointments (and My certificates) as outlined rows and Sign Out as a 40
// outlined red button. The right one scrolls: Professionals, Training plan
// (two tiles) and Safety & content (the switch card). The editors are the
// mobile sheets and popups (side sheets and centred popups on web).
//
// Repo rules kept over the frames: recovery-sensitive mode drops the weight
// tile (the other three stay, Sex across the row); Premium status, the cycle
// tracker question, the date-of-birth prompt, memberships, Credentials, the
// picture's approval state, Sharing your wins, Cycle tracking and Health
// checks stay, in the column they belong to.

const SEX_LABEL: Record<string, string> = { female: tk("Female"), male: tk("Male"), other: tk("Other") };
const accountTypeLabel: Record<string, string> = { professional: tk("Professional"), business: tk("Business") };
const customerSubtypeLabel = (s: string): string =>
  s === "general" ? tx("general", "customer type") : s === "client" ? tx("client", "customer type") : s === "regular" ? tx("regular", "customer type") : s === "athlete" ? tx("athlete", "customer type") : s;
/** The Edit Goals labels, then the onboarding sub-goals for the goals only onboarding sets. */
const GOAL_LABEL: Partial<Record<Goal, string>> = {
  lose_weight: tk("Lose weight"),
  build_muscle: tk("Build muscle"),
  get_stronger: tk("Get stronger"),
  improve_nutrition: tk("Improve my nutrition"),
  improve_fitness: tk("Improve my fitness"),
  improve_health: tk("Improve my overall health"),
  track_health: tk("Track my health"),
  live_healthier: tk("Live healthier"),
};
const SUB_GOAL_LABEL: Partial<Record<Goal, string>> = Object.fromEntries(Object.entries(SUB_GOAL_VALUE).map(([label, value]) => [value, label]));
const goalLabel = (g: Goal): string => {
  const label = GOAL_LABEL[g] ?? SUB_GOAL_LABEL[g];
  return label ? t(label) : g;
};
const LEVEL_LABEL: Record<ActivityLevel, string> = {
  sedentary: tk("Sedentary"),
  light: tk("Lightly active"),
  moderate: tk("Moderately active"),
  very_active: tk("Very active"),
  athlete: tk("Athlete"),
};

const CARD_BORDER = "1px solid rgba(36,31,27,0.08)";

/** A stat tile: min 72, r16, 1px #79A8A1, padding 12 14; caps label 13/20 700 .12em #8C8378; value 26/30 700 and unit 13/600, 5 apart. */
const Stat: React.FC<{ label: string; value: React.ReactNode; unit?: string; onClick: () => void; aria: string; wide?: boolean }> = ({ label, value, unit, onClick, aria, wide }) => {
  const empty = value === "–";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className="flex flex-col justify-between text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ minHeight: 72, boxSizing: "border-box", borderRadius: 16, border: "1px solid #79A8A1", padding: "12px 14px", background: "#FFFFFF", gridColumn: wide ? "1 / -1" : undefined }}
    >
      <span className="uppercase rtl:tracking-normal" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", color: "#71685E" }}>
        {label}
      </span>
      <span className="flex items-baseline" style={{ gap: 5 }}>
        <span className="tabular-nums" style={{ fontSize: 26, lineHeight: "30px", fontWeight: 700, color: empty ? "#71685E" : "#241F1B" }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, fontWeight: 600, color: "#71685E" }}>{unit}</span>}
      </span>
    </button>
  );
};

function ClientProfileWeb() {
  const { user, updateProfile, signOut, authUserId, recoverySensitive, setRecoverySensitive, setRecoverySensitiveIntroSeen } = useApp();
  const { rail } = useWebLayout();
  const isAmbassador = useIsAmbassador();
  const navigate = useNavigate();
  const hideNumbers = useHideNumbers();
  const waiting = useOutbox();
  const customer = user.accountType === "customer";
  const [justToggledRecovery, setJustToggledRecovery] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [activityLevelOpen, setActivityLevelOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [metricOpen, setMetricOpen] = useState<"weightKg" | "heightCm" | null>(null);
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
  const [avatarAnchor, setAvatarAnchor] = useState<HTMLElement | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const { image: ownAvatar, refresh: refreshOwnAvatar } = useOwnImage("avatar", authUserId);
  const shownAvatar = (ownAvatar?.status === "pending" && ownAvatar.url) || user.avatarUrl;
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [pros, setPros] = useState<LinkedProfessional[]>([]);
  const [sharingFor, setSharingFor] = useState<LinkedProfessional | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  // ?open=recovery (a form's eating question, or the support notice) brings Safety & content into view.
  const [params] = useSearchParams();
  const openRecovery = params.get("open") === "recovery";
  const safetyRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (openRecovery) safetyRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [openRecovery]);

  // The mobile Profile's saves, unchanged (see Profile.tsx for the reasons).
  const handleAvatarFile = async (file: File) => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await submitAvatar(authUserId, file);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message);
      return;
    }
    refreshOwnAvatar();
  };
  const handleAvatarRemove = async () => {
    if (!authUserId || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await removeAvatar(authUserId, user.avatarUrl);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.message ?? t("Couldn't remove your picture."));
      return;
    }
    updateProfile({ avatarUrl: undefined });
    refreshOwnAvatar();
  };
  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (picked) void handleAvatarFile(picked);
  };
  const openMetricEditor = (field: "weightKg" | "heightCm") => {
    if (field === "weightKg" && hideNumbers) return;
    setMetricDraft(String(user[field]));
    setMetricError(null);
    setMetricOpen(field);
  };
  const saveMetric = async () => {
    if (!metricOpen) return;
    const value = Number(metricDraft);
    const message = metricOpen === "weightKg" ? validateWeightKg(value) : validateHeightCm(value);
    if (message) {
      setMetricError(message);
      return;
    }
    if (!authUserId) {
      setMetricError(t("You need to be signed in to change this."));
      return;
    }
    setSavingMetric(true);
    const result = await updateBodyMetric(authUserId, metricOpen === "weightKg" ? "weight_kg" : "height_cm", value);
    setSavingMetric(false);
    if (!result.ok) {
      setMetricError(result.message ?? t("Could not save that. Try again."));
      return;
    }
    updateProfile({ [metricOpen]: value });
    setMetricOpen(null);
  };
  const saveSex = async (sex: Sex) => {
    if (!authUserId) {
      setSexError(t("You need to be signed in to change this."));
      return;
    }
    setSexSaving(true);
    setSexError(null);
    const result = await updateSex(authUserId, sex);
    setSexSaving(false);
    if (!result.ok) {
      setSexError(result.message ?? t("Could not save that. Try again."));
      return;
    }
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
      setDobError(t("You need to be signed in to change this."));
      return;
    }
    setSavingDob(true);
    const result = await updateDateOfBirth(authUserId, dobDraft);
    setSavingDob(false);
    if (!result.ok) {
      setDobError(result.message ?? t("Could not save that. Try again."));
      return;
    }
    updateProfile({ dateOfBirth: dobDraft, age: ageFromDateOfBirth(dobDraft) ?? user.age });
    setDobOpen(false);
  };
  const handleSignOut = () => {
    setConfirmSignOut(false);
    signOut();
    navigate("/app/onboarding");
  };
  const reloadProfessionals = async () => {
    const result = await fetchLinkedProfessionals();
    if (result.status === "ok") setPros(result.professionals);
    setConnectOpen(false);
  };
  useEffect(() => {
    if (!customer || !authUserId) return;
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (!cancelled && result.status === "ok") setPros(result.professionals);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, authUserId]);

  const sexLabel = SEX_LABEL[user.sex] ? t(SEX_LABEL[user.sex]) : user.sex;
  const chip = [
    user.accountType === "customer" ? tx("Customer", "account type") : accountTypeLabel[user.accountType] ? t(accountTypeLabel[user.accountType]) : null,
    user.customerSubtype ? customerSubtypeLabel(user.customerSubtype) : null,
    user.professionalSubtype ? t(typeLabel(user.professionalSubtype)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const goalLine = user.goals.map(goalLabel).join(", ");
  const levelLine = LEVEL_LABEL[user.activityLevel] ? t(LEVEL_LABEL[user.activityLevel]) : "";
  const links = customer
    ? [
        { icon: Package, label: t("My orders"), onClick: () => navigate("/app/store/orders") },
        { icon: CalendarCheck, label: t("My appointments"), onClick: () => navigate("/app/appointments") },
        ...(forumAccess(user.dateOfBirth) === "adult" ? [{ icon: Award, label: t("My certificates"), onClick: () => navigate("/app/forum?tab=courses&view=certificates") }] : []),
      ]
    : [];
  const proRow = { borderRadius: 18, border: CARD_BORDER, background: "#FFFFFF" } as const;

  return (
    <MoPage title={t("My Profile")} frame="profile">
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
        {/* Left: hero, stats, links, Sign Out. */}
        <div data-col="left" className="min-w-0 min-h-0 flex flex-col overflow-y-auto" style={{ gap: 24, scrollbarWidth: "none" }}>
          <div data-p="hero" className="flex overflow-hidden" style={{ flex: "5 1 0", minHeight: 188, boxSizing: "border-box", borderRadius: 20, background: "#F7F7FC" }}>
            <div data-p="pic" className="relative min-w-0 overflow-hidden" style={{ flex: "0 0 50%", containerType: "size", borderStartStartRadius: 20, borderEndStartRadius: 20, background: "#E4F0EE" } as React.CSSProperties}>
              {shownAvatar ? (
                <img src={shownAvatar} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span aria-hidden className="absolute inset-0 grid place-items-center" style={{ fontSize: "40cqh", lineHeight: 1, fontWeight: 700, color: "#5B5349" }}>
                  {user.firstName.charAt(0)}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => setAvatarAnchor(e.currentTarget)}
                aria-label={t("Change profile picture")}
                title={t("Change profile picture")}
                aria-haspopup="menu"
                aria-expanded={!!avatarAnchor}
                className="absolute z-[2] grid place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ insetInlineEnd: 16, bottom: 16, width: 30, height: 30, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.14)" }}
              >
                <Camera size={15} style={{ color: "#7D6BB5" }} aria-hidden />
              </button>
            </div>
            <div className="min-w-0 flex flex-col justify-center items-start text-start overflow-y-auto" style={{ flex: "1 1 50%", boxSizing: "border-box", padding: rail ? "16px 24px" : "16px 32px", scrollbarWidth: "none" }}>
              <p className="flex items-center max-w-full" style={{ margin: 0, gap: 8, fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>
                <span title={user.firstName} className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]">
                  {user.firstName}
                </span>
                <PremiumBadge />
                {isAmbassador && <Award size={20} className="shrink-0" style={{ color: "#7D6BB5" }} aria-label={t("Centium Ambassador")} />}
              </p>
              {chip && (
                <span className="max-w-full truncate" style={{ marginTop: 12, borderRadius: 999, padding: "2px 10px", background: "#F5F5F6", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349" }}>
                  {chip}
                </span>
              )}
              <ImageApprovalBadge state={ownAvatar} className="mt-2" />
              {customer && (
                <button
                  type="button"
                  onClick={() => setCredentialsOpen(true)}
                  className="inline-flex items-center hover:bg-[#E8E4F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ marginTop: 12, gap: 6, height: 36, borderRadius: 12, background: "#F0EDF9", padding: "0 14px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#7D6BB5" }}
                >
                  <KeyRound size={14} strokeWidth={1.75} aria-hidden />
                  {t("Credentials")}
                </button>
              )}
              {avatarBusy && (
                <p role="status" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>
                  {t("Saving…")}
                </p>
              )}
              {avatarError && (
                <p role="alert" className="flex items-start" style={{ margin: "8px 0 0", gap: 8, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>
                  <CircleAlert size={13} strokeWidth={2} className="shrink-0 mt-[3px]" aria-hidden />
                  {avatarError}
                </p>
              )}
              <ImageApprovalNote state={ownAvatar} className="mt-2 max-w-[260px]" />
            </div>
          </div>

          <div data-p="stats" className="grid" style={{ flex: "3 1 0", minHeight: 160, gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridAutoRows: "minmax(72px,1fr)", gap: 16 }}>
            {!hideNumbers && (
              <Stat label={t("Weight")} value={user.weightKg ?? "–"} unit={t("kg")} onClick={() => openMetricEditor("weightKg")} aria={t("Weight, {n} kg. Edit", { n: user.weightKg ?? "" })} />
            )}
            <Stat
              label={t("Sex")}
              value={sexLabel || "–"}
              wide={hideNumbers}
              onClick={() => {
                setSexError(null);
                setSexOpen(true);
              }}
              aria={t("Sex, {sex}. Edit", { sex: sexLabel })}
            />
            <Stat label={t("Height")} value={user.heightCm ?? "–"} unit={t("cm")} onClick={() => openMetricEditor("heightCm")} aria={t("Height, {n} cm. Edit", { n: user.heightCm ?? "" })} />
            <Stat
              label={t("Age")}
              value={user.dateOfBirth ? user.age : "–"}
              unit={t("years")}
              onClick={openDobEditor}
              aria={user.dateOfBirth ? t("Age, {n}. Date of birth", { n: user.age }) : t("Add your date of birth")}
            />
          </div>

          {customer && <PremiumStatusCard className="shrink-0" />}
          {links.map((r) => (
            <MoLinkRow key={r.label} icon={r.icon} label={r.label} onClick={r.onClick} />
          ))}
          <button
            type="button"
            data-p="signout"
            onClick={() => setConfirmSignOut(true)}
            className="shrink-0 flex items-center justify-center hover:bg-[#FDF3F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ height: 40, borderRadius: 12, border: "1px solid rgba(180,55,44,0.25)", gap: 8, fontSize: 15, fontWeight: 700, color: "#B4372C", background: "#FFFFFF" }}
          >
            <LogOut size={17} aria-hidden />
            {t("Sign Out")}
          </button>
        </div>

        {/* Right: its own scroll. */}
        <div data-col="right" className="min-w-0 min-h-0 flex flex-col overflow-y-auto" style={{ gap: 20, scrollbarWidth: "none" }}>
          <TrackerQuestion className="shrink-0" tile />
          <DobPromptCard className="shrink-0" tile />
          {customer && (
            <div className="shrink-0">
              <MembershipsCard />
            </div>
          )}

          {customer && (
            <section className="shrink-0 flex flex-col" style={{ gap: 10 }}>
              <MoLabel>{pros.length > 0 ? t("Connected professionals") : t("Professionals")}</MoLabel>
              {pros.map((p) => (
                <button
                  key={p.professionalId}
                  type="button"
                  onClick={() => setSharingFor(p)}
                  className="w-full flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ ...proRow, gap: 12, padding: 14 }}
                >
                  <span aria-hidden className="shrink-0 grid place-items-center" style={{ width: 36, height: 36, borderRadius: 999, background: "#F0EDF9", fontSize: 13, fontWeight: 700, color: "#7D6BB5" }}>
                    {initials(p.name)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 15, lineHeight: "20px", fontWeight: 600, color: "#241F1B" }}>
                      {p.name}
                    </span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "18px", color: "#71685E" }}>
                      {t("Manage data sharing")}
                    </span>
                    {p.licenceVerified === false && <LicencePendingTag className="mt-1" />}
                  </span>
                  <ChevronRight size={16} className="shrink-0" style={{ color: "#71685E" }} aria-hidden />
                </button>
              ))}
              {pros.length > 0 && <SharingYourWinsRow me={authUserId} connectedCount={pros.length} />}
              {pros.length === 0 || connectOpen ? (
                <div style={{ ...proRow, padding: 14 }}>
                  <ProfessionalCodeCard onConnected={() => void reloadProfessionals()} />
                </div>
              ) : (
                <MoLinkRow icon={Plus} label={t("Connect with a professional code")} onClick={() => setConnectOpen(true)} />
              )}
              {pros.length === 0 && <SharingYourWinsRow me={authUserId} connectedCount={0} />}
            </section>
          )}

          {customer && (
            <section className="shrink-0 flex flex-col" style={{ gap: 10 }}>
              <MoLabel>{t("Training plan")}</MoLabel>
              <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                {[
                  { icon: Flag, label: t("Goals"), value: goalLine, onClick: () => setGoalsOpen(true) },
                  { icon: Gauge, label: t("Activity Level"), value: levelLine, onClick: () => setActivityLevelOpen(true) },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={s.onClick}
                    className="min-w-0 flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                    style={{ ...proRow, gap: 10, padding: "13px 12px" }}
                  >
                    <span aria-hidden className="shrink-0 grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9, background: "#F0EDF9" }}>
                      <s.icon size={16} strokeWidth={1.75} style={{ color: "#7D6BB5" }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                        {s.label}
                      </span>
                      <span title={s.value} className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                        {s.value}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0" style={{ color: "#71685E" }} aria-hidden />
                  </button>
                ))}
              </div>
            </section>
          )}

          {customer && (
            <section ref={safetyRef} className="flex flex-col" style={{ flex: "1 0 auto", gap: 10 }}>
              <MoLabel>{t("Safety & content")}</MoLabel>
              <div className="flex flex-col" style={{ flex: 1, borderRadius: 18, border: CARD_BORDER, padding: "16px 16px 18px", gap: 12 }}>
                {/* FP: the row is the switch, as Cycle tracking below it. */}
                <SelectableBox
                  kind="switch"
                  selected={recoverySensitive}
                  onToggle={() => {
                    const v = !recoverySensitive;
                    setRecoverySensitive(v);
                    if (v) {
                      setJustToggledRecovery(true);
                      setRecoverySensitiveIntroSeen(false);
                      window.setTimeout(() => setJustToggledRecovery(false), 6000);
                    }
                  }}
                  label={t("Recovery-sensitive experience")}
                  className="flex items-center"
                  style={{ gap: 12 }}
                >
                  <span aria-hidden className="shrink-0 grid place-items-center" style={{ width: 36, height: 36, borderRadius: 16, background: "#F0EDF9" }}>
                    <HandHeart size={18} strokeWidth={1.75} style={{ color: "#7D6BB5" }} />
                  </span>
                  <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                    {t("Recovery-sensitive experience")}
                  </span>
                  <PaneSwitch decorative checked={recoverySensitive} />
                </SelectableBox>
                {recoverySensitive && (
                  <p style={{ margin: 0, maxWidth: "72ch", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                    {t("Personalize food tracking to reduce number-focused and potentially triggering content. Numbers like calories, weight and streaks are hidden, and you can change this at any time.")}
                  </p>
                )}
                {justToggledRecovery && (
                  <p role="status" style={{ margin: 0, borderRadius: 12, background: "#F0EDF9", padding: "10px 14px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#7D6BB5" }}>
                    {t("Your experience has been updated: calorie totals, weight-related content, deficit language, and streaks are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness instead.")}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                  {t("Saved to your account, so it's the same on every device you sign in on. Professionals you work with are never told whether it's on.")}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                  {t("This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a")}{" "}
                  <button type="button" onClick={() => navigate("/app/professionals")} className="underline hover:text-[#5F5093]" style={{ fontWeight: 600, color: "#7D6BB5" }}>
                    {t("professional")}
                  </button>
                  .
                </p>
                <div style={{ paddingTop: 12, borderTop: "1px solid rgba(36,31,27,0.06)" }}>
                  <CycleTrackingRow />
                </div>
              </div>
              <HealthChecksSetting />
            </section>
          )}
        </div>
      </div>

      <CentredPopup
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title={t("Sign out?")}
        icon={<LogOut size={22} />}
        body={signOutWarning(waiting) ?? t("You can sign back in at any time.")}
      >
        <CtaButton size="page" label={waiting.length > 0 ? t("Sign out anyway") : t("Sign Out")} onClick={handleSignOut} />
        <button type="button" onClick={() => setConfirmSignOut(false)} className="tap mt-3 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft">
          {t("Cancel")}
        </button>
      </CentredPopup>

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <ActivityLevelSheet open={activityLevelOpen} onClose={() => setActivityLevelOpen(false)} />
      {customer && <CredentialsPopup key={credentialsOpen ? "cred-open" : "cred-closed"} open={credentialsOpen} onClose={() => setCredentialsOpen(false)} />}

      <input ref={cameraInputRef} type="file" accept={AVATAR_ACCEPT} capture="user" className="hidden" onChange={pickAvatar} />
      <input ref={galleryInputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={pickAvatar} />

      <BottomSheet open={sexOpen} onClose={() => setSexOpen(false)} title={t("Sex")}>
        <div className="animate-fade-slide-up">
          <p className="text-[12.5px] text-charcoal-soft mb-3 leading-relaxed">{t("Used to estimate your calorie needs and to suggest which health checks may be relevant.")}</p>
          <div className="flex flex-col gap-2">
            {(["female", "male", "other"] as Sex[]).map((option) => (
              <button
                key={option}
                onClick={() => void saveSex(option)}
                disabled={sexSaving}
                className={`tap w-full rounded-2xl px-4 py-3 text-start text-sm font-semibold capitalize disabled:opacity-40 ${user.sex === option ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal"}`}
              >
                {t(SEX_LABEL[option])}
              </button>
            ))}
          </div>
          {sexError && <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{sexError}</p>}
        </div>
      </BottomSheet>

      <BottomSheet open={metricOpen !== null && !(metricOpen === "weightKg" && hideNumbers)} onClose={() => setMetricOpen(null)} title={metricOpen === "weightKg" ? t("Weight") : t("Height")}>
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
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 pe-12 text-charcoal focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-charcoal-faint">{metricOpen === "weightKg" ? t("kg") : t("cm")}</span>
          </label>
          <p className="text-[11px] text-charcoal-faint">
            {metricOpen === "weightKg" ? t("Used for your calorie targets, and shown to any professional you share weight with.") : t("Used for your calorie targets and health recommendations.")}
          </p>
          {metricError && <p className="text-xs font-semibold text-status-high">{metricError}</p>}
          <Button fullWidth size="lg" disabled={!metricDraft || savingMetric} onClick={saveMetric}>
            {savingMetric ? t("Saving…") : t("Save")}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={dobOpen} onClose={() => setDobOpen(false)} title={t("Date of birth")}>
        {user.dateOfBirth ? (
          <div className="space-y-4 animate-fade-slide-up">
            <div className="rounded-2xl bg-cream-soft px-4 py-3.5">
              <p className="text-base font-semibold text-charcoal tabular-nums">{formatDisplayDate(user.dateOfBirth)}</p>
              {ageFromDateOfBirth(user.dateOfBirth) !== undefined && <p className="text-xs text-charcoal-faint mt-0.5">{tn(ageFromDateOfBirth(user.dateOfBirth)!, "{n} year old", "{n} years old")}</p>}
            </div>
            <p className="text-[11px] text-charcoal-faint">
              {t("Your age is calculated from this, and is used for calorie targets and health recommendations. A date of birth can't be changed once it's saved.")}
            </p>
            <p className="text-sm text-charcoal-soft">
              {t("Need to correct it?")}{" "}
              <Link to="/contact" className="font-semibold text-primary-deep-text underline">
                {t("Contact support")}
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
            {dobDraft && ageFromDateOfBirth(dobDraft) !== undefined && <p className="text-xs text-charcoal-faint">{tn(ageFromDateOfBirth(dobDraft)!, "{n} year old", "{n} years old")}</p>}
            <p className="text-[11px] text-charcoal-faint">
              {t("Your age is calculated from this, and is used for calorie targets and health recommendations. Check it before saving; to change it later, contact support.")}
            </p>
            {dobError && <p className="text-xs font-semibold text-status-high">{dobError}</p>}
            <Button fullWidth size="lg" disabled={!dobDraft || savingDob} onClick={saveDob}>
              {savingDob ? t("Saving…") : t("Save")}
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!sharingFor} onClose={() => setSharingFor(null)} title={t("Data sharing")}>
        {sharingFor && <DataSharingSection professionalId={sharingFor.professionalId} />}
      </BottomSheet>

      <PopupMenu
        open={!!avatarAnchor}
        onClose={() => setAvatarAnchor(null)}
        anchor={avatarAnchor}
        width={200}
        align="left"
        options={[
          { value: "camera", label: t("Take a photo"), icon: <Camera size={15} strokeWidth={1.75} />, disabled: avatarBusy },
          { value: "library", label: t("Choose from library"), icon: <Image size={15} strokeWidth={1.75} />, disabled: avatarBusy },
          { value: "remove", label: t("Remove photo"), icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true, disabled: (!user.avatarUrl && ownAvatar?.status !== "pending") || avatarBusy },
        ]}
        onSelect={(v) => {
          if (v === "camera") cameraInputRef.current?.click();
          else if (v === "library") galleryInputRef.current?.click();
          else void handleAvatarRemove();
        }}
      />
    </MoPage>
  );
}

/** /app/profile from 1024px: a client's My Profile; professionals and businesses keep theirs. */
export default function ProfileWeb() {
  const { user } = useApp();
  if (user.accountType !== "customer") return <Profile />;
  return <ClientProfileWeb />;
}
