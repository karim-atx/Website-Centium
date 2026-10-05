import React from "react";
import { ExternalLink } from "lucide-react";
import clsx from "clsx";
import { VerifiedPill } from "./CvBadges";
import { proficiencyLabel, type PublicCv } from "../../services/professional-cv";
import { byRecency, formatMonth, formatRange } from "../../services/professional-cv/cvDates";

// A professional's CV as a client reads it: the public profile, the client's
// "Your professional" sheet, and the professional's own "Preview as a client"
// all render through this one component, so the three cannot drift apart.
//
// MO1.2.1 (B8, here so all three follow): each section's name sits above its
// card as a small uppercase label in the professional's type colour;
// Experience and Licences read as a timeline of dots; Skills are pills with
// no card. Order as the frame draws it: Experience, then certifications, then
// skills, with the rest after.
//
// MONTH AND YEAR ONLY. The views publish nothing finer, and this never asks.
// Sections with nothing in them are left out rather than shown empty.

const CARD = "rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4";
const SUB = "text-[12.5px] text-charcoal-soft";

const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(" · ");

/** An https link from the CV, opened outside the app. The tables only accept https://. */
const CvAnchor: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer nofollow"
    className="tap inline-flex items-center gap-1 min-h-[44px] -my-3 text-[12.5px] font-semibold text-primary-deep-text"
  >
    {children}
    <ExternalLink size={12} aria-hidden />
  </a>
);

/** The type colours a profile passes (MO1.2.1); without them, the primary family. */
export interface CvAccent {
  label: string;
  pillBg: string;
  pillInk: string;
}

/** A section label above its card. */
const Label: React.FC<{ accent?: CvAccent; children: React.ReactNode }> = ({ accent, children }) => (
  <h2
    className={clsx("text-[10.5px] font-bold uppercase tracking-[0.12em] px-1 mb-2", !accent && "text-primary-dark")}
    style={accent ? { color: accent.label } : undefined}
  >
    {children}
  </h2>
);

/** One timeline row: a dot in the accent, a rule down to the next. */
const Dot: React.FC<{ accent?: CvAccent; last: boolean; children: React.ReactNode }> = ({ accent, last, children }) => (
  <li className="flex gap-3">
    <div className="w-2.5 flex flex-col items-center pt-[5px] shrink-0" aria-hidden>
      <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", !accent && "bg-primary")} style={accent ? { background: accent.label } : undefined} />
      {!last && <span className="w-px flex-1 bg-charcoal/10 mt-1" />}
    </div>
    <div className={clsx("min-w-0 flex-1 flex flex-col gap-[3px]", !last && "pb-3.5")}>{children}</div>
  </li>
);

