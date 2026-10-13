import React, { useEffect, useRef, useState } from "react";
import { Award, Briefcase, GraduationCap, Languages, Lightbulb, Plus, Sparkles, Text } from "lucide-react";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObCollapsible, ObTip } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { EducationSheet, ExperienceSheet, LicenceSheet, SkillsLanguagesSheet } from "../../../components/cv/CvSheets";
import { nextPosition, useMyCv } from "../../../components/cv/useMyCv";
import {
  licenceStatus,
  proficiencyLabel,
  saveCvProfile,
  type Licence,
  type MyCv,
  type SectionEntry,
} from "../../../services/professional-cv";
import { byRecency, formatRange } from "../../../services/professional-cv/cvDates";
import { checkText } from "../../../services/professional-cv/validate";
import { GUIDE } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { ListRows } from "./parts";
import type { ProStepProps } from "./types";

type Section = "headline" | "licences" | "experience" | "education" | "skills" | "languages";
type Sheet = { kind: "licence"; entry: Licence | null } | { kind: "experience" | "education"; entry: { id: string } | null } | { kind: "skills" } | null;

const HEADLINE_MAX = 120;
const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(" · ");

/** True once anything is on the CV (the Skip / Continue rule, D-OB-06 / V6-154). */
function cvHasContent(cv: MyCv | null): boolean {
  return (
    !!cv &&
    (!!cv.profile.headline ||
      cv.licences.some((l) => l.name) ||
      cv.experience.length > 0 ||
      cv.education.length > 0 ||
      cv.profile.skills.length > 0 ||
      cv.languages.length > 0)
  );
}

/**
 * Step 5 · Your background (OB-149, OB-151, OB-177, OB-179, OB-206, OB-208).
 * The CV as six collapsibles (Headline first and open, as the frames draw it).
 * Kept from the live step: every entry is written the moment it is saved
 * (the CV sheets), the certificate is already licence #1, and the button reads
 * "Skip" until something is added, then "Continue" (V6-154).
 */
