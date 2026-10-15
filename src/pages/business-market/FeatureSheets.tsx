import { useEffect, useState, type ReactNode } from "react";
import { Award, Calendar, ChevronDown, Info } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { useOnline } from "../../hooks/useOnline";
import { fetchFeaturePrice, priceLabel, type FeaturePrice } from "../../services/business-market";
import { requestFeaturedWeek, retryFeaturedWeek } from "../../services/business-market/featured";
import { placementTarget } from "../../services/business-market/promoLogic";
import { useMarket } from "./MarketContext";
import { lh, MFieldLabel, MLead, MPrimary, MSaveError, MSheet, MSoonChip, MSoonNote, px } from "./kit";
import { RangeCalendar } from "./RangeCalendar";
import { addDays, dayMonth, isoOf } from "./model";
import { lastFeatureStart, OWNER_ONLY, type Promotable } from "./promoModel";

// MA1-112 / 134 (Feature for a week), OURS-MA1-feature-payment-cash (replaces
// MA1-114 / 136: cash or bank transfer marked paid by Centium by hand, Whish
// "Coming soon", no card row, BR-04) and OURS-MA1-feature-results. Store gets
// featuring too ("Top of Shops near you").
//
// B13 MK-06 (live): the price is feature_price_for(area, start day), never a
// constant (V6-45). "Request featuring" calls request_featured_week (OWNER
// ONLY), which opens a pending Centium charge: the business pays Centium for
// the week, and it shows in Subscriptions and billing. A week that was not
// paid gets new dates through retry_featured_week (the same charge reopened).
// When the probe answers that featured_placements or feature_prices is absent,
// the button stays disabled with "Featuring is coming soon."

