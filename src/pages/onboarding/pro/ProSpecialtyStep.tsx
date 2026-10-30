import React from "react";
import { ObPage, ObProgress, ObHeader, ObTitle, ObFooter } from "../shell/ObShell";
import { ObSelectCard } from "../shell/ObBlocks";
import { Composed, OB } from "../shell/visuals";
import { ProCoachArt, ProDietitianArt, ProDoctorArt, ProNutritionistArt, ProOtherArt, ProPhysioArt, ProTrainerArt } from "../../../components/icons/BusinessArt";
import type { ProfessionalSubtype } from "../../../types";
import { SPECIALTY_CARDS, proKindOf, specialtyNote, type ProKind } from "./proModel";
import { t } from "../../../i18n/core";

const ART: Record<ProKind, React.FC<{ size?: number }>> = {
  trainer: ProTrainerArt,
  physio: ProPhysioArt,
  diet: ({ size }) => <ProDietitianArt size={size} ground="var(--ob-pale)" />,
  // Release 3: no drawings were supplied for the new types; these are ours,
  // in the set's style (BusinessArt).
  nutritionist: ProNutritionistArt,
  coach: ProCoachArt,
  doctor: ProDoctorArt,
  other: ProOtherArt,
};

/**
 * Before step 1 · What kind of professional are you? (OB-136, OB-159, OB-161,
 * OB-193; SharedOnboardingV4 proType). The four specialty cards with the
 * BusinessArt professional drawings; the picked card lifts, outlines and tilts
 * its drawing −4deg while the others recede (motion/card-selected). Saved as
 * profiles.professional_subtype at the end, exactly as before.
 */
export const ProSpecialtyStep: React.FC<{
  value: ProfessionalSubtype | null;
  onChange: (v: ProfessionalSubtype) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ value, onChange, onNext, onBack }) => (
  <ObPage backdrop>
    <div className="ob-body ob-step-in">
      <ObProgress count={3} index={0} variant="intro" />
      <ObHeader margin="intro" onBack={onBack} />
      <ObTitle
        variant="intro"
        chip={{ label: t("Professional"), vis: <Composed comp="professional" w={16} /> }}
        eyebrow={t("Before step 1")}
        title={t("What kind of professional are you?")}
        subtitle={t("This shapes your experience. You can adjust it later.")}
      />
      <div className="ob-cards" role="radiogroup" aria-label={t("Account type")}>
        {SPECIALTY_CARDS.map((c) => {
          const on = value === c.subtype;
          const recede = !!value && !on;
          const Art = ART[c.kind];
          return (
            <ObSelectCard
              key={c.kind}
              title={t(c.title)}
              desc={<span>{t(c.description)}</span>}
              points={on ? c.points.map((p) => t(p)) : undefined}
              dot={OB.brand}
              tile={c.tile === "tealPale" ? "teal" : "pale"}
              visual={({ recede: r }) => <Art size={r ? 44 : 52} />}
              tilt="-4deg"
              tiltOrigin="50% 78%"
              on={on}
              recede={recede}
              pad="12px 16px"
              recedePad="10px 16px"
              tileSize={52}
              recedeTileSize={44}
              onSelect={() => onChange(c.subtype)}
            />
          );
        })}
      </div>
      <p className="ob-cards-note">{specialtyNote(value ? proKindOf(value) : null)}</p>
    </div>
    <ObFooter primary={{ label: t("Continue"), onClick: onNext, disabled: !value }} />
  </ObPage>
);
