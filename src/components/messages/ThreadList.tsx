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
import { bizListTime, listTime } from "./chatTime";
import { BizAvatar } from "./BusinessList";
import { useBizChatColours } from "./bizAvatar";
import { useListColors, type ListColors } from "./listColors";
import { typeColours } from "../professionals/typeColour";
import { t, tk, tn } from "../../i18n/core";
import { linePx, textPx } from "../../theme/textSize";

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
 * SWIPE LEFT (threads only): Pin, Mute and Delete (for me, B3): 58 r14 tiles, gap 6, 4 from
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

/** What a row's swipe tiles and ⋮ menu can do. */
export interface RowActions {
  pin: (th: MessageThread) => void;
  mute: (th: MessageThread, choice: MuteChoice) => void;
  archive: (th: MessageThread) => void;
  /** Delete for me (B3); absent means no tile and no menu item. */
  delete?: (th: MessageThread) => void;
}

/**
 * #16 / #32 role label, from my_conversations().other_role (B3, PB-O-41):
 * "official" and "gym" as drawn, a professional's subtype in MO1.2's type
 * colour (V6-170: the deep ink of the type's family, which is the drawn
 * Nutritionist #3C6B65 / #93C1B9; "Coach" takes the purple family's
 * #5F5093 / #C3B3FB instead of the drawn #8A6A3E). Null (a group, a fellow
 * customer) shows nothing. The kind and venue fallbacks keep Official and
 * Gym on a server without the column.
 */
const SUBTYPE_ROLE: Record<string, string> = {
  trainer: tk("Coach"),
  dietitian: tk("Nutritionist"),
  physiotherapist: tk("Physiotherapist"),
  doctor: tk("Doctor"),
  other: tk("Professional"),
};
function roleFor(th: MessageThread, c: ListColors): { label: string; ink: string } | null {
  if (th.otherRole === "official" || th.kind === "official_support") return { label: tk("Official"), ink: c.tealInk };
  if (th.otherRole === "gym" || th.venue?.memberSide) return { label: tk("Gym"), ink: c.neutralInk };
  if (th.kind === "group" || !th.otherRole) return null;
  const label = SUBTYPE_ROLE[th.otherRole];
  if (!label) return null;
  return { label, ink: typeColours(th.otherRole, c.dark).deep };
}

