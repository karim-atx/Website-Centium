import React, { useCallback, useEffect, useState } from "react";
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
  clientNotificationTarget,
  fetchMyNotifications,
  groupNotifications,
  markNotificationsRead,
  markReadLocally,
  NOTIF_GLYPHS,
  NOTIF_TONES,
  notificationCopy,
  notificationCursor,
  notifLook,
  notifWhen,
  unreadCount,
  type MemberNotification,
  type NotificationCopyTable,
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
// Dark (not drawn, D-05): the page's dark palette, each tile its ink at 16%
// with the ink lifted.
// DB6 (Database 2a5b122, 20261210600000): the rows are my_notifications, PAGE
// at a time; "Load more" (not drawn; Points history's) passes the last row
// shown as (p_before, p_before_id). The words are the client's copy for the
// row's title_key (notificationCopy; an unknown key reads "New notification",
// never the key). Read state as the board: opening the page reads nothing;
// tapping a row marks that row read (mark_notifications_read([id])) and opens
// its target (clientNotificationTarget); "Mark all read" is
// mark_notifications_read(null). No rows: the empty state (ours, not drawn).

const PAGE = 30;
const OFFLINE_NOTE = "You're offline. Try again when you're connected.";

type State = { s: "loading" } | { s: "ok"; list: MemberNotification[]; more: boolean } | { s: "error"; offline: boolean };

export default function ClientNotificationsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app");
  const [state, setState] = useState<State>({ s: "loading" });
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failNote, setFailNote] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ s: "loading" });
    void fetchMyNotifications(null, PAGE).then((r) => {
      if (cancelled) return;
      if (r.ok) setState({ s: "ok", list: r.value.items, more: r.value.more });
      else setState({ s: "error", offline: !!r.offline });
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const list = state.s === "ok" ? state.list : [];
  const unread = unreadCount(list);
  /** `at` null puts the rows back to unread (a failed single mark). */
  const setRead = (ids: Set<string> | null, at: string | null) =>
    setState((st) =>
      st.s !== "ok" ? st : { ...st, list: at ? markReadLocally(st.list, ids, at) : st.list.map((n) => (ids && ids.has(n.id) ? { ...n, readAt: null } : n)) }
    );

  const loadMore = useCallback(async () => {
    if (state.s !== "ok" || state.list.length === 0 || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await fetchMyNotifications(notificationCursor(state.list), PAGE);
    setLoadingMore(false);
    if (!r.ok) return setMoreFailed(true);
    setState((st) => (st.s === "ok" ? { s: "ok", list: [...st.list, ...r.value.items], more: r.value.more } : st));
  }, [state, loadingMore]);

  const markAll = async () => {
    if (busy || unread === 0) return;
    setBusy(true);
    setFailNote(null);
    const r = await markNotificationsRead(null);
    setBusy(false);
    if (r.ok) setRead(null, new Date().toISOString());
    else setFailNote(r.offline ? OFFLINE_NOTE : r.message);
  };

  const open = (n: MemberNotification) => {
    const target = clientNotificationTarget(n);
    if (!n.readAt) {
      const ids = new Set([n.id]);
      setRead(ids, new Date().toISOString());
      setFailNote(null);
      void markNotificationsRead([n.id]).then((r) => {
        if (r.ok || target) return;
        // Still on this page (the row opens nothing): the dot comes back.
        setRead(ids, null);
        setFailNote(r.offline ? OFFLINE_NOTE : r.message);
      });
    }
    if (target) navigate(target);
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
      ) : list.length === 0 ? (
        <NotificationsEmpty />
      ) : (
        <>
          {groupNotifications(list).map((g) => (
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
          ))}
          {state.s === "ok" && state.more ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="market-focus"
              style={{ width: "100%", marginTop: 16, minHeight: 44, borderRadius: 12, border: `1px solid ${m.border}`, background: "none", font: "inherit", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer", opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}
          {moreFailed ? <MarketError thing="more of your notifications" onRetry={() => void loadMore()} style={{ marginTop: 10 }} /> : null}
        </>
      )}
    </div>
  );
}

/**
 * One inbox row. The optional props are W4 B-MA.9's (the business inbox): `look`
 * is another inbox's tile, `copy` its copy table, `openable` whether its row
 * opens a page; left out, the row is the client's (notifLook, CLIENT_COPY,
 * clientNotificationTarget).
 */
export const NotificationRow: React.FC<{
  n: MemberNotification;
  first: boolean;
  onOpen: () => void;
  look?: ReturnType<typeof notifLook>;
  copy?: NotificationCopyTable;
  openable?: boolean;
}> = ({ n, first, onOpen, look: lookOf, copy: table, openable }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const look = lookOf ?? notifLook(n.kind);
  const copy = notificationCopy(n, table);
  const opens = openable ?? clientNotificationTarget(n) !== null;
  const [tileBg, tileInk] = NOTIF_TONES[look.tone];
  const unread = !n.readAt;
  const when = notifWhen(n.createdAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="market-focus"
      aria-label={`${unread ? "Unread. " : ""}${copy.title}. ${copy.body ? copy.body + " " : ""}${when}`}
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
        cursor: opens || unread ? "pointer" : "default",
      }}
    >
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 12, background: dark ? hexAlpha(tileInk, 0.16) : tileBg, color: dark ? liftInk(tileInk) : tileInk, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          <path d={NOTIF_GLYPHS[look.glyph]} />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: textPx(13.5), fontWeight: 700, lineHeight: linePx(18) }}>{copy.title}</span>
          <span style={{ fontSize: textPx(11), color: m.faint, whiteSpace: "nowrap" }}>{when}</span>
        </span>
        {copy.body ? <span style={{ display: "block", fontSize: textPx(12), lineHeight: linePx(17), color: dark ? m.ink2 : "#5B5349", marginTop: 2 }}>{copy.body}</span> : null}
      </span>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: unread ? "#8F68F6" : "transparent", flex: "none", marginTop: 6 }} />
    </button>
  );
};

/** The empty state; `body` (optional, W4 B-MA.9) is another inbox's line. */
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
