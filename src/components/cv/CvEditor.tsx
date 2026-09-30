import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { LicenceStatusBadge, RejectionNote } from "./CvBadges";
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
import {
  licenceStatus,
  proficiencyLabel,
  saveCvProfile,
  type Licence,
  type MyCv,
  type SectionEntry,
  type SectionKey,
} from "../../services/professional-cv";
import { byRecency, formatMonth, formatRange } from "../../services/professional-cv/cvDates";
import { checkText } from "../../services/professional-cv/validate";

// The professional's CV editor, shared by onboarding ("Your professional
// background": headline, licences, experience, education, skills and
// languages) and Profile › My CV (every section). Each section lists what is
// stored; tapping an entry edits it, "+ Add" adds one, and every change is
// written as it is made.

const CARD = "rounded-2xl bg-cream-card border border-charcoal/[0.07] p-3.5";
const ADD_DASHED =
  "tap w-full min-h-[44px] rounded-xl border-[1.5px] border-dashed border-primary/40 bg-cream-card text-[13.5px] font-bold text-primary-deep-text";

const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(" · ");

type ListKey = "awards" | "publications" | "links" | "volunteering";
type Open =
  | { kind: "licence"; entry: Licence | null }
  | { kind: SectionKey; entry: { id: string } | null }
  | { kind: "skills" }
  | null;

function licenceTitle(l: Licence) {
  return l.name ?? (l.mirrorsCertification ? "Certificate from the previous step" : "Unnamed licence");
}

function licenceLine(l: Licence) {
  if (!l.name) return "Add its name and issuer";
  return join(
    l.issuingBody,
    l.issued ? `Issued ${formatMonth(l.issued)}` : null,
    l.noExpiry ? "No expiry" : l.expires ? `Expires ${formatMonth(l.expires)}` : null
  );
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
    <button type="button" onClick={onClick} className="tap w-full min-h-[44px] flex justify-between items-start gap-2 text-left">
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-bold text-charcoal break-words">{title}</span>
        {sub && <span className="text-[12.5px] text-charcoal-soft break-words">{sub}</span>}
      </span>
      {right}
    </button>
    {after && <div className="mt-1.5">{after}</div>}
  </div>
);

const SectionHead: React.FC<{ title: string; onAdd?: () => void; addLabel: string; count?: string }> = ({
  title,
  onAdd,
  addLabel,
  count,
}) => (
  <div className="flex items-center justify-between gap-2">
    <h2 className="text-[15px] font-bold text-charcoal">{title}</h2>
    {count && <span className="text-xs text-charcoal-soft">{count}</span>}
    {onAdd && (
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="tap min-h-[44px] px-1 -mr-1 text-[13px] font-bold text-primary-deep-text"
      >
        + Add
      </button>
    )}
  </div>
);

/**
 * The one-line headline. Saved after a pause in typing and again when the
 * field loses focus: blur alone is not enough, because leaving the page (the
 * back button, a tab switch) can unmount the field without one. A value that
 * fails the length rule is only reported on blur, not mid-word.
 */
const HeadlineField: React.FC<{
  userId: string;
  cv: MyCv;
  setCv: React.Dispatch<React.SetStateAction<MyCv | null>>;
  compactLabel?: boolean;
}> = ({ userId, cv, setCv, compactLabel }) => {
  const [value, setValue] = useState(cv.profile.headline ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const saved = useRef(cv.profile.headline ?? "");
  const timer = useRef<number | null>(null);

  const save = async (text: string, quiet: boolean) => {
    const next = text.trim();
    if (next === saved.current) return;
    const problem = checkText("Headline", next, 2, 160, false);
    if (problem) {
      if (!quiet) setError(problem);
      return;
    }
    saved.current = next;
    setState("saving");
    const result = await saveCvProfile(userId, { headline: next });
    if (!result.ok) {
      saved.current = cv.profile.headline ?? "";
      setState("idle");
      setError(result.message);
      return;
    }
    setError(null);
    setState("saved");
    setCv((c) => (c ? { ...c, profile: { ...c.profile, headline: next || null } } : c));
  };

  // Leaving with a save still pending: send it rather than drop it.
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="cv-headline"
          className={
            compactLabel
              ? "text-xs font-bold text-charcoal-soft uppercase tracking-[0.06em]"
              : "text-[15px] font-bold text-charcoal"
          }
        >
          Headline
        </label>
        {state !== "idle" && (
          <span className="text-[11.5px] text-charcoal-soft">{state === "saving" ? "Saving…" : "Saved"}</span>
        )}
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
        placeholder="e.g. Strength coach for beginners and busy parents"
        className="w-full min-h-[48px] rounded-[14px] bg-cream-card border border-charcoal/10 px-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
    </div>
  );
};

