import { PERSON_ICON } from "../../utils/icons";
import { BellOff, Check, CheckCheck, Pin, ShieldCheck } from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import type { MessageThread } from "../../services/messaging";
import { isMuted, type ThreadSettings } from "../../services/messaging/chatFeatures";
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
 * settings. There is no delivered tick and no online dot yet — the database
 * does not expose either to the app.
 */
export const ThreadList: React.FC<{
  threads: MessageThread[];
  settings: Record<string, ThreadSettings>;
  readState: Record<string, string | null>;
  authUserId: string | null;
  onOpen: (thread: MessageThread) => void;
}> = ({ threads, settings, readState, authUserId, onOpen }) => {
  const unread = useUnread();
  return (
    <ul className="flex flex-col">
      {threads.map((t) => {
        const official = t.kind === "official_support";
        const count = unread.byThread[t.id] ?? 0;
        const s = settings[t.id];
        const muted = isMuted(s);
        const mine = !!t.lastMessageId && t.lastMessageSenderId === authUserId;
        const read = mine && t.lastMessageId ? !!readState[t.lastMessageId] : false;
        return (
          <li key={t.id} className="border-b border-charcoal/[0.07]">
            <button
              type="button"
              onClick={() => onOpen(t)}
              className="tap w-full flex items-center gap-3 px-2 py-3 min-h-[72px] text-left"
            >
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                  official ? "bg-teal-pale" : "bg-primary-pale"
                }`}
              >
                {t.participantAvatarUrl ? (
                  <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : official ? (
                  <ShieldCheck size={19} className="text-teal-deep-text" />
                ) : (
                  <PERSON_ICON size={19} className="text-primary-dark" />
                )}
              </span>
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
                    {mine &&
                      (read ? (
                        <CheckCheck size={15} aria-label="Read" className="shrink-0 text-[#3A7BD5] dark:text-[#7FB0F0]" />
                      ) : (
                        <Check size={15} aria-label="Sent" className="shrink-0 opacity-70" />
                      ))}
                    <span className="truncate">
                      {mine ? "You: " : ""}
                      {t.lastMessagePreview ?? "No messages yet"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {s?.pinnedAt && <Pin size={13} aria-label="Pinned" className="text-charcoal-soft" />}
                    {count > 0 && (
                      <span
                        aria-label={`${count} unread`}
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white dark:text-[#0D0B1A] text-[11px] font-extrabold flex items-center justify-center"
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
