import { ChevronRight, ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
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
      <PageHeader title="Terms of Service" showBack />

      <p className="text-[12px] text-charcoal-faint">
        Prototype terms for demonstration purposes — not a legally binding document.
      </p>

      {/* The board's medical-disclaimer callout: primary-pale, as the app's
          other tinted notes. */}
      <a
        href="/legal#health"
        target="_blank"
        rel="noopener noreferrer"
        className="tap mt-4 block rounded-2xl bg-primary-pale px-4 py-3.5"
      >
        <span className="block text-[13px] font-semibold leading-snug text-charcoal">{HEALTH_DISCLAIMER}</span>
        <span className="mt-2 flex items-center justify-between gap-2 text-[12.5px] font-semibold text-primary-deep-text">
          Health and Medical Disclaimer
          <ChevronRight size={15} aria-hidden className="shrink-0 rtl:-scale-x-100" />
        </span>
      </a>

      <div className="mt-6 space-y-5">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-[14px] font-bold text-charcoal mb-1">{s.heading}</h2>
            <p className="text-[14px] leading-[1.6] text-charcoal-soft">{s.body}</p>
          </section>
        ))}
      </div>

      <a
        href="/legal#terms"
        target="_blank"
        rel="noopener noreferrer"
        className="tap mt-6 flex items-center justify-between gap-3 border-t border-charcoal/[0.06] pt-4 text-[14px] font-semibold text-primary-deep-text"
      >
        Read the full Terms of Service
        <ExternalLink size={16} aria-hidden className="shrink-0" />
      </a>
    </div>
  );
}