export const ProBackgroundStep: React.FC<ProStepProps> = ({ kind, pro, onNext, onBack }) => {
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const flow = useOnboardingFlow();
  const { cv, setCv, error, reload, userId } = useMyCv();
  const [open, setOpen] = useState<Section | null>("headline");
  const [sheet, setSheet] = useState<Sheet>(null);
  const toggle = (s: Section) => setOpen((o) => (o === s ? null : s));

  const added = cvHasContent(cv);
  const loading = !!userId && !cv && !error;

  const licenceRowsFor = (c: MyCv) =>
    c.licences.map((l) => {
      const st = licenceStatus(l, c.reviews);
      return {
        key: l.id,
        icon: Award,
        title: l.name ?? (l.mirrorsCertification ? "Certificate from Credentials" : "Unnamed licence"),
        description: l.mirrorsCertification && !l.issuingBody ? "Added from your certificate" : l.issuingBody ?? undefined,
        status:
          st.kind === "pending"
            ? { text: "Pending check", tone: "warn" as const }
            : st.kind === "verified"
            ? { text: "Verified", tone: "good" as const }
            : st.kind === "rejected"
            ? { text: "Not approved", tone: "high" as const }
            : undefined,
        onClick: () => setSheet({ kind: "licence", entry: l }),
      };
    });

  const savedEntry =
    <K extends "experience" | "education">(key: K) =>
    (entry: SectionEntry<K>) =>
      setCv((c) => {
        if (!c) return c;
        const rows = c[key] as SectionEntry<K>[];
        const has = rows.some((r) => r.id === entry.id);
        return { ...c, [key]: has ? rows.map((r) => (r.id === entry.id ? entry : r)) : [...rows, entry] };
      });
  const deleted = (key: "licences" | "experience" | "education") => (id: string) =>
    setCv((c) => (c ? { ...c, [key]: (c[key] as { id: string }[]).filter((r) => r.id !== id) } : c));

  const experience = cv ? byRecency(cv.experience, true) : [];
  const education = cv ? byRecency(cv.education, false) : [];
  const first = experience[0];

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="background"
      title="Your professional background"
      subtitle="Clients see this on your public profile. Everything here is optional."
      onBack={onBack}
      loading={loading}
      footer={
        <ObFooter
          error={error && !cv ? error : flow && !flow.online ? OB_STRINGS.offlineStep : null}
          errorTone={error && !cv ? "error" : "info"}
          primary={error && !cv ? { label: OB_STRINGS.tryAgain, onClick: () => void reload() } : { label: added ? "Continue" : "Skip", onClick: onNext }}
        />
      }
    >
      {!userId ? (
        <p className="ob-sub" style={{ margin: 0 }}>
          Sign in again to add your background, or skip this for now.
        </p>
      ) : cv ? (
        <>
          <ObCollapsible
            icon={Text}
            title="Headline"
            summary={cv.profile.headline || "One line on who you help and how."}
            open={open === "headline"}
            onToggle={() => toggle("headline")}
            controls="pro-bg-headline"
          />
          {open === "headline" && (
            <div id="pro-bg-headline">
              <HeadlineArea userId={userId} cv={cv} setCv={setCv} />
            </div>
          )}
          <ObCollapsible
            icon={Award}
            title="Licences and certifications"
            summary={cv.licences.length ? cv.licences.map((l) => l.name ?? "Certificate").join(", ") : "None yet"}
            open={open === "licences"}
            onToggle={() => toggle("licences")}
            controls="pro-bg-licences"
          />
          {open === "licences" && (
            <div id="pro-bg-licences">
              <ListRows
                rows={[
                  ...licenceRowsFor(cv),
                  { key: "add", icon: Plus, title: "Add a licence", onClick: () => setSheet({ kind: "licence", entry: null }) },
                ]}
              />
            </div>
          )}
          <ObCollapsible
            icon={Briefcase}
            title="Experience"
            summary={first ? join(first.title, first.organisation).replace(" · ", ", ") : "None yet"}
            open={open === "experience"}
            onToggle={() => toggle("experience")}
            controls="pro-bg-experience"
          />
          {open === "experience" && (
            <div id="pro-bg-experience">
              <ListRows
                rows={[
                  ...experience.map((e) => ({
                    key: e.id,
                    icon: Briefcase,
                    title: e.title,
                    description: join(e.organisation, formatRange(e.start, e.end, true)),
                    onClick: () => setSheet({ kind: "experience", entry: e }),
                  })),
                  { key: "add", icon: Plus, title: "Add experience", onClick: () => setSheet({ kind: "experience", entry: null }) },
                ]}
              />
            </div>
          )}
          <ObCollapsible
            icon={GraduationCap}
            title="Education"
            summary={education[0] ? [education[0].degree, education[0].field].filter(Boolean).join(" ") || education[0].institution : "None yet"}
            open={open === "education"}
            onToggle={() => toggle("education")}
            controls="pro-bg-education"
          />
          {open === "education" && (
            <div id="pro-bg-education">
              <ListRows
                rows={[
                  ...education.map((e) => {
                    const t = [e.degree, e.field].filter(Boolean).join(" ");
                    return {
                      key: e.id,
                      icon: GraduationCap,
                      title: t || e.institution,
                      description: join(t ? e.institution : null, formatRange(e.start, e.end, false)),
                      onClick: () => setSheet({ kind: "education", entry: e }),
                    };
                  }),
                  { key: "add", icon: Plus, title: "Add education", onClick: () => setSheet({ kind: "education", entry: null }) },
                ]}
              />
            </div>
          )}
          <ObCollapsible
            icon={Sparkles}
            title="Skills"
            summary={cv.profile.skills.length ? cv.profile.skills.join(", ") : "None yet"}
            open={open === "skills"}
            onToggle={() => toggle("skills")}
            controls="pro-bg-skills"
          />
          {open === "skills" && (
            <div id="pro-bg-skills">
              <ListRows rows={[{ key: "edit", icon: Plus, title: cv.profile.skills.length ? "Edit skills" : "Add skills", onClick: () => setSheet({ kind: "skills" }) }]} />
            </div>
          )}
          <ObCollapsible
            icon={Languages}
            title="Languages"
            summary={cv.languages.length ? cv.languages.map((l) => l.language).join(", ") : "None yet"}
            open={open === "languages"}
            onToggle={() => toggle("languages")}
            controls="pro-bg-languages"
          />
          {open === "languages" && (
            <div id="pro-bg-languages">
              <ListRows
                rows={[
                  ...cv.languages.map((l) => ({ key: l.id, icon: Languages, title: l.language, description: proficiencyLabel(l.proficiency) })),
                  { key: "edit", icon: Plus, title: cv.languages.length ? "Edit languages" : "Add languages", onClick: () => setSheet({ kind: "skills" }) },
                ]}
              />
            </div>
          )}
          <ObTip icon={Lightbulb} margin="6px 0 0">
            {GUIDE[kind]}
          </ObTip>

          {sheet?.kind === "licence" && (
            <LicenceSheet
              key={sheet.entry?.id ?? "new"}
              open
              onClose={() => setSheet(null)}
              userId={userId}
              licence={sheet.entry}
              cv={cv}
              onSaved={(l) => {
                setCv((c) => (c ? { ...c, licences: c.licences.some((x) => x.id === l.id) ? c.licences.map((x) => (x.id === l.id ? l : x)) : [...c.licences, l] } : c));
                void reload();
              }}
              onDeleted={deleted("licences")}
            />
          )}
          {sheet?.kind === "experience" && (
            <ExperienceSheet
              key={sheet.entry?.id ?? "new"}
              open
              onClose={() => setSheet(null)}
              userId={userId}
              entry={sheet.entry as SectionEntry<"experience"> | null}
              position={nextPosition(cv.experience)}
              onSaved={savedEntry("experience")}
              onDeleted={deleted("experience")}
            />
          )}
          {sheet?.kind === "education" && (
            <EducationSheet
              key={sheet.entry?.id ?? "new"}
              open
              onClose={() => setSheet(null)}
              userId={userId}
              entry={sheet.entry as SectionEntry<"education"> | null}
              position={nextPosition(cv.education)}
              onSaved={savedEntry("education")}
              onDeleted={deleted("education")}
            />
          )}
          {sheet?.kind === "skills" && <SkillsLanguagesSheet open onClose={() => setSheet(null)} userId={userId} cv={cv} setCv={setCv} />}
        </>
      ) : null}
    </ObStep>
  );
};

