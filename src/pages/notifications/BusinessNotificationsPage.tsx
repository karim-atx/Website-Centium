import { useEffect, useState } from "react";
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
  fetchBusinessNotifications,
  groupNotifications,
  markAllBusinessNotificationsRead,
  markNotificationRead,
  unreadCount,
  type AppNotification,
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
//   #8F68F6 (the client page's NotificationRow, with the business tiles);
// - the kinds the board draws: application_received (lav, send),
//   hire_offer_accepted (teal, ticket check), hiring_fee_added (gold, bill),
//   hire_offer_declined (grey, x), voucher_redeemed (blue, QR), review (gold,
//   star); bizNotifTarget is where each opens.
// awaiting DB stage DB6 (my_notifications 'business') / DB12 (the hiring
// kinds): until then the read is `pending` and the page shows its quiet
// empty state (ours: the board draws none), never sample rows.

type State = { s: "loading" } | { s: "ok"; list: AppNotification[] } | { s: "pending" } | { s: "error" };

const BUSINESS_NOTIF_EMPTY = "Applications, offer replies, hiring fees, vouchers and reviews will show here.";

export default function BusinessNotificationsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app/business");
  const biz = useBusiness();
  const businessId = biz.business?.id ?? null;
  // The answer for one business and one try; anything else reads as loading.
  const [result, setResult] = useState<{ key: string; v: State } | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failNote, setFailNote] = useState<string | null>(null);

  const bizLoading = biz.loading && !biz.business;
  const key = `${businessId}:${tick}`;
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    // awaiting DB stage DB6 / DB12
    void fetchBusinessNotifications(businessId).then((r) => {
      if (cancelled) return;
      setResult({ key: `${businessId}:${tick}`, v: r.ok ? { s: "ok", list: r.value } : r.pending ? { s: "pending" } : { s: "error" } });
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, tick]);
  const state: State = bizLoading ? { s: "loading" } : !businessId ? (biz.error ? { s: "error" } : { s: "pending" }) : result && result.key === key ? result.v : { s: "loading" };
  const setState = (f: (st: State) => State) => setResult((r) => (r ? { ...r, v: f(r.v) } : r));

  const list = state.s === "ok" ? state.list : [];
  const unread = unreadCount(list);
  const readNow = (ids: Set<string> | null) =>
    setState((st) => (st.s === "ok" ? { s: "ok", list: st.list.map((n) => (!n.readAt && (!ids || ids.has(n.id)) ? { ...n, readAt: new Date().toISOString() } : n)) } : st));

  const markAll = async () => {
    if (busy || unread === 0 || !businessId) return;
    setBusy(true);
    setFailNote(null);
    const r = await markAllBusinessNotificationsRead(businessId);
    setBusy(false);
    if (r.ok) readNow(null);
    else setFailNote(r.offline ? "You're offline. Try again when you're connected." : r.message);
  };

  const open = (n: AppNotification) => {
    if (!n.readAt) {
      readNow(new Set([n.id]));
      void markNotificationRead(n.id);
    }
    const to = bizNotifTarget(n);
    if (to) navigate(to);
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
        <MarketError thing="your notifications" onRetry={() => (biz.error && !businessId ? biz.reload() : setTick((x) => x + 1))} style={{ marginTop: 12 }} />
      ) : state.s === "pending" || list.length === 0 ? (
        <NotificationsEmpty body={BUSINESS_NOTIF_EMPTY} />
      ) : (
        groupNotifications(list).map((g) => (
          <section key={g.heading} aria-labelledby={`biz-notif-${g.heading}`}>
            <h2 id={`biz-notif-${g.heading}`} style={{ margin: 0, padding: "12px 0 6px", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
              {g.heading}
            </h2>
            <div style={{ borderRadius: 20, border: `1px solid ${dark ? m.border : "rgba(36,31,27,0.11)"}`, overflow: "hidden" }}>
              {g.items.map((n, k) => (
                <NotificationRow key={n.id} n={n} first={k === 0} look={bizNotifLook(n.kind)} openable={!!bizNotifTarget(n)} onOpen={() => open(n)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
