import { useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { CentredDialog } from "../../pages/business-market/listingParts";
import { Caps } from "../../pages/professionals/profile/parts";
import {
  cancelHire,
  cancelPromptLine,
  clientCancelledLine,
  describeClientCancelError,
  hireStatusLabel,
  hireUntilLabel,
  priceShort,
  type MyHire,
} from "../../services/hires";
import { t } from "../../i18n/core";

// A3-client (kept, PLAN §3.2), restyled for C-MO.4.9 (Market + Share 3.0 W5):
// the client's live hire with this professional, on the profile's Services
// tab, from my_hires(). "Pending payment" until the professional confirms
// receipt, then "Active". Cancel hire calls cancel_hire(); the wording is
// chosen by whether the professional has confirmed (was_free) and names no
// charge or refund. Not drawn on the board: built in its chrome (the caps
// label, the 18 card with the 0.5px hairline, the status pill as the board's
// pills: --cautionbg / --caution pending, --tealbg / --tealink active; the
// CentredDialog for the destructive cancel).

export function YourHireCard({ hire, onChanged }: { hire: MyHire; /** Reload my_hires() after a cancel; `note` is what cancelling did. */ onChanged: (note?: string) => void }) {
  const m = marketPalette(useIsDark());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = hire.paymentStatus !== "paid";
  const until = hireUntilLabel(hire.expiresOn);

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await cancelHire(hire.id);
    setBusy(false);
    setConfirming(false);
    if (!r.ok) {
      setError(t(r.code ? describeClientCancelError(r.code) : r.message));
      if (r.code === "ATXA1") onChanged();
      return;
    }
    onChanged(clientCancelledLine(hire.professionalFirstName, r.wasFree));
  };

  return (
    <section aria-label={t("Your plan")} style={{ lineHeight: "normal" }}>
      <Caps>{t("Your plan")}</Caps>
      <div style={{ marginTop: 8, borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, padding: "12px 14px", color: m.ink }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: textPx(14), fontWeight: 700, overflowWrap: "anywhere" }}>{hire.planName}</div>
            <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
              {[priceShort(hire.priceAgreed), hire.paymentMethod === "whish" ? "Whish Money" : t("Cash"), until].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span style={{ flexShrink: 0, borderRadius: 999, padding: "4px 10px", fontSize: textPx(12), fontWeight: 700, whiteSpace: "nowrap", background: pending ? m.cautionbg : m.tealbg, color: pending ? m.caution : m.tealink }}>
            {t(hireStatusLabel(hire))}
          </span>
        </div>
        {pending && (
          <p style={{ margin: "8px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
            {hire.paymentMethod === "cash" ? `${hire.professionalFirstName ? t("Pay {name} in person.", { name: hire.professionalFirstName }) : t("Pay them in person.")} ` : ""}
            {t("Your hire becomes active once they confirm they've been paid.")}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="hit market-focus"
          style={{ marginTop: 8, height: 32, padding: 0, background: "none", border: 0, font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: m.high, cursor: "pointer" }}
        >
          {t("Cancel hire")}
        </button>
        {error && (
          <p role="alert" style={{ margin: "4px 0 0", fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
            {t(error)}
          </p>
        )}
      </div>

      <CentredDialog
        open={confirming}
        title={t("Cancel this hire?")}
        body={cancelPromptLine(hire)}
        cancel={t("Keep my plan")}
        action={t("Cancel hire")}
        busy={busy}
        onAction={() => void cancel()}
        onCancel={() => !busy && setConfirming(false)}
      />
    </section>
  );
}
