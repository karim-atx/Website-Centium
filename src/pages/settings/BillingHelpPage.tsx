import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ScrollText } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { ContactUsPopup } from "../../components/profile/ContactUsPopup";
import { BILLING_HELP_STEPS, BILLING_HELP_TITLE } from "../../services/legal/billingHelp";
import { REFUND_POLICY_LABEL, REFUND_POLICY_PATH } from "../../marketing/legal/refund";
import { t } from "../../i18n/core";

// Round F (DN, F5, undrawn): Settings › Billing and refunds for clients and
// professionals, who have no Help centre. The business Help centre's article
// layout (numbered steps, then "Still need help?") in Settings' own rows; the
// policy's link and Contact us close it.
export default function BillingHelpPage() {
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div>
      <PageHeader title={t(BILLING_HELP_TITLE)} showBack sub tightBack />
      <SettingsBody className="-mt-2">
        <ol className="mt-1">
          {BILLING_HELP_STEPS.map((s, i) => (
            <li key={i} className="mb-2.5 text-[14px] leading-[21px] text-charcoal" style={{ textWrap: "pretty" } as CSSProperties}>
              {i + 1}.{"\u00a0"} {t(s)}
            </li>
          ))}
        </ol>
      </SettingsBody>
      <SettingsSection label={t("Read more")}>
        <SettingsRow icon={ScrollText} title={t(REFUND_POLICY_LABEL)} onClick={() => navigate(REFUND_POLICY_PATH)} />
      </SettingsSection>
      <SettingsSection label={t("Still need help?")}>
        <SettingsRow icon={MessageSquare} title={t("Contact us")} onClick={() => setContactOpen(true)} />
      </SettingsSection>
      <ContactUsPopup open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
