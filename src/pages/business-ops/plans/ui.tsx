import React, { useEffect, useRef, useState } from "react";
import { EllipsisVertical, UserRound } from "lucide-react";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { useIsDark } from "../../../hooks/useIsDark";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette, type MarketPalette } from "../../../theme/marketTokens";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { cardMeta, initials, memberLine, statusChip, type CardFigures, type ChipTone } from "./planModel";
import type { PlanAction } from "./PlansContext";
import { t } from "../../../i18n/core";

// Market + Share 3.0 · W3 · B-MA.5 pieces (Business Marketplace Screens lines
// 315–335, `bizPlans`, `members`; B-MA.5.1 `editList` menu, lines 360–367),
// literal values, light = the board, dark = its [data-cm="dark"] palette
// through marketPalette:
// - plan card: radius 20, --card, 1px --border (1.5px --fill while its strip
//   shows), padding 14 16; row 1 (gap 10) name 14 / 800 (flex 1), price
//   14 / 800, kebab 32 × 32 radius 10 (margin -6 -8 -6 0, --ink2, the 18 / 2.2
//   ellipsis; --pale while its menu is open) on a 44 target; row 2 11.5
//   --faint (margin-top 2) "{duration} · {included}"; row 3 (margin-top 10,
//   gap 8) the status chip 10.5 / 800 radius 999 padding 2 8 and the members
//   line 11.5 --faint. The whole card opens the plan page.
// - the menu: the app PopupMenu (its default card is the drawn one: 168
//   wide, padding 8, rows radius 8 padding 9 10 12.5 / 500 on #FAFAFB with a
//   1px #E5E6EB border, Delete in rgb(192,57,43)).
// - member rows: padding 11 16, gap 12, 0.5px --div between; avatar 34
//   --tealbg / --tealink 12 / 800; name 13.5 / 700; plan 11.5 --faint;
//   "Until {date}" 11.5 --faint.

export function usePlanColors(): MarketPalette {
  return marketPalette(useIsDark());
}

export function chipColors(m: MarketPalette, tone: ChipTone): { bg: string; ink: string } {
  return tone === "good" ? { bg: m.goodbg, ink: m.good } : tone === "warn" ? { bg: m.cautionbg, ink: m.caution } : { bg: m.soft, ink: m.faint };
}

/** The status chip: 10.5 / 800, radius 999, padding 2 8. */
export const StatusChip: React.FC<{ plan: Pick<MembershipPlanRow, "status"> }> = ({ plan }) => {
  const m = usePlanColors();
  const s = statusChip(plan.status);
  const c = chipColors(m, s.tone);
  return (
    <span style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: c.bg, color: c.ink, whiteSpace: "nowrap", lineHeight: "normal" }}>
      {s.label}
    </span>
  );
};

/** The plan menu's options: the drawn Edit plan · Pause plan · Delete plan, with the kept live actions between Pause and Delete. */
export function menuOptions(plan: MembershipPlanRow, offline: boolean): PopupMenuOption<PlanAction>[] {
  if (plan.dbStatus === "archived") {
    return [
      { value: "restore", label: t("Restore plan"), disabled: offline },
      { value: "duplicate", label: t("Duplicate plan"), disabled: offline },
      { value: "delete", label: t("Delete plan"), destructive: true, disabled: offline },
    ];
  }
  const paused = plan.dbStatus === "paused";
  return [
    { value: "edit", label: t("Edit plan") },
    { value: paused ? "resume" : "pause", label: paused ? t("Resume plan") : t("Pause plan"), disabled: offline },
    { value: plan.visibleOnExplore ? "hide" : "show", label: plan.visibleOnExplore ? t("Hide from Explore") : t("Show on Explore"), disabled: offline },
    { value: "duplicate", label: t("Duplicate plan"), disabled: offline },
    { value: "archive", label: t("Archive plan"), disabled: offline },
    { value: "delete", label: t("Delete plan"), destructive: true, disabled: offline },
  ];
}

/**
 * The kebab and its PopupMenu. Keyboard: the menu takes focus on its first
 * row, Escape closes it and focus returns to the kebab.
 */
export const PlanMenuButton: React.FC<{ plan: MembershipPlanRow; offline: boolean; onAction: (a: PlanAction) => void; style?: React.CSSProperties }> = ({ plan, offline, onAction, style }) => {
  const m = usePlanColors();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = !!anchor;
  const btn = useRef<HTMLButtonElement | null>(null);
  const setOpen = (v: boolean) => setAnchor(v ? btn.current : null);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => (document.querySelector('[role="menu"] button:not(:disabled)') as HTMLElement | null)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={t("Plan options: {name}", { name: plan.name })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="tap market-focus"
        style={{
          width: 32,
          height: 32,
          marginBlock: "-6px", marginInline: "0 -8px",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? m.pale : "transparent",
          color: m.ink2,
          border: 0,
          padding: 0,
          flexShrink: 0,
          cursor: "pointer",
          position: "relative",
          zIndex: 1,
          ...style,
        }}
      >
        <EllipsisVertical size={18} strokeWidth={2.2} aria-hidden />
      </button>
      <PopupMenu
        open={open}
        anchor={anchor}
        onClose={() => {
          setOpen(false);
          btn.current?.focus();
        }}
        // The drawn rows are 37 tall: 12.5 on its normal 17 line + 9 / 9 padding + the 1px border.
        rowLineHeight={17}
        options={menuOptions(plan, offline)}
        onSelect={(a) => onAction(a)}
      />
    </>
  );
};

