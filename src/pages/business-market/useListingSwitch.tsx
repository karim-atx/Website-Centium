import { useState } from "react";
import { EyeOff } from "lucide-react";
import { saveListingActive } from "../../services/business-market";
import { useMarket } from "./MarketContext";
import { MPopup, useMarketToast } from "./kit";

// The listing switch (business_profiles.active, BU3-01, live): on to off asks
// first (MA1-044) and changes nothing until confirmed; off to on is immediate
// (MA1-048 Turn on, MA1-001 S4). Toasts: MA1-046 and the OURS turn-on line.

export function useListingSwitch() {
  const m = useMarket();
  const { c, v, business, setBusiness } = m;
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, showToast] = useMarketToast();

  const write = async (active: boolean) => {
    if (!business) return false;
    setBusy(true);
    setError(null);
    const prev = business;
    setBusiness({ ...business, active });
    const r = await saveListingActive(business.id, active);
    setBusy(false);
    if (!r.ok) {
      setBusiness(prev);
      setError(r.message);
      return false;
    }
    return true;
  };

  const turnOn = async () => {
    if (await write(true)) showToast("Your listing is on Explore.");
  };
  const requestOff = () => setConfirm(true);
  const confirmOff = async () => {
    const ok = await write(false);
    setConfirm(false);
    if (ok) showToast("Your listing is hidden. Turn it on any time.");
  };

  const popup = (
    <MPopup
      open={confirm}
      icon={EyeOff}
      disc={{ bg: c.soft, ink: c.inkSoft }}
      title="Hide your business from Explore?"
      body={v.hideBody}
      action="Hide listing"
      keep="Keep it visible"
      busy={busy}
      onAction={() => void confirmOff()}
      onCancel={() => setConfirm(false)}
    />
  );

  return { busy, error, toast, popup, turnOn, requestOff };
}
