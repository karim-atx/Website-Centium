import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { useBack } from "../../hooks/useBack";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { ConfirmationStrip } from "../../components/market/ConfirmationStrip";
import { FOCUS_CSS } from "../../components/market/usePress";
import { hexAlpha, liftInk } from "../../components/market/marketColor";
import {
  fetchMyNotifications,
  groupNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIF_GLYPHS,
  NOTIF_TONES,
  notifLook,
  notifWhen,
  unreadCount,
  type AppNotification,
} from "../../services/notifications";

// Market + Share 3.0 · W2 · the client's notifications (C-MO.4.10
// `notifClient`, D-36; Client Explore Screens lines 680–700, script `NI`,
// `NT`, `notifList`).
// - the header (margin −4 0 6 −10, gap 6): the 44 back box with the 22
//   chevron (stroke 2.2, --ink); a column: the eyebrow "Home" 10.5 / 15.75
//   700 0.1em caps --faint over "Notifications" 22 / 28 800; "Mark all read"
//   12.5 / 700 #7D6BB5 (a 44 target; disabled with nothing unread);
// - Today / Earlier (groupNotifications): the heading 10.5 / 700 0.1em caps
//   --faint (padding 12 0 6); a card radius 20, 1px rgba(36,31,27,0.11),
//   overflow hidden; rows padding 12 14, gap 12, a 0.5px
//   rgba(36,31,27,0.06) top line after the first, unread fill #FBFAFE: the 38
//   tile radius 12 (NT tone, NI glyph 18 stroke 1.9), the title 13.5 / 18 700
//   and the time 11 --faint (nowrap, gap 8), the body 12 / 17 #5B5349
//   (margin-top 2), the 8 unread dot #8F68F6 (transparent once read;
//   margin-top 6).
// Tapping a row marks it read and opens its target. Dark (not drawn, D-05):
// the page's dark palette, each tile its ink at 16% with the ink lifted.
// awaiting DB stage DB6: until the member inbox lands, my_notifications is
// `pending` and the page shows its empty state (ours, not drawn).

type State = { s: "loading" } | { s: "ok"; list: AppNotification[] } | { s: "pending" } | { s: "error"; offline: boolean };

