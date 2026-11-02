import { Award } from "lucide-react";
import { initialsOf } from "../../components/business-more/kind";
import { FOCUS_CSS } from "../../components/market/usePress";
import { BuyInApp } from "../../components/premium/BuyInApp";
import { priceLabel } from "../../services/business-market";
import type { MarketPalette } from "../../theme/marketTokens";
import { useMarket } from "./MarketContext";
import { lh, MasterSheet, PrimaryButton, px, SoonNote, useMarketColors } from "./listingParts";
import { dayMonth, isoOf } from "./model";
import { OWNER_ONLY } from "./promoModel";
import { t } from "../../i18n/core";

// Market + Share 3.0 · W3 (D-13): Featured placements KEPT in the handover
// chrome (MasterBottomSheet as MasterSheet, the PrimaryButton CTA).
//
// MA1-112 / 134 (Feature for a week) and OURS-MA1-feature-results. Store gets
// featuring too ("Top of Shops near you"). G fixes 4 (Karim, 2026-11-02):
// nothing paid to Centium is bought on the web, so Feature for a week shows
// what featuring does and the "Buy in the Centium app" block (the same one as
// Premium and the plan levels). The web never requests or re-dates a featured
// week (request_featured_week / retry_featured_week, which opened a Centium
// charge) and never asks for cash or a bank transfer. The price shows only
// when feature_price_for already answered it (MarketContext), never a
// constant (V6-45).

const lead = (m: MarketPalette): React.CSSProperties => ({ fontSize: px(13), lineHeight: lh(19), fontWeight: 500, color: m.ink2, marginBottom: 14 });

export function FeatureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mk = useMarket();
  const { v, business, isOwner } = mk;
  const m = useMarketColors();
  const label = mk.featurePrice ? priceLabel(mk.featurePrice) : null;

  return (
    <MasterSheet open={open} onClose={onClose} title={t("Feature for a week")} footer={<PrimaryButton onClick={onClose}>{t("Done")}</PrimaryButton>}>
      <style>{FOCUS_CSS}</style>
      <p style={lead(m)}>{t("Shown first in your area on Explore for 7 days.")}</p>
      <p style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, margin: "0 0 8px" }}>{t("Where it appears")}</p>
      <div style={{ borderRadius: 16, background: m.soft, padding: 10 }} aria-hidden>
        <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, margin: "0 2px 8px" }}>{v.areaLabel}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: m.card, border: `1.5px solid ${m.segactive}`, borderRadius: 14, padding: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: px(12), flexShrink: 0 }}>{initialsOf(business?.name ?? "")}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: px(13), fontWeight: 800, color: m.ink }}>{business?.name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(10.5), fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: m.pale, color: m.pdark }}>
            <Award size={11} strokeWidth={2.4} aria-hidden />
            {t("Featured")}
          </span>
        </div>
        <div style={{ height: 34, borderRadius: 12, background: m.card, opacity: 0.6, marginTop: 6 }} />
      </div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
          <span style={{ fontSize: px(13), fontWeight: 600, color: m.ink2 }}>{t("7 days")}</span>
          <span style={{ fontSize: px(20), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink }}>{label}</span>
        </div>
      )}
      <p style={{ ...lead(m), marginTop: 14, marginBottom: 10 }}>{t("Buy a featured week in the Centium app. Your week starts once your purchase is confirmed.")}</p>
      <BuyInApp product="featured_week" line={null} />
      {!isOwner && business && <SoonNote>{t(OWNER_ONLY)}</SoonNote>}
    </MasterSheet>
  );
}

/** OURS-MA1-feature-results: B13 has no per-week reader, so only the honest line before / after the start. */
export function ResultsSheet({ open, onClose, item, from, to }: { open: boolean; onClose: () => void; item: string; from: string; to: string }) {
  const m = useMarketColors();
  const started = from <= isoOf(new Date());
  return (
    <MasterSheet open={open} onClose={onClose} title="Featured results">
      <p style={lead(m)}>{`${item} · ${dayMonth(from)} to ${dayMonth(to)}`}</p>
      <p style={{ fontSize: px(12.5), color: m.ink2, lineHeight: lh(18), textAlign: "center", padding: "16px 0" }}>{started ? "Results for a featured week aren't available yet." : "Results show once your featured week starts."}</p>
    </MasterSheet>
  );
}
