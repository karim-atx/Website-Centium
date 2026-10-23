import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { statusChip, type OfferStatus } from "./marketColor";
import { PointsFigure } from "./PointsFigure";
import { formatPoints, offerProgress } from "./pointsModel";
import { FOCUS_CSS, usePress } from "./usePress";

// Market + Share 3.0 · OfferCard (HANDOVER §4 C-MO.4 "Rewards", B-MA.3, §5).
//
// client (C-MO.4.4, Client Explore Screens lines 383–392 and `offers`; the
// B-MA.3 / P-MA.3 preview, Business Marketplace line 224): relative, overflow
// hidden, radius 18, --card, border 0.5px --hair, padding 12 14 14 12, a row
// (gap 12): the owner tile 44 × 44 radius 12 --pale with the initials
// 13 / 800 --accent (or the owner's logo); the owner line 12 / 600 --accent
// ("Outline Activewear", "Rana Khoury · Trainer"), the headline 14 / 20 700
// (margin-top 1); on the right (align-self flex-end, right-aligned, no
// shrink, padding-top 16) the cost 17 / 700 tabular + leaf and the note
// 11 / 15: "You can redeem" --tealink 700 or "N to go" --faint 500; the
// bottom 2px line: a --div track, over it --teal at 100% or --segactive
// (#A79AD5) at round(balance / cost × 100)%.
//
// manager (B-MA.3 Offers, Business Marketplace Screens lines 166–171; P-MA.3):
// radius 20, --card, border 1px --border, padding 14 16; the headline
// 14 / 20 800 with the status chip 10.5 / 800 radius 999 padding 2 8 nowrap
// (Active --goodbg / --good, Scheduled --pale / --pdark, Paused --cautionbg
// / --caution, Expired --soft / --faint); then (margin-top 4, space-between,
// 11.5 --faint) the meta ("Ends Dec 31, 2026 · 30 redeemed") and the cost
// 14 / 700 --ink + the 10-tall leaf.

export type { OfferStatus };

const STATUS_LABEL: Record<OfferStatus, string> = { active: "Active", scheduled: "Scheduled", paused: "Paused", expired: "Expired" };

interface Common {
  headline: string;
  /** The offer's points cost. */
  cost: number;
  onPress?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface ClientOfferCardProps extends Common {
  variant: "client";
  /** The owner line: the business name, or "Name · Trainer" for a professional. */
  owner: string;
  /** The owner tile's initials ("OA"). */
  ownerInitials: string;
  ownerLogoUrl?: string | null;
  /**
   * W3 (optional): the owner tile as the professional board draws it (P-MA.3
   * Preview, Professional Marketplace line 305): radius 999 on #EEEAF8
   * (--pale in dark). Unset keeps the business tile (radius 12, --pale).
   */
  ownerRound?: boolean;
  /** The client's points balance. */
  balance: number;
}

export interface ManagerOfferCardProps extends Common {
  variant: "manager";
  status: OfferStatus;
  /** "Ends Dec 31, 2026 · 30 redeemed", built by the screen. */
  meta: string;
  /**
   * W3 (optional): a control after the status chip (the Offers Manager's row
   * menu). With it the card is a plain box and `onPress` moves to a stretched
   * button under the content (no button inside a button); the control sits
   * above it.
   */
  trailing?: React.ReactNode;
  /** The stretched button's accessible name (with `trailing`). */
  pressLabel?: string;
}

export type OfferCardProps = ClientOfferCardProps | ManagerOfferCardProps;

export const OfferCard: React.FC<OfferCardProps> = (props) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
  const pressable = !!props.onPress;
  const Tag = (pressable ? "button" : "div") as "button";
  const tagProps = pressable ? { type: "button" as const, onClick: props.onPress, ...press.handlers } : {};
  const reset: React.CSSProperties = pressable ? { font: "inherit", lineHeight: "normal", textAlign: "left", cursor: "pointer", width: "100%", ...press.style } : {};

