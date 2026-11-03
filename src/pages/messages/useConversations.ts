import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ChatListItem, RowActions } from "../../components/messages/ThreadList";
import { useOnline } from "../../hooks/useOnline";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { fetchThreads, migrateLegacyStars, startMemberThread, startThread, threadForPush, type MessageThread } from "../../services/messaging";
import { fetchGroupInvitations, type GroupInvitation } from "../../services/messaging/groups";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { t, tk } from "../../i18n/core";
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
 * The client and business Messages list: its data and what its rows do
 * (load, deep links, search, filters, pin / mute / archive, delete for me).
 * Moved out of Messages.tsx unchanged so the mobile screen and the website
 * viewport page (Messages.web.tsx, WC-MO.4) read the same state; the mobile
 * screen renders exactly as before.
 */

export type Filter = "all" | "unread" | "groups";
export const OFFLINE_TOAST = tk("You're offline. Try again when you're connected.");

export function useConversations() {
  const { authUserId, user } = useApp();
  const unread = useUnread();
  /** OP1-190: a business reads the list in ClientChatV2's language (BusinessList.tsx). */
  const biz = user.accountType === "business";
  const online = useOnline();
  const [bizNewOpen, setBizNewOpen] = useState(false);
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
  const [view, setView] = useState<"list" | "archived" | "starred" | "invitation">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [openInvitation, setOpenInvitation] = useState<GroupInvitation | null>(null);
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

  // Batch E (E5): an open thread is in-page state, so the phone's back returns
  // to the conversation list instead of leaving Messages.
  const closeThread = () => {
    setOpen(null);
    setFocusId(null);
    // Re-read on the way back, so a thread just replied to moves up with its
    // new preview.
    void load();
  };

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
    if (result.ok) {
      setThreads(result.threads);
      setError(null);
      if (thenOpenId) {
        const target = result.threads.find((th) => th.id === thenOpenId);
        if (target) {
          setView("list");
          setOpen(target);
        }
      }
      // Only your own latest messages carry a tick.
      const mineLast = result.threads
        .filter((th) => th.lastMessageId && th.lastMessageSenderId === authUserId)
        .map((th) => th.lastMessageId!);
      void fetchLastMessageState(mineLast).then(({ readAt, delivered: reached }) => {
        setReadState(readAt);
        setDelivered(reached);
      });
      if (pushId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        navigate("/app/messages", { replace: true });
        const threadId = await threadForPush(pushId);
        const target = threadId ? result.threads.find((th) => th.id === threadId) : undefined;
        if (target) setOpen(target);
      } else if (requestedThreadId && !deepLinkConsumed.current) {
        deepLinkConsumed.current = true;
        const target = result.threads.find((th) => th.id === requestedThreadId);
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

  // Round D (DT4): a thread asked for while this page is already open (a
  // group's "Ask {pro}" opens the chat with the professional) opens it too.
  const lastKey = useRef(location.key);
  useEffect(() => {
    if (lastKey.current === location.key) return;
    lastKey.current = location.key;
    if (requestedThreadId) {
      deepLinkConsumed.current = true;
      void load(requestedThreadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // OP1-190 O3: back online, the business list re-reads what the offline
  // line said was last loaded (Round D O14: held in memory, not saved).
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
    const th = threads.find((x) => x.id === h.threadId);
    if (!th) return;
    setFocusId(h.messageId);
    setOpen(th);
  };
  const { active, archived, activeTotal } = useMemo(() => {
    const matches = (th: MessageThread) =>
      !q || th.participantName.toLowerCase().includes(q) || (th.lastMessagePreview ?? "").toLowerCase().includes(q);
    const archivedSet = threads.filter((th) => settings[th.id]?.archivedAt);
    const activeSet = threads.filter((th) => !settings[th.id]?.archivedAt);
    const byFilter = (th: MessageThread) =>
      filter === "all" ||
      (filter === "unread" && th.unreadCount > 0) ||
      (filter === "groups" && th.kind === "group");
    return {
      active: activeSet.filter(matches).filter(byFilter),
      archived: archivedSet.filter(matches),
      activeTotal: activeSet.length,
    };
  }, [threads, settings, q, filter]);

  /**
   * The rows on screen. Invitations first (they are waiting on an answer),
   * then pinned chats, then chats newest first.
   */
  const items: ChatListItem[] = useMemo(() => {
    if (view === "archived") return archived.map((thread) => ({ type: "thread", thread }));
    const invites: ChatListItem[] =
      filter === "all" || filter === "groups"
        ? invitations
            .filter((i) => !q || i.groupName.toLowerCase().includes(q))
            .map((invitation) => ({ type: "invite", invitation }))
        : [];
    const pinned = active
      .filter((th) => settings[th.id]?.pinnedAt)
      .sort((a, b) => (settings[b.id]?.pinnedAt ?? "").localeCompare(settings[a.id]?.pinnedAt ?? ""));
    const rest = active
      .filter((th) => !settings[th.id]?.pinnedAt)
      .map((thread) => ({ at: thread.lastMessageAt ?? "", item: { type: "thread", thread } as ChatListItem }))
      .sort((a, b) => b.at.localeCompare(a.at));
    return [...invites, ...pinned.map((thread) => ({ type: "thread", thread }) as ChatListItem), ...rest.map((x) => x.item)];
  }, [view, archived, active, invitations, filter, q, settings]);

  const startChatWith = async (clientId: string) => {
    setNewChatBusy(true);
    setNewChatError(null);
    const r = await startThread(clientId);
    setNewChatBusy(false);
    if (!r.ok) return setNewChatError(r.message);
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
    setToast(offline ? t(OFFLINE_TOAST) : message === t("You can pin up to 5 chats. Unpin one to pin this.") ? message : t("Couldn't save. Try again."));
  };

  /** Pin, mute and archive from a row: shown at once, reverted if the write fails. */
  const writeSettings = async (
    th: MessageThread,
    patch: Parameters<typeof saveThreadSettings>[2],
    next: Partial<ThreadSettings>
  ) => {
    if (!authUserId) return;
    const prev = settings[th.id];
    setSettings((all) => ({ ...all, [th.id]: { ...(all[th.id] ?? NO_SETTINGS), ...next } }));
    const r = await saveThreadSettings(th.id, authUserId, patch);
    if (!r.ok) {
      setSettings((all) => {
        const copy = { ...all };
        if (prev) copy[th.id] = prev;
        else delete copy[th.id];
        return copy;
      });
      failToast(r.message);
      return;
    }
    setSettings(await fetchThreadSettings());
  };

  const rowActions: RowActions = {
    pin: (th) => {
      const at = settings[th.id]?.pinnedAt ? null : new Date().toISOString();
      void writeSettings(th, { pinned_at: at }, { pinnedAt: at });
    },
    mute: (th, choice: MuteChoice) => {
      const patch = mutePatch(choice);
      void writeSettings(th, patch, { mutedAlways: !!patch.muted_always, mutedUntil: patch.muted_until ?? null });
    },
    archive: (th) => {
      const at = settings[th.id]?.archivedAt ? null : new Date().toISOString();
      void writeSettings(th, { archived_at: at }, { archivedAt: at });
    },
    ...(canDelete ? { delete: (th: MessageThread) => setDeleteTarget(th) } : null),
  };

  const confirmDelete = async () => {
    const th = deleteTarget;
    if (!th) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setDeleteTarget(null);
      setToast(t(OFFLINE_TOAST));
      return;
    }
    setDeleteBusy(true);
    const r = await deleteConversationForMe(th.id);
    setDeleteBusy(false);
    setDeleteTarget(null);
    if (!r.ok) {
      setToast(r.message === OFFLINE_MESSAGE ? t(OFFLINE_TOAST) : t("Couldn't delete. Try again."));
      return;
    }
    setAnnounce(t("Conversation deleted."));
    // Gone from the list at once; my_conversations() leaves it out from now on
    // until a newer message arrives. The server dropped its pin and archive
    // and kept its mute, so the settings are re-read, not guessed.
    setThreads((all) => all.filter((x) => x.id !== th.id));
    unread.refresh();
    if (open?.id === th.id) {
      setOpen(null);
      setFocusId(null);
    }
    void load();
  };

  // Typing and online status for the chats in the list and the open one; the
  // database decides who may see what (ThreadLiveContext). Person-to-person
  // chats only, and at most 30 channels.
  const liveIds = threads
    .filter((th) => (th.kind === "peer" && th.participantId) || th.kind === "group")
    .slice(0, 30)
    .map((th) => th.id);

  return {
    authUserId,
    user,
    unread,
    biz,
    online,
    bizNewOpen,
    setBizNewOpen,
    threads,
    setThreads,
    settings,
    setSettings,
    readState,
    delivered,
    open,
    setOpen,
    focusId,
    setFocusId,
    hits,
    hitsMore,
    searching,
    searchError,
    view,
    setView,
    query,
    setQuery,
    filter,
    setFilter,
    invitations,
    openInvitation,
    setOpenInvitation,
    newChatBusy,
    newChatError,
    setNewChatError,
    loading,
    setLoading,
    error,
    setError,
    toast,
    setToast,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    announce,
    setAnnounce,
    canDelete,
    closeThread,
    load,
    q,
    term,
    searchingMessages,
    moreHits,
    openHit,
    active,
    archived,
    activeTotal,
    items,
    startChatWith,
    startMemberChat,
    rowActions,
    confirmDelete,
    liveIds,
  };
}
