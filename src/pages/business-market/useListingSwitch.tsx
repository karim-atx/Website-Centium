import { useState } from "react";
import { saveListingActive } from "../../services/business-market";
import { useMarket } from "./MarketContext";
import { CentredDialog, useStrip } from "./listingParts";

// The listing switch (business_profiles.active, BU3-01, live), now driven by
// the Overview's ListingToggleTile (B-MA.1) and the hidden banner's Turn on:
// on to off asks first ("Hide your business from Explore?", KEPT) and changes
// nothing until confirmed; off to on is immediate. Owner-only and the closed
// rule are the callers' (the tile is disabled for them). The confirm is the
// handover's CentredDialog; the results are ConfirmationStrips.

export function useListingSwitch() {
  const m = useMarket();
  const { v, business, setBusiness } = m;
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strip, showStrip] = useStrip();

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
    if (await write(true)) showStrip("Your listing is on Explore.");
  };
  const requestOff = () => {
    setError(null);
    setConfirm(true);
  };
  const confirmOff = async () => {
    const ok = await write(false);
    setConfirm(false);
    if (ok) showStrip("Your listing is hidden. Turn it on any time.");
  };

  const popup = (
    <CentredDialog
      open={confirm}
      title="Hide your business from Explore?"
      body={v.hideBody}
      cancel="Keep it visible"
      action="Hide listing"
      busy={busy}
      onAction={() => void confirmOff()}
      onCancel={() => setConfirm(false)}
    />
  );

  return { busy, error, toast: strip, popup, turnOn, requestOff };
}
