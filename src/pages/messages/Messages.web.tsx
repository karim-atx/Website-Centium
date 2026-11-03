import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  Dumbbell,
  Megaphone,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { useThreadLive } from "../../context/threadLive";
import { ThreadLiveProvider } from "../../context/ThreadLiveContext";
import { useWebLayout } from "../../components/web/useWebLayout";
import { ThreadView } from "../../components/messages/ThreadView";
import { GroupInvitationView } from "../../components/messages/GroupInvitationView";
import { StarredMessages } from "../../components/messages/StarredMessages";
import { SearchResults } from "../../components/messages/SearchResults";
import { DeleteConversationConfirm } from "../../components/messages/DeleteConversationConfirm";
import type { ChatListItem, RowActions } from "../../components/messages/ThreadList";
import { listTime } from "../../components/messages/chatTime";
import { PopupMenu, type PopupMenuOption } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import type { MessageThread } from "../../services/messaging";
import type { GroupInvitation } from "../../services/messaging/groups";
import { fetchThreadSettings, isMuted, MUTE_CHOICES, type MuteChoice, type ThreadSettings } from "../../services/messaging/chatFeatures";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { t, tn } from "../../i18n/core";
import { MoPage } from "../profile/web/moWeb";
import { OFFLINE_TOAST, useConversations, type Filter } from "./useConversations";
import Messages from "./Messages";

// Website viewport v1 · WC-MO.4 Messages (WC-MO More Web v7, frames
// WC-MO.4_filled / _filled-rail / _empty / _empty-rail / _unread-all-caught-up).
// The list (4 of 12 columns at 1440; 1 : 1.4 on the rail) and the open chat
// (8) side by side, 24 apart, both one viewport tall and scrolling on their
// own. The list: the 40 search field (r14 #F6F4FE), the All / Unread / Groups
// segmented control (track #F4F3F9 padding 5 r14, 30 r10 pills, selected
// #4F8F8A white), the PINNED caps label (13/20 700 .11em #7D67D9), 72 rows
// (padding 10, r14, 44 avatar, name 15/22 700, time 13/20 #8C8378, preview
// 13/20 #5B5349, 600 when unread, the 18 #9A8CD6 count badge; selected and
// hover #F6F4FE) and the Archived row (60, a 44 #F5F5F6 disc, the count
// 13/700 #7D6BB5). The chat: r20 with a 0.5px rgba(36,31,27,0.1) border; the
// mobile chat (every feature it has) inside, its header and composer stuck
// to the pane (ThreadView `web`). Empty: the r20 #F5F5F6 card (a 56 r16
// #F0EDF9 tile, title 17/22 800, line 15/22 #5B5349) and no chat pane.
//
// Repo kept over the frames: the search field filters the chats on the
// device and searches messages as the mobile one does (Karim's decision 1,
// "no search", is the global command palette); invitations first; the ⋮ menu
// (Pin, Mute, Archive, Delete) on hover or focus in place of the swipe;
// Starred messages from the header (its page has no web design: it opens in
// the chat pane in its mobile layout). A group invitation (WC-MO.4.3) opens
// in the chat pane; shared group cards (WC-MO.4.4) render inside the chat,
// their sheets as side sheets and their confirms as centred popups.

const SELECTED = "#F6F4FE";

/** The list-detail page for a customer; businesses keep their mobile Messages in the centred column. */
export default function MessagesWeb() {
  const { user } = useApp();
  return user.accountType === "customer" ? <ClientMessagesWeb /> : <Messages />;
}

