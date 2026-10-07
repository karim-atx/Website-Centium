import React from "react";
import { ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { PublicCv } from "../../services/professional-cv";
import { byRecency, formatMonth, formatRange } from "../../services/professional-cv/cvDates";

// A professional's CV as a client reads it: the public profile and the
// professional's own "Preview as a client" both render through this one
// component, so the two cannot drift apart.
//
// MO1.2.1 / MO1.2.1.4 (B8): each section's name sits above its card as a
// small uppercase label in the professional's type colour; Experience and
// Certifications read as a timeline of dots; Skills are pills with no card.
//
// HANDOVER-COMPLETE PASS: only the frame's sections, in its order:
// Experience ("Head coach, Flex Gym" over "2019 – present · Hamra, Beirut"),
// Certifications (licences, then education: "BSc Exercise Science" over
// "American University of Beirut · 2015"), Skills. Languages, Awards,
// Publications, Links, Volunteering and the experience / education
// descriptions are no longer shown to clients; the professional still sees
// and edits them in their CV editor. Kept on a licence (safety: whether a
// credential is still valid and where to check it): "Expired …" and "View
// credential".
//
// MONTH AND YEAR ONLY. The views publish nothing finer, and this never asks.
// Sections with nothing in them are left out rather than shown empty.

const CARD = "rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4";
// MO1.2.1 / MO1.2.1.4: meta lines 11.5/400 rgb(140,131,120), the existing faint grey.
const SUB = "text-[11.5px] font-normal text-charcoal-faint";
const TITLE = "text-[13.5px] font-semibold text-charcoal break-words";

const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(" · ");
const comma = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(", ");

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
    {/* MO1.2.1 (measured): an 8 dot centred on the title's first line, a
        1 px rule from 3 under it; the text 12 to the right of the dot. The
        rule keeps its pre-redesign colour (decision 22: the timeline existed
        at 4fdc109). */}
    <div className="w-2 flex flex-col items-center pt-[7px] shrink-0" aria-hidden>
      <span className={clsx("w-2 h-2 rounded-full shrink-0", !accent && "bg-primary")} style={accent ? { background: accent.label } : undefined} />
      {!last && <span className="w-px flex-1 bg-charcoal/10 mt-[3px]" />}
    </div>
    <div className={clsx("min-w-0 flex-1 flex flex-col gap-[3px]", !last && "pb-3.5")}>{children}</div>
  </li>
);

export const CvView: React.FC<{ cv: PublicCv; skills: string[]; accent?: CvAccent }> = ({ cv, skills, accent }) => {
  const experience = byRecency(cv.experience, true);
  const education = byRecency(cv.education, false);
  const certifications = [
    ...cv.licences.map((l) => ({ kind: "licence" as const, id: `l-${l.id}`, l })),
    ...education.map((e) => ({ kind: "education" as const, id: `e-${e.id}`, e })),
  ];

  return (
    <div className="space-y-5">
      {experience.length > 0 && (
        <section aria-label="Experience">
          <Label accent={accent}>Experience</Label>
          <ol className={CARD}>
            {experience.map((e, i) => (
              <Dot key={e.id} accent={accent} last={i === experience.length - 1}>
                <p className={TITLE}>{comma(e.title, e.organisation)}</p>
                {join(formatRange(e.start, e.end, true), e.location) && (
                  <p className={SUB}>{join(formatRange(e.start, e.end, true), e.location)}</p>
                )}
              </Dot>
            ))}
          </ol>
        </section>
      )}

      {certifications.length > 0 && (
        <section aria-label="Certifications">
          <Label accent={accent}>Certifications</Label>
          <ol className={CARD}>
            {certifications.map((c, i) => {
              const last = i === certifications.length - 1;
              if (c.kind === "licence") {
                const l = c.l;
                // MO1.2.1: "Verified" ends the meta line ("Issued 2017 · Verified"), not a pill.
                const meta = join(l.issued ? `Issued ${formatMonth(l.issued)}` : null, l.verified ? "Verified" : null);
                return (
                  <Dot key={c.id} accent={accent} last={last}>
                    <p className={TITLE}>{comma(l.name, l.issuingBody)}</p>
                    {meta && <p className={SUB}>{meta}</p>}
                    {l.expired && l.expires && <p className={SUB}>Expired {formatMonth(l.expires)}</p>}
                    {l.credentialUrl && <CvAnchor href={l.credentialUrl}>View credential</CvAnchor>}
                  </Dot>
                );
              }
              const e = c.e;
              const title = [e.degree, e.field].filter(Boolean).join(" ");
              const meta = join(title ? e.institution : null, formatRange(e.start, e.end, false));
              return (
                <Dot key={c.id} accent={accent} last={last}>
                  <p className={TITLE}>{title || e.institution}</p>
                  {meta && <p className={SUB}>{meta}</p>}
                </Dot>
              );
            })}
          </ol>
        </section>
      )}

      {skills.length > 0 && (
        <section aria-label="Skills">
          <Label accent={accent}>Skills</Label>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li
                key={s}
                // MO1.2.1: 28 tall (measured), 12 either side.
                className={clsx("text-[12px] font-semibold rounded-full px-3 py-[5px] max-w-full break-words", !accent && "bg-primary-pale text-primary-deep-text")}
                style={accent ? { background: accent.pillBg, color: accent.pillInk } : undefined}
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
