import React from "react";
import { MarketEmptyCard, MarketError } from "../../../components/market/MarketStates";
import { hexAlpha, liftInk } from "../../../components/market/marketColor";
import { useIsDark } from "../../../hooks/useIsDark";
import { STATUS_STEPS, marketPalette } from "../../../theme/marketTokens";
import { HIRING_ERROR_TEXT } from "../../../services/hiring/model";
import { OutlineButton, lh, px, useMarketColors } from "../listingParts";
import { EXISTING_TEAM_LABEL } from "./teamModel";

// Market + Share 3.0 · W4-B · the small pieces Team, Hiring fees and Add your
// existing team share (Business Hiring Screens; literal values per element).
// The fixed step hues (#EEEAF8 / #7D67D9, #E6F1EF / #4F8F8A) follow the W3
// rule in dark: hexAlpha(ink, 0.16) under liftInk(ink).

/** The board's pale note (Team / Hiring fees): radius 16, --pale, padding 12 14, 12.5 / 18 / 700 --pdark. */
export function PaleNote({ children }: { children: React.ReactNode }) {
  const m = useMarketColors();
  return <p style={{ margin: 0, borderRadius: 16, background: m.pale, padding: "12px 14px", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: m.pdark }}>{children}</p>;
}

/** lucide users (Team empty). */
export const PEOPLE_ICON = (
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

/** lucide receipt (Hiring fees empty). */
export const RECEIPT_ICON = (
  <>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17.5v-11" />
  </>
);

/**
 * The drawn empty state (teamEmpty / feesEmpty), 12 under the note (the
 * board's empty list wrapper keeps its margin-top 12): a centred column, gap 10,
 * padding {top} 24 0; a 56 tile radius 18 #EEEAF8 with the 24 icon #7D67D9
 * (stroke 1.75); title 16 / 800; body 13 / 1.55 --faint, max 290; the
 * outlined button (margin-top 6) when there is one.
 */
export function HiringEmpty({ icon, title, body, action, top }: { icon: React.ReactNode; title: string; body: string; action?: { label: string; onPress: () => void }; top: number }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [bg, ink] = STATUS_STEPS.APPLIED;
  return (
    <div data-empty style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: `${top}px 24px 0`, lineHeight: "normal" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? hexAlpha(ink, 0.16) : bg, color: dark ? liftInk(ink) : ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <h2 style={{ margin: 0, fontSize: px(16), fontWeight: 800, color: m.ink }}>{title}</h2>
      <p style={{ margin: 0, fontSize: px(13), lineHeight: 1.55, color: m.faint, maxWidth: 290 }}>{body}</p>
      {action ? (
        <OutlineButton onClick={action.onPress} style={{ marginTop: 6 }}>
          {action.label}
        </OutlineButton>
      ) : null}
    </div>
  );
}

/** "Free · existing team" (B-MA.8.8 `p.added`): radius 999, padding 2 8, #E6F1EF / #2F5F58, 10.5 / 800, check 13 (2.6), gap 4. */
export function ExistingTeamChip() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [bg, hue] = STATUS_STEPS.HIRED;
  return (
    <div style={{ marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "2px 8px", background: dark ? hexAlpha(hue, 0.16) : bg, color: dark ? m.tealink : "#2F5F58", fontSize: px(10.5), fontWeight: 800, lineHeight: "normal" }}>
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {EXISTING_TEAM_LABEL}
    </div>
  );
}

/** A store (or no business): Hiring is for gyms and studios (`not_a_gym`). */
export function NotForThisBusiness({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (error) return <MarketError thing="your business" onRetry={onRetry} />;
  return <MarketEmptyCard title={HIRING_ERROR_TEXT.not_a_gym} />;
}

/** The sheet note (`fNote`): --pale radius 14 padding 12 14, gap 10; ticket 16 --pdark; 12.5 / 18 / 700 --pdark. */
export function SheetNote({ children }: { children: React.ReactNode }) {
  const m = useMarketColors();
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, background: m.pale, padding: "12px 14px" }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", marginTop: 1 }}>
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
      </svg>
      <span style={{ fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: m.pdark }}>{children}</span>
    </div>
  );
}

/**
 * The inline caution card (`isInline`, B-MA.8.7 codeMsg / staffBlocked):
 * --cautionbg radius 14 padding 12 14; title 13 / 18 / 700 --ink; hint 12 /
 * 17 --ink2 (margin-top 4); button (margin-top 10) 40 tall radius 12 --fill /
 * --onfill padding 0 16, 13 / 800.
 */
export function CautionCard({ title, hint, action, onAction, id }: { title: string; hint: string; action: string; onAction: () => void; id?: string }) {
  const m = useMarketColors();
  return (
    <div id={id} role="status" data-caution style={{ borderRadius: 14, background: m.cautionbg, padding: "12px 14px", textAlign: "left", lineHeight: "normal", fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif" }}>
      <p style={{ margin: 0, fontSize: px(13), lineHeight: lh(18), fontWeight: 700, color: m.ink }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: px(12), lineHeight: lh(17), color: m.ink2 }}>{hint}</p>
      <button
        type="button"
        onClick={onAction}
        className="market-focus"
        style={{ marginTop: 10, height: 40, borderRadius: 12, background: m.fill, color: m.onfill, display: "inline-flex", alignItems: "center", padding: "0 16px", fontSize: px(13), fontWeight: 800, border: 0, fontFamily: "inherit", cursor: "pointer", minWidth: 0 }}
      >
        {action}
      </button>
    </div>
  );
}

/** The dialog's rows box (`dlg.rows`): margin-top 14, --sgrey radius 14 padding 4 14; rows 8 0, 12.5, 0.5px --div from row 2; key --slabel, value 700 right. */
export function DialogRows({ rows }: { rows: [string, string][] }) {
  const m = useMarketColors();
  return (
    <div style={{ marginTop: 14, borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "left" }}>
      {rows.map(([k, v], i) => (
        <div key={`${k}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? `0.5px solid ${m.div}` : 0, fontSize: px(12.5), lineHeight: "normal" }}>
          <span style={{ color: m.slabel }}>{k}</span>
          <span style={{ fontWeight: 700, textAlign: "right", color: m.ink }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
