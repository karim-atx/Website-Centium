import React, { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObMenu, ObSectionLabel } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { FORMATS, HOME_VISIT_KM, HOME_VISITS_CHIP, MAX_SPECIALTIES, MORE_SPECIALTIES, SESSION_BOXES, SESSION_LENGTHS, SPECIALTIES, stepLength } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { Chips, Field, LinkLine, NumBoxes } from "./parts";
import type { ProStepProps } from "./types";

/**
 * Step 3 · Specialties and services (OB-144, OB-146, OB-169, OB-171, OB-172,
 * OB-201, OB-203). Up to five specialties (the chips plus the "More" menu),
 * how they work with clients, and two session lengths stepped through the
 * lengths the database accepts (15 to 120). Written at Review to
 * professional_profiles.specialties / session_formats / session_lengths (B5).
 */
export const ProServicesStep: React.FC<ProStepProps> = ({ kind, pro, setPro, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const [menu, setMenu] = useState(false);
  const [capHit, setCapHit] = useState(false);
  // The menu sits where the frame draws it (BizOnboardingV10: left 24, right 110,
  // top 300 = 46 below the Specialties label): an empty anchor 48 down, the
  // menu opening 6 below it.
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  const spec = SPECIALTIES[kind];
  const all = [...spec, ...MORE_SPECIALTIES[kind]];
  // Picked from the menu but not one of the six chips: shown as chips too.
  const extra = pro.specialties.filter((s) => !spec.includes(s));

  const toggleSpecialty = (s: string) => {
    if (pro.specialties.includes(s)) {
      setCapHit(false);
      setPro((p) => ({ ...p, specialties: p.specialties.filter((x) => x !== s) }));
    } else if (pro.specialties.length >= MAX_SPECIALTIES) {
      setCapHit(true);
    } else {
      setCapHit(false);
      setPro((p) => ({ ...p, specialties: [...p.specialties, s].slice(0, MAX_SPECIALTIES) }));
    }
  };
  const toggleFormat = (f: string) =>
    setPro((p) => {
      const off = p.formats.includes(f);
      // Turning Home visits off clears the radius, so session_places and
      // home_visit_km never disagree (a physiotherapist's radius from Where
      // you work stays: it is their own home-visit answer).
      const clearKm = off && f === HOME_VISITS_CHIP && kind !== "physio";
      return { ...p, formats: off ? p.formats.filter((x) => x !== f) : [...p.formats, f], homeVisitKm: clearKm ? null : p.homeVisitKm };
    });
  const [kmMenu, setKmMenu] = useState<HTMLElement | null>(null);
  const [tried, setTried] = useState(false);
  const homeVisits = pro.formats.includes(HOME_VISITS_CHIP) && pro.workMode !== "online" && pro.workMode !== "business";
  const kmError = tried && homeVisits && !pro.homeVisitKm ? "Choose how far you travel for home visits." : null;
  const area = pro.area?.label ?? "your area";
  const setLength = (i: 0 | 1, dir: 1 | -1) =>
    setPro((p) => {
      const next: [number, number] = [...p.lengths] as [number, number];
      next[i] = stepLength(next[i], dir);
      return { ...p, lengths: next };
    });

  const boxes = SESSION_BOXES[kind];
  const min = SESSION_LENGTHS[0];
  const max = SESSION_LENGTHS[SESSION_LENGTHS.length - 1];

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="services"
      title="Specialties and services"
      subtitle="What you're best at and how a session works. Clients compare on this."
      onBack={onBack}
      footer={
        <ObFooter
          error={kmError ? "Fix 1 thing to continue." : flow && !flow.online ? OB_STRINGS.offlineStep : null}
          errorTone={kmError ? "error" : "info"}
          primary={{
            label: "Continue",
            onClick: () => {
              setTried(true);
              if (!(homeVisits && !pro.homeVisitKm)) onNext();
            },
            disabled: !!kmError,
          }}
        />
      }
    >
      <div style={{ position: "relative" }}>
        <span ref={setAnchor} aria-hidden style={{ position: "absolute", insetInlineStart: 0, top: 48, width: 0, height: 0 }} />
        <Chips
          label="Specialties"
          tag="Up to 5"
          options={[...spec, ...extra]}
          selected={pro.specialties}
          onToggle={toggleSpecialty}
          onMore={() => setMenu(true)}
          error={capHit ? "You can pick up to 5. Untick one to swap it." : null}
        />
      </div>
      {menu && (
        <ObMenu
          title="Specialties"
          anchor={anchor}
          align="left"
          width={256}
          options={all.map((s) => ({ key: s, label: s, on: pro.specialties.includes(s) }))}
          onToggle={toggleSpecialty}
          onClose={() => setMenu(false)}
        />
      )}
      <Chips label="How you work with clients" tag="Pick any" options={FORMATS[kind]} selected={pro.formats} onToggle={toggleFormat} />
      {homeVisits && (
        <>
          <Field
            label="Home visits cover"
            tag="Required"
            value={pro.homeVisitKm ? `Up to ${pro.homeVisitKm} km from ${area}` : ""}
            placeholder="Choose a distance"
            trailingIcon={ChevronDown}
            error={kmError}
            onPress={(el) => setKmMenu(el)}
          />
          <PopupMenu
            open={!!kmMenu}
            onClose={() => setKmMenu(null)}
            anchor={kmMenu}
            matchWidth={kmMenu}
            variant="field"
            selected={pro.homeVisitKm ? String(pro.homeVisitKm) : null}
            options={HOME_VISIT_KM.map((km) => ({ value: String(km), label: `Up to ${km} km from ${area}` }))}
            onSelect={(v) => setPro((p) => ({ ...p, homeVisitKm: Number(v) }))}
          />
        </>
      )}
      <ObSectionLabel title="Session length" margin="6px 2px 12px" />
      <NumBoxes
        items={[0, 1].map((i) => ({
          label: boxes[i].label,
          value: pro.lengths[i],
          onLess: () => setLength(i as 0 | 1, -1),
          onMore: () => setLength(i as 0 | 1, 1),
          lessDisabled: pro.lengths[i] <= min,
          moreDisabled: pro.lengths[i] >= max,
        }))}
      />
      <LinkLine icon={Clock} text="Add packages and prices after you're live" margin="-4px 2px 8px" />
    </ObStep>
  );
};
