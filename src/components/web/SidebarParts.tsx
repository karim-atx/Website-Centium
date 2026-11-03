import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CentiumMark, EntiumWordmark } from "../icons/CentiumMark";
import { tn } from "../../i18n/core";
import { NAV_ON, navInk } from "./webNav";

// Website viewport v1, section 4 (app shell): the sidebar the Client
// (Web Sidebar v7) and Business (WB Sidebar) web frames draw. Values from the
// reference files: 256 wide (rail 80), white, inline-end hairline
// rgba(36,31,27,0.06), padding 24 16; rows r16, gap 12, label 15/20, active
// #8F68F6 800, idle #9A94B3 600, hover #F5F5F6, press scale 0.96, focus ring
// 2px #AEA1DC offset 2. Search is left out (Karim's decision 1).

/**
 * The Centium logo, drawn from the repo's own vector mark and wordmark (the
 * board places its logo PNG; handover section 8: "Centium mark and wordmark
 * from the repo"). Expanded: the mark 46 tall with "entium" beside it, the C
 * aligned to the row icons. Rail: the mark alone, centred.
 */
export const SidebarLogo: React.FC<{ rail: boolean }> = ({ rail }) =>
  rail ? (
    <div className="flex justify-center shrink-0" style={{ height: 63, margin: "-8px 0 20px", alignItems: "center" }}>
      <CentiumMark height={44} label="Centium" />
    </div>
  ) : (
    <div
      dir="ltr"
      role="img"
      aria-label="Centium"
      className="flex items-center shrink-0"
      style={{ height: 66.7, margin: "-10px 0 22px", paddingInlineStart: 14, gap: 4 }}
    >
      <CentiumMark height={46} />
      <EntiumWordmark height={15} style={{ color: NAV_ON, overflow: "visible" }} />
    </div>
  );

const ROW =
  "group relative flex items-center gap-3 rounded-2xl no-underline shrink-0 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#F5F5F6] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2";

export interface SidebarRowProps {
  to?: string;
  onClick?: () => void;
  label: string;
  active: boolean;
  rail: boolean;
  /** Row height (40 or 44, per sidebar). */
  height: number;
  /** Inline padding when expanded (14 for the main destinations, 15 below). */
  padX: number;
  /** The icon box (28 for the main destinations, 26 below). */
  box: number;
  icon: React.ReactNode;
  /** Primary rows draw their label at line-height 1 (Web Sidebar v7). */
  tightLabel?: boolean;
  badge?: number;
}

/** One sidebar destination. In the rail the label becomes the row's title (hover tooltip) and accessible name. */
export const SidebarRow: React.FC<SidebarRowProps> = ({ to, onClick, label, active, rail, height, padX, box, icon, tightLabel, badge }) => {
  const style: React.CSSProperties = {
    height,
    paddingInline: rail ? 0 : padX,
    justifyContent: rail ? "center" : "flex-start",
  };
  const body = (
    <>
      <span className="flex items-center justify-center shrink-0" style={{ width: box, height: box }}>
        {icon}
      </span>
      {!rail && (
        <span
          className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontSize: 15, lineHeight: tightLabel ? 1 : "20px", fontWeight: active ? 800 : 600, color: navInk(active) }}
        >
          {label}
        </span>
      )}
      {badge != null && badge > 0 && (
        <span
          aria-label={tn(badge, "{n} unread", "{n} unread")}
          className="flex items-center justify-center tabular-nums"
          style={{
            position: rail ? "absolute" : "static",
            top: 4,
            insetInlineEnd: 10,
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            boxSizing: "border-box",
            borderRadius: 999,
            background: "#AEA1DC",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );
  if (to)
    return (
      <Link to={to} title={label} aria-label={rail ? label : undefined} aria-current={active ? "page" : undefined} className={ROW} style={style}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} title={label} aria-label={rail ? label : undefined} className={`${ROW} w-full text-start`} style={style}>
      {body}
    </button>
  );
};

/** The 1px rule between the main destinations and the rest. */
export const SidebarRule: React.FC<{ margin: string }> = ({ margin }) => (
  <div aria-hidden className="shrink-0" style={{ height: 1, background: "rgba(36,31,27,0.06)", margin }} />
);

/**
 * The scrolling destinations list: at the rail only this list scrolls (thin
 * scrollbar), with a 24px bottom fade while it overflows; the pinned rows stay.
 */
export const SidebarScrollList: React.FC<{ label: string; rail: boolean; children: React.ReactNode }> = ({ label, rail, children }) => {
  const ref = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setOverflow(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <div className="relative flex flex-col min-h-0" style={{ flex: "0 1 auto" }}>
      <nav
        ref={ref}
        aria-label={label}
        className="flex flex-col min-h-0 overflow-y-auto"
        style={{ gap: 2, flex: "1 1 auto", scrollbarWidth: "thin", paddingBottom: rail ? 20 : 0 }}
      >
        {children}
      </nav>
      {overflow && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: 24, background: "linear-gradient(to bottom, rgba(255,255,255,0), #FFFFFF)" }}
        />
      )}
    </div>
  );
};

/** The sidebar frame: fixed at the inline start (the right in Arabic), full height. */
export const SidebarFrame: React.FC<{ width: number; label: string; children: React.ReactNode }> = ({ width, label, children }) => (
  <aside
    aria-label={label}
    className="fixed top-0 bottom-0 z-40 flex flex-col overflow-hidden bg-white"
    style={{
      insetInlineStart: 0,
      width,
      borderInlineEnd: "1px solid rgba(36,31,27,0.06)",
      padding: "24px 16px",
      boxSizing: "border-box",
    }}
  >
    {children}
  </aside>
);
