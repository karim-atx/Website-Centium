import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  Award,
  BookOpen,
  Briefcase,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  HandHeart,
  Image as ImageIcon,
  Languages,
  Link as LinkIcon,
  Lock,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  AtSign,
  Globe2,
  Store,
  Music2,
  Eye,
} from "lucide-react";
import { PaneRowCard, SettingsRow, SettingsSection } from "../../../components/pro/calendar/calendarFields";
import { usePaneSpan } from "../../../components/web/paneFill";
import { FootNote, HeadLink, LockTile, StateLine, SubPage } from "../../../components/pro/profile/kit";
import { NameSheet, HandleSheet, PhotoSourceSheet, TypeChangeSheet, TypeLockedPopup, usePhotoPicker } from "../../../components/pro/profile/ProfileSheets";
import { ListingDetailsSheet, ProfilePlaylistSheet, SpecialtiesSheet } from "../../../components/pro/profile/EditSheets";
import { fetchMyPlaylist } from "../../../services/professional-profile";
import { SERVICE_LABEL, playlistServiceOf } from "../../../services/music/playlistLink";
import { useCoverPicker } from "../../../components/pro/profile/useCoverPicker";
import { ProfessionalBioSheet } from "../../../components/profile/ProfessionalBioCard";
import { CvSheetsHost, type CvView } from "../../../components/cv/CvEditor";
import { useMyCv } from "../../../components/cv/useMyCv";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { licenceFacts, profileUrl, shortDate, wordCount, yearsOfExperience } from "../../../components/pro/profile/profileModel";
import { typeLabel } from "../../../components/pro/profile/typeLabel";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { useApp } from "../../../context/AppContext";
import { currentMonth } from "../../../services/professional-cv/cvDates";
import { fetchEmployments, fetchPendingTypeChange, fetchServicePlans } from "../../../services/pro/profile";
import { fetchSessionTypes } from "../../../services/pro/calendar";
import type { ProfessionalSubtype } from "../../../types";
import { t, tn } from "../../../i18n/core";

type Sheet = null | "photo" | "name" | "locked" | "request" | "specialties" | "bio" | "details" | "handle" | "playlist";

/**
 * Release 3 · W6 MO14 v2 Edit public profile (/app/more/edit-profile), backed
 * by the CV (r16 pubEdit16; r13 pubEdit13 for the Licence sheet):
 * - head: "Edit public profile", "Each section opens its own sheet", Preview
 *   (13 / 700 primary.deep) opening MO3;
 * - the rows (ui.js sRow): Photo and cover, Name, Professional type (locked:
 *   28 r9 lock tile; tap explains, MO26), Specialties, Credentials (MO4),
 *   Licence (the CV licence sheet with its "Show on my profile" switch),
 *   Experience (the CV's entries: the business Team › Person page reads them),
 *   Bio (ProfessionalBioCard), Services and prices (MO5), Where you work
 *   (MO20), Availability (the calendar's availability);
 * - kept CV rows (FINAL_PLAN W6 "extra CV rows kept"): Headline,
 *   Qualifications (education), Skills and languages, Awards, Publications,
 *   Links, Volunteering; and the listing's own fields (specialty, location,
 *   website, socials, from the old listing sheet) and the handle (set_my_handle);
 * - the listing status line (the switch is Settings › Practice › Public listing);
 * - the lock note: icon 12, 11.5 / 1.45 text.faint, 8 above.
 */
/** The "Photo and cover" row's line: "Added", "Photo added", "Cover added" or "Not added yet". */
function photoAndCoverSub(photo: boolean, cover: boolean): string {
  return photo && cover ? t("Added") : photo ? t("Photo added") : cover ? t("Cover added") : t("Not added yet");
}