/** A placement whose start day passed without a payment (Pick new dates). */
export interface FeatureRetry {
  placementId: string;
  itemId: string;
}

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
  const m = useMarket();
  const { c, v, business } = m;
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
      <MSheet
        open={open}
        onClose={onClose}
        title="Feature for a week"
        footer={
          <MPrimary c={c} disabled={!item} onClick={() => item && onContinue(item, from, price)}>
            {label ? `Continue to payment · ${label}` : "Continue to payment"}
          </MPrimary>
        }
      >
        <MLead c={c}>{cal ? "Pick a start day. Your 7 days run from it." : "Shown first in your area on Explore for 7 days."}</MLead>
        <button
          ref={setAnchor}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menu}
          aria-disabled={!!retry}
          onClick={() => !retry && setMenu(true)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, border: `1px solid ${menu ? c.primary : c.border}`, width: "100%", background: "transparent", textAlign: "left", color: c.ink }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Award size={19} strokeWidth={2} aria-hidden />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: px(14), fontWeight: 800 }}>{item?.title ?? "Choose what to feature"}</span>
            {item && <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{item.sub}</span>}
          </span>
          {!retry && <ChevronDown size={16} strokeWidth={2.2} color={c.faint} aria-hidden />}
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
          <div>
            <MFieldLabel c={c} id="ft-from">Starts</MFieldLabel>
            <button
              type="button"
              aria-labelledby="ft-from"
              onClick={() => setCal(true)}
              style={{ height: 46, width: "100%", borderRadius: 14, background: c.soft, border: `1.5px solid ${cal ? c.primary : c.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", boxSizing: "border-box", fontSize: px(13.5), fontWeight: 700, color: c.ink, textAlign: "left" }}
            >
              <span style={{ flex: 1 }}>{dayMonth(from)}</span>
              <Calendar size={16} strokeWidth={2.2} color={c.faint} aria-hidden />
            </button>
          </div>
          <div>
            <MFieldLabel c={c} id="ft-to">Ends</MFieldLabel>
            <span aria-labelledby="ft-to" aria-readonly="true" role="textbox" style={{ height: 46, borderRadius: 14, background: c.track, display: "flex", alignItems: "center", padding: "0 12px", fontSize: px(13.5), fontWeight: 700, color: c.faint }}>
              {dayMonth(to)}
            </span>
          </div>
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
        <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "14px 0 6px" }}>Where it appears</p>
        <div style={{ borderRadius: 16, background: c.soft, padding: 10 }} aria-hidden>
          <p style={{ fontSize: px(11), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: c.faint, margin: "0 2px 8px" }}>{v.areaLabel}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: c.card, border: `1.5px solid ${c.primary}`, borderRadius: 14, padding: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: px(12), flexShrink: 0 }}>{initialsOf(business?.name ?? "")}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: c.ink }}>{item?.title ?? business?.name}</span>
              <span style={{ display: "block", fontSize: px(11), color: c.faint }}>{business?.name}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(10), fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: c.pale, color: c.pDark }}>
              <Award size={11} strokeWidth={2.4} aria-hidden />
              Featured
            </span>
          </div>
          <div style={{ height: 34, borderRadius: 12, background: c.card, opacity: 0.6, marginTop: 6 }} />
        </div>
        {label && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span style={{ fontSize: px(13), fontWeight: 700, color: c.inkSoft }}>7 days</span>
            <span style={{ fontSize: px(20), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>{label}</span>
          </div>
        )}
      </MSheet>
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
  const m = useMarket();
  const area = m.v.featureArea;
  const live = m.backend.featurePrices === "live";
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
  return got?.key === key ? got.price : on === isoOf(new Date()) ? m.featurePrice : null;
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
  const m = useMarket();
  const { c, backend, business, isOwner } = m;
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
    const r = retry ? await retryFeaturedWeek(retry.placementId, from) : await requestFeaturedWeek(business.id, placementTarget(item.kind, item.id, business.id), m.v.featureArea, from);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onRequested("Request sent. We'll confirm your payment in Messages.");
  };
  const note = pending ? "Featuring is coming soon." : !isOwner ? OWNER_ONLY : !price ? "Featuring isn't on sale for that week." : null;
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="Pay for featuring"
      footer={
        <>
          <MPrimary c={c} disabled={!can} onClick={() => void request()}>
            Request featuring
          </MPrimary>
          {note && <MSoonNote c={c}>{note}</MSoonNote>}
          {error && <MSaveError c={c}>{error}</MSaveError>}
        </>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${c.divider}`, fontSize: px(13) }}>
        <span style={{ color: c.inkSoft }}>{`${item?.title ?? ""}, 7 days`}</span>
        {label && <span style={{ fontWeight: 800, color: c.ink }}>{label}</span>}
      </div>
      <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 6 }}>{`${dayMonth(from)} to ${dayMonth(addDays(from, 6))}`}</p>
      <p id="pay-with" style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "14px 0 8px" }}>Pay with</p>
      <div role="radiogroup" aria-labelledby="pay-with">
        <Method c={c} on title="Cash or bank transfer" sub="Centium confirms it, usually within a day" />
        <Method c={c} on={false} disabled title="Whish" sub="Coming soon" chip={<MSoonChip c={c} />} mt={8} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, borderRadius: 12, background: c.soft, padding: "10px 12px", color: c.inkSoft }}>
        <Info size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: px(12), lineHeight: lh(17) }}>We'll send payment details in Messages. Your week starts once the payment is confirmed.</p>
      </div>
    </MSheet>
  );
}

function Method({ c, on, disabled, title, sub, chip, mt = 0 }: { c: ReturnType<typeof useMarket>["c"]; on: boolean; disabled?: boolean; title: string; sub: string; chip?: ReactNode; mt?: number }) {
  return (
    <div
      role="radio"
      aria-checked={on}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "0 14px", borderRadius: 14, border: `1.5px solid ${on ? c.primary : c.border}`, marginTop: mt, opacity: disabled ? 0.4 : 1, boxSizing: "border-box" }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${on ? c.primary : c.tert}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", flexShrink: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: on ? c.primary : "transparent" }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(14), fontWeight: 700, color: c.ink }}>{title}</span>
        <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{sub}</span>
      </span>
      {chip}
    </div>
  );
}

/** OURS-MA1-feature-results: B13 has no per-week reader, so only the honest line before / after the start. */
export function ResultsSheet({ open, onClose, item, from, to }: { open: boolean; onClose: () => void; item: string; from: string; to: string }) {
  const { c } = useMarket();
  const started = from <= isoOf(new Date());
  return (
    <MSheet open={open} onClose={onClose} title="Featured results">
      <MLead c={c}>{`${item} · ${dayMonth(from)} to ${dayMonth(to)}`}</MLead>
      <p style={{ fontSize: px(12.5), color: c.inkSoft, lineHeight: lh(18), textAlign: "center", padding: "16px 0" }}>{started ? "Results for a featured week aren't available yet." : "Results show once your featured week starts."}</p>
    </MSheet>
  );
}
