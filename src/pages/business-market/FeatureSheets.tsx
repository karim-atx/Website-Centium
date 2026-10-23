import { useEffect, useState, type ReactNode } from "react";
import { Award, Calendar, ChevronDown, Info } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useOnline } from "../../hooks/useOnline";
import { fetchFeaturePrice, priceLabel, type FeaturePrice } from "../../services/business-market";
import { requestFeaturedWeek, retryFeaturedWeek } from "../../services/business-market/featured";
import { placementTarget } from "../../services/business-market/promoLogic";
import type { MarketPalette } from "../../theme/marketTokens";
import { useMarket } from "./MarketContext";
import { fieldStyle, lh, MasterSheet, PrimaryButton, px, SaveError, SheetBox, SoonNote, useMarketColors } from "./listingParts";
import { RangeCalendar } from "./RangeCalendar";
import { addDays, dayMonth, isoOf } from "./model";
import { lastFeatureStart, OWNER_ONLY, type Promotable } from "./promoModel";

// Market + Share 3.0 · W3 (D-13): Featured placements KEPT and restyled in the
// handover chrome: MasterBottomSheet (MasterSheet), the grey SheetBox fields
// (--sgrey r14, 13 / 500 --slabel label, the --card r10 field), the
// PrimaryButton CTA (50, r16), the purchase sheet's payment rows (radio 20;
// selected border 1.5 #A79AD5) and "Coming soon" greyed (cash only, the
// pre-decision).
//
// MA1-112 / 134 (Feature for a week), OURS-MA1-feature-payment-cash (cash or
// bank transfer marked paid by Centium by hand, Whish "Coming soon", BR-04)
// and OURS-MA1-feature-results. Store gets featuring too ("Top of Shops near
// you"). B13 MK-06 (live): the price is feature_price_for(area, start day),
// never a constant (V6-45). "Request featuring" calls request_featured_week
// (OWNER ONLY), which opens a pending Centium charge; a week that was not paid
// gets new dates through retry_featured_week. When the probe answers that
// featured_placements or feature_prices is absent, the button stays disabled
// with "Featuring is coming soon."

/** A placement whose start day passed without a payment (Pick new dates). */
export interface FeatureRetry {
  placementId: string;
  itemId: string;
}

const lead = (m: MarketPalette): React.CSSProperties => ({ fontSize: px(13), lineHeight: lh(19), fontWeight: 500, color: m.ink2, marginBottom: 14 });