export const CvView: React.FC<{ cv: PublicCv; skills: string[]; accent?: CvAccent }> = ({ cv, skills, accent }) => {
  const experience = byRecency(cv.experience, true);
  const education = byRecency(cv.education, false);
  const volunteering = byRecency(cv.volunteering, true);
  const awards = [...cv.awards].sort((a, b) => (b.awarded ?? "").localeCompare(a.awarded ?? ""));
  const publications = [...cv.publications].sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));

  return (
    <div className="space-y-5">
      {experience.length > 0 && (
        <section aria-label="Experience">
          <Label accent={accent}>Experience</Label>
          <ol className={CARD}>
            {experience.map((e, i) => (
              <Dot key={e.id} accent={accent} last={i === experience.length - 1}>
                <p className="text-[13.5px] font-semibold text-charcoal break-words">{e.title}</p>
                <p className={SUB}>{join(formatRange(e.start, e.end, true), e.organisation, e.location)}</p>
                {e.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{e.description}</p>}
              </Dot>
            ))}
          </ol>
        </section>
      )}

      {cv.licences.length > 0 && (
        <section aria-label="Licences and certifications">
          <Label accent={accent}>Licences &amp; certifications</Label>
          <ol className={CARD}>
            {cv.licences.map((l, i) => (
              <Dot key={l.id} accent={accent} last={i === cv.licences.length - 1}>
                <div className="flex justify-between gap-2 items-start">
                  <p className="text-[13.5px] font-semibold text-charcoal break-words">{l.name}</p>
                  {l.verified && <VerifiedPill />}
                </div>
                {join(l.issuingBody, formatMonth(l.issued)) && <p className={SUB}>{join(l.issuingBody, formatMonth(l.issued))}</p>}
                {l.expired && l.expires && <p className={SUB}>Expired {formatMonth(l.expires)}</p>}
                {l.credentialUrl && <CvAnchor href={l.credentialUrl}>View credential</CvAnchor>}
              </Dot>
            ))}
          </ol>
        </section>
      )}

      {education.length > 0 && (
        <section aria-label="Education">
          <Label accent={accent}>Education</Label>
          <div className={clsx(CARD, "space-y-3")}>
          {education.map((e) => {
            const title = [e.degree, e.field].filter(Boolean).join(" ");
            return (
              <div key={e.id} className="flex flex-col gap-[3px]">
                <p className="text-sm font-bold text-charcoal break-words">{title || e.institution}</p>
                {join(title ? e.institution : null, formatRange(e.start, e.end, false)) && (
                  <p className={SUB}>{join(title ? e.institution : null, formatRange(e.start, e.end, false))}</p>
                )}
                {e.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{e.description}</p>}
              </div>
            );
          })}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section aria-label="Skills">
          <Label accent={accent}>Skills</Label>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li
                key={s}
                className={clsx("text-[12px] font-semibold rounded-full px-3 py-1.5 max-w-full break-words", !accent && "bg-primary-pale text-primary-deep-text")}
                style={accent ? { background: accent.pillBg, color: accent.pillInk } : undefined}
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.languages.length > 0 && (
        <section aria-label="Languages">
          <Label accent={accent}>Languages</Label>
          <div className={CARD}>
              <dl className="space-y-1.5 text-[13.5px]">
                {cv.languages.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3">
                    <dt className="text-charcoal min-w-0 break-words">{l.language}</dt>
                    <dd className="text-charcoal-soft shrink-0">{proficiencyLabel(l.proficiency)}</dd>
                  </div>
                ))}
              </dl>
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section aria-label="Awards">
          <Label accent={accent}>Awards</Label>
          <div className={clsx(CARD, "space-y-3")}>
          {awards.map((a) => (
            <div key={a.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{a.title}</p>
              {join(a.issuer, formatMonth(a.awarded)) && <p className={SUB}>{join(a.issuer, formatMonth(a.awarded))}</p>}
              {a.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{a.description}</p>}
            </div>
          ))}
          </div>
        </section>
      )}

      {publications.length > 0 && (
        <section aria-label="Publications">
          <Label accent={accent}>Publications</Label>
          <div className={clsx(CARD, "space-y-3")}>
          {publications.map((p) => (
            <div key={p.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{p.title}</p>
              {join(p.publisher, formatMonth(p.published)) && <p className={SUB}>{join(p.publisher, formatMonth(p.published))}</p>}
              {p.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{p.description}</p>}
              {p.url && <CvAnchor href={p.url}>Read</CvAnchor>}
            </div>
          ))}
          </div>
        </section>
      )}

      {cv.links.length > 0 && (
        <section aria-label="Links">
          <Label accent={accent}>Links</Label>
          <div className={clsx(CARD, "space-y-2")}>
          <ul className="flex flex-col gap-1">
            {cv.links.map((l) => (
              <li key={l.id}>
                <CvAnchor href={l.url}>{l.label}</CvAnchor>
              </li>
            ))}
          </ul>
          </div>
        </section>
      )}

      {volunteering.length > 0 && (
        <section aria-label="Volunteering">
          <Label accent={accent}>Volunteering</Label>
          <div className={clsx(CARD, "space-y-3")}>
          {volunteering.map((v) => (
            <div key={v.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{v.role}</p>
              <p className={SUB}>{join(v.organisation, formatRange(v.start, v.end, true))}</p>
              {v.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{v.description}</p>}
            </div>
          ))}
          </div>
        </section>
      )}
    </div>
  );
};
