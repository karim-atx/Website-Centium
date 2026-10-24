import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { textPx, linePx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { marketPalette } from "../../../theme/marketTokens";
import { VoucherCard } from "../../../components/market/VoucherCard";
import { ConfirmationStrip } from "../../../components/market/ConfirmationStrip";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { fetchMyVoucher, howToUse, liveStatus, type Voucher } from "../../../services/vouchers";
import type { MarketResult } from "../../../services/market/rpc";
import { CapsLabel } from "./rewardsParts";

// Market + Share 3.0 · W2 · C-MO.4.4.4 Voucher (`voucher`) at
// /app/marketplace/vouchers/:id. Literal values, Client Explore Screens lines
// 515–546:
// - a row (space-between): "VOUCHER" 10.5 / 700 0.1em --faint and the 32
//   close ring (1.5px --border, the X 14 stroke 2.4 --ink2);
// - the headline (margin-top 6) 22 / 28 800; the owner 13 / 600 --accent
//   (the business, or "Rami · Coach or instructor": ownerSubtitle);
// - (margin-top 16) the W1 VoucherCard: the real QR (qr_payload), the code
//   (tap to copy), "Valid until Jan 15, 2027" (D-02);
// - "How to use" (margin-top 18) and (margin-top 8, gap 8, 13 / 19 --ink2)
//   numbered rows, gap 10, the 22 circle --pale / --pdark 11 / 800
//   (howToUse: in store / online by where it's valid);
// - with ?new=1 (straight after redeeming), the ConfirmationStrip (margin-top
//   16) tone teal "Saved to My Rewards" with "View" → My rewards.
// The voucher is DB2's `vouchers` row (fetchMyVoucher, the member's own); the
// QR carries the code, which is what check_voucher reads.

type Load = { state: "loading" } | { state: "done"; result: MarketResult<Voucher | null> };

export default function VoucherPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const isNew = params.get("new") === "1";
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const close = useBack("/app/marketplace/rewards/mine");
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [copied, setCopied] = useState<boolean | null>(null);
  const copyTimer = useRef<number | null>(null);

  const fetchIt = useCallback(() => {
    let live = true;
    setLoad({ state: "loading" });
    void fetchMyVoucher(id).then((result) => live && setLoad({ state: "done", result }));
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => fetchIt(), [fetchIt]);
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const onCopied = (ok: boolean) => {
    setCopied(ok);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 2600);
  };

  const header = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", lineHeight: "normal" }}>
      <div role="heading" aria-level={2} style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", color: m.faint }}>
        VOUCHER
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="hit market-focus"
        style={{ width: 32, height: 32, boxSizing: "content-box", borderRadius: 999, border: `1.5px solid ${m.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: "none", padding: 0, cursor: "pointer" }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden style={NO_ICON_SCALE}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );

  const shell = (content: React.ReactNode) => (
    <div style={{ paddingBottom: 34 }}>
      <style>{FOCUS_CSS}</style>
      {header}
      <div style={{ marginTop: 12 }}>{content}</div>
    </div>
  );

  if (load.state === "loading") return shell(<MarketSkeleton radius={24} count={1} rows={3} height={320} label="Loading your voucher" />);
  const r = load.result;
  if (!r.ok) {
    return shell(<MarketError thing="your voucher" onRetry={fetchIt} />);
  }
  const v = r.value;
  if (!v) return shell(<MarketEmptyCard title="We couldn't find this voucher" body="It may have been removed. Your vouchers are in My rewards." />);

  const status = liveStatus(v);
  const steps = howToUse(v.where, v.onlineUrl);

  return (
    <div style={{ paddingBottom: 34, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {header}
      <h1 style={{ margin: "6px 0 0", fontSize: textPx(22), lineHeight: linePx(28), fontWeight: 800 }}>{v.offerHeadline}</h1>
      <div style={{ fontSize: textPx(13), fontWeight: 600, color: m.accent }}>{v.ownerSubtitle}</div>

      <VoucherCard code={v.code} qr={v.qrPayload} validUntil={v.expiresAt} status={status} usedAt={v.usedAt} onCopied={onCopied} style={{ marginTop: 16 }} />

      {status === "issued" ? (
        <>
          <CapsLabel style={{ marginTop: 18 }}>How to use</CapsLabel>
          <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>
            {steps.map((s, i) => (
              <li key={s} style={{ display: "flex", gap: 10 }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(11), fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {copied !== null ? (
        <ConfirmationStrip tone={copied ? "success" : "error"} text={copied ? "Code copied" : "Couldn't copy the code. Copy it by hand."} style={{ marginTop: 16 }} />
      ) : null}

      {isNew ? <ConfirmationStrip tone="teal" text="Saved to My Rewards" action="View" onAction={() => navigate("/app/marketplace/rewards/mine")} style={{ marginTop: 16 }} /> : null}
    </div>
  );
}
