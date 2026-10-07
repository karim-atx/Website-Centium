import { ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody } from "../../components/ui/SettingsRows";
import { HEALTH_DISCLAIMER } from "../../services/legal/disclaimer";

// MO1.8.8 Terms of Service, as a page (was a sheet), LAYOUT ONLY (C35): the
// board's shape (intro, the medical-disclaimer callout card, headed
// sections, the full-terms link) with today's words until the final copy
// arrives (D28). The "Prototype" line stays until then, as the intro.
//
// THE DISCLAIMER HAS ONE SOURCE: the callout reads HEALTH_DISCLAIMER, which
// section 2 also opens with, and links to the website's Health & Medical
// Disclaimer. Every account type reaches this page from Settings.
const sections: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance of terms",
    body:
      "By creating an account or using Centium, you agree to these Terms of Service. If you do not agree, please do not use the app.",
  },
  {
    heading: "2. Not medical advice",
    // QA 11.0 and Task Y2: the app-wide disclaimer opens this section.
    body:
      `${HEALTH_DISCLAIMER} ` +
      "Centium provides health, fitness and nutrition tracking tools for informational purposes only. Centium does not diagnose, prognose, or treat any condition, and is not a replacement for a doctor — the app and any professional advice given through it are guidance only. Always consult a qualified healthcare professional before making changes to your diet, exercise or medication routine. Centium does not condone, endorse, or facilitate the use or purchase of steroids or other unregulated drugs, and no such content or listing is permitted on the platform.",
  },
  {
    heading: "3. Your data",
    body:
      "Health metrics, biomarkers, workouts, and food logs you enter (or sync from a connected device) are used to power the app's features and, where you explicitly grant access, shared with professionals or businesses you connect with. You can revoke that access at any time from Professionals or Settings.",
  },
  {
    heading: "4. Professional & business listings",
    body:
      "Professionals and businesses on Centium are independent third parties, not Centium employees. Centium verifies submitted certifications on a best-effort basis but does not guarantee the accuracy of any credential, listing, or service. Any hiring, purchase, or membership you complete through the app is an agreement between you and that professional or business.",
  },
  {
    heading: "5. Payments & subscriptions",
    body:
      "Centium Premium, professional hiring fees, gym memberships/classes, and marketplace purchases may recur on the schedule you select. You can review or cancel active plans from Centium Premium, Explore, or the relevant detail screen at any time.",
  },
  {
    heading: "6. Community content",
    body:
      "Content you post to the Forum or share with other users must be respectful, accurate to your own experience, and free of medical claims you're not qualified to make. Centium may remove content that violates these terms.",
  },
  {
    heading: "7. Changes to these terms",
    body:
      "Centium may update these terms as the app evolves. Continued use of the app after an update constitutes acceptance of the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <div>
      <PageHeader title="Terms of Service" showBack sub tightBack />

      {/* MO1.8.8: 24 pt side insets; the first line 12 under the 36 pt title. */}
      <SettingsBody className="-mt-2">
      <p className="text-[12px] text-charcoal-faint">
        Prototype terms for demonstration purposes, not a legally binding document.
      </p>

      {/* The board's medical-disclaimer callout, new since the redesign, so
          the handover's own colours (decision 22): rgba(154,140,214,0.12)
          (measured #F3F1FA), the link and chevron #7D67D9. */}
      <a
        href="/legal#health"
        target="_blank"
        rel="noopener noreferrer"
        className="tap mt-4 block rounded-2xl bg-th-9a8cd6/[0.12] dark:bg-primary-pale px-4 py-3.5"
      >
        {/* MO1.8.8: the statement 14 / 600 on a 22 pt line (measured), the
            link 13.5 / 700. */}
        <span className="block text-[14px] font-semibold leading-[22px] text-charcoal">{HEALTH_DISCLAIMER}</span>
        <span className="mt-2 flex items-center justify-between gap-2 text-[13.5px] font-bold text-primary-accent">
          Health and Medical Disclaimer
          {/* MO1.8.8 icon list: ChevronRight 16 / 2 is the page's only chevron. */}
          <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 rtl:-scale-x-100" />
        </span>
      </a>

      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <section key={s.heading}>
            {/* MO1.8.8 (decision 23, as the frame): headings 15 / 700 #7D67D9
                (primary.accent), body 15 / 400 rgb(36,31,27) on a 24 line.
                Blocks are 24 apart (5 at 312 → 6 at 462) and measure
                30 + 24 × body lines (78 / 102 / 126), so heading line 24 plus
                6 before the body (measured). */}
            <h2 className="text-[15px] font-bold leading-6 text-primary-accent mb-1.5">{s.heading}</h2>
            <p className="text-[15px] leading-[1.6] text-charcoal">{s.body}</p>
          </section>
        ))}
      </div>

      <a
        href="/legal#terms"
        target="_blank"
        rel="noopener noreferrer"
        // New since the redesign (decision 22): #7D67D9, the rule above it
        // rgba(174,161,220,0.30) (measured #E7E3F4).
        className="tap mt-6 flex items-center justify-between gap-3 border-t border-th-aea1dc/30 dark:border-charcoal/[0.06] pt-4 text-[14px] font-bold text-primary-accent"
      >
        Read the full Terms of Service
        {/* MO1.8.8: 14 / 700 with ChevronRight 16 / 2. */}
        <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 rtl:-scale-x-100" />
      </a>
      </SettingsBody>
    </div>
  );
}
