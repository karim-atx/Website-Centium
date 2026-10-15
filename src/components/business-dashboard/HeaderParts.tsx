import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Banknote, Bell, CalendarClock, CalendarX, Check, ChevronDown, ChevronRight, Eye, EyeOff, ImageOff, Package, PackageMinus, Receipt, ShieldAlert, Star, TriangleAlert, UserPlus, Users, UserX, X } from "lucide-react";
import type { DashPalette } from "./palette";
import type { SetupStep } from "./dashboardModel";
import type { AttentionIcon, AttentionItem } from "./attention";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { PopupMenu } from "../ui/PopupMenu";
import { linePx, textPx } from "../../theme/textSize";
import type { MyVenue } from "../../services/venues/consoleLogic";

// DA1-015 #2-#7 (header, bell, name row, Listed chip), S1 (Needs your
// attention), DA2-003 (Finish setting up), OURS-DA-kept-features #1, #2, #4
// (Your listing sheet, venue chip).

export function DashHeader({
  c,
  kicker,
  greeting,
  name,
  listed,
  attentionCount,
  panelOpen,
  onBell,
  onChip,
  bellRef,
  venueChip,
}: {
  c: DashPalette;
  kicker: string;
  greeting: string;
  name: string;
  /** null while the listing is unknown (loading): the chip is hidden (OURS-DA-states #1). */
  listed: boolean | null;
  attentionCount: number;
  panelOpen: boolean;
  onBell: () => void;
  onChip: () => void;
  bellRef: (el: HTMLButtonElement | null) => void;
  venueChip?: React.ReactNode;
}) {
  const chip = listed ? { bg: c.goodTint, ink: c.good, dot: c.good, text: "Listed" } : { bg: c.soft, ink: c.faint, dot: c.tert, text: "Hidden" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <p data-kicker style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: c.faint, margin: 0, lineHeight: 1.5 }}>
            {kicker}
          </p>
          <h1 data-greeting style={{ fontSize: textPx(27), fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.2, margin: 0, color: c.ink }}>
            {greeting}
          </h1>
        </div>
        <button
          ref={bellRef}
          type="button"
          data-bell
          aria-label={`Needs your attention, ${attentionCount} items`}
          aria-haspopup="menu"
          aria-expanded={panelOpen}
          onClick={onBell}
          style={{
            position: "relative",
            width: 44,
            height: 44,
            borderRadius: 999,
            background: panelOpen ? c.pale : c.card,
            border: `1px solid ${panelOpen ? c.primary : c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.inkSoft,
            flexShrink: 0,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Bell size={19} strokeWidth={1.8} aria-hidden />
          {attentionCount > 0 && (
            <span
              data-badge
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 999,
                background: c.fill,
                color: c.onFill,
                fontSize: textPx(10),
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 0 2px ${c.page}`,
                boxSizing: "border-box",
              }}
            >
              {attentionCount}
            </span>
          )}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <p data-biz-name style={{ fontSize: textPx(14), fontWeight: 700, color: c.inkSoft, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, lineHeight: 1.5 }}>
          {name}
        </p>
        {listed !== null && (
          <button
            type="button"
            data-listed-chip
            className="hit"
            onClick={onChip}
            aria-label={`${chip.text} on Explore. Your listing`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: textPx(10),
              lineHeight: linePx(15),
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              borderRadius: 999,
              padding: "4px 9px",
              flexShrink: 0,
              background: chip.bg,
              color: chip.ink,
              border: 0,
              cursor: "pointer",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: chip.dot }} />
            {chip.text}
            <ChevronRight size={11} strokeWidth={2.6} aria-hidden />
          </button>
        )}
      </div>
      {venueChip}
    </div>
  );
}

/**
 * OURS-DA-kept-features #4: the venue switcher as a chip (Listed chip family)
 * opening a PopupMenu of the business's venues. Hidden for one venue.
 */
