import React from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import { t } from "../../i18n/core";
import { WEB_FAINT, WEB_HAIR, WEB_INK, WEB_INK2, WEB_SOFT, webMargin } from "./venueWebTokens";

/**
 * Addendum A (WC-EX Gym Web, Class Web, Rewards Web): the shared parts of the
 * Explore detail pages on web. Literal values from the reference files:
 * the 64 header (padding 0 32, 24 on the rail; the 36 back at -8; the H1
 * 24/32 600 -0.6px), the body grid (max 1600, padding 24 32 / 24 24, gap
 * 24, left 8 fr | right 4 fr, 5 | 3 on the rail), the caps labels (12/16
 * 700 0.08em #8C8378), the 40 soft action buttons and the 40 header CTA.
 */


export function VenueWebHeader({
  rail,
  title,
  onBack,
  kicker,
  after,
  actions,
}: {
  rail: boolean;
  title: string;
  onBack: () => void;
  /** The caps word before the title (CLASS). */
  kicker?: string;
  /** Beside the title: the Member tag, the venue link. */
  after?: React.ReactNode;
  /** At the end: the page CTA or the wait note. */
  actions?: React.ReactNode;
}) {
  return (
    <header
      data-venue-web-header=""
      className="bg-cream"
      style={{ height: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: `0 ${webMargin(rail)}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={t("Back")}
        title={t("Back")}
        className="shrink-0 hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999, border: 0, background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <ChevronLeft size={20} strokeWidth={2} aria-hidden style={{ color: WEB_INK2 }} />
      </button>
      {kicker && <span style={{ flexShrink: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: WEB_FAINT }}>{kicker}</span>}
      <h1 className="truncate" style={{ margin: 0, minWidth: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: WEB_INK }}>
        {title}
      </h1>
      {after}
      <span style={{ flex: 1 }} />
      {actions}
    </header>
  );
}

/** The two-column body: left 8 | right 4 (5 | 3 on the rail), 24 apart. */
export function VenueWebBody({ rail, left, right, cols }: { rail: boolean; left: React.ReactNode; right: React.ReactNode; cols?: [number, number] }) {
  const [l, r] = cols ?? (rail ? [5, 3] : [8, 4]);
  return (
    <div
      data-venue-web-body=""
      style={{ maxWidth: WEB_CONTENT_MAX, margin: "0 auto", padding: `24px ${webMargin(rail)}px`, boxSizing: "border-box", display: "grid", gridTemplateColumns: `minmax(0,${l}fr) minmax(0,${r}fr)`, gap: 24, alignItems: "start" }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>{left}</div>
      <aside style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>{right}</aside>
    </div>
  );
}

export function WebCaps({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <h2 id={id} style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: WEB_FAINT, ...style }}>
      {children}
    </h2>
  );
}

/** A caps label with its text (gap 6): 15/24 #5B5349, up to 72ch. */
export function WebTextSection({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <WebCaps>{label}</WebCaps>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: WEB_INK2, maxWidth: "72ch" }}>
        {children}
      </p>
    </section>
  );
}

/** Directions · Call · Message: 40 tall, padding 0 16, r12 #F5F5F6 (hover #EEEDF0), 15/24 600, the 18 icon #7D6BB5. */
export function WebSoftButton({
  label,
  Icon,
  menu,
  onClick,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean; style?: React.CSSProperties }>;
  menu?: boolean;
  onClick: ((e: React.MouseEvent<HTMLButtonElement>) => void) | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      aria-haspopup={menu ? "menu" : undefined}
      className="hover:bg-[#EEEDF0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ height: 40, boxSizing: "border-box", padding: "0 16px", borderRadius: 12, border: 0, background: WEB_SOFT, color: WEB_INK, display: "inline-flex", alignItems: "center", gap: 8, font: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", opacity: onClick ? 1 : 0.4, cursor: onClick ? "pointer" : "default" }}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden style={{ color: "#7D6BB5", flexShrink: 0 }} />
      {label}
    </button>
  );
}

/** The header CTA: 40 tall, padding 0 16, r12 #9A8CD6, white 15/24 600, the 18 icon. */
export function WebHeaderCta({ label, icon, onClick, disabled }: { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
      style={{ height: 40, padding: "0 16px", borderRadius: 12, border: 0, background: "#9A8CD6", color: "#241F1B", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", font: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 600, opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {icon}
      {label}
    </button>
  );
}

/** The page CTA a mobile page pins (PinnedCta's `primary`), as the header button; its icon drawn at 18. */
export function WebPinnedCta({ primary }: { primary: { label: string; onClick: () => void; icon?: React.ReactNode; disabled?: boolean } }) {
  return <WebHeaderCta label={primary.label} icon={primary.icon ? <span className="flex [&>svg]:h-[18px] [&>svg]:w-[18px]">{primary.icon}</span> : undefined} onClick={primary.onClick} disabled={primary.disabled} />;
}

/** A full-width primary button in a panel: 44 tall r12 #AEA1DC, white 15/24 700. */
export function WebPanelCta({ label, onClick, disabled, busy }: { label: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D67D9]"
      style={{ width: "100%", height: 44, borderRadius: 12, border: 0, background: "#AEA1DC", color: "#241F1B", font: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 700, opacity: disabled ? 0.5 : 1, cursor: disabled || busy ? "default" : "pointer" }}
    >
      {label}
    </button>
  );
}

/** The thin full-width segmented tabs (Segmented Tabs v8: 40, padding 4, gap 4, r14; tabs 32 r10, 15). */
export function WebTabs<K extends string>({ tabs, active, onChange }: { tabs: { key: K; label: string }[]; active: K; onChange: (k: K) => void }) {
  return (
    <SegmentedTabs
      items={tabs}
      activeKey={active}
      onChange={(k) => onChange(k as K)}
      labelSize={15}
      tabHeight={32}
      trackStyle={{ height: 40, boxSizing: "border-box", padding: 4, gap: 4, borderRadius: 14 }}
      tabRadius={10}
    />
  );
}

/** The drawn map card (r18, 0.5px hair): the grid drawing with the 24 pin, then the address 15/22 700 and its lines 13/20. */
export function WebMapCard({ height, address, children, onOpen, label }: { height: number; address: string | null; children?: React.ReactNode; onOpen?: (el: HTMLElement) => void; label?: string }) {
  const drawing = (
    <div style={{ position: "relative", height, background: "#EEF1EC" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,rgba(36,31,27,0.05) 0 1px,transparent 1px 32px),repeating-linear-gradient(0deg,rgba(36,31,27,0.05) 0 1px,transparent 1px 32px)" }} />
      <span aria-hidden style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-60%)", display: "flex" }}>
        <MapPin size={24} strokeWidth={2} style={{ color: "#7D67D9" }} />
      </span>
    </div>
  );
  return (
    <div style={{ borderRadius: 18, border: `0.5px solid ${WEB_HAIR}`, overflow: "hidden", background: "#FFFFFF" }}>
      {onOpen ? (
        <button type="button" aria-haspopup="menu" aria-label={label} onClick={(e) => onOpen(e.currentTarget)} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", cursor: "pointer" }}>
          {drawing}
        </button>
      ) : (
        drawing
      )}
      <div style={{ padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {address && <div style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, color: WEB_INK }}>{address}</div>}
        {children}
      </div>
    </div>
  );
}

/** "Classes at this gym": 48 tall r14 #F5F5F6, 15/24 700, the 16 chevron #8C8378. */
export function WebWideRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-[#EEEDF0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ height: 48, width: "100%", boxSizing: "border-box", borderRadius: 14, border: 0, background: WEB_SOFT, color: WEB_INK, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", font: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 700, textAlign: "start", cursor: "pointer" }}
    >
      {label}
      <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ color: WEB_FAINT, flexShrink: 0 }} />
    </button>
  );
}

/** The Member / Open now pill: 11/16 700, padding 3 10, #E4F0EE / #2F5F58. */
export function WebPill({ label, tone = "teal" }: { label: string; tone?: "teal" | "amber" | "neutral" }) {
  const c = tone === "teal" ? { bg: "#E4F0EE", ink: "#2F5F58" } : tone === "amber" ? { bg: "#FBF0DC", ink: "#8A5A12" } : { bg: WEB_SOFT, ink: WEB_INK2 };
  return <span style={{ flexShrink: 0, fontSize: 11, lineHeight: "16px", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.ink, whiteSpace: "nowrap" }}>{label}</span>;
}
