import React, { useEffect, useRef } from "react";
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
  CheckCheck,
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
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { textPx } from "../../theme/textSize";
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
 * gen/hub5.js hubPanel5). A PopupMenu-style panel under the bell: top 66,
 * 12 from each edge, r20, card fill, 1 px rgba(143,104,246,0.22), shadow
 * 0 16 40 rgba(0,0,0,0.20), padding 12 14 10, max 660 high, with the pointer
 * towards the bell. Header "Notifications" 16 / 800 and Mark all read; tabs
 * Requests, To review, Updates (SegmentedTabs h36, 12).
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
 * over a b06 rule) is clear_my_professional_notifications().
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
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  useBackCloses(p.open, p.onClose);

  useEffect(() => {
    if (!p.open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A popup opened from the hub closes first.
      if (document.querySelector('[aria-modal="true"]')) return;
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

  // W6: a sent form (pro.form.submitted / pro.form.flagged, subject form_response)
  // opens its review (HO20 for a check-in, CL10 for an intake) at
  // /app/more/forms/responses/{id}; every other row goes to the page's onOpen.
  const openRow = (n: ProNotification) => {
    if (n.subjectType === "form_response" && n.subjectId) {
      void inbox.markRead([n.id]);
      p.onClose();
      navigate(`/app/more/forms/responses/${n.subjectId}`);
      return;
    }
    p.onOpen(n);
  };

  const notificationRow = (n: ProNotification, i: number, list: ProNotification[], withAction?: string) => {
    const t = notificationText(n, inbox.names);
    const Icon = ICONS[t.icon];
    const tone = toneOf(t.tone, dark);
    const last = i === list.length - 1;
    return (
      <div key={n.id} className="flex" style={{ alignItems: withAction ? "center" : "flex-start", gap: 4, borderBottom: last ? "none" : `1px solid ${INK.b06}` }}>
        <button
          type="button"
          onClick={() => openRow(n)}
          className="tap flex-1 min-w-0 flex text-left"
          style={{ alignItems: withAction ? "center" : "flex-start", gap: 10, padding: "11px 0" }}
        >
          {dot(!n.readAt)}
          {withAction && n.clientId ? (
            <Initials text={initialsOf(inbox.names[n.clientId] ?? t.title)} size={34} />
          ) : (
            <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: tone.bg }}>
              <Icon size={16} strokeWidth={1.75} aria-hidden style={{ color: tone.ink }} />
            </span>
          )}
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(13), fontWeight: withAction ? 700 : 600, color: INK.ch, lineHeight: 1.35 }}>
              {t.title}
            </span>
            <span className="block" style={{ fontSize: textPx(withAction ? 12 : 11), color: withAction ? INK.chS : INK.chF, marginTop: 1 }}>
              {t.line}
            </span>
            {withAction && (
              <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                {whenLabel(n.createdAt, p.now)}
              </span>
            )}
          </span>
          {withAction ? (
            <span
              className="flex items-center shrink-0"
              style={{ height: 30, padding: "0 12px", borderRadius: 10, background: INK.prPale, color: INK.prDeep, fontSize: textPx(12), fontWeight: 700 }}
            >
              {withAction}
            </span>
          ) : (
            <span style={{ fontSize: textPx(11), color: INK.chT, whiteSpace: "nowrap" }}>{whenLabel(n.createdAt, p.now)}</span>
          )}
        </button>
        <button
          type="button"
          aria-label={`Dismiss: ${t.title}`}
          onClick={() => void inbox.dismiss(n.id)}
          className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[8px] before:content-['']"
          style={{ width: 28, height: 28, marginTop: withAction ? 0 : 8, marginRight: -6 }}
        >
          <X size={14} strokeWidth={2} aria-hidden style={{ color: INK.chT }} />
        </button>
      </div>
    );
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
        {otherRequests.map((n, i) => notificationRow(n, i, otherRequests))}
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
          <p style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: INK.chF, padding: "6px 0 2px" }}>
            {REVIEW_LABEL[p.lane]}
          </p>
          {review.map((n, i) => notificationRow(n, i, review, p.lane === "clinical_overview" ? "Open" : "Review"))}
        </>
      )
    ) : updates.length === 0 ? (
      <EmptyState icon={Bell} title="No updates" line="Bookings, cancellations, messages, reviews and payments appear here." />
    ) : (
      // W8 SH4: an allowed share request carries a Share button (it opens the client's wins).
      updates.map((n, i) => notificationRow(n, i, updates, n.titleKey === "pro.share.allowed" || n.titleKey === "pro.share.allowed_no_name" ? "Share" : undefined))
    );

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-center pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto animate-fade-in" style={{ background: "rgba(36,31,27,0.12)" }} onClick={p.onClose} aria-hidden />
      <div className="relative w-full pointer-events-none" style={{ maxWidth: 430 }}>
        <div
          ref={panel}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="absolute pointer-events-auto outline-none flex flex-col animate-popup-in"
          style={{
            top: "calc(env(safe-area-inset-top) + 66px)",
            left: 12,
            right: 12,
            maxHeight: "min(660px, calc(100dvh - 170px))",
            borderRadius: 20,
            background: INK.card,
            border: "1px solid rgba(143,104,246,0.22)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.20)",
            padding: "12px 14px 10px",
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{ top: -7, right: 66, width: 12, height: 12, background: INK.card, borderLeft: "1px solid rgba(143,104,246,0.22)", borderTop: "1px solid rgba(143,104,246,0.22)", transform: "rotate(45deg)" }}
          />
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch }}>Notifications</p>
            {anyUnread && (
              <button
                type="button"
                onClick={() => void inbox.markRead(inbox.notifications.filter((n) => !n.readAt).map((n) => n.id))}
                className="tap flex items-center"
                style={{ gap: 4, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
              >
                <CheckCheck size={13} strokeWidth={2.2} aria-hidden />
                Mark all read
              </button>
            )}
          </div>
          <SegmentedTabs
            items={[
              { key: "requests", label: `Requests ${reqN}` },
              { key: "review", label: `To review ${revN}` },
              { key: "updates", label: `Updates ${updN}` },
            ]}
            activeKey={p.tab}
            onChange={(k) => p.onTab(k as HubTab)}
            tabHeight={36}
            labelSize={12}
            className="mb-2"
          />
          {inbox.offline && <OfflineLine />}
          {p.toast && (
            <div
              role="status"
              className="flex items-center"
              style={{ gap: 10, borderRadius: 14, background: p.toast.tone === "ok" ? INK.goodBg : INK.soft, padding: "10px 12px", marginBottom: 8 }}
            >
              {p.toast.tone === "ok" ? (
                <CircleCheck size={16} strokeWidth={2} aria-hidden style={{ color: INK.good }} />
              ) : (
                <Info size={16} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
              )}
              <span className="flex-1" style={{ fontSize: textPx(12.5), fontWeight: 600, color: INK.ch, lineHeight: 1.4 }}>
                {p.toast.text}
              </span>
              {p.toast.action && (
                <button type="button" onClick={p.toast.action.onClick} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
                  {p.toast.action.label}
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 overflow-y-auto overscroll-contain" style={{ marginRight: -6, paddingRight: 6 }}>
            {body}
          </div>
          {inbox.notifications.length > 0 && (
            <div className="flex justify-center shrink-0" style={{ padding: "10px 0 2px", borderTop: `1px solid ${INK.b06}` }}>
              <button
                type="button"
                onClick={() => void inbox.clearAll()}
                className="tap relative before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']"
                style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.chS, whiteSpace: "nowrap" }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

function toneOf(t: NotificationText["tone"], dark: boolean): { bg: string; ink: string } {
  // gen/ui.js TONE: req gold, att high, act good, pr lavender.
  switch (t) {
    case "req":
      return { bg: INK.goldPale, ink: INK.goldInk };
    case "att":
      return { bg: INK.hiBg, ink: INK.hi };
    case "act":
      return { bg: INK.goodBg, ink: INK.good };
    case "done":
      return { bg: INK.tealPale, ink: dark ? "#93C1B9" : "#3C6B65" };
    default:
      return { bg: INK.prPale, ink: INK.prDeep };
  }
}

/** HO7's second line: the plan and its price ("Appointment request · $60" for Clinical overview), or the plain request. */
function requestLine(r: ProRequest, lane: ProLane): string {
  if (!r.planLine) return "Asked to work with you";
  if (lane !== "clinical_overview") return r.planLine;
  const price = r.planLine.split(" · ")[1];
  return price ? `Appointment request · ${price}` : "Appointment request";
}
