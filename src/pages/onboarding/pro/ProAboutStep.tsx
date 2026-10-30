import React, { useState } from "react";
import { Apple, Calendar, Dumbbell, Lightbulb, Sparkles, Stethoscope } from "lucide-react";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObField, ObTip } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { ageFromDateOfBirth, isoDateYearsAgo, MAX_AGE, MIN_AGE, validateDateOfBirth } from "../../../utils/date";
import { isReservedDisplayName } from "../../../services/profile";
import { CLOSEST_GROUPS, GUIDE, WHAT_YOU_DO_MAX, whatYouDoError, type ClosestGroup } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import type { ProStepProps } from "./types";
import { t, tn } from "../../../i18n/core";

const GROUP_ICONS = { fitness: Dumbbell, clinical: Stethoscope, nutrition: Apple, other: Sparkles } as const;

/**
 * Step 1 · About you (OB-138, OB-140, OB-162, OB-164, OB-195, OB-197; Other's
 * fields OURS-other-professional-fields). Name, date of birth (16+, locked once
 * saved), and for an Other professional "What do you do?" and "Closest group".
 * Kept from the live step: the reserved-name check and the date-of-birth rule
 * and lock note (the old DobField's copy). The certificate moved to Credentials.
 */
export const ProAboutStep: React.FC<ProStepProps> = ({ kind, shared, setShared, pro, setPro, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reserved, setReserved] = useState(false);
  const dateRef = React.useRef<HTMLInputElement>(null);
  const isOther = kind === "other";
  const chipLabel = proChipLabel(kind, pro.whatYouDo);

  const name = shared.firstName;
  const dob = shared.dateOfBirth;
  const dobProblem = dob ? validateDateOfBirth(dob) : null;
  const age = dob && !dobProblem ? ageFromDateOfBirth(dob) : undefined;
  const nameError = reserved ? t("That name is reserved. Choose a different name.") : tried && !name.trim() ? t("Add your name.") : null;
  // validateDateOfBirth (utils/date) returns English; shown through t().
  const dobError = dobProblem ? t(dobProblem) : tried && !dob ? t("Add your date of birth.") : null;
  const doError = isOther ? whatYouDoError(pro.whatYouDo) : null;
  const groupError = isOther && tried && !pro.closestGroup ? t("Pick the closest group.") : null;
  const errors = [nameError, dobError, doError, groupError].filter(Boolean).length;
  const valid = !!name.trim() && !!dob && !dobProblem && !doError && (!isOther || !!pro.closestGroup);

  const go = async () => {
    setTried(true);
    if (!valid || busy) return;
    setBusy(true);
    // The database refuses a name reserved for Centium ("Centium Support"),
    // but only at the final save: asked here instead (kept from AboutYouStep).
    const isReserved = (await isReservedDisplayName(name.trim())) === true;
    setBusy(false);
    if (isReserved) {
      setReserved(true);
      return;
    }
    onNext();
  };

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="about"
      title={t("About you")}
      subtitle={t("Sets up your own Centium profile. You'll add clients next.")}
      onBack={onBack}
      footer={
        <ObFooter
          error={tried && errors > 0 ? tn(errors, "Fix {n} thing to continue.", "Fix {n} things to continue.") : flow && !flow.online ? t(OB_STRINGS.offlineStep) : null}
          errorTone={tried && errors > 0 ? "error" : "info"}
          primary={{ label: t("Continue"), onClick: () => void go(), disabled: (tried && errors > 0) || busy }}
        />
      }
    >
      <ObField
        label={t("Name")}
        value={name}
        onChange={(e) => {
          setReserved(false);
          setShared({ firstName: e.target.value });
        }}
        placeholder={t("e.g. John Doe")}
        autoComplete="name"
        error={nameError}
        onKeyDown={(e) => {
          if (e.key === "Enter") void go();
        }}
      />
      <ObField
        ref={dateRef}
        label={t("Date of birth")}
        type="date"
        className="obp-date"
        style={dob ? undefined : { color: "var(--ob-faint)" }}
        value={dob}
        min={isoDateYearsAgo(MAX_AGE)}
        max={isoDateYearsAgo(MIN_AGE)}
        onChange={(e) => setShared({ dateOfBirth: e.target.value })}
        end={
          <button
            type="button"
            className="hit"
            aria-label={t("Open the calendar")}
            onClick={() => {
              try {
                dateRef.current?.showPicker();
              } catch {
                dateRef.current?.focus();
              }
            }}
            style={{ display: "inline-flex", color: "var(--ob-faint)" }}
          >
            <Calendar size={16} strokeWidth={2} />
          </button>
        }
        error={dobError}
        // KEEP-SAFETY (the old DobField's lock note): the lock note shows until a date is chosen.
        help={age !== undefined ? tn(age, "{n} years old", "{n} years old") : t("Required. Check it before saving; to change it later, contact support.")}
      />
      {isOther && (
        <>
          <ObField
            label={t("What do you do?")}
            tag={t("Optional")}
            value={pro.whatYouDo}
            onChange={(e) => setPro((p) => ({ ...p, whatYouDo: e.target.value }))}
            placeholder={t("e.g. Breathwork coach")}
            maxLength={WHAT_YOU_DO_MAX + 10}
            error={doError}
            help={t("Shown under your name, so clients know what you offer.")}
            count={pro.whatYouDo ? `${pro.whatYouDo.trim().length} / ${WHAT_YOU_DO_MAX}` : undefined}
          />
          <div style={{ marginBottom: 14 }}>
            <div className="ob-field-head">
              <span className="ob-label">{t("Closest group")}</span>
              <span className="ob-tag" style={{ color: groupError ? "var(--ob-high)" : "var(--ob-accent)" }}>
                {t("Required")}
              </span>
            </div>
            {/* OURS: the Sex radiogroup's segmented choice (OB-087), 4-up for the four professional_group values. */}
            <div className="ob-seg" role="radiogroup" aria-label={t("Closest group")} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {CLOSEST_GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.value];
                return (
                  <button
                    key={g.value}
                    type="button"
                    role="radio"
                    aria-checked={pro.closestGroup === g.value}
                    className="tap"
                    onClick={() => setPro((p) => ({ ...p, closestGroup: g.value as ClosestGroup }))}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden />
                    {t(g.label)}
                  </button>
                );
              })}
            </div>
            <div className="ob-help" data-err={groupError ? "true" : undefined}>
              <span role={groupError ? "alert" : undefined}>{groupError ?? t("This sets your steps. You can add a licence later.")}</span>
            </div>
          </div>
        </>
      )}
      <ObTip icon={Lightbulb} margin="2px 0 0">
        {t(GUIDE[kind])}
      </ObTip>
    </ObStep>
  );
};
