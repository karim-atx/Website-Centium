import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Archive, CheckCheck, Megaphone, MessageCircle, MessageSquarePlus, Plus, Search, Star, Users } from "lucide-react";
import { ThreadList, type ChatListItem, type RowActions } from "../../components/messages/ThreadList";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { Toast } from "../../components/ui/Toast";
import { ClientPicker, type PickableClient } from "../../components/messages/ClientPicker";
import { NewGroup } from "../../components/messages/NewGroup";
import { BroadcastEditor } from "../../components/messages/BroadcastEditor";
import { GroupInvitationView } from "../../components/messages/GroupInvitationView";
import { ThreadView } from "../../components/messages/ThreadView";
import { MessagesHeader } from "../../components/messages/MessagesHeader";
import { DeleteConversationConfirm } from "../../components/messages/DeleteConversationConfirm";
import {
  BizEmptyCard,
  BizListError,
  BizListHeader,
  BizListSkeleton,
  BizNewMessageSheet,
  BizOfflineBanner,
} from "../../components/messages/BusinessList";
import { Chip } from "../../components/ui/Chip";
import { useOnline } from "../../hooks/useOnline";
import { useListColors, type ListColors } from "../../components/messages/listColors";
import { useBackCloses } from "../../hooks/useBackCloses";
import { StarredMessages } from "../../components/messages/StarredMessages";
import { SearchResults } from "../../components/messages/SearchResults";
import { useApp } from "../../context/AppContext";
import { ThreadLiveProvider } from "../../context/ThreadLiveContext";
import { useUnread } from "../../context/UnreadContext";
import { fetchThreads, migrateLegacyStars, startMemberThread, startThread, threadForPush, type MessageThread } from "../../services/messaging";
import { fetchGroupInvitations, type GroupInvitation } from "../../services/messaging/groups";
import { fetchBroadcastLists, fetchBroadcasts, type BroadcastList } from "../../services/messaging/broadcasts";
import { OFFLINE_MESSAGE } from "../../services/network-error";
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
} from "../../services/messaging/chatFeatures";

/**
 * Messages, for every account type (phase 2A, screen 1; v6 MO1.7 / MO1.7.e).
 *
 * ONE ROUTE FOR BOTH SIDES: a thread is two profile ids and nothing about it is
 * role-specific, so a professional and a client read the same screen.
 *
 * THE LIST: search, All / Unread / Groups sub-tabs, pinned chats first,
 * archived chats in their own view, a mute mark, and a sent/read tick on your
 * own last message. Pin, mute and archive are the reader's own and change
 * nothing for the other person. v6: the title, search and sub-tabs are one
 * fixed area (FixedHeader); rows swipe left for Pin / Mute / Delete (for
 * me, B3), and the row ⋮ menu adds Archive (decision D1: Archive and
 * Delete both kept).
 *
 * PHASE 2B (screens 4 and 5): groups sit in the same list as direct chats,
 * invitations waiting for an answer sit at the top, and a professional's
 * broadcast lists appear as their own rows. The Groups and Broadcasts filters
 * narrow to those; Broadcasts is a professional's filter only, because a
 * client receives a broadcast as an ordinary message in their direct chat.
 * The "+" button (professionals) starts a chat, a group or a broadcast. A
 * business has no "new chat" yet: it may only message its own members or
 * customers, which needs PB-O-43 (K13).
 *
 * SEARCH COVERS CHATS AND MESSAGES. Chats are matched here by name and latest
 * message; messages through the database's search (Database 20261002070000),
 * which applies the conversation's own visibility and includes archived chats.
 * Outside one chat it needs two characters.
 *
 * THE LIST DOES NOT POLL. Only an open conversation does; the list re-reads on
 * returning from a thread, which is the moment it is actually stale.
 */

type Filter = "all" | "unread" | "groups" | "broadcasts";
const OFFLINE_TOAST = "You're offline. Try again when you're connected.";

