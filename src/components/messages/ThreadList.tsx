import { useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Dumbbell,
  Megaphone,
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
  Users,
} from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import { useThreadLive } from "../../context/threadLive";
import type { MessageThread } from "../../services/messaging";
import { isMuted, MUTE_CHOICES, type MuteChoice, type ThreadSettings } from "../../services/messaging/chatFeatures";
import type { GroupInvitation } from "../../services/messaging/groups";
import type { BroadcastList } from "../../services/messaging/broadcasts";
import { SwipeActions, type SwipeAction } from "../ui/SwipeActions";
import { PopupMenu, type PopupMenuOption } from "../ui/PopupMenu";
import { AvatarPlaceholder } from "../icons/PartBIcons";
import { listTime } from "./chatTime";
import { useListColors, type ListColors } from "./listColors";

/**
 * The caller's conversations (Messages phase 2A, screen 1; v6 MO1.7).
 *
 * PARTICIPANT-SYMMETRIC, WHICH IS WHY IT IS SHARED: nothing about a row depends
 * on whether the viewer is the professional or the client.
 *
 * WHAT A ROW SAYS, and where each fact comes from: the name and preview from
 * my_conversations(); unread from the reader's own read mark; the tick on
 * "You: …" from that message's read_at, which the database only stores when
 * both people allow read receipts; mute and pin from the reader's own chat
 * settings. The online dot and "typing…" come from each chat's live channel,
 * where the database decides who may see them (see ThreadLiveContext).
 *
 * v6 MO1.7 ROW (358 × 72, pad 12 4, fill #FFFFFF / #1C1F28, 0.5 separator):
 * 48 avatar (photo, venue logo, or a type tile), gap 12; line 1 the name
 * 15 / 22.5 700, the role label 11 / 16.5 700 in its type colour, the pin and
 * mute marks 12 (gap 6), the time 12 / 18 right (700 primary when unread, 500
 * grey when read); line 2 the preview 13 / 19.5 (600 ink unread, 500 grey
 * read) and the unread badge (20, 11 / 16.5 800, theme primary).
 *
 * SWIPE LEFT (threads only): Pin, Mute and, once the backend can delete a
 * conversation for one reader (PB-O-40), Delete: 58 r14 tiles, gap 6, 4 from
 * the edge. The same actions plus Archive sit in the row's ⋮ menu (O13):
 * long-press, right-click, Shift+F10, or a ⋮ button that shows on keyboard
 * focus and on hover. Invitation and broadcast-list rows do not swipe.
 */
/**
 * One row of the chat list (phase 2B mixes three kinds): a chat or group, a
 * group invitation waiting for an answer, or one of a professional's
 * broadcast lists.
 */
export type ChatListItem =
  | { type: "thread"; thread: MessageThread }
  | { type: "invite"; invitation: GroupInvitation }
  | { type: "broadcast"; list: BroadcastList; lastSentCount: number | null };

/** What a row's swipe tiles and ⋮ menu can do. Delete is absent until PB-O-40. */
export interface RowActions {
  pin: (t: MessageThread) => void;
  mute: (t: MessageThread, choice: MuteChoice) => void;
  archive: (t: MessageThread) => void;
  /** Absent while delete-for-me has no backend (PB-O-40): no tile, no menu item. */
  delete?: (t: MessageThread) => void;
}

/** The role label a row can say without the backend (PB-O-41 adds Coach / Nutritionist). */
function roleFor(t: MessageThread): "Official" | "Gym" | null {
  if (t.kind === "official_support") return "Official";
  if (t.venue?.memberSide) return "Gym";
  return null;
}

