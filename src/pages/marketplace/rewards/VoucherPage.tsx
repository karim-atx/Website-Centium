import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWebLayout } from "../../../components/web/useWebLayout";
import MyRewardsPage from "../MyRewardsPage";
import OfferDetailPage from "./OfferDetailPage";
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
import { t, tk } from "../../../i18n/core";

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
  // Addendum A (WC-EX.7.3): on web the voucher is a centred popup over the page it was opened from.
  const { web } = useWebLayout();
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!web) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [web, close]);
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
      <div role="heading" aria-level={2} style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
        {t("Voucher")}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t("Close")}
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

  // WC-EX Rewards Web: the 440 popup (r24, padding 24, the shadow) on the
  // 0.4 scrim; VOUCHER 12/16 0.1em and the 32 close ring; the opener page
  // (an offer, else My rewards) stays drawn underneath.
  const webPopup = (content: React.ReactNode) => {
    const under = (location.state as { under?: string } | null)?.under ?? "";
    const offerId = /^\/app\/marketplace\/rewards\/(?!mine\/?$)([^/]+)\/?$/.exec(under)?.[1];
    return (
      <>
        <div aria-hidden inert>
          {offerId ? <OfferDetailPage offerId={decodeURIComponent(offerId)} /> : <MyRewardsPage />}
        </div>
        <div
          onMouseDown={(e) => e.target === e.currentTarget && close()}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,31,27,0.4)" }}
        >
          <div role="dialog" aria-modal="true" aria-label={t("Voucher")} data-voucher-web="" style={{ width: 440, maxHeight: "calc(100dvh - 48px)", overflowY: "auto", boxSizing: "border-box", background: "#FFFFFF", borderRadius: 24, padding: 24, boxShadow: "0 24px 60px rgba(36,31,27,0.2)", lineHeight: "normal", color: m.ink }}>
            <style>{FOCUS_CSS}</style>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#71685E" }}>{t("Voucher")}</span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label={t("Close")}
                className="market-focus"
                style={{ width: 32, height: 32, boxSizing: "border-box", borderRadius: 999, border: "1.5px solid rgba(36,31,27,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B5349", background: "none", padding: 0, cursor: "pointer" }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            {content}
          </div>
        </div>
      </>
    );
  };

  const shell = (content: React.ReactNode) =>
    web ? (
      webPopup(<div style={{ marginTop: 12 }}>{content}</div>)
    ) : (
      <div style={{ paddingBottom: 34 }}>
        <style>{FOCUS_CSS}</style>
        {header}
        <div style={{ marginTop: 12 }}>{content}</div>
      </div>
    );

  if (load.state === "loading") return shell(<MarketSkeleton radius={24} count={1} rows={3} height={320} label={tk("Loading your voucher")} />);
  const r = load.result;
  if (!r.ok) {
    return shell(<MarketError thing={tk("your voucher")} onRetry={fetchIt} />);
  }
  const v = r.value;
  if (!v) return shell(<MarketEmptyCard title={tk("We couldn't find this voucher")} body={tk("It may have been removed. Your vouchers are in My rewards.")} />);

  const status = liveStatus(v);
  const steps = howToUse(v.where, v.onlineUrl);

  if (web)
    return webPopup(
      <>
        <h2 style={{ margin: "6px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 800 }}>{v.offerHeadline}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D67D9" }}>{v.ownerSubtitle}</p>
        <VoucherCard code={v.code} qr={v.qrPayload} validUntil={v.expiresAt} status={status} usedAt={v.usedAt} onCopied={onCopied} style={{ marginTop: 14 }} />
        {status === "issued" ? (
          <>
            <h3 style={{ margin: "16px 0 0", fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#71685E" }}>{t("How to use")}</h3>
            <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>
              {steps.map((s, i) => (
                <li key={s} style={{ display: "flex", gap: 10 }}>
                  <span aria-hidden style={{ width: 24, height: 24, borderRadius: 999, background: "#F0EDF9", color: "#7D6BB5", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </>
        ) : null}
        {copied !== null ? <ConfirmationStrip tone={copied ? "success" : "error"} text={copied ? t("Code copied") : t("Couldn't copy the code. Copy it by hand.")} style={{ marginTop: 16 }} /> : null}
        {isNew ? <ConfirmationStrip tone="teal" text={t("Saved to My Rewards")} action={t("View")} onAction={() => navigate("/app/marketplace/rewards/mine")} style={{ marginTop: 16 }} /> : null}
      </>
    );

  return (
    <div style={{ paddingBottom: 34, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {header}
      <h1 style={{ margin: "6px 0 0", fontSize: textPx(22), lineHeight: linePx(28), fontWeight: 800 }}>{v.offerHeadline}</h1>
      <div style={{ fontSize: textPx(13), fontWeight: 600, color: m.accent }}>{v.ownerSubtitle}</div>

      <VoucherCard code={v.code} qr={v.qrPayload} validUntil={v.expiresAt} status={status} usedAt={v.usedAt} onCopied={onCopied} style={{ marginTop: 16 }} />

      {status === "issued" ? (
        <>
          <CapsLabel style={{ marginTop: 18 }}>{t("How to use")}</CapsLabel>
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
        <ConfirmationStrip tone={copied ? "success" : "error"} text={copied ? t("Code copied") : t("Couldn't copy the code. Copy it by hand.")} style={{ marginTop: 16 }} />
      ) : null}

      {isNew ? <ConfirmationStrip tone="teal" text={t("Saved to My Rewards")} action={t("View")} onAction={() => navigate("/app/marketplace/rewards/mine")} style={{ marginTop: 16 }} /> : null}
    </div>
  );
}