export default function EditProfile() {
  const navigate = useNavigate();
  // WP-MO.5 web: in the spanning More pane the rows sit in cards (PaneRowCard) with the value at the end.
  const inPane = usePaneSpan();
  const RowGroup = inPane ? PaneRowCard : "div";
  const { user, authUserId } = useApp();
  const { cv, setCv, error: cvError, reload: reloadCv, userId } = useMyCv();
  const { facts, setFacts, error: factsError, offline, reload } = useProfileFacts();
  const picker = usePhotoPicker();
  // Release B: the cover photo (professional-covers, cover_url) in the same sheet.
  const cover = useCoverPicker();
  const [sheet, setSheet] = useState<Sheet>(null);
  // Round E: the profile's playlist (undefined while reading).
  const [playlist, setPlaylist] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void fetchMyPlaylist(userId).then((r) => live && setPlaylist(r.ok ? r.url : null));
    return () => {
      live = false;
    };
  }, [userId]);
  const playlistService = playlistServiceOf(playlist);
  const [cvView, setCvView] = useState<CvView | null>(null);
  const [counts, setCounts] = useState<{ services: number; places: number } | null>(null);
  const [pending, setPending] = useState<ProfessionalSubtype | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void Promise.all([fetchServicePlans(authUserId), fetchSessionTypes(authUserId), fetchEmployments(), fetchPendingTypeChange(authUserId)]).then(([plans, types, jobs, req]) => {
      if (!live) return;
      const services = (plans.ok ? plans.data.filter((p) => p.active).length : 0) + (types.ok ? types.data.length : 0);
      const places = jobs.ok ? jobs.data.filter((j) => j.acceptedAt).length : 0;
      setCounts({ services, places });
      if (req.ok) setPending(req.data?.requestedType ?? null);
    });
    return () => {
      live = false;
    };
  }, [authUserId]);

  const loading = (!cv && !cvError) || (!facts && !factsError);
  const failed = (cvError && !cv) || (factsError && !facts);
  const lic = cv ? licenceFacts(cv.licences, cv.reviews) : null;
  const years = cv ? yearsOfExperience(cv.experience, currentMonth()) : 0;

  // "{n} places · {n} km": the businesses you work at, plus your own space and online when your work mode says so.
  // The km is MO20's service radius (service_radius_km, Release B), which only bounds in-person work.
  const ownPlaces = facts?.workMode === "both" ? 2 : facts?.workMode ? 1 : 0;
  const places = (counts?.places ?? 0) + ownPlaces;
  const radiusKm = facts?.workMode !== "online" ? facts?.serviceRadiusKm : null;
  const whereSub = [places > 0 ? tn(places, "{n} place", "{n} places") : t("Not set yet"), radiusKm ? t("{n} km", { n: radiusKm }) : null].filter(Boolean).join(" · ");
  const licenceSub = !lic?.primary
    ? t("Not added yet")
    : lic.verified
      ? lic.verifiedAt
        ? t("Verified {date}", { date: shortDate(lic.verifiedAt) })
        : t("Verified")
      : lic.status?.kind === "rejected"
        ? t("Needs changes")
        : lic.status?.kind === "pending"
          ? t("We're checking it")
          : t("No document yet");
  const words = wordCount(facts?.bio);

  return (
    <SubPage
      title={t("Edit public profile")}
      subtitle={t("Each section opens its own sheet")}
      paneEyebrow={inPane ? t("Public profile") : undefined}
      right={
        inPane ? (
          // The frame's Preview: 40 high, r14, the 12% border, eye 18, 15/24 600 #5F5093.
          <button type="button" onClick={() => navigate("/app/more/public-profile")} className="flex items-center shrink-0 hover:bg-[#F0EDF9]" style={{ height: 40, padding: "0 16px", borderRadius: 14, border: "1px solid rgba(36,31,27,0.12)", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093" }}>
            <Eye size={18} aria-hidden />
            {t("Preview")}
          </button>
        ) : (
          <HeadLink label={t("Preview")} onClick={() => navigate("/app/more/public-profile")} />
        )
      }
    >
      {offline && facts && <OfflineLine />}
      {failed ? (
        <div style={{ marginTop: 12 }}>
          <ProError
            onRetry={() => {
              void reload();
              void reloadCv();
            }}
          />
        </div>
      ) : loading ? (
        <div className="flex flex-col" style={{ gap: 12, marginTop: 12 }} role="status" aria-label={t("Loading")}>
          <ProCardSkeleton lines={6} height={300} />
          <ProCardSkeleton lines={4} height={200} />
        </div>
      ) : (
        <>
          <RowGroup>
            <SettingsRow pane={inPane} icon={ImageIcon} title={t("Photo and cover")} sub={photoAndCoverSub(!!user.avatarUrl, !!cover.url)} onClick={() => setSheet("photo")} />
            <SettingsRow pane={inPane} icon={UserRound} title={t("Name")} sub={user.firstName || t("Add your name")} onClick={() => setSheet("name")} />
            <SettingsRow pane={inPane} icon={Briefcase} title={t("Professional type")} sub={typeLabel(user.professionalSubtype)} right={<LockTile />} onClick={() => setSheet("locked")} ariaLabel={t("Professional type, {v}. Locked", { v: typeLabel(user.professionalSubtype) })} />
            <SettingsRow pane={inPane} icon={Sparkles} title={t("Specialties")} sub={facts && facts.specialties.length > 0 ? t("{n} selected", { n: facts.specialties.length }) : t("None yet")} onClick={() => setSheet("specialties")} />
            <SettingsRow pane={inPane} icon={GraduationCap} title={t("Credentials")} sub={cv && cv.licences.length > 0 ? tn(cv.licences.length, "{n} certification", "{n} certifications") : t("None yet")} onClick={() => navigate("/app/more/credentials")} />
            <SettingsRow pane={inPane} icon={ShieldCheck} title={t("Licence")} sub={licenceSub} onClick={() => setCvView({ kind: "licence", entry: lic?.primary ?? null })} />
            <SettingsRow pane={inPane} icon={BriefcaseBusiness} title={t("Experience")} sub={cv && cv.experience.length > 0 ? tn(years, "{n} year", "{n} years") : t("None yet")} onClick={() => setCvView({ kind: "list", key: "experience" })} />
            <SettingsRow pane={inPane} icon={AlignLeft} title={t("Bio")} sub={words > 0 ? tn(words, "{n} word", "{n} words") : t("Not written yet")} onClick={() => setSheet("bio")} />
            <SettingsRow pane={inPane} icon={Tag} title={t("Services and prices")} sub={counts ? (counts.services > 0 ? tn(counts.services, "{n} service", "{n} services") : t("None yet")) : undefined} onClick={() => navigate("/app/more/services")} />
            <SettingsRow pane={inPane} icon={MapPin} title={t("Where you work")} sub={whereSub} onClick={() => navigate("/app/more/where-you-work")} />
            <SettingsRow pane={inPane} icon={CalendarDays} title={t("Availability")} sub={t("From your calendar")} onClick={() => navigate("/app/pro/calendar/availability")} last />
          </RowGroup>

          <SettingsSection pane={inPane} label={t("Also on your profile")}>
            <SettingsRow pane={inPane} icon={Quote} title={t("Headline")} sub={cv?.profile.headline || t("Not written yet")} onClick={() => setCvView({ kind: "headline" })} />
            <SettingsRow pane={inPane} icon={GraduationCap} title={t("Qualifications")} sub={cv && cv.education.length > 0 ? tn(cv.education.length, "{n} qualification", "{n} qualifications") : t("None yet")} onClick={() => setCvView({ kind: "list", key: "education" })} />
            <SettingsRow pane={inPane} icon={Languages} title={t("Skills and languages")} sub={cv ? [cv.profile.skills.length ? tn(cv.profile.skills.length, "{n} skill", "{n} skills") : null, cv.languages.length ? tn(cv.languages.length, "{n} language", "{n} languages") : null].filter(Boolean).join(" · ") || t("None yet") : undefined} onClick={() => setCvView({ kind: "skills" })} />
            <SettingsRow pane={inPane} icon={Award} title={t("Awards")} sub={cv && cv.awards.length ? t("{n} added", { n: cv.awards.length }) : t("None yet")} onClick={() => setCvView({ kind: "list", key: "awards" })} />
            <SettingsRow pane={inPane} icon={BookOpen} title={t("Publications")} sub={cv && cv.publications.length ? t("{n} added", { n: cv.publications.length }) : t("None yet")} onClick={() => setCvView({ kind: "list", key: "publications" })} />
            <SettingsRow pane={inPane} icon={LinkIcon} title={t("Links")} sub={cv && cv.links.length ? t("{n} added", { n: cv.links.length }) : t("None yet")} onClick={() => setCvView({ kind: "list", key: "links" })} />
            <SettingsRow pane={inPane}
              icon={HandHeart}
              title={t("Volunteering")}
              sub={cv ? `${cv.volunteering.length ? `${t("{n} added", { n: cv.volunteering.length })} · ` : ""}${cv.profile.showVolunteering ? t("Shown to clients") : t("Hidden from clients")}` : undefined}
              onClick={() => setCvView({ kind: "list", key: "volunteering" })}
            />
            <SettingsRow pane={inPane} icon={Globe2} title={t("Details and links")} sub={t("Specialty, location, website and socials")} onClick={() => setSheet("details")} />
            <SettingsRow pane={inPane} icon={Music2} title={t("Playlist")} sub={playlist === undefined ? undefined : playlistService ? t("{service} · shown on your profile", { service: SERVICE_LABEL[playlistService] }) : t("Optional. Spotify, Apple Music or YouTube Music")} onClick={() => setSheet("playlist")} />
            <SettingsRow pane={inPane} icon={AtSign} title={t("Your handle")} sub={facts?.handle ? profileUrl(facts.handle) : t("Choose a handle for your profile link")} onClick={() => setSheet("handle")} />
            <SettingsRow pane={inPane}
              icon={Store}
              title={t("Public listing")}
              sub={facts?.listedPublicly ? t("Listed in Explore") : t("Not listed")}
              onClick={() => navigate("/app/more/practice/listing")}
              last
            />
          </SettingsSection>

          <FootNote icon={Lock} style={{ marginTop: 8 }}>
            {pending ? t("Your request to change to {v} is with our team.", { v: typeLabel(pending) }) : t("Professional type is set at sign-up and verified with your licence. Contact support to change it.")}
          </FootNote>
          {!cv && <StateLine>{cvError}</StateLine>}
        </>
      )}

      {picker.inputs}
      {cover.inputs}
      <PhotoSourceSheet open={sheet === "photo"} onClose={() => setSheet(null)} picker={picker} cover={cover} />
      <NameSheet open={sheet === "name"} onClose={() => setSheet(null)} />
      <TypeLockedPopup open={sheet === "locked"} onClose={() => setSheet(null)} onContact={() => setSheet("request")} />
      <TypeChangeSheet open={sheet === "request"} onClose={() => setSheet(null)} current={user.professionalSubtype} pending={pending} onSent={setPending} />
      <SpecialtiesSheet open={sheet === "specialties"} onClose={() => setSheet(null)} initial={facts?.specialties ?? []} onSaved={(list) => setFacts((f) => (f ? { ...f, specialties: list } : f))} />
      <ProfessionalBioSheet open={sheet === "bio"} onClose={() => setSheet(null)} onSaved={(bio) => setFacts((f) => (f ? { ...f, bio } : f))} />
      <ListingDetailsSheet open={sheet === "details"} onClose={() => setSheet(null)} />
      <ProfilePlaylistSheet open={sheet === "playlist"} onClose={() => setSheet(null)} url={playlist ?? null} onSaved={setPlaylist} />
      <HandleSheet open={sheet === "handle"} onClose={() => setSheet(null)} handle={facts?.handle ?? null} onSaved={(h) => setFacts((f) => (f ? { ...f, handle: h } : f))} />
      {cv && userId && <CvSheetsHost userId={userId} cv={cv} setCv={setCv} reload={reloadCv} view={cvView} onView={setCvView} />}
    </SubPage>
  );
}
