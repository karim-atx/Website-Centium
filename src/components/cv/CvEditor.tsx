import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { LicenceStatusBadge, RejectionNote } from "./CvBadges";
import { LicencePublishRow } from "./LicencePublish";
import {
  AwardSheet,
  EducationSheet,
  ExperienceSheet,
  LicenceSheet,
  LinkSheet,
  PublicationSheet,
  SkillsLanguagesSheet,
  VolunteeringSheet,
} from "./CvSheets";
import { nextPosition } from "./useMyCv";
import { licenceStatus, saveCvProfile, type Licence, type MyCv, type SectionEntry, type SectionKey } from "../../services/professional-cv";
import { byRecency, formatMonth, formatRange } from "../../services/professional-cv/cvDates";
import { checkText } from "../../services/professional-cv/validate";
import { t, tk } from "../../i18n/core";

// The professional's CV editors, opened from Release 3 W6's MO14 Edit public
// profile (pages/pro/more/EditProfile): every CV section keeps its list and
// its add/edit/delete sheets (CvSheets), written as they are made. MO14's rows
// open them: Licence (the licence sheet, with its "Show on my profile"
// switch), Experience, Qualifications (education), Skills and languages,
// Awards, Publications, Links, Volunteering, Headline. Onboarding's
// Background step builds its collapsibles from the same sheets
// (pages/onboarding/pro/ProBackgroundStep). This replaced the My CV page's
// card layout (Profile › My CV is now MO14).

const ADD_DASHED =
  "tap w-full min-h-[44px] rounded-xl border-[1.5px] border-dashed border-primary/40 bg-cream-card text-[13.5px] font-bold text-primary-deep-text";

const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(" · ");

export type CvListKey = "licences" | "experience" | "education" | "awards" | "publications" | "links" | "volunteering";

/** What MO14 asks the host to show. */
export type CvView = { kind: "list"; key: CvListKey } | { kind: "licence"; entry: Licence | null } | { kind: "skills" } | { kind: "headline" };

type Open = { kind: "licence"; entry: Licence | null } | { kind: SectionKey; entry: { id: string } | null } | null;

function licenceTitle(l: Licence) {
  return l.name ?? (l.mirrorsCertification ? t("Certificate from the previous step") : t("Unnamed licence"));
}

function licenceLine(l: Licence) {
  if (!l.name) return t("Add its name and issuer");
  return join(l.issuingBody, l.issued ? t("Issued {v}", { v: formatMonth(l.issued) }) : null, l.noExpiry ? t("No expiry") : l.expires ? t("Expires {v}", { v: formatMonth(l.expires) }) : null);
}

const EntryRow: React.FC<{
  title: string;
  sub?: string;
  onClick: () => void;
  right?: React.ReactNode;
  after?: React.ReactNode;
  divider?: boolean;
}> = ({ title, sub, onClick, right, after, divider }) => (
  <div className={clsx(divider && "border-t border-charcoal/[0.06] pt-2.5")}>
    <button type="button" onClick={onClick} className="tap w-full min-h-[44px] flex justify-between items-start gap-2 text-start">
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-bold text-charcoal break-words">{title}</span>
        {sub && <span className="text-[12.5px] text-charcoal-soft break-words">{sub}</span>}
      </span>
      {right}
    </button>
    {after && <div className="mt-1.5">{after}</div>}
  </div>
);

const LIST_TITLE: Record<CvListKey, string> = {
  licences: tk("Licences & certifications"),
  experience: tk("Experience"),
  education: tk("Qualifications"),
  awards: tk("Awards"),
  publications: tk("Publications"),
  links: tk("Links"),
  volunteering: tk("Volunteering"),
};
const ADD_LABEL: Record<CvListKey, string> = {
  licences: tk("Add licence"),
  experience: tk("Add experience"),
  education: tk("Add education"),
  awards: tk("Add award"),
  publications: tk("Add publication"),
  links: tk("Add link"),
  volunteering: tk("Add volunteering"),
};

/**
 * The one-line headline, as a sheet. Saved after a pause in typing and again
 * on blur and on close: leaving can unmount the field without a blur. A value
 * that fails the length rule is only reported on blur, not mid-word.
 */
const HeadlineSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  userId: string;
  cv: MyCv;
  setCv: React.Dispatch<React.SetStateAction<MyCv | null>>;
}> = ({ open, onClose, userId, cv, setCv }) => {
  const [value, setValue] = useState(cv.profile.headline ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(cv.profile.headline ?? "");
  const timer = useRef<number | null>(null);

  const save = async (text: string, quiet: boolean) => {
    const next = text.trim();
    if (next === saved.current) return true;
    const problem = checkText(t("Headline"), next, 2, 160, false);
    if (problem) {
      if (!quiet) setError(problem);
      return false;
    }
    saved.current = next;
    setState("saving");
    const result = await saveCvProfile(userId, { headline: next });
    if (!result.ok) {
      saved.current = cv.profile.headline ?? "";
      setState("idle");
      setError(result.message);
      return false;
    }
    setError(null);
    setState("saved");
    setCv((c) => (c ? { ...c, profile: { ...c.profile, headline: next || null } } : c));
    return true;
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

  const close = async () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (await save(value, false)) onClose();
  };

  return (
    <BottomSheet open={open} onClose={() => void close()} title={t("Headline")}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="cv-headline" className="text-xs font-semibold text-charcoal-soft">{t("One line clients see under your name")}</label>
          {state !== "idle" && <span className="text-[11.5px] text-charcoal-soft">{state === "saving" ? t("Saving…") : t("Saved")}</span>}
        </div>
        <input
          id="cv-headline"
          value={value}
          maxLength={160}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          enterKeyHint="done"
          placeholder={t("e.g. Strength coach for beginners and busy parents")}
          className="w-full min-h-[48px] rounded-[14px] bg-cream-soft border border-charcoal/10 px-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
      </div>
    </BottomSheet>
  );
};

export const CvSheetsHost: React.FC<{
  userId: string;
  cv: MyCv;
  setCv: React.Dispatch<React.SetStateAction<MyCv | null>>;
  reload: () => Promise<void>;
  view: CvView | null;
  onView: (v: CvView | null) => void;
}> = ({ userId, cv, setCv, reload, view, onView }) => {
  const [open, setOpen] = useState<Open>(null);
  const [volError, setVolError] = useState<string | null>(null);
  // A licence opened straight from MO14 closes back to MO14; one opened from the list returns to the list.
  const direct = view?.kind === "licence";
  const close = () => {
    setOpen(null);
    if (direct) onView(null);
  };
  const shownOpen: Open = direct ? { kind: "licence", entry: view.entry } : open;

  const saved = <K extends SectionKey>(key: K) => (entry: SectionEntry<K>) =>
    setCv((c) => {
      if (!c) return c;
      const rows = c[key] as SectionEntry<K>[];
      const has = rows.some((r) => (r as { id: string }).id === (entry as { id: string }).id);
      return { ...c, [key]: has ? rows.map((r) => ((r as { id: string }).id === (entry as { id: string }).id ? entry : r)) : [...rows, entry] };
    });
  const deleted = (key: SectionKey | "licences") => (id: string) =>
    setCv((c) => (c ? { ...c, [key]: (c[key] as { id: string }[]).filter((r) => r.id !== id) } : c));
  const licenceChanged = (l: Licence) => setCv((c) => (c ? { ...c, licences: c.licences.map((x) => (x.id === l.id ? l : x)) } : c));

  const setShowVolunteering = async (on: boolean) => {
    setCv((c) => (c ? { ...c, profile: { ...c.profile, showVolunteering: on } } : c));
    const result = await saveCvProfile(userId, { showVolunteering: on });
    if (!result.ok) {
      setVolError(result.message);
      setCv((c) => (c ? { ...c, profile: { ...c.profile, showVolunteering: !on } } : c));
    } else setVolError(null);
  };

  const sheetProps = <K extends SectionKey>(key: K) => ({
    open: shownOpen?.kind === key,
    onClose: close,
    userId,
    entry: (shownOpen?.kind === key ? shownOpen.entry : null) as SectionEntry<K> | null,
    position: nextPosition(cv[key] as { position: number }[]),
    onSaved: saved(key),
    onDeleted: deleted(key),
  });

  const list = view?.kind === "list" ? view.key : null;
  const addKind = (k: CvListKey): Open => (k === "licences" ? { kind: "licence", entry: null } : { kind: k, entry: null });

  return (
    <>
      <BottomSheet open={list !== null && open === null} onClose={() => onView(null)} title={list ? LIST_TITLE[list] : ""}>
        {list && (
          <div className="space-y-2.5">
            {list === "volunteering" && (
              <div className="flex items-center justify-between gap-3 min-h-[52px]">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-charcoal">{t("Show volunteering to clients")}</span>
                  <span className="block text-xs text-charcoal-soft mt-0.5">
                    {cv.profile.showVolunteering ? t("Shown on your public profile.") : t("Hidden from clients until you turn it on.")}
                  </span>
                </span>
                <Toggle checked={cv.profile.showVolunteering} onChange={(on) => void setShowVolunteering(on)} label={t("Show volunteering to clients")} />
              </div>
            )}
            {volError && list === "volunteering" && <p className="text-xs font-semibold text-status-high">{volError}</p>}
            {(cv[list] as { id: string }[]).length === 0 && <p className="text-[13px] text-charcoal-soft">{t("None yet.")}</p>}
            {list === "licences" &&
              cv.licences.map((l, i) => {
                const status = licenceStatus(l, cv.reviews);
                return (
                  <EntryRow
                    key={l.id}
                    divider={i > 0}
                    title={licenceTitle(l)}
                    sub={licenceLine(l)}
                    onClick={() => setOpen({ kind: "licence", entry: l })}
                    right={<LicenceStatusBadge status={status} />}
                    after={
                      <div className="flex flex-col gap-2">
                        {status.kind === "rejected" && <RejectionNote reason={status.reason} />}
                        <LicencePublishRow licence={l} onChanged={licenceChanged} />
                      </div>
                    }
                  />
                );
              })}
            {list === "experience" &&
              byRecency(cv.experience, true).map((e, i) => (
                <EntryRow key={e.id} divider={i > 0} title={e.title} sub={join(e.organisation, e.location, formatRange(e.start, e.end, true))} onClick={() => setOpen({ kind: "experience", entry: e })} />
              ))}
            {list === "education" &&
              byRecency(cv.education, false).map((e, i) => {
                const title = [e.degree, e.field].filter(Boolean).join(" ");
                return <EntryRow key={e.id} divider={i > 0} title={title || e.institution} sub={join(title ? e.institution : null, formatRange(e.start, e.end, false))} onClick={() => setOpen({ kind: "education", entry: e })} />;
              })}
            {list === "awards" &&
              cv.awards.map((a, i) => <EntryRow key={a.id} divider={i > 0} title={a.title} sub={join(a.issuer, formatMonth(a.awarded))} onClick={() => setOpen({ kind: "awards", entry: a })} />)}
            {list === "publications" &&
              cv.publications.map((p, i) => <EntryRow key={p.id} divider={i > 0} title={p.title} sub={join(p.publisher, formatMonth(p.published))} onClick={() => setOpen({ kind: "publications", entry: p })} />)}
            {list === "links" && cv.links.map((l, i) => <EntryRow key={l.id} divider={i > 0} title={l.label} sub={l.url} onClick={() => setOpen({ kind: "links", entry: l })} />)}
            {list === "volunteering" &&
              byRecency(cv.volunteering, true).map((v, i) => (
                <EntryRow key={v.id} divider={i > 0} title={v.role} sub={join(v.organisation, formatRange(v.start, v.end, true))} onClick={() => setOpen({ kind: "volunteering", entry: v })} />
              ))}
            <button type="button" onClick={() => setOpen(addKind(list))} className={clsx(ADD_DASHED, "flex items-center justify-center gap-1.5")}>
              <Plus size={14} /> {ADD_LABEL[list]}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Sheets. Keyed by entry so each opens on the stored values. */}
      {shownOpen?.kind === "licence" && (
        <LicenceSheet
          key={shownOpen.entry?.id ?? "new"}
          open
          onClose={close}
          userId={userId}
          licence={shownOpen.entry}
          cv={cv}
          onSaved={(l) => {
            setCv((c) => (c ? { ...c, licences: c.licences.some((x) => x.id === l.id) ? c.licences.map((x) => (x.id === l.id ? l : x)) : [...c.licences, l] } : c));
            void reload();
          }}
          onDeleted={deleted("licences")}
        />
      )}
      {shownOpen?.kind === "experience" && <ExperienceSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("experience")} />}
      {shownOpen?.kind === "education" && <EducationSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("education")} />}
      {shownOpen?.kind === "awards" && <AwardSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("awards")} />}
      {shownOpen?.kind === "publications" && <PublicationSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("publications")} />}
      {shownOpen?.kind === "links" && <LinkSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("links")} />}
      {shownOpen?.kind === "volunteering" && <VolunteeringSheet key={shownOpen.entry?.id ?? "new"} {...sheetProps("volunteering")} />}
      {view?.kind === "skills" && <SkillsLanguagesSheet open onClose={() => onView(null)} userId={userId} cv={cv} setCv={setCv} />}
      {view?.kind === "headline" && <HeadlineSheet open onClose={() => onView(null)} userId={userId} cv={cv} setCv={setCv} />}
    </>
  );
};
