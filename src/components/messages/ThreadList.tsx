import { PERSON_ICON } from "../../utils/icons";
import { BellOff, Check, CheckCheck, Megaphone, Pin, ShieldCheck, Users } from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import { useThreadLive } from "../../context/threadLive";
import type { MessageThread } from "../../services/messaging";
import { isMuted, type ThreadSettings } from "../../services/messaging/chatFeatures";
import type { GroupInvitation } from "../../services/messaging/groups";
import type { BroadcastList } from "../../services/messaging/broadcasts";
import { listTime } from "./chatTime";

/**
 * The caller's conversations (Messages phase 2A, screen 1).
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
}> = ({ items, settings, senderNames, onOpenInvitation, onOpenBroadcast, readState, delivered, authUserId, onOpen }) => {
  const unread = useUnread();
  const live = useThreadLive();
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        if (item.type === "invite") {
          const inv = item.invitation;
          return (
            <li key={`inv-${inv.threadId}`} className="border-b border-charcoal/[0.07]">
              <button
                type="button"
                onClick={() => onOpenInvitation(inv)}
                className="tap w-full flex items-center gap-3 px-2 py-3 min-h-[72px] text-left"
              >
                <GroupAvatar />
                <span className="min-w-0 flex-1 flex flex-col gap-[3px]">
                  <span className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[15px] font-bold text-charcoal truncate">{inv.groupName}</span>
                    <span className="shrink-0 rounded-full bg-primary-pale text-primary-deep-text text-[11px] font-extrabold uppercase tracking-[0.06em] px-2 py-0.5">
                      Invitation
                    </span>
                  </span>
                  <span className="text-[13px] text-primary-deep-text font-semibold truncate">
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
            <li key={`bc-${list.id}`} className="border-b border-charcoal/[0.07]">
              <button
                type="button"
                onClick={() => onOpenBroadcast(list)}
                className="tap w-full flex items-center gap-3 px-2 py-3 min-h-[72px] text-left"
              >
                <span className="w-12 h-12 rounded-full bg-[#FBF1DC] dark:bg-gold-pale flex items-center justify-center shrink-0">
                  <Megaphone size={20} style={{ color: "#7A5212" }} className="dark:!text-gold" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 flex flex-col gap-[3px]">
                  <span className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[15px] font-bold text-charcoal truncate">{list.name} (broadcast)</span>
                    <span className="text-xs text-charcoal-soft shrink-0">
                      {list.lastSentAt ? listTime(list.lastSentAt) : ""}
                    </span>
                  </span>
                  <span className="text-[13px] text-charcoal-soft truncate">
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
        const group = t.kind === "group";
        const official = t.kind === "official_support";
        const count = unread.byThread[t.id] ?? 0;
        const s = settings[t.id];
        const muted = isMuted(s);
        const mine = !!t.lastMessageId && t.lastMessageSenderId === authUserId;
        const read = mine && t.lastMessageId ? !!readState[t.lastMessageId] : false;
        const reached = mine && !!t.lastMessageId && delivered.has(t.lastMessageId);
        const typing = live.typing.has(t.id);
        // Presence is never shown in a group (the database refuses it there).
        const online = !group && live.online.has(t.id);
        // "Lina: …" in a group, so the preview says who.
        const groupSender =
          group && !mine && t.lastMessageSenderId ? senderNames[t.id]?.[t.lastMessageSenderId] : undefined;
        return (
          <li key={t.id} className="border-b border-charcoal/[0.07]">
            <button
              type="button"
              onClick={() => onOpen(t)}
              className="tap w-full flex items-center gap-3 px-2 py-3 min-h-[72px] text-left"
            >
              {group ? (
                <GroupAvatar />
              ) : (
              <span className="relative shrink-0">
                <span
                  className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                    official ? "bg-teal-pale" : "bg-primary-pale"
                  }`}
                >
                  {t.participantAvatarUrl ? (
                    <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : official ? (
                    <ShieldCheck size={19} className="text-teal-deep-text" />
                  ) : t.venue?.memberSide ? (
                    // A gym chat: the venue's initials (no logo yet).
                    <span className="text-[15px] font-extrabold text-primary-deep-text">{t.venue.initials}</span>
                  ) : (
                    <PERSON_ICON size={19} className="text-primary-dark" />
                  )}
                </span>
                {/* ONLINE, only when both people share it (server-gated). */}
                {online && (
                  <span
                    aria-label="Online"
                    className="absolute right-px bottom-px w-[11px] h-[11px] rounded-full border-2 border-cream"
                    style={{ background: "#2E9E6B" }}
                  />
                )}
              </span>
              )}
              <span className="min-w-0 flex-1 flex flex-col gap-[3px]">
                <span className="flex items-center justify-between gap-2 min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] font-bold text-charcoal truncate">{t.participantName}</span>
                    {official && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-teal-pale text-charcoal-soft dark:text-teal-deep-text text-[10px] font-semibold px-1.5 py-0.5">
                        <ShieldCheck size={10} /> Official
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 shrink-0 text-xs ${
                      count > 0 ? "text-primary-deep-text font-bold" : "text-charcoal-soft"
                    }`}
                  >
                    {muted && <BellOff size={13} aria-label="Muted" className="text-charcoal-soft" />}
                    {t.lastMessageAt ? listTime(t.lastMessageAt) : ""}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 min-w-0">
                  <span
                    className={`flex items-center gap-1 min-w-0 text-[13px] ${
                      count > 0 ? "text-charcoal font-semibold" : "text-charcoal-soft"
                    }`}
                  >
                    {typing ? (
                      <span className="truncate italic text-primary-deep-text font-normal">typing…</span>
                    ) : (
                    <>
                    {mine && !group &&
                      (read ? (
                        <CheckCheck size={15} aria-label="Read" className="shrink-0 text-[#3A7BD5] dark:text-[#7FB0F0]" />
                      ) : (
                        reached ? (
                          <CheckCheck size={15} aria-label="Delivered" className="shrink-0 opacity-70" />
                        ) : (
                          <Check size={15} aria-label="Sent" className="shrink-0 opacity-70" />
                        )
                      ))}
                    <span className="truncate">
                      {mine ? "You: " : groupSender ? `${groupSender}: ` : ""}
                      {t.lastMessagePreview ?? "No messages yet"}
                    </span>
                    </>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {s?.pinnedAt && <Pin size={13} aria-label="Pinned" className="text-charcoal-soft" />}
                    {count > 0 && (
                      <span
                        aria-label={`${count} unread`}
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-fill text-on-primary-fill text-[11px] font-extrabold flex items-center justify-center"
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/** The group avatar from the design: a two-person mark on teal. */
const GroupAvatar: React.FC = () => (
  <span className="w-12 h-12 rounded-full bg-th-e4f0ee dark:bg-teal-pale flex items-center justify-center shrink-0">
    <Users size={22} className="text-th-2f5f58 dark:text-teal-deep-text" aria-hidden />
  </span>
);
