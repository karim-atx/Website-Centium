import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ImageOff,
  ChevronLeft,
  ListFilter,
  Package,
  PackageMinus,
  Receipt,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Star,
  Store,
  TriangleAlert,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import type { DashPalette } from "./palette";
import type { SetupStep } from "./dashboardModel";
import { dayLabel, whenLabel } from "./dashboardModel";
import type { AttentionIcon, AttentionItem } from "./attention";
import type { ActivityKind } from "./dashboardTypes";
import type { ActivityEvent, TotalType, WeekTotal } from "./activityFeed";
import type { GymTodayModel } from "./gymToday";
import type { MyVenue } from "../../services/venues/consoleLogic";
import { money, reviewsLine, type VenueDashboard } from "../../services/venues/consoleLogic";
import { fetchVenueDashboard } from "../../services/venues/console";
import { openNowTag } from "../../services/venues/hours";
import { bellBadge, unreadBadge } from "../../services/notifications/notificationsModel";
import { appLocale } from "../../i18n/format";
import { isRtl, t, tk, tn, tx } from "../../i18n/core";
import { WebMenu } from "../../pages/business-ops/frontdesk/FrontDeskParts.web";

// Website viewport v1 · WB-HO · GY Dashboard (WB-HO Dashboard Web v4, the
// "web" token set W): the dashboard's header actions, the anchored "Needs your
// attention" popover (360), the venue menu (260), the 480 "Your listing"
// popup, Finish setting up, Today, This venue and Recent activity, at the web
// sizes. Data, saving and navigation are the mobile dashboard's, unchanged;
// the mobile parts (HeaderParts, TodayBlock, RecentActivity) are not touched.

const LAV = "#AEA1DC";
const DIM = "rgba(36,31,27,0.18)";
const POP_BORDER = "1px solid rgba(174,161,220,0.5)";
const POP_SHADOW = "0 12px 32px rgba(95,80,147,0.18)";

/** A section label with its 1.5 lavender rule (13/20 600, 0.08em). */
export function WebKLabel({ c, label, right, margin = "0 0 12px" }: { c: DashPalette; label: string; right?: React.ReactNode; margin?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 7, borderBottom: `1.5px solid ${LAV}`, margin }}>
      <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c.faint, whiteSpace: "nowrap" }}>{label}</span>
      {right}
    </div>
  );
}

const linkStyle = (c: DashPalette): React.CSSProperties => ({ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.pDark, whiteSpace: "nowrap", background: "none", border: 0, padding: 0, cursor: "pointer" });

/** Esc closes, focus moves in on open and returns to the trigger on close. */
function useDialogFocus(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [open, onClose, panel]);
}

// ---------------------------------------------------------------- header

