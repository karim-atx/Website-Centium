import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { useBack } from "../../hooks/useBack";
import { useInboxRealtime } from "../../hooks/useInboxRealtime";
import { useApp } from "../../context/AppContext";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { ConfirmationStrip } from "../../components/market/ConfirmationStrip";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useBusiness } from "../../components/business-more/useBusiness";
import { typeLabel } from "../../components/business-more/kind";
import {
  applyReadChanges,
  bizNotifLook,
  bizNotifTarget,
  BUSINESS_COPY,
  BUSINESS_KINDS,
  fetchMyNotifications,
  groupNotifications,
  hasNewRows,
  markNotificationsRead,
  markReadLocally,
  mergeFirstPage,
  notificationCursor,
  unreadCount,
  type MemberNotification,
  type NotificationCursor,
} from "../../services/notifications";
import { NotificationRow, NotificationsEmpty } from "./ClientNotificationsPage";

// Market + Share 3.0 · W4 · B-MA.9 the business's notifications (Business
// Hiring Screens `notifBiz`, markup lines 340–358, script `NI`, `NT`,
// `notifList`; D-38: the dashboard bell's popup opens it from its top row).
// - the header (margin −4 0 6 −10, gap 6): the 44 back box with the 22
//   chevron (stroke 2.2); the eyebrow (the business type, "Gym") 10.5 / 15.75
//   700 0.1em caps --faint over "Notifications" 22 / 28 800; "Mark all read"
//   12.5 / 700 #7D6BB5 (a 44 target; dimmed with nothing unread);
// - Today / Earlier: the heading 10.5 / 700 0.1em caps (padding 12 0 6); a
//   card radius 20, 1px rgba(36,31,27,0.11); rows padding 12 14, gap 12, a
//   0.5px top line after the first, unread fill #FBFAFE: the 38 tile radius 12
//   (NT tone, NI glyph 18 stroke 1.9), the title 13.5 / 18 700, the time 11
//   (12-hour today, the weekday this week), the body 12 / 17, the 8 unread dot
//   #8F68F6 (the client page's NotificationRow, with the business tiles and
//   BUSINESS_COPY);
// - the kinds the board draws: application_received (lav, send),
//   hire_offer_accepted (teal, ticket check), hiring_fee_added (gold, bill),
//   hire_offer_declined (grey, x), voucher_redeemed (blue, QR),
//   gym_review_received (gold, star); BUSINESS_FILLS interpolates the
//   documented payload keys, bizNotifTarget is where each opens.
// The member inbox (Database 20261210600000, HANDOVER_API Release 1
// "Notifications") filtered on the server: my_notifications(p_before,
// p_limit, p_before_id, p_kinds = BUSINESS_KINDS), PAGE rows at a time,
// "Load more" with the last row shown as (p_before, p_before_id).
// Read state as the client page: opening reads nothing; a tap marks that row
// (mark_notifications_read([id])) and opens its target; "Mark all read" is
// mark_notifications_read(null, BUSINESS_KINDS): every unread business row,
// loaded or not, and never the owner's other kinds.
// awaiting DB stage DB12: nothing writes the hiring kinds or
// gym_review_received yet (redeem_offer and admin_set_offer_hidden write the
// two Release 1 owner kinds); until then those rows never arrive and the page
// shows its quiet empty state (ours: the board draws none), never sample rows.

const PAGE = 30;
const OFFLINE_NOTE = "You're offline. Try again when you're connected.";
const BUSINESS_NOTIF_EMPTY = "Applications, offer replies, hiring fees, vouchers and reviews will show here.";

type Read = { ok: true; items: MemberNotification[]; more: boolean } | { ok: false; offline: boolean };

/** One page of business rows after `cursor` (the last row shown); the server filters the kinds. */
async function readBusinessRows(cursor: NotificationCursor | null): Promise<Read> {
  const r = await fetchMyNotifications(cursor, PAGE, BUSINESS_KINDS);
  return r.ok ? { ok: true, items: r.value.items, more: r.value.more } : { ok: false, offline: !!r.offline };
}

