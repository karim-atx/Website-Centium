import React from "react";
import { Package, Plus } from "lucide-react";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { CapsLabel } from "./listingParts";
import { itemsHeader } from "./showcaseModel";
import { t, tk } from "../../i18n/core";

// Website viewport v1 · WB-MA.2 Showcase (WB-MA Marketplace Web v2,
// `isShowcase` + showcaseVals()), for a gym or classes business inside the
// web Marketplace (ShowcaseManager hands over its list, editor and state;
// loading, reorder, saving and the strip stay its own). A 12-column grid,
// gap 24: the list column span 7 (the note banner, the caps items header
// with Add item, the rows card) and the docked "Edit item" span 5
// (ProductEditorSheet docked). The grid fills the window under the tabs
// (the board's flex 1: 100dvh less the 64 header, the 32 padding, the 40
// tabs, the 24 gap and the 32 bottom padding); the editor stays in view
// (sticky) while a long list scrolls the page. Empty: the banner over a
// dashed card across the grid (tile 64 r20, 22/30 title, 15/24 body, Add
// item; Add item docks the editor beside it). UNSPECIFIED: with the editor
// closed the list spans the grid.

const FILL = "max(560px, calc(100dvh - 192px))";
const BTN: React.CSSProperties = {
  height: 40,
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid rgba(36,31,27,0.11)",
  background: "transparent",
  color: "#7D6BB5",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
  flex: "none",
  fontFamily: "inherit",
};
const CSS = ".sc-web-btn:not(:disabled):hover{background:#F0EDF9}.sc-web-btn:disabled{opacity:.4;cursor:default}";

export function ShowcaseWeb({
  loading,
  failed,
  onRetry,
  offline,
  count,
  canAdd,
  onAdd,
  list,
  editor,
  strip,
}: {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  offline: React.ReactNode;
  count: number;
  canAdd: boolean;
  onAdd: () => void;
  list: React.ReactNode;
  editor: React.ReactNode;
  strip: React.ReactNode;
}) {
  const banner = (
    <div style={{ flex: "none", borderRadius: 16, background: "#F0EDF9", padding: "12px 16px", fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5" }}>
      {t("Showcase only. Members can't buy these in the app.")}
    </div>
  );
  const add = (pad: string) => (
    <button type="button" onClick={onAdd} disabled={!canAdd} className="sc-web-btn market-focus" style={{ ...BTN, padding: pad, cursor: "pointer" }}>
      <Plus size={20} strokeWidth={2.4} aria-hidden />
      {t("Add item")}
    </button>
  );

  let body: React.ReactNode;
  if (loading) body = <MarketSkeleton radius={24} rows={3} count={1} height={292} label={t("Loading your showcase")} />;
  else if (failed) body = <MarketError thing={tk("your showcase")} onRetry={onRetry} />;
  else {
    const column =
      count === 0 ? (
      <div style={{ height: FILL, display: "flex", flexDirection: "column", gap: 12 }}>
        {banner}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, border: "1.5px dashed #AEA1DC", borderRadius: 24, padding: "0 24px" }}>
          <span style={{ width: 64, height: 64, borderRadius: 20, background: "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center", color: "#7D67D9" }}>
            <Package size={28} strokeWidth={1.75} aria-hidden />
          </span>
          <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 800 }}>{t("No items yet")}</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378", maxWidth: 380 }}>{t("Add what you sell or offer. Items show on your Showcase on Explore.")}</p>
          <span style={{ marginTop: 8 }}>{add("0 18px")}</span>
        </div>
      </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {banner}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <CapsLabel style={{ margin: "0 2px" }}>{itemsHeader(count)}</CapsLabel>
            {add("0 16px")}
          </div>
          {list}
        </div>
      );
    body = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 24, alignItems: "start" }}>
        <div style={{ gridColumn: editor ? "span 7" : "1 / -1", minWidth: 0 }}>{column}</div>
        {editor ? <div style={{ gridColumn: "span 5", minWidth: 0, position: "sticky", top: 24, height: FILL }}>{editor}</div> : null}
      </div>
    );
  }

  return (
    <div data-showcase="web" style={{ color: "#241F1B", lineHeight: "normal" }}>
      <style>{CSS}</style>
      {offline}
      {body}
      {strip}
    </div>
  );
}
