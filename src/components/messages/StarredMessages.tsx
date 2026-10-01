import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Card } from "../ui/Card";
import { describeMessage, type MessageThread } from "../../services/messaging";
import { fetchStarredMessages, type StarredMessage } from "../../services/messaging/chatFeatures";
import { listTime } from "./chatTime";

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
      <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
        Couldn't load your starred messages. Try again.
      </p>
    );
  }

  if (items && items.length === 0) {
    return (
      <Card className="text-center py-10">
        <Star size={22} className="text-charcoal-faint mx-auto mb-2" />
        <p className="text-sm text-charcoal-faint">No starred messages.</p>
        <p className="text-[11px] text-charcoal-faint mt-1 max-w-xs mx-auto">
          Press and hold a message, then tap Star to keep it here. Only you can see your stars.
        </p>
      </Card>
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
          className="tap w-full text-left rounded-2xl bg-cream-card border border-charcoal/[0.08] px-3.5 py-3 flex flex-col gap-1"
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
