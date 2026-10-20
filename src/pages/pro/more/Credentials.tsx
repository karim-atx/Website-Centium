import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award as AwardIcon, BadgeCheck, GraduationCap, Plus, ShieldAlert, Upload } from "lucide-react";
import { SettingsRow } from "../../../components/pro/calendar/calendarFields";
import { Section, StateLine, SubPage, VerifiedTag } from "../../../components/pro/profile/kit";
import { AddChip, SpecialtiesSheet, SpecialtyChip } from "../../../components/pro/profile/EditSheets";
import { CertificationSheet } from "../../../components/profile/CertificationSheet";
import { LicenceStatusBadge } from "../../../components/cv/CvBadges";
import { CvSheetsHost, type CvView } from "../../../components/cv/CvEditor";
import { useMyCv } from "../../../components/cv/useMyCv";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { monthYear } from "../../../components/pro/profile/profileModel";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { licenceStatus } from "../../../services/professional-cv";
import { byRecency } from "../../../services/professional-cv/cvDates";
import { saveSpecialties } from "../../../services/pro/profile";
import { ErrorLine } from "../../../components/pro/profile/kit";

/**
 * Release 3 · W6 MO4 Credentials and licence (/app/more/credentials; more.js
 * credentials): "Clients see the Verified mark, never the document".
 * - Licence: each CV licence (name; "No. {n} · Expires {date}"; Verified
 *   12 / 10 / 700 good, or the review state) opening the CV licence sheet with
 *   its "Show on my profile" switch; "Add a document" (Photo or PDF, checked
 *   by our team) opens the CertificationSheet; while nothing is verified, a
 *   Verification row opens /app/professionals/verification (ProVerification,
 *   kept).
 * - Qualifications: the CV's education entries (graduation cap; award for
 *   one without a degree), editable in their sheets.
 * - Specialties: professional_profiles.specialties as chips (fill / onFill
 *   with ×, 12 / 700, pad 7 13) and Add.
 */
export default function Credentials() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const { cv, setCv, error: cvError, reload: reloadCv, userId } = useMyCv();
  const { facts, setFacts, error: factsError, offline, reload } = useProfileFacts();
  const [cvView, setCvView] = useState<CvView | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);

  const title = lane === "clinical_overview" ? "Registration and licence" : "Credentials and licence";
  const loading = !cv && !cvError;
  const anyVerified = !!cv && cv.licences.some((l) => licenceStatus(l, cv.reviews).kind === "verified");

  const removeSpecialty = async (s: string) => {
    if (!authUserId || !facts) return;
    const next = facts.specialties.filter((x) => x !== s);
    setSpecError(null);
    const r = await saveSpecialties(authUserId, next);
    if (!r.ok) return setSpecError(r.message);
    setFacts({ ...facts, specialties: next });
  };

  return (
    <SubPage title={title} subtitle="Clients see the Verified mark, never the document">
      {offline && facts && <OfflineLine />}
      {cvError && !cv ? (
        <ProError onRetry={() => void reloadCv()} />
      ) : loading ? (
        <div className="flex flex-col" style={{ gap: 12 }} role="status" aria-label="Loading">
          <ProCardSkeleton lines={3} height={150} />
          <ProCardSkeleton lines={3} height={150} />
        </div>
      ) : (
        cv && (
          <>
            <Section label="Licence" first>
              {cv.licences.map((l) => {
                const st = licenceStatus(l, cv.reviews);
                const sub = [l.credentialId ? `No. ${l.credentialId}` : null, l.noExpiry ? "No expiry" : l.expires ? `Expires ${monthYear(l.expires)}` : null].filter(Boolean).join(" · ");
                return (
                  <SettingsRow
                    key={l.id}
                    icon={BadgeCheck}
                    title={l.name ?? "Unnamed licence"}
                    sub={sub || "Add its number and expiry"}
                    right={st.kind === "verified" ? <VerifiedTag /> : st.kind === "none" ? undefined : <LicenceStatusBadge status={st} />}
                    onClick={() => setCvView({ kind: "licence", entry: l })}
                  />
                );
              })}
              {!anyVerified && (
                <SettingsRow
                  icon={ShieldAlert}
                  title="Verification"
                  sub={cv.licences.length ? "See where your check is" : "Add your licence or certificate to be verified"}
                  onClick={() => navigate("/app/professionals/verification")}
                />
              )}
              <SettingsRow icon={Upload} title="Add a document" sub="Photo or PDF, checked by our team" onClick={() => setCertOpen(true)} last />
            </Section>

            <Section label="Qualifications">
              {byRecency(cv.education, false).map((e) => {
                const t = [e.degree, e.field].filter(Boolean).join(" ");
                const year = e.end?.slice(0, 4) ?? e.start?.slice(0, 4) ?? null;
                return (
                  <SettingsRow
                    key={e.id}
                    icon={e.degree ? GraduationCap : AwardIcon}
                    title={t || e.institution}
                    sub={[t ? e.institution : null, year].filter(Boolean).join(" · ") || undefined}
                    onClick={() => setCvView({ kind: "list", key: "education" })}
                  />
                );
              })}
              {cv.education.length === 0 && <StateLine>No qualifications yet.</StateLine>}
              <SettingsRow icon={Plus} title="Add a qualification" onClick={() => setCvView({ kind: "list", key: "education" })} last />
            </Section>

            <Section label="Specialties">
              {factsError && !facts ? (
                <div style={{ paddingTop: 12 }}>
                  <ProError onRetry={() => void reload()} />
                </div>
              ) : (
                <div className="flex flex-wrap" style={{ gap: 6, paddingTop: 12 }}>
                  {(facts?.specialties ?? []).map((s) => (
                    <SpecialtyChip key={s} label={s} on onClick={() => void removeSpecialty(s)} />
                  ))}
                  <AddChip onClick={() => setSpecOpen(true)} />
                </div>
              )}
              {specError && <ErrorLine>{specError}</ErrorLine>}
            </Section>
          </>
        )
      )}

      <CertificationSheet key={certOpen ? "cert-open" : "cert-closed"} open={certOpen} onClose={() => { setCertOpen(false); void reloadCv(); }} />
      <SpecialtiesSheet open={specOpen} onClose={() => setSpecOpen(false)} initial={facts?.specialties ?? []} onSaved={(list) => setFacts((f) => (f ? { ...f, specialties: list } : f))} />
      {cv && userId && <CvSheetsHost userId={userId} cv={cv} setCv={setCv} reload={reloadCv} view={cvView} onView={setCvView} />}
    </SubPage>
  );
}
