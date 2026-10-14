import type { ReactNode } from "react";
import { AlertCircle, CalendarPlus, ChevronRight, HeartPulse, Lightbulb, Package, ScanLine, type LucideIcon } from "lucide-react";
import type { DashPalette } from "./palette";
import type { NumberBox } from "./dashboardModel";
import { linePx, textPx } from "../../theme/textSize";

// Small Dashboard pieces, literal from BizSummaryV27 (DashLabel) and
// BizTypeKit (KitLabel, NumberBoxes, KitBars, KitList, KitEmpty, KitTip).

/**
 * The dashboard's own label row (DA1-015 #8 / #21): 10.5/600 uppercase 0.1em,
 * no rule, with a right-hand link 11/700 + chevron 13. Not SectionLabel.
 */
export function DashLabel({ c, label, link, onLink, mb }: { c: DashPalette; label: string; link?: string; onLink?: () => void; mb: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: mb }}>
      <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.faint, whiteSpace: "nowrap", lineHeight: 1.5, margin: 0 }}>{label}</p>
      {link && (
        <button
          type="button"
          onClick={onLink}
          className="tap"
          style={{ display: "flex", alignItems: "center", gap: 2, fontSize: textPx(11), fontWeight: 700, color: c.pDark, background: "none", border: 0, padding: 0, minHeight: 0, lineHeight: 1.5 }}
        >
          {link}
          <ChevronRight size={13} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** BizTypeKit section label (DA1-003 #4): 11/600 0.14em, 7.5 under, 1.5 rule, margin 6 2 12. */
export function KitLabel({ c, label, action, onAction }: { c: DashPalette; label: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 7.5, borderBottom: `1.5px solid ${c.fill}`, margin: "6px 2px 12px" }}>
      <span style={{ fontSize: textPx(11), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: linePx(14), color: c.faint }}>{label}</span>
      {action && (
        <button type="button" onClick={onAction} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: c.pDark, background: "none", border: 0, padding: 0, lineHeight: 1.5 }}>
          {action}
        </button>
      )}
    </div>
  );
}

/** Number boxes (DA1-003 #5): r 16, pad 12 × 10, value 24/800, label 11/600, delta 10.5/700. */
export function NumberBoxes({ c, boxes, cols }: { c: DashPalette; boxes: NumberBox[]; cols?: number }) {
  const tone = (t?: NumberBox["tone"]) => (t === "bad" ? c.high : t === "warn" ? c.warn : c.good);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols ?? boxes.length},minmax(0,1fr))`, gap: 8, marginBottom: 14 }}>
      {boxes.map((b) => (
        <div
          key={b.label}
          data-number-box
          style={{
            borderRadius: 16,
            background: c.hc ? c.card : c.listBg,
            border: c.hc ? `1px solid ${c.dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.22)"}` : undefined,
            padding: "12px 10px",
            minWidth: 0,
          }}
        >
          <p style={{ fontSize: textPx(24), fontWeight: 800, lineHeight: linePx(28), color: c.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{b.value}</p>
          <p style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: linePx(14), color: c.faint, marginTop: 4, textWrap: "pretty", marginBottom: 0 }}>{b.label}</p>
          {b.delta && <p style={{ fontSize: textPx(10.5), fontWeight: 700, color: tone(b.tone), marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>{b.delta}</p>}
        </div>
      ))}
    </div>
  );
}

