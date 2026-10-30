import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Archive, CheckCheck, Inbox, Megaphone, MessageSquarePlus, MessagesSquare, Plus, Search, SquarePen, Star, Store, Users } from "lucide-react";
import { ThreadList, type ChatListItem, type ProRowOptions, type RowActions } from "../../../components/messages/ThreadList";
import { ThreadView, type ThreadViewPro } from "../../../components/messages/ThreadView";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Toast } from "../../../components/ui/Toast";
import { ClientPicker, type PickableClient } from "../../../components/messages/ClientPicker";
import { NewGroup } from "../../../components/messages/NewGroup";
import { BroadcastEditor } from "../../../components/messages/BroadcastEditor";
import { GroupInvitationView } from "../../../components/messages/GroupInvitationView";
import { StarredMessages } from "../../../components/messages/StarredMessages";
import { SearchResults } from "../../../components/messages/SearchResults";
import { DeleteConversationConfirm } from "../../../components/messages/DeleteConversationConfirm";
import { RoundBtn } from "../../../components/pro/client/kit";
import { EmptyState } from "../../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { Footnote, MessagesHead, MsgTabs, SearchField, SecLabel } from "../../../components/pro/messages/parts";
import { OfferPlansSheet } from "../../../components/pro/messages/OfferPlansSheet";
import { ShareToGroupSheet } from "../../../components/pro/messages/ShareToGroupSheet";
import { SharePlaylistSheet } from "../../../components/pro/messages/SharePlaylistSheet";
import { dotFor, enquiryStatus, enquiryWaiting, PRO_TABS, tabOf, type Dot, type ProTab } from "../../../components/pro/messages/messagesModel";
import { useApp } from "../../../context/AppContext";
import { ThreadLiveProvider } from "../../../context/ThreadLiveContext";
import { useUnread } from "../../../context/UnreadContext";
import { useBack } from "../../../hooks/useBack";
import { useBackCloses } from "../../../hooks/useBackCloses";
import { useOnline } from "../../../hooks/useOnline";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { textPx } from "../../../theme/textSize";
import { fetchThreads, migrateLegacyStars, startThread, threadForPush, type MessageThread } from "../../../services/messaging";
import { fetchGroupInvitations, type GroupInvitation } from "../../../services/messaging/groups";
import { fetchBroadcastLists, fetchBroadcasts, type BroadcastList } from "../../../services/messaging/broadcasts";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import {
  CONVERSATION_DELETE_READY,
  deleteConversationForMe,
  fetchLastMessageState,
  fetchThreadSettings,
  MIN_GLOBAL_QUERY,
  mutePatch,
  NO_SETTINGS,
  saveThreadSettings,
  searchMessages,
  type MuteChoice,
  type SearchHit,
  type ThreadSettings,
} from "../../../services/messaging/chatFeatures";
import { fetchClientStages, STAGE_LABEL, type ClientStage } from "../../../services/pro/clients";
import { fetchCardKinds, fetchMemberCounts } from "../../../services/pro/messages";

/**
 * Release 3 · Messages for professionals (MO22 v5 lists, MO22 v2 chats, MO27
 * groups), /app/messages. Split out of pages/messages/Messages.tsx, which
 * keeps the client and business screens exactly as they were.
 *
 * TABS (msgTabs19): Clients, Groups, Enquiries, and Businesses only when the
 * professional has a business conversation (decision 1: staff threads merged
 * in by withBusinessThreads, an owner's member threads, gym chats). Which tab a
 * chat belongs to is messagesModel.tabOf. Broadcast lists live in Groups
 * (BroadcastEditor kept), group invitations too.
 *
 * KEPT from the shared screen: search across chats and messages, Starred,
 * Archived, Unread (the tab dots and each row's badge; the list's pinned
 * chats lead each tab), swipe and ⋮ (pin, mute, archive, delete for me),
 * push and in-app deep links, group invitations, new chat / group /
 * broadcast. Chats open in the shared ThreadView with `pro` (calls only with
 * clients, as thread_allows_calls says; Offer plans only for enquiries).
 *
 * The list does not poll; it re-reads on returning from a chat.
 */

