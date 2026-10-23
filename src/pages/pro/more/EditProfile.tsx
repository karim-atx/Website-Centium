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
} from "lucide-react";
import { SettingsRow, SettingsSection } from "../../../components/pro/calendar/calendarFields";
import { FootNote, HeadLink, LockTile, StateLine, SubPage } from "../../../components/pro/profile/kit";
import { NameSheet, HandleSheet, PhotoSourceSheet, TypeChangeSheet, TypeLockedPopup, usePhotoPicker } from "../../../components/pro/profile/ProfileSheets";
import { ListingDetailsSheet, SpecialtiesSheet } from "../../../components/pro/profile/EditSheets";
import { ProfessionalBioSheet } from "../../../components/profile/ProfessionalBioCard";
import { CvSheetsHost, type CvView } from "../../../components/cv/CvEditor";
import { useMyCv } from "../../../components/cv/useMyCv";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { licenceFacts, plural, profileUrl, shortDate, wordCount, yearsOfExperience } from "../../../components/pro/profile/profileModel";
import { typeLabel } from "../../../components/pro/profile/typeLabel";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { useApp } from "../../../context/AppContext";
import { currentMonth } from "../../../services/professional-cv/cvDates";
import { fetchEmployments, fetchPendingTypeChange, fetchServicePlans } from "../../../services/pro/profile";
import { fetchSessionTypes } from "../../../services/pro/calendar";
import type { ProfessionalSubtype } from "../../../types";

