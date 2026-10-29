import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Banknote,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarX,
  Check,
  ChevronLeft,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Info,
  ListChecks,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { useOnline } from "../../hooks/useOnline";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { linePx, textPx } from "../../theme/textSize";
import { marketPalette, SEGMENT_STEPS, type MarketPalette } from "../../theme/marketTokens";
import { hexAlpha, liftInk } from "../market/marketColor";
import { FOCUS_CSS } from "../market/usePress";
import { inviteFromNotification } from "../../services/team-hiring";
import { INK } from "./proInk";
import type { ProLane } from "./subtypeLanes";
import { EmptyState } from "./EmptyState";
import { OfflineLine, ProError } from "./states";
import { Initials } from "./home/ProTrendRing";
import { initialsOf } from "./home/initials";
import { notificationText, whenLabel, type NotificationText } from "./home/notificationText";
import type { ProInbox, ProRequest } from "./home/useProInbox";
import { HubCta, HubCtaRow } from "./home/HubCta";
import type { ProNotification } from "../../services/pro/notifications";
import type { RecentDecline } from "../../services/pro/requests";
import type { MyEmployment } from "../../services/business-team/employment";
import type { PendingHire } from "../../services/hires/pro";
import { PendingHiresSection } from "../hire-pro/PendingHiresSection";
import { FreePeriodEnded, FreePeriodNotice } from "../professionals/FreePeriodNotice";
import type { FreePeriodFacts } from "../../services/subscription-tiers/freePeriodCopy";

/**
 * Release 3 · NotificationsHub (HANDOVER e, HO7, HO9, HO10, HO14 to HO17;
 * gen/hub5.js hubPanel5). Market + Share 3.0 W4 (P-MA.7, D-37): restyled
 * as the handover notifications page, a full-screen panel over the screen
 * the bell sits on: back header, Mark all read, the live Requests / To
 * review / Updates kept as a filter sub-track, Today / Earlier groups of
 * handover rows (see the row and panel comments below).
 *
 * Requests holds what needs an answer: people asking to work with you, with
 * the plan they chose and their message (Accept, Decline with a reason; for 5
 * minutes after a decline the row reads "Declined · Undo"), business team
 * invitations from business_employees (never a notification row; FINAL_PLAN
 * 2.4: replaces the old team invites notice), hires waiting for payment
 * (PendingHiresSection, HO7 row style: Confirm payment, Decline with a
 * reason), and any other request the database sends. To review and Updates
 * are professional_notifications rows; the counts are the unread ones.
 * Opening a row marks it read; its X dismisses it (deletes the own row; not
 * drawn in the frames). Clear all (the frame's footer, 12.5 / 700 text.soft
 * over a b06 rule) asks first (CentredPopup "Clear all notifications?",
 * W9 post-review); only its "Clear all" calls
 * clear_my_professional_notifications().
 */
export type HubTab = "requests" | "review" | "updates";

export interface HubToast {
  tone: "ok" | "info";
  text: string;
  action?: { label: string; onClick: () => void };
}

const ICONS: Record<NotificationText["icon"], LucideIcon> = {
  "calendar-check": CalendarCheck,
  "calendar-x": CalendarX,
  message: MessageCircle,
  star: Star,
  banknote: Banknote,
  "user-plus": UserPlus,
  clipboard: ClipboardList,
  shield: ShieldCheck,
  share: Share2,
  bell: Bell,
  activity: Activity,
};

const REVIEW_LABEL: Record<ProLane, string> = {
  full_coaching: "Check-ins",
  nutrition: "Food journals",
  clinical_overview: "Changes and follow-ups",
};
const REVIEW_EMPTY: Record<ProLane, string> = {
  full_coaching: "Check-ins clients send appear here.",
  nutrition: "Food journals clients send for feedback appear here.",
  clinical_overview: "Notable changes in shared data and follow-ups due appear here.",
};
const REVIEW_ICON: Record<ProLane, LucideIcon> = { full_coaching: ClipboardCheck, nutrition: BookOpenCheck, clinical_overview: ListChecks };

/** Request rows the dedicated groups already show (live data wins). */
const COVERED = new Set(["client_request", "hire"]);

