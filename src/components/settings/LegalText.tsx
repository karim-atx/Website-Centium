import React from "react";
import { ChevronRight } from "lucide-react";
import { LEGAL_UPDATED, legalHref, type LegalSection } from "../../pages/settings/legalCopy";

// The shared parts of MO1.8.7 Privacy and MO1.8.8 Terms of Service, as both
// frames draw them (measured on the 2x boards): the "Last updated" line
// 13 / 400 muted on a 19 line, the intro 15 / 400 on 24, headed sections 24
// apart (heading 15 / 700 primary.accent on 24, 6 above the body 15 / 400 on
// 24), and the full-document link under a rule. New since the redesign, so
// the handover's own colours (decision 22): #7D67D9 headings and link, the
// rule rgba(174,161,220,0.30) (measured #E7E3F4).
//
// BR-11: each heading opens its section on the website, which is the source
// of truth (/legal#legal/<doc>/<slug>), in a new tab as the web's stand-in
// for the in-app browser.

export const LegalUpdated: React.FC = () => (
  <p className="text-[13px] leading-[19px] text-charcoal-faint">Last updated {LEGAL_UPDATED}</p>
);

export const LegalIntro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`text-[15px] leading-6 text-charcoal ${className ?? ""}`}>{children}</p>
);

export const LegalSections: React.FC<{ doc: "privacy" | "terms"; sections: LegalSection[]; className?: string }> = ({
  doc,
  sections,
  className,
}) => (
  <div className={`space-y-6 ${className ?? ""}`}>
    {sections.map((s) => (
      <section key={s.heading}>
        <h2 className="mb-1.5">
          <a
            href={legalHref(doc, s.heading)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-bold leading-6 text-primary-accent"
          >
            {s.heading}
          </a>
        </h2>
        <p className="text-[15px] leading-6 text-charcoal">{s.body}</p>
      </section>
    ))}
  </div>
);

/**
 * "Read the full …": 14 / 700 #7D67D9 on a 21 line with ChevronRight 16 / 2
 * at the end, 28 under the text above, the rule then 14 to the text. Both
 * frames set the words in a box about 150 wide, so they break onto two lines
 * ("Read the full Privacy / Policy", "Read the full Terms of / Service") with
 * the chevron level with the first.
 */
export const LegalFullLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="tap mt-7 flex items-start justify-between gap-3 border-t border-th-aea1dc/30 dark:border-charcoal/[0.06] pt-3.5 text-[14px] leading-[21px] font-bold text-primary-accent"
  >
    <span className="max-w-[150px]">{children}</span>
    <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 mt-[2.5px] rtl:-scale-x-100" />
  </a>
);