  if (props.variant === "manager") {
    const [chipBg, chipInk] = statusChip(props.status, m);
    if (props.trailing) {
      // The stretched-button layout: the box carries the press scale, the
      // button (inset 0) takes taps and focus, the trailing control floats above.
      return (
        <>
          {pressable ? <style>{FOCUS_CSS}</style> : null}
          <div className={props.className} style={{ position: "relative", display: "block", lineHeight: "normal", borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "14px 16px", color: m.ink, ...(pressable ? press.style : null), ...props.style }}>
            {pressable ? (
              <button
                type="button"
                onClick={props.onPress}
                {...press.handlers}
                aria-label={props.pressLabel ?? `${props.headline}, ${STATUS_LABEL[props.status]}. ${props.meta}`}
                className="market-focus"
                style={{ position: "absolute", inset: 0, borderRadius: 20, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
              />
            ) : null}
            <span style={{ display: "flex", alignItems: "flex-start", gap: 10, pointerEvents: "none" }}>
              <span aria-hidden={pressable || undefined} style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 800, lineHeight: linePx(20) }}>{props.headline}</span>
              <span aria-hidden={pressable || undefined} style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: chipBg, color: chipInk, whiteSpace: "nowrap" }}>{STATUS_LABEL[props.status]}</span>
              <span style={{ position: "relative", pointerEvents: "auto", flexShrink: 0 }}>{props.trailing}</span>
            </span>
            <span aria-hidden={pressable || undefined} style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 10, fontSize: textPx(11.5), color: m.faint, pointerEvents: "none" }}>
              <span style={{ minWidth: 0 }}>{props.meta}</span>
              <PointsFigure value={props.cost} mark="leaf" size={14} />
            </span>
          </div>
        </>
      );
    }
    return (
      <>
        {pressable ? <style>{FOCUS_CSS}</style> : null}
        <Tag {...tagProps} className={`${pressable ? "market-focus " : ""}${props.className ?? ""}`} style={{ display: "block", lineHeight: "normal", borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "14px 16px", color: m.ink, ...reset, ...props.style }}>
          <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 800, lineHeight: linePx(20) }}>{props.headline}</span>
            <span style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: chipBg, color: chipInk, whiteSpace: "nowrap" }}>{STATUS_LABEL[props.status]}</span>
          </span>
          <span style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 10, fontSize: textPx(11.5), color: m.faint }}>
            <span style={{ minWidth: 0 }}>{props.meta}</span>
            <PointsFigure value={props.cost} mark="leaf" size={14} />
          </span>
        </Tag>
      </>
    );
  }

  const p = props;
  const prog = offerProgress(p.balance, p.cost);
  return (
    <>
      {pressable ? <style>{FOCUS_CSS}</style> : null}
      <Tag
        {...tagProps}
        aria-label={pressable ? `${p.owner}. ${p.headline}. ${formatPoints(p.cost)} points. ${prog.note}` : undefined}
        className={`${pressable ? "market-focus " : ""}${p.className ?? ""}`}
        style={{ position: "relative", lineHeight: "normal", overflow: "hidden", borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, padding: "12px 14px 14px 12px", display: "flex", gap: 12, color: m.ink, ...reset, ...p.style }}
      >
        {p.ownerLogoUrl ? (
          <img src={p.ownerLogoUrl} alt="" style={{ width: 44, height: 44, borderRadius: p.ownerRound ? 999 : 12, objectFit: "cover", flexShrink: 0, display: "block" }} />
        ) : (
          <span aria-hidden style={{ width: 44, height: 44, borderRadius: p.ownerRound ? 999 : 12, background: p.ownerRound && !dark ? "#EEEAF8" : m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(13), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
            {p.ownerInitials}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{p.owner}</span>
          <span style={{ display: "block", fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 700, marginTop: 1 }}>{p.headline}</span>
        </span>
        <span style={{ alignSelf: "flex-end", textAlign: "right", flexShrink: 0, paddingTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <PointsFigure value={p.cost} mark="leaf" size={17} />
          <span style={{ display: "block", fontSize: textPx(11), lineHeight: linePx(15), color: prog.can ? m.tealink : m.faint, fontWeight: prog.can ? 700 : 500 }}>{prog.note}</span>
        </span>
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: m.div }} />
        <span aria-hidden style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: `${prog.pct}%`, background: prog.can ? m.teal : m.segactive }} />
      </Tag>
    </>
  );
};