export function VenueChip({ c, venues, selected, onSelect }: { c: DashPalette; venues: MyVenue[]; selected: MyVenue | null; onSelect: (gymId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  if (venues.length < 2 || !selected) return null;
  return (
    <div>
      <button
        ref={setAnchor}
        type="button"
        className="hit"
        data-venue-chip
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Venue: ${selected.name}. Change venue`}
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          maxWidth: "100%",
          fontSize: textPx(10),
          lineHeight: linePx(15),
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.025em",
          borderRadius: 999,
          padding: "4px 9px",
          background: c.pale,
          color: c.deep,
          border: 0,
          cursor: "pointer",
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</span>
        <ChevronDown size={11} strokeWidth={2.6} aria-hidden />
      </button>
      <PopupMenu
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        options={venues.map((v) => ({ value: v.gymId, label: v.name, note: v.hiddenAt ? "Hidden" : v.location || undefined }))}
        selected={selected.gymId}
        onSelect={(v) => onSelect(v)}
        width={240}
        align="left"
      />
    </div>
  );
}

const ATT_ICON: Record<AttentionIcon, typeof EyeOff> = {
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
 * DA1-015 S1 · "Needs your attention" (anchored popup, w 300, r 14, dim 0.18).
 * B15: `items` is business_attention's (attention.ts); null = the read failed,
 * shown as a retry row rather than "You're all caught up".
 */
export function AttentionPanel({ c, open, items, anchor, onClose, onAction, onRetry }: { c: DashPalette; open: boolean; items: AttentionItem[] | null; anchor: HTMLElement | null; onClose: () => void; onAction: (item: AttentionItem) => void; onRetry: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);
  if (!open || !pos) return null;
  const toneCol = (t: AttentionItem["tone"]) => (t === "high" ? c.high : t === "caution" ? c.caution : c.pDark);
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(36,31,27,0.18)", zIndex: 60 }} aria-hidden />
      <div
        role="dialog"
        aria-label="Needs your attention"
        data-attention-panel
        style={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          width: 300,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "min(620px, calc(100dvh - 120px))",
          overflowY: "auto",
          background: c.card,
          border: `1px solid ${c.dark ? "rgb(var(--th-a991fe) / 0.5)" : "rgb(var(--th-aea1dc) / 0.5)"}`,
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
          padding: 8,
          zIndex: 61,
        }}
      >
        <p style={{ margin: "2px 4px 8px", fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint, lineHeight: 1.5 }}>Needs your attention</p>
        {(items ?? []).map((a, n) => {
          const Icon = ATT_ICON[a.icon];
          return (
            <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 8, padding: "9px 10px", marginTop: n ? 6 : 0, border: `1px solid ${c.option}`, background: c.raised }}>
              <span style={{ display: "flex", color: toneCol(a.tone) }}>
                <Icon size={15} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12.5), fontWeight: 600, color: c.ink, lineHeight: 1.5 }}>
                {a.title}
                <span style={{ display: "block", fontSize: textPx(10.5), fontWeight: 500, marginTop: 1, color: c.faint }}>{a.sub}</span>
              </span>
              <button
                type="button"
                className="hit"
                onClick={() => onAction(a)}
                style={{ height: 26, padding: "0 10px", borderRadius: 8, background: c.fill, color: c.onFill, display: "flex", alignItems: "center", fontSize: textPx(11), fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, border: 0 }}
              >
                {a.action}
              </button>
            </div>
          );
        })}
        {items === null && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 8, padding: "9px 10px", border: `1px solid ${c.option}`, background: c.raised }}>
            <span style={{ display: "flex", color: c.high }}>
              <TriangleAlert size={15} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12.5), fontWeight: 600, color: c.ink, lineHeight: 1.5 }}>
              Couldn't check this right now
              <span style={{ display: "block", fontSize: textPx(10.5), fontWeight: 500, marginTop: 1, color: c.faint }}>What needs your attention shows here once it loads.</span>
            </span>
            <button
              type="button"
              className="hit"
              onClick={onRetry}
              style={{ height: 26, padding: "0 10px", borderRadius: 8, background: c.fill, color: c.onFill, display: "flex", alignItems: "center", fontSize: textPx(11), fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, border: 0 }}
            >
              Retry
            </button>
          </div>
        )}
        {items !== null && items.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 8, padding: "9px 10px", border: `1px solid ${c.option}`, background: c.raised }}>
            <span style={{ display: "flex", color: c.good }}>
              <Check size={15} strokeWidth={2.6} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12.5), fontWeight: 600, color: c.ink, lineHeight: 1.5 }}>
              You're all caught up
              <span style={{ display: "block", fontSize: textPx(10.5), fontWeight: 500, marginTop: 1, color: c.faint }}>Invites, under-booked classes, a hidden listing and open seats show up here.</span>
            </span>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

/** DA2-003 · "Finish setting up" (OURS-DA-get-set-up-per-type for gym and store). */
export function SetupCard({ c, steps, onStep, onDismiss }: { c: DashPalette; steps: SetupStep[]; onStep: (s: SetupStep) => void; onDismiss: () => void }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section aria-label="Finish setting up" data-setup-card style={{ position: "relative", background: c.pale, borderRadius: 24, padding: "18px 20px 10px", marginBottom: 20 }}>
      <button
        type="button"
        className="hit"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: c.deep, cursor: "pointer", background: "none", border: 0, padding: 0 }}
      >
        <X size={17} strokeWidth={2.2} aria-hidden />
      </button>
      <p style={{ fontSize: textPx(15), fontWeight: 800, paddingRight: 36, margin: 0, color: c.ink, lineHeight: 1.5 }}>Finish setting up</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 6px" }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Setup progress" style={{ flex: 1, height: 6, borderRadius: 999, background: c.paleTrack, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.round((done / steps.length) * 100)}%`, borderRadius: 999, background: c.primary }} />
        </div>
        <p style={{ fontSize: textPx(11.5), fontWeight: 700, color: c.deep, whiteSpace: "nowrap", margin: 0, lineHeight: 1.5 }}>{`${done} of ${steps.length} done`}</p>
      </div>
      {steps.map((s, k) => {
        const inner = (
          <>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: s.done ? c.primary : "transparent",
                border: `1.5px solid ${s.done ? c.primary : c.tert}`,
                color: c.onFill,
                boxSizing: "border-box",
              }}
            >
              {s.done && <Check size={12} strokeWidth={3} aria-hidden />}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(13), fontWeight: 600, color: s.done ? (c.hc ? c.inkSoft : c.faint) : c.ink, textDecoration: s.done ? "line-through" : "none", textAlign: "left", lineHeight: 1.5 }}>{s.label}</span>
            {!s.done && <span style={{ fontSize: textPx(11.5), fontWeight: 700, color: c.deep, whiteSpace: "nowrap", alignSelf: "flex-start", lineHeight: linePx(19.5) }}>{s.action}</span>}
          </>
        );
        const style = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: k ? `1px solid ${c.paleTrack}` : "none", width: "100%", minHeight: 44, boxSizing: "border-box" as const };
        return s.done ? (
          <div key={s.key} data-setup-step style={style}>
            {inner}
          </div>
        ) : (
          <button key={s.key} type="button" data-setup-step onClick={() => onStep(s)} aria-label={`${s.label}: ${s.action}`} style={{ ...style, background: "none", borderLeft: 0, borderRight: 0, borderBottom: 0, cursor: "pointer", font: "inherit" }}>
            {inner}
          </button>
        );
      })}
    </section>
  );
}

/**
 * OURS-DA-kept-features #1 · "Your listing" sheet: Active on Explore
 * (business_profiles.active). V6-88: the perk editor (#2) left the Dashboard
 * for MA1 Marketplace › Promotions › "Offers on your listing" (Batch 5).
 */
export function ListingSheet({
  c,
  open,
  onClose,
  active,
  onToggle,
}: {
  c: DashPalette;
  open: boolean;
  onClose: () => void;
  active: boolean;
  onToggle: (v: boolean) => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Your listing" tone="business">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, marginBottom: 16 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "rgb(var(--th-7d67d9))" }}>
          {active ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 600, color: c.ink }}>Active on Explore</span>
        <Toggle
          checked={active}
          onChange={(v) => {
            setError(null);
            void onToggle(v).then((m) => m && setError(m));
          }}
          label="Listing active"
        />
      </div>
      {error && <p style={{ fontSize: textPx(11.5), fontWeight: 700, color: c.high, margin: "0 0 8px" }}>{error}</p>}
    </BottomSheet>
  );
}