function ClientMessagesWeb() {
  const conv = useConversations();
  const { authUserId, threads, settings, setSettings, open, setOpen, focusId, setFocusId, view, setView, openInvitation, setOpenInvitation, load, liveIds } = conv;
  const { rail } = useWebLayout();
  const scroller = useRef<HTMLDivElement>(null);

  // List-detail on web: the first chat is open by default (section 3). Once,
  // after the first load; a deep link (?push, a thread asked for) wins.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || conv.loading) return;
    autoOpened.current = true;
    if (open || view !== "list") return;
    const first = conv.items.find((i): i is Extract<ChatListItem, { type: "thread" }> => i.type === "thread");
    if (first) setOpen(first.thread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.loading]);

  const pick = (th: MessageThread) => {
    if (open?.id === th.id && view === "list") return;
    setFocusId(null);
    if (view === "starred" || view === "invitation") setView("list");
    setOpen(th);
    // The rows re-read so a chat just replied to moves up (the mobile list does this on the way back).
    void load();
  };

  const pane = open ? (
    <div ref={scroller} data-wv-msg="scroller" className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "0 18px", background: "#FAFAFB", scrollbarWidth: "thin" }}>
      <ThreadView
        key={open.id}
        thread={open}
        focusMessageId={focusId}
        settings={settings[open.id]}
        onSettingsChanged={async () => setSettings(await fetchThreadSettings())}
        onBack={() => conv.closeThread()}
        onDeleteConversation={conv.canDelete ? () => conv.setDeleteTarget(open) : undefined}
        web={{ scroller }}
      />
    </div>
  ) : view === "invitation" && openInvitation ? (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "18px 18px 24px" }}>
      <GroupInvitationView
        invitation={openInvitation}
        onBack={() => {
          setOpenInvitation(null);
          setView("list");
        }}
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
    </div>
  ) : view === "starred" ? (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "0 18px 24px" }}>
      <div className="sticky top-0 z-10 flex items-center bg-white" style={{ height: 64, gap: 12, margin: "0 -18px 8px", padding: "0 18px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <IconButton label={t("Back")} onClick={() => setView("list")}>
          <ChevronLeft size={20} aria-hidden />
        </IconButton>
        <h2 style={{ margin: 0, fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>{t("Starred messages")}</h2>
      </div>
      <StarredMessages
        threads={threads}
        authUserId={authUserId}
        onOpen={(threadId) => {
          const th = threads.find((x) => x.id === threadId);
          if (th) {
            setView("list");
            setOpen(th);
          }
        }}
      />
    </div>
  ) : null;

  return (
    <ThreadLiveProvider userId={authUserId} threadIds={liveIds}>
      <MoPage
        title={t("Messages")}
        sub={t("Chat with your professionals")}
        frame="messages"
        action={
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              setFocusId(null);
              setView("starred");
            }}
            aria-label={t("Starred messages")}
            title={t("Starred messages")}
            aria-pressed={view === "starred"}
            className="shrink-0 grid place-items-center hover:bg-[#E9E4F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9", color: "#7D6BB5" }}
          >
            <Star size={18} aria-hidden />
          </button>
        }
      >
        <div
          data-wv-msg="grid"
          className="flex-1 min-h-0 grid"
          style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1.4fr)" : "minmax(0,4fr) minmax(0,8fr)", gap: 24 }}
        >
          <ConversationList conv={conv} onPick={pick} />
          {pane && (
            <section
              data-wv-msg="pane"
              aria-label={open ? open.participantName : view === "starred" ? t("Starred messages") : t("Group invitation")}
              className="min-w-0 min-h-0 flex flex-col bg-white"
              style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", overflow: "hidden" }}
            >
              {pane}
            </section>
          )}
        </div>
      </MoPage>
      <DeleteConversationConfirm
        thread={conv.deleteTarget}
        busy={conv.deleteBusy}
        onCancel={() => conv.setDeleteTarget(null)}
        onConfirm={() => void conv.confirmDelete()}
      />
      <Toast
        open={!!conv.toast}
        message={conv.toast ?? ""}
        onExpire={() => conv.setToast(null)}
        icon={<AlertCircle size={16} style={{ color: "#F09A8E" }} aria-hidden />}
      />
      <p className="sr-only" aria-live="polite">
        {conv.announce}
      </p>
    </ThreadLiveProvider>
  );
}

type Conv = ReturnType<typeof useConversations>;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
];

