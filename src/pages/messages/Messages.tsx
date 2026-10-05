import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, MessageCircle, Search, Star, Archive, Plus, Users, Megaphone, MessageSquarePlus } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { ThreadList, type ChatListItem } from "../../components/messages/ThreadList";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ClientPicker, type PickableClient } from "../../components/messages/ClientPicker";
import { NewGroup } from "../../components/messages/NewGroup";
import { BroadcastEditor } from "../../components/messages/BroadcastEditor";
import { GroupInvitationView } from "../../components/messages/GroupInvitationView";
import { ThreadView } from "../../components/messages/ThreadView";
import { StarredMessages } from "../../components/messages/StarredMessages";
import { SearchResults } from "../../components/messages/SearchResults";
import { useApp } from "../../context/AppContext";
import { ThreadLiveProvider } from "../../context/ThreadLiveContext";
import { fetchThreads, migrateLegacyStars, startThread, threadForPush, type MessageThread } from "../../services/messaging";
import { fetchGroupInvitations, fetchGroupMembers, type GroupInvitation } from "../../services/messaging/groups";
import { fetchBroadcastLists, fetchBroadcasts, type BroadcastList } from "../../services/messaging/broadcasts";
import {
  fetchLastMessageState,
  fetchThreadSettings,
  MIN_GLOBAL_QUERY,
  searchMessages,
  type SearchHit,
  type ThreadSettings,
} from "../../services/messaging/chatFeatures";

/**
 * Messages, for every account type (phase 2A, screen 1).
 *
 * ONE ROUTE FOR BOTH SIDES: a thread is two profile ids and nothing about it is
 * role-specific, so a professional and a client read the same screen.
 *
 * THE LIST: search, All / Unread, pinned chats first, archived chats in their
 * own section, a mute icon, and a sent/read tick on your own last message.
 * Pin, mute and archive are the reader's own and change nothing for the other
 * person.
 *
 * PHASE 2B (screens 4 and 5): groups sit in the same list as direct chats,
 * invitations waiting for an answer sit at the top, and a professional's
 * broadcast lists appear as their own rows. The Groups and Broadcasts filters
 * narrow to those; Broadcasts is a professional's filter only, because a
 * client receives a broadcast as an ordinary message in their direct chat.
 * The "+" button (professionals) starts a chat, a group or a broadcast.
 *
 * SEARCH COVERS CHATS AND MESSAGES. Chats are matched here by name and latest
 * message; messages through the database's search (Database 20261002070000),
 * which applies the conversation's own visibility and includes archived chats.
 * Outside one chat it needs two characters.
 *
 * THE LIST DOES NOT POLL. Only an open conversation does; the list re-reads on
 * returning from a thread, which is the moment it is actually stale.
 */
