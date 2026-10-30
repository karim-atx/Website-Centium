import React, { lazy, Suspense, useMemo, useState } from "react";
import { Building2, ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { ObStep, ObFooter, ObToast, useObToast } from "../shell/ObShell";
import { ObField, ObRows, ObSectionLabel } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useIsDark } from "../../../hooks/useIsDark";
import { AREAS, type Area } from "../../../services/geo/areas";
import { distanceKm, type Coords } from "../../../services/geo/distance";
import { HOME_VISIT_KM, WORK_MODES, workComplete, type WorkMode } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { Field } from "./parts";
import type { ProStepProps } from "./types";

const NearbyMap = lazy(() => import("../../../components/professionals/NearbyMap"));

/** The named area nearest a dropped pin, within 5 km (as MapAreaSection names a pin). */
function nearestArea(c: Coords): Area | null {
  let best: Area | null = null;
  let bestKm = Infinity;
  for (const a of AREAS) {
    const km = distanceKm(c, a);
    if (km < bestKm) {
      best = a;
      bestKm = km;
    }
  }
  return best && bestKm <= 5 ? best : null;
}

const BEIRUT = { lat: 33.89, lng: 35.5 };

/**
 * Step 2 · Where you work (OB-141, OB-143, OB-165, OB-167, OB-168, OB-198,
 * OB-200). Work mode (professional_work_mode: Independent and At a business
 * are both in person), the business ID when at a business (sent as a join
 * request on submit, Database B6 request_to_join_business), the area
 * clients see (an approximate area, never an address: the app's area list or
 * a pin, stored to about 1 km and shown only once the profile is listed), and
 * a Physiotherapist's home-visit radius.
 */