/**
 * The headline (F area, count / 120, help "One line on who you help and how.").
 * Saved after a pause in typing and when the field loses focus, and a pending
 * save is sent when the step unmounts (kept from CvEditor's HeadlineField).
 */
const HeadlineArea: React.FC<{ userId: string; cv: MyCv; setCv: React.Dispatch<React.SetStateAction<MyCv | null>> }> = ({ userId, cv, setCv }) => {
  const [value, setValue] = useState(cv.profile.headline ?? "");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const saved = useRef(cv.profile.headline ?? "");
  const timer = useRef<number | null>(null);

  const save = async (text: string, quiet: boolean) => {
    const next = text.trim();
    if (next === saved.current) return;
    const problem = checkText("Headline", next, 2, HEADLINE_MAX, false);
    if (problem) {
      if (!quiet) setError(problem);
      return;
    }
    saved.current = next;
    setState("saving");
    const r = await saveCvProfile(userId, { headline: next });
    if (!r.ok) {
      saved.current = cv.profile.headline ?? "";
      setState("idle");
      setError(r.message);
      return;
    }
    setError(null);
    setState("saved");
    setCv((c) => (c ? { ...c, profile: { ...c.profile, headline: next || null } } : c));
  };

  const latest = useRef({ value, save });
  useEffect(() => {
    latest.current = { value, save };
  });
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        void latest.current.save(latest.current.value, true);
      }
    },
    []
  );

  return (
    <div className="ob-field">
      <label className="ob-box obp-area" data-err={error ? "true" : undefined}>
        <textarea
          value={value}
          maxLength={HEADLINE_MAX}
          rows={3}
          aria-label="Headline"
          aria-invalid={!!error}
          aria-describedby="pro-bg-headline-help"
          placeholder="e.g. Strength coach for beginners and busy parents"
          onChange={(e) => {
            const text = e.target.value;
            setValue(text);
            setState("idle");
            setError(null);
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => void save(text, true), 900);
          }}
          onBlur={() => {
            if (timer.current) window.clearTimeout(timer.current);
            void save(value, false);
          }}
        />
      </label>
      <div className="ob-help" id="pro-bg-headline-help" data-err={error ? "true" : undefined}>
        <span role={error ? "alert" : undefined}>
          {error ?? (state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "One line on who you help and how.")}
        </span>
        <span className="ob-help-count">
          {value.length} / {HEADLINE_MAX}
        </span>
      </div>
    </div>
  );
};
