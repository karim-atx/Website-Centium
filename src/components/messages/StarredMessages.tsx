import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { describeMessage, type MessageThread } from "../../services/messaging";
import { fetchStarredMessages, type StarredMessage } from "../../services/messaging/chatFeatures";
import { listTime } from "./chatTime";
import { useListColors } from "./listColors";

/**
 * Every message the reader starred, newest star first, across all chats.
 *
 * Stars are private (message_stars has own-row policies only), and a starred
 * message later hidden with "delete for me" drops out because it is read
 * through messages_visible. Tapping one opens its chat.
 */
export const StarredMessages: React.FC<{
  threads: MessageThread[];
  authUserId: string | null;
  onOpen: (threadId: string) => void;
}> = ({ threads, authUserId, onOpen }) => {
  const [items, setItems] = useState<StarredMessage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const c = useListColors();

  useEffect(() => {
    let cancelled = false;
    void fetchStarredMessages().then((r) => {
      if (cancelled) return;
      if (r === null) setFailed(true);
      setItems(r ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <p role="alert" className="text-center py-8 text-[12.5px] leading-[18.8px] font-medium" style={{ color: c.dangerText }}>
        Couldn't load your starred messages. Try again.
      </p>
    );
  }

  if (items && items.length === 0) {
    return (
      // MO1.7 K11: the MO1.7.e empty pattern with Star 26.
      <div data-empty-state="" className="flex flex-col items-center text-center gap-2.5 pt-10 pb-10">
        <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: c.primaryTint, color: c.primaryInk }}>
          <Star size={26} aria-hidden />
        </span>
        <p className="text-[16px] leading-[20.8px] font-extrabold" style={{ color: c.ink }}>
          No starred messages
        </p>
        <p className="max-w-[260px] text-[12.5px] leading-[18.8px] font-normal" style={{ color: c.inkSoft }}>
          {/* The privacy line is main's, kept verbatim (release review O10). */}
          Long-press a message and tap Star to keep it here. Only you can see your stars.
        </p>
      </div>
    );
  }

  const nameFor = (m: StarredMessage) => {
    if (m.senderId === authUserId) return "You";
    return threads.find((t) => t.id === m.threadId)?.participantName ?? "Conversation";
  };
  const chatFor = (threadId: string) => threads.find((t) => t.id === threadId)?.participantName;

  return (
    <div className="flex flex-col gap-2">
      {(items ?? []).map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(m.threadId)}
          className="tap w-full text-start rounded-2xl bg-cream-card border border-charcoal/[0.08] px-3.5 py-3 flex flex-col gap-1"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary-deep-text truncate">
              {nameFor(m)}
              {m.senderId === authUserId && chatFor(m.threadId) ? ` → ${chatFor(m.threadId)}` : ""}
            </span>
            <span className="text-[11px] text-charcoal-soft shrink-0">{listTime(m.createdAt)}</span>
          </span>
          <span className="text-[13.5px] text-charcoal line-clamp-3 flex items-start gap-1.5">
            <Star size={12} className="fill-current text-primary-deep-text shrink-0 mt-1" aria-label="Starred" />
            {describeMessage({
              text: m.text,
              attachmentPath: m.attachmentPath,
              attachmentPurgedAt: null,
              redactedAt: null,
              voiceNoteSeconds: m.voiceNoteSeconds,
              attachmentKind: m.attachmentKind,
              attachmentName: m.attachmentName,
            })}
          </span>
        </button>
      ))}
    </div>
  );
};