export default function Messages() {
  const { authUserId, user, professionalClients } = useApp();
  const unread = useUnread();
  const isProfessional = user.accountType === "professional";
  /** OP1-190: a business reads the list in ClientChatV2's language (BusinessList.tsx). */
  const biz = user.accountType === "business";
  const online = useOnline();
  const [bizNewOpen, setBizNewOpen] = useState(false);
  const c = useListColors();
  // The professional's connected clients, for every picker in 2B. Only these
  // can be invited, added to a list or messaged first.
  const clients: PickableClient[] = useMemo(
    () =>
      professionalClients
        .filter((cl) => cl.clientId)
        .map((cl) => ({ userId: cl.clientId!, name: cl.name, avatarUrl: cl.avatarUrl ?? null })),
    [professionalClients]
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [settings, setSettings] = useState<Record<string, ThreadSettings>>({});
  const [readState, setReadState] = useState<Record<string, string | null>>({});
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<MessageThread | null>(null);
  /** The message to show when a chat is opened from a search result. */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [hitsMore, setHitsMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "archived" | "starred" | "newGroup" | "broadcast" | "invitation">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [lists, setLists] = useState<BroadcastList[]>([]);
  /** The newest broadcast's "Sent to N" per list. */
  const [lastSent, setLastSent] = useState<Record<string, number>>({});
  const [openList, setOpenList] = useState<BroadcastList | null>(null);
  const [openInvitation, setOpenInvitation] = useState<GroupInvitation | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatBusy, setNewChatBusy] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** O2 / O3: a write that failed, as a toast. */
  const [toast, setToast] = useState<string | null>(null);
  /** The conversation the delete confirm is open for (OURS-MO1.7-delete-confirm). */
  const [deleteTarget, setDeleteTarget] = useState<MessageThread | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  /** Polite announcements ("Conversation deleted."). */
  const [announce, setAnnounce] = useState("");
  const canDelete = CONVERSATION_DELETE_READY;
  /**
   * O10: when the fixed area would take more than 40% of the screen (Larger
   * text on a short screen), only the title row stays fixed and the search
   * and sub-tabs scroll with the list.
   */
  const [splitHeader, setSplitHeader] = useState(false);
  useLayoutEffect(() => {
    const check = () => {
      const head = document.getElementById("messages-fixed");
      const block = document.getElementById("messages-search-block");
      if (!head || !block) return;
      const total = head.offsetHeight + (splitHeader ? block.offsetHeight + 12 : 0);
      const next = total > window.innerHeight * 0.4;
      if (next !== splitHeader) setSplitHeader(next);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  });
  // Batch E (E5): an open thread is in-page state, so the phone's back returns
  // to the conversation list instead of leaving Messages.
  const closeThread = () => {
    setOpen(null);
    setFocusId(null);
    // Re-read on the way back, so a thread just replied to moves up with its
    // new preview.
    void load();
  };
  useBackCloses(!!open, closeThread);

  // Set by MessageProfessionalButton: the thread id travels in navigation state
  // and is resolved once the threads arrive. Consumed exactly once, so coming
  // back from a thread does not re-open it.
  const requestedThreadId = (location.state as { threadId?: string } | null)?.threadId ?? null;
  const deepLinkConsumed = useRef(false);
  // A tapped message notification lands here as ?push=<id>; see threadForPush.
  const pushId = new URLSearchParams(location.search).get("push");

  const load = async (thenOpenId?: string) => {
    const [result, s, invites] = await Promise.all([fetchThreads(), fetchThreadSettings(), fetchGroupInvitations()]);
    setSettings(s);
    setInvitations(invites);
    if (isProfessional) {
      void Promise.all([fetchBroadcastLists(), fetchBroadcasts(100)]).then(([ls, sent]) => {
        setLists(ls ?? []);
        const latest: Record<string, number> = {};
        for (const b of sent) if (b.listId && !(b.listId in latest)) latest[b.listId] = b.sentCount;
        setLastSent(latest);
      });
    }
    if (result.ok) {
      setThreads(result.threads);
      setError(null);
      if (thenOpenId) {
        const target = result.threads.find((t) => t.id === thenOpenId);
        if (target) {
          setView("list");
          setOpen(target);
        }
      }
      // Only your own latest messages carry a tick.
      const mineLast = result.threads
        .filter((t) => t.lastMessageId && t.lastMessageSenderId === authUserId)
        .map((t) => t.lastMessageId!);
      void fetchLastMessageState(mineLast).then(({ readAt, delivered: reached }) => {
        setReadState(readAt);
        setDelivered(reached);
      });
      if (pushId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        navigate("/app/messages", { replace: true });
        const threadId = await threadForPush(pushId);
        const target = threadId ? result.threads.find((t) => t.id === threadId) : undefined;
        if (target) setOpen(target);
      } else if (requestedThreadId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        const target = result.threads.find((t) => t.id === requestedThreadId);
        if (target) setOpen(target);
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
    // Stars made the old way since the database moved them; once per account.
    void migrateLegacyStars(authUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  // OP1-190 O3: back online, the business list re-reads what the offline
  // line said was saved.
  const wasOnline = useRef(online);
  useEffect(() => {
    const back = online && !wasOnline.current;
    wasOnline.current = online;
    if (back && biz && authUserId) void load();
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
  const openHit = (h: SearchHit) => {
    const t = threads.find((x) => x.id === h.threadId);
    if (!t) return;
    setFocusId(h.messageId);
    setOpen(t);
  };
  const { active, archived, activeTotal } = useMemo(() => {
    const matches = (t: MessageThread) =>
      !q || t.participantName.toLowerCase().includes(q) || (t.lastMessagePreview ?? "").toLowerCase().includes(q);
    const archivedSet = threads.filter((t) => settings[t.id]?.archivedAt);
    const activeSet = threads.filter((t) => !settings[t.id]?.archivedAt);
    const byFilter = (t: MessageThread) =>
      filter === "all" ||
      (filter === "unread" && t.unreadCount > 0) ||
      (filter === "groups" && t.kind === "group");
    return {
      active: activeSet.filter(matches).filter(byFilter),
      archived: archivedSet.filter(matches),
      activeTotal: activeSet.length,
    };
  }, [threads, settings, q, filter]);

  /**
   * The rows on screen. Invitations first (they are waiting on an answer),
   * then pinned chats, then chats and broadcast lists newest first.
   */
  const items: ChatListItem[] = useMemo(() => {
    if (view === "archived") return archived.map((thread) => ({ type: "thread", thread }));
    const invites: ChatListItem[] =
      filter === "all" || filter === "groups"
        ? invitations
            .filter((i) => !q || i.groupName.toLowerCase().includes(q))
            .map((invitation) => ({ type: "invite", invitation }))
        : [];
    const bcRows =
      isProfessional && (filter === "all" || filter === "broadcasts")
        ? lists
            .filter((l) => !q || l.name.toLowerCase().includes(q))
            .map((list) => ({
              at: list.lastSentAt ?? list.createdAt,
              item: { type: "broadcast", list, lastSentCount: lastSent[list.id] ?? null } as ChatListItem,
            }))
        : [];
    if (filter === "broadcasts") return bcRows.sort((a, b) => b.at.localeCompare(a.at)).map((x) => x.item);
    const pinned = active
      .filter((t) => settings[t.id]?.pinnedAt)
      .sort((a, b) => (settings[b.id]?.pinnedAt ?? "").localeCompare(settings[a.id]?.pinnedAt ?? ""));
    const rest = [
      ...active.filter((t) => !settings[t.id]?.pinnedAt).map((thread) => ({
        at: thread.lastMessageAt ?? "",
        item: { type: "thread", thread } as ChatListItem,
      })),
      ...bcRows,
    ].sort((a, b) => b.at.localeCompare(a.at));
    return [...invites, ...pinned.map((thread) => ({ type: "thread", thread }) as ChatListItem), ...rest.map((x) => x.item)];
  }, [view, archived, active, invitations, lists, lastSent, isProfessional, filter, q, settings]);

  const startChatWith = async (clientId: string) => {
    setNewChatBusy(true);
    setNewChatError(null);
    const r = await startThread(clientId);
    setNewChatBusy(false);
    if (!r.ok) return setNewChatError(r.message);
    setNewChatOpen(false);
    setBizNewOpen(false);
    await load(r.threadId);
  };

  /** OP1-190 S2 / MO1.7 K13: a business opens (or reuses) its thread with one of its members or customers. */
  const startMemberChat = async (businessId: string, personId: string) => {
    setNewChatBusy(true);
    setNewChatError(null);
    const r = await startMemberThread(businessId, personId);
    setNewChatBusy(false);
    if (!r.ok) return setNewChatError(r.message);
    setBizNewOpen(false);
    await load(r.threadId);
  };

  // O2 / O3: what a failed write says. The pin cap's own line stays (ATX38).
  const failToast = (message: string) => {
    const offline = (typeof navigator !== "undefined" && navigator.onLine === false) || message === OFFLINE_MESSAGE;
    setToast(offline ? OFFLINE_TOAST : message.startsWith("You can pin") ? message : "Couldn't save. Try again.");
  };

  /** Pin, mute and archive from a row: shown at once, reverted if the write fails. */
  const writeSettings = async (
    t: MessageThread,
    patch: Parameters<typeof saveThreadSettings>[2],
    next: Partial<ThreadSettings>
  ) => {
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
    // Gone from the list at once; my_conversations() leaves it out from now on
    // until a newer message arrives. The server dropped its pin and archive
    // and kept its mute, so the settings are re-read, not guessed.
    setThreads((all) => all.filter((x) => x.id !== t.id));
    unread.refresh();
    if (open?.id === t.id) {
      setOpen(null);
      setFocusId(null);
    }
    void load();
  };

  // Typing and online status for the chats in the list and the open one; the
  // database decides who may see what (ThreadLiveContext). Person-to-person
  // chats only, and at most 30 channels.
  const liveIds = threads
    .filter((t) => (t.kind === "peer" && t.participantId) || t.kind === "group")
    .slice(0, 30)
    .map((t) => t.id);
  const overlays = (
    <>
      <DeleteConversationConfirm
        thread={deleteTarget}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        onExpire={() => setToast(null)}
        icon={<AlertCircle size={16} style={{ color: "#F09A8E" }} aria-hidden />}
      />
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
        />
      </div>
    );
  }

  if (view === "newGroup") {
    return live(
      <NewGroup
        clients={clients}
        onBack={() => setView("list")}
        onCreated={(threadId) => void load(threadId)}
      />
    );
  }

  if (view === "broadcast") {
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
  }

  if (view === "invitation" && openInvitation) {
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
  }

  if (view === "starred") {
    return live(
      <div>
        {/* K11: the #2-#4 header pattern, "Starred messages" (business: the
            OP1-190 title row with the chat's back, K2). */}
        {biz ? (
          <div className="-mt-2">
            <BizListHeader title="Starred messages" onBack={() => setView("list")} />
          </div>
        ) : (
          <FixedHeader paddingBottom={12}>
            <MessagesHeader title="Starred messages" onBack={() => setView("list")} />
          </FixedHeader>
        )}
        <StarredMessages
          threads={threads}
          authUserId={authUserId}
          onOpen={(threadId) => {
            const t = threads.find((x) => x.id === threadId);
            if (t) {
              setView("list");
              setOpen(t);
            }
          }}
        />
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "All" },
    // K4: no count on "Unread" (the frame draws none; the rows' badges say it).
    { key: "unread", label: "Unread" },
    { key: "groups", label: "Groups" },
    ...(isProfessional ? [{ key: "broadcasts", label: "Broadcasts" }] : []),
  ];
  // #11: the active sub-tab is the theme secondary with white; dark keeps the
  // literal #79A8A1 in Centium (V6-94). High contrast (O7): a teal that holds
  // 4.5:1 with white (the teal text token light, #35655E dark).
  const tealLight = c.hc
    ? { activeFill: "rgb(var(--c-teal-text))", activeInk: "#FFFFFF", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" }
    : undefined;
  const tealDark = c.hc ? "#35655E" : c.colorTheme === "centium" ? "#79A8A1" : undefined;

  // MO1.7.e: no conversation at all (archived ones aside: their row still
  // shows above, D1); only after a successful load (O1, O2).
  const noConversations =
    !loading && !error && view === "list" && activeTotal === 0 && invitations.length === 0 && lists.length === 0;
  const hasAnything = threads.length > 0 || invitations.length > 0 || lists.length > 0;
  const listEmpty = !loading && !error && hasAnything && !noConversations && items.length === 0 && !searchingMessages;

  const searchBlock = (
    <div id="messages-search-block">
        {/* #7-#9: the search field, 44 tall (V6-115). */}
        <label
          data-search-field=""
          className="mt-[11px] flex items-center gap-2 h-11 rounded-[14px] px-3"
          style={{ background: c.fieldFill, border: `0.5px solid ${c.fieldBorder}` }}
        >
          <Search size={16} className="shrink-0" style={{ color: c.muted }} aria-hidden />
          <span className="sr-only">Search messages and chats</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="flex-1 min-w-0 bg-transparent text-[13.5px] leading-[20.3px] font-normal text-charcoal placeholder:text-charcoal-muted focus:outline-none"
          />
        </label>

        {/* #10-#12: FO3 sub-tabs; a professional's 4th tab scrolls (S10). */}
        {view === "list" && (
          <SegmentedTabs
            className="mt-3"
            variant="teal"
            items={tabs}
            activeKey={filter}
            onChange={(k) => setFilter(k as Filter)}
            scroll={isProfessional}
            light={tealLight}
            activeFillDark={tealDark}
          />
        )}
    </div>
  );

  // Messages found by the database's search, under the chats (both lists).
  const hitsSection = searchingMessages && (
    <section className="mt-3" aria-label="Messages">
      <SectionLabel c={c}>Messages</SectionLabel>
      {searchError && (
        <p className="text-[12.5px] py-2" style={{ color: c.dangerText }}>
          {searchError}
        </p>
      )}
      {!searching && !searchError && hits.length === 0 && (
        <p className="text-[13px] text-center py-6" style={{ color: c.inkSoft }}>
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
        onOpen={openHit}
        hasMore={hitsMore}
        loadingMore={searching}
        onMore={() => void moreHits()}
      />
    </section>
  );

  const threadList = (
    <ThreadList
      items={items}
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
      onOpen={setOpen}
      actions={rowActions}
      business={biz}
    />
  );

  // OP1-190: the business list (ClientChatV2 state="list", template 22-37).
  // Everything scrolls together as drawn (no fixed area); the page's 16 top
  // (the shell gives 24). Filters, Starred and Archived, search across
  // messages, swipe and the ⋮ menu are the live features kept (K1, K2, S3).
  if (biz) {
    // O3: offline over chats already loaded keeps them, with one line; a
    // first load that failed (or failed online) is O2.
    const showOffline = !online && threads.length > 0;
    const showError = !!error && !showOffline;
    return live(
      <div className="-mt-2" data-biz-messages="">
        {view === "archived" ? (
          <BizListHeader title="Archived" onBack={() => setView("list")} />
        ) : (
          <BizListHeader
            title="Messages"
            onNew={() => {
              setNewChatError(null);
              setBizNewOpen(true);
            }}
          />
        )}

        {/* Row 3: h44 r14 card, 1px border, padding 0 12, gap 8, search 16 faint, "Search" 14 faint; 6 under. */}
        <label data-search-field="" className="flex items-center gap-2 h-11 rounded-[14px] px-3 mb-1.5 bg-cream-card border border-charcoal/[0.08]">
          <Search size={16} className="shrink-0 text-charcoal-faint" aria-hidden />
          <span className="sr-only">Search messages and chats</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 min-w-0 bg-transparent text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none"
          />
        </label>

        {/* K1: the filters in the handover chip style. */}
        {view === "list" && (
          <div data-biz-filters="" className="scroll-row no-scrollbar flex gap-2 py-1.5">
            {tabs.map((tab) => (
              <Chip key={tab.key} active={filter === tab.key} aria-pressed={filter === tab.key} onClick={() => setFilter(tab.key as Filter)}>
                {tab.label}
              </Chip>
            ))}
          </div>
        )}

        {showOffline && <BizOfflineBanner />}
        {showError && (
          <BizListError
            onRetry={() => {
              setLoading(true);
              setError(null);
              void load();
            }}
          />
        )}
        {loading && !error && <BizListSkeleton />}

        {/* O4: no conversation yet. */}
        {noConversations && <BizEmptyCard title="No messages yet" helper="Messages with your team and members show here." />}

        {searchingMessages && items.length > 0 && <SectionLabel c={c}>Chats</SectionLabel>}

        {listEmpty &&
          (q ? (
            <BizEmptyCard icon={<Search size={22} aria-hidden />} title="No chats match your search" />
          ) : view === "archived" ? (
            <BizEmptyCard icon={<Archive size={22} aria-hidden />} title="No archived chats" />
          ) : filter === "unread" ? (
            <BizEmptyCard icon={<CheckCheck size={22} aria-hidden />} title="You're all caught up" />
          ) : filter === "groups" ? (
            <BizEmptyCard icon={<Users size={22} aria-hidden />} title="No groups yet" />
          ) : (
            <BizEmptyCard title="No chats here" />
          ))}

        {!loading && threadList}

        {hitsSection}

        {/* K2: Starred and Archived as links under the list. */}
        {view === "list" && !loading && (
          <div data-biz-links="" className="flex flex-wrap gap-x-5 mt-2">
            <button
              type="button"
              onClick={() => setView("starred")}
              data-starred-button=""
              className="tap min-h-[44px] flex items-center gap-1.5 text-[13px] font-bold text-primary-dark"
            >
              <Star size={15} strokeWidth={2} aria-hidden />
              Starred messages
            </button>
            {archived.length > 0 && (
              <button
                type="button"
                onClick={() => setView("archived")}
                data-archived-row=""
                className="tap min-h-[44px] flex items-center gap-1.5 text-[13px] font-bold text-primary-dark"
              >
                <Archive size={15} strokeWidth={2} aria-hidden />
                Archived · {archived.length}
              </button>
            )}
          </div>
        )}

        <BizNewMessageSheet
          open={bizNewOpen}
          onClose={() => setBizNewOpen(false)}
          busy={newChatBusy}
          error={newChatError}
          onPick={(id) => {
            if (!newChatBusy) void startChatWith(id);
          }}
          onPickMember={(bid, personId) => {
            if (!newChatBusy) void startMemberChat(bid, personId);
          }}
        />
      </div>
    );
  }

  return live(
    <div>
      <FixedHeader paddingBottom={12} id="messages-fixed">
        {view === "archived" ? (
          <MessagesHeader title="Archived" onBack={() => setView("list")} />
        ) : (
          <MessagesHeader
            title="Messages"
            right={
              // #5 / #6: 36 r11 tile, Star 18; a 44 hit area.
              <button
                type="button"
                onClick={() => setView("starred")}
                aria-label="Starred messages"
                data-starred-button=""
                className="tap relative w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']"
                style={{ background: c.primaryTint, color: c.primaryInk }}
              >
                <Star size={18} aria-hidden />
              </button>
            }
          />
        )}

        {!splitHeader && searchBlock}
      </FixedHeader>
      {splitHeader && searchBlock}

      {/* O2: the first load failed. */}
      {error && (
        <div role="alert" className="flex flex-col items-center text-center py-8 gap-1">
          <p className="text-[12.5px] leading-[18.8px] font-medium" style={{ color: c.dangerText }}>
            {error === OFFLINE_MESSAGE ? OFFLINE_TOAST : "Couldn't load messages."}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void load();
            }}
            className="tap min-h-[44px] px-3 text-[12.5px] font-bold"
            style={{ color: c.primaryInk }}
          >
            Retry
          </button>
        </div>
      )}

      {/* O1: five skeleton rows while the list loads. */}
      {loading && !error && <ListSkeleton c={c} />}

      {/* K1: the Archived row, at the top of the list (scrolls away). */}
      {view === "list" && !loading && archived.length > 0 && (
        <button
          type="button"
          onClick={() => setView("archived")}
          data-archived-row=""
          className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-left"
          style={{ background: c.rowFill, borderBottom: `0.5px solid ${c.rowRule}` }}
        >
          <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primaryTint }}>
            <Archive size={20} style={{ color: c.primaryInk }} aria-hidden />
          </span>
          <span className="flex-1 min-w-0 text-[15px] leading-[22.5px] font-bold" style={{ color: c.ink }}>
            Archived
          </span>
          <span className="text-[12px] leading-[18px] font-bold" style={{ color: c.primaryInk }}>
            {archived.length}
          </span>
        </button>
      )}

      {noConversations && (
        <EmptyState
          c={c}
          icon={<MessageCircle size={26} aria-hidden />}
          title="No conversations yet"
          helper={
            isProfessional
              ? "Chats with your clients and groups show up here. Tap + to start one."
              : "Chats with your professionals, gyms and groups show up here."
          }
          frame
        />
      )}

      {searchingMessages && items.length > 0 && <SectionLabel c={c}>Chats</SectionLabel>}

      {/* O4: the per-tab empties, in the MO1.7.e pattern. */}
      {listEmpty &&
        (q ? (
          <EmptyState c={c} icon={<Search size={26} aria-hidden />} title="No chats match your search" />
        ) : view === "archived" ? (
          <EmptyState c={c} icon={<Archive size={26} aria-hidden />} title="No archived chats" />
        ) : filter === "unread" ? (
          <EmptyState c={c} icon={<CheckCheck size={26} aria-hidden />} title="You're all caught up" />
        ) : filter === "groups" ? (
          <EmptyState
            c={c}
            icon={<Users size={26} aria-hidden />}
            title="No groups yet"
            helper={isProfessional ? "Tap + to start one." : "A professional can invite you to one."}
          />
        ) : filter === "broadcasts" ? (
          <EmptyState c={c} icon={<Megaphone size={26} aria-hidden />} title="No broadcast lists yet" helper="Tap + to send one." />
        ) : (
          <EmptyState c={c} icon={<MessageCircle size={26} aria-hidden />} title="No chats here" />
        ))}

      {!loading && threadList}

      {hitsSection}

      {/* NEW CHAT, GROUP OR BROADCAST (K5): the handover's FAB, 56 round on the
          primary fill (#AEA1DC / #A991FE), Plus 22, shadow in light only.
          Professionals only: a client's chats start from a professional's
          profile, and clients cannot make groups or lists. */}
      {isProfessional && view === "list" && (
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          aria-label="New chat, group or broadcast"
          data-fab=""
          className="tap fixed z-30 right-4 lg:right-8 bottom-[calc(env(safe-area-inset-bottom)+80px)] lg:bottom-8 w-14 h-14 rounded-full bg-primary-fill text-on-primary-fill flex items-center justify-center shadow-fab dark:shadow-none"
        >
          <Plus size={22} aria-hidden />
        </button>
      )}

      <BottomSheet open={newOpen} onClose={() => setNewOpen(false)} title="New">
        <div className="flex flex-col animate-fade-slide-up">
          {(
            [
              { icon: MessageSquarePlus, label: "New chat", sub: "Message one of your clients", go: () => setNewChatOpen(true) },
              { icon: Users, label: "New group", sub: "Invite clients to a group chat", go: () => setView("newGroup") },
              { icon: Megaphone, label: "New broadcast", sub: "One message to several clients, each privately", go: () => { setOpenList(null); setView("broadcast"); } },
            ] as const
          ).map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                setNewOpen(false);
                o.go();
              }}
              className="tap w-full flex items-center gap-3 px-1 min-h-[60px] text-left border-b border-charcoal/[0.06] last:border-b-0"
            >
              {/* K5: the settings row pattern, a 36 r11 tile. */}
              <span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: c.primaryTint }}>
                <o.icon size={18} style={{ color: c.primaryInk }} aria-hidden />
              </span>
              <span>
                <span className="block text-[14px] leading-[19px] font-semibold" style={{ color: c.ink }}>
                  {o.label}
                </span>
                <span className="block text-[12px] leading-[16px] font-normal" style={{ color: c.muted }}>
                  {o.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={newChatOpen} onClose={() => setNewChatOpen(false)} title="New chat">
        <div className="animate-fade-slide-up">
          {newChatError && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2 mb-2">{newChatError}</p>}
          <ClientPicker
            clients={clients}
            selected={new Set()}
            onToggle={(id) => {
              if (!newChatBusy) void startChatWith(id);
            }}
          />
        </div>
      </BottomSheet>
    </div>
  );
}

/** S5: the search sections' labels, 10.5 / 14 700 ls 1.3 uppercase in the primary ink. */
const SectionLabel: React.FC<{ c: ListColors; children: React.ReactNode }> = ({ c, children }) => (
  <h2 className="mt-3 mb-1 px-1 text-[10.5px] leading-[14px] font-bold uppercase tracking-[1.3px]" style={{ color: c.primaryInk }}>
    {children}
  </h2>
);

/**
 * MO1.7.e's empty state (#13-#16): a 56 r16 tile in the primary tint with a
 * 26 glyph, the title 16 / 20.8 800, the helper 12.5 / 18.8 400 in 260, gap
 * 10. `frame`: the whole-list empty, its tile 193 under the fixed area as
 * drawn (tile top 353.7, fixed area end 160.8); the per-tab empties sit 40
 * under the tabs.
 */
const EmptyState: React.FC<{ c: ListColors; icon: React.ReactNode; title: string; helper?: string; frame?: boolean }> = ({
  c,
  icon,
  title,
  helper,
  frame,
}) => (
  <div
    data-empty-state=""
    className="flex flex-col items-center text-center gap-2.5"
    style={{ paddingTop: frame ? 192.9 : 40, paddingBottom: 40 }}
  >
    <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: c.primaryTint, color: c.primaryInk }}>
      {icon}
    </span>
    <p className="text-[16px] leading-[20.8px] font-extrabold" style={{ color: c.ink }}>
      {title}
    </p>
    {helper && (
      <p className="max-w-[260px] text-[12.5px] leading-[18.8px] font-normal" style={{ color: c.inkSoft }}>
        {helper}
      </p>
    )}
  </div>
);

/** O1: five 72 rows, a 48 circle and two bars (120 × 14, 220 × 12, r6), pulsing 1.2 s. */
const ListSkeleton: React.FC<{ c: ListColors }> = ({ c }) => (
  <div aria-busy="true">
    <span className="sr-only">Loading messages</span>
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        aria-hidden
        className="flex items-center gap-3 px-1 py-3 min-h-[72px] animate-skeleton-pulse"
        style={{ borderBottom: `0.5px solid ${c.rowRule}` }}
      >
        <span className="w-12 h-12 rounded-full shrink-0" style={{ background: c.skeleton }} />
        <span className="flex flex-col gap-2">
          <span className="block rounded-md" style={{ width: 120, height: 14, background: c.skeleton }} />
          <span className="block rounded-md" style={{ width: 220, height: 12, background: c.skeleton }} />
        </span>
      </div>
    ))}
  </div>
);
