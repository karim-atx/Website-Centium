import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileLock, ShieldCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SettingsRow, SettingsSection } from "../../../components/ui/SettingsRows";
import { INK } from "../../../components/pro/proInk";
import { ComingSoonPill } from "../../../components/pro/ComingSoon";
import { CATEGORY_LABEL } from "../../../components/pro/home/categoryLabels";
import { PRO_ROUTES } from "../../../components/pro/subtypeLanes";
import { fetchPracticeSettings } from "../../../services/pro/practice";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Release 3 · MO11 Consent and data sharing (/app/more/consent; gen/more.js
 * consent): the teal-pale note (r16, pad 14, gap 10, shield 18 #3C6B65 /
 * dark #B2D4CF, 12.5 text.soft 1.55), "What you ask new clients to share"
 * and "Your responsibilities" (sSection / sRows = SettingsSection and
 * SettingsRow).
 * The switches in the first section are the practice's default data
 * requests, which Settings › Practice › Default data requests owns
 * (/app/more/practice/data-requests); this page shows what is asked today
 * and opens that page rather than keeping a second set of switches.
 * "Professional terms, section 4" has no professional terms page, so the
 * row opens the Terms; exporting a client record has no backend (Coming
 * soon).
 */
export default function Consent() {
  const { authUserId } = useApp();
  const dark = useIsDark();
  const navigate = useNavigate();
  const back = useBack(PRO_ROUTES.more);
  const [asked, setAsked] = useState<string[] | null | undefined>(undefined);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchPracticeSettings(authUserId).then((r) => live && setAsked(r.ok ? r.data.dataRequests : null));
    return () => {
      live = false;
    };
  }, [authUserId]);

  const askedLine =
    asked === undefined ? "Loading…" : asked === null ? "What new clients are asked to share" : asked.length ? asked.map((c) => cap(CATEGORY_LABEL[c] ?? c)).join(", ") : "Nothing asked yet";

  return (
    <div style={{ paddingBottom: 120 }}>
      <PageHeader title="Consent and data sharing" showBack onBack={back} />
      <div className="flex" style={{ borderRadius: 16, background: INK.tealPale, padding: 14, gap: 10, marginBottom: 8 }}>
        <ShieldCheck size={18} strokeWidth={2} aria-hidden style={{ color: dark ? "#B2D4CF" : "#3C6B65", flexShrink: 0 }} />
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.55 }}>Clients choose what to share with you, item by item, and can stop at any time. You only ever see what they have shared.</p>
      </div>
      <SettingsSection label="What you ask new clients to share" className="mt-6">
        <SettingsRow icon={ShieldCheck} title="Default data requests" subtitle={askedLine} onClick={() => navigate(`${PRO_ROUTES.more}/practice/data-requests`)} />
      </SettingsSection>
      <SettingsSection label="Your responsibilities">
        <SettingsRow icon={FileLock} title="How you handle client data" subtitle="Terms of Service" onClick={() => navigate("/app/settings/terms")} />
        <SettingsRow icon={Download} title="Export a client record" subtitle="For your own files, with consent" value={<ComingSoonPill />} />
      </SettingsSection>
    </div>
  );
}