/** Bars card (DA1-003 #6): r 18, pad 14, bars 96 tall, gap 4. */
export function KitBars({ c, title, sub, bars, hi }: { c: DashPalette; title: string; sub: string; bars: { h: number; label: string }[]; hi: number }) {
  return (
    <div style={{ borderRadius: 18, background: c.listBg, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: textPx(13), fontWeight: 800, margin: 0, color: c.ink, lineHeight: 1.5 }}>{title}</p>
      <p style={{ fontSize: textPx(11.5), color: c.faint, marginBottom: 12, marginTop: 0, lineHeight: 1.5 }}>{sub}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96 }} role="img" aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.h}%`).join(", ")}`}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div data-bar style={{ width: "100%", height: `${Math.max(4, b.h)}%`, borderRadius: "6px 6px 3px 3px", background: i === hi ? c.fill : c.lav }} />
            <span style={{ fontSize: textPx(9), color: c.faint, height: linePx(11), lineHeight: linePx(11) }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface KitRow {
  key: string;
  Icon?: LucideIcon;
  title: string;
  detail: string;
  pill?: { text: string; tone: "good" | "warn" | "bad" | "soft" | "pale" };
  value?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}

/** List card (DA1-003 #8): r 18, pad 2 × 14, rows min 58, icon tile 36 r 11. */
export function KitList({ c, rows }: { c: DashPalette; rows: KitRow[] }) {
  const tones = { good: [c.goodBg, c.good], warn: [c.warnBg, c.warn], bad: [c.highBg, c.high], soft: [c.soft, c.faint], pale: [c.pale, c.pDark] } as const;
  return (
    <div style={{ background: c.listBg, borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
      {rows.map((r, k) => {
        const inner = (
          <>
            {k > 0 && <span style={{ position: "absolute", top: 0, left: r.Icon ? 48 : 0, right: 0, height: 1, background: c.listRule }} />}
            {r.Icon && (
              <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <r.Icon size={17} strokeWidth={1.75} aria-hidden />
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: textPx(13.5), fontWeight: 700, lineHeight: linePx(18), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink }}>{r.title}</span>
              <span style={{ display: "block", fontSize: textPx(11.5), lineHeight: linePx(16), color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.detail}</span>
            </span>
            {r.pill && (
              <span
                style={{
                  fontSize: textPx(10),
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: tones[r.pill.tone][0],
                  color: tones[r.pill.tone][1],
                  whiteSpace: "nowrap",
                  lineHeight: 1.5,
                }}
              >
                {r.pill.text}
              </span>
            )}
            {r.value && <span style={{ fontSize: textPx(13), fontWeight: 800, whiteSpace: "nowrap", color: c.ink }}>{r.value}</span>}
            {r.trailing}
          </>
        );
        const style = { position: "relative" as const, display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", boxSizing: "border-box" as const, width: "100%" };
        return r.onClick ? (
          <button key={r.key} type="button" onClick={r.onClick} style={{ ...style, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit" }}>
            {inner}
          </button>
        ) : (
          <div key={r.key} style={style}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_ICONS = { "calendar-plus": CalendarPlus, "scan-line": ScanLine, package: Package, "heart-pulse": HeartPulse } as const;

/** Empty card (DA1-006): r 20, 1.5 dashed fill, pad 24 × 18, tile 48 r 14, title 15/800, body 12.5/18. */
export function KitEmpty({ c, icon, title, body }: { c: DashPalette; icon: keyof typeof EMPTY_ICONS; title: string; body: string }) {
  const Icon = EMPTY_ICONS[icon];
  return (
    <div data-kit-empty style={{ borderRadius: 20, border: `${c.hc ? 2 : 1.5}px dashed ${c.fill}`, padding: "24px 18px", textAlign: "center", marginBottom: 14 }}>
      <span style={{ width: 48, height: 48, borderRadius: 14, background: c.pale, color: c.pDark, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <p style={{ fontSize: textPx(15), fontWeight: 800, marginTop: 10, marginBottom: 0, color: c.ink, lineHeight: 1.5 }}>{title}</p>
      <p style={{ fontSize: textPx(12.5), lineHeight: linePx(18), color: c.inkSoft, marginTop: 4, marginBottom: 0, textWrap: "pretty" }}>{body}</p>
    </div>
  );
}

/** Early-data tip (DA1-005 #3): r 16, pad 12 × 14, pale, lightbulb 15/2. */
export function KitTip({ c, text }: { c: DashPalette; text: string }) {
  return (
    <div data-kit-tip style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 16, background: c.pale, padding: "12px 14px", marginBottom: 14, color: c.pDark }}>
      <Lightbulb size={15} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
      <p style={{ fontSize: textPx(12.5), lineHeight: linePx(18), textWrap: "pretty", margin: 0 }}>{text}</p>
    </div>
  );
}

/** Inline error (OURS-DA-states #2): r 16, pad 12 × 14, highBg, alert-circle 15/2, Retry 44 tall. */
export function ErrorRow({ c, text, onRetry }: { c: DashPalette; text: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, background: c.highBg, padding: "0 14px 0 14px", marginBottom: 20, minHeight: 44 }}>
      <AlertCircle size={15} strokeWidth={2} color={c.high} style={{ flexShrink: 0 }} aria-hidden />
      <p style={{ flex: 1, fontSize: textPx(12.5), lineHeight: linePx(18), color: c.high, margin: "12px 0" }}>{text}</p>
      <button type="button" onClick={onRetry} style={{ fontSize: textPx(12), fontWeight: 700, color: c.pDark, background: "none", border: 0, minHeight: 44, padding: "0 4px" }}>
        Retry
      </button>
    </div>
  );
}