export const ProWorkStep: React.FC<ProStepProps> = ({ kind, pro, setPro, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const [areaText, setAreaText] = useState(pro.area?.label ?? "");
  const [areaMenu, setAreaMenu] = useState(false);
  const [kmMenu, setKmMenu] = useState<HTMLElement | null>(null);
  const [pinning, setPinning] = useState(false);
  const [tried, setTried] = useState(false);
  const [toast, showToast] = useObToast();
  const [areaBox, setAreaBox] = useState<HTMLLabelElement | null>(null);

  const mode = pro.workMode;
  const atBusiness = mode === "business";
  const showArea = !!mode && mode !== "online";
  const showHomeVisits = kind === "physio" && !!mode && !atBusiness && mode !== "online";
  const matches = useMemo(() => {
    const term = areaText.trim().toLowerCase();
    if (!term || term === pro.area?.label.toLowerCase()) return [];
    return AREAS.filter((a) => a.name.toLowerCase().includes(term) || a.region.toLowerCase().includes(term)).slice(0, 8);
  }, [areaText, pro.area]);

  const areaUnmatched = showArea && areaText.trim() !== "" && areaText.trim() !== pro.area?.label;
  const areaError = tried && areaUnmatched ? "Pick your area from the list, or tap Pin." : null;
  const codeError = tried && atBusiness && !pro.businessCode.trim() ? "Add the business ID." : null;
  const ok = workComplete(pro) && !areaUnmatched;

  const pickArea = (a: { label: string; lat: number; lng: number }) => {
    setPro((p) => ({ ...p, area: a }));
    setAreaText(a.label);
    setAreaMenu(false);
  };

  if (pinning) {
    return (
      <PlacePin
        kind={kind}
        chipLabel={chipLabel}
        initial={pro.area ?? null}
        onBack={() => setPinning(false)}
        onConfirm={(c) => {
          const near = nearestArea(c);
          pickArea({ label: near?.name ?? "Pinned area", lat: c.lat, lng: c.lng });
          setPinning(false);
          showToast("Pin placed. Address updated.");
        }}
      />
    );
  }

  const homeArea = pro.area?.label ?? "your area";

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="work"
      title="Where you work"
      subtitle="Clients filter by this, so they find you where you actually see people."
      onBack={onBack}
      footer={
        <>
          <ObFooter
            error={tried && !ok ? (codeError ?? areaError ?? (!mode ? "Choose how you work to continue." : null)) : flow && !flow.online ? OB_STRINGS.offlineStep : null}
            errorTone={tried && !ok ? "error" : "info"}
            primary={{
              label: "Continue",
              onClick: () => {
                setTried(true);
                if (ok) onNext();
              },
              disabled: tried && !ok,
            }}
          />
          <ObToast message={toast} />
        </>
      }
    >
      <ObRows
        label="How you work"
        rows={WORK_MODES.map((m) => ({
          key: m.value,
          kind: "radio",
          title: m.title,
          desc: m.description,
          on: mode === m.value,
          onClick: () => setPro((p) => ({ ...p, workMode: m.value as WorkMode, homeVisitKm: m.value === "business" || m.value === "online" ? null : p.homeVisitKm })),
        }))}
      />
      {atBusiness && (
        <ObField
          label="Business ID"
          icon={Building2}
          value={pro.businessCode}
          onChange={(e) => setPro((p) => ({ ...p, businessCode: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12) }))}
          placeholder="6-character business ID"
          autoCapitalize="characters"
          autoComplete="off"
          error={codeError}
          // Sent on submit (ProLane: request_to_join_business).
          help="We send your request when you submit. You join once the business approves it and you accept."
        />
      )}
      {showArea && (
        <>
          <ObSectionLabel title="Where you see clients" margin="10px 2px 12px" />
          {/* dc F with no label still draws its empty label row: 6 above the box. */}
          <div className="ob-field" style={{ paddingTop: 6 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <label ref={setAreaBox} className="ob-box" data-icon="" data-err={areaError ? "true" : undefined} style={{ flex: 3, minWidth: 0 }}>
                <span className="ob-box-ic" aria-hidden>
                  <Search size={16} />
                </span>
                <input
                  value={areaText}
                  onChange={(e) => {
                    setAreaText(e.target.value);
                    setAreaMenu(true);
                  }}
                  onFocus={() => setAreaMenu(true)}
                  placeholder="Search your area"
                  aria-label="Where you see clients"
                  aria-invalid={!!areaError}
                  aria-autocomplete="list"
                  style={{ height: 50 }}
                />
              </label>
              <button type="button" onClick={() => setPinning(true)} aria-label="Place the pin on the map" className="obp-pin tap">
                <MapPin size={16} strokeWidth={2.2} aria-hidden />
                Pin
              </button>
            </div>
            <div className="ob-help" data-err={areaError ? "true" : undefined}>
              <span role={areaError ? "alert" : undefined}>
                {areaError ??
                  (kind === "physio"
                    ? "Your clinic. Clients see the area, not the full address, until they book."
                    : "Clients see the area, not the full address.")}
              </span>
            </div>
          </div>
          <PopupMenu
            open={areaMenu && matches.length > 0}
            onClose={() => setAreaMenu(false)}
            anchor={areaBox}
            matchWidth={areaBox}
            variant="field"
            options={matches.map((a) => ({ value: a.id, label: a.name, note: a.region }))}
            onSelect={(id) => {
              const a = AREAS.find((x) => x.id === id);
              if (a) pickArea({ label: a.name, lat: a.lat, lng: a.lng });
            }}
          />
        </>
      )}
      {showHomeVisits && (
        <>
          <Field
            label="Home visits cover"
            tag="Optional"
            value={pro.homeVisitKm ? `Up to ${pro.homeVisitKm} km from ${homeArea}` : ""}
            placeholder="No home visits"
            trailingIcon={ChevronDown}
            onPress={(el) => setKmMenu(el)}
          />
          <PopupMenu
            open={!!kmMenu}
            onClose={() => setKmMenu(null)}
            anchor={kmMenu}
            matchWidth={kmMenu}
            variant="field"
            selected={pro.homeVisitKm ? String(pro.homeVisitKm) : "none"}
            options={[
              { value: "none", label: "No home visits" },
              ...HOME_VISIT_KM.map((km) => ({ value: String(km), label: `Up to ${km} km from ${homeArea}` })),
            ]}
            onSelect={(v) => setPro((p) => ({ ...p, homeVisitKm: v === "none" ? null : Number(v) }))}
          />
        </>
      )}
    </ObStep>
  );
};

/** Place the pin (the map screen of OB-255, BizOnboardingV10 isMap): the map moves under a centred pin. */
const PlacePin: React.FC<{
  kind: ProStepProps["kind"];
  chipLabel: string;
  initial: { lat: number; lng: number } | null;
  onBack: () => void;
  onConfirm: (c: Coords) => void;
}> = ({ kind, chipLabel, initial, onBack, onConfirm }) => {
  const dark = useIsDark();
  const [center, setCenter] = useState<Coords>(initial ?? BEIRUT);
  const [view, setView] = useState<Coords>(center);
  const [locError, setLocError] = useState<string | null>(null);
  const near = nearestArea(view);
  const locate = () => {
    if (!navigator.geolocation) {
      setLocError("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCenter(c);
        setView(c);
        setLocError(null);
      },
      () => setLocError("Allow location to use where you are, or move the map."),
      { timeout: 10000 }
    );
  };
  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="work"
      title="Place the pin"
      subtitle="Drag the map so the pin sits where you see clients."
      onBack={onBack}
      saveExit={false}
      footer={<ObFooter primary={{ label: "Confirm pin", onClick: () => onConfirm(view) }} />}
    >
      <div style={{ position: "relative", height: 420, borderRadius: 20, overflow: "hidden", marginBottom: 12, background: "var(--ob-soft)" }}>
        <Suspense fallback={<div style={{ position: "absolute", inset: 0, background: "var(--ob-soft)" }} />}>
          <NearbyMap
            center={center}
            zoom={14}
            dark={dark}
            onViewChange={(c) => setView(c)}
            ariaLabel="Map. Drag to move the pin to where you see clients."
            className="absolute inset-0"
            hideControls
          />
        </Suspense>
        <span style={{ position: "absolute", insetInlineStart: "50%", top: "50%", transform: "translate(-50%,-100%)", display: "flex", color: "var(--ob-brand)", pointerEvents: "none" }}>
          <MapPin size={40} strokeWidth={2} aria-hidden />
        </span>
        <span
          style={{ position: "absolute", insetInlineStart: "50%", top: "50%", width: 10, height: 4, borderRadius: 999, background: "rgba(0,0,0,0.25)", transform: "translate(-50%,-1px)", pointerEvents: "none" }}
        />
        <button
          type="button"
          aria-label="Use current location"
          onClick={locate}
          className="tap"
          // 12 from the edge as drawn, lifted above the map's credit line (it must stay visible).
          style={{
            position: "absolute",
            insetInlineEnd: 12,
            bottom: 30,
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "var(--ob-card)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ob-accent)",
          }}
        >
          <LocateFixed size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className="obp-maparea">
        <MapPin size={14} aria-hidden style={{ color: "var(--ob-accent)", flex: "none" }} />
        {near ? `Near ${near.name}` : "Clients see this area, about 1 km across."}
      </p>
      {locError && (
        <p role="alert" className="obp-maperr">
          {locError}
        </p>
      )}
    </ObStep>
  );
};
