import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Mail, QrCode, UserPen, UserPlus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { useIsDark } from "../../hooks/useIsDark";
import { useEffectiveProfessionalTier } from "../../hooks/useEffectiveProfessionalTier";
import { useMyProfessionalPlan } from "../../hooks/useMyProfessionalPlan";
import { textPx } from "../../theme/textSize";
import { INK } from "../../components/pro/proInk";
import { PRO_ROUTES, proClientPath } from "../../components/pro/subtypeLanes";
import { ProCardSkeleton, ProError, OfflineLine } from "../../components/pro/states";
import { ProTrendRing, type RingAction } from "../../components/pro/home/ProTrendRing";
import { LANE_ACTION_ICONS } from "../../components/pro/home/ringActions";
import { ClientStrip, FocusRow, type StripEntry } from "../../components/pro/home/ClientStrip";
import { LaneCard, type LaneCardRow } from "../../components/pro/home/LaneCard";
import { fetchMealPlansEnding } from "../../services/pro/nutrition";
import { mealPlansHref } from "../../components/pro/nutrition/nav";
import { weekOfPlan } from "../../components/pro/nutrition/nutritionModel";
import { periodModel, todayModel, type HubRange, type RingModel } from "../../components/pro/home/trendModel";
import { useProInbox } from "../../components/pro/home/useProInbox";
import { NotificationsHub, type HubTab, type HubToast } from "../../components/pro/NotificationsHub";
import { AddClientFlows, GatedRow, type AddStep } from "../../components/pro/addclient/AddClientFlows";
import { AcceptRequestPopup, DeclineRequestPopup } from "../../components/pro/addclient/RequestPopups";
import { SettingsRow } from "../../components/ui/SettingsRows";
import { SectionLabel } from "../../components/ui/SectionLabel";
import { CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import { ProGetSetUpCard } from "../../components/professionals/ProGetSetUpCard";
import { TwoFactorNudge } from "../../components/profile/TwoFactorNudge";
import { HireAvailabilityNotice } from "../../components/hire-pro/HireAvailabilityNotice";
import { hireGate } from "../../services/hires/proLogic";
import { capLabel, effectiveTierLabel } from "../../services/subscription-tiers";
import { dateKicker, greeting } from "../../components/business-dashboard/dashboardModel";
import { mondayFirstWeek } from "../../utils/week";
import { fetchHubTrend, fetchProgrammesEnding, fetchSessions, fetchStrip, localIso, shiftIso, type RangeSession, type StripClient } from "../../services/pro/home";
import { fetchInvitesAllowed, INVITE_LOCKED_MESSAGE } from "../../services/pro/invites";
import { declineHireWithReason, declineRequestWithReason, DECLINE_REASONS, type DeclineReason } from "../../services/pro/requests";
import { acceptHireRequest, rejectHireRequest, type HireRequestRow } from "../../services/hire-inbox";
import { cancelHire, type PendingHire } from "../../services/hires/pro";
import { acceptEmployment, removeMyEmployment, type MyEmployment } from "../../services/business-team/employment";
import { startThread } from "../../services/messaging";
import type { ProNotification } from "../../services/pro/notifications";

/**
 * Release 3 · Home (/app/pro, CL1 v6; HANDOVER f "CL · Home"; FINAL_PLAN W2).
 * Replaces the Release 2 professional dashboard. Top to bottom:
 * - header: date, greeting, the bell (unread count) opening the
 *   NotificationsHub, and the avatar;
 * - Release 2 items kept here (FINAL_PLAN 2.4): Get set up until complete
 *   (ProGetSetUpCard), the two-factor nudge, and the hire-availability notice
 *   when clients can't hire this professional;
 * - the ProTrendRing hero (hub_trend by range and client, the calendar track,
 *   actions) with the client strip of sharing clients;
 * - one card, collapsed (programmes ending soon, Full coaching; meal plans
 *   ending soon, Nutrition (W5); Clinical overview's is wired in W6), or "Ways to add" with
 *   no clients yet.
 * The roster list moved to Clients (W3); hire plans are edited in More ›
 * Services and pricing (MO5, W6), where Get set up sends you.
 */
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Home() {
  const { user, authUserId, professionalClients, rosterLoading, refreshRoster } = useApp();
  const { lane } = useProSubtype();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const today = localIso(now);
  const week = useMemo(() => mondayFirstWeek(today), [today]);
  const month = useMemo(() => {
    const d = new Date(`${today}T00:00:00`);
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => localIso(new Date(d.getFullYear(), d.getMonth(), i + 1)));
  }, [today]);

  const [range, setRange] = useState<HubRange>("week");
  const [focus, setFocus] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---- the trend (hub_trend) ----
  const [trend, setTrend] = useState<{ key: string; model: RingModel | null; error: boolean; offline: boolean } | null>(null);
  const [trendNonce, setTrendNonce] = useState(0);
  const trendKey = `${range}:${focus ?? "all"}:${today}:${trendNonce}`;
  useEffect(() => {
    if (!lane || !authUserId) return;
    let live = true;
    void fetchHubTrend(range, focus).then((r) => {
      if (!live) return;
      if (!r.ok) {
        setTrend((prev) => ({ key: trendKey, model: prev?.model ?? null, error: !r.offline, offline: r.offline }));
        return;
      }
      const model =
        range === "today"
          ? todayModel(r.data, lane, new Date().getHours())
          : periodModel(r.data, lane, (range === "week" ? week : month).indexOf(today));
      setTrend({ key: trendKey, model, error: false, offline: false });
    });
    return () => {
      live = false;
    };
    // trendKey carries range, focus, today and the retry nonce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendKey, lane, authUserId]);

  // ---- sessions for the calendar track (this week and this month) ----
  const [sessions, setSessions] = useState<RangeSession[] | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    const from = week[0] < month[0] ? week[0] : month[0];
    const to = week[6] > month[month.length - 1] ? week[6] : month[month.length - 1];
    void fetchSessions(authUserId, from, shiftIso(to, 30)).then((r) => {
      if (live) setSessions(r.ok ? r.data : []);
    });
    return () => {
      live = false;
    };
  }, [authUserId, week, month]);

  // ---- the client strip: sharing clients only ----
  const rosterKey = professionalClients.map((c) => c.clientId ?? c.id).join(",");
  const [strip, setStrip] = useState<StripClient[] | null>(null);
  useEffect(() => {
    if (!authUserId || rosterLoading) return;
    let live = true;
    const list = professionalClients.filter((c) => c.clientId).map((c) => ({ clientId: c.clientId as string, joinedAt: c.joinedAt }));
    void fetchStrip(list, today).then((r) => {
      if (live && r.ok) setStrip(r.data);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, rosterKey, rosterLoading, today]);

  // ---- programmes ending soon (Full coaching) ----
  const [ending, setEnding] = useState<{ rows: LaneCardRow[] | null; error: boolean }>({ rows: null, error: false });
  const [endingNonce, setEndingNonce] = useState(0);
  const nameOf = useCallback(
    (clientId: string) => {
      const c = professionalClients.find((x) => x.clientId === clientId);
      return c ? `${c.prefix ? `${c.prefix} ` : ""}${c.name}` : "Client";
    },
    [professionalClients]
  );
  useEffect(() => {
    if (lane !== "full_coaching" || !authUserId) return;
    let live = true;
    void fetchProgrammesEnding(authUserId, today).then((r) => {
      if (!live) return;
      if (!r.ok) return setEnding({ rows: null, error: true });
      setEnding({
        error: false,
        rows: r.data.map((x) => ({
          key: x.id,
          name: nameOf(x.clientId),
          item: x.name,
          line: `Ends ${shortDate(x.endsOn)}${x.week ? ` · week ${x.week.n} of ${x.week.of}` : ""}`,
          onOpen: () => navigate(proClientPath(x.clientId, "plan")),
        })),
      });
    });
    return () => {
      live = false;
    };
  }, [lane, authUserId, today, nameOf, navigate, endingNonce]);

  // ---- meal plans ending soon (Nutrition; W5, HANDOVER i: ends within 14 days, not ended) ----
  const [mealEnding, setMealEnding] = useState<{ rows: LaneCardRow[] | null; error: boolean }>({ rows: null, error: false });
  useEffect(() => {
    if (lane !== "nutrition" || !authUserId) return;
    let live = true;
    void fetchMealPlansEnding(authUserId, today).then((r) => {
      if (!live) return;
      if (!r.ok) return setMealEnding({ rows: null, error: true });
      setMealEnding({
        error: false,
        rows: r.data.map((x) => {
          const wk = weekOfPlan(x.startsOn, today);
          return {
            key: x.id,
            name: nameOf(x.clientId),
            item: x.name,
            line: `Ends ${shortDate(x.endsOn ?? today)}${wk ? ` · week ${wk}` : ""}`,
            onOpen: () => navigate(mealPlansHref("nutrition", "plans", { plan: x.planId })),
          };
        }),
      });
    });
    return () => {
      live = false;
    };
  }, [lane, authUserId, today, nameOf, navigate, endingNonce]);

  // ---- invites (Karim's answer 1) ----
  const [invitesAllowed, setInvitesAllowed] = useState(true);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchInvitesAllowed(authUserId).then((r) => {
      if (live && r.ok) setInvitesAllowed(r.data);
    });
    return () => {
      live = false;
    };
  }, [authUserId]);

  // ---- plan and hire gates (Release 2, kept) ----
  const { effective: myTier } = useEffectiveProfessionalTier();
  const { plan, refresh: refreshPlan } = useMyProfessionalPlan();
  const gate = hireGate({ mayConnectClients: plan ? plan.mayConnectClients : null, maxClients: myTier?.tier.maxClients, clientCount: professionalClients.length });
  const planLabel = myTier ? effectiveTierLabel(myTier) : null;

  // ---- inbox, hub, add client ----
  const inbox = useProInbox();
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<HubTab>("requests");
  const [hubToast, setHubToast] = useState<HubToast | null>(null);
  const [pageToast, setPageToast] = useState<{ text: string; action?: { label: string; onClick: () => void } } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStart, setAddStart] = useState<AddStep | undefined>(undefined);
  const openAdd = (s?: AddStep) => {
    setAddStart(s);
    setAddOpen(true);
  };
  const [freeEnded, setFreeEnded] = useState(false);
  const openHub = (tab: HubTab) => {
    setHubTab(tab);
    setHubToast(null);
    setHubOpen(true);
  };

  const [accepting, setAccepting] = useState<HireRequestRow | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [declining, setDeclining] = useState<{ kind: "request"; row: HireRequestRow } | { kind: "hire"; row: PendingHire } | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [hireReloadKey, setHireReloadKey] = useState(0);
  const [invitationBusy, setInvitationBusy] = useState<string | null>(null);

  const accept = async () => {
    if (!accepting || acceptBusy) return;
    setAcceptBusy(true);
    setAcceptError(null);
    const req = accepting;
    const res = await acceptHireRequest(req.id);
    setAcceptBusy(false);
    if (res.status === "ok" || res.status === "already_resolved" || res.status === "not_found") {
      setAccepting(null);
      if (res.status === "ok") {
        await refreshRoster();
        setHubToast({ tone: "ok", text: `${req.name} is now in Onboarding.`, action: { label: "View", onClick: () => navigate(proClientPath(req.customerId)) } });
      }
      inbox.reload();
      return;
    }
    if (res.status === "free_period_ended") {
      setAccepting(null);
      setFreeEnded(true);
      refreshPlan();
      return;
    }
    if (res.status === "tier_limit_reached") {
      setAcceptError(planLabel ? `You've reached the client limit on your ${planLabel} plan.` : "You've reached the client limit on your plan.");
      return;
    }
    setAcceptError(res.status === "permission_denied" ? "You don't have permission to answer that request." : res.message);
  };

  const decline = async (reason: DeclineReason | null, message: string) => {
    if (!declining || declineBusy) return;
    setDeclineBusy(true);
    setDeclineError(null);
    const target = declining;
    let ok = false;
    let gone = false;
    let err: string | null = null;
    if (target.kind === "request") {
      if (reason) {
        const r = await declineRequestWithReason(target.row.id, reason, message);
        ok = r.ok;
        if (!r.ok) [err, gone] = [r.message, !!r.gone];
      } else {
        const r = await rejectHireRequest(target.row.id);
        ok = r.status === "ok";
        gone = r.status === "already_resolved" || r.status === "not_found";
        if (!ok && !gone) err = r.status === "error" ? r.message : "Couldn't decline. Try again.";
      }
    } else if (reason) {
      const r = await declineHireWithReason(target.row.id, reason, message);
      ok = r.ok;
      if (!r.ok) [err, gone] = [r.message, !!r.gone];
    } else {
      const r = await cancelHire(target.row.id);
      ok = r.ok;
      if (!r.ok) err = r.message;
    }
    setDeclineBusy(false);
    if (err && !gone) {
      setDeclineError(err);
      return;
    }
    setDeclining(null);
    const who = target.kind === "request" ? target.row.name : target.row.clientFirstName || "The client";
    if (ok) {
      const label = reason ? DECLINE_REASONS.find((r) => r.value === reason)?.label : null;
      setHubToast({ tone: "info", text: label ? `Request declined: ${label}. ${who} has been told.` : `Request declined. ${who} has been told.` });
    }
    if (target.kind === "hire") setHireReloadKey((k) => k + 1);
    inbox.reload();
  };

  const answerInvitation = async (e: MyEmployment, yes: boolean) => {
    if (invitationBusy) return;
    setInvitationBusy(e.businessId);
    const r = yes ? await acceptEmployment(e.businessId) : await removeMyEmployment(e.businessId);
    setInvitationBusy(null);
    setHubToast(r.ok ? { tone: yes ? "ok" : "info", text: yes ? `You joined ${e.businessName}.` : `Invitation from ${e.businessName} declined.` } : { tone: "info", text: r.message });
    inbox.reload();
  };

  const openNotification = (n: ProNotification) => {
    void inbox.markRead([n.id]);
    switch (n.subjectType) {
      case "hire":
      case "client_request":
        setHubTab("requests");
        return;
      case "team_invitation":
        setHubOpen(false);
        navigate(`${PRO_ROUTES.more}/businesses`);
        return;
      case "appointment":
      case "booking":
      case "session": {
        setHubOpen(false);
        // W4: a booking (request) opens its day, where Requests has Accept / Decline.
        const at = typeof n.payload.starts_at === "string" ? new Date(n.payload.starts_at) : null;
        const day = at && !Number.isNaN(at.getTime()) ? localIso(at) : null;
        navigate(day ? `${PRO_ROUTES.calendar}?day=${day}` : PRO_ROUTES.calendar);
        return;
      }
      case "share_request":
      case "shared_item":
        // W8: share answers and removal requests open the client's wins (Progress).
        setHubOpen(false);
        navigate(n.clientId ? proClientPath(n.clientId, "progress") : PRO_ROUTES.clients);
        return;
      case "review":
        setHubOpen(false);
        navigate(`${PRO_ROUTES.more}/reviews`);
        return;
      case "care_link":
      case "care_referral":
        setHubOpen(false);
        navigate(`${PRO_ROUTES.more}/care-network`);
        return;
      default:
        if (n.clientId && professionalClients.some((c) => c.clientId === n.clientId)) {
          setHubOpen(false);
          navigate(proClientPath(n.clientId));
        }
    }
  };

  const openSession = async (s: RangeSession, action: "open" | "reschedule" | "message") => {
    // W4: open / reschedule land on that session's day in the calendar.
    if (action !== "message" || !s.client) return navigate(`${PRO_ROUTES.calendar}?day=${s.date}`);
    const r = await startThread(s.client.userId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setPageToast({ text: r.message });
  };

  if (!lane) return null;

  // ---- derived ----
  const empty = !rosterLoading && professionalClients.length === 0;
  const days = range === "week" ? week : range === "month" ? month : [];
  const focusUser = focus ? professionalClients.find((c) => c.clientId === focus) : undefined;
  const allSessions = sessions ?? [];
  const mine = focus ? allSessions.filter((s) => s.client?.userId === focus) : allSessions;
  const inRange = mine.filter((s) => (range === "today" ? s.date === today : days.includes(s.date)));
  const nowKey = `${today} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const next = mine.find((s) => `${s.date} ${s.startTime}` >= nowKey) ?? null;
  const patients = lane === "clinical_overview";
  const prevMonth = MONTHS_LONG[(new Date(`${today}T00:00:00`).getMonth() + 11) % 12];
  const prevWord = range === "month" ? "last month" : "last week";
  const vsLabel = range === "month" ? `vs ${prevMonth}` : "vs last week";

  const actionTargets = [
    () => openAdd(),
    () => navigate(PRO_ROUTES.calendar),
    () => navigate(lane === "full_coaching" ? `${PRO_ROUTES.library}/programmes` : lane === "nutrition" ? PRO_ROUTES.mealPlans : PRO_ROUTES.clients),
    () => openHub("review"),
  ];
  const actions: RingAction[] = LANE_ACTION_ICONS[lane].map(([icon, label], i) => ({ icon, label, onClick: actionTargets[i] }));

  const stripEntries: StripEntry[] = (strip ?? []).map((s) => ({ clientId: s.clientId, name: nameOf(s.clientId), trend: s.trend }));
  const weekCount = focus ? mine.filter((s) => week.includes(s.date)).length : 0;
  const word = patients ? "appointment" : "session";

  const firstName = user.firstName?.trim() || "";
  const initial = (firstName[0] ?? "").toUpperCase();

  return (
    <div className="relative">
      {/* Header (gen/ui.js head19 + hubHeader): eyebrow 10.5 / 600, title 19 / 700, bell 36 with the unread badge, avatar 36. */}
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
        <div className="min-w-0">
          <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>{dateKicker(now)}</p>
          <h1 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => (hubOpen ? setHubOpen(false) : openHub("requests"))}
            aria-label={inbox.unread > 0 ? `Notifications, ${inbox.unread} unread` : "Notifications"}
            aria-expanded={hubOpen}
            className="tap relative flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 9999, background: INK.card, border: `1px solid rgb(var(--c-charcoal) / 0.11)` }}
          >
            <Bell size={16} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
            {inbox.unread > 0 && (
              <span
                aria-hidden
                className="absolute flex items-center justify-center"
                style={{ top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9999, background: INK.hi, color: dark ? "#0D0B1A" : "#FFFFFF", fontSize: 9, fontWeight: 700 }}
              >
                {inbox.unread}
              </span>
            )}
          </button>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="object-cover" style={{ width: 36, height: 36, borderRadius: 9999 }} />
          ) : (
            <span
              aria-hidden
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 800,
                color: dark ? "#93C1B9" : "#3C6B65",
                background: dark ? "linear-gradient(150deg,#2E3B3C,#293339)" : "linear-gradient(150deg,#C8E0DC,#A2C8C2)",
              }}
            >
              {initial}
            </span>
          )}
        </div>
      </div>

      <TwoFactorNudge />
      <ProGetSetUpCard onAddClient={() => openAdd()} onPlans={() => navigate("/app/more/services")} className="mb-4" />
      {gate && (
        <HireAvailabilityNotice gate={gate} planLabel={planLabel} capLine={myTier ? capLabel(myTier.tier, professionalClients.length) : null} className="mb-4" />
      )}

      {trend?.offline && <OfflineLine />}
      {!trend && !empty ? (
        <div style={{ marginBottom: 24 }}>
          <ProCardSkeleton lines={4} height={480} />
        </div>
      ) : trend?.error && !trend.model ? (
        <div style={{ marginBottom: 24 }}>
          <ProError onRetry={() => setTrendNonce((n) => n + 1)} />
        </div>
      ) : (
        <ProTrendRing
          lane={lane}
          range={range}
          onRange={setRange}
          focusLabel={focusUser ? `${focusUser.prefix ? `${focusUser.prefix} ` : ""}${focusUser.name}` : patients ? "All patients" : "All clients"}
          focusInitials={focusUser ? initialsOfName(focusUser.name) : null}
          onPicker={(el) => {
            setPickerAnchor(el);
            setPickerOpen(true);
          }}
          model={trend?.key === trendKey ? trend.model : null}
          empty={empty}
          days={days}
          todayIso={today}
          now={now}
          sessions={empty ? [] : inRange}
          next={empty ? null : next}
          onNext={() => navigate(PRO_ROUTES.calendar)}
          actions={actions}
          onSession={(s, a) => void openSession(s, a)}
          prevWord={prevWord}
          vsLabel={vsLabel}
          monthShort={MONTHS_SHORT[new Date(`${today}T00:00:00`).getMonth()]}
          emptyCta={
            empty ? (
              <div style={{ marginTop: 14 }}>
                <CtaButton size="page" label="Add your first client" icon={<UserPlus size={15} aria-hidden />} onClick={() => openAdd()} />
              </div>
            ) : undefined
          }
        >
          {!empty &&
            (focusUser && focus ? (
              <FocusRow name={focusUser.name} line={`${weekCount} ${word}${weekCount === 1 ? "" : "s"} this week`} onOpen={() => navigate(proClientPath(focus))} />
            ) : (
              <ClientStrip entries={stripEntries} noun={patients ? "patient" : "client"} onOpen={(id) => navigate(proClientPath(id))} />
            ))}
        </ProTrendRing>
      )}

      {empty ? (
        <section>
          <SectionLabel className="mb-1">Ways to add</SectionLabel>
          <GatedRow icon={QrCode} title="Invite clients" subtitle={invitesAllowed ? "Share it anywhere" : INVITE_LOCKED_MESSAGE} onOpen={invitesAllowed ? () => navigate(`${PRO_ROUTES.home}/invite`) : undefined} />
          <GatedRow icon={Mail} title="Invite by email or phone" subtitle={invitesAllowed ? "We send them a link" : INVITE_LOCKED_MESSAGE} onOpen={invitesAllowed ? () => openAdd("contact") : undefined} />
          <SettingsRow icon={UserPen} title="Add someone offline" subtitle="Keep notes before they join" onClick={() => openAdd("offline")} />
        </section>
      ) : (
        <LaneCard
          lane={lane}
          rows={lane === "full_coaching" ? ending.rows : lane === "nutrition" ? mealEnding.rows : undefined}
          error={lane === "nutrition" ? mealEnding.error : ending.error}
          onRetry={() => setEndingNonce((n) => n + 1)}
          onSeeAll={() => navigate(lane === "nutrition" ? PRO_ROUTES.mealPlans : PRO_ROUTES.clients)}
        />
      )}

      <PopupMenu
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        anchor={pickerAnchor}
        heading={patients ? "Patients" : "Clients"}
        options={[
          { value: "all", label: patients ? "All patients" : "All clients" },
          ...professionalClients.filter((c) => c.clientId).map((c) => ({ value: c.clientId as string, label: `${c.prefix ? `${c.prefix} ` : ""}${c.name}` })),
        ]}
        selected={focus ?? "all"}
        onSelect={(v) => {
          setFocus(v === "all" ? null : v);
          setPickerOpen(false);
        }}
        width={240}
        align="left"
      />

      <NotificationsHub
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        tab={hubTab}
        onTab={(t) => {
          setHubTab(t);
          setHubToast(null);
        }}
        lane={lane}
        inbox={inbox}
        now={now}
        toast={hubToast}
        plan={plan}
        freeEnded={freeEnded}
        planLabel={planLabel}
        hireReloadKey={hireReloadKey}
        onAccept={(r) => {
          setAcceptError(null);
          setAccepting(r);
        }}
        onDecline={(r) => {
          setDeclineError(null);
          setDeclining({ kind: "request", row: r });
        }}
        onInvitation={(e, yes) => void answerInvitation(e, yes)}
        invitationBusy={invitationBusy}
        onHireDecline={(h) => {
          setDeclineError(null);
          setDeclining({ kind: "hire", row: h });
        }}
        onHireConfirmed={() => {
          void refreshRoster();
          inbox.reload();
        }}
        onOpen={openNotification}
        onBusinesses={() => {
          setHubOpen(false);
          navigate(`${PRO_ROUTES.more}/businesses`);
        }}
      />

      <AcceptRequestPopup name={accepting?.name ?? null} busy={acceptBusy} error={acceptError} onAccept={() => void accept()} onClose={() => setAccepting(null)} />
      <DeclineRequestPopup
        key={declining ? `${declining.kind}:${declining.row.id}` : "none"}
        name={declining ? (declining.kind === "request" ? declining.row.name : declining.row.clientFirstName || "This client") : null}
        busy={declineBusy}
        error={declineError}
        onDecline={(r, m) => void decline(r, m)}
        onClose={() => setDeclining(null)}
      />

      <AddClientFlows
        open={addOpen}
        start={addStart}
        onClose={() => setAddOpen(false)}
        invitesAllowed={invitesAllowed}
        pendingCount={inbox.requests.length}
        onInviteClients={() => navigate(`${PRO_ROUTES.home}/invite`)}
        onPendingRequests={() => openHub("requests")}
        onOfflineAdded={(name, note) => setPageToast({ text: note ? `${name} added. ${note}` : `${name} added.` })}
      />
      <Toast open={!!pageToast} message={pageToast?.text ?? ""} action={pageToast?.action} onExpire={() => setPageToast(null)} />
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function initialsOfName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

