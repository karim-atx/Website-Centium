import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Trash2, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { fetchHideReadReceipts, setHideReadReceipts } from "../../services/preferences";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";
import { LegalFullLink, LegalIntro, LegalSections, LegalUpdated } from "../../components/settings/LegalText";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "./legalCopy";

// MO1.8.7 Privacy, as a page (was a sheet); handover-complete pass: the
// frame's text (the "Last updated" line, the intro and the ten headed
// sections, legalCopy.ts), then the link to the full policy on the website,
// which is the source of truth.
//
// THE CONTROLS GO ABOVE THE TEXT ("repo controls go above the text when
// ported"; kept as privacy and account features, exception 1): Sharing with
// professionals (customers), Read receipts, and Delete my account.
//
// THE "STAYS ON THIS DEVICE" FRAMING STAYS GONE: health data lives on
// Centium's servers, and what keeps it private is client_access_grants, a
// row per category per professional that grants nothing until switched on.
export default function PrivacyPage() {
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Read receipts: null until the server answers, so the switch never shows a
  // position it might have to jump out of. Re-read on every visit, because the
  // preference syncs across devices.
  const [hideReceipts, setHideReceipts] = useState<boolean | null>(null);
  const [savingReceipts, setSavingReceipts] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchHideReadReceipts().then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setHideReceipts(res.hideReadReceipts);
        setReceiptsError(null);
      } else setReceiptsError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const toggleReceipts = async (next: boolean) => {
    if (!authUserId || savingReceipts) return;
    const previous = hideReceipts;
    // Reverted to `previous`, not `!next`: they differ while the value is
    // still null, and a concrete false would invent a state.
    setHideReceipts(next);
    setSavingReceipts(true);
    setReceiptsError(null);
    const res = await setHideReadReceipts(authUserId, next);
    setSavingReceipts(false);
    if (res.status === "ok") {
      setHideReceipts(res.hideReadReceipts);
      return;
    }
    setHideReceipts(previous);
    setReceiptsError(res.message);
  };

  return (
    <div>
      <PageHeader title="Privacy" showBack sub tightBack />

      {/* MO1.8.7: 24 pt side insets; 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">

      <SettingsSection label="Your controls">
        {/* Customer only: a professional has no professionals of their own to
            share with, and their Professionals tab is their client roster. */}
        {user.accountType === "customer" && (
          <SettingsRow
            icon={Users}
            title="Sharing with professionals"
            subtitle="Manage what each professional can see"
            onClick={() => navigate("/app/professionals")}
          />
        )}
        {authUserId && hideReceipts !== null && (
          <SettingsRow
            icon={CheckCheck}
            title="Read receipts"
            subtitle="Turn off to stop sharing when you've read messages. You won't be able to see others' read receipts either."
            toggle={{ checked: !hideReceipts, onChange: (v) => void toggleReceipts(!v), disabled: savingReceipts }}
          />
        )}
        {/* "Delete my account", named for what the flow does: deletion is
            all-or-nothing and reversible for 30 days. */}
        <SettingsRow
          icon={Trash2}
          destructive
          title="Delete my account"
          subtitle="Schedules deletion after a 30-day grace period"
          onClick={() => setDeleteOpen(true)}
        />
      </SettingsSection>
      {receiptsError && <p className="text-[11.5px] text-status-high mt-2">{receiptsError}</p>}

      {/* MO1.8.7: the date line, 8 to the intro, 24 to the first section;
          32 under the controls (the Settings section gap). */}
      <div className="mt-8">
        <LegalUpdated />
        <LegalIntro className="mt-2">{PRIVACY_INTRO}</LegalIntro>
        <LegalSections doc="privacy" sections={PRIVACY_SECTIONS} className="mt-6" />
      </div>

      <LegalFullLink href="/legal#privacy">Read the full Privacy Policy</LegalFullLink>
      </SettingsBody>

      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
