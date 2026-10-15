import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Globe2, Phone, Receipt, ShieldCheck } from "lucide-react";
import { SettingsRow, SettingsSection } from "../../ui/SettingsRows";
import { useApp } from "../../../context/AppContext";
import { fetchPracticeSettings, saveCallsWithHiredClients } from "../../../services/pro/practice";

/**
 * Release 3 W6 · MO23 v3 "Settings · as the client UI, with Practice"
 * (source/gen r16.js settings16): the Practice section between Security and
 * Data & account, professionals only. Rows as drawn: Booking defaults, Default
 * data requests, Invoice details, Calls with hired clients (a switch). Plus the
 * public listing switch FINAL_PLAN W6 moves here from PublicListingSheet.
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
      else setError(r.offline ? "Offline, showing last update" : "Couldn't load this setting.");
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
      setError(r.message);
    }
  };

  const go = (p: string) => () => navigate(`/app/more/practice/${p}`);

  return (
    <SettingsSection label="Practice">
      <SettingsRow icon={CalendarClock} title="Booking defaults" subtitle="Notice, buffers and cancellation window" onClick={go("booking-defaults")} />
      <SettingsRow icon={ShieldCheck} title="Default data requests" subtitle="What new clients are asked to share" onClick={go("data-requests")} />
      <SettingsRow icon={Receipt} title="Invoice details" subtitle="Name on invoices, tax number, numbering" onClick={go("invoice")} />
      <SettingsRow
        icon={Phone}
        title="Calls with hired clients"
        subtitle={error ?? "Voice and video in client chats"}
        toggle={{ checked: calls ?? true, onChange: (v) => void toggleCalls(v), disabled: calls === null || busy, label: "Calls with hired clients" }}
      />
      <SettingsRow icon={Globe2} title="Public listing" subtitle="Whether clients can find you in Explore" onClick={go("listing")} />
    </SettingsSection>
  );
}