/** The header's end: business name, venue chip, Listed / Hidden chip and the 40 bell. */
export function WebDashActions({
  c,
  name,
  venueChip,
  listed,
  attentionCount,
  notificationsUnread,
  panelOpen,
  onBell,
  onChip,
  bellRef,
}: {
  c: DashPalette;
  name: string;
  venueChip: React.ReactNode;
  listed: boolean | null;
  attentionCount: number;
  notificationsUnread: number | null;
  panelOpen: boolean;
  onBell: () => void;
  onChip: () => void;
  bellRef: (el: HTMLButtonElement | null) => void;
}) {
  const chip = listed ? { bg: c.goodTint, ink: c.good, dot: c.good, text: t("Listed") } : { bg: c.soft, ink: c.faint, dot: c.tert, text: t("Hidden") };
  const badge = bellBadge(attentionCount, notificationsUnread);
  const bellLabel = notificationsUnread
    ? t("Needs your attention, {count} items, {unread} unread notifications", { count: attentionCount, unread: unreadBadge(notificationsUnread) })
    : t("Needs your attention, {count} items", { count: attentionCount });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
      <span title={name} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: c.inkSoft, whiteSpace: "nowrap", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </span>
      {venueChip}
      {listed !== null && (
        <button
          type="button"
          data-listed-chip
          onClick={onChip}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, lineHeight: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", borderRadius: 999, padding: "5px 10px", background: chip.bg, color: chip.ink, border: 0, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: chip.dot }} />
          {chip.text}
          <ChevronRight size={12} strokeWidth={2.6} aria-hidden />
        </button>
      )}
      <button
        ref={bellRef}
        type="button"
        data-bell
        aria-label={bellLabel}
        aria-expanded={panelOpen}
        onClick={onBell}
        className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ position: "relative", width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, background: panelOpen ? "#F0EDF9" : c.card, border: `1px solid ${panelOpen ? LAV : "rgba(36,31,27,0.11)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginInlineStart: 4, color: c.inkSoft, padding: 0 }}
      >
        <Bell size={20} strokeWidth={1.8} aria-hidden />
        {badge && (
          <span aria-hidden style={{ position: "absolute", top: -3, insetInlineEnd: -3, minWidth: 18, height: 18, padding: "0 5px", boxSizing: "border-box", borderRadius: 999, background: LAV, color: "#FFFFFF", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #FFFFFF" }}>
            {badge}
          </span>
        )}
      </button>
    </div>
  );
}

/** WB-HO.3 · the venue chip and its 260 menu (rows 15/22, notes 13/18, the selected row tinted with a check). */
export function WebVenueChip({ c, venues, selected, onSelect }: { c: DashPalette; venues: MyVenue[]; selected: MyVenue | null; onSelect: (gymId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; end: number } | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDialogFocus(open && !!pos, close, panel);
  if (venues.length < 2 || !selected) return null;
  return (
    <>
      <button
        type="button"
        data-venue-chip
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Venue: {name}. Change venue", { name: selected.name })}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 6, end: isRtl() ? r.left : window.innerWidth - r.right });
          setOpen(true);
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: 220, fontSize: 11, lineHeight: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", borderRadius: 999, padding: "5px 10px", background: c.pale, color: c.deep, border: 0, cursor: "pointer", whiteSpace: "nowrap", boxShadow: open ? `0 0 0 2px ${LAV}` : "none" }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{selected.name}</span>
        <ChevronDown size={12} strokeWidth={2.6} aria-hidden />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div onClick={close} aria-hidden style={{ position: "fixed", inset: 0, background: DIM, zIndex: 60 }} />
            <div
              ref={panel}
              role="menu"
              aria-label={t("Change venue")}
              data-venue-menu
              style={{ position: "fixed", top: pos.top, insetInlineEnd: pos.end, width: 260, boxSizing: "content-box", background: c.card, border: POP_BORDER, borderRadius: 14, boxShadow: POP_SHADOW, padding: 8, zIndex: 61 }}
            >
              {venues.map((v, i) => {
                const on = v.gymId === selected.gymId;
                const note = v.hiddenAt ? t("Hidden") : v.location || "";
                return (
                  <button
                    key={v.gymId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    onClick={() => {
                      onSelect(v.gymId);
                      close();
                    }}
                    className="hover:!bg-[#F0EDF9] hover:!border-[#AEA1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", boxSizing: "border-box", borderRadius: 8, padding: "11px 12px", marginTop: i ? 6 : 0, border: `1px solid ${on ? LAV : c.option}`, background: on ? c.pale : c.raised, fontSize: 15, lineHeight: "22px", fontWeight: on ? 700 : 600, color: c.ink, cursor: "pointer", textAlign: "start", font: "inherit" }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: on ? 700 : 600 }}>
                      {v.name}
                      {note && <span style={{ display: "block", fontSize: 13, lineHeight: "18px", fontWeight: 500, color: c.faint }}>{note}</span>}
                    </span>
                    {on && <Check size={14} strokeWidth={3} aria-hidden style={{ color: c.pDark }} />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function PopText({ c, title, sub }: { c: DashPalette; title: string; sub: string }) {
  return (
    <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: c.ink, textAlign: "start" }}>
      {title}
      <span style={{ display: "block", fontSize: 13, lineHeight: "20px", fontWeight: 500, marginTop: 1, color: c.faint }}>{sub}</span>
    </span>
  );
}

const ATT_ICON: Record<AttentionIcon, LucideIcon> = {
  "eye-off": EyeOff,
  "shield-alert": ShieldAlert,
  receipt: Receipt,
  banknote: Banknote,
  "calendar-clock": CalendarClock,
  "user-x": UserX,
  "calendar-x": CalendarX,
  package: Package,
  "package-minus": PackageMinus,
  "image-off": ImageOff,
  star: Star,
  "user-plus": UserPlus,
  users: Users,
};

/**
 * WB-HO.1 · Needs your attention: the popover 360 wide, 6 under the bell, at
 * the page margin (rows: padding 11 × 12, icon 18, title 15/22, line 13/20,
 * buttons 36). The Notifications row (business inbox) and the failed-read
 * Retry row are the mobile panel's, kept.
 */
export function WebAttentionPopover({
  c,
  open,
  items,
  anchor,
  onClose,
  onAction,
  onRetry,
  notificationsUnread,
}: {
  c: DashPalette;
  open: boolean;
  items: AttentionItem[] | null;
  anchor: HTMLElement | null;
  onClose: () => void;
  onAction: (item: AttentionItem) => void;
  onRetry: () => void;
  notificationsUnread: number | null;
}) {
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; end: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 6, end: isRtl() ? r.left : window.innerWidth - r.right });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, anchor]);
  useDialogFocus(open && !!pos, onClose, panel);
  if (!open || !pos) return null;
  const toneCol = (x: AttentionItem["tone"]) => (x === "high" ? c.high : x === "caution" ? c.caution : c.pDark);
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "11px 12px", border: `1px solid ${c.option}`, background: c.raised, boxSizing: "border-box" };
  const btnStyle: React.CSSProperties = { height: 36, padding: "0 12px", borderRadius: 8, background: c.fill, color: c.onFill, display: "flex", alignItems: "center", fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, border: 0, cursor: "pointer" };
  return createPortal(
    <>
      <div onClick={onClose} aria-hidden style={{ position: "fixed", inset: 0, background: DIM, zIndex: 60 }} />
      <div
        ref={panel}
        role="dialog"
        aria-label={t("Needs your attention")}
        data-attention-panel
        style={{ position: "fixed", top: pos.top, insetInlineEnd: pos.end, width: 360, boxSizing: "border-box", maxHeight: "calc(100dvh - 96px)", overflowY: "auto", background: c.card, border: POP_BORDER, borderRadius: 14, boxShadow: POP_SHADOW, padding: 10, zIndex: 61 }}
      >
        <button
          type="button"
          data-notifications-row
          aria-label={notificationsUnread ? t("Notifications, {unread} unread", { unread: unreadBadge(notificationsUnread) }) : undefined}
          onClick={() => {
            onClose();
            navigate("/app/business/notifications");
          }}
          className="hover:!bg-[#F0EDF9]"
          style={{ ...rowStyle, width: "100%", cursor: "pointer", font: "inherit" }}
        >
          <Bell size={18} aria-hidden style={{ color: c.pDark, flexShrink: 0 }} />
          <PopText c={c} title={t("Notifications")} sub={t("Applications, offer replies, hiring fees and reviews")} />
          {notificationsUnread ? (
            <span aria-hidden data-notifications-count style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: c.fill, color: c.onFill, fontSize: 11, lineHeight: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", flexShrink: 0 }}>
              {unreadBadge(notificationsUnread)}
            </span>
          ) : null}
          <ChevronRight size={16} aria-hidden style={{ color: c.faint, flexShrink: 0 }} />
        </button>
        <p style={{ margin: "12px 4px 10px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint }}>{t("Needs your attention")}</p>
        {(items ?? []).map((a, n) => {
          const Icon = ATT_ICON[a.icon];
          return (
            <div key={a.key} data-attention-row style={{ ...rowStyle, marginTop: n ? 6 : 0 }}>
              <Icon size={18} aria-hidden style={{ color: toneCol(a.tone), flexShrink: 0 }} />
              <PopText c={c} title={a.title} sub={a.sub} />
              <button type="button" onClick={() => onAction(a)} style={btnStyle} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]">
                {a.action}
              </button>
            </div>
          );
        })}
        {items === null && (
          <div style={rowStyle}>
            <TriangleAlert size={18} aria-hidden style={{ color: c.high, flexShrink: 0 }} />
            <PopText c={c} title={t("Couldn't check this right now")} sub={t("What needs your attention shows here once it loads.")} />
            <button type="button" onClick={onRetry} style={btnStyle}>
              {t("Retry")}
            </button>
          </div>
        )}
        {items !== null && items.length === 0 && (
          <div style={rowStyle}>
            <Check size={18} strokeWidth={2.6} aria-hidden style={{ color: c.good, flexShrink: 0 }} />
            <PopText c={c} title={t("You're all caught up")} sub={t("Invites, under-booked classes, a hidden listing and open seats show up here.")} />
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

/** WB-HO.2 · Your listing: a 480 centred popup with the sheet band (53, title 20/800) and the Active on Explore row (56, switch 48 × 28). */
export function WebListingPopup({ c, open, onClose, active, onToggle }: { c: DashPalette; open: boolean; onClose: () => void; active: boolean; onToggle: (v: boolean) => Promise<string | null> }) {
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }
  const panel = useRef<HTMLElement | null>(null);
  useDialogFocus(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(36,31,27,0.4)" }}>
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t("Your listing")}
        data-listing-popup
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 480, boxSizing: "border-box", background: "#F0EEFD", border: "1px solid #7248F8", borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", height: 53, padding: "0 18px" }}>
          <div style={{ width: 26 }} />
          <h2 style={{ flex: 1, margin: 0, textAlign: "center", color: "#7248F8", fontSize: 20, fontWeight: 800 }}>{t("Your listing")}</h2>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={onClose}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
            style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", boxSizing: "border-box", border: "1.6px solid #7248F8", background: "none", padding: 0, cursor: "pointer", color: "#7248F8" }}
          >
            <X size={12} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        <div style={{ background: c.card, borderRadius: "22px 22px 0 0", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderRadius: 16, background: c.listBg, padding: "0 14px" }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "rgb(var(--th-7d67d9))" }}>
              {active ? <Eye size={20} aria-hidden /> : <EyeOff size={20} aria-hidden />}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: c.ink }}>{t("Active on Explore")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={t("Listing active")}
              onClick={() => {
                setError(null);
                void onToggle(!active).then((m) => m && setError(m));
              }}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
              style={{ width: 48, height: 28, boxSizing: "border-box", borderRadius: 999, padding: 3, display: "flex", justifyContent: active ? "flex-end" : "flex-start", background: active ? "#9A8CD6" : "#E4E2EA", flex: "none", border: 0, cursor: "pointer" }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(36,31,27,0.2)" }} />
            </button>
          </div>
          {error && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.high }}>{error}</p>}
        </div>
      </aside>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------- setup

/** Finish setting up (web): #F0EDF9 r24, padding 22 × 24 × 12, title 22/30, checks 24, steps 15/24. */
export function WebSetupCard({ c, steps, onStep, onDismiss, style }: { c: DashPalette; steps: SetupStep[]; onStep: (s: SetupStep) => void; onDismiss: () => void; style?: React.CSSProperties }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section aria-label={t("Finish setting up")} data-setup-card style={{ position: "relative", boxSizing: "border-box", background: c.pale, borderRadius: 24, padding: "22px 24px 12px", display: "flex", flexDirection: "column", minWidth: 0, ...style }}>
      <button
        type="button"
        aria-label={t("Dismiss")}
        onClick={onDismiss}
        className="hover:!bg-[rgba(125,107,181,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ position: "absolute", top: 14, insetInlineEnd: 14, width: 32, height: 32, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: c.deep, background: "none", border: 0, padding: 0, cursor: "pointer" }}
      >
        <X size={18} strokeWidth={2.2} aria-hidden />
      </button>
      <p style={{ margin: 0, paddingInlineEnd: 40, fontSize: 22, lineHeight: "30px", fontWeight: 800, color: c.ink }}>{t("Finish setting up")}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 6px" }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label={t("Setup progress")} style={{ flex: 1, height: 6, borderRadius: 999, background: c.paleTrack, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.round((done / Math.max(steps.length, 1)) * 100)}%`, borderRadius: 999, background: c.primary }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.deep, whiteSpace: "nowrap" }}>{t("{done} of {total} done", { done, total: steps.length })}</p>
      </div>
      {steps.map((s, k) => {
        const inner = (
          <>
            <span style={{ width: 24, height: 24, borderRadius: 999, flex: "none", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? c.primary : "transparent", border: `1.5px solid ${s.done ? c.primary : c.tert}`, color: c.onFill }}>
              {s.done && <Check size={12} strokeWidth={3} aria-hidden />}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: s.done ? c.faint : c.ink, textDecoration: s.done ? "line-through" : "none", textAlign: "start" }}>{s.label}</span>
            {!s.done && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.deep, whiteSpace: "nowrap" }}>{s.action}</span>}
          </>
        );
        const st: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", minHeight: 44, boxSizing: "border-box", borderTop: k ? `1px solid ${c.paleTrack}` : "none", width: "100%" };
        return s.done ? (
          <div key={s.key} data-setup-step style={st}>
            {inner}
          </div>
        ) : (
          <button key={s.key} type="button" data-setup-step onClick={() => onStep(s)} aria-label={`${s.label}: ${s.action}`} style={{ ...st, background: "none", borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, cursor: "pointer", font: "inherit" }}>
            {inner}
          </button>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------- today

const toneInk = (c: DashPalette, tone: "good" | "warn" | "bad" | "faint" | undefined) => (tone === "good" ? c.good : tone === "warn" ? c.warn : tone === "bad" ? c.high : c.faint);

function TodayBoxes({ c, boxes }: { c: DashPalette; boxes: GymTodayModel["boxes"] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, flex: "none" }}>
      {boxes.map((b) => (
        <div key={b.label} data-today-box style={{ borderRadius: 16, background: c.listBg, padding: "14px 16px", minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: c.ink }}>{b.value}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint }}>{b.label}</p>
          {b.delta && <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: toneInk(c, b.tone) }}>{b.delta}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * Today (gym): three boxes, then Busy times today (r18, 16 × 18, 17/24 title,
 * bars with 11/16 hours) beside Recent entries (rows 58, tile 36, 15/22 and
 * 13/20, pills 11/16) in two columns 24 apart; the dashed empty box when the
 * venue has no entries yet.
 */
export function WebTodayGym({
  c,
  model,
  empty,
  onEntries,
  style,
}: {
  c: DashPalette;
  model: GymTodayModel | null;
  empty: { boxes?: GymTodayModel["boxes"]; title: string; body: string } | null;
  onEntries: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <section aria-label={t("Today")} data-today style={{ minWidth: 0, display: "flex", flexDirection: "column", ...style }}>
      <WebKLabel c={c} label={t("Today")} />
      {empty ? (
        <>
          {empty.boxes && <TodayBoxes c={c} boxes={empty.boxes} />}
          <div data-kit-empty style={{ flex: 1, marginTop: 12, boxSizing: "border-box", borderRadius: 20, border: `1.5px dashed ${LAV}`, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <span style={{ width: 56, height: 56, borderRadius: 14, background: c.pale, color: c.pDark, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <ScanLine size={26} strokeWidth={1.75} aria-hidden />
            </span>
            <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 800, color: c.ink }}>{empty.title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: c.inkSoft, textWrap: "pretty" }}>{empty.body}</p>
          </div>
        </>
      ) : (
        model && (
          <>
            <TodayBoxes c={c} boxes={model.boxes} />
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24, marginTop: 14 }}>
              <div data-busy-card style={{ borderRadius: 18, background: c.listBg, padding: "16px 18px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, color: c.ink }}>{t("Busy times today")}</p>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: "20px", color: c.faint }}>{t("When is the floor busiest?")}</p>
                <div role="img" aria-label={`${t("Busy times today")}: ${model.bars.map((b) => `${b.label} ${b.h}%`).join(", ")}`} style={{ flex: 1, minHeight: 96, display: "flex", alignItems: "flex-end", gap: 4 }}>
                  {model.bars.map((b, i) => (
                    <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <div data-bar style={{ width: "100%", height: `${Math.max(4, b.h)}%`, borderRadius: "6px 6px 3px 3px", background: c.lav }} />
                      <span style={{ fontSize: 11, lineHeight: "16px", height: 16, color: c.faint, whiteSpace: "nowrap" }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <WebKLabel c={c} label={t("Recent entries")} margin="0 2px 10px" right={<button type="button" onClick={onEntries} style={linkStyle(c)}>{t("See all")}</button>} />
                <div style={{ borderRadius: 18, background: c.listBg, padding: "2px 16px", display: "flex", flexDirection: "column" }}>
                  {model.recent.length === 0 && <p style={{ margin: 0, padding: "18px 0", fontSize: 13, lineHeight: "20px", color: c.faint }}>{t("No entries yet")}</p>}
                  {model.recent.map((r, k) => (
                    <button key={r.id} type="button" data-entry-row onClick={onEntries} className="hover:!bg-[#F0EDF9]" style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", boxSizing: "border-box", background: "none", border: 0, cursor: "pointer", textAlign: "start", font: "inherit", width: "100%" }}>
                      {k > 0 && <span aria-hidden style={{ position: "absolute", top: 0, insetInlineStart: 48, insetInlineEnd: 0, height: 1, background: c.listRule }} />}
                      <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        <ScanLine size={20} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, lineHeight: "22px", fontWeight: 700, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                        <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.detail}</span>
                      </span>
                      <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: r.pill.tone === "good" ? c.goodBg : c.highBg, color: r.pill.tone === "good" ? c.good : c.high, whiteSpace: "nowrap" }}>{r.pill.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </section>
  );
}

// ---------------------------------------------------------------- this venue

/**
 * This venue (venue_dashboard for the venue in the switcher): boxes in 4
 * columns (3 on the rail), 12 apart, value 24/28; the Venue console row
 * (min 72, tile 44, 17/24) spans 3 columns; the payments note under it 13/20.
 */
export function WebVenueSection({ c, gymId, cols, onConsole, style }: { c: DashPalette; gymId: string; cols: number; onConsole: () => void; style?: React.CSSProperties }) {
  const [data, setData] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchVenueDashboard(gymId).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setError(r.message);
      setError(null);
      setData({ gymId, value: r.value });
    });
    return () => {
      cancelled = true;
    };
  }, [gymId]);
  const d = data?.gymId === gymId ? data.value : null;
  const open = d ? openNowTag(d.isOpenNow) : null;
  const n = (x: number) => x.toLocaleString(appLocale());
  const boxes = d
    ? [
        { v: n(d.activeMembers), l: t("Active members") },
        { v: n(d.membershipsAwaitingPayment), l: t("Awaiting payment") },
        ...(d.amountAwaitingPayment !== null && d.amountMarkedPaidThisMonth !== null
          ? [
              { v: money(d.amountAwaitingPayment), l: t("Agreed, not yet paid") },
              { v: money(d.amountMarkedPaidThisMonth), l: t("Marked paid this month") },
            ]
          : []),
        { v: n(d.classesThisWeek), l: t("Classes this week") },
        { v: n(d.bookingsThisWeek), l: t("Bookings this week") },
        { v: n(d.waitlistWaiting), l: t("On waitlists") },
        { v: n(d.cancellationsThisWeek), l: t("Cancellations this week") },
        { v: d.reviewsAverage === null ? "–" : d.reviewsAverage.toFixed(1), l: t("Reviews"), d: reviewsLine(d.reviewsAverage, d.reviewsCount) },
      ]
    : [];
  const pillTone = open?.tone === "member" ? [c.goodBg, c.good] : [c.soft, c.faint];
  return (
    <section aria-label={t("This venue")} data-venue style={{ minWidth: 0, display: "flex", flexDirection: "column", ...style }}>
      <WebKLabel
        c={c}
        label={t("This venue")}
        right={open && <span style={{ whiteSpace: "nowrap", fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: pillTone[0], color: pillTone[1] }}>{t(open.label)}</span>}
      />
      {error && <p style={{ margin: "0 2px 12px", fontSize: 13, lineHeight: "20px", color: c.high }}>{error}</p>}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 12 }}>
        {!d && !error && Array.from({ length: cols }, (_, i) => <div key={i} aria-hidden className="animate-skeleton-pulse" style={{ borderRadius: 16, background: c.listBg, height: 80 }} />)}
        {boxes.map((b) => (
          <div key={b.l} data-venue-box style={{ borderRadius: 16, background: c.listBg, padding: "10px 14px", minWidth: 0, minHeight: 80, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p title={b.v} style={{ margin: 0, fontSize: 24, lineHeight: "28px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink }}>{b.v}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint }}>{b.l}</p>
            {b.d && <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.good }}>{b.d}</p>}
          </div>
        ))}
        <button
          type="button"
          data-venue-console
          onClick={onConsole}
          className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ gridColumn: "span 3", minHeight: 72, borderRadius: 18, background: c.listBg, padding: "0 16px", display: "flex", alignItems: "center", gap: 14, border: 0, cursor: "pointer", textAlign: "start", font: "inherit", minWidth: 0 }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 13, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Store size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: c.ink }}>{t("Venue console")}</span>
            <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("Members, class rosters, opening hours, logo and cover")}</span>
          </span>
          <ChevronRight size={16} aria-hidden style={{ color: c.faint }} />
        </button>
      </div>
      {d && d.amountAwaitingPayment !== null && (
        <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px", color: c.faint, textAlign: "center", textWrap: "pretty" }}>
          {t("Payments happen at the venue, not through Centium. These figures are what was agreed and what your staff marked as paid.")}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- recent activity

const TYPE_ICON: Record<ActivityKind | TotalType, LucideIcon> = {
  join: UserPlus,
  end: UserMinus,
  booking: CalendarCheck,
  created: CalendarPlus,
  cancel: CalendarX,
  check_in: ScanLine,
  order: Package,
  payment: Banknote,
  appointment: CalendarClock,
  review: Star,
};

function badgeOf(c: DashPalette, k: ActivityKind | TotalType) {
  if (k === "join" || k === "payment") return c.good;
  if (k === "end" || k === "cancel") return c.high;
  if (k === "booking" || k === "appointment" || k === "order") return c.dark ? "#7F6BD8" : c.pDark;
  if (k === "review") return c.warn;
  return c.tealDark;
}

const rgbaOf = (col: string, a: number) => {
  if (col.startsWith("#")) {
    const n = parseInt(col.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return col.replace(/\)$/, ` / ${a})`);
};

const weekInitials = (): string[] => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(appLocale("en-US"), { weekday: "narrow" }));

/** The week chart of a totals tile: last week dashed, this week's line, area and dots up to today, today's value above its dot, the day initials under it. */
function WeekChart({ c, days, prev, col, cur, has }: { c: DashPalette; days: number[]; prev: number[]; col: string; cur: number; has: boolean }) {
  const rtl = isRtl();
  const xs = [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const x = 6 + k * (88 / 6);
    return rtl ? 100 - x : x;
  });
  const n = cur + 1;
  const mx = has ? Math.max(1, ...days.slice(0, n), ...prev) : 1;
  const y = (v: number) => 10 + (1 - v / mx) * 80;
  const line = (vals: number[], m: number) => vals.slice(0, m).map((v, k) => (k ? "L" : "M") + xs[k].toFixed(2) + "," + y(v).toFixed(2)).join(" ");
  const ini = weekInitials();
  const ns = { vectorEffect: "non-scaling-stroke" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 56 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 24, bottom: 20 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden style={{ position: "absolute", inset: 0, overflow: "visible", display: "block" }}>
          {[10, 50, 90].map((g) => (
            <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="rgba(36,31,27,0.07)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {has ? (
            <>
              <path d={line(prev, 7)} fill="none" stroke="#B9B2A8" strokeWidth={1.5} strokeDasharray="4 4" {...ns} />
              <path d={`${line(days, n)} L${xs[n - 1].toFixed(2)},90 L${xs[0].toFixed(2)},90 Z`} fill={rgbaOf(col, 0.1)} stroke="none" />
              <path d={line(days, n)} fill="none" stroke={col} strokeWidth={2} {...ns} />
            </>
          ) : (
            <line x1={xs[0]} x2={xs[6]} y1={90} y2={90} stroke={c.tert} strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {has &&
          xs.map((x, k) => {
            const fut = k > cur;
            const isCur = k === cur;
            const d = isCur ? 11 : 6;
            const top = fut ? 90 : y(days[k]);
            return (
              <React.Fragment key={k}>
                <span
                  aria-hidden
                  style={{ position: "absolute", left: `${x}%`, top: `${top}%`, width: d, height: d, transform: "translate(-50%,-50%)", borderRadius: 999, boxSizing: "border-box", background: fut ? "#FFFFFF" : col, border: fut ? "1.5px solid #D6D1CA" : "none", boxShadow: fut ? "none" : isCur ? "0 0 0 3px #FFFFFF, 0 2px 6px rgba(36,31,27,0.18)" : "0 0 0 1.5px #FFFFFF" }}
                />
                {isCur && (
                  <span style={{ position: "absolute", left: `${x}%`, top: `calc(${top}% - 10px)`, transform: "translate(-50%,-100%)", padding: "0 7px", borderRadius: 6, background: col, color: "#FFFFFF", fontSize: 11, lineHeight: "16px", fontWeight: 800, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", boxShadow: "0 2px 6px rgba(36,31,27,0.16)" }}>
                    {String(days[k])}
                  </span>
                )}
              </React.Fragment>
            );
          })}
      </div>
      {xs.map((x, k) => (
        <span key={k} aria-hidden style={{ position: "absolute", left: `${x}%`, bottom: 0, transform: "translateX(-50%)", fontSize: 11, lineHeight: "16px", fontWeight: k === cur ? 800 : 600, color: k === cur && has ? col : c.tert }}>
          {ini[k]}
        </span>
      ))}
    </div>
  );
}

function Totals({ c, totals, cur }: { c: DashPalette; totals: WeekTotal[]; cur: number }) {
  return (
    <div style={{ flex: "none", padding: "0 16px 12px" }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "20px", color: c.faint }}>{t("This week, compared with last week")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {totals.map((wt) => {
          const col = badgeOf(c, wt.type);
          const has = wt.n + wt.prev > 0;
          const diff = wt.n - wt.prev;
          const goodDir = wt.type === "end" ? diff < 0 : diff > 0;
          const trend = !has ? t("No activity yet") : diff === 0 ? t("Same as last wk") : t("{delta} vs last wk", { delta: `${diff > 0 ? "↑ +" : "↓ −"}${Math.abs(diff)}` });
          const Icon = TYPE_ICON[wt.type];
          return (
            <div
              key={wt.type}
              data-total-tile
              style={{ borderRadius: 16, background: has ? rgbaOf(col, 0.06) : c.soft, border: `1px solid ${has ? rgbaOf(col, 0.22) : "rgba(36,31,27,0.11)"}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)", padding: "10px 4px 9px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 5, minWidth: 0 }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 10, background: has ? rgbaOf(col, 0.14) : c.soft, color: has ? col : c.tert, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} strokeWidth={2.4} aria-hidden />
              </span>
              <span style={{ fontSize: 22, lineHeight: "24px", fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: has ? c.ink : c.tert }}>{has ? String(wt.n) : "–"}</span>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint }}>{wt.label}</span>
              <div data-chart="week" style={{ width: "100%", height: 84, boxSizing: "border-box", padding: "0 12px" }}>
                <WeekChart c={c} days={wt.days} prev={wt.prevDays} col={has ? col : c.tert} cur={cur} has={has} />
              </div>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: !has || diff === 0 ? c.faint : goodDir ? c.good : c.high, whiteSpace: "nowrap" }}>{trend}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_TEXT = tk("Joins, bookings, ended memberships and new classes show here as they happen.");

/**
 * WB-HO / WB-HO.5 · Recent activity (web): white r24 card with the 0.11
 * border, header 14 × 16 × 12 (label 13/20, live line 13/20, 36 buttons),
 * day groups 13/20, rows 15/22 and 13/20; collapsed shows today's first 3 and
 * "Show {n} more and this week's totals" (15/20); expanded adds the two-column
 * week charts and every row of the week, and scrolls inside the card, which
 * takes the height of its row.
 */
export function WebRecentActivity({
  c,
  week,
  totals,
  now,
  today,
  todayIndex,
  updatedAt,
  online,
  refreshing,
  onRefresh,
  onSeeAll,
  newIds,
  style,
}: {
  c: DashPalette;
  week: ActivityEvent[];
  totals: WeekTotal[] | null;
  now: Date;
  today: string;
  /** Today in the Monday-first week (0-6). */
  todayIndex: number;
  updatedAt: number | null;
  online: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSeeAll: () => void;
  newIds: Set<number>;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => (open ? week : week.slice(0, 3)), [open, week]);
  const groups = useMemo(() => {
    const out: { day: string; label: string; items: ActivityEvent[] }[] = [];
    for (const e of shown) {
      const last = out[out.length - 1];
      if (last && last.day === e.day) last.items.push(e);
      else out.push({ day: e.day, label: dayLabel(e.day, today), items: [e] });
    }
    return out;
  }, [shown, today]);
  const mins = updatedAt === null ? null : Math.max(0, Math.floor((now.getTime() - updatedAt) / 60000));
  const updated = mins === null ? "" : mins < 1 ? t("Updated just now") : tn(mins, "Updated {n} min ago", "Updated {n} min ago");
  const roundBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, background: c.soft, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", border: 0, color: c.inkSoft, cursor: "pointer", padding: 0 };
  const body = (
    <div style={{ flex: 1, padding: "0 16px 6px", borderTop: `1px solid ${c.divider}`, display: "flex", flexDirection: "column", justifyContent: week.length === 0 ? "center" : "flex-start" }}>
      {groups.map((g) => (
        <div key={g.day} style={{ display: "flex", flexDirection: "column" }}>
          <p style={{ margin: 0, padding: "12px 0 2px", fontSize: 13, lineHeight: "20px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: c.faint }}>{g.label}</p>
          {g.items.map((e) => {
            const isNew = newIds.has(e.id);
            const Icon = TYPE_ICON[e.type];
            return (
              <div key={e.key} data-activity-row style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: `8px ${isNew ? 8 : 0}px`, margin: `0 ${isNew ? -8 : 0}px`, borderRadius: 14, background: isNew ? c.newRow : "transparent" }}>
                <span style={{ position: "relative", width: 36, height: 36, flex: "none" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 999, background: c.maskBg, color: c.maskInk, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UserRound size={16} aria-hidden />
                  </span>
                  <span style={{ position: "absolute", insetInlineEnd: -4, bottom: -4, width: 20, height: 20, borderRadius: 999, background: badgeOf(c, e.type), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${isNew ? c.newRow : c.card}` }}>
                    <Icon size={11} strokeWidth={2.6} aria-hidden />
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: c.ink }}>
                    <span title={e.title} style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                    {isNew && <span style={{ fontSize: 11, lineHeight: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: c.onFill, background: c.fill, borderRadius: 999, padding: "1px 6px", flex: "none" }}>{t("New")}</span>}
                  </span>
                  {(e.sub || e.isMinor) && <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: c.faint }}>{[e.sub, e.isMinor ? t("Under 18") : ""].filter(Boolean).join(" · ")}</span>}
                </span>
                <span style={{ fontSize: 13, lineHeight: "20px", color: c.faint, whiteSpace: "nowrap", paddingTop: 2 }}>{whenLabel(e.at, now)}</span>
              </div>
            );
          })}
        </div>
      ))}
      {week.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 10px" }}>
          <span style={{ width: 36, height: 36, boxSizing: "border-box", borderRadius: 999, border: `1.5px dashed ${c.tert}`, flex: "none" }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: c.faint }}>{t(EMPTY_TEXT)}</p>
        </div>
      )}
    </div>
  );
  return (
    <section
      aria-label={t("Recent activity")}
      data-recent-activity={open ? "open" : "closed"}
      style={{ alignSelf: open ? "stretch" : "start", minWidth: 0, minHeight: 0, boxSizing: "border-box", background: c.card, borderRadius: 24, border: "1px solid rgba(36,31,27,0.11)", overflow: "hidden", display: "flex", flexDirection: "column", ...style }}
    >
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} style={{ flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, textAlign: "start", cursor: "pointer", font: "inherit" }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.faint, whiteSpace: "nowrap" }}>{t("Recent activity")}</p>
          <p data-live-line style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0 0", fontSize: 13, lineHeight: "20px", color: c.inkSoft, whiteSpace: "nowrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: online ? c.good : c.tert, boxShadow: online ? `0 0 0 3px ${c.goodTint}` : "none", flex: "none" }} />
            <span style={{ fontWeight: 700, color: online ? c.good : c.faint }}>{online ? tx("Live", "connection") : t("Offline")}</span>
            {updated && <span>{`· ${updated}`}</span>}
          </p>
        </button>
        <button type="button" aria-label={t("Refresh")} disabled={!online || refreshing} onClick={onRefresh} className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...roundBtn, opacity: online ? 1 : 0.4 }}>
          <RefreshCw size={16} strokeWidth={2} aria-hidden className={refreshing ? "animate-spin" : undefined} />
        </button>
        <button type="button" aria-label={open ? t("Show less") : t("Show more")} aria-expanded={open} onClick={() => setOpen(!open)} className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...roundBtn, transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      {open ? (
        // Expanded: the list scrolls inside the card; the card takes its row's height (never less than 360 of list).
        <div style={{ position: "relative", flex: 1, minHeight: 360 }}>
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", scrollbarWidth: "none", display: "flex", flexDirection: "column" }}>
            {totals && <Totals c={c} totals={totals} cur={todayIndex} />}
            {body}
          </div>
        </div>
      ) : (
        body
      )}
      {week.length > 0 && (
        <button
          type="button"
          onClick={open ? onSeeAll : () => setOpen(true)}
          className="hover:!bg-[#FAFAFB]"
          style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, padding: "11px 0 13px", boxSizing: "border-box", borderTop: `1px solid ${c.divider}`, borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, background: "none", fontSize: 15, lineHeight: "20px", fontWeight: 700, color: c.pDark, cursor: "pointer", whiteSpace: "nowrap", width: "100%" }}
        >
          {open ? t("See all activity") : t("Show {n} more and this week's totals", { n: Math.max(week.length - 3, 0) })}
          <ChevronRight size={14} aria-hidden />
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- see all activity