export function FeatureSheet({
  open,
  onClose,
  items,
  initialItem,
  initialFrom,
  retry,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  items: Promotable[];
  initialItem: string | null;
  initialFrom?: string;
  /** Pick new dates for an unpaid week: the item is fixed. */
  retry?: FeatureRetry | null;
  onContinue: (item: Promotable, from: string, price: FeaturePrice | null) => void;
}) {
  const mk = useMarket();
  const { v, business } = mk;
  const m = useMarketColors();
  const today = isoOf(new Date());
  const [itemId, setItemId] = useState<string | null>(retry?.itemId ?? initialItem ?? items[0]?.id ?? null);
  const [from, setFrom] = useState(initialFrom ?? today);
  const [cal, setCal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const item = items.find((i) => i.id === itemId) ?? null;
  const to = addDays(from, 6);
  const price = useFeaturePrice(from);
  const label = price ? priceLabel(price) : null;

  return (
    <>
      <MasterSheet
        open={open}
        onClose={onClose}
        title="Feature for a week"
        footer={
          <PrimaryButton disabled={!item} onClick={() => item && onContinue(item, from, price)}>
            {label ? `Continue to payment · ${label}` : "Continue to payment"}
          </PrimaryButton>
        }
      >
        <style>{FOCUS_CSS}</style>
        <p style={lead(m)}>{cal ? "Pick a start day. Your 7 days run from it." : "Shown first in your area on Explore for 7 days."}</p>
        <SheetBox label="Feature">
          <button
            ref={setAnchor}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menu}
            aria-disabled={!!retry}
            onClick={() => !retry && setMenu(true)}
            className="market-focus"
            style={{ ...fieldStyle(m), display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: retry ? "default" : "pointer" }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 10, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Award size={17} strokeWidth={2} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(14), fontWeight: 700, color: m.ink }}>{item?.title ?? "Choose what to feature"}</span>
              {item && <span style={{ display: "block", fontSize: px(11.5), color: m.faint }}>{item.sub}</span>}
            </span>
            {!retry && <ChevronDown size={16} strokeWidth={2.2} color={m.faint} aria-hidden />}
          </button>
        </SheetBox>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
          <SheetBox label="Starts">
            <button type="button" onClick={() => setCal(true)} className="market-focus" style={{ ...fieldStyle(m), display: "flex", alignItems: "center", gap: 8, textAlign: "left", cursor: "pointer", boxShadow: cal ? `inset 0 0 0 1.5px ${m.fill}` : undefined }}>
              <span style={{ flex: 1 }}>{dayMonth(from)}</span>
              <Calendar size={16} strokeWidth={2.2} color={m.faint} aria-hidden />
            </button>
          </SheetBox>
          <SheetBox label="Ends">
            <span aria-readonly="true" role="textbox" aria-label="Ends" style={{ ...fieldStyle(m), color: m.faint }}>
              {dayMonth(to)}
            </span>
          </SheetBox>
        </div>
        {cal && (
          <div style={{ marginTop: 12 }}>
            <RangeCalendar
              from={from}
              to={to}
              fixedDays={7}
              max={lastFeatureStart(today)}
              onCancel={() => setCal(false)}
              onDone={(a) => {
                setFrom(a);
                setCal(false);
              }}
            />
          </div>
        )}
        <p style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, margin: "16px 0 8px" }}>Where it appears</p>
        <div style={{ borderRadius: 16, background: m.soft, padding: 10 }} aria-hidden>
          <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, margin: "0 2px 8px" }}>{v.areaLabel}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: m.card, border: `1.5px solid ${m.segactive}`, borderRadius: 14, padding: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: px(12), flexShrink: 0 }}>{initialsOf(business?.name ?? "")}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: m.ink }}>{item?.title ?? business?.name}</span>
              <span style={{ display: "block", fontSize: px(11), color: m.faint }}>{business?.name}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(10.5), fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: m.pale, color: m.pdark }}>
              <Award size={11} strokeWidth={2.4} aria-hidden />
              Featured
            </span>
          </div>
          <div style={{ height: 34, borderRadius: 12, background: m.card, opacity: 0.6, marginTop: 6 }} />
        </div>
        {label && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span style={{ fontSize: px(13), fontWeight: 600, color: m.ink2 }}>7 days</span>
            <span style={{ fontSize: px(20), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink }}>{label}</span>
          </div>
        )}
      </MasterSheet>
      <PopupMenu
        open={menu}
        onClose={() => setMenu(false)}
        anchor={anchor}
        matchWidth={anchor}
        variant="field"
        heading="Promote"
        options={items.map((i) => ({ value: i.id, label: i.title, note: i.sub }))}
        selected={itemId}
        onSelect={(id) => {
          setItemId(id);
          setMenu(false);
        }}
      />
    </>
  );
}

/** feature_price_for(area, the start day): the price in force that day; null = not on sale (or the table is absent). */
function useFeaturePrice(on: string): FeaturePrice | null {
  const mk = useMarket();
  const area = mk.v.featureArea;
  const live = mk.backend.featurePrices === "live";
  const key = `${area}:${on}`;
  const [got, setGot] = useState<{ key: string; price: FeaturePrice | null } | null>(null);
  useEffect(() => {
    if (!live) return;
    let alive = true;
    void fetchFeaturePrice(area, on).then((p) => {
      if (alive) setGot({ key: `${area}:${on}`, price: p });
    });
    return () => {
      alive = false;
    };
  }, [area, on, live]);
  if (!live) return null;
  // Until that day's price answers, today's (MarketContext) only when the day is today.
  return got?.key === key ? got.price : on === isoOf(new Date()) ? mk.featurePrice : null;
}

