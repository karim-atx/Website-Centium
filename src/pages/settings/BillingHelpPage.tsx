import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ScrollText } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { ContactUsPopup } from "../../components/profile/ContactUsPopup";
import { BILLING_HELP_STEPS, BILLING_HELP_TITLE } from "../../services/legal/billingHelp";
import { REFUND_POLICY_HREF, REFUND_POLICY_LABEL } from "../../marketing/legal/refund";
import { t } from "../../i18n/core";
import { usePaneSpan } from "../../components/web/paneFill";

// Round F (DN, F5, undrawn): Settings › Billing and refunds for clients and
// professionals, who have no Help centre. The business Help centre's article
// layout (numbered steps, then "Still need help?") in Settings' own rows; the
// policy's link and Contact us close it.
export default function BillingHelpPage() {
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const inPane = usePaneSpan();
  return (
    <div>
      <PageHeader title={t(BILLING_HELP_TITLE)} showBack sub tightBack paneTop />
      {inPane ? (
        // WC-SE Settings Web (`billing`): the steps 15/24 with the number 700 #7D67D9, 10 apart inline, 12 between, 72ch.
        <ol style={{ margin: "0 0 32px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12, maxWidth: "72ch" }}>
          {BILLING_HELP_STEPS.map((s, i) => (
            <li key={i} className="flex" style={{ gap: 10, fontSize: 15, lineHeight: "24px", color: "#241F1B", textWrap: "pretty" } as CSSProperties}>
              <span style={{ flex: "none", fontWeight: 700, color: "#7D67D9" }}>{i + 1}.</span>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>
      ) : (
      <SettingsBody className="-mt-2">
        <ol className="mt-1">
          {BILLING_HELP_STEPS.map((s, i) => (
            <li key={i} className="mb-2.5 text-[14px] leading-[21px] text-charcoal" style={{ textWrap: "pretty" } as CSSProperties}>
              {i + 1}.{"\u00a0"} {t(s)}
            </li>
          ))}
        </ol>
      </SettingsBody>
      )}
      <SettingsSection label={t("Read more")}>
        <SettingsRow icon={ScrollText} title={t(REFUND_POLICY_LABEL)} onClick={() => navigate(REFUND_POLICY_HREF)} />
      </SettingsSection>
      <SettingsSection label={t("Still need help?")}>
        <SettingsRow icon={MessageSquare} title={t("Contact us")} onClick={() => setContactOpen(true)} />
      </SettingsSection>
      <ContactUsPopup open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