export const CvEditor: React.FC<{
  variant: "onboarding" | "full";
  userId: string;
  cv: MyCv;
  setCv: React.Dispatch<React.SetStateAction<MyCv | null>>;
  reload: () => Promise<void>;
}> = ({ variant, userId, cv, setCv, reload }) => {
  const [open, setOpen] = useState<Open>(null);
  const [list, setList] = useState<ListKey | null>(null);
  const [volError, setVolError] = useState<string | null>(null);
  const full = variant === "full";
  const close = () => setOpen(null);

  // A saved or deleted row replaces or leaves the list; a licence also brings
  // its review rows back, which a trigger wrote on the same save.
  const saved = <K extends SectionKey>(key: K) => (entry: SectionEntry<K>) =>
    setCv((c) => {
      if (!c) return c;
      const rows = c[key] as SectionEntry<K>[];
      const has = rows.some((r) => (r as { id: string }).id === (entry as { id: string }).id);
      return {
        ...c,
        [key]: has
          ? rows.map((r) => ((r as { id: string }).id === (entry as { id: string }).id ? entry : r))
          : [...rows, entry],
      };
    });
  const deleted = (key: SectionKey | "licences") => (id: string) =>
    setCv((c) => (c ? { ...c, [key]: (c[key] as { id: string }[]).filter((r) => r.id !== id) } : c));

  const licences = cv.licences;
  const experience = byRecency(cv.experience, true);
  const education = byRecency(cv.education, false);

  const setShowVolunteering = async (on: boolean) => {
    setCv((c) => (c ? { ...c, profile: { ...c.profile, showVolunteering: on } } : c));
    const result = await saveCvProfile(userId, { showVolunteering: on });
    if (!result.ok) {
      setVolError(result.message);
      setCv((c) => (c ? { ...c, profile: { ...c.profile, showVolunteering: !on } } : c));
    } else setVolError(null);
  };

  const sheetProps = <K extends SectionKey>(key: K) => ({
    open: open?.kind === key,
    onClose: close,
    userId,
    entry: (open?.kind === key ? open.entry : null) as SectionEntry<K> | null,
    position: nextPosition(cv[key] as { position: number }[]),
    onSaved: saved(key),
    onDeleted: deleted(key),
  });

  return (
    <div className="space-y-3.5">
      <HeadlineField userId={userId} cv={cv} setCv={setCv} compactLabel={!full} />

      {/* Licences & certifications */}
      <section className={clsx(CARD, "space-y-2.5")}>
        <SectionHead
          title="Licences & certifications"
          addLabel="Add licence"
          onAdd={full ? () => setOpen({ kind: "licence", entry: null }) : undefined}
          count={!full && licences.length > 0 ? `${licences.length} added` : undefined}
        />
        {licences.map((l, i) => {
          const status = licenceStatus(l, cv.reviews);
          if (!full) {
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setOpen({ kind: "licence", entry: l })}
                className="tap w-full min-h-[56px] flex items-center gap-2.5 rounded-xl bg-cream-soft px-3 py-2.5 text-left"
              >
                <span className="w-9 h-9 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-primary-deep-text" />
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold text-charcoal break-words">{licenceTitle(l)}</span>
                  <span className="text-xs text-charcoal-soft break-words">{licenceLine(l)}</span>
                </span>
                <LicenceStatusBadge status={status} />
              </button>
            );
          }
          return (
            <EntryRow
              key={l.id}
              divider={i > 0}
              title={licenceTitle(l)}
              sub={licenceLine(l)}
              onClick={() => setOpen({ kind: "licence", entry: l })}
              right={<LicenceStatusBadge status={status} />}
              after={status.kind === "rejected" ? <RejectionNote reason={status.reason} /> : undefined}
            />
          );
        })}
        {full && licences.length === 0 && <p className="text-[13px] text-charcoal-soft">None yet.</p>}
        {!full && (
          <button type="button" onClick={() => setOpen({ kind: "licence", entry: null })} className={ADD_DASHED}>
            + Add licence
          </button>
        )}
      </section>

      {/* Experience */}
      <section className={clsx(CARD, "space-y-2.5")}>
        <SectionHead title="Experience" addLabel="Add experience" onAdd={full ? () => setOpen({ kind: "experience", entry: null }) : undefined} />
        {experience.map((e, i) => (
          <EntryRow
            key={e.id}
            divider={i > 0}
            title={e.title}
            sub={join(e.organisation, e.location, formatRange(e.start, e.end, true))}
            onClick={() => setOpen({ kind: "experience", entry: e })}
          />
        ))}
        {full && experience.length === 0 && <p className="text-[13px] text-charcoal-soft">None yet.</p>}
        {!full && (
          <button type="button" onClick={() => setOpen({ kind: "experience", entry: null })} className={ADD_DASHED}>
            + Add experience
          </button>
        )}
      </section>

      {/* Education */}
      <section className={clsx(CARD, "space-y-2.5")}>
        <SectionHead title="Education" addLabel="Add education" onAdd={full ? () => setOpen({ kind: "education", entry: null }) : undefined} />
        {education.map((e, i) => {
          const title = [e.degree, e.field].filter(Boolean).join(" ");
          return (
            <EntryRow
              key={e.id}
              divider={i > 0}
              title={title || e.institution}
              sub={join(title ? e.institution : null, formatRange(e.start, e.end, false))}
              onClick={() => setOpen({ kind: "education", entry: e })}
            />
          );
        })}
        {full && education.length === 0 && <p className="text-[13px] text-charcoal-soft">None yet.</p>}
        {!full && (
          <button type="button" onClick={() => setOpen({ kind: "education", entry: null })} className={ADD_DASHED}>
            + Add education
          </button>
        )}
      </section>

      {/* Skills and languages */}
      <section className={clsx(CARD, "space-y-2.5")}>
        <SectionHead title="Skills and languages" addLabel="Edit skills and languages" />
        {(cv.profile.skills.length > 0 || cv.languages.length > 0) && (
          <ul className="flex flex-wrap gap-1.5">
            {cv.profile.skills.map((s) => (
              <li key={s} className="text-[12.5px] font-semibold rounded-full px-[11px] py-1.5 bg-primary-pale text-primary-deep-text max-w-full break-words">
                {s}
              </li>
            ))}
            {cv.languages.map((l) => (
              <li
                key={l.id}
                className="text-[12.5px] font-semibold rounded-full px-[11px] py-1.5 bg-teal-pale text-teal-deep-text max-w-full break-words"
              >
                {l.language} · {proficiencyLabel(l.proficiency)}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => setOpen({ kind: "skills" })} className={ADD_DASHED}>
          {cv.profile.skills.length > 0 || cv.languages.length > 0 ? "Edit skills and languages" : "+ Add skills and languages"}
        </button>
      </section>

      {full && (
        <section className={clsx(CARD, "!py-1")}>
          {(
            [
              { key: "awards", label: "Awards", count: cv.awards.length },
              { key: "publications", label: "Publications", count: cv.publications.length },
              { key: "links", label: "Links", count: cv.links.length },
            ] as const
          ).map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => setList(row.key)}
              className="tap w-full min-h-[52px] flex items-center justify-between gap-3 border-b border-charcoal/[0.06] text-left"
            >
              <span className="text-sm font-semibold text-charcoal">{row.label}</span>
              <span className="flex items-center gap-1 text-[13px] text-charcoal-soft">
                {row.count === 0 ? "None yet · Add" : `${row.count} added`}
                <ChevronRight size={14} className="text-charcoal-faint" />
              </span>
            </button>
          ))}
          <div className="flex items-center justify-between gap-3 min-h-[60px]">
            <button type="button" onClick={() => setList("volunteering")} className="tap flex-1 min-w-0 min-h-[44px] text-left">
              <span className="block text-sm font-semibold text-charcoal">
                Volunteering{cv.volunteering.length > 0 ? ` · ${cv.volunteering.length}` : ""}
              </span>
              <span className="block text-xs text-charcoal-soft mt-0.5">
                {cv.profile.showVolunteering ? "Shown to clients" : "Hidden from clients until you turn it on"}
              </span>
            </button>
            <Toggle
              checked={cv.profile.showVolunteering}
              onChange={(on) => void setShowVolunteering(on)}
              label="Show volunteering to clients"
            />
          </div>
          {volError && <p className="text-xs font-semibold text-status-high pb-2">{volError}</p>}
        </section>
      )}

      {/* Sheets. Keyed by entry so each opens on the stored values. */}
      {open?.kind === "licence" && (
        <LicenceSheet
          key={open.entry?.id ?? "new"}
          open
          onClose={close}
          userId={userId}
          licence={open.entry}
          cv={cv}
          onSaved={(l) => {
            setCv((c) =>
              c ? { ...c, licences: c.licences.some((x) => x.id === l.id) ? c.licences.map((x) => (x.id === l.id ? l : x)) : [...c.licences, l] } : c
            );
            void reload();
          }}
          onDeleted={deleted("licences")}
        />
      )}
      {open?.kind === "experience" && <ExperienceSheet key={open.entry?.id ?? "new"} {...sheetProps("experience")} />}
      {open?.kind === "education" && <EducationSheet key={open.entry?.id ?? "new"} {...sheetProps("education")} />}
      {open?.kind === "awards" && <AwardSheet key={open.entry?.id ?? "new"} {...sheetProps("awards")} />}
      {open?.kind === "publications" && <PublicationSheet key={open.entry?.id ?? "new"} {...sheetProps("publications")} />}
      {open?.kind === "links" && <LinkSheet key={open.entry?.id ?? "new"} {...sheetProps("links")} />}
      {open?.kind === "volunteering" && <VolunteeringSheet key={open.entry?.id ?? "new"} {...sheetProps("volunteering")} />}
      {open?.kind === "skills" && <SkillsLanguagesSheet open onClose={close} userId={userId} cv={cv} setCv={setCv} />}

      {/* The optional sections open as a list first, since they are rarely
          more than a line or two each. */}
      <BottomSheet
        open={list !== null && open === null}
        onClose={() => setList(null)}
        title={list === "awards" ? "Awards" : list === "publications" ? "Publications" : list === "links" ? "Links" : "Volunteering"}
      >
        {list && (
          <div className="space-y-2.5">
            {list === "volunteering" && (
              <p className="text-xs text-charcoal-soft">
                {cv.profile.showVolunteering
                  ? "Shown on your public profile."
                  : "Hidden from clients until you turn it on in My CV."}
              </p>
            )}
            {(cv[list] as { id: string }[]).length === 0 && <p className="text-[13px] text-charcoal-soft">None yet.</p>}
            {list === "awards" &&
              cv.awards.map((a, i) => (
                <EntryRow key={a.id} divider={i > 0} title={a.title} sub={join(a.issuer, formatMonth(a.awarded))} onClick={() => setOpen({ kind: "awards", entry: a })} />
              ))}
            {list === "publications" &&
              cv.publications.map((p, i) => (
                <EntryRow key={p.id} divider={i > 0} title={p.title} sub={join(p.publisher, formatMonth(p.published))} onClick={() => setOpen({ kind: "publications", entry: p })} />
              ))}
            {list === "links" &&
              cv.links.map((l, i) => (
                <EntryRow key={l.id} divider={i > 0} title={l.label} sub={l.url} onClick={() => setOpen({ kind: "links", entry: l })} />
              ))}
            {list === "volunteering" &&
              byRecency(cv.volunteering, true).map((v, i) => (
                <EntryRow
                  key={v.id}
                  divider={i > 0}
                  title={v.role}
                  sub={join(v.organisation, formatRange(v.start, v.end, true))}
                  onClick={() => setOpen({ kind: "volunteering", entry: v })}
                />
              ))}
            <button type="button" onClick={() => setOpen({ kind: list, entry: null })} className={clsx(ADD_DASHED, "flex items-center justify-center gap-1.5")}>
              <Plus size={14} /> Add {list === "awards" ? "award" : list === "publications" ? "publication" : list === "links" ? "link" : "volunteering"}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