/** One B-MA.5 plan card. */
export const PlanCard: React.FC<{
  plan: MembershipPlanRow;
  figures: CardFigures;
  highlighted: boolean;
  offline: boolean;
  onOpen: () => void;
  onAction: (a: PlanAction) => void;
}> = ({ plan, figures, highlighted, offline, onOpen, onAction }) => {
  const m = usePlanColors();
  const line = memberLine(plan, figures);
  const meta = cardMeta(plan);
  const archived = plan.dbStatus === "archived";
  return (
    <div
      data-plan-card={plan.id}
      tabIndex={-1}
      className="market-focus"
      style={{
        position: "relative",
        borderRadius: 20,
        background: m.card,
        border: highlighted ? `1.5px solid ${m.fill}` : `1px solid ${m.border}`,
        padding: "14px 16px",
        color: m.ink,
        lineHeight: "normal",
        opacity: archived ? 0.6 : 1,
      }}
    >
      {/* The whole card opens the plan page (role button on the board); the kebab sits above this button. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${[plan.name, plan.price, meta, statusChip(plan.status).label, line].filter(Boolean).join(t(", "))}. ${t("Open plan")}`}
        className="market-focus"
        style={{ position: "absolute", inset: 0, width: "100%", borderRadius: 19, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, pointerEvents: "none", position: "relative" }}>
        <div aria-hidden style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 800, overflowWrap: "anywhere" }}>
          {plan.name}
        </div>
        <span aria-hidden style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap" }}>
          {plan.price}
        </span>
        <PlanMenuButton plan={plan} offline={offline} onAction={onAction} style={{ pointerEvents: "auto" }} />
      </div>
      {meta ? (
        <div aria-hidden style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 2, pointerEvents: "none", position: "relative" }}>
          {meta}
        </div>
      ) : null}
      <div aria-hidden style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, pointerEvents: "none", position: "relative", flexWrap: "wrap" }}>
        <StatusChip plan={plan} />
        {line ? <span style={{ fontSize: textPx(11.5), color: m.faint }}>{line}</span> : null}
      </div>
    </div>
  );
};

/** The member rows card (radius 24) with the board's rows. */
export const MemberRows: React.FC<{
  rows: { id: string; label: string; plan: string; until: string; minor: boolean }[];
  footer?: React.ReactNode;
}> = ({ rows, footer }) => {
  const m = usePlanColors();
  return (
    <div style={{ borderRadius: 24, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden", color: m.ink, lineHeight: "normal" }}>
      {rows.map((r, i) => {
        const masked = isMaskedLabel(r.label);
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? `0.5px solid ${m.div}` : "0" }}>
            <span
              aria-hidden
              style={{ width: 34, height: 34, borderRadius: 999, background: m.tealbg, color: m.tealink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12), fontWeight: 800, flexShrink: 0 }}
            >
              {masked ? <UserRound size={15} aria-hidden /> : initials(r.label)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: textPx(13.5), fontWeight: 700 }}>
                {r.label}
                {r.minor ? <span style={{ fontSize: textPx(11.5), fontWeight: 700, color: m.faint }}> · {t("Under 18")}</span> : null}
              </div>
              <div style={{ fontSize: textPx(11.5), color: m.faint }}>{r.plan}</div>
            </div>
            {r.until ? <span style={{ fontSize: textPx(11.5), color: m.faint, whiteSpace: "nowrap" }}>{r.until}</span> : null}
          </div>
        );
      })}
      {footer}
    </div>
  );
};

/** A quiet line inside a members card (no members yet, couldn't load). */
export const MemberNote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const m = usePlanColors();
  return <p style={{ margin: 0, padding: "14px 16px", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>{children}</p>;
};

/** "See all {n}" at the foot of a members card (OURS): 12.5 / 800 --pdark, 44 tall. */
export const SeeAllRow: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
  const m = usePlanColors();
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap market-focus"
      style={{ width: "100%", minHeight: 44, borderTop: `0.5px solid ${m.div}`, borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, background: "transparent", color: m.pdark, fontSize: textPx(12.5), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}
    >
      {label}
    </button>
  );
};

/** The focus ring CSS, once per screen. */
export const PlanFocusCss: React.FC = () => <style>{FOCUS_CSS}</style>;
