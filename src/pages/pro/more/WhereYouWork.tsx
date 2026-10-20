import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Check, MapPin, Store, Video } from "lucide-react";
import { SettingsRow } from "../../../components/pro/calendar/calendarFields";
import { SectionHead, SoftLine } from "../../../components/pro/client/kit";
import { CtaButton, ErrorLine, StateLine, SubPage } from "../../../components/pro/profile/kit";
import { RADIUS_MAX_KM, WORK_TAB_TO_DB, radiusFill, workTabOf, type WorkTab } from "../../../components/pro/profile/profileModel";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { MapAreaSection } from "../../../components/profile/MapAreaSection";
import { DobInline } from "../../../components/profile/DobInline";
import { PinnedSlot } from "../../../components/ui/PinnedCta";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { fetchMyAffiliation, fetchMyProfile, NEEDS_DOB, type Affiliation, type ProfessionalProfile } from "../../../services/professional-profile";
import { fetchEmployments, saveServiceRadius, saveWorkMode, type Employment } from "../../../services/pro/profile";
import { textPx } from "../../../theme/textSize";

const TABS: { key: WorkTab; label: string }[] = [
  { key: "independent", label: "Independent" },
  { key: "business", label: "Business" },
  { key: "online", label: "Online" },
  { key: "mix", label: "Mix" },
];

/**
 * Release 3 · W6 MO20 Where you work and service area (/app/more/where-you-work,
 * and /area for the More "Service area" row; r13 whereWork13):
 * - head "Where you work" / "How and where clients can see you";
 * - work mode tabs (36 high, 11.5, 12 below) over professional_work_mode
 *   (Independent and Business are both in person, as onboarding stores them);
 * - the places card (r6b listCard6): your own space, the businesses you work
 *   at (my_business_employments, accepted, read only, each opening it under
 *   Businesses) and online;
 * - "Listed by your business" when the affiliation trigger handed the listing
 *   to the business;
 * - Service area: the radius figure (200 high r18, a circle scaled to the
 *   radius in primary over 22% lavender, a 14 dot in primary.deep with a 3
 *   card ring), "Radius" / "{n} km", the 8 high bar (primary to the share,
 *   soft after; 25 km full scale, so 10 km is 40%) and Radius / Areas tabs
 *   (34, 12, 12 above). Areas is MapAreaSection, the map area opt-in (kept);
 * - pinned Save (check) for the work mode and the radius (home_visit_km).
 */