export const ThreadList: React.FC<{
  items: ChatListItem[];
  settings: Record<string, ThreadSettings>;
  onOpenInvitation: (inv: GroupInvitation) => void;
  onOpenBroadcast: (list: BroadcastList) => void;
  readState: Record<string, string | null>;
  /** Latest messages that have reached the other person's device. */
  delivered: Set<string>;
  authUserId: string | null;
  onOpen: (thread: MessageThread) => void;
  /** Swipe and ⋮ actions; absent rows do not swipe. */
  actions?: RowActions;
  /** OP1-190: a business reads the ClientChatV2 rows (BusinessList.tsx); everyone else MO1.7's. */
  business?: boolean;
  /**
   * Release 3 · MO22 v5 (professionals only): the row19 layout with a quiet
   * status line. Unset keeps every other account's rows exactly as they are.
   */
  pro?: ProRowOptions;
}> = ({ items, settings, onOpenInvitation, onOpenBroadcast, readState, delivered, authUserId, onOpen, actions, business, pro }) => {
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
                  className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-start"
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
                        {t("Invitation")}
                      </span>
                    </span>
                    <span className="text-[13px] leading-[19.5px] font-semibold truncate" style={{ color: c.primaryInk }}>
                      {t("{name} invited you", { name: inv.invitedByFirstName })} · {tn(inv.memberCount, "{n} member", "{n} members")}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          if (item.type === "broadcast") {
            const list = item.list;
            if (pro)
              return (
                <li key={`bc-${list.id}`} style={{ borderBottom: `1px solid ${PRO_RULE}` }}>
                  <button type="button" onClick={() => onOpenBroadcast(list)} className="tap w-full text-start">
                    <ProRowBody
                      avatar={<ProTile kind="broadcast" />}
                      name={list.name}
                      time={list.lastSentAt ? listTime(list.lastSentAt) : ""}
                      preview={
                        item.lastSentCount !== null
                          ? tn(item.lastSentCount, "Broadcast · sent to {n} client", "Broadcast · sent to {n} clients")
                          : tn(list.memberCount, "{n} client · not sent yet", "{n} clients · not sent yet")
                      }
                      status={{ label: t("Replies come to you privately"), color: "rgb(var(--c-charcoal-faint))" }}
                    />
                  </button>
                </li>
              );
            return (
              <li key={`bc-${list.id}`} style={rule}>
                <button
                  type="button"
                  onClick={() => onOpenBroadcast(list)}
                  className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-start"
                  style={{ background: c.rowFill }}
                >
                  <TypeTile kind="broadcast" c={c} />
                  <span className="min-w-0 flex-1 flex flex-col gap-[2.3px]">
                    <span className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[15px] leading-[22.5px] font-bold truncate" style={{ color: c.ink }}>
                        {t("{name} (broadcast)", { name: list.name })}
                      </span>
                      <span className="text-[12px] leading-[18px] font-medium shrink-0" style={{ color: c.inkSoft }}>
                        {list.lastSentAt ? listTime(list.lastSentAt) : ""}
                      </span>
                    </span>
                    <span className="text-[13px] leading-[19.5px] font-medium truncate" style={{ color: c.inkSoft }}>
                      {item.lastSentCount !== null
                        ? tn(item.lastSentCount, "Sent to {n} client", "Sent to {n} clients")
                        : tn(list.memberCount, "{n} client · not sent yet", "{n} clients · not sent yet")}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          const th = item.thread;
          return (
            <ThreadRow
              key={th.id}
              thread={th}
              settings={settings[th.id]}
              count={unread.byThread[th.id] ?? 0}
              readState={readState}
              delivered={delivered}
              authUserId={authUserId}
              typing={live.typing.has(th.id)}
              // Presence is never shown in a group (the database refuses it there).
              online={th.kind !== "group" && live.online.has(th.id)}
              onOpen={onOpen}
              actions={actions}
              onMenu={(anchor) => setMenu({ thread: th, anchor })}
              onMuteMenu={(anchor) => setMuteMenu({ thread: th, anchor })}
              c={c}
              business={business}
              pro={pro}
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
          heading={t("Mute notifications")}
          options={MUTE_CHOICES.map((m) => ({ value: m.value, label: t(m.label) }))}
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
  th: MessageThread | null,
  s: ThreadSettings | undefined,
  canDelete: boolean
): PopupMenuOption<"pin" | "mute" | "archive" | "delete">[] {
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

const ThreadRow: React.FC<{
  thread: MessageThread;
  settings: ThreadSettings | undefined;
  count: number;
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
  business?: boolean;
  pro?: ProRowOptions;
}> = ({ thread: th, settings: s, count, readState, delivered, authUserId, typing, online, onOpen, actions, onMenu, onMuteMenu, c, business, pro }) => {
  const bc = useBizChatColours();
  const rowRef = useRef<HTMLLIElement | null>(null);
  const group = th.kind === "group";
  const muted = isMuted(s);
  const pinned = !!s?.pinnedAt;
  const mine = !!th.lastMessageId && th.lastMessageSenderId === authUserId;
  const read = mine && th.lastMessageId ? !!readState[th.lastMessageId] : false;
  const reached = mine && !!th.lastMessageId && delivered.has(th.lastMessageId);
  // "Lina: …" in a group, so the preview says who (B3 last_sender_first_name).
  const groupSender = group && !mine && th.lastMessageSenderId ? th.lastSenderFirstName ?? undefined : undefined;
  const role = roleFor(th, c);
  const name = th.participantName;
  const unread = count > 0;

  const tiles: SwipeAction[] = actions
    ? [
        {
          key: "pin",
          label: pinned ? t("Unpin") : t("Pin"),
          ariaLabel: pinned ? t("Unpin chat with {name}", { name }) : t("Pin chat with {name}", { name }),
          icon: pinned ? <PinOff size={18} aria-hidden /> : <Pin size={18} aria-hidden />,
          onClick: () => actions.pin(th),
          light: { fill: "rgb(var(--th-f0edf9))", ink: c.primaryInk },
          dark: { fill: "rgb(var(--th-303141))", ink: c.primaryInk },
        },
        {
          key: "mute",
          label: muted ? t("Unmute") : t("Mute"),
          ariaLabel: muted ? t("Unmute chat with {name}", { name }) : t("Mute chat with {name}", { name }),
          icon: muted ? <Bell size={18} aria-hidden /> : <BellOff size={18} aria-hidden />,
          onClick: (tile) => (muted ? actions.mute(th, "off") : onMuteMenu(tile)),
          light: { fill: "#EDEFF3", ink: "#5F6878" },
          dark: { fill: "#262932", ink: "#B8C0CE" },
        },
        ...(actions.delete
          ? [
              {
                key: "delete",
                label: t("Delete"),
                ariaLabel: t("Delete chat with {name}", { name }),
                icon: <Trash2 size={18} aria-hidden />,
                onClick: () => actions.delete?.(th),
                destructive: true,
                light: { fill: "#FCEDEC", ink: "#B42318" },
                dark: { fill: "#3C2A30", ink: "#F09A8E" },
              } satisfies SwipeAction,
            ]
          : []),
      ]
    : [];

  // OP1-190 rows 4-9 (template 25-34): the business row. 72 with its 1px
  // divider (the li carries the divider, so the button is 71), padding
  // 10 8 inside a -8 margin, r14, gap 12; a pale fill while pressed (no ring:
  // the board's tap marker is not a state). Name 15/700 and time 11.5 (faint
  // 400; unread pDark 800), gap 8; 2 under, gap 6: the tick 15/2 (readTick
  // when read), the preview 13 (inkSoft 400; unread ink 700) and the badge
  // (min 20, h 20, padding 0 6, fill / onFill 11/800). No "You: " on a direct
  // chat: the tick says it (template 30, Jane S.).
  const bizTime = th.lastMessageAt ? bizListTime(th.lastMessageAt) : "";
  const bizBody = (
    <div className="group relative bg-cream rounded-[14px]">
      <button
        type="button"
        onClick={() => onOpen(th)}
        onKeyDown={(e) => {
          if (actions && ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) {
            e.preventDefault();
            if (rowRef.current) onMenu(rowRef.current);
          }
        }}
        data-biz-row=""
        className="relative w-full flex items-center gap-3 min-h-[71px] px-2 py-2.5 rounded-[14px] text-start transition-colors duration-100 active:bg-primary-pale"
      >
        <span className="relative shrink-0">
          <BizAvatar thread={th} size={48} />
          {online && (
            <span
              aria-label={t("Online")}
              data-row-online=""
              className="absolute end-px bottom-px w-3 h-3 rounded-full"
              style={{ background: bc.online, boxShadow: "0 0 0 2px rgb(var(--c-cream))" }}
            />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span data-row-name="" className="flex-1 min-w-0 text-[15px] leading-[1.5] font-bold text-charcoal truncate">
              {name}
            </span>
            {pinned && <Pin size={12} aria-label={t("Pinned")} className="shrink-0 text-charcoal-faint" />}
            {muted && <BellOff size={12} aria-label={t("Muted")} className="shrink-0 text-charcoal-faint" />}
            <span
              data-row-time=""
              className={`shrink-0 whitespace-nowrap text-[11.5px] leading-[1.5] ${unread ? "font-extrabold text-primary-dark" : "font-normal text-charcoal-faint"}${actions ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : ""}`}
            >
              {bizTime}
            </span>
          </span>
          <span className="flex items-center gap-1.5 mt-0.5">
            {typing ? (
              <span data-row-preview="" className="flex-1 min-w-0 truncate text-[13px] leading-[1.5] italic text-primary-dark">
                {t("typing…")}
              </span>
            ) : (
              <>
                {mine &&
                  !group &&
                  (read ? (
                    <CheckCheck size={15} strokeWidth={2} aria-label={t("Read")} className="shrink-0" style={{ color: bc.readTick }} />
                  ) : reached ? (
                    <CheckCheck size={15} strokeWidth={2} aria-label={t("Delivered")} className="shrink-0 text-charcoal-faint" />
                  ) : (
                    <Check size={15} strokeWidth={2} aria-label={t("Sent")} className="shrink-0 text-charcoal-faint" />
                  ))}
                <span
                  data-row-preview=""
                  className={`flex-1 min-w-0 truncate text-[13px] leading-[1.5] ${unread ? "font-bold text-charcoal" : "font-normal text-charcoal-soft"}`}
                >
                  {group && (mine ? t("You: ") : groupSender ? `${groupSender}: ` : "")}
                  {th.lastMessagePreview ?? t("No messages yet")}
                </span>
              </>
            )}
            {unread && (
              <span
                data-row-badge=""
                aria-label={tn(count, "{n} unread", "{n} unread")}
                className={`shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-fill text-on-primary-fill text-[11px] font-extrabold inline-flex items-center justify-center${actions ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : ""}`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
        </span>
      </button>
      {actions && (
        <button
          type="button"
          data-row-more=""
          aria-label={t("More for chat with {name}", { name })}
          onClick={(e) => onMenu(e.currentTarget)}
          className="tap absolute end-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-cream text-charcoal-soft opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      )}
    </div>
  );

  if (business)
    return (
      <li ref={rowRef} className="-mx-2 rounded-[14px] border-b border-charcoal/[0.06]">
        {actions ? (
          <SwipeActions
            actions={tiles}
            radius={14}
            tileMax={58}
            tileGap={6}
            edgeInset={4}
            tileRadius={14}
            showLabels
            tapCloses
            onLongPress={(row) => onMenu(row)}
          >
            {bizBody}
          </SwipeActions>
        ) : (
          bizBody
        )}
      </li>
    );

  const body = (
    <div className="group relative" style={{ background: c.rowFill }}>
      <button
        type="button"
        onClick={() => onOpen(th)}
        onKeyDown={(e) => {
          // O13 keyboard path: Shift+F10 or the context-menu key opens the ⋮ menu.
          if (actions && ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) {
            e.preventDefault();
            if (rowRef.current) onMenu(rowRef.current);
          }
        }}
        className="tap w-full flex items-center gap-3 px-1 py-3 min-h-[72px] text-start"
      >
        <span className="relative shrink-0">
          <Avatar thread={th} c={c} />
          {/* ONLINE, only when both people share it (server-gated, K8). */}
          {online && (
            <span
              aria-label={t("Online")}
              className="absolute end-px bottom-px w-[11px] h-[11px] rounded-full border-2"
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
                  style={{ color: role.ink }}
                >
                  {t(role.label)}
                </span>
              )}
              {pinned && <Pin size={12} aria-label={t("Pinned")} className="shrink-0" style={{ color: c.muted }} />}
              {muted && <BellOff size={12} aria-label={t("Muted")} className="shrink-0" style={{ color: c.muted }} />}
            </span>
            <span
              data-row-time=""
              className={`shrink-0 text-[12px] leading-[18px] ${unread ? "font-bold" : "font-medium"}${actions ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : ""}`}
              style={{ color: unread ? c.primaryInk : c.inkSoft }}
            >
              {th.lastMessageAt ? listTime(th.lastMessageAt) : ""}
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
                  {t("typing…")}
                </span>
              ) : (
                <>
                  {mine &&
                    !group &&
                    (read ? (
                      <CheckCheck size={14} aria-label={t("Read")} className="shrink-0 text-[#3A7BD5] dark:text-[#7FB0F0]" />
                    ) : reached ? (
                      <CheckCheck size={14} aria-label={t("Delivered")} className="shrink-0 opacity-70" />
                    ) : (
                      <Check size={14} aria-label={t("Sent")} className="shrink-0 opacity-70" />
                    ))}
                  <span className="truncate">
                    {mine ? t("You: ") : groupSender ? `${groupSender}: ` : ""}
                    {th.lastMessagePreview ?? t("No messages yet")}
                  </span>
                </>
              )}
            </span>
            {unread && (
              <span
                data-row-badge=""
                aria-label={tn(count, "{n} unread", "{n} unread")}
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
          aria-label={t("More for chat with {name}", { name })}
          onClick={(e) => onMenu(e.currentTarget)}
          className="tap absolute end-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
          style={{ background: c.rowFill, color: c.inkSoft }}
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      )}
    </div>
  );

  // Release 3 · MO22 v5 (gen/r19.js row19): the professional's row.
  const proStatus = pro?.statusFor(th) ?? null;
  const proBody = pro ? (
    <div className="group relative" style={{ background: "rgb(var(--c-cream))" }}>
      <button
        type="button"
        onClick={() => onOpen(th)}
        onKeyDown={(e) => {
          if (actions && ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) {
            e.preventDefault();
            if (rowRef.current) onMenu(rowRef.current);
          }
        }}
        className="tap w-full text-start"
      >
        <ProRowBody
          avatar={
            <span className="relative shrink-0">
              {group ? <ProTile kind="group" /> : <ProAvatar thread={th} tone={pro.toneFor?.(th) ?? "pr"} />}
              {online && (
                <span
                  aria-label={t("Online")}
                  className="absolute rounded-full"
                  style={{ insetInlineEnd: 1, bottom: 1, width: 11, height: 11, background: "#2E9E6B", border: "2px solid rgb(var(--c-cream))" }}
                />
              )}
            </span>
          }
          name={name}
          marks={
            <>
              {pinned && <Pin size={12} aria-label={t("Pinned")} className="shrink-0" style={{ color: c.muted }} />}
              {muted && <BellOff size={12} aria-label={t("Muted")} className="shrink-0" style={{ color: c.muted }} />}
            </>
          }
          time={th.lastMessageAt ? listTime(th.lastMessageAt) : ""}
          unread={unread ? count : 0}
          preview={
            typing ? (
              <span className="italic" style={{ color: "rgb(var(--c-primary-deep-text))" }}>
                {t("typing…")}
              </span>
            ) : (
              <>
                {mine ? t("You: ") : groupSender ? `${groupSender}: ` : ""}
                {th.lastMessagePreview ?? t("No messages yet")}
              </>
            )
          }
          status={proStatus}
          hideOnHover={!!actions}
        />
      </button>
      {actions && (
        <button
          type="button"
          data-row-more=""
          aria-label={t("More for chat with {name}", { name })}
          onClick={(e) => onMenu(e.currentTarget)}
          className="tap absolute end-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
          style={{ background: "rgb(var(--c-cream))", color: c.inkSoft }}
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      )}
    </div>
  ) : null;
  const rowBody = proBody ?? body;

  return (
    <li ref={rowRef} style={{ borderBottom: pro ? `1px solid ${PRO_RULE}` : `0.5px solid ${c.rowRule}` }}>
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
          {rowBody}
        </SwipeActions>
      ) : (
        rowBody
      )}
    </li>
  );
};

/** Release 3 · MO22 v5: what the professional's rows add. */
export interface ProRowOptions {
  /** The quiet third line (a 6 dot and the word), or none. */
  statusFor: (th: MessageThread) => { label: string; color: string } | null;
  /** The initials avatar's tone (the frames vary it per person). */
  toneFor?: (th: MessageThread) => "pr" | "teal" | "gold" | "sky";
}

/** gen/lib.js b06: the row divider, 6% ink. */
const PRO_RULE = "rgb(var(--c-charcoal) / 0.06)";

/**
 * gen/r19.js row19, literal: 14 / 8 padding, 76 minimum, gap 12, 48 avatar;
 * the text column 2 down; name 15 / 700 on 20 (wraps, overflow-wrap anywhere)
 * and the time 12 on 20 (unread primary.deep 700, else text.soft 400), 12
 * apart; 4 under, the preview 13 on 18 (unread ink 600, else text.soft 400)
 * and the unread badge (min 20, 20 tall, 0 6, fill / onFill 11 / 800); the
 * quiet line 4 under: 6 dot, gap 6, 11.5 on 16 text.faint.
 */
const ProRowBody: React.FC<{
  avatar: React.ReactNode;
  name: string;
  marks?: React.ReactNode;
  time: string;
  unread?: number;
  preview: React.ReactNode;
  status: { label: string; color: string } | null;
  hideOnHover?: boolean;
}> = ({ avatar, name, marks, time, unread = 0, preview, status, hideOnHover }) => {
  const hide = hideOnHover ? " [@media(hover:hover)]:group-hover:opacity-0 group-has-[[data-row-more]:focus-visible]:opacity-0" : "";
  return (
    <span data-pro-row="" className="flex items-start" style={{ gap: 12, padding: "14px 8px", minHeight: 76 }}>
      {avatar}
      <span className="flex-1 min-w-0 flex flex-col" style={{ paddingTop: 2 }}>
        <span className="flex items-start justify-between" style={{ gap: 12 }}>
          <span className="flex items-center min-w-0" style={{ gap: 6 }}>
            <span data-row-name="" style={{ fontSize: textPx(15), fontWeight: 700, lineHeight: linePx(20), color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
              {name}
            </span>
            {marks}
          </span>
          <span
            data-row-time=""
            className={`shrink-0 whitespace-nowrap${hide}`}
            style={{ fontSize: textPx(12), lineHeight: linePx(20), color: unread ? "rgb(var(--c-primary-deep-text))" : "rgb(var(--c-charcoal-soft))", fontWeight: unread ? 700 : 400 }}
          >
            {time}
          </span>
        </span>
        <span className="flex items-start justify-between" style={{ gap: 12, marginTop: 4 }}>
          <span
            data-row-preview=""
            className="min-w-0 line-clamp-2"
            style={{ fontSize: textPx(13), lineHeight: linePx(18), color: unread ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-soft))", fontWeight: unread ? 600 : 400, overflowWrap: "anywhere" }}
          >
            {preview}
          </span>
          {unread > 0 && (
            <span
              data-row-badge=""
              aria-label={tn(unread, "{n} unread", "{n} unread")}
              className={`shrink-0 flex items-center justify-center rounded-full${hide}`}
              style={{ minWidth: 20, height: 20, padding: "0 6px", background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(11), fontWeight: 800 }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        {status && (
          <span data-row-status="" className="flex items-center" style={{ gap: 6, fontSize: textPx(11.5), lineHeight: linePx(16), color: "rgb(var(--c-charcoal-faint))", marginTop: 4 }}>
            <span aria-hidden className="rounded-full shrink-0" style={{ width: 6, height: 6, background: status.color }} />
            {status.label}
          </span>
        )}
      </span>
    </span>
  );
};

/** gen/ui.js avatar at 48: tone fill, initials 16 / 800 (33%). A photo when there is one. */
const ProAvatar: React.FC<{ thread: MessageThread; tone: "pr" | "teal" | "gold" | "sky" }> = ({ thread: th, tone }) => {
  if (th.participantAvatarUrl)
    return (
      <span className="w-12 h-12 rounded-full overflow-hidden flex shrink-0">
        <img src={th.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  const bg = tone === "teal" ? "rgb(var(--c-teal-pale))" : tone === "gold" ? "rgb(var(--c-gold-pale))" : tone === "sky" ? "rgb(var(--c-sky-pale))" : "rgb(var(--c-primary-pale))";
  const ink = tone === "teal" ? "rgb(var(--th-3c6b65))" : tone === "gold" ? "rgb(var(--c-team-gold-ink))" : tone === "sky" ? "rgb(var(--c-sky))" : "rgb(var(--c-primary-deep-text))";
  const words = th.participantName.replace(/·.*$/, "").trim().split(/\s+/).filter(Boolean);
  const initials = th.participantId || th.kind !== "peer" ? ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() : "";
  return (
    <span aria-hidden className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color: ink, fontSize: 16, fontWeight: 800 }}>
      {initials || <AvatarPlaceholder size={48} />}
    </span>
  );
};

/** gen/r16.js gAv16 (group: #E4F0EE / teal pale, users 22 #2F5F58 / teal ink) and row19's broadcast tile (gold pale, megaphone 20 gold ink). */
const ProTile: React.FC<{ kind: "group" | "broadcast" }> = ({ kind }) =>
  kind === "group" ? (
    <span data-type-tile="group" className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-th-e4f0ee dark:bg-teal-pale">
      <Users size={22} strokeWidth={2} className="text-th-2f5f58 dark:text-teal-deep-text" aria-hidden />
    </span>
  ) : (
    <span data-type-tile="broadcast" className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgb(var(--c-gold-pale))" }}>
      <Megaphone size={20} strokeWidth={2} style={{ color: "rgb(var(--c-team-gold-ink))" }} aria-hidden />
    </span>
  );

/** #14a / #14b: the photo, the venue's logo, or a type tile; a person without a photo shows initials. */
const Avatar: React.FC<{ thread: MessageThread; c: ListColors }> = ({ thread: th, c }) => {
  if (th.kind === "group") return <TypeTile kind="group" c={c} />;
  if (th.participantAvatarUrl)
    return (
      <span className="w-12 h-12 rounded-full overflow-hidden flex">
        <img src={th.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  if (th.kind === "official_support") return <TypeTile kind="official" c={c} />;
  if (th.venue?.memberSide) return <TypeTile kind="gym" c={c} />;
  const initial = th.participantId ? th.participantName.trim().charAt(0).toUpperCase() : "";
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