type View = "list" | "archived" | "starred" | "newGroup" | "broadcast" | "invitation";
const OFFLINE_TOAST = "You're offline. Try again when you're connected.";
const TONES = ["pr", "teal", "gold", "sky"] as const;
const toneOf = (id: string) => TONES[[...id].reduce((a, ch) => (a + ch.charCodeAt(0)) % 997, 0) % 4];
const DOT_COLOUR: Record<Dot, string> = {
  good: INK.good,
  hi: INK.hi,
  chT: INK.chT,
  gold: INK.gold,
  prDark: "rgb(var(--c-primary-dark))",
  chF: INK.chF,
  sky: INK.sky,
};

export default function ProMessages() {
  const { authUserId, professionalClients } = useApp();
  const unread = useUnread();
  const online = useOnline();
  const back = useBack("/app/more");
  const { lane } = useProSubtype();
  const location = useLocation();
  const navigate = useNavigate();

  const clients: PickableClient[] = useMemo(
    () => professionalClients.filter((cl) => cl.clientId).map((cl) => ({ userId: cl.clientId!, name: cl.name, avatarUrl: cl.avatarUrl ?? null })),
    [professionalClients]
  );
  const clientIds = useMemo(() => new Set(clients.map((c) => c.userId)), [clients]);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [settings, setSettings] = useState<Record<string, ThreadSettings>>({});
  const [readState, setReadState] = useState<Record<string, string | null>>({});
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [stages, setStages] = useState<Record<string, ClientStage>>({});
  const [cardKinds, setCardKinds] = useState<Record<string, string>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [lists, setLists] = useState<BroadcastList[]>([]);
  const [lastSent, setLastSent] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<MessageThread | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<ProTab>("clients");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [hitsMore, setHitsMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [openList, setOpenList] = useState<BroadcastList | null>(null);
  const [openInvitation, setOpenInvitation] = useState<GroupInvitation | null>(null);
  const [newOpen, setNewOpen] = useState<null | "all" | "groups">(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatBusy, setNewChatBusy] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageThread | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const canDelete = CONVERSATION_DELETE_READY;

  const closeThread = () => {
    setOpen(null);
    setFocusId(null);
    void load();
  };
  useBackCloses(!!open, closeThread);

  const requestedThreadId = (location.state as { threadId?: string } | null)?.threadId ?? null;
  const deepLinkConsumed = useRef(false);
  const pushId = new URLSearchParams(location.search).get("push");

  const openThread = (t: MessageThread) => {
    setTab(tabOf(t, clientIds));
    setOpen(t);
  };

  const load = async (thenOpenId?: string) => {
    const [result, s, invites] = await Promise.all([fetchThreads(), fetchThreadSettings(), fetchGroupInvitations()]);
    setSettings(s);
    setInvitations(invites);
    void Promise.all([fetchBroadcastLists(), fetchBroadcasts(100)]).then(([ls, sent]) => {
      setLists(ls ?? []);
      const latest: Record<string, number> = {};
      for (const b of sent) if (b.listId && !(b.listId in latest)) latest[b.listId] = b.sentCount;
      setLastSent(latest);
    });
    void fetchClientStages().then((r) => {
      if (r.ok) setStages(Object.fromEntries(r.data.map((x) => [x.clientId, x.stage])));
    });
    if (result.ok) {
      setThreads(result.threads);
      setError(null);
      const mineLast = result.threads.filter((t) => t.lastMessageId && t.lastMessageSenderId === authUserId).map((t) => t.lastMessageId!);
      void fetchLastMessageState(mineLast).then(({ readAt, delivered: reached }) => {
        setReadState(readAt);
        setDelivered(reached);
      });
      void fetchCardKinds(mineLast).then(setCardKinds);
      void fetchMemberCounts(result.threads.filter((t) => t.kind === "group").map((t) => t.id)).then(setMemberCounts);
      if (thenOpenId) {
        const target = result.threads.find((t) => t.id === thenOpenId);
        if (target) {
          setView("list");
          openThread(target);
        }
      }
      if (pushId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        navigate("/app/messages", { replace: true });
        const threadId = await threadForPush(pushId);
        const target = threadId ? result.threads.find((t) => t.id === threadId) : undefined;
        if (target) openThread(target);
      } else if (requestedThreadId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        const target = result.threads.find((t) => t.id === requestedThreadId);
        if (target) openThread(target);
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authUserId) {
      setLoading(false);
      return;
    }
    void load();
    void migrateLegacyStars(authUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  // Back online: re-read what the offline line said was saved.
  const wasOnline = useRef(online);
  useEffect(() => {
    const backOnline = online && !wasOnline.current;
    wasOnline.current = online;
    if (backOnline && authUserId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const q = query.trim().toLowerCase();
  const term = query.trim();
  const searchingMessages = term.length >= MIN_GLOBAL_QUERY && view !== "starred";

  useEffect(() => {
    if (!searchingMessages) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const result = await searchMessages(term);
      if (cancelled) return;
      setSearching(false);
      if (!result.ok) {
        setSearchError(result.message);
        setHits([]);
        setHitsMore(false);
        return;
      }
      setSearchError(null);
      setHits(result.hits);
      setHitsMore(result.hasMore);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, searchingMessages]);

  const moreHits = async () => {
    const last = hits[hits.length - 1];
    if (!last) return;
    setSearching(true);
    const result = await searchMessages(term, { after: last });
    setSearching(false);
    if (result.ok) {
      setHits((prev) => [...prev, ...result.hits]);
      setHitsMore(result.hasMore);
    }
  };

  // Every live conversation by tab (archived ones aside, in their own view).
  const byTab = useMemo(() => {
    const out: Record<ProTab, MessageThread[]> = { clients: [], groups: [], enquiries: [], businesses: [] };
    for (const t of threads) if (!settings[t.id]?.archivedAt) out[tabOf(t, clientIds)].push(t);
    return out;
  }, [threads, settings, clientIds]);
  const archived = useMemo(() => threads.filter((t) => settings[t.id]?.archivedAt), [threads, settings]);
  const hasBusinesses = byTab.businesses.length > 0;
  const tabs = PRO_TABS.filter((t) => t !== "businesses" || hasBusinesses);
  const activeTab: ProTab = tabs.includes(tab) ? tab : "clients";
  const tabUnread: Partial<Record<ProTab, boolean>> = {
    clients: byTab.clients.some((t) => t.unreadCount > 0),
    groups: byTab.groups.some((t) => t.unreadCount > 0) || invitations.length > 0,
    enquiries: byTab.enquiries.some((t) => t.unreadCount > 0),
    businesses: byTab.businesses.some((t) => t.unreadCount > 0),
  };

  const matches = (t: MessageThread) => !q || t.participantName.toLowerCase().includes(q) || (t.lastMessagePreview ?? "").toLowerCase().includes(q);
  const pinnedFirst = (rows: MessageThread[]) => {
    const pinned = rows.filter((t) => settings[t.id]?.pinnedAt).sort((a, b) => (settings[b.id]?.pinnedAt ?? "").localeCompare(settings[a.id]?.pinnedAt ?? ""));
    const rest = rows.filter((t) => !settings[t.id]?.pinnedAt).sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
    return { pinned, rest };
  };
  const asItems = (rows: MessageThread[]): ChatListItem[] => rows.map((thread) => ({ type: "thread", thread }));

  /** The sections on screen for the active tab: [label, items]. */
  const sections: { label: string | null; items: ChatListItem[] }[] = useMemo(() => {
    if (view === "archived") return [{ label: null, items: asItems(archived.filter(matches)) }];
    const rows = byTab[activeTab].filter(matches);
    if (activeTab === "clients" || activeTab === "businesses") {
      const { pinned, rest } = pinnedFirst(rows);
      if (activeTab === "businesses") return [{ label: null, items: asItems([...pinned, ...rest]) }];
      return [
        { label: "Pinned", items: asItems(pinned) },
        { label: "Recent", items: asItems(rest) },
      ];
    }
    if (activeTab === "enquiries") {
      const waiting = rows.filter((t) => enquiryWaiting(t, authUserId));
      const earlier = rows.filter((t) => !enquiryWaiting(t, authUserId));
      const w = pinnedFirst(waiting);
      const e = pinnedFirst(earlier);
      return [
        { label: "Waiting for you", items: asItems([...w.pinned, ...w.rest]) },
        { label: "Earlier", items: asItems([...e.pinned, ...e.rest]) },
      ];
    }
    const invites: ChatListItem[] = invitations.filter((i) => !q || i.groupName.toLowerCase().includes(q)).map((invitation) => ({ type: "invite", invitation }));
    const g = pinnedFirst(rows);
    const bc: ChatListItem[] = lists
      .filter((l) => !q || l.name.toLowerCase().includes(q))
      .sort((a, b) => (b.lastSentAt ?? b.createdAt).localeCompare(a.lastSentAt ?? a.createdAt))
      .map((list) => ({ type: "broadcast", list, lastSentCount: lastSent[list.id] ?? null }));
    return [
      { label: "Groups", items: [...invites, ...asItems([...g.pinned, ...g.rest])] },
      { label: "Broadcasts", items: bc },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, archived, byTab, activeTab, q, settings, invitations, lists, lastSent, authUserId]);
  const shown = sections.filter((s) => s.items.length > 0);
  const tabEmpty = shown.length === 0;

  const proRows: ProRowOptions = {
    toneFor: (t) => toneOf(t.participantId ?? t.id),
    statusFor: (t) => {
      const kind = tabOf(t, clientIds);
      if (kind === "groups") {
        const n = memberCounts[t.id];
        return n ? { label: `${n} ${n === 1 ? "member" : "members"}`, color: INK.chF } : null;
      }
      if (kind === "enquiries") {
        const s = enquiryStatus(t, authUserId, cardKinds);
        return s ? { label: s.label, color: DOT_COLOUR[s.dot] } : null;
      }
      if (kind === "clients" && t.participantId && stages[t.participantId]) {
        const label = STAGE_LABEL[stages[t.participantId]];
        return { label, color: DOT_COLOUR[dotFor(label)] };
      }
      return null;
    },
  };

  const startChatWith = async (clientId: string) => {
    setNewChatBusy(true);
    setNewChatError(null);
    const r = await startThread(clientId);
    setNewChatBusy(false);
    if (!r.ok) return setNewChatError(r.message);
    setNewChatOpen(false);
    await load(r.threadId);
  };

  const failToast = (message: string) => {
    const offline = (typeof navigator !== "undefined" && navigator.onLine === false) || message === OFFLINE_MESSAGE;
    setToast(offline ? OFFLINE_TOAST : message.startsWith("You can pin") ? message : "Couldn't save. Try again.");
  };
  const writeSettings = async (t: MessageThread, patch: Parameters<typeof saveThreadSettings>[2], next: Partial<ThreadSettings>) => {
    if (!authUserId) return;
    const prev = settings[t.id];
    setSettings((all) => ({ ...all, [t.id]: { ...(all[t.id] ?? NO_SETTINGS), ...next } }));
    const r = await saveThreadSettings(t.id, authUserId, patch);
    if (!r.ok) {
      setSettings((all) => {
        const copy = { ...all };
        if (prev) copy[t.id] = prev;
        else delete copy[t.id];
        return copy;
      });
      failToast(r.message);
      return;
    }
    setSettings(await fetchThreadSettings());
  };
  const rowActions: RowActions = {
    pin: (t) => {
      const at = settings[t.id]?.pinnedAt ? null : new Date().toISOString();
      void writeSettings(t, { pinned_at: at }, { pinnedAt: at });
    },
    mute: (t, choice: MuteChoice) => {
      const patch = mutePatch(choice);
      void writeSettings(t, patch, { mutedAlways: !!patch.muted_always, mutedUntil: patch.muted_until ?? null });
    },
    archive: (t) => {
      const at = settings[t.id]?.archivedAt ? null : new Date().toISOString();
      void writeSettings(t, { archived_at: at }, { archivedAt: at });
    },
    ...(canDelete ? { delete: (t: MessageThread) => setDeleteTarget(t) } : null),
  };

  const confirmDelete = async () => {
    const t = deleteTarget;
    if (!t) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setDeleteTarget(null);
      setToast(OFFLINE_TOAST);
      return;
    }
    setDeleteBusy(true);
    const r = await deleteConversationForMe(t.id);
    setDeleteBusy(false);
    setDeleteTarget(null);
    if (!r.ok) {
      setToast(r.message === OFFLINE_MESSAGE ? OFFLINE_TOAST : "Couldn't delete. Try again.");
      return;
    }
    setAnnounce("Conversation deleted.");
    setThreads((all) => all.filter((x) => x.id !== t.id));
    unread.refresh();
    if (open?.id === t.id) {
      setOpen(null);
      setFocusId(null);
    }
    void load();
  };

  const liveIds = threads.filter((t) => (t.kind === "peer" && t.participantId) || t.kind === "group").slice(0, 30).map((t) => t.id);
  const overlays = (
    <>
      <DeleteConversationConfirm thread={deleteTarget} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} icon={<AlertCircle size={16} style={{ color: "#F09A8E" }} aria-hidden />} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  );
  const live = (node: React.ReactNode) => (
    <ThreadLiveProvider userId={authUserId} threadIds={liveIds}>
      {node}
      {overlays}
    </ThreadLiveProvider>
  );

  if (open) {
    const kind = tabOf(open, clientIds);
    const firstName = open.participantName.trim().split(/\s+/)[0] || "They";
    const stage = open.participantId ? stages[open.participantId] : undefined;
    const pro: ThreadViewPro =
      kind === "groups"
        ? { kind: "group", onShare: () => setShareOpen(true) }
        : kind === "enquiries"
          ? { kind: "enquiry", subtitle: "Enquiry", onOfferPlans: () => setOfferOpen(true) }
          : kind === "businesses"
            ? { kind: "business" }
            : { kind: "client", subtitle: stage ? STAGE_LABEL[stage] : undefined, onSharePlaylist: () => setPlaylistOpen(true) };
    return live(
      <div>
        <ThreadView
          key={open.id}
          thread={open}
          focusMessageId={focusId}
          settings={settings[open.id]}
          onSettingsChanged={async () => setSettings(await fetchThreadSettings())}
          onBack={closeThread}
          onDeleteConversation={canDelete ? () => setDeleteTarget(open) : undefined}
          pro={pro}
        />
        {authUserId && kind === "enquiries" && (
          <OfferPlansSheet open={offerOpen} onClose={() => setOfferOpen(false)} threadId={open.id} userId={authUserId} firstName={firstName} onSent={() => setAnnounce("Plans sent.")} />
        )}
        {authUserId && kind === "clients" && (
          <SharePlaylistSheet open={playlistOpen} onClose={() => setPlaylistOpen(false)} threadId={open.id} onShared={() => setAnnounce("Playlist shared.")} />
        )}
        {authUserId && kind === "groups" && (
          <ShareToGroupSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            threadId={open.id}
            userId={authUserId}
            coachesNutrition={lane !== "clinical_overview"}
            onShared={() => setAnnounce("Shared to the group.")}
          />
        )}
      </div>
    );
  }

  if (view === "newGroup") return live(<NewGroup clients={clients} onBack={() => setView("list")} onCreated={(threadId) => void load(threadId)} />);

  if (view === "broadcast")
    return live(
      <BroadcastEditor
        key={openList?.id ?? "new"}
        list={openList}
        clients={clients}
        onBack={() => {
          setOpenList(null);
          setView("list");
        }}
        onChanged={() => void load()}
      />
    );

  if (view === "invitation" && openInvitation)
    return live(
      <GroupInvitationView
        invitation={openInvitation}
        onBack={() => setView("list")}
        onJoined={(threadId) => {
          setOpenInvitation(null);
          void load(threadId);
        }}
        onDeclined={() => {
          setOpenInvitation(null);
          setView("list");
          void load();
        }}
      />
    );

  if (view === "starred")
    return live(
      <div>
        <MessagesHead title="Starred messages" onBack={() => setView("list")} />
        <StarredMessages
          threads={threads}
          authUserId={authUserId}
          onOpen={(threadId) => {
            const t = threads.find((x) => x.id === threadId);
            if (t) {
              setView("list");
              openThread(t);
            }
          }}
        />
      </div>
    );

  const noConversations = !loading && !error && view === "list" && threads.length === 0 && invitations.length === 0 && lists.length === 0;
  const showOffline = !online && threads.length > 0;

  const empty = (() => {
    if (q) return <EmptyState icon={Search} title="No chats match your search" />;
    if (view === "archived") return <EmptyState icon={Archive} title="No archived chats" />;
    if (activeTab === "groups") return <EmptyState icon={Users} title="No groups yet" line="Start a group for clients on the same programme." />;
    if (activeTab === "enquiries") return <EmptyState icon={Inbox} title="No enquiries yet" line="People who message you from your profile appear here until they hire you." />;
    if (activeTab === "businesses") return <EmptyState icon={Store} title="No business chats" />;
    if (noConversations || byTab.clients.length === 0) return <EmptyState icon={MessagesSquare} title="No client chats yet" line="Chats with hired clients appear here, with voice and video calls." />;
    return <EmptyState icon={CheckCheck} title="No chats here" />;
  })();

  return live(
    <div data-pro-messages="">
      <MessagesHead
        title={view === "archived" ? "Archived" : "Messages"}
        onBack={view === "archived" ? () => setView("list") : back}
        right={
          view === "list" ? (
            <>
              <RoundBtn icon={Star} label="Starred messages" onClick={() => setView("starred")} />
              <RoundBtn icon={SquarePen} label="New message" onClick={() => setNewOpen("all")} />
            </>
          ) : undefined
        }
      />

      {view === "list" && <MsgTabs tabs={tabs} active={activeTab} unread={tabUnread} onChange={setTab} />}
      <SearchField value={query} onChange={setQuery} />
      <div style={{ height: 16 }} />

      {showOffline && <OfflineLine />}
      {error && !showOffline && (
        <ProError
          message={error === OFFLINE_MESSAGE ? OFFLINE_TOAST : "Couldn't load messages."}
          onRetry={() => {
            setLoading(true);
            setError(null);
            void load();
          }}
        />
      )}
      {loading && !error && <ListSkeleton rows={4} />}

      {/* K1: Archived, at the top of the list (it scrolls away). */}
      {view === "list" && !loading && archived.length > 0 && (
        <button type="button" onClick={() => setView("archived")} data-archived-row="" className="tap w-full flex items-center text-left" style={{ gap: 12, padding: "10px 8px", minHeight: 56, borderBottom: `1px solid ${INK.b06}` }}>
          <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 36, height: 36, background: INK.prPale }}>
            <Archive size={17} style={{ color: INK.prDeep }} aria-hidden />
          </span>
          <span className="flex-1 min-w-0" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
            Archived
          </span>
          <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>{archived.length}</span>
        </button>
      )}

      {!loading && !error && (searchingMessages ? shown.length > 0 : true) && (
        <>
          {searchingMessages && shown.length > 0 && <SecLabel first>Chats</SecLabel>}
          {!searchingMessages && tabEmpty && empty}
          {shown.map((s, i) => (
            <section key={s.label ?? "all"} aria-label={s.label ?? undefined}>
              {s.label && !searchingMessages && <SecLabel first={i === 0}>{s.label}</SecLabel>}
              <ThreadList
                items={s.items}
                settings={settings}
                onOpenInvitation={(inv) => {
                  setOpenInvitation(inv);
                  setView("invitation");
                }}
                onOpenBroadcast={(list) => {
                  setOpenList(list);
                  setView("broadcast");
                }}
                readState={readState}
                delivered={delivered}
                authUserId={authUserId}
                onOpen={openThread}
                actions={rowActions}
                pro={proRows}
              />
            </section>
          ))}
          {view === "list" && !searchingMessages && activeTab === "groups" && <Footnote>Members see each other's first name and photo, never health data.</Footnote>}
          {view === "list" && !searchingMessages && activeTab === "enquiries" && !tabEmpty && <Footnote>Enquiries move to Clients when the person hires you.</Footnote>}
        </>
      )}

      {searchingMessages && (
        <section aria-label="Messages">
          <SecLabel first={shown.length === 0}>Messages</SecLabel>
          {searchError && <p style={{ fontSize: textPx(12.5), color: INK.hi, padding: "8px 0" }}>{searchError}</p>}
          {!searching && !searchError && hits.length === 0 && (
            <p className="text-center" style={{ fontSize: textPx(13), color: INK.chS, padding: "24px 0" }}>
              No messages match "{term}".
            </p>
          )}
          <SearchResults
            hits={hits}
            query={term}
            titleFor={(h) => {
              const name = threads.find((t) => t.id === h.threadId)?.participantName ?? "Conversation";
              return h.senderId === authUserId ? `You → ${name}` : name;
            }}
            onOpen={(h) => {
              const t = threads.find((x) => x.id === h.threadId);
              if (!t) return;
              setFocusId(h.messageId);
              openThread(t);
            }}
            hasMore={hitsMore}
            loadingMore={searching}
            onMore={() => void moreHits()}
          />
        </section>
      )}

      {/* gen/r15.js fab15 "New group": 52 round, 18 from the right, 104 up, Plus 22 / 2.4. */}
      {view === "list" && activeTab === "groups" && (
        <button
          type="button"
          onClick={() => setNewOpen("groups")}
          aria-label="New group"
          data-fab=""
          className="tap fixed z-30 rounded-full flex items-center justify-center bg-primary-fill text-on-primary-fill dark:shadow-none lg:bottom-8"
          style={{ width: 52, height: 52, right: 18, bottom: "calc(env(safe-area-inset-bottom) + 104px)", boxShadow: "0 8px 22px rgba(95,80,147,0.28)" }}
        >
          <Plus size={22} strokeWidth={2.4} aria-hidden />
        </button>
      )}

      <BottomSheet open={!!newOpen} onClose={() => setNewOpen(null)} title="New">
        <div className="flex flex-col">
          {[
            ...(newOpen === "all" ? [{ icon: MessageSquarePlus, label: "New chat", sub: "Message one of your clients", go: () => setNewChatOpen(true) }] : []),
            { icon: Users, label: "New group", sub: "Invite clients to a group chat", go: () => setView("newGroup") },
            {
              icon: Megaphone,
              label: "New broadcast",
              sub: "One message to several clients, each privately",
              go: () => {
                setOpenList(null);
                setView("broadcast");
              },
            },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                setNewOpen(null);
                o.go();
              }}
              className="tap w-full flex items-center text-left"
              style={{ gap: 12, minHeight: 60, padding: "0 4px", borderBottom: `1px solid ${INK.b06}` }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: INK.prPale }}>
                <o.icon size={18} style={{ color: INK.prDeep }} aria-hidden />
              </span>
              <span>
                <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                  {o.label}
                </span>
                <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
                  {o.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={newChatOpen} onClose={() => setNewChatOpen(false)} title="New chat">
        {newChatError && (
          <p role="alert" style={{ fontSize: textPx(12), color: INK.hi, background: INK.hiBg, borderRadius: 12, padding: "8px 12px", marginBottom: 8 }}>
            {newChatError}
          </p>
        )}
        <ClientPicker
          clients={clients}
          selected={new Set()}
          onToggle={(id) => {
            if (!newChatBusy) void startChatWith(id);
          }}
        />
      </BottomSheet>
    </div>
  );
}
