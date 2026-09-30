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
// MONTH AND YEAR ONLY. The views publish nothing finer, and this never asks.
// Sections with nothing in them are left out rather than shown empty.

const CARD = "rounded-2xl bg-cream-card border border-charcoal/[0.07] p-3.5";
const H = "text-[15px] font-bold text-charcoal";
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

export const CvView: React.FC<{ cv: PublicCv; skills: string[] }> = ({ cv, skills }) => {
  const experience = byRecency(cv.experience, true);
  const education = byRecency(cv.education, false);
  const volunteering = byRecency(cv.volunteering, true);
  const awards = [...cv.awards].sort((a, b) => (b.awarded ?? "").localeCompare(a.awarded ?? ""));
  const publications = [...cv.publications].sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));

  return (
    <div className="space-y-3.5">
      {cv.licences.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Licences and certifications">
          <h2 className={H}>Licences &amp; certifications</h2>
          {cv.licences.map((l, i) => (
            <div
              key={l.id}
              className={clsx("flex justify-between gap-2 items-start", i > 0 && "border-t border-charcoal/[0.06] pt-2.5")}
            >
              <div className="min-w-0 flex flex-col gap-[3px]">
                <p className="text-sm font-bold text-charcoal break-words">{l.name}</p>
                {join(l.issuingBody, formatMonth(l.issued)) && <p className={SUB}>{join(l.issuingBody, formatMonth(l.issued))}</p>}
                {l.expired && l.expires && <p className={SUB}>Expired {formatMonth(l.expires)}</p>}
                {l.credentialUrl && <CvAnchor href={l.credentialUrl}>View credential</CvAnchor>}
              </div>
              {l.verified && <VerifiedPill />}
            </div>
          ))}
        </section>
      )}

      {experience.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Experience">
          <h2 className={H}>Experience</h2>
          <ol className="space-y-0">
            {experience.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <div className="w-2.5 flex flex-col items-center pt-[5px] shrink-0" aria-hidden>
                  <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", i === 0 ? "bg-primary" : "bg-primary/40")} />
                  {i < experience.length - 1 && <span className="w-0.5 flex-1 bg-charcoal/10 mt-1" />}
                </div>
                <div className={clsx("min-w-0 flex flex-col gap-[3px]", i < experience.length - 1 && "pb-3")}>
                  <p className="text-sm font-bold text-charcoal break-words">{e.title}</p>
                  <p className={SUB}>{join(e.organisation, e.location)}</p>
                  <p className={SUB}>{formatRange(e.start, e.end, true)}</p>
                  {e.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{e.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {education.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Education">
          <h2 className={H}>Education</h2>
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
        </section>
      )}

      {(skills.length > 0 || cv.languages.length > 0) && (
        <section className={clsx(CARD, "space-y-2.5")} aria-label="Skills and languages">
          {skills.length > 0 && (
            <>
              <h2 className={H}>Skills</h2>
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <li key={s} className="text-[12.5px] font-semibold rounded-full px-[11px] py-1.5 bg-primary-pale text-primary-deep-text max-w-full break-words">
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          {cv.languages.length > 0 && (
            <>
              <h2 className={clsx(H, skills.length > 0 && "pt-1")}>Languages</h2>
              <dl className="space-y-1.5 text-[13.5px]">
                {cv.languages.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3">
                    <dt className="text-charcoal min-w-0 break-words">{l.language}</dt>
                    <dd className="text-charcoal-soft shrink-0">{proficiencyLabel(l.proficiency)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      )}

      {awards.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Awards">
          <h2 className={H}>Awards</h2>
          {awards.map((a) => (
            <div key={a.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{a.title}</p>
              {join(a.issuer, formatMonth(a.awarded)) && <p className={SUB}>{join(a.issuer, formatMonth(a.awarded))}</p>}
              {a.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{a.description}</p>}
            </div>
          ))}
        </section>
      )}

      {publications.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Publications">
          <h2 className={H}>Publications</h2>
          {publications.map((p) => (
            <div key={p.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{p.title}</p>
              {join(p.publisher, formatMonth(p.published)) && <p className={SUB}>{join(p.publisher, formatMonth(p.published))}</p>}
              {p.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{p.description}</p>}
              {p.url && <CvAnchor href={p.url}>Read</CvAnchor>}
            </div>
          ))}
        </section>
      )}

      {cv.links.length > 0 && (
        <section className={clsx(CARD, "space-y-2")} aria-label="Links">
          <h2 className={H}>Links</h2>
          <ul className="flex flex-col gap-1">
            {cv.links.map((l) => (
              <li key={l.id}>
                <CvAnchor href={l.url}>{l.label}</CvAnchor>
              </li>
            ))}
          </ul>
        </section>
      )}

      {volunteering.length > 0 && (
        <section className={clsx(CARD, "space-y-3")} aria-label="Volunteering">
          <h2 className={H}>Volunteering</h2>
          {volunteering.map((v) => (
            <div key={v.id} className="flex flex-col gap-[3px]">
              <p className="text-sm font-bold text-charcoal break-words">{v.role}</p>
              <p className={SUB}>{join(v.organisation, formatRange(v.start, v.end, true))}</p>
              {v.description && <p className="text-[13px] leading-[1.45] text-charcoal whitespace-pre-line break-words">{v.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