export default function Messages() {
  const { authUserId, user, professionalClients } = useApp();
  const isProfessional = user.accountType === "professional";
  // The professional's connected clients, for every picker in 2B. Only these
  // can be invited, added to a list or messaged first.
  const clients: PickableClient[] = useMemo(
    () =>
      professionalClients
        .filter((c) => c.clientId)
        .map((c) => ({ userId: c.clientId!, name: c.name, avatarUrl: c.avatarUrl ?? null })),
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
  const [filter, setFilter] = useState<"all" | "unread" | "groups" | "broadcasts">("all");
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [lists, setLists] = useState<BroadcastList[]>([]);
  /** The newest broadcast's "Sent to N" per list. */
  const [lastSent, setLastSent] = useState<Record<string, number>>({});
  /** First names of group members by thread, for "Lina: …" previews. */
  const [senderNames, setSenderNames] = useState<Record<string, Record<string, string>>>({});
  const [openList, setOpenList] = useState<BroadcastList | null>(null);
  const [openInvitation, setOpenInvitation] = useState<GroupInvitation | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatBusy, setNewChatBusy] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Names for group previews; one small read per group.
      const groups = result.threads.filter((t) => t.kind === "group");
      void Promise.all(groups.map(async (g) => [g.id, await fetchGroupMembers(g.id)] as const)).then((rows) =>
        setSenderNames(Object.fromEntries(rows.map(([id, ms]) => [id, Object.fromEntries(ms.map((m) => [m.userId, m.firstName]))])))
      );
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
  const { active, archived, unreadTotal } = useMemo(() => {
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
      unreadTotal: activeSet.filter((t) => t.unreadCount > 0).length,
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
    await load(r.threadId);
  };

  // The conversation and Chat info carry their own headers (screens 2 and 6),
  // so the page title is not repeated above them.
  // Typing and online status for the chats in the list and the open one; the
  // database decides who may see what (ThreadLiveContext). Person-to-person
  // chats only, and at most 30 channels.
  const liveIds = threads
    .filter((t) => (t.kind === "peer" && t.participantId) || t.kind === "group")
    .slice(0, 30)
    .map((t) => t.id);
  const live = (node: React.ReactNode) => (
    <ThreadLiveProvider userId={authUserId} threadIds={liveIds}>
      {node}
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
          onBack={() => {
            setOpen(null);
            setFocusId(null);
            // Re-read on the way back, so a thread just replied to moves up with
            // its new preview.
            void load();
          }}
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
        <SubHeader title="Starred messages" onBack={() => setView("list")} />
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

  const chip = (on: boolean) =>
    `tap h-[34px] rounded-full px-3.5 text-[13px] ${
      on
        ? "bg-primary-fill text-on-primary-fill font-bold"
        : "bg-cream-card border border-charcoal/10 text-charcoal font-semibold"
    }`;

  return live(
    <div>
      {view === "archived" ? (
        <SubHeader title="Archived" onBack={() => setView("list")} />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <PageHeader title="Messages" showBack />
          <button
            type="button"
            onClick={() => setView("starred")}
            aria-label="Starred messages"
            className="tap w-11 h-11 rounded-full border border-charcoal/10 bg-cream-card flex items-center justify-center shrink-0 text-primary-deep-text"
          >
            <Star size={18} />
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 h-11 rounded-[14px] bg-cream-card border border-charcoal/10 px-3 mb-3">
        <Search size={16} className="text-charcoal-soft shrink-0" aria-hidden />
        <span className="sr-only">Search messages and chats</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages and chats"
          className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
        />
      </label>

      {view === "list" && (
        <div className="flex gap-1.5 mb-2 scroll-row -mx-4 px-4 [scrollbar-width:none]" role="group" aria-label="Filter chats">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={chip(filter === "all")}>
            All
          </button>
          <button
            type="button"
            aria-pressed={filter === "unread"}
            onClick={() => setFilter("unread")}
            className={chip(filter === "unread")}
          >
            Unread{unreadTotal > 0 ? ` ${unreadTotal}` : ""}
          </button>
          <button type="button" aria-pressed={filter === "groups"} onClick={() => setFilter("groups")} className={chip(filter === "groups")}>
            Groups
          </button>
          {isProfessional && (
            <button
              type="button"
              aria-pressed={filter === "broadcasts"}
              onClick={() => setFilter("broadcasts")}
              className={chip(filter === "broadcasts")}
            >
              Broadcasts
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-4">{error}</p>}

      {!loading && threads.length === 0 && invitations.length === 0 && lists.length === 0 && !error && (
        <Card className="text-center py-10">
          <MessageCircle size={22} className="text-charcoal-faint mx-auto mb-2" />
          <p className="text-sm text-charcoal-faint">No conversations yet.</p>
          <p className="text-[11px] text-charcoal-faint mt-1 max-w-xs mx-auto">
            Messages with the professionals and clients you work with appear here.
          </p>
        </Card>
      )}

      {searchingMessages && items.length > 0 && (
        <h2 className="text-xs font-bold uppercase tracking-wide text-charcoal-soft mt-1 mb-1">Chats</h2>
      )}

      {!loading && (threads.length > 0 || invitations.length > 0 || lists.length > 0) && items.length === 0 && !searchingMessages && (
        <p className="text-sm text-charcoal-faint text-center py-8">
          {q
            ? "No chats match your search."
            : view === "archived"
              ? "No archived chats."
              : filter === "unread"
                ? "You're all caught up."
                : filter === "groups"
                  ? isProfessional
                    ? "No groups yet. Tap + to start one."
                    : "No groups yet. A professional can invite you to one."
                  : filter === "broadcasts"
                    ? "No broadcast lists yet. Tap + to send one."
                    : "No chats here."}
        </p>
      )}

      <ThreadList
        items={items}
        settings={settings}
        senderNames={senderNames}
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
      />

      {searchingMessages && (
        <section className="mt-3" aria-label="Messages">
          <h2 className="text-xs font-bold uppercase tracking-wide text-charcoal-soft mb-1">Messages</h2>
          {searchError && <p className="text-xs text-status-high py-2">{searchError}</p>}
          {!searching && !searchError && hits.length === 0 && (
            <p className="text-sm text-charcoal-faint text-center py-6">No messages match "{term}".</p>
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
      )}

      {view === "list" && archived.length > 0 && (
        <button
          type="button"
          onClick={() => setView("archived")}
          className="tap w-full flex items-center gap-2 min-h-[48px] px-2 text-[13px] font-bold text-primary-deep-text"
        >
          <Archive size={15} /> Archived ({archived.length})
        </button>
      )}

      {/* NEW CHAT, GROUP OR BROADCAST, from the design's corner button.
          Professionals only: a client's chats start from a professional's
          profile, and clients cannot make groups or lists. */}
      {isProfessional && view === "list" && (
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          aria-label="New chat, group or broadcast"
          className="tap fixed z-30 right-4 lg:right-8 bottom-[calc(env(safe-area-inset-bottom)+80px)] lg:bottom-8 w-14 h-14 rounded-[18px] bg-primary-fill text-on-primary-fill flex items-center justify-center shadow-lg"
        >
          <Plus size={24} strokeWidth={2.4} />
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
              <o.icon size={20} className="text-primary-deep-text shrink-0" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-charcoal">{o.label}</span>
                <span className="block text-xs text-charcoal-soft">{o.sub}</span>
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

const SubHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-1 mb-4">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="tap w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-charcoal"
    >
      <ChevronLeft size={20} />
    </button>
    <h1 className="font-display text-xl font-bold text-charcoal">{title}</h1>
  </div>
);