export default function ClientNotificationsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app");
  const [state, setState] = useState<State>({ s: "loading" });
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failNote, setFailNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ s: "loading" });
    void fetchMyNotifications().then((r) => {
      if (cancelled) return;
      if (r.ok) setState({ s: "ok", list: r.value });
      else if (r.pending) setState({ s: "pending" });
      else setState({ s: "error", offline: !!r.offline });
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const list = state.s === "ok" ? state.list : [];
  const unread = unreadCount(list);
  const readNow = (ids: Set<string> | null) =>
    setState((st) => (st.s === "ok" ? { s: "ok", list: st.list.map((n) => (!n.readAt && (!ids || ids.has(n.id)) ? { ...n, readAt: new Date().toISOString() } : n)) } : st));

  const markAll = async () => {
    if (busy || unread === 0) return;
    setBusy(true);
    setFailNote(null);
    const r = await markAllNotificationsRead();
    setBusy(false);
    if (r.ok) readNow(null);
    else setFailNote(r.offline ? "You're offline. Try again when you're connected." : r.message);
  };

  const open = (n: AppNotification) => {
    if (!n.readAt) {
      readNow(new Set([n.id]));
      void markNotificationRead(n.id);
    }
    if (n.targetPath) navigate(n.targetPath);
  };

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "-4px 0 6px -10px" }}>
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="market-focus"
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", background: "none", border: 0, padding: 0, borderRadius: 12, color: m.ink, cursor: "pointer" }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: linePx(15.75) }}>Home</div>
          <h1 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(28) }}>Notifications</h1>
        </div>
        <button
          type="button"
          onClick={() => void markAll()}
          disabled={busy || unread === 0}
          className="market-focus"
          style={{ minHeight: 44, padding: 0, background: "none", border: 0, font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: dark ? m.pdark : "#7D6BB5", whiteSpace: "nowrap", cursor: busy || unread === 0 ? "default" : "pointer", opacity: unread === 0 ? 0.4 : 1 }}
        >
          Mark all read
        </button>
      </div>

      {failNote ? <ConfirmationStrip tone="error" text={failNote} style={{ marginTop: 6 }} /> : null}

      {state.s === "loading" ? (
        <MarketSkeleton radius={20} rows={3} count={2} height={160} label="Loading your notifications" style={{ marginTop: 12 }} />
      ) : state.s === "error" ? (
        <MarketError thing="your notifications" onRetry={() => setTick((x) => x + 1)} style={{ marginTop: 12 }} />
      ) : state.s === "pending" || list.length === 0 ? (
        <NotificationsEmpty />
      ) : (
        groupNotifications(list).map((g) => (
          <section key={g.heading} aria-labelledby={`notif-${g.heading}`}>
            <h2 id={`notif-${g.heading}`} style={{ margin: 0, padding: "12px 0 6px", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
              {g.heading}
            </h2>
            <div style={{ borderRadius: 20, border: `1px solid ${dark ? m.border : "rgba(36,31,27,0.11)"}`, overflow: "hidden" }}>
              {g.items.map((n, k) => (
                <NotificationRow key={n.id} n={n} first={k === 0} onOpen={() => open(n)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** One inbox row; `look` (optional, W4 B-MA.9) gives another scope's tile (default: the member kinds). */
export const NotificationRow: React.FC<{ n: AppNotification; first: boolean; onOpen: () => void; look?: ReturnType<typeof notifLook>; openable?: boolean }> = ({ n, first, onOpen, look: lookOf, openable }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const look = lookOf ?? notifLook(n.kind);
  const [tileBg, tileInk] = NOTIF_TONES[look.tone];
  const unread = !n.readAt;
  const when = notifWhen(n.createdAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="market-focus"
      aria-label={`${unread ? "Unread. " : ""}${n.title}. ${n.body} ${when}`}
      style={{
        width: "100%",
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderTop: first ? 0 : `0.5px solid ${dark ? m.div : "rgba(36,31,27,0.06)"}`,
        borderLeft: 0,
        borderRight: 0,
        borderBottom: 0,
        background: unread ? (dark ? "rgba(169,145,254,0.08)" : "#FBFAFE") : dark ? m.card : "#FFFFFF",
        font: "inherit",
        color: m.ink,
        textAlign: "left",
        cursor: (openable ?? !!n.targetPath) || unread ? "pointer" : "default",
      }}
    >
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 12, background: dark ? hexAlpha(tileInk, 0.16) : tileBg, color: dark ? liftInk(tileInk) : tileInk, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          <path d={NOTIF_GLYPHS[look.glyph]} />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: textPx(13.5), fontWeight: 700, lineHeight: linePx(18) }}>{n.title}</span>
          <span style={{ fontSize: textPx(11), color: m.faint, whiteSpace: "nowrap" }}>{when}</span>
        </span>
        {n.body ? <span style={{ display: "block", fontSize: textPx(12), lineHeight: linePx(17), color: dark ? m.ink2 : "#5B5349", marginTop: 2 }}>{n.body}</span> : null}
      </span>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: unread ? "#8F68F6" : "transparent", flex: "none", marginTop: 6 }} />
    </button>
  );
};

/** The empty / pending state; `body` (optional, W4 B-MA.9) is another scope's line. */
export const NotificationsEmpty: React.FC<{ body?: string }> = ({ body }) => {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px 0" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>
      <h2 style={{ margin: 0, fontSize: textPx(16), fontWeight: 800, color: m.ink }}>No notifications yet</h2>
      <p style={{ margin: 0, fontSize: textPx(13), lineHeight: 1.55, color: m.faint, maxWidth: 280 }}>{body ?? "Points, vouchers and booking updates will show here."}</p>
    </div>
  );
};