type ActivityFilter = "all" | ActivityKind;
const ACT_FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: tk("All") },
  { value: "booking", label: tk("Bookings") },
  { value: "cancel", label: tk("Cancellations") },
  { value: "join", label: tk("Joins") },
  { value: "end", label: tk("Ended") },
  { value: "check_in", label: tk("Check-ins") },
  { value: "order", label: tk("Orders") },
  { value: "payment", label: tk("Payments") },
  { value: "appointment", label: tk("Appointments") },
  { value: "review", label: tk("Reviews") },
];
const filterLabel = (f: { value: ActivityFilter; label: string }) => (f.value === "check_in" ? tx("Check-ins", "entries") : t(f.label));

/**
 * WB-HO.6 · See all activity (web): the page header (back 40, "Recent
 * activity", "Last 30 days", the 40 filter button and its 220 menu) over the
 * KPI band (four cards: tile 32 / 28, label 15/22, count 28/36 / 24/30 700),
 * then the timeline card in 8 columns (5 on the rail: the filter tabs, day
 * groups with a sticky 13/20 caps label, rows 64 / 60 with the 40 tile) and,
 * in 4 (3), this week's Joined and Ended charts and Activity by type. Counts
 * are the 30 days of business_activity the dashboard already reads; there is
 * no earlier period on this reader, so the KPI cards say "Last 30 days"
 * instead of a comparison. Filters offer only the kinds this caller receives.
 */
