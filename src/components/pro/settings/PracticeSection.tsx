import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Globe2, Phone, Receipt, ShieldCheck } from "lucide-react";
import { SettingsRow, SettingsSection } from "../../ui/SettingsRows";
import { useApp } from "../../../context/AppContext";
import { fetchPracticeSettings, saveCallsWithHiredClients } from "../../../services/pro/practice";
import { t } from "../../../i18n/core";

/**
 * Release 3 W6 · MO23 v3 "Settings · as the client UI, with Practice"
 * (source/gen r16.js settings16): the Practice section between Security and
 * Data & account, professionals only. Rows as drawn: Booking defaults, Default
 * data requests, Invoice details, Calls with hired clients (a switch). Plus the
 * public listing switch FINAL_PLAN W6 moves here from the old listing sheet.
 */
export function PracticeSection() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [calls, setCalls] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchPracticeSettings(authUserId).then((r) => {
      if (!live) return;
      if (r.ok) setCalls(r.data.callsWithHiredClients);
      else setError(r.offline ? t("Offline, showing last update") : t("Couldn't load this setting."));
    });
    return () => {
      live = false;
    };
  }, [authUserId]);

  const toggleCalls = async (next: boolean) => {
    if (!authUserId || busy) return;
    const prev = calls;
    setCalls(next);
    setBusy(true);
    setError(null);
    const r = await saveCallsWithHiredClients(authUserId, next);
    setBusy(false);
    if (!r.ok) {
      setCalls(prev);
      setError(t(r.message));
    }
  };

  const go = (p: string) => () => navigate(`/app/more/practice/${p}`);

  return (
    <SettingsSection label={t("Practice")}>
      <SettingsRow icon={CalendarClock} title={t("Booking defaults")} subtitle={t("Notice, buffers and cancellation window")} onClick={go("booking-defaults")} />
      <SettingsRow icon={ShieldCheck} title={t("Default data requests")} subtitle={t("What new clients are asked to share")} onClick={go("data-requests")} />
      <SettingsRow icon={Receipt} title={t("Invoice details")} subtitle={t("Name on invoices, tax number, numbering")} onClick={go("invoice")} />
      <SettingsRow
        icon={Phone}
        title={t("Calls with hired clients")}
        subtitle={error ?? t("Voice and video in client chats")}
        toggle={{ checked: calls ?? true, onChange: (v) => void toggleCalls(v), disabled: calls === null || busy, label: t("Calls with hired clients") }}
      />
      <SettingsRow icon={Globe2} title={t("Public listing")} subtitle={t("Whether clients can find you in Explore")} onClick={go("listing")} />
    </SettingsSection>
  );
}
