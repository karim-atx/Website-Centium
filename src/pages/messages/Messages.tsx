import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, MessageCircle, Search, Star, Archive } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { ThreadList } from "../../components/messages/ThreadList";
import { ThreadView } from "../../components/messages/ThreadView";
import { StarredMessages } from "../../components/messages/StarredMessages";
import { useApp } from "../../context/AppContext";
import { fetchThreads, migrateLegacyStars, threadForPush, type MessageThread } from "../../services/messaging";
import {
  fetchReadState,
  fetchThreadSettings,
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
 * person. Groups and Broadcasts arrive in phase 2B, so their filters are not
 * shown yet.
 *
 * SEARCH COVERS CHATS, NOT MESSAGE TEXT. Searching every message needs the
 * database's search function, which is not available yet; this filters the
 * list by name and latest message.
 *
 * THE LIST DOES NOT POLL. Only an open conversation does; the list re-reads on
 * returning from a thread, which is the moment it is actually stale.
 */
export default function Messages() {
  const { authUserId } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [settings, setSettings] = useState<Record<string, ThreadSettings>>({});
  const [readState, setReadState] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState<MessageThread | null>(null);
  const [view, setView] = useState<"list" | "archived" | "starred">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set by MessageProfessionalButton: the thread id travels in navigation state
  // and is resolved once the threads arrive. Consumed exactly once, so coming
  // back from a thread does not re-open it.
  const requestedThreadId = (location.state as { threadId?: string } | null)?.threadId ?? null;
  const deepLinkConsumed = useRef(false);
  // A tapped message notification lands here as ?push=<id>; see threadForPush.
  const pushId = new URLSearchParams(location.search).get("push");

  const load = async () => {
    const [result, s] = await Promise.all([fetchThreads(), fetchThreadSettings()]);
    setSettings(s);
    if (result.ok) {
      setThreads(result.threads);
      setError(null);
      const mineLast = result.threads
        .filter((t) => t.lastMessageId && t.lastMessageSenderId === authUserId)
        .map((t) => t.lastMessageId!);
      void fetchReadState(mineLast).then(setReadState);
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
  const { active, archived, unreadTotal } = useMemo(() => {
    const matches = (t: MessageThread) =>
      !q || t.participantName.toLowerCase().includes(q) || (t.lastMessagePreview ?? "").toLowerCase().includes(q);
    const archivedSet = threads.filter((t) => settings[t.id]?.archivedAt);
    const activeSet = threads
      .filter((t) => !settings[t.id]?.archivedAt)
      // Pinned first, most recently pinned on top; the rest stay newest-first.
      .sort((a, b) => (settings[b.id]?.pinnedAt ?? "").localeCompare(settings[a.id]?.pinnedAt ?? ""));
    return {
      active: activeSet.filter(matches).filter((t) => filter === "all" || t.unreadCount > 0),
      archived: archivedSet.filter(matches),
      unreadTotal: activeSet.filter((t) => t.unreadCount > 0).length,
    };
  }, [threads, settings, q, filter]);

  // The conversation and Chat info carry their own headers (screens 2 and 6),
  // so the page title is not repeated above them.
  if (open) {
    return (
      <div>
        <ThreadView
          thread={open}
          settings={settings[open.id]}
          onSettingsChanged={async () => setSettings(await fetchThreadSettings())}
          onBack={() => {
            setOpen(null);
            // Re-read on the way back, so a thread just replied to moves up with
            // its new preview.
            void load();
          }}
        />
      </div>
    );
  }

  if (view === "starred") {
    return (
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
        ? "bg-primary text-white dark:text-[#0D0B1A] font-bold"
        : "bg-cream-card border border-charcoal/10 text-charcoal font-semibold"
    }`;

  return (
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
        <span className="sr-only">Search chats</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
        />
      </label>

      {view === "list" && (
        <div className="flex gap-1.5 mb-2" role="group" aria-label="Filter chats">
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
        </div>
      )}

      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-4">{error}</p>}

      {!loading && threads.length === 0 && !error && (
        <Card className="text-center py-10">
          <MessageCircle size={22} className="text-charcoal-faint mx-auto mb-2" />
          <p className="text-sm text-charcoal-faint">No conversations yet.</p>
          <p className="text-[11px] text-charcoal-faint mt-1 max-w-xs mx-auto">
            Messages with the professionals and clients you work with appear here.
          </p>
        </Card>
      )}

      {!loading && threads.length > 0 && (view === "list" ? active : archived).length === 0 && (
        <p className="text-sm text-charcoal-faint text-center py-8">
          {q
            ? "No chats match your search."
            : view === "archived"
              ? "No archived chats."
              : filter === "unread"
                ? "You're all caught up."
                : "No chats here."}
        </p>
      )}

      <ThreadList
        threads={view === "list" ? active : archived}
        settings={settings}
        readState={readState}
        authUserId={authUserId}
        onOpen={setOpen}
      />

      {view === "list" && archived.length > 0 && (
        <button
          type="button"
          onClick={() => setView("archived")}
          className="tap w-full flex items-center gap-2 min-h-[48px] px-2 text-[13px] font-bold text-primary-deep-text"
        >
          <Archive size={15} /> Archived ({archived.length})
        </button>
      )}
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