export function WebActivityScreen({
  c,
  events,
  totals,
  now,
  today,
  todayIndex,
  rail,
  onBack,
  newIds,
}: {
  c: DashPalette;
  events: ActivityEvent[];
  totals: WeekTotal[] | null;
  now: Date;
  today: string;
  todayIndex: number;
  rail: boolean;
  onBack: () => void;
  newIds: Set<number>;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const kinds = new Set(events.map((e) => e.type));
  const options = ACT_FILTERS.filter((f) => f.value === "all" || kinds.has(f.value as ActivityKind));
  const shown = filter === "all" ? events : events.filter((e) => e.type === filter);
  const groups: { day: string; label: string; items: ActivityEvent[] }[] = [];
  for (const e of shown) {
    const last = groups[groups.length - 1];
    if (last && last.day === e.day) last.items.push(e);
    else groups.push({ day: e.day, label: dayLabel(e.day, today), items: [e] });
  }
  const count = (k: ActivityKind) => events.filter((e) => e.type === k).length;
  const empty = events.length === 0;
  const KPIS: { k: ActivityKind; label: string }[] = [
    { k: "check_in", label: tx("Check-ins", "entries") },
    { k: "join", label: t("Joins") },
    { k: "end", label: t("Ended") },
    { k: "payment", label: t("Payments") },
  ];
  const byType = (["check_in", "payment", "join", "end", "booking", "cancel", "order", "appointment", "review"] as ActivityKind[])
    .filter((k) => kinds.has(k) || ["check_in", "payment", "join", "end", "review"].includes(k))
    .map((k) => ({ k, n: count(k), label: filterLabel(ACT_FILTERS.find((f) => f.value === k)!) }));
  const maxType = Math.max(1, ...byType.map((b) => b.n));
  const card: React.CSSProperties = { minWidth: 0, boxSizing: "border-box", background: c.card, borderRadius: 20, border: "1px solid rgba(36,31,27,0.11)" };

  return (
    <div data-activity="web" style={{ color: c.ink, display: "flex", flexDirection: "column", height: "100dvh", minHeight: 560 }}>
      <header style={{ height: 64, flex: "none", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 32px 0 20px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <button
          type="button"
          aria-label={t("Back")}
          title={t("Back")}
          onClick={onBack}
          className="hover:!bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", background: "transparent", border: 0, cursor: "pointer", color: "#5B5349" }}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", whiteSpace: "nowrap" }}>{t("Recent activity")}</h1>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint, whiteSpace: "nowrap" }}>{t("Last 30 days")}</p>
        </div>
        <button
          type="button"
          aria-label={t("Filter")}
          title={t("Filter")}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          onClick={(e) => setMenu(e.currentTarget)}
          className="hover:!bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", background: menu ? "#F0EDF9" : "transparent", border: 0, cursor: "pointer", color: "#5B5349" }}
        >
          <ListFilter size={20} aria-hidden />
        </button>
      </header>
      <WebMenu
        open={!!menu}
        anchor={menu}
        onClose={() => setMenu(null)}
        label={t("Filter")}
        selected={filter}
        options={options.map((f) => ({ value: f.value, label: filterLabel(f) }))}
        onSelect={(v) => {
          setMenu(null);
          setFilter(v);
        }}
      />

      <div style={{ flex: 1, minHeight: 0, boxSizing: "border-box", maxWidth: 1280, width: "100%", padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
        <div data-band="kpis" style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 24 }}>
          {KPIS.map(({ k, label }) => {
            const col = badgeOf(c, k);
            const n = count(k);
            const Icon = TYPE_ICON[k];
            return (
              <div key={k} data-kpi={k} style={{ ...card, padding: rail ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span aria-hidden style={{ width: rail ? 28 : 32, height: rail ? 28 : 32, borderRadius: 10, background: empty ? c.soft : rgbaOf(col, 0.12), color: empty ? c.tert : col, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#5B5349", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                </div>
                <span style={{ fontSize: rail ? 24 : 28, lineHeight: rail ? "30px" : "36px", fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: empty ? c.tert : c.ink }}>{empty ? "–" : n.toLocaleString(appLocale("en-US"))}</span>
                <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.faint, whiteSpace: "nowrap" }}>{empty ? t("No activity yet") : t("Last 30 days")}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, gridTemplateRows: "minmax(0,1fr)", columnGap: 24 }}>
          <section aria-label={t("Recent activity")} data-activity-list style={{ gridColumn: `span ${rail ? 5 : 8}`, ...card, borderRadius: 24, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: "none", padding: "16px 20px 12px" }}>
              <div role="tablist" aria-label={t("Filter")} style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))`, gap: 4, padding: 5, borderRadius: 14, background: "#F5F5F6" }}>
                {options.map((f) => {
                  const on = f.value === filter;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setFilter(f.value)}
                      className="hover:!text-[#241F1B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                      style={{ minWidth: 0, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, lineHeight: "24px", fontWeight: on ? 700 : 600, background: on ? "#FFFFFF" : "transparent", color: on ? "#5F5093" : c.faint, boxShadow: on ? "0 1px 3px rgba(95,80,147,0.22)" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: 0, cursor: "pointer", padding: "0 6px" }}
                    >
                      {filterLabel(f)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div data-tl="scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", scrollbarWidth: "thin", padding: "0 20px 8px", display: "flex", flexDirection: "column" }}>
              {groups.map((g) => (
                <div key={g.day} style={{ flex: "none" }}>
                  <p className="rtl:tracking-normal" style={{ position: "sticky", top: 0, zIndex: 1, margin: 0, padding: "12px 0 6px", background: c.card, borderBottom: "1px solid rgba(36,31,27,0.06)", fontSize: 13, lineHeight: "20px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: c.faint }}>
                    {g.label}
                  </p>
                  {g.items.map((e) => {
                    const col = badgeOf(c, e.type);
                    const Icon = TYPE_ICON[e.type];
                    return (
                      <div key={e.key} data-tl-row style={{ height: rail ? 60 : 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(36,31,27,0.04)", background: newIds.has(e.id) ? "rgba(174,161,220,0.12)" : "transparent" }}>
                        <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: rgbaOf(col, 0.12), color: col, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                          <Icon size={20} strokeWidth={2} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span title={e.title} style={{ display: "block", fontSize: 15, lineHeight: "22px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {e.title}
                            {e.isMinor && <span style={{ fontSize: 13, fontWeight: 700, color: c.faint }}> · {t("Under 18")}</span>}
                          </span>
                          {e.sub && (
                            <span title={e.sub} style={{ display: "block", fontSize: 13, lineHeight: "20px", color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {e.sub}
                            </span>
                          )}
                        </span>
                        <span style={{ flex: "none", fontSize: 13, lineHeight: "20px", color: c.faint, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{whenLabel(e.at, now)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {groups.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
                  <span aria-hidden style={{ width: 56, height: 56, boxSizing: "border-box", borderRadius: 999, border: "1.5px dashed #A79E93", flex: "none" }} />
                  <p style={{ margin: 0, maxWidth: 380, fontSize: 15, lineHeight: "24px", color: c.faint, textWrap: "pretty" } as React.CSSProperties}>{t(EMPTY_TEXT)}</p>
                </div>
              )}
            </div>
          </section>

          <aside aria-label={t("This week, compared with last week")} style={{ gridColumn: `span ${rail ? 3 : 4}`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: rail ? 16 : 24 }}>
            {(totals ?? [])
              .filter((wt) => wt.type === "join" || wt.type === "end")
              .map((wt) => {
                const col = badgeOf(c, wt.type);
                const has = wt.n + wt.prev > 0;
                const diff = wt.n - wt.prev;
                const goodDir = wt.type === "end" ? diff < 0 : diff > 0;
                const trend = !has ? t("No activity yet") : diff === 0 ? t("Same as last wk") : t("{delta} vs last wk", { delta: `${diff > 0 ? "↑ +" : "↓ −"}${Math.abs(diff)}` });
                const Icon = TYPE_ICON[wt.type];
                return (
                  <div
                    key={wt.type}
                    data-big-total={wt.type}
                    style={{ flex: "1 1 0", minHeight: 120, boxSizing: "border-box", borderRadius: 20, background: has ? rgbaOf(col, 0.06) : c.soft, border: `1px solid ${has ? rgbaOf(col, 0.22) : "rgba(36,31,27,0.11)"}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)", padding: rail ? "12px 14px" : "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: has ? rgbaOf(col, 0.14) : c.soft, color: has ? col : c.tert, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        <Icon size={16} strokeWidth={2.4} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#5B5349", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {wt.label}
                        <span style={{ fontWeight: 500, color: c.faint }}> · {t("this week")}</span>
                      </span>
                      <span style={{ fontSize: rail ? 24 : 28, lineHeight: rail ? "30px" : "32px", fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: has ? c.ink : c.tert }}>{has ? String(wt.n) : "–"}</span>
                    </div>
                    <div style={{ flex: 1, minHeight: 56 }}>
                      <WeekChart c={c} days={wt.days} prev={wt.prevDays} col={has ? col : c.tert} cur={todayIndex} has={has} />
                    </div>
                    <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: !has || diff === 0 ? c.faint : goodDir ? c.good : c.high, whiteSpace: "nowrap" }}>{trend}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, lineHeight: "16px", fontWeight: 600, color: c.faint, whiteSpace: "nowrap" }}>
                        <span aria-hidden style={{ width: 14, borderTop: "1.5px dashed #B9B2A8" }} />
                        {t("Last week")}
                      </span>
                    </div>
                  </div>
                );
              })}
            <div data-card="by-type" style={{ flex: "1.1 1 0", minHeight: 160, ...card, padding: rail ? "12px 14px" : "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ flex: "none", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, whiteSpace: "nowrap" }}>{t("Activity by type")}</span>
                <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint, whiteSpace: "nowrap" }}>{t("Last 30 days")}</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: 4 }}>
                {byType.map((b) => (
                  <div key={b.k} style={{ display: "grid", gridTemplateColumns: rail ? "64px minmax(0,1fr) 40px" : "76px minmax(0,1fr) 48px", alignItems: "center", gap: 10 }}>
                    <span title={b.label} style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.label}
                    </span>
                    <span aria-hidden style={{ height: 8, borderRadius: 999, background: "#F5F5F6", overflow: "hidden", display: "block" }}>
                      <span style={{ display: "block", height: "100%", width: b.n ? `${Math.max(3, Math.round((b.n / maxType) * 100))}%` : "0%", borderRadius: 999, background: badgeOf(c, b.k) }} />
                    </span>
                    <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700, color: b.n ? c.ink : c.tert, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{b.n.toLocaleString(appLocale("en-US"))}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
