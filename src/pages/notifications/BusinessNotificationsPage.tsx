import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { useBack } from "../../hooks/useBack";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { ConfirmationStrip } from "../../components/market/ConfirmationStrip";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useBusiness } from "../../components/business-more/useBusiness";
import { typeLabel } from "../../components/business-more/kind";
import {
  bizNotifLook,
  bizNotifTarget,
  BUSINESS_COPY,
  fetchMyNotifications,
  groupNotifications,
  isBusinessKind,
  markNotificationsRead,
  markReadLocally,
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
//   review_received (gold, star); bizNotifTarget is where each opens.
// DB6 (Database 20261210600000) has ONE inbox per profile and no business
// scope, so this page reads the owner's own my_notifications and keeps the
// business kinds (isBusinessKind) client-side. A server-side kind filter
// (my_notifications(p_kinds)) would be better: an owner with many member rows
// pages through them here. Each read (first load, "Load more") fetches server
// pages of FETCH rows until it has gathered PAGE business rows or the inbox
// ends, at most MAX_PAGES pages, then offers "Load more" if the inbox goes on;
// the cursor is the last row READ (any kind), not the last row shown.
// Read state as the client page: opening reads nothing; a tap marks that row
// (mark_notifications_read([id])) and opens its target; "Mark all read" sends
// the ids of the unread business rows loaded here, NEVER null (null would also
// clear the member inbox of the same profile). Unread business rows further
// down, not loaded yet, stay unread.
// awaiting DB stage DB12: nothing writes the hiring kinds yet (who sends
// application_received / hire_offer_* / hiring_fee_added / review_received,
// with which subject_type and payload keys); until then those rows never
// arrive and the page shows its quiet empty state (ours: the board draws
// none), never sample rows.

const PAGE = 30;
const FETCH = 100;
const MAX_PAGES = 5;
const OFFLINE_NOTE = "You're offline. Try again when you're connected.";
const BUSINESS_NOTIF_EMPTY = "Applications, offer replies, hiring fees, vouchers and reviews will show here.";

type Batch = { items: MemberNotification[]; cursor: NotificationCursor | null; more: boolean };
type Read = { ok: true; batch: Batch } | { ok: false; offline: boolean };

/** Server pages from `cursor` until PAGE business rows, the end, or MAX_PAGES. */
async function readBusinessRows(from: NotificationCursor | null): Promise<Read> {
  const items: MemberNotification[] = [];
  let cursor = from;
  for (let i = 0; i < MAX_PAGES; i++) {
    const r = await fetchMyNotifications(cursor, FETCH);
    if (!r.ok) return { ok: false, offline: !!r.offline };
    items.push(...r.value.items.filter((n) => isBusinessKind(n.kind)));
    cursor = notificationCursor(r.value.items) ?? cursor;
    if (!r.value.more) return { ok: true, batch: { items, cursor, more: false } };
    if (items.length >= PAGE) break;
  }
  return { ok: true, batch: { items, cursor, more: true } };
}

type State = { s: "loading" } | { s: "ok"; list: MemberNotification[]; cursor: NotificationCursor | null; more: boolean } | { s: "error"; offline: boolean };

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
      setState(r.ok ? { s: "ok", list: r.batch.items, cursor: r.batch.cursor, more: r.batch.more } : { s: "error", offline: r.offline });
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const list = state.s === "ok" ? state.list : [];
  const unread = unreadCount(list);
  /** `at` null puts the rows back to unread (a failed mark). */
  const setRead = (ids: Set<string>, at: string | null) =>
    setState((st) => (st.s !== "ok" ? st : { ...st, list: at ? markReadLocally(st.list, ids, at) : st.list.map((n) => (ids.has(n.id) ? { ...n, readAt: null } : n)) }));

  const loadMore = useCallback(async () => {
    if (state.s !== "ok" || !state.more || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await readBusinessRows(state.cursor);
    setLoadingMore(false);
    if (!r.ok) return setMoreFailed(true);
    setState((st) => (st.s === "ok" ? { s: "ok", list: [...st.list, ...r.batch.items], cursor: r.batch.cursor, more: r.batch.more } : st));
  }, [state, loadingMore]);

  const markAll = async () => {
    // Only the business rows loaded here, by id: never mark_notifications_read(null).
    const ids = list.filter((n) => !n.readAt).map((n) => n.id);
    if (busy || ids.length === 0) return;
    setBusy(true);
    setFailNote(null);
    const r = await markNotificationsRead(ids);
    setBusy(false);
    if (r.ok) setRead(new Set(ids), new Date().toISOString());
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
          {/* No business rows read yet (the inbox may go on past MAX_PAGES: "Load more" stays). */}
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