export const ThreadList: React.FC<{
  items: ChatListItem[];
  settings: Record<string, ThreadSettings>;
  /** First names of group members, by thread, for "Lina: …" previews. */
  senderNames: Record<string, Record<string, string>>;
  onOpenInvitation: (inv: GroupInvitation) => void;
  onOpenBroadcast: (list: BroadcastList) => void;
  readState: Record<string, string | null>;
  /** Latest messages that have reached the other person's device. */
  delivered: Set<string>;
  authUserId: string | null;
  onOpen: (thread: MessageThread) => void;
  /** Swipe and ⋮ actions; absent rows do not swipe. */
  actions?: RowActions;
}> = ({ items, settings, senderNames, onOpenInvitation, onOpenBroadcast, readState, delivered, authUserId, onOpen, actions }) => {
  const unread = useUnread();
  const live = useThreadLive();
  const c = useListColors();
  // The row ⋮ menu (O13) and the mute durations (from the Mute tile or the menu).
  const [menu, setMenu] = useState<{ thread: MessageThread; anchor: HTMLElement } | null>(null);
  const [muteMenu, setMuteMenu] = useState<{ thread: MessageThread; anchor: HTMLElement } | null>(null);

  const rule = { borderBottom: `0.5px solid ${c.rowRule}` };

  return (
    <>
      <ul className="flex flex-col">
        {items.map((item) => {
          if (item.type === "invite") {
            const inv = item.invitation;
            return (
              <li key={`inv-${inv.threadId}`} style={rule}>
                <button
                  type="button"
                  onClick={() => onOpenInvitation(inv)}
                  className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-left"
                  style={{ background: c.rowFill }}
                >
                  <TypeTile kind="group" c={c} />
                  <span className="min-w-0 flex-1 flex flex-col gap-[2.3px]">
                    <span className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[15px] leading-[22.5px] font-bold truncate" style={{ color: c.ink }}>
                        {inv.groupName}
                      </span>
                      {/* K2: the pill as the swipe Pin pair, 10.5 / 15.8 700. */}
                      <span
                        className="shrink-0 rounded-full text-[10.5px] leading-[15.8px] font-bold px-2"
                        style={{ background: c.primaryTint, color: c.primaryInk }}
                      >
                        Invitation
                      </span>
                    </span>
                    <span className="text-[13px] leading-[19.5px] font-semibold truncate" style={{ color: c.primaryInk }}>
                      {inv.invitedByFirstName} invited you · {inv.memberCount} {inv.memberCount === 1 ? "member" : "members"}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          if (item.type === "broadcast") {
            const list = item.list;
            return (
              <li key={`bc-${list.id}`} style={rule}>
                <button
                  type="button"
                  onClick={() => onOpenBroadcast(list)}
                  className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-left"
                  style={{ background: c.rowFill }}
                >
                  <TypeTile kind="broadcast" c={c} />
                  <span className="min-w-0 flex-1 flex flex-col gap-[2.3px]">
                    <span className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[15px] leading-[22.5px] font-bold truncate" style={{ color: c.ink }}>
                        {list.name} (broadcast)
                      </span>
                      <span className="text-[12px] leading-[18px] font-medium shrink-0" style={{ color: c.inkSoft }}>
                        {list.lastSentAt ? listTime(list.lastSentAt) : ""}
                      </span>
                    </span>
                    <span className="text-[13px] leading-[19.5px] font-medium truncate" style={{ color: c.inkSoft }}>
                      {item.lastSentCount !== null
                        ? `Sent to ${item.lastSentCount} ${item.lastSentCount === 1 ? "client" : "clients"}`
                        : `${list.memberCount} ${list.memberCount === 1 ? "client" : "clients"} · not sent yet`}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          const t = item.thread;
          return (
            <ThreadRow
              key={t.id}
              thread={t}
              settings={settings[t.id]}
              count={unread.byThread[t.id] ?? 0}
              senderNames={senderNames}
              readState={readState}
              delivered={delivered}
              authUserId={authUserId}
              typing={live.typing.has(t.id)}
              // Presence is never shown in a group (the database refuses it there).
              online={t.kind !== "group" && live.online.has(t.id)}
              onOpen={onOpen}
              actions={actions}
              onMenu={(anchor) => setMenu({ thread: t, anchor })}
              onMuteMenu={(anchor) => setMuteMenu({ thread: t, anchor })}
              c={c}
            />
          );
        })}
      </ul>

      {/* O13: the row ⋮ menu (rows as MO1.2.1.3.4's attach popup). */}
      {actions && (
        <PopupMenu<"pin" | "mute" | "archive" | "delete">
          open={!!menu}
          onClose={() => setMenu(null)}
          anchor={menu?.anchor ?? null}
          width={200}
          align="right"
          dim={0.4}
          options={menuOptions(menu?.thread ?? null, menu ? settings[menu.thread.id] : undefined, !!actions.delete)}
          onSelect={(v) => {
            const m = menu;
            setMenu(null);
            if (!m) return;
            const s = settings[m.thread.id];
            if (v === "pin") actions.pin(m.thread);
            else if (v === "archive") actions.archive(m.thread);
            else if (v === "delete") actions.delete?.(m.thread);
            else if (v === "mute") {
              if (isMuted(s)) actions.mute(m.thread, "off");
              else setMuteMenu({ thread: m.thread, anchor: m.anchor });
            }
          }}
        />
      )}
      {/* #25: the existing mute durations (1 hour, 8 hours, 1 week, Always). */}
      {actions && (
        <PopupMenu<MuteChoice>
          open={!!muteMenu}
          onClose={() => setMuteMenu(null)}
          anchor={muteMenu?.anchor ?? null}
          width={160}
          align="right"
          dim={0.4}
          heading="Mute notifications"
          options={MUTE_CHOICES.map((m) => ({ value: m.value, label: m.label }))}
          onSelect={(v) => {
            const m = muteMenu;
            setMuteMenu(null);
            if (m) actions.mute(m.thread, v);
          }}
        />
      )}
    </>
  );
};

function menuOptions(
  t: MessageThread | null,
  s: ThreadSettings | undefined,
  canDelete: boolean
): PopupMenuOption<"pin" | "mute" | "archive" | "delete">[] {
  if (!t) return [];
  const muted = isMuted(s);
  const opts: PopupMenuOption<"pin" | "mute" | "archive" | "delete">[] = [
    { value: "pin", label: s?.pinnedAt ? "Unpin" : "Pin", icon: s?.pinnedAt ? <PinOff size={15} strokeWidth={1.75} /> : <Pin size={15} strokeWidth={1.75} /> },
    { value: "mute", label: muted ? "Unmute" : "Mute", icon: muted ? <Bell size={15} strokeWidth={1.75} /> : <BellOff size={15} strokeWidth={1.75} /> },
    {
      value: "archive",
      label: s?.archivedAt ? "Unarchive" : "Archive",
      icon: s?.archivedAt ? <ArchiveRestore size={15} strokeWidth={1.75} /> : <Archive size={15} strokeWidth={1.75} />,
    },
  ];
  if (canDelete) opts.push({ value: "delete", label: "Delete", destructive: true, icon: <Trash2 size={15} strokeWidth={1.75} /> });
  return opts;
}

const ThreadRow: React.FC<{
  thread: MessageThread;
  settings: ThreadSettings | undefined;
  count: number;
  senderNames: Record<string, Record<string, string>>;
  readState: Record<string, string | null>;
  delivered: Set<string>;
  authUserId: string | null;
  typing: boolean;
  online: boolean;
  onOpen: (thread: MessageThread) => void;
  actions?: RowActions;
  onMenu: (anchor: HTMLElement) => void;
  onMuteMenu: (anchor: HTMLElement) => void;
  c: ListColors;
}> = ({ thread: t, settings: s, count, senderNames, readState, delivered, authUserId, typing, online, onOpen, actions, onMenu, onMuteMenu, c }) => {
  const rowRef = useRef<HTMLLIElement | null>(null);
  const group = t.kind === "group";
  const muted = isMuted(s);
  const pinned = !!s?.pinnedAt;
  const mine = !!t.lastMessageId && t.lastMessageSenderId === authUserId;
  const read = mine && t.lastMessageId ? !!readState[t.lastMessageId] : false;
  const reached = mine && !!t.lastMessageId && delivered.has(t.lastMessageId);
  // "Lina: …" in a group, so the preview says who.
  const groupSender = group && !mine && t.lastMessageSenderId ? senderNames[t.id]?.[t.lastMessageSenderId] : undefined;
  const role = roleFor(t);
  const name = t.participantName;
  const unread = count > 0;

  const tiles: SwipeAction[] = actions
    ? [
        {
          key: "pin",
          label: pinned ? "Unpin" : "Pin",
          ariaLabel: `${pinned ? "Unpin" : "Pin"} chat with ${name}`,
          icon: pinned ? <PinOff size={18} aria-hidden /> : <Pin size={18} aria-hidden />,
          onClick: () => actions.pin(t),
          light: { fill: "rgb(var(--th-f0edf9))", ink: c.primaryInk },
          dark: { fill: "rgb(var(--th-303141))", ink: c.primaryInk },
        },
        {
          key: "mute",
          label: muted ? "Unmute" : "Mute",
          ariaLabel: `${muted ? "Unmute" : "Mute"} chat with ${name}`,
          icon: muted ? <Bell size={18} aria-hidden /> : <BellOff size={18} aria-hidden />,
          onClick: (tile) => (muted ? actions.mute(t, "off") : onMuteMenu(tile)),
          light: { fill: "#EDEFF3", ink: "#5F6878" },
          dark: { fill: "#262932", ink: "#B8C0CE" },
        },
        ...(actions.delete
          ? [
              {
                key: "delete",
                label: "Delete",
                ariaLabel: `Delete chat with ${name}`,
                icon: <Trash2 size={18} aria-hidden />,
                onClick: () => actions.delete?.(t),
                destructive: true,
                light: { fill: "#FCEDEC", ink: "#B42318" },
                dark: { fill: "#3C2A30", ink: "#F09A8E" },
              } satisfies SwipeAction,
            ]
          : []),
      ]
    : [];

  const body = (
    <div className="group relative" style={{ background: c.rowFill }}>
      <button
        type="button"
        onClick={() => onOpen(t)}
        onKeyDown={(e) => {
          // O13 keyboard path: Shift+F10 or the context-menu key opens the ⋮ menu.
          if (actions && ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) {
            e.preventDefault();
            if (rowRef.current) onMenu(rowRef.current);
          }
        }}
        className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-left"
      >
        <span className="relative shrink-0">
          <Avatar thread={t} c={c} />
          {/* ONLINE, only when both people share it (server-gated, K8). */}
          {online && (
            <span
              aria-label="Online"
              className="absolute right-px bottom-px w-[11px] h-[11px] rounded-full border-2"
              style={{ background: "#2E9E6B", borderColor: c.rowFill }}
            />
          )}
        </span>
        <span className="min-w-0 flex-1 flex flex-col gap-[2.3px]">
          <span className="flex items-center justify-between gap-2 min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <span data-row-name="" className="text-[15px] leading-[22.5px] font-bold truncate" style={{ color: c.ink }}>
                {name}
              </span>
              {role && (
                <span
                  data-row-role=""
                  className="shrink-0 text-[11px] leading-[16.5px] font-bold"
                  style={{ color: role === "Official" ? c.tealInk : c.neutralInk }}
                >
                  {role}
                </span>
              )}
              {pinned && <Pin size={12} aria-label="Pinned" className="shrink-0" style={{ color: c.muted }} />}
              {muted && <BellOff size={12} aria-label="Muted" className="shrink-0" style={{ color: c.muted }} />}
            </span>
            <span
              data-row-time=""
              className={`shrink-0 text-[12px] leading-[18px] ${unread ? "font-bold" : "font-medium"}${actions ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : ""}`}
              style={{ color: unread ? c.primaryInk : c.inkSoft }}
            >
              {t.lastMessageAt ? listTime(t.lastMessageAt) : ""}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2 min-w-0">
            <span
              data-row-preview=""
              className={`flex items-center gap-1 min-w-0 text-[13px] leading-[19.5px] ${unread ? "font-semibold" : "font-medium"}`}
              style={{ color: unread ? c.ink : c.inkSoft }}
            >
              {typing ? (
                <span className="truncate italic font-medium" style={{ color: c.primaryInk }}>
                  typing…
                </span>
              ) : (
                <>
                  {mine &&
                    !group &&
                    (read ? (
                      <CheckCheck size={14} aria-label="Read" className="shrink-0 text-[#3A7BD5] dark:text-[#7FB0F0]" />
                    ) : reached ? (
                      <CheckCheck size={14} aria-label="Delivered" className="shrink-0 opacity-70" />
                    ) : (
                      <Check size={14} aria-label="Sent" className="shrink-0 opacity-70" />
                    ))}
                  <span className="truncate">
                    {mine ? "You: " : groupSender ? `${groupSender}: ` : ""}
                    {t.lastMessagePreview ?? "No messages yet"}
                  </span>
                </>
              )}
            </span>
            {unread && (
              <span
                data-row-badge=""
                aria-label={`${count} unread`}
                className={`shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] leading-[16.5px] font-extrabold flex items-center justify-center${actions ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : ""}`}
                style={{ background: c.badgeFill, color: c.badgeInk }}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
        </span>
      </button>
      {/* O13: the ⋮ for keyboard and mouse, shown on focus and on hover,
          in place of the time and badge (which hide meanwhile). */}
      {actions && (
        <button
          type="button"
          data-row-more=""
          aria-label={`More for chat with ${name}`}
          onClick={(e) => onMenu(e.currentTarget)}
          className="tap absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
          style={{ background: c.rowFill, color: c.inkSoft }}
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <li ref={rowRef} style={{ borderBottom: `0.5px solid ${c.rowRule}` }}>
      {actions ? (
        <SwipeActions
          actions={tiles}
          radius={0}
          tileMax={58}
          tileGap={6}
          edgeInset={4}
          tileRadius={14}
          showLabels
          tapCloses
          onLongPress={(row) => onMenu(row)}
        >
          {body}
        </SwipeActions>
      ) : (
        body
      )}
    </li>
  );
};

/** #14a / #14b: the photo, the venue's logo, or a type tile; a person without a photo shows initials. */
const Avatar: React.FC<{ thread: MessageThread; c: ListColors }> = ({ thread: t, c }) => {
  if (t.kind === "group") return <TypeTile kind="group" c={c} />;
  if (t.participantAvatarUrl)
    return (
      <span className="w-12 h-12 rounded-full overflow-hidden flex">
        <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  if (t.kind === "official_support") return <TypeTile kind="official" c={c} />;
  if (t.venue?.memberSide) return <TypeTile kind="gym" c={c} />;
  const initial = t.participantId ? t.participantName.trim().charAt(0).toUpperCase() : "";
  return (
    <span
      className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-[17px] leading-[25.5px] font-bold"
      style={{ background: c.primaryTint, color: "rgb(var(--c-primary-deep-text))" }}
    >
      {initial || <AvatarPlaceholder size={48} />}
    </span>
  );
};

/** #14b type tiles (48 round, glyph 22) and K3's broadcast tile. */
const TypeTile: React.FC<{ kind: "gym" | "group" | "official" | "broadcast"; c: ListColors }> = ({ kind, c }) => {
  const [fill, ink, Icon] =
    kind === "gym"
      ? [c.neutralFill, c.neutralInk, Dumbbell]
      : kind === "group"
        ? [c.primaryTint, c.primaryInk, Users]
        : kind === "official"
          ? [c.tealFill, c.tealInk, Megaphone]
          : [c.goldFill, c.goldInk, Megaphone];
  return (
    <span data-type-tile={kind} className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: fill }}>
      <Icon size={22} style={{ color: ink }} aria-hidden />
    </span>
  );
};