type State = { s: "loading" } | { s: "ok"; list: MemberNotification[]; more: boolean } | { s: "error"; offline: boolean };

export default function BusinessNotificationsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app/business");
  const biz = useBusiness();
  const [state, setState] = useState<State>({ s: "loading" });
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failNote, setFailNote] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readBusinessRows(null).then((r) => {
      if (cancelled) return;
      setState(r.ok ? { s: "ok", list: r.items, more: r.more } : { s: "error", offline: r.offline });
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Live (Database 73ea87b, as the client page): a new business-kind row
  // re-reads the FIRST page only and merges it on top (mergeFirstPage; pages
  // already loaded stay); a read_at changed elsewhere is applied to the row
  // shown without a read. A reconnect re-reads the first page once.
  const { authUserId } = useApp();
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useInboxRealtime(authUserId, "biz-page", BUSINESS_KINDS, (changes, resync) => {
    const st = stateRef.current;
    if (st.s !== "ok") return;
    if (changes.length) setState((x) => (x.s === "ok" ? { ...x, list: applyReadChanges(x.list, changes) } : x));
    if (!resync && !hasNewRows(st.list, changes)) return;
    void readBusinessRows(null).then((r) => {
      if (!r.ok) return;
      setState((x) => (x.s === "ok" ? { s: "ok", ...mergeFirstPage(x.list, x.more, r) } : x));
    });
  });

  const list = state.s === "ok" ? state.list : [];
  const unread = unreadCount(list);
  /** `ids` null = every row shown; `at` null puts the rows back to unread (a failed mark). */
  const setRead = (ids: Set<string> | null, at: string | null) =>
    setState((st) => (st.s !== "ok" ? st : { ...st, list: at ? markReadLocally(st.list, ids, at) : st.list.map((n) => (!ids || ids.has(n.id) ? { ...n, readAt: null } : n)) }));

  const loadMore = useCallback(async () => {
    if (state.s !== "ok" || !state.more || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await readBusinessRows(notificationCursor(state.list));
    setLoadingMore(false);
    if (!r.ok) return setMoreFailed(true);
    setState((st) => (st.s === "ok" ? { s: "ok", list: [...st.list, ...r.items], more: r.more } : st));
  }, [state, loadingMore]);

  const markAll = async () => {
    // Every unread business row, loaded or not (null ids scoped to BUSINESS_KINDS); never the owner's other kinds.
    if (busy || unread === 0) return;
    setBusy(true);
    setFailNote(null);
    const r = await markNotificationsRead(null, BUSINESS_KINDS);
    setBusy(false);
    if (r.ok) setRead(null, new Date().toISOString());
    else setFailNote(r.offline ? OFFLINE_NOTE : r.message);
  };

  const open = (n: MemberNotification) => {
    const target = bizNotifTarget(n);
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

  const eyebrow = biz.business ? typeLabel(biz.business.type) : "";

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
          <div aria-hidden={!eyebrow || undefined} style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: linePx(15.75), minHeight: linePx(15.75) }}>
            {eyebrow}
          </div>
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
        <MarketError thing="your notifications" onRetry={() => {
            setState({ s: "loading" });
            setTick((x) => x + 1);
          }} style={{ marginTop: 12 }} />
      ) : (
        <>
          {list.length === 0 ? <NotificationsEmpty body={BUSINESS_NOTIF_EMPTY} /> : null}
          {groupNotifications(list).map((g) => (
            <section key={g.heading} aria-labelledby={`biz-notif-${g.heading}`}>
              <h2 id={`biz-notif-${g.heading}`} style={{ margin: 0, padding: "12px 0 6px", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
                {g.heading}
              </h2>
              <div style={{ borderRadius: 20, border: `1px solid ${dark ? m.border : "rgba(36,31,27,0.11)"}`, overflow: "hidden" }}>
                {g.items.map((n, k) => (
                  <NotificationRow key={n.id} n={n} first={k === 0} look={bizNotifLook(n.kind)} copy={BUSINESS_COPY} openable={bizNotifTarget(n) !== null} onOpen={() => open(n)} />
                ))}
              </div>
            </section>
          ))}
          {state.more ? (
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