export default function WhereYouWork() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { authUserId } = useApp();
  const dark = useIsDark();
  const { facts, setFacts, error, offline, reload } = useProfileFacts();
  const [jobs, setJobs] = useState<Employment[] | null>(null);
  const [listing, setListing] = useState<ProfessionalProfile | null>(null);
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [tab, setTab] = useState<WorkTab | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [areaTab, setAreaTab] = useState<"radius" | "areas">(pathname.endsWith("/area") ? "areas" : "radius");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dobAsk, setDobAsk] = useState<null | { retry: () => void }>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void Promise.all([fetchEmployments(), fetchMyProfile(authUserId)]).then(async ([j, p]) => {
      if (!live) return;
      setJobs(j.ok ? j.data.filter((x) => x.acceptedAt) : []);
      const prof = p.ok ? p.profile : null;
      setListing(prof);
      const aff = await fetchMyAffiliation(prof?.affiliatedBusinessId ?? null);
      if (live) setAffiliation(aff);
    });
    return () => {
      live = false;
    };
  }, [authUserId]);

  const worksAtBusiness = (jobs?.length ?? 0) > 0;
  const shownTab: WorkTab | null = tab ?? (facts ? workTabOf(facts.workMode, worksAtBusiness) : null);
  const shownKm = km ?? facts?.homeVisitKm ?? null;
  const dirty = (tab !== null && WORK_TAB_TO_DB[tab] !== facts?.workMode) || (km !== null && km !== facts?.homeVisitKm);
  const loading = !facts || jobs === null;

  useEffect(() => {
    if (!loading && pathname.endsWith("/area")) areaRef.current?.scrollIntoView({ block: "start" });
  }, [loading, pathname]);

  const save = async () => {
    if (!authUserId || !facts || busy) return;
    setBusy(true);
    setSaveError(null);
    if (tab !== null && WORK_TAB_TO_DB[tab] !== facts.workMode) {
      const r = await saveWorkMode(authUserId, WORK_TAB_TO_DB[tab]);
      if (!r.ok) {
        setBusy(false);
        return setSaveError(r.message);
      }
    }
    if (km !== null && km !== facts.homeVisitKm) {
      const r = await saveServiceRadius(authUserId, km);
      if (!r.ok) {
        setBusy(false);
        return setSaveError(r.message);
      }
    }
    setBusy(false);
    setFacts({ ...facts, workMode: tab !== null ? WORK_TAB_TO_DB[tab] : facts.workMode, homeVisitKm: km ?? facts.homeVisitKm });
    setTab(null);
    setKm(null);
    setSaved(true);
  };

  const inPerson = shownTab === "independent" || shownTab === "business" || shownTab === "mix";
  const online = shownTab === "online" || shownTab === "mix";
  const own = shownTab === "independent" || shownTab === "mix";
  const fill = radiusFill(shownKm);
  const circle = 40 + 150 * fill;

  return (
    <SubPage title="Where you work" subtitle="How and where clients can see you" bottomPad={172}>
      {offline && facts && <OfflineLine />}
      {error && !facts ? (
        <ProError onRetry={() => void reload()} />
      ) : loading ? (
        <div className="flex flex-col" style={{ gap: 12 }} role="status" aria-label="Loading">
          <ProCardSkeleton lines={3} height={170} />
          <ProCardSkeleton lines={2} height={220} />
        </div>
      ) : (
        <>
          <SegmentedTabs
            items={TABS}
            activeKey={shownTab ?? ""}
            onChange={(k) => {
              setTab(k as WorkTab);
              setSaved(false);
            }}
            tabHeight={36}
            labelSize={11.5}
            className="mb-3"
          />

          <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
            {own && <SettingsRow icon={MapPin} title={listing?.location || "Your own space"} sub="Your own space" last={!(jobs ?? []).length && !online} />}
            {(jobs ?? []).map((j, i) => (
              <SettingsRow key={j.businessId} icon={Store} title={j.businessName} sub="Connected business" onClick={() => navigate(`/app/more/businesses/${j.businessId}`)} last={i === jobs!.length - 1 && !online} />
            ))}
            {online && <SettingsRow icon={Video} title="Online" sub="Video sessions" last />}
            {!own && !online && !(jobs ?? []).length && (
              <StateLine>{shownTab === "business" ? "You're not working at a business yet. Join one from Businesses." : "Choose how you work above."}</StateLine>
            )}
          </div>
          {shownTab === "business" && !(jobs ?? []).length && (
            <SettingsRow icon={Building2} title="Businesses" sub="Join a business or answer an invitation" onClick={() => navigate("/app/more/businesses")} last />
          )}

          {affiliation && (
            <SoftLine icon={Store}>
              <b style={{ color: INK.ch }}>Listed by your business.</b> {affiliation.businessName} handles your listing while you work there.
            </SoftLine>
          )}

          <div ref={areaRef} style={{ scrollMarginTop: 16 }}>
            <SectionHead label="Service area" />
              {areaTab === "radius" ? (
                <>
                  <div
                    aria-hidden
                    className="relative overflow-hidden"
                    style={{ height: 200, borderRadius: 18, background: `repeating-linear-gradient(45deg, ${INK.soft} 0 8px, ${INK.card} 8px 16px)`, border: `1px solid ${INK.b10}`, marginBottom: 10 }}
                  >
                    {inPerson && (
                      <span className="absolute" style={{ left: "50%", top: "50%", width: circle, height: circle, margin: `${-circle / 2}px 0 0 ${-circle / 2}px`, borderRadius: 9999, background: "rgba(174,161,220,0.22)", border: `2px solid ${INK.pr}` }} />
                    )}
                    <span className="absolute" style={{ left: "50%", top: "50%", width: 14, height: 14, margin: "-7px 0 0 -7px", borderRadius: 9999, background: INK.prDeep, border: `3px solid ${INK.card}` }} />
                    {listing?.location && (
                      <span className="absolute" style={{ left: 8, bottom: 8, fontSize: 10, color: INK.chF, background: INK.card, padding: "2px 6px", borderRadius: 6 }}>
                        {listing.location}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between" style={{ fontSize: textPx(12), color: INK.chS }}>
                    <span id="radius-label">Radius</span>
                    <b style={{ color: INK.ch }}>{shownKm ? `${shownKm} km` : "Not set"}</b>
                  </div>
                  <div className="relative" style={{ marginTop: 8, height: 24 }}>
                    <span aria-hidden className="absolute block" style={{ left: 0, right: 0, top: 8, height: 8, borderRadius: 9999, background: `linear-gradient(to right, ${INK.pr} ${fill * 100}%, ${INK.soft} ${fill * 100}%)` }} />
                    <input
                      type="range"
                      min={1}
                      max={RADIUS_MAX_KM}
                      step={1}
                      value={Math.min(shownKm ?? 0, RADIUS_MAX_KM)}
                      aria-labelledby="radius-label"
                      aria-valuetext={shownKm ? `${shownKm} km` : "Not set"}
                      onChange={(e) => {
                        setKm(Number(e.target.value));
                        setSaved(false);
                      }}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      style={{ height: 24 }}
                    />
                  </div>
                </>
              ) : affiliation ? (
                <StateLine>Your business handles your listing, including where you show on the map.</StateLine>
              ) : listing ? (
                <div>
                  {dobAsk && (
                    <DobInline
                      title="Add your date of birth"
                      body={`${NEEDS_DOB} It's kept private: clients never see it.`}
                      onSaved={() => {
                        const retry = dobAsk.retry;
                        setDobAsk(null);
                        retry();
                      }}
                    />
                  )}
                  <MapAreaSection mapArea={listing.mapArea} disabled={false} dark={dark} onChanged={(next) => setListing((p) => (p ? { ...p, mapArea: next } : p))} onNeedsDob={(retry) => setDobAsk({ retry })} />
                </div>
              ) : (
                <StateLine>Save your profile details first. There's nothing to show on the map yet.</StateLine>
              )}
              <SegmentedTabs
                items={[
                  { key: "radius", label: "Radius" },
                  { key: "areas", label: "Areas" },
                ]}
                activeKey={areaTab}
                onChange={(k) => setAreaTab(k as "radius" | "areas")}
                tabHeight={34}
                labelSize={12}
                className="mt-3"
              />
          </div>
          {saveError && <ErrorLine>{saveError}</ErrorLine>}
          {saved && !dirty && (
            <p role="status" className="flex items-center" style={{ gap: 6, marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: INK.good }}>
              <Check size={13} aria-hidden /> Saved
            </p>
          )}
        </>
      )}

      {!loading && (
        <PinnedSlot>
          <CtaButton label="Save" icon={Check} onClick={() => void save()} disabled={!dirty} busy={busy} full />
        </PinnedSlot>
      )}
    </SubPage>
  );
}
