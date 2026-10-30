import { ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody } from "../../components/ui/SettingsRows";
import { LegalFullLink, LegalIntro, LegalSections, LegalUpdated } from "../../components/settings/LegalText";
import { HEALTH_DISCLAIMER } from "../../services/legal/disclaimer";
import { legalCopyFor, TERMS_SECTIONS } from "./legalCopy";
import { t } from "../../i18n/core";
import { useApp } from "../../context/AppContext";
import { SubHeader } from "../../components/business-more/kit";
import { BusinessLegalSections } from "../../components/business-more/BusinessLegal";

// MO1.8.8 Terms of Service, as a page (was a sheet); handover-complete pass:
// the frame's text (the "Last updated" line, the intro, the medical-disclaimer
// callout, the twelve headed sections and the governing-law line,
// legalCopy.ts), then the link to the full terms on the website, which is the
// source of truth. Every account type reaches this page from Settings.
//
// THE DISCLAIMER HAS ONE SOURCE: the callout reads HEALTH_DISCLAIMER (the
// frame's own sentence pair) and links to the website's Health & Medical
// Disclaimer.
export default function TermsPage() {
  const { user } = useApp();
  const business = user.accountType === "business";
  const copy = legalCopyFor();
  return (
    <div>
      {/* v6 Batch 3 (OURS-MO1B-legal): business accounts take the More
          sub-page header and see the business sections after the general ones. */}
      {business ? <SubHeader title={t("Terms of Service")} /> : <PageHeader title={t("Terms of Service")} showBack sub tightBack />}

      {/* MO1.8.8: 24 pt side insets; the date line 12 under the 36 pt title,
          the intro 8 under it. */}
      <SettingsBody className="-mt-2">
      <LegalUpdated />
      <LegalIntro className="mt-2">{copy.TERMS_INTRO}</LegalIntro>

      {/* The board's medical-disclaimer callout, 16 under the intro, new
          since the redesign, so the handover's own colours (decision 22):
          rgba(154,140,214,0.12) (measured #F3F1FA), the link and chevron
          #7D67D9. */}
      <a
        href="/legal#health"
        target="_blank"
        rel="noopener noreferrer"
        className="tap mt-4 block rounded-2xl bg-th-9a8cd6/[0.12] dark:bg-primary-pale px-4 py-3.5"
      >
        {/* MO1.8.8: the statement 14 / 600 on a 22 pt line (measured), the
            link 13.5 / 700. */}
        <span className="block text-[14px] font-semibold leading-[22px] text-charcoal">{t(HEALTH_DISCLAIMER)}</span>
        <span className="mt-2 flex items-center justify-between gap-2 text-[13.5px] font-bold text-primary-accent">
          {t("Health and Medical Disclaimer")}
          <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0" />
        </span>
      </a>

      {/* Sections 24 under the callout and 24 apart. */}
      <LegalSections doc="terms" sections={TERMS_SECTIONS} className="mt-6" />
      {business && <BusinessLegalSections doc="terms" />}

      {/* MO1.8.8: 12 / 400 muted on an 18 line, 24 under the last section. */}
      <p className="mt-6 text-[12px] leading-[18px] text-charcoal-faint">{copy.TERMS_GOVERNING_LAW}</p>

      <LegalFullLink href="/legal#terms">{t("Read the full Terms of Service")}</LegalFullLink>
      </SettingsBody>
    </div>
  );
}
