import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ChevronRight, Trash2, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { fetchHideReadReceipts, setHideReadReceipts } from "../../services/preferences";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";

// MO1.8.7 Privacy, as a page (was a sheet), LAYOUT ONLY (C35): the board's
// legal-page shape with today's words, until the final copy arrives (D28).
//
// THE CONTROLS GO ABOVE THE TEXT ("repo controls go above the text when
// ported"): Sharing with professionals (customers), Read receipts, and
// Delete my account. The text below them is today's privacy summary, then a
// link to the full policy on the website, which is the source of truth.
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
      <PageHeader title="Privacy" showBack sub />

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

      {/* MO1.8.7 body: 15 / 400 in the main text colour. */}
      <div className="mt-8 space-y-3 text-[15px] leading-[1.6] text-charcoal">
        <p>
          Your health data is stored securely on Centium's servers, and connecting with a professional
          doesn't give them access to it. You choose what each one can see, category by category, and
          can change or withdraw it any time — in Profile or the Professionals tab.
        </p>
      </div>

      <a
        href="/legal#privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="tap mt-6 flex items-center justify-between gap-3 border-t border-charcoal/[0.06] pt-4 text-[14px] font-bold text-primary-deep-text"
      >
        Read the full Privacy Policy
        {/* MO1.8.7: 14 / 700 with ChevronRight 16 / 2. */}
        <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 rtl:-scale-x-100" />
      </a>

      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
