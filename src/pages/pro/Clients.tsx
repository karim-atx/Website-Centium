import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpDown, CalendarDays, Check, ChevronDown, ClipboardList, ClipboardPlus, MessageCircle, MoreVertical, Search, SearchX, SlidersHorizontal, Tag, UserPlus, Users, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { useOnline } from "../../hooks/useOnline";
import { textPx } from "../../theme/textSize";
import { INK } from "../../components/pro/proInk";
import { ClientRow, type ClientStatusTone } from "../../components/pro/ClientRow";
import { StatusRing } from "../../components/pro/StatusRing";
import { EmptyState } from "../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProError } from "../../components/pro/states";
import { PRO_ROUTES, proClientPath } from "../../components/pro/subtypeLanes";
import { StatusTabs, QuickFilter, FilterPanel, ScrollRow, type FilterGroup } from "../../components/pro/client/RosterControls";
import { TagsSheet, EndCoachingPopup, type TagTarget } from "../../components/pro/client/ClientActions";
import { Avatar } from "../../components/pro/client/kit";
import { useProInbox, type ProRequest } from "../../components/pro/home/useProInbox";
import { AddClientFlows } from "../../components/pro/addclient/AddClientFlows";
import { AcceptRequestPopup, DeclineRequestPopup } from "../../components/pro/addclient/RequestPopups";
import { SentInvitesSection } from "../../components/pro/addclient/SentInvitesSection";
import { CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import { time12 } from "../../utils/time12";
import {
  addTag,
  agoLabel,
  CLIENT_STAGES,
  fetchActiveCarePlans,
  fetchActiveMealPlans,
  fetchActiveProgrammes,
  fetchClientStages,
  fetchRosterNumbers,
  removeTag,
  setClientStage,
  STAGE_LABEL,
  type ClientPlan,
  type ClientStage,
  type RosterNumbers,
  type StageRow,
} from "../../services/pro/clients";
import { fetchSessions, localIso, shiftIso, type RangeSession } from "../../services/pro/home";
import { fetchInvitesAllowed } from "../../services/pro/invites";
import { declineRequestWithReason, DECLINE_REASONS, type DeclineReason, type RecentDecline } from "../../services/pro/requests";
import { acceptHireRequest, rejectHireRequest } from "../../services/hire-inbox";
import { fetchThreads, startThread } from "../../services/messaging";
import type { ProfessionalClient } from "../../types";
import { appLocale } from "../../i18n/format";

/**
 * Release 3 · CL3 v6 Clients (Patients for Clinical overview), source
 * gen/r8.js clientsTab8 with r12 rings (board12), r6b filterPanel6 and
 * tagsSheet6, r8 preview8.
 *
 * Head: "Clients" 19 / 700 -0.03em (m-bottom 13); search field (40, r12,
 * soft, 1px 10%, search 15) with the Add and Filter square buttons (40,
 * r12). Status tabs and quick filters scroll with the right-edge fade. The
 * sort line: "Sort: {by}" 12 / 600 text.soft, "{n} clients" 11.5
 * text.faint, "Select" 12 / 700 primary.deep. Rows are ClientRow (gap 8).
 *
 * Status (HANDOVER i; J5 stages are labels): Requests are
 * pending_client_requests; a client is Needs attention when client_flags
 * says at risk or gone quiet while Active; otherwise their stage. Ring:
 * client_adherence over 14 days (Full coaching, Nutrition) or record types
 * shared of 6 (Clinical overview).
 *
 * Long-press (500 ms) opens the preview (next session, plan, tags, unread)
 * with Message and Open; its ⋮ is the row menu (Message, Stage, Tags, End
 * coaching), the frames having moved quick actions off the rows.
 * Select turns on multi-select with the bulk bar (Message, Template / Meal
 * plan / Care note, Tag) 92 above the bottom.
 *
 * "Invites sent" (W9 post-review, no frame): the professional's
 * client_invites under the All list (and under the empty state), hidden
 * while searching, filtering or selecting, and when there are none.
 */

type StatusKey = "all" | "requests" | "onboarding" | "active" | "attention" | "paused" | "completed";
const STATUS_LABEL: Record<StatusKey, string> = {
  all: "All",
  requests: "Requests",
  onboarding: "Onboarding",
  active: "Active",
  attention: "Needs attention",
  paused: "Paused",
  completed: "Completed",
};
const STATUS_ORDER: StatusKey[] = ["all", "requests", "onboarding", "active", "attention", "paused", "completed"];
const TONE_FOR: Record<Exclude<StatusKey, "all">, ClientStatusTone> = { requests: "req", onboarding: "onb", active: "act", attention: "att", paused: "pau", completed: "done" };

type SortKey = "next" | "last" | "name" | "ring" | "newest";

interface ClientEntry {
  kind: "client";
  rel: ProfessionalClient;
  clientId: string;
  name: string;
  status: Exclude<StatusKey, "all" | "requests">;
  stage: ClientStage;
  tags: string[];
  joinedAt: string;
  numbers: RosterNumbers | undefined;
  plan: ClientPlan | undefined;
  next: RangeSession | undefined;
  unread: number;
}
interface RequestEntry {
  kind: "request";
  req: ProRequest;
}
/** A request declined in the last 5 minutes: "Declined · Undo" (Requests segment only). */
interface DeclinedEntry {
  kind: "declined";
  d: RecentDecline;
}
type Entry = ClientEntry | RequestEntry | DeclinedEntry;

const fullName = (c: ProfessionalClient) => `${c.prefix ? `${c.prefix} ` : ""}${c.name}`;

function planLine(p: ClientPlan | undefined): string | null {
  if (!p || !p.name) return null;
  return p.week ? `${p.name}, week ${p.week.n}` : p.name;
}

function nextLabel(s: RangeSession | undefined, today: string): string | null {
  if (!s) return null;
  const day = s.date === today ? "Today" : s.date === shiftIso(today, 1) ? "Tomorrow" : new Date(`${s.date}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
  return `${day} ${time12(s.startTime)}${s.location ? `, ${s.location}` : s.url ? ", online" : ""}`;
}

export default function Clients() {
  const navigate = useNavigate();
  const online = useOnline();
  const { lane } = useProSubtype();
  const { authUserId, professionalClients, rosterLoading, refreshRoster, removeProfessionalClient, accessibility } = useApp();
  const k = accessibility.largerText ? 1.2 : 1;
  const patients = lane === "clinical_overview";
  const word = patients ? "patients" : "clients";
  const one = patients ? "patient" : "client";
  const today = localIso(new Date());

  // ---- reads ----
  const [stages, setStages] = useState<{ rows: StageRow[] | null; error: boolean; offline: boolean }>({ rows: null, error: false, offline: false });
  const [numbers, setNumbers] = useState<Record<string, RosterNumbers>>({});
  const [plans, setPlans] = useState<ClientPlan[]>([]);
  const [sessions, setSessions] = useState<RangeSession[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [invitesAllowed, setInvitesAllowed] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Requests and declines only: no notification rows here, so no live member-inbox channel.
  const inbox = useProInbox(null);

  const rosterKey = professionalClients.map((c) => c.clientId ?? c.id).join(",");
  useEffect(() => {
    if (!authUserId || !lane) return;
    let live = true;
    void fetchClientStages().then((r) => {
      if (!live) return;
      setStages((prev) => (r.ok ? { rows: r.data, error: false, offline: false } : { rows: prev.rows, error: true, offline: r.offline }));
    });
    const ids = professionalClients.map((c) => c.clientId).filter((x): x is string => !!x);
    void fetchRosterNumbers(ids, lane === "clinical_overview").then((n) => live && setNumbers(n));
    const planRead = lane === "full_coaching" ? fetchActiveProgrammes(authUserId) : lane === "nutrition" ? fetchActiveMealPlans(authUserId) : fetchActiveCarePlans(authUserId);
    void planRead.then((r) => live && r.ok && setPlans(r.data));
    void fetchSessions(authUserId, today, shiftIso(today, 60)).then((r) => live && r.ok && setSessions(r.data));
    void fetchThreads().then((r) => {
      if (!live || !r.ok) return;
      const out: Record<string, number> = {};
      for (const t of r.threads) if (t.kind === "peer" && t.participantId) out[t.participantId] = (out[t.participantId] ?? 0) + t.unreadCount;
      setUnread(out);
    });
    void fetchInvitesAllowed(authUserId).then((r) => live && setInvitesAllowed(r.ok && r.data));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, lane, rosterKey, nonce, today]);

  const retry = () => {
    setNonce((n) => n + 1);
    void refreshRoster();
    inbox.reload();
  };

  // ---- entries ----
  const stageBy = useMemo(() => new Map((stages.rows ?? []).map((s) => [s.clientId, s])), [stages.rows]);
  const planBy = useMemo(() => new Map(plans.map((p) => [p.clientId, p])), [plans]);
  const nowKey = `${today} ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const nextBy = useMemo(() => {
    const m = new Map<string, RangeSession>();
    for (const s of sessions) if (s.client && `${s.date} ${s.startTime}` >= nowKey && !m.has(s.client.userId)) m.set(s.client.userId, s);
    return m;
  }, [sessions, nowKey]);

  const clients: ClientEntry[] = useMemo(
    () =>
      professionalClients
        .filter((c) => !!c.clientId)
        .map((c) => {
          const id = c.clientId as string;
          const st = stageBy.get(id);
          const stage = st?.stage ?? "active";
          const n = numbers[id];
          const attention = stage === "active" && !!n?.flags && (n.flags.atRisk || n.flags.goneQuiet);
          return {
            kind: "client" as const,
            rel: c,
            clientId: id,
            name: fullName(c),
            status: attention ? "attention" : stage,
            stage,
            tags: st?.tags ?? [],
            joinedAt: st?.joinedAt ?? c.joinedAt,
            numbers: n,
            plan: planBy.get(id),
            next: nextBy.get(id),
            unread: unread[id] ?? 0,
          };
        }),
    [professionalClients, stageBy, numbers, planBy, nextBy, unread]
  );
  const requests: RequestEntry[] = inbox.requests.map((req) => ({ kind: "request", req }));

  // ---- controls ----
  const [status, setStatus] = useState<StatusKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("next");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [quick, setQuick] = useState<{ group: string; el: HTMLElement } | null>(null);
  const [sortEl, setSortEl] = useState<HTMLElement | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const planTitle = lane === "clinical_overview" ? "Care plan" : lane === "nutrition" ? "Meal plan" : "Programme";
  const groups: FilterGroup[] = useMemo(() => {
    const out: FilterGroup[] = [];
    const planNames = [...new Set(plans.map((p) => p.name).filter(Boolean))].sort();
    if (planNames.length) out.push({ key: "plan", title: planTitle, options: planNames.map((p) => ({ value: p, label: p })) });
    out.push(
      patients
        ? { key: "ring", title: "Records shared", options: [{ value: "none", label: "Not sharing" }, { value: "some", label: "Some shared" }, { value: "all", label: "All 6 shared" }] }
        : { key: "ring", title: "Adherence", options: [{ value: "low", label: "Below 70%" }, { value: "mid", label: "70 to 90%" }, { value: "high", label: "Above 90%" }] }
    );
    out.push({ key: "last", title: "Last activity", options: [{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "old", label: "7+ days ago" }] });
    const tags = [...new Set(clients.flatMap((c) => c.tags))].sort();
    if (tags.length) out.push({ key: "tags", title: "Tags", options: tags.map((t) => ({ value: t, label: t })) });
    return out;
  }, [plans, planTitle, patients, clients]);

  const passes = useCallback(
    (c: ClientEntry) => {
      const f = filters;
      if (f.plan?.length && !(c.plan && f.plan.includes(c.plan.name))) return false;
      if (f.ring?.length) {
        const v = c.numbers?.ring ?? null;
        const bucket = patients ? (v == null || v === 0 ? "none" : v >= 6 ? "all" : "some") : v == null ? null : v < 70 ? "low" : v <= 90 ? "mid" : "high";
        if (!bucket || !f.ring.includes(bucket)) return false;
      }
      if (f.last?.length) {
        const at = c.numbers?.flags?.lastActivityAt ?? null;
        const d = at ? localIso(new Date(at)) : null;
        const bucket = !d ? "old" : d === today ? "today" : d > shiftIso(today, -7) ? "week" : "old";
        if (!f.last.includes(bucket)) return false;
      }
      if (f.tags?.length && !f.tags.some((t) => c.tags.includes(t))) return false;
      return true;
    },
    [filters, patients, today]
  );
  const filtering = Object.values(filters).some((v) => v.length > 0);
  const q = query.trim().toLowerCase();
  const matchesQuery = (e: Entry) =>
    !q ||
    (e.kind === "request" || e.kind === "declined"
      ? (e.kind === "request" ? e.req.name : e.d.name).toLowerCase().includes(q)
      : e.name.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q)) || !!e.plan?.name.toLowerCase().includes(q));

  const counts: Record<StatusKey, number> = {
    all: clients.length + requests.length,
    requests: requests.length,
    onboarding: clients.filter((c) => c.status === "onboarding").length,
    active: clients.filter((c) => c.status === "active").length,
    attention: clients.filter((c) => c.status === "attention").length,
    paused: clients.filter((c) => c.status === "paused").length,
    completed: clients.filter((c) => c.status === "completed").length,
  };

  const sortClients = (list: ClientEntry[]) => {
    const by = [...list];
    const nextKey = (c: ClientEntry) => (c.next ? `${c.next.date} ${c.next.startTime}` : "9999");
    const lastKey = (c: ClientEntry) => c.numbers?.flags?.lastActivityAt ?? "";
    if (sort === "next") by.sort((a, b) => nextKey(a).localeCompare(nextKey(b)) || a.name.localeCompare(b.name));
    else if (sort === "last") by.sort((a, b) => lastKey(b).localeCompare(lastKey(a)));
    else if (sort === "name") by.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "ring") by.sort((a, b) => (a.numbers?.ring ?? 999) - (b.numbers?.ring ?? 999));
    else by.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    return by;
  };

  const visible: Entry[] = useMemo(() => {
    const cs = sortClients(clients.filter((c) => (status === "all" || c.status === status) && passes(c) && matchesQuery(c)));
    const rs = filtering ? [] : requests.filter(matchesQuery);
    if (status === "requests") return [...rs, ...(filtering ? [] : inbox.declined.map((d): DeclinedEntry => ({ kind: "declined", d })).filter(matchesQuery))];
    if (status === "all") return [...cs, ...rs];
    return cs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, requests, inbox.declined, status, passes, q, sort, filtering]);

  const shownCount = visible.filter((e) => e.kind !== "declined").length;

  const SORTS: { value: SortKey; label: string }[] = [
    { value: "next", label: "Next session" },
    { value: "last", label: "Last activity" },
    { value: "name", label: "Name, A to Z" },
    { value: "ring", label: patients ? "Records shared, fewest first" : "Adherence, lowest first" },
    { value: "newest", label: "Newest" },
  ];

  // ---- actions ----
  const [toast, setToast] = useState<string | null>(null);
  /** The decline the toast can undo (HO14 "Undo"; 20261124120000). */
  const [toastUndo, setToastUndo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<ClientEntry | null>(null);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  const [tagTargets, setTagTargets] = useState<TagTarget[] | null>(null);
  const [ending, setEnding] = useState<ClientEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  /** Re-reads "Invites sent" after the add flows close (an invite may have gone out). */
  const [invitesKey, setInvitesKey] = useState(0);
  const closeAdd = () => {
    setAddOpen(false);
    setInvitesKey((n) => n + 1);
  };
  const [accepting, setAccepting] = useState<ProRequest | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [declining, setDeclining] = useState<ProRequest | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const message = async (clientId: string) => {
    if (!online) return setToast("You're offline. Try again when you're connected.");
    const r = await startThread(clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setToast(r.message);
  };

  const knownTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clients) for (const t of c.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].map(([tag, count]) => ({ tag, count }));
  }, [clients]);

  const applyTags = async (changes: { clientId: string; add: string[]; remove: string[] }[]) => {
    if (!authUserId) return "Couldn't save. Try again.";
    for (const ch of changes) {
      for (const t of ch.add) {
        const r = await addTag(authUserId, ch.clientId, t);
        if (!r.ok) return r.message;
      }
      for (const t of ch.remove) {
        const r = await removeTag(authUserId, ch.clientId, t);
        if (!r.ok) return r.message;
      }
    }
    setNonce((n) => n + 1);
    setSelecting(false);
    setPicked(new Set());
    setToast("Tags saved.");
    return null;
  };

  const changeStage = async (c: ClientEntry, s: ClientStage) => {
    if (s === c.stage) return;
    const r = await setClientStage(c.clientId, s);
    if (!r.ok) return setToast(r.message);
    setPreview(null);
    setNonce((n) => n + 1);
    setToast(`${c.name} is now ${STAGE_LABEL[s]}.`);
  };

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
        setToast(`${req.name} is now in Onboarding.`);
      }
      inbox.reload();
      return;
    }
    if (res.status === "tier_limit_reached") return setAcceptError("You've reached the client limit on your plan.");
    if (res.status === "free_period_ended") return setAcceptError("Your free period has ended. Choose a plan to add clients.");
    setAcceptError(res.status === "permission_denied" ? "You don't have permission to answer that request." : res.message);
  };

  const decline = async (reason: DeclineReason | null, msg: string) => {
    if (!declining || declineBusy) return;
    setDeclineBusy(true);
    setDeclineError(null);
    const target = declining;
    let err: string | null = null;
    let gone = false;
    if (reason) {
      const r = await declineRequestWithReason(target.id, reason, msg);
      if (!r.ok) [err, gone] = [r.message, !!r.gone];
    } else {
      const r = await rejectHireRequest(target.id);
      gone = r.status === "already_resolved" || r.status === "not_found";
      if (r.status !== "ok" && !gone) err = r.status === "error" ? r.message : "Couldn't decline. Try again.";
    }
    setDeclineBusy(false);
    if (err && !gone) return setDeclineError(err);
    setDeclining(null);
    if (!err) {
      const label = reason ? DECLINE_REASONS.find((x) => x.value === reason)?.label : null;
      // The client hears about it only once the 5-minute undo window has passed.
      const text = `${label ? `Request declined: ${label}.` : "Request declined."} ${target.name} is told in 5 minutes.`;
      setToast(text);
      setToastUndo({ id: target.id, name: target.name, text });
    }
    inbox.reload();
  };

  const undoDecline = async (id: string, name: string) => {
    setToastUndo(null);
    const r = await inbox.undoDecline(id);
    setToast(r.ok ? `${name}'s request is back in Requests.` : r.message);
  };

  const pickedEntries = clients.filter((c) => picked.has(c.clientId));
  const bulkPlan = () => {
    if (lane === "full_coaching") return navigate(`${PRO_ROUTES.library}/programmes`);
    if (lane === "nutrition") return navigate(PRO_ROUTES.mealPlans);
    if (pickedEntries.length === 1) return navigate(proClientPath(pickedEntries[0].clientId, "notes"));
    setToast("Pick one patient to add a care note.");
  };

  // ---- render ----
  const loading = (rosterLoading || stages.rows === null) && professionalClients.length === 0 && !stages.error;
  const empty = !rosterLoading && stages.rows !== null && professionalClients.length === 0 && requests.length === 0;
  const single = status !== "all";

  const head = (
    <>
      <h1 style={{ marginBottom: 13, fontSize: textPx(19), lineHeight: 1.5, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>{patients ? "Patients" : "Clients"}</h1>
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <label className="flex-1 min-w-0 flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${query ? INK.pr : INK.b10}`, paddingBlock: "0", paddingInline: "12px 4px", gap: 8 }}>
          <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${word}`}
            aria-label={`Search ${word}`}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(14), color: INK.ch }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="tap flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <X size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
            </button>
          )}
        </label>
        <SquareButton icon={UserPlus} label={`Add ${one}`} onClick={() => setAddOpen(true)} />
        {!empty && <SquareButton icon={SlidersHorizontal} label="Filter" on={panelOpen || filtering} count={Object.values(filters).reduce((n, v) => n + v.length, 0)} onClick={() => setPanelOpen((v) => !v)} />}
      </div>
    </>
  );

  if (!lane) return null;

  if (empty) {
    return (
      <div>
        {head}
        <EmptyState icon={Users} title={`No ${word} yet`} line={`Add your first ${one} to run their plans, sessions and progress from here.`} />
        <div className="flex" style={{ marginTop: 8 }}>
          <CtaButton className="flex-1" size="page" icon={<UserPlus size={15} />} label={`Add your first ${one}`} onClick={() => setAddOpen(true)} />
        </div>
        <SentInvitesSection reloadKey={`${nonce}:${invitesKey}`} />
        <AddClientFlows
          open={addOpen}
          onClose={closeAdd}
          invitesAllowed={invitesAllowed}
          pendingCount={requests.length}
          onInviteClients={() => navigate(`${PRO_ROUTES.home}/invite`)}
          onPendingRequests={() => setStatus("requests")}
          onOfflineAdded={(name) => setToast(`${name} added.`)}
        />
        <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: selecting ? 96 : 0 }}>
      {head}
      <StatusTabs tabs={STATUS_ORDER.map((key) => ({ key, label: STATUS_LABEL[key], count: counts[key] }))} active={status} onChange={setStatus} k={k} />
      <ScrollRow label="Filters">
        {groups.map((g) => (
          <QuickFilter
            key={g.key}
            label={g.title}
            on={(filters[g.key] ?? []).length > 0}
            expanded={quick?.group === g.key}
            k={k}
            onClick={(el) => setQuick((cur) => (cur?.group === g.key ? null : { group: g.key, el }))}
          />
        ))}
      </ScrollRow>

      {stages.offline && <OfflineLine />}

      <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 10, minHeight: 32 }}>
        {selecting ? (
          <>
            <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, whiteSpace: "nowrap" }}>{`${picked.size} selected`}</span>
            <button
              type="button"
              onClick={() => {
                setSelecting(false);
                setPicked(new Set());
              }}
              className="tap relative before:absolute before:-inset-3 before:content-['']"
              style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={!!sortEl}
              onClick={(e) => setSortEl(e.currentTarget)}
              className="tap inline-flex items-center relative before:absolute before:-inset-3 before:content-['']"
              style={{ gap: 4, fontSize: textPx(12), fontWeight: 600, color: INK.chS, whiteSpace: "nowrap" }}
            >
              <ArrowUpDown size={13} strokeWidth={2} aria-hidden />
              {`Sort: ${SORTS.find((s) => s.value === sort)?.label}`}
              <ChevronDown size={12} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
            </button>
            <span className="flex items-center" style={{ gap: 12 }}>
              <span style={{ fontSize: textPx(11.5), color: INK.chF, whiteSpace: "nowrap" }} aria-live="polite">{`${shownCount} ${shownCount === 1 ? one : word}`}</span>
              {clients.length > 0 && (
                <button type="button" onClick={() => setSelecting(true)} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
                  Select
                </button>
              )}
            </span>
          </>
        )}
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : stages.error && !stages.rows ? (
        <ProError onRetry={retry} />
      ) : visible.length === 0 ? (
        q ? (
          <>
            <EmptyState icon={SearchX} title={`No ${word} match "${query.trim()}"`} line="Try a name, a tag or a plan. Tags are searchable too." />
            <div className="flex" style={{ gap: 8 }}>
              <CtaButton className="flex-1" size="base" variant="secondary" label="Clear search" onClick={() => setQuery("")} />
              <CtaButton className="flex-1" size="base" icon={<UserPlus size={15} />} label="Add new" onClick={() => setAddOpen(true)} />
            </div>
          </>
        ) : (
          <EmptyState icon={Users} title={filtering ? `No ${word} match these filters` : `No ${STATUS_LABEL[status].toLowerCase()} ${word}`} line={filtering ? "Clear a filter to see more." : undefined} />
        )
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }} role="list">
          {visible.map((e) =>
            e.kind === "declined" ? (
              <div role="listitem" key={`d:${e.d.id}`}>
                <DeclinedCard d={e.d} onUndo={() => void undoDecline(e.d.id, e.d.name)} />
              </div>
            ) : e.kind === "request" ? (
              <div role="listitem" key={`r:${e.req.id}`}>
                {status === "requests" ? (
                  <RequestCard req={e.req} onAccept={() => { setAcceptError(null); setAccepting(e.req); }} onDecline={() => { setDeclineError(null); setDeclining(e.req); }} />
                ) : (
                  <ClientRow
                    name={e.req.name}
                    avatarUrl={e.req.avatarUrl}
                    status={{ label: "Requests", tone: "req" }}
                    line={`Asked to work with you ${agoLabel(e.req.requestedAt) ?? ""}`.trim()}
                    ring={null}
                    lane={lane}
                    onClick={() => setStatus("requests")}
                  />
                )}
              </div>
            ) : (
              <div role="listitem" key={e.clientId}>
                <ClientRow
                  name={e.name}
                  avatarUrl={e.rel.avatarUrl}
                  status={{ label: STATUS_LABEL[e.status], tone: TONE_FOR[e.status] }}
                  line={rowLine(e)}
                  ring={e.numbers ? e.numbers.ring : null}
                  lane={lane}
                  single={single}
                  selecting={selecting}
                  picked={picked.has(e.clientId)}
                  onClick={() => {
                    if (!selecting) return navigate(proClientPath(e.clientId));
                    setPicked((p) => {
                      const n = new Set(p);
                      if (n.has(e.clientId)) n.delete(e.clientId);
                      else n.add(e.clientId);
                      return n;
                    });
                  }}
                  onLongPress={selecting ? undefined : () => setPreview(e)}
                />
              </div>
            )
          )}
        </div>
      )}

      {status === "all" && !q && !filtering && !selecting && <SentInvitesSection reloadKey={`${nonce}:${invitesKey}`} />}

      {selecting && (
        <div
          className="fixed flex"
          style={{ insetInlineStart: "max(16px, calc(50% - 199px))", insetInlineEnd: "max(16px, calc(50% - 199px))", bottom: 92, zIndex: 30, gap: 6, padding: 6, borderRadius: 18, background: INK.card, boxShadow: "0 10px 40px rgba(36,31,27,0.18)" }}
        >
          <CtaButton
            className="flex-1"
            size="base"
            icon={<MessageCircle size={15} />}
            label="Message"
            disabled={picked.size === 0}
            onClick={() => (pickedEntries.length === 1 ? void message(pickedEntries[0].clientId) : navigate("/app/messages"))}
          />
          <CtaButton className="flex-1" size="base" variant="secondary" icon={<ClipboardPlus size={15} />} label={lane === "nutrition" ? "Meal plan" : patients ? "Care note" : "Template"} disabled={picked.size === 0} onClick={bulkPlan} />
          <CtaButton
            className="flex-1"
            size="base"
            variant="secondary"
            icon={<Tag size={15} />}
            label="Tag"
            disabled={picked.size === 0}
            onClick={() => setTagTargets(pickedEntries.map((c) => ({ clientId: c.clientId, name: c.name, tags: c.tags })))}
          />
        </div>
      )}

      <FilterPanel
        open={panelOpen}
        groups={groups}
        selected={filters}
        onToggle={(g, v) => setFilters((f) => ({ ...f, [g]: (f[g] ?? []).includes(v) ? (f[g] ?? []).filter((x) => x !== v) : [...(f[g] ?? []), v] }))}
        onClear={() => setFilters({})}
        onClose={() => setPanelOpen(false)}
        showLabel={`Show ${clients.filter((c) => (status === "all" || c.status === status) && passes(c) && matchesQuery(c)).length} ${word}`}
      />
      <PopupMenu
        open={!!quick}
        onClose={() => setQuick(null)}
        anchor={quick?.el ?? null}
        heading={groups.find((g) => g.key === quick?.group)?.title}
        options={(groups.find((g) => g.key === quick?.group)?.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
        selected={quick ? filters[quick.group] ?? [] : []}
        multiSelect
        keepOpen
        onSelect={(v) => quick && setFilters((f) => ({ ...f, [quick.group]: (f[quick.group] ?? []).includes(v) ? (f[quick.group] ?? []).filter((x) => x !== v) : [...(f[quick.group] ?? []), v] }))}
        width={200}
        align="left"
      />
      <PopupMenu
        open={!!sortEl}
        onClose={() => setSortEl(null)}
        anchor={sortEl}
        heading="Sort by"
        options={SORTS}
        selected={sort}
        onSelect={(v) => setSort(v as SortKey)}
        width={220}
        align="left"
      />

      {preview && (
        <ClientPreview
          entry={preview}
          lane={lane}
          today={today}
          planTitle={planTitle}
          patients={patients}
          onClose={() => setPreview(null)}
          onMessage={() => void message(preview.clientId)}
          onOpen={() => navigate(proClientPath(preview.clientId))}
          onMenu={(el) => setMenuEl(el)}
        />
      )}
      <PopupMenu
        open={!!menuEl && !!preview}
        onClose={() => setMenuEl(null)}
        anchor={menuEl}
        options={[
          { value: "message", label: "Message", icon: <MessageCircle size={15} /> },
          { value: "stage", label: "Change stage", icon: <ClipboardList size={15} /> },
          { value: "tags", label: "Tags", icon: <Tag size={15} /> },
          { value: "end", label: "End coaching", icon: <X size={15} />, destructive: true },
        ]}
        onSelect={(v) => {
          const p = preview;
          if (!p) return;
          if (v === "message") void message(p.clientId);
          else if (v === "stage") setStageEl(menuEl);
          else if (v === "tags") setTagTargets([{ clientId: p.clientId, name: p.name, tags: p.tags }]);
          else setEnding(p);
        }}
        width={200}
        align="right"
      />
      <PopupMenu
        open={!!stageEl && !!preview}
        onClose={() => setStageEl(null)}
        anchor={stageEl}
        heading="Stage"
        options={CLIENT_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
        selected={preview?.stage ?? null}
        onSelect={(v) => preview && void changeStage(preview, v as ClientStage)}
        width={220}
        align="right"
      />

      <TagsSheet open={!!tagTargets} onClose={() => setTagTargets(null)} targets={tagTargets ?? []} known={knownTags} onApply={applyTags} />
      <EndCoachingPopup
        name={ending?.name ?? null}
        patient={patients}
        onClose={() => setEnding(null)}
        onEnd={async () => {
          if (!ending) return null;
          if (!online) return "You're offline. Try again when you're connected.";
          const r = await removeProfessionalClient(ending.rel.id);
          if (!r.ok) return r.message ?? "Couldn't end coaching. Try again.";
          setToast(`Coaching with ${ending.name} ended.`);
          setEnding(null);
          setPreview(null);
          return null;
        }}
      />
      <AcceptRequestPopup name={accepting?.name ?? null} plan={accepting?.planLine} busy={acceptBusy} error={acceptError} onAccept={() => void accept()} onClose={() => setAccepting(null)} />
      <DeclineRequestPopup key={declining?.id ?? "none"} name={declining?.name ?? null} busy={declineBusy} error={declineError} onDecline={(r, m) => void decline(r, m)} onClose={() => setDeclining(null)} />
      <AddClientFlows
        open={addOpen}
        onClose={closeAdd}
        invitesAllowed={invitesAllowed}
        pendingCount={requests.length}
        onInviteClients={() => navigate(`${PRO_ROUTES.home}/invite`)}
        onPendingRequests={() => {
          setAddOpen(false);
          setStatus("requests");
        }}
        onOfflineAdded={(name) => setToast(`${name} added.`)}
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        onUndo={toastUndo && toastUndo.text === toast ? () => void undoDecline(toastUndo.id, toastUndo.name) : undefined}
        onExpire={() => {
          setToast(null);
          setToastUndo(null);
        }}
      />
    </div>
  );

  function rowLine(e: ClientEntry): string {
    if (e.status === "onboarding" && !e.plan) return `Joined ${new Date(e.joinedAt).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" })}`;
    const parts = [planLine(e.plan)];
    const ago = agoLabel(e.numbers?.flags?.lastActivityAt ?? null);
    if (ago) parts.push(`active ${ago}`);
    return parts.filter(Boolean).join(" · ");
  }
}

/** ui.js / r6b sqBtn6: 40 square, r12, soft fill, 1px 10% border, icon 16 / 1.75 text.soft; on: lavender pale, primary border, primary.deep. */
const SquareButton: React.FC<{ icon: typeof UserPlus; label: string; onClick: () => void; on?: boolean; count?: number }> = ({ icon: Icon, label, onClick, on, count }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={count ? `${label}, ${count} on` : label}
    aria-expanded={on}
    className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[2px] before:content-['']"
    style={{ width: 40, height: 40, borderRadius: 12, background: on ? INK.prPale : INK.soft, border: `1px solid ${on ? INK.pr : INK.b10}` }}
  >
    <Icon size={16} strokeWidth={1.75} aria-hidden style={{ color: on ? INK.prDeep : INK.chS }} />
    {!!count && (
      <span
        aria-hidden
        className="absolute flex items-center justify-center"
        style={{ top: -5, insetInlineEnd: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9999, background: INK.fill, color: INK.onFill, fontSize: 9.5, fontWeight: 800 }}
      >
        {count}
      </span>
    )}
  </button>
);

/** r6b Requests segment card: avatar 40 gold, name 14 / 700, line 12 ("Asked for Monthly coaching" with the plan the client chose), when 11; Decline and Accept (sm). */
const RequestCard: React.FC<{ req: ProRequest; onAccept: () => void; onDecline: () => void }> = ({ req, onAccept, onDecline }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
    <div className="flex items-center" style={{ gap: 12 }}>
      <Avatar name={req.name} url={req.avatarUrl} size={40} tone="gold" />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>{req.name}</p>
        <p style={{ fontSize: textPx(12), color: INK.chS }}>{req.planName ? `Asked for ${req.planName}` : "Asked to work with you"}</p>
        <p style={{ fontSize: textPx(11), color: INK.chF }}>{`Requested ${agoLabel(req.requestedAt) ?? ""}`}</p>
      </div>
    </div>
    <div className="flex" style={{ gap: 8, marginTop: 12 }}>
      <CtaButton className="flex-1" size="base" variant="secondary" icon={<X size={15} />} label="Decline" onClick={onDecline} />
      <CtaButton className="flex-1" size="base" icon={<Check size={15} />} label="Accept" onClick={onAccept} />
    </div>
  </div>
);

/** A request declined in the last 5 minutes: the request card with "Declined · Undo" (HANDOVER_API 20261124120000). */
const DeclinedCard: React.FC<{ d: RecentDecline; onUndo: () => void }> = ({ d, onUndo }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
    <div className="flex items-center" style={{ gap: 12 }}>
      <Avatar name={d.name} url={d.avatarUrl} size={40} tone="gold" />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>{d.name}</p>
        <p className="flex items-center flex-wrap" style={{ fontSize: textPx(12), color: INK.chS, columnGap: 4 }}>
          Declined ·
          <button
            type="button"
            onClick={onUndo}
            aria-label={`Undo declining ${d.name}`}
            className="tap relative before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']"
            style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
          >
            Undo
          </button>
        </p>
      </div>
    </div>
  </div>
);

/**
 * r8 preview8: scrim rgba(36,31,27,0.4); card 16 in, r20, pad 16, the sheet
 * shadow; avatar 44, name 16 / 800, status 12 / 600 (Needs attention in
 * status.high), the ring; rows pad 9 0 with a 15 icon, the label 11
 * text.faint and the value 13 / 600; Message (secondary) and Open (primary).
 */
const ClientPreview: React.FC<{
  entry: ClientEntry;
  lane: "full_coaching" | "nutrition" | "clinical_overview";
  today: string;
  planTitle: string;
  patients: boolean;
  onClose: () => void;
  onMessage: () => void;
  onOpen: () => void;
  onMenu: (el: HTMLElement) => void;
}> = ({ entry, lane, today, planTitle, patients, onClose, onMessage, onOpen, onMenu }) => {
  const menuRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const plan = entry.plan ? (entry.plan.week ? `${entry.plan.name}, week ${entry.plan.week.n}${entry.plan.week.of ? ` of ${entry.plan.week.of}` : ""}` : entry.plan.name) : "None yet";
  const rows: [typeof CalendarDays, string, string][] = [
    [CalendarDays, patients ? "Next appointment" : "Next session", nextLabel(entry.next, today) ?? "Not booked"],
    [ClipboardList, planTitle, plan],
    [Tag, "Tags", entry.tags.length ? entry.tags.join(", ") : "No tags"],
    [MessageCircle, "Messages", entry.unread ? `${entry.unread} unread` : "No unread messages"],
  ];
  const att = entry.status === "attention";
  return (
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <button type="button" aria-label="Close preview" className="absolute inset-0" style={{ background: "rgba(36,31,27,0.4)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-label={`Preview of ${entry.name}`}
        className="absolute"
        style={{ insetInlineStart: "max(16px, calc(50% - 199px))", insetInlineEnd: "max(16px, calc(50% - 199px))", top: 190, background: INK.card, borderRadius: 20, boxShadow: "0 10px 40px rgba(36,31,27,0.18)", padding: 16 }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <Avatar name={entry.name} url={entry.rel.avatarUrl} size={44} tone={entry.status === "onboarding" ? "sky" : att ? "gold" : "pr"} />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}>{entry.name}</p>
            <p style={{ fontSize: textPx(12), fontWeight: 600, color: att ? INK.hi : INK.chS }}>{STATUS_LABEL[entry.status]}</p>
          </div>
          <StatusRing value={entry.numbers ? entry.numbers.ring : null} lane={lane} />
          <button
            ref={menuRef}
            type="button"
            aria-label={`More actions for ${entry.name}`}
            aria-haspopup="menu"
            onClick={() => menuRef.current && onMenu(menuRef.current)}
            className="tap flex items-center justify-center shrink-0"
            style={{ width: 36, height: 44, marginInlineEnd: -8 }}
          >
            <MoreVertical size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
          </button>
        </div>
        <div style={{ marginTop: 12, borderTop: `1px solid ${INK.b06}` }}>
          {rows.map(([Icon, label, value]) => (
            <div key={label} className="flex" style={{ gap: 10, padding: "9px 0", borderBottom: `1px solid ${INK.b06}` }}>
              <Icon size={15} strokeWidth={1.9} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 2 }} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                  {label}
                </span>
                <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                  {value}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap: 8, marginTop: 12 }}>
          <CtaButton className="flex-1" size="base" variant="secondary" icon={<MessageCircle size={15} />} label="Message" onClick={onMessage} />
          <CtaButton className="flex-1" size="base" icon={<ArrowRight size={15} />} label="Open" onClick={onOpen} />
        </div>
      </div>
    </div>
  );
};