export function PaySheet({
  open,
  onClose,
  item,
  from,
  price,
  retry,
  onRequested,
}: {
  open: boolean;
  onClose: () => void;
  item: Promotable | null;
  from: string;
  price: FeaturePrice | null;
  retry?: FeatureRetry | null;
  onRequested: (toast: string) => void;
}) {
  const mk = useMarket();
  const { backend, business, isOwner } = mk;
  const m = useMarketColors();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = price ? priceLabel(price, true) : null;
  const pending = backend.placements === "pending" || backend.featurePrices === "pending";
  const can = !pending && isOwner && !!price && !!item && !!business && online && !busy;
  const request = async () => {
    if (!business || !item) return;
    setBusy(true);
    setError(null);
    const r = retry ? await retryFeaturedWeek(retry.placementId, from) : await requestFeaturedWeek(business.id, placementTarget(item.kind, item.id, business.id), mk.v.featureArea, from);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onRequested("Request sent. We'll confirm your payment in Messages.");
  };
  const note = pending ? "Featuring is coming soon." : !isOwner ? OWNER_ONLY : !price ? "Featuring isn't on sale for that week." : null;
  return (
    <MasterSheet
      open={open}
      onClose={onClose}
      title="Pay for featuring"
      footer={
        <>
          <PrimaryButton disabled={!can} busy={busy} onClick={() => void request()}>
            Request featuring
          </PrimaryButton>
          {note && <SoonNote>{note}</SoonNote>}
          {error && <SaveError>{error}</SaveError>}
        </>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0 0 12px", borderBottom: `1px solid ${m.div}`, fontSize: px(13.5), color: m.ink }}>
        <span style={{ color: m.ink2 }}>{`${item?.title ?? ""}, 7 days`}</span>
        {label && <span style={{ fontWeight: 800 }}>{label}</span>}
      </div>
      <p style={{ fontSize: px(11.5), color: m.faint, marginTop: 6 }}>{`${dayMonth(from)} to ${dayMonth(addDays(from, 6))}`}</p>
      <p id="pay-with" style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, margin: "16px 0 8px" }}>
        Pay with
      </p>
      <div role="radiogroup" aria-labelledby="pay-with">
        <Method m={m} on title="Cash or bank transfer" sub="Centium confirms it, usually within a day" />
        <Method m={m} on={false} disabled title="Whish" sub="Coming soon" mt={8} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, borderRadius: 14, background: m.sgrey, padding: "12px 14px", color: m.ink2 }}>
        <Info size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: px(12), lineHeight: lh(17) }}>We'll send payment details in Messages. Your week starts once the payment is confirmed.</p>
      </div>
    </MasterSheet>
  );
}

/** The purchase sheet's payment row: radio 20, selected border 1.5 #A79AD5 (--segactive); a disabled row greyed at 0.4. */
function Method({ m, on, disabled, title, sub, chip, mt = 0 }: { m: MarketPalette; on: boolean; disabled?: boolean; title: string; sub: string; chip?: ReactNode; mt?: number }) {
  return (
    <div
      role="radio"
      aria-checked={on}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className="market-focus"
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "0 14px", borderRadius: 14, border: `1.5px solid ${on ? m.segactive : m.border}`, background: m.card, marginTop: mt, opacity: disabled ? 0.4 : 1, boxSizing: "border-box" }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${on ? m.segactive : m.tert}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", flexShrink: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: on ? m.segactive : "transparent" }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(14), fontWeight: 700, color: m.ink }}>{title}</span>
        <span style={{ display: "block", fontSize: px(11.5), color: m.faint }}>{sub}</span>
      </span>
      {chip}
    </div>
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
