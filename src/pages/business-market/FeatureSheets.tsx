import { useState, type ReactNode } from "react";
import { Award, Calendar, ChevronDown, Info } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { priceLabel } from "../../services/business-market";
import { useMarket } from "./MarketContext";
import { lh, MFieldLabel, MLead, MPrimary, MSheet, MSoonChip, MSoonNote, px } from "./kit";
import { RangeCalendar } from "./RangeCalendar";
import { addDays, dayMonth, isoOf } from "./model";
import type { Promotable } from "./promoModel";

// MA1-112 / 134 (Feature for a week), OURS-MA1-feature-payment-cash (replaces
// MA1-114 / 136: cash or bank transfer marked paid by Centium by hand, Whish
// "Coming soon", no card row, BR-04) and OURS-MA1-feature-results. V6-45:
// the price comes only from the database (feature_prices, B13 MK-06): with no
// price the drawn copy shows without one. The request itself is B13
// (featured_placements + the Centium charge record, B8): until both are on
// the stack "Request featuring" is drawn disabled with "Coming soon". Store
// gets featuring too ("Top of Shops near you").

/** B13 MK-06 placement requests are wired (flip when the stage lands and HANDOVER_API.md names the write). */
const PLACEMENT_WRITES = false;

export function FeatureSheet({ open, onClose, items, initialItem, onContinue }: { open: boolean; onClose: () => void; items: Promotable[]; initialItem: string | null; onContinue: (item: Promotable, from: string) => void }) {
  const m = useMarket();
  const { c, v, business, featurePrice } = m;
  const today = isoOf(new Date());
  const [itemId, setItemId] = useState<string | null>(initialItem ?? items[0]?.id ?? null);
  const [from, setFrom] = useState(today);
  const [cal, setCal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const item = items.find((i) => i.id === itemId) ?? null;
  const to = addDays(from, 6);
  const price = featurePrice ? priceLabel(featurePrice) : null;

  return (
    <>
      <MSheet
        open={open}
        onClose={onClose}
        title="Feature for a week"
        footer={
          <MPrimary c={c} disabled={!item} onClick={() => item && onContinue(item, from)}>
            {price ? `Continue to payment · ${price}` : "Continue to payment"}
          </MPrimary>
        }
      >
        <MLead c={c}>{cal ? "Pick a start day. Your 7 days run from it." : "Shown first in your area on Explore for 7 days."}</MLead>
        <button
          ref={setAnchor}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menu}
          onClick={() => setMenu(true)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, border: `1px solid ${menu ? c.primary : c.border}`, width: "100%", background: "transparent", textAlign: "left", color: c.ink }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Award size={19} strokeWidth={2} aria-hidden />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: px(14), fontWeight: 800 }}>{item?.title ?? "Choose what to feature"}</span>
            {item && <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{item.sub}</span>}
          </span>
          <ChevronDown size={16} strokeWidth={2.2} color={c.faint} aria-hidden />
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
        {price && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span style={{ fontSize: px(13), fontWeight: 700, color: c.inkSoft }}>7 days</span>
            <span style={{ fontSize: px(20), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>{price}</span>
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

export function PaySheet({ open, onClose, item, from }: { open: boolean; onClose: () => void; item: Promotable | null; from: string }) {
  const m = useMarket();
  const { c, featurePrice, backend } = m;
  const price = featurePrice ? priceLabel(featurePrice, true) : null;
  const can = PLACEMENT_WRITES && backend.placements === "live" && !!price;
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="Pay for featuring"
      footer={
        <>
          <MPrimary c={c} disabled={!can}>
            Request featuring
          </MPrimary>
          {!can && <MSoonNote c={c}>Featuring is coming soon.</MSoonNote>}
        </>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${c.divider}`, fontSize: px(13) }}>
        <span style={{ color: c.inkSoft }}>{`${item?.title ?? ""}, 7 days`}</span>
        {price && <span style={{ fontWeight: 800, color: c.ink }}>{price}</span>}
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

export function ResultsSheet({ open, onClose, item, from, to }: { open: boolean; onClose: () => void; item: string; from: string; to: string }) {
  const { c } = useMarket();
  return (
    <MSheet open={open} onClose={onClose} title="Featured results">
      <MLead c={c}>{`${item} · ${dayMonth(from)} to ${dayMonth(to)}`}</MLead>
      <p style={{ fontSize: px(12.5), color: c.inkSoft, lineHeight: lh(18), textAlign: "center", padding: "16px 0" }}>Results show once your featured week starts.</p>
    </MSheet>
  );
}