/** The list column: search, filters, the rows, the Archived row, the empties and the message hits. */
const ConversationList: React.FC<{ conv: Conv; onPick: (th: MessageThread) => void }> = ({ conv, onPick }) => {
  const { settings, view, filter, items, archived, q, term, query, loading, error, open, searchingMessages, rowActions } = conv;
  const [menu, setMenu] = useState<{ thread: MessageThread; anchor: HTMLElement } | null>(null);
  const [muteMenu, setMuteMenu] = useState<{ thread: MessageThread; anchor: HTMLElement } | null>(null);

  const noConversations = !loading && !error && view === "list" && conv.activeTotal === 0 && conv.invitations.length === 0;
  const hasAnything = conv.threads.length > 0 || conv.invitations.length > 0;
  const listEmpty = !loading && !error && hasAnything && !noConversations && items.length === 0 && !searchingMessages;

  const invites = items.filter((i): i is Extract<ChatListItem, { type: "invite" }> => i.type === "invite");
  const rows = items.filter((i): i is Extract<ChatListItem, { type: "thread" }> => i.type === "thread").map((i) => i.thread);
  const pinned = view === "list" ? rows.filter((th) => settings[th.id]?.pinnedAt) : [];
  const rest = view === "list" ? rows.filter((th) => !settings[th.id]?.pinnedAt) : rows;

  const row = (th: MessageThread) => (
    <ConversationRow
      key={th.id}
      thread={th}
      settings={settings[th.id]}
      selected={open?.id === th.id}
      authUserId={conv.authUserId}
      readState={conv.readState}
      onOpen={onPick}
      onMenu={(anchor) => setMenu({ thread: th, anchor })}
    />
  );

  return (
    <div data-wv-msg="list" className="min-w-0 min-h-0 flex flex-col" style={{ gap: 10 }}>
      {/* The search field: 40, r14, #F6F4FE, padding 0 12, gap 8; the glyph 16 #8C8378; 15px. */}
      <label data-wv-msg="search" className="shrink-0 flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-[#AEA1DC]" style={{ height: 40, boxSizing: "border-box", borderRadius: 14, background: "#F6F4FE", padding: "0 12px", gap: 8 }}>
        <Search size={16} className="shrink-0" style={{ color: "#8C8378" }} aria-hidden />
        <span className="sr-only">{t("Search messages and chats")}</span>
        <input
          value={query}
          onChange={(e) => conv.setQuery(e.target.value)}
          placeholder={t("Search messages")}
          className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-[#8C8378]"
          style={{ fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
        />
      </label>

      {view === "archived" ? (
        <div className="shrink-0 flex items-center" style={{ gap: 8, minHeight: 40 }}>
          <IconButton label={t("Back")} onClick={() => conv.setView("list")}>
            <ChevronLeft size={20} aria-hidden />
          </IconButton>
          <h2 style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>{t("Archived")}</h2>
        </div>
      ) : (
        <div role="tablist" aria-label={t("Messages")} data-wv-msg="filters" className="shrink-0 grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, padding: 5, borderRadius: 14, background: "#F4F3F9" }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => conv.setFilter(f.key)}
                className="flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ height: 30, borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#4F8F8A" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
              >
                {t(f.label)}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div role="alert" className="shrink-0 flex flex-col items-center text-center" style={{ padding: "32px 0", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "#C0392B" }}>
            {error === OFFLINE_MESSAGE ? t(OFFLINE_TOAST) : t("Couldn't load messages.")}
          </p>
          <button
            type="button"
            onClick={() => {
              conv.setLoading(true);
              conv.setError(null);
              void conv.load();
            }}
            className="min-h-[40px] px-3 hover:underline"
            style={{ fontSize: 15, fontWeight: 700, color: "#7D6BB5" }}
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {loading && !error && <ListSkeleton />}

      {noConversations && (
        <EmptyCard icon={MessageCircle} title={t("No conversations yet")} line={t("Chats with your professionals, gyms and groups show up here.")} />
      )}

      {listEmpty &&
        (q ? (
          <EmptyCard icon={Search} title={t("No chats match your search")} />
        ) : view === "archived" ? (
          <EmptyCard icon={Archive} title={t("No archived chats")} />
        ) : filter === "unread" ? (
          <EmptyCard icon={CheckCheck} title={t("You're all caught up")} />
        ) : filter === "groups" ? (
          <EmptyCard icon={Users} title={t("No groups yet")} line={t("A professional can invite you to one.")} />
        ) : (
          <EmptyCard icon={MessageCircle} title={t("No chats here")} />
        ))}

      {!loading && (items.length > 0 || searchingMessages || (view === "list" && archived.length > 0)) && (
        <div data-wv-msg="rows" className="flex-1 min-h-0 overflow-y-auto flex flex-col" style={{ scrollbarWidth: "none" }}>
          {searchingMessages && items.length > 0 && <ListLabel>{t("Chats")}</ListLabel>}
          {invites.map(({ invitation }) => (
            <InvitationRow
              key={`inv-${invitation.threadId}`}
              invitation={invitation}
              selected={view === "invitation" && conv.openInvitation?.threadId === invitation.threadId}
              onOpen={() => {
                conv.setOpen(null);
                conv.setOpenInvitation(invitation);
                conv.setView("invitation");
              }}
            />
          ))}
          {pinned.length > 0 && !searchingMessages && <ListLabel>{t("Pinned")}</ListLabel>}
          {pinned.map(row)}
          {rest.map(row)}

          {searchingMessages && (
            <section aria-label={t("Messages")} style={{ marginTop: 8 }}>
              <ListLabel>{t("Messages")}</ListLabel>
              {conv.searchError && <p style={{ margin: "8px 4px", fontSize: 13, lineHeight: "20px", color: "#C0392B" }}>{conv.searchError}</p>}
              {!conv.searching && !conv.searchError && conv.hits.length === 0 && (
                <p className="text-center" style={{ margin: 0, padding: "24px 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                  {t('No messages match "{term}".', { term })}
                </p>
              )}
              <SearchResults
                hits={conv.hits}
                query={term}
                titleFor={(h) => {
                  const name = conv.threads.find((th) => th.id === h.threadId)?.participantName ?? t("Conversation");
                  return h.senderId === conv.authUserId ? t("You → {name}", { name }) : name;
                }}
                onOpen={(h) => {
                  conv.setView("list");
                  conv.openHit(h);
                }}
                hasMore={conv.hitsMore}
                loadingMore={conv.searching}
                onMore={() => void conv.moreHits()}
              />
            </section>
          )}

          {/* The Archived row: 60, padding 0 10, 4 under the rows over a divider. */}
          {view === "list" && archived.length > 0 && (
            <button
              type="button"
              onClick={() => conv.setView("archived")}
              data-wv-msg="archived"
              className="shrink-0 w-full flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ minHeight: 60, gap: 12, padding: "0 10px", marginTop: 4, borderTop: "1px solid rgba(36,31,27,0.06)" }}
            >
              <span className="shrink-0 grid place-items-center" style={{ width: 44, height: 44, borderRadius: 999, background: "#F5F5F6" }}>
                <Archive size={18} style={{ color: "#5B5349" }} aria-hidden />
              </span>
              <span className="flex-1" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
                {t("Archived")}
              </span>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5" }}>{archived.length}</span>
            </button>
          )}
        </div>
      )}

      {/* The row ⋮ menu (the swipe's actions plus Archive), as the mobile list's. */}
      <PopupMenu<"pin" | "mute" | "archive" | "delete">
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        width={200}
        align="right"
        options={menuOptions(menu?.thread ?? null, menu ? settings[menu.thread.id] : undefined, !!rowActions.delete)}
        onSelect={(v) => {
          const m = menu;
          setMenu(null);
          if (!m) return;
          runAction(rowActions, v, m, settings[m.thread.id], setMuteMenu);
        }}
      />
      <PopupMenu<MuteChoice>
        open={!!muteMenu}
        onClose={() => setMuteMenu(null)}
        anchor={muteMenu?.anchor ?? null}
        width={160}
        align="right"
        heading={t("Mute notifications")}
        options={MUTE_CHOICES.map((m) => ({ value: m.value, label: t(m.label) }))}
        onSelect={(v) => {
          const m = muteMenu;
          setMuteMenu(null);
          if (m) rowActions.mute(m.thread, v);
        }}
      />
    </div>
  );
};

function runAction(
  actions: RowActions,
  v: "pin" | "mute" | "archive" | "delete",
  m: { thread: MessageThread; anchor: HTMLElement },
  s: ThreadSettings | undefined,
  setMuteMenu: (x: { thread: MessageThread; anchor: HTMLElement }) => void
) {
  if (v === "pin") actions.pin(m.thread);
  else if (v === "archive") actions.archive(m.thread);
  else if (v === "delete") actions.delete?.(m.thread);
  else if (isMuted(s)) actions.mute(m.thread, "off");
  else setMuteMenu(m);
}

/** The mobile list's ⋮ options (ThreadList menuOptions). */
function menuOptions(th: MessageThread | null, s: ThreadSettings | undefined, canDelete: boolean): PopupMenuOption<"pin" | "mute" | "archive" | "delete">[] {
  if (!th) return [];
  const muted = isMuted(s);
  const opts: PopupMenuOption<"pin" | "mute" | "archive" | "delete">[] = [
    { value: "pin", label: s?.pinnedAt ? t("Unpin") : t("Pin"), icon: s?.pinnedAt ? <PinOff size={15} strokeWidth={1.75} /> : <Pin size={15} strokeWidth={1.75} /> },
    { value: "mute", label: muted ? t("Unmute") : t("Mute"), icon: muted ? <Bell size={15} strokeWidth={1.75} /> : <BellOff size={15} strokeWidth={1.75} /> },
    {
      value: "archive",
      label: s?.archivedAt ? t("Unarchive") : t("Archive"),
      icon: s?.archivedAt ? <ArchiveRestore size={15} strokeWidth={1.75} /> : <Archive size={15} strokeWidth={1.75} />,
    },
  ];
  if (canDelete) opts.push({ value: "delete", label: t("Delete"), destructive: true, icon: <Trash2 size={15} strokeWidth={1.75} /> });
  return opts;
}

/** The caps label above a run of rows: 13/20 700 .11em #7D67D9, margin 6 0 2, padding 0 4. */
const ListLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="shrink-0 uppercase rtl:tracking-normal" style={{ margin: "6px 0 2px", padding: "0 4px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".11em", color: "#7D67D9" }}>
    {children}
  </p>
);

const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="shrink-0 grid place-items-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999, color: "#5B5349" }}
  >
    {children}
  </button>
);

/** The 44 avatar: the photo, a group / official / gym tile, or the initials on #F0EDF9. */
const Avatar44: React.FC<{ thread: MessageThread }> = ({ thread: th }) => {
  const box: React.CSSProperties = { width: 44, height: 44, borderRadius: 999 };
  if (th.kind !== "group" && th.participantAvatarUrl)
    return (
      <span className="shrink-0 overflow-hidden flex" style={box}>
        <img src={th.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  const [bg, ink, Icon] =
    th.kind === "group"
      ? ["#F0EDF9", "#5F5093", Users]
      : th.kind === "official_support"
        ? ["#E7F2F0", "#3C6B65", Megaphone]
        : th.venue?.memberSide
          ? ["#E4EEF7", "#2E5E8E", Dumbbell]
          : ["#F0EDF9", "#5F5093", null];
  const ini = th.participantName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span className="shrink-0 grid place-items-center" style={{ ...box, background: bg, color: ink, fontSize: 15, fontWeight: 700 }}>
      {Icon ? <Icon size={20} aria-hidden /> : th.participantId ? ini : <Users size={20} aria-hidden />}
    </span>
  );
};

const ConversationRow: React.FC<{
  thread: MessageThread;
  settings: ThreadSettings | undefined;
  selected: boolean;
  authUserId: string | null;
  readState: Record<string, string | null>;
  onOpen: (th: MessageThread) => void;
  onMenu: (anchor: HTMLElement) => void;
}> = ({ thread: th, settings: s, selected, authUserId, onOpen, onMenu }) => {
  const unread = useUnread();
  const live = useThreadLive();
  const count = unread.byThread[th.id] ?? 0;
  const typing = live.typing.has(th.id);
  const online = th.kind !== "group" && live.online.has(th.id);
  const mine = !!th.lastMessageId && th.lastMessageSenderId === authUserId;
  const groupSender = th.kind === "group" && !mine && th.lastMessageSenderId ? th.lastSenderFirstName ?? undefined : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const name = th.participantName;
  return (
    <div
      ref={ref}
      data-wv-msg-row={th.id}
      className="group relative shrink-0 hover:bg-[#F6F4FE]"
      style={{ borderRadius: 14, background: selected ? SELECTED : undefined }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (ref.current) onMenu(ref.current);
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(th)}
        aria-current={selected ? "true" : undefined}
        onKeyDown={(e) => {
          if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
            e.preventDefault();
            if (ref.current) onMenu(ref.current);
          }
        }}
        className="w-full flex items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ minHeight: 72, gap: 12, padding: 10, borderRadius: 14 }}
      >
        <span className="relative shrink-0">
          <Avatar44 thread={th} />
          {online && (
            <span aria-label={t("Online")} className="absolute rounded-full" style={{ insetInlineEnd: 0, bottom: 0, width: 11, height: 11, background: "#2E9E6B", border: "2px solid #FFFFFF" }} />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline" style={{ gap: 8 }}>
            <span title={name} className="flex-1 min-w-0 flex items-center" style={{ gap: 6 }}>
              <span className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
                {name}
              </span>
              {s?.pinnedAt && <Pin size={12} aria-label={t("Pinned")} className="shrink-0" style={{ color: "#8C8378" }} />}
              {isMuted(s) && <BellOff size={12} aria-label={t("Muted")} className="shrink-0" style={{ color: "#8C8378" }} />}
            </span>
            <span className="shrink-0 group-hover:opacity-0 group-focus-within:opacity-0" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
              {th.lastMessageAt ? listTime(th.lastMessageAt) : ""}
            </span>
          </span>
          <span className="flex items-center" style={{ gap: 8 }}>
            <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349", fontWeight: count > 0 ? 600 : 400 }}>
              {typing ? (
                <span className="italic" style={{ color: "#7D6BB5" }}>
                  {t("typing…")}
                </span>
              ) : (
                <>
                  {mine ? t("You: ") : groupSender ? `${groupSender}: ` : ""}
                  {th.lastMessagePreview ?? t("No messages yet")}
                </>
              )}
            </span>
            {count > 0 && (
              <span
                aria-label={tn(count, "{n} unread", "{n} unread")}
                className="shrink-0 text-center group-hover:opacity-0 group-focus-within:opacity-0"
                style={{ minWidth: 18, height: 18, padding: "0 5px", boxSizing: "border-box", borderRadius: 999, background: "#9A8CD6", color: "#FFFFFF", fontSize: 11, fontWeight: 800, lineHeight: "18px" }}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
        </span>
      </button>
      {/* The ⋮ (Pin, Mute, Archive, Delete): shown on hover and keyboard focus, over the time and badge. */}
      <button
        type="button"
        aria-label={t("More for chat with {name}", { name })}
        onClick={(e) => onMenu(e.currentTarget)}
        className="absolute grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 hover:bg-[#EAE5F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ insetInlineEnd: 6, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: 999, color: "#5B5349" }}
      >
        <MoreVertical size={18} aria-hidden />
      </button>
    </div>
  );
};

const InvitationRow: React.FC<{ invitation: GroupInvitation; selected: boolean; onOpen: () => void }> = ({ invitation: inv, selected, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-current={selected ? "true" : undefined}
    className="shrink-0 w-full flex items-center text-start hover:bg-[#F6F4FE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ minHeight: 72, gap: 12, padding: 10, borderRadius: 14, background: selected ? SELECTED : undefined }}
  >
    <span className="shrink-0 grid place-items-center" style={{ width: 44, height: 44, borderRadius: 999, background: "#F0EDF9", color: "#5F5093" }}>
      <Users size={20} aria-hidden />
    </span>
    <span className="flex-1 min-w-0">
      <span className="flex items-baseline" style={{ gap: 8 }}>
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
          {inv.groupName}
        </span>
        <span className="shrink-0" style={{ borderRadius: 999, padding: "0 8px", background: "#F0EDF9", color: "#7D6BB5", fontSize: 11, lineHeight: "18px", fontWeight: 700 }}>
          {t("Invitation")}
        </span>
      </span>
      <span className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#7D6BB5" }}>
        {t("{name} invited you", { name: inv.invitedByFirstName })} · {tn(inv.memberCount, "{n} member", "{n} members")}
      </span>
    </span>
  </button>
);

/** The list's empties: r20 #F5F5F6, padding 40 24, gap 10; a 56 r16 #F0EDF9 tile (26 #7D6BB5), title 17/22 800, line 15/22 #5B5349 in 280. */
const EmptyCard: React.FC<{ icon: typeof MessageCircle; title: string; line?: string }> = ({ icon: Icon, title, line }) => (
  <div data-wv-msg="empty" className="shrink-0 flex flex-col items-center justify-center text-center" style={{ borderRadius: 20, background: "#F5F5F6", gap: 10, padding: "40px 24px" }}>
    <span className="grid place-items-center" style={{ width: 56, height: 56, borderRadius: 16, background: "#F0EDF9" }}>
      <Icon size={26} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
    </span>
    <p style={{ margin: 0, fontSize: 17, lineHeight: "22px", fontWeight: 800, color: "#241F1B" }}>{title}</p>
    {line && <p style={{ margin: 0, maxWidth: 280, fontSize: 15, lineHeight: "22px", color: "#5B5349" }}>{line}</p>}
  </div>
);

/** Five 72 rows while the list loads. */
const ListSkeleton: React.FC = () => (
  <div aria-busy="true" className="shrink-0">
    <span className="sr-only">{t("Loading messages")}</span>
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} aria-hidden className="flex items-center animate-skeleton-pulse" style={{ minHeight: 72, gap: 12, padding: 10 }}>
        <span className="shrink-0" style={{ width: 44, height: 44, borderRadius: 999, background: "#F0EFF4" }} />
        <span className="flex flex-col" style={{ gap: 8 }}>
          <span className="block" style={{ width: 120, height: 14, borderRadius: 6, background: "#F0EFF4" }} />
          <span className="block" style={{ width: 200, height: 12, borderRadius: 6, background: "#F0EFF4" }} />
        </span>
      </div>
    ))}
  </div>
);