export const NotificationsHub: React.FC<{
  open: boolean;
  onClose: () => void;
  tab: HubTab;
  onTab: (t: HubTab) => void;
  lane: ProLane;
  inbox: ProInbox;
  now: Date;
  toast: HubToast | null;
  plan: FreePeriodFacts | null;
  freeEnded: boolean;
  planLabel: string | null;
  hireReloadKey: number;
  onAccept: (r: ProRequest) => void;
  onDecline: (r: ProRequest) => void;
  /** "Declined · Undo" (undo_client_request_decline), for 5 minutes after a decline. */
  onUndo: (d: RecentDecline) => void;
  onInvitation: (e: MyEmployment, accept: boolean) => void;
  invitationBusy: string | null;
  onHireDecline: (h: PendingHire) => void;
  onHireConfirmed: () => void;
  onOpen: (n: ProNotification) => void;
  onBusinesses: () => void;
}> = (p) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  useBackCloses(p.open, p.onClose);
  const online = useOnline();
  // Clear all asks first (W9 post-review); only "Clear all" in the popup calls
  // clear_my_professional_notifications().
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  useEffect(() => {
    if (p.open) return;
    setConfirmClear(false);
    setClearError(null);
  }, [p.open]);
  const runClearAll = async () => {
    if (clearBusy) return;
    if (!online) return setClearError("You're offline. Try again when you're connected.");
    setClearBusy(true);
    setClearError(null);
    const ok = await p.inbox.clearAll();
    setClearBusy(false);
    if (!ok) return setClearError("Couldn't clear your notifications. Try again.");
    setConfirmClear(false);
  };

  useEffect(() => {
    if (!p.open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A popup opened from the hub closes first.
      if ([...document.querySelectorAll('[aria-modal="true"]')].some((el) => el !== panel.current)) return;
      p.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open]);

  if (!p.open) return null;
  const { inbox } = p;
  const otherRequests = inbox.notifications.filter((n) => n.kind === "request" && !COVERED.has(n.subjectType));
  const review = inbox.notifications.filter((n) => n.kind === "to_review");
  const updates = inbox.notifications.filter((n) => n.kind === "update");
  const reqN = inbox.requests.length + inbox.invitations.length + inbox.hires.length + otherRequests.filter((n) => !n.readAt).length;
  const revN = review.filter((n) => !n.readAt).length;
  const updN = updates.filter((n) => !n.readAt).length;
  const anyUnread = inbox.unread > 0;
  // The unread dot on a request row follows its notification, when there is one.
  const unreadFor = (subjectId: string) => {
    const n = inbox.notifications.find((x) => x.subjectId === subjectId);
    return n ? !n.readAt : true;
  };

  const dot = (on: boolean) => (
    <span aria-hidden className="shrink-0" style={{ width: 8, height: 8, borderRadius: 9999, background: on ? INK.pr : "transparent", marginTop: 6 }} />
  );

  // W6: a sent form (pro.form.submitted / .flagged / .urgent, subject form_response)
  // opens its review (HO20 for a check-in, CL10 for an intake) at
  // /app/more/forms/responses/{id}; every other row goes to the page's onOpen.
  const openRow = (n: ProNotification) => {
    // W4 P-MA.5.4: an existing-team invite (the member inbox's
    // existing_team_invite row, Database 20261210600000) opens its dialog on
    // Opportunities (router state, read by OpportunitiesTab).
    // invite_existing_team writes it (Database Release 2) when the invited email has an account.
    const invite = inviteFromNotification(n);
    if (invite) {
      p.onClose();
      navigate("/app/pro/marketplace/opportunities", { state: { existingTeamInvite: invite } });
      return;
    }
    if (n.subjectType === "form_response" && n.subjectId) {
      void inbox.markRead([n.id]);
      p.onClose();
      navigate(`/app/more/forms/responses/${n.subjectId}`);
      return;
    }
    p.onOpen(n);
  };

  // P-MA.7 row (Professional Marketplace Screens `notifList`): padding 12 14,
  // gap 12, a 0.5px --div top line after the first, unread fill #FBFAFE; the
  // 38 tile radius 12 (the tone's step tint and ink, icon 18 stroke 1.9), the
  // title 13.5 / 18 700 and the time 11 --faint (nowrap, gap 8), the body
  // 12 / 17 --ink2 (margin-top 2), the 8 unread dot #8F68F6. KEPT (not
  // drawn): the action chip (Review / Open / Share) and the dismiss X.
  const notificationRow = (n: ProNotification, i: number, _list: ProNotification[], withAction?: string) => {
    const t = notificationText(n, inbox.names);
    const Icon = ICONS[t.icon];
    const [tileBg, tileInk] = hubTone(t.tone, m, dark);
    const unread = !n.readAt;
    const when = whenLabel(n.createdAt, p.now);
    return (
      <div
        key={n.id}
        className="flex"
        style={{ alignItems: "flex-start", gap: 4, padding: "0 6px 0 0", borderTop: i === 0 ? 0 : `0.5px solid ${dark ? m.div : "rgba(36,31,27,0.06)"}`, background: unread ? (dark ? "rgba(169,145,254,0.08)" : "#FBFAFE") : m.card }}
      >
        <button type="button" onClick={() => openRow(n)} className="market-focus flex-1 min-w-0 flex text-left" style={{ alignItems: "flex-start", gap: 12, padding: "12px 0 12px 14px", background: "none", border: 0, font: "inherit", color: m.ink, cursor: "pointer" }}>
          {withAction && n.clientId ? (
            <Initials text={initialsOf(inbox.names[n.clientId] ?? t.title)} size={38} />
          ) : (
            <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: tileBg }}>
              <Icon size={18} strokeWidth={1.9} aria-hidden style={{ color: tileInk }} />
            </span>
          )}
          <span className="flex-1 min-w-0 block">
            <span className="flex justify-between" style={{ gap: 8 }}>
              <span style={{ fontSize: textPx(13.5), fontWeight: 700, lineHeight: linePx(18), color: m.ink }}>{t.title}</span>
              <span style={{ fontSize: textPx(11), color: m.faint, whiteSpace: "nowrap" }}>{when}</span>
            </span>
            {t.line ? <span className="block" style={{ fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>{t.line}</span> : null}
            {withAction && (
              <span className="inline-flex items-center" style={{ marginTop: 8, height: 30, padding: "0 12px", borderRadius: 10, background: m.pale, color: m.pdark, fontSize: textPx(12), fontWeight: 700 }}>
                {withAction}
              </span>
            )}
          </span>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: unread ? "#8F68F6" : "transparent", flex: "none", marginTop: 6 }} />
        </button>
        <button
          type="button"
          aria-label={`Dismiss: ${t.title}`}
          onClick={() => void inbox.dismiss(n.id)}
          className="tap market-focus relative flex items-center justify-center shrink-0 before:absolute before:-inset-[8px] before:content-['']"
          style={{ width: 28, height: 28, marginTop: 12, background: "none", border: 0 }}
        >
          <X size={14} strokeWidth={2} aria-hidden style={{ color: m.faint }} />
        </button>
      </div>
    );
  };

  /** Today / Earlier groups (P-MA.7): caps heading, then a card radius 20, 1px --border. */
  const grouped = (list: ProNotification[], action: (n: ProNotification) => string | undefined) => {
    const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const today = list.filter((n) => day(new Date(n.createdAt)) === day(p.now));
    const earlier = list.filter((n) => day(new Date(n.createdAt)) !== day(p.now));
    return [
      ["Today", today],
      ["Earlier", earlier],
    ]
      .filter(([, items]) => (items as ProNotification[]).length > 0)
      .map(([h, items]) => {
        const rows = items as ProNotification[];
        return (
          <section key={h as string} aria-label={h as string}>
            <h3 style={{ margin: 0, padding: "12px 0 6px", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>{h as string}</h3>
            <div style={{ borderRadius: 20, border: `1px solid ${dark ? m.border : "rgba(36,31,27,0.11)"}`, overflow: "hidden", background: m.card }}>
              {rows.map((n, i) => notificationRow(n, i, rows, action(n)))}
            </div>
          </section>
        );
      });
  };

  const requestsBody = () => {
    const empty = inbox.requests.length + inbox.declined.length + inbox.invitations.length + inbox.hires.length + otherRequests.length === 0;
    return (
      <>
        {p.freeEnded ? <FreePeriodEnded className="mb-2" /> : <FreePeriodNotice plan={p.plan} className="mb-2" />}
        {inbox.requests.map((r) => (
          <div key={r.id} className="flex" style={{ gap: 10, padding: "12px 0", borderBottom: `1px solid ${INK.b06}` }}>
            {dot(unreadFor(r.id))}
            <Initials text={initialsOf(r.name)} size={40} tone="gold" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between" style={{ gap: 8 }}>
                <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{r.name}</p>
                <span style={{ fontSize: textPx(11), color: INK.chT, whiteSpace: "nowrap" }}>{whenLabel(r.requestedAt, p.now)}</span>
              </div>
              <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>{requestLine(r, p.lane)}</p>
              {r.message && (
                <p className="truncate" style={{ fontSize: textPx(12), color: INK.chF, marginTop: 2, lineHeight: 1.4 }}>
                  "{r.message}"
                </p>
              )}
              <HubCtaRow>
                <HubCta variant="secondary" icon={X} label="Decline" ariaLabel={`Decline ${r.name}`} onClick={() => p.onDecline(r)} />
                <HubCta icon={Check} label="Accept" ariaLabel={`Accept ${r.name}`} onClick={() => p.onAccept(r)} />
              </HubCtaRow>
            </div>
          </div>
        ))}
        {inbox.declined.map((d) => (
          <div key={d.id} className="flex items-center" style={{ gap: 10, padding: "12px 0", borderBottom: `1px solid ${INK.b06}` }}>
            {dot(false)}
            <Initials text={initialsOf(d.name)} size={40} tone="gold" />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{d.name}</p>
              <p className="flex items-center flex-wrap" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, columnGap: 4 }}>
                Declined ·
                <button
                  type="button"
                  onClick={() => p.onUndo(d)}
                  aria-label={`Undo declining ${d.name}`}
                  className="tap relative before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']"
                  style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
                >
                  Undo
                </button>
              </p>
            </div>
          </div>
        ))}
        {inbox.invitations.map((e) => (
          <div key={e.businessId} className="flex" style={{ gap: 10, padding: "12px 0", borderBottom: `1px solid ${INK.b06}` }}>
            {dot(true)}
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 9999, background: INK.prPale }}>
              <Building2 size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prDeep }} />
            </span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{e.businessName} invited you to their team</p>
              <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>{e.role ? `As ${e.role}` : "Team invitation"}</p>
              {e.message && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 2, lineHeight: 1.4 }}>"{e.message}"</p>}
              <HubCtaRow>
                <HubCta
                  variant="secondary"
                  icon={X}
                  label="Decline"
                  ariaLabel={`Decline ${e.businessName}'s invitation`}
                  disabled={p.invitationBusy === e.businessId}
                  onClick={() => p.onInvitation(e, false)}
                />
                <HubCta icon={Check} label="Accept" ariaLabel={`Accept ${e.businessName}'s invitation`} disabled={p.invitationBusy === e.businessId} onClick={() => p.onInvitation(e, true)} />
              </HubCtaRow>
              <button type="button" onClick={p.onBusinesses} className="tap" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
                Businesses
              </button>
            </div>
          </div>
        ))}
        <PendingHiresSection planLabel={p.planLabel} onConfirmed={p.onHireConfirmed} onDecline={p.onHireDecline} reloadKey={p.hireReloadKey} now={p.now} />
        {otherRequests.length > 0 && (
          <div style={{ marginTop: 12, borderRadius: 20, border: `1px solid ${dark ? m.border : "rgba(36,31,27,0.11)"}`, overflow: "hidden", background: m.card }}>
            {otherRequests.map((n, i) => notificationRow(n, i, otherRequests))}
          </div>
        )}
        {empty && <EmptyState icon={UserPlus} title="No new requests" line="When someone asks to work with you, they appear here to accept or decline." />}
      </>
    );
  };

  const ReviewIcon = REVIEW_ICON[p.lane];
  const body =
    inbox.loading && inbox.notifications.length === 0 ? (
      <div role="status" aria-label="Loading" className="flex flex-col" style={{ gap: 10, padding: "12px 0" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-cream-soft animate-skeleton-pulse" style={{ height: 52 }} />
        ))}
      </div>
    ) : inbox.error && inbox.notifications.length === 0 && p.tab !== "requests" ? (
      <div style={{ padding: "12px 0" }}>
        <ProError onRetry={inbox.reload} />
      </div>
    ) : p.tab === "requests" ? (
      requestsBody()
    ) : p.tab === "review" ? (
      review.length === 0 ? (
        <EmptyState icon={ReviewIcon} title="Nothing to review" line={REVIEW_EMPTY[p.lane]} />
      ) : (
        <>
          <p style={{ fontSize: textPx(12), fontWeight: 600, color: m.faint, padding: "8px 0 0" }}>{REVIEW_LABEL[p.lane]}</p>
          {grouped(review, () => (p.lane === "clinical_overview" ? "Open" : "Review"))}
        </>
      )
    ) : updates.length === 0 ? (
      <EmptyState icon={Bell} title="No updates" line="Bookings, cancellations, messages, reviews and payments appear here." />
    ) : (
      // W8 SH4: an allowed share request carries a Share button (it opens the client's wins).
      grouped(updates, (n) => (n.titleKey === "pro.share.allowed" || n.titleKey === "pro.share.allowed_no_name" ? "Share" : undefined))
    );

  // P-MA.7 (D-37): the handover page, drawn over the screen it opens from
  // (frame `notifPro`: a white panel from the status bar down, padding 0 16):
  // the back header (44 back box, 22 chevron stroke 2.2; eyebrow "Home"
  // 10.5 / 15.75 700 0.1em caps --faint over "Notifications" 22 / 28 800;
  // "Mark all read" 12.5 / 700 --pdark), then Today / Earlier groups. KEPT
  // (D-37, not drawn): the live Requests / To review / Updates as a filter
  // track (the sub-track: --subtrack radius 12 padding 4 gap 4; tabs 34 tall
  // radius 9, 12.5, active --subactive / --onfill 700, idle --subink 600),
  // inline Accept / Decline / Undo, team invitations, payments to confirm,
  // the toast, the offline line, dismiss and Clear all.
  const TABS: { key: HubTab; label: string; n: number }[] = [
    { key: "requests", label: "Requests", n: reqN },
    { key: "review", label: "To review", n: revN },
    { key: "updates", label: "Updates", n: updN },
  ];
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-center">
      <div className="relative w-full h-full" style={{ maxWidth: 430 }}>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          tabIndex={-1}
          className="absolute inset-0 outline-none flex flex-col overflow-y-auto overscroll-contain"
          style={{ background: m.page, color: m.ink, padding: "calc(env(safe-area-inset-top) + 12px) 16px 32px", lineHeight: "normal" }}
        >
          <style>{FOCUS_CSS}</style>
          <div className="flex items-center shrink-0" style={{ gap: 6, margin: "-4px 0 6px -10px" }}>
            <button type="button" onClick={p.onClose} aria-label="Back" className="market-focus" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", background: "none", border: 0, padding: 0, borderRadius: 12, color: m.ink, cursor: "pointer" }}>
              <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: linePx(15.75) }}>Home</div>
              <h2 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(28) }}>Notifications</h2>
            </div>
            <button
              type="button"
              onClick={() => void inbox.markRead(inbox.notifications.filter((n) => !n.readAt).map((n) => n.id))}
              disabled={!anyUnread}
              className="market-focus"
              style={{ minHeight: 44, padding: 0, background: "none", border: 0, font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: m.pdark, whiteSpace: "nowrap", cursor: anyUnread ? "pointer" : "default", opacity: anyUnread ? 1 : 0.4 }}
            >
              Mark all read
            </button>
          </div>
          <div role="tablist" aria-label="Notifications" className="flex shrink-0" style={{ gap: 4, padding: 4, borderRadius: 12, background: m.subtrack, margin: "6px 0 2px" }}>
            {TABS.map((t) => {
              const on = t.key === p.tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => p.onTab(t.key)}
                  className="market-focus hit"
                  style={{ flex: 1, minWidth: 0, height: 34, borderRadius: 9, border: 0, background: on ? m.subactive : "transparent", color: on ? m.onfill : m.subink, fontSize: textPx(12.5), fontWeight: on ? 700 : 600, font: "inherit", fontFamily: "inherit", whiteSpace: "nowrap", cursor: "pointer" }}
                >
                  <span style={{ fontSize: textPx(12.5), fontWeight: on ? 700 : 600 }}>
                    {t.label} {t.n}
                  </span>
                </button>
              );
            })}
          </div>
          {inbox.offline && <OfflineLine />}
          {p.toast && (
            <div
              role="status"
              className="flex items-center"
              style={{ gap: 10, borderRadius: 16, background: p.toast.tone === "ok" ? m.goodbg : m.soft, padding: "12px 14px", margin: "8px 0 0" }}
            >
              {p.toast.tone === "ok" ? (
                <CircleCheck size={16} strokeWidth={2} aria-hidden style={{ color: m.good }} />
              ) : (
                <Info size={16} strokeWidth={2} aria-hidden style={{ color: m.ink2 }} />
              )}
              <span className="flex-1" style={{ fontSize: textPx(13), fontWeight: 700, color: m.ink, lineHeight: linePx(18) }}>
                {p.toast.text}
              </span>
              {p.toast.action && (
                <button type="button" onClick={p.toast.action.onClick} className="tap market-focus" style={{ fontSize: textPx(13), fontWeight: 800, color: m.pdark, background: "none", border: 0 }}>
                  {p.toast.action.label}
                </button>
              )}
            </div>
          )}
          <div className="shrink-0">{body}</div>
          {inbox.notifications.length > 0 && (
            <div className="flex justify-center shrink-0" style={{ padding: "18px 0 0" }}>
              <button
                type="button"
                onClick={() => {
                  setClearError(null);
                  setConfirmClear(true);
                }}
                aria-haspopup="dialog"
                className="tap market-focus relative before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']"
                style={{ fontSize: textPx(12.5), fontWeight: 700, color: m.ink2, whiteSpace: "nowrap", background: "none", border: 0 }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>
      <CentredPopup open={confirmClear} onClose={() => !clearBusy && setConfirmClear(false)} title="Clear all notifications?" body="They'll be removed from your hub. This can't be undone.">
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          {clearError && (
            <p role="alert" className="text-center" style={{ fontSize: textPx(12.5), fontWeight: 600, color: INK.hi, lineHeight: 1.4 }}>
              {clearError}
            </p>
          )}
          <CtaButton size="page" label="Clear all" loading={clearBusy} onClick={() => void runClearAll()} />
          <CtaButton size="page" variant="outline" label="Cancel" disabled={clearBusy} onClick={() => setConfirmClear(false)} />
        </div>
      </CentredPopup>
    </div>,
    document.body
  );
};

/** The board's tile tones (Professional Marketplace Screens `NT`) for the hub's row tones: a request gold, attention red, an action teal, done teal, everything else lavender. Dark: the ink at 16% with the ink lifted (D-05). */
function hubTone(t: NotificationText["tone"], m: MarketPalette, dark: boolean): [string, string] {
  const [bg, ink] = t === "req" ? ["#FDF3D6", "#9A7414"] : t === "att" ? [m.highbg, m.high] : t === "act" || t === "done" ? (SEGMENT_STEPS[3] as readonly [string, string]) : (SEGMENT_STEPS[0] as readonly [string, string]);
  if (t === "att") return [bg, ink];
  return dark ? [hexAlpha(ink, 0.16), liftInk(ink)] : [bg, ink];
}

/** HO7's second line: the plan and its price ("Appointment request · $60" for Clinical overview), or the plain request. */
function requestLine(r: ProRequest, lane: ProLane): string {
  if (!r.planLine) return "Asked to work with you";
  if (lane !== "clinical_overview") return r.planLine;
  const price = r.planLine.split(" · ")[1];
  return price ? `Appointment request · ${price}` : "Appointment request";
}