type Sheet = null | "photo" | "name" | "locked" | "request" | "specialties" | "bio" | "details" | "handle";

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
export default function EditProfile() {
  const navigate = useNavigate();
  const { user, authUserId } = useApp();
  const { cv, setCv, error: cvError, reload: reloadCv, userId } = useMyCv();
  const { facts, setFacts, error: factsError, offline, reload } = useProfileFacts();
  const picker = usePhotoPicker();
  const [sheet, setSheet] = useState<Sheet>(null);
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
  const ownPlaces = facts?.workMode === "both" ? 2 : facts?.workMode ? 1 : 0;
  const places = (counts?.places ?? 0) + ownPlaces;
  const whereSub = [places > 0 ? plural(places, "place") : "Not set yet", facts?.homeVisitKm ? `${facts.homeVisitKm} km` : null].filter(Boolean).join(" · ");
  const licenceSub = !lic?.primary
    ? "Not added yet"
    : lic.verified
      ? lic.verifiedAt
        ? `Verified ${shortDate(lic.verifiedAt)}`
        : "Verified"
      : lic.status?.kind === "rejected"
        ? "Needs changes"
        : lic.status?.kind === "pending"
          ? "We're checking it"
          : "No document yet";
  const words = wordCount(facts?.bio);

  return (
    <SubPage title="Edit public profile" subtitle="Each section opens its own sheet" right={<HeadLink label="Preview" onClick={() => navigate("/app/more/public-profile")} />}>
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
        <div className="flex flex-col" style={{ gap: 12, marginTop: 12 }} role="status" aria-label="Loading">
          <ProCardSkeleton lines={6} height={300} />
          <ProCardSkeleton lines={4} height={200} />
        </div>
      ) : (
        <>
          <div>
            <SettingsRow icon={ImageIcon} title="Photo and cover" sub={user.avatarUrl ? "Added" : "Not added yet"} onClick={() => setSheet("photo")} />
            <SettingsRow icon={UserRound} title="Name" sub={user.firstName || "Add your name"} onClick={() => setSheet("name")} />
            <SettingsRow icon={Briefcase} title="Professional type" sub={typeLabel(user.professionalSubtype)} right={<LockTile />} onClick={() => setSheet("locked")} ariaLabel={`Professional type, ${typeLabel(user.professionalSubtype)}. Locked`} />
            <SettingsRow icon={Sparkles} title="Specialties" sub={facts && facts.specialties.length > 0 ? `${facts.specialties.length} selected` : "None yet"} onClick={() => setSheet("specialties")} />
            <SettingsRow icon={GraduationCap} title="Credentials" sub={cv && cv.licences.length > 0 ? plural(cv.licences.length, "certification") : "None yet"} onClick={() => navigate("/app/more/credentials")} />
            <SettingsRow icon={ShieldCheck} title="Licence" sub={licenceSub} onClick={() => setCvView({ kind: "licence", entry: lic?.primary ?? null })} />
            <SettingsRow icon={BriefcaseBusiness} title="Experience" sub={cv && cv.experience.length > 0 ? plural(years, "year") : "None yet"} onClick={() => setCvView({ kind: "list", key: "experience" })} />
            <SettingsRow icon={AlignLeft} title="Bio" sub={words > 0 ? plural(words, "word") : "Not written yet"} onClick={() => setSheet("bio")} />
            <SettingsRow icon={Tag} title="Services and prices" sub={counts ? (counts.services > 0 ? plural(counts.services, "service") : "None yet") : undefined} onClick={() => navigate("/app/more/services")} />
            <SettingsRow icon={MapPin} title="Where you work" sub={whereSub} onClick={() => navigate("/app/more/where-you-work")} />
            <SettingsRow icon={CalendarDays} title="Availability" sub="From your calendar" onClick={() => navigate("/app/pro/calendar/availability")} last />
          </div>

          <SettingsSection label="Also on your profile">
            <SettingsRow icon={Quote} title="Headline" sub={cv?.profile.headline || "Not written yet"} onClick={() => setCvView({ kind: "headline" })} />
            <SettingsRow icon={GraduationCap} title="Qualifications" sub={cv && cv.education.length > 0 ? plural(cv.education.length, "qualification") : "None yet"} onClick={() => setCvView({ kind: "list", key: "education" })} />
            <SettingsRow icon={Languages} title="Skills and languages" sub={cv ? [cv.profile.skills.length ? plural(cv.profile.skills.length, "skill") : null, cv.languages.length ? plural(cv.languages.length, "language") : null].filter(Boolean).join(" · ") || "None yet" : undefined} onClick={() => setCvView({ kind: "skills" })} />
            <SettingsRow icon={Award} title="Awards" sub={cv && cv.awards.length ? `${cv.awards.length} added` : "None yet"} onClick={() => setCvView({ kind: "list", key: "awards" })} />
            <SettingsRow icon={BookOpen} title="Publications" sub={cv && cv.publications.length ? `${cv.publications.length} added` : "None yet"} onClick={() => setCvView({ kind: "list", key: "publications" })} />
            <SettingsRow icon={LinkIcon} title="Links" sub={cv && cv.links.length ? `${cv.links.length} added` : "None yet"} onClick={() => setCvView({ kind: "list", key: "links" })} />
            <SettingsRow
              icon={HandHeart}
              title="Volunteering"
              sub={cv ? `${cv.volunteering.length ? `${cv.volunteering.length} added · ` : ""}${cv.profile.showVolunteering ? "Shown to clients" : "Hidden from clients"}` : undefined}
              onClick={() => setCvView({ kind: "list", key: "volunteering" })}
            />
            <SettingsRow icon={Globe2} title="Details and links" sub="Specialty, location, website and socials" onClick={() => setSheet("details")} />
            <SettingsRow icon={AtSign} title="Your handle" sub={facts?.handle ? profileUrl(facts.handle) : "Choose a handle for your profile link"} onClick={() => setSheet("handle")} />
            <SettingsRow
              icon={Store}
              title="Public listing"
              sub={facts?.listedPublicly ? "Listed in Explore" : "Not listed"}
              onClick={() => navigate("/app/more/practice/listing")}
              last
            />
          </SettingsSection>

          <FootNote icon={Lock} style={{ marginTop: 8 }}>
            {pending ? `Your request to change to ${typeLabel(pending)} is with our team.` : "Professional type is set at sign-up and verified with your licence. Contact support to change it."}
          </FootNote>
          {!cv && <StateLine>{cvError}</StateLine>}
        </>
      )}

      {picker.inputs}
      <PhotoSourceSheet open={sheet === "photo"} onClose={() => setSheet(null)} picker={picker} />
      <NameSheet open={sheet === "name"} onClose={() => setSheet(null)} />
      <TypeLockedPopup open={sheet === "locked"} onClose={() => setSheet(null)} onContact={() => setSheet("request")} />
      <TypeChangeSheet open={sheet === "request"} onClose={() => setSheet(null)} current={user.professionalSubtype} pending={pending} onSent={setPending} />
      <SpecialtiesSheet open={sheet === "specialties"} onClose={() => setSheet(null)} initial={facts?.specialties ?? []} onSaved={(list) => setFacts((f) => (f ? { ...f, specialties: list } : f))} />
      <ProfessionalBioSheet open={sheet === "bio"} onClose={() => setSheet(null)} onSaved={(bio) => setFacts((f) => (f ? { ...f, bio } : f))} />
      <ListingDetailsSheet open={sheet === "details"} onClose={() => setSheet(null)} />
      <HandleSheet open={sheet === "handle"} onClose={() => setSheet(null)} handle={facts?.handle ?? null} onSaved={(h) => setFacts((f) => (f ? { ...f, handle: h } : f))} />
      {cv && userId && <CvSheetsHost userId={userId} cv={cv} setCv={setCv} reload={reloadCv} view={cvView} onView={setCvView} />}
    </SubPage>
  );
}
