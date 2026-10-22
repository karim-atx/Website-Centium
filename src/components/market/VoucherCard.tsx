import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { marketPalette } from "../../theme/marketTokens";
import { formatShortDate } from "../../utils/date";
import { PassQr } from "../marketplace/PassQr";
import { copyText } from "../share/shareActions";
import { FOCUS_CSS } from "./usePress";

// Market + Share 3.0 · VoucherCard (HANDOVER §4 C-MO.4 "Redeem" → Voucher,
// §5: code, qr, validUntil, status; Client Explore Screens lines 527–535,
// C-MO.4.4.4): radius 24, border 0.5px --hair, --card, padding 20, a centred
// column (gap 14):
// - the QR box 200 × 200 radius 16 --soft (the board's "QR CODE"
//   placeholder, D-52): the real code from the voucher's qrPayload, drawn by
//   the app's PassQr (zxing, #241F1B on white) at 176 on a white 176 square
//   (radius 10) inside the box, so it keeps its light quiet zone in dark;
// - the code: a 48-tall row, padding 0 14, radius 14, --pale, gap 10; the code
//   18 / 800 0.12em --pdark tabular; the copy glyph 16 stroke 2 --pdark. The
//   row is the copy button ("Tap the code to copy it");
// - "Tap the code to copy it" 11.5 --faint;
// - "Valid until Jan 15, 2027" 13 / 700 (D-02 month first).
// Used and expired vouchers are not drawn on the board: the QR box shows the
// state instead of a scannable code, the hint goes, and the date line reads
// "Used on …" / "Expired on …".

export type VoucherStatus = "issued" | "used" | "expired";

export interface VoucherCardProps {
  code: string;
  /** The voucher's qrPayload (api.md: an opaque signed token). */
  qr: string;
  /** ISO date-time the voucher expires (validUntil). */
  validUntil: string;
  status: VoucherStatus;
  /** ISO date-time it was marked used. */
  usedAt?: string | null;
  /** After a copy attempt (the screen shows its strip). */
  onCopied?: (ok: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

const longDate = (iso: string): string => formatShortDate(new Date(iso), { month: "short", day: "numeric", year: "numeric" });

export const VoucherCard: React.FC<VoucherCardProps> = ({ code, qr, validUntil, status, usedAt, onCopied, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const live = status === "issued";
  const dateLine =
    status === "used" ? (usedAt ? `Used on ${longDate(usedAt)}` : "Used") : status === "expired" ? `Expired on ${longDate(validUntil)}` : `Valid until ${longDate(validUntil)}`;
  const copy = async () => {
    const ok = await copyText(code);
    onCopied?.(ok);
  };
  return (
    <div className={className} style={{ lineHeight: "normal", borderRadius: 24, border: `0.5px solid ${m.hair}`, background: m.card, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: m.ink, ...style }}>
      <style>{FOCUS_CSS + ".market-qr svg{transform:none!important}"}</style>
      <div style={{ width: 200, height: 200, borderRadius: 16, background: m.soft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {live ? (
          <span className="market-qr" style={{ width: 176, height: 176, borderRadius: 10, background: "#FFFFFF", overflow: "hidden", display: "block" }}>
            <PassQr value={qr} size={176} label="Voucher QR code" failedText="Couldn't draw this voucher's code. Close it and try again." />
          </span>
        ) : (
          <span style={{ fontSize: textPx(10), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.tert }}>{status === "used" ? "Used" : "Expired"}</span>
        )}
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy code ${code}`}
        className="market-focus"
        style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 14px", borderRadius: 14, background: m.pale, border: 0, font: "inherit", cursor: "pointer", maxWidth: "100%" }}
      >
        <span style={{ fontSize: textPx(18), fontWeight: 800, letterSpacing: "0.12em", color: m.pdark, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{code}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
          <rect x="8" y="8" width="14" height="14" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </button>
      {live ? <div style={{ fontSize: textPx(11.5), color: m.faint }}>Tap the code to copy it</div> : null}
      <div style={{ fontSize: textPx(13), fontWeight: 700 }}>{dateLine}</div>
    </div>
  );
};
