import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { usePoll } from "../../hooks/usePoll";
import { fetchMessages, sendMessage, type Message, type MessageThread } from "../../services/messaging";

/** How often an open conversation re-reads. See usePoll for why polling at all. */
const POLL_MS = 8000;

/**
 * One conversation: history, and a composer.
 *
 * SIDES ARE DECIDED BY sender_id, NOT BY ROLE. A message is "mine" when its
 * sender is the signed-in user, which is the only comparison that works for
 * both participants from one component. The mock used `from: "professional" |
 * "client"`, which forced two different renderings of the same conversation
 * and could not describe a thread between people whose roles the viewer does
 * not know.
 *
 * POLLING RUNS ONLY WHILE THIS IS MOUNTED, so it stops when the thread closes
 * — the list does not poll. An open conversation is the one place latency is
 * felt; an inbox refreshing on its own is requests spent on something nobody
 * is reading.
 */
export const ThreadView: React.FC<{
  thread: MessageThread;
  onBack: () => void;
}> = ({ thread, onBack }) => {
  const { authUserId } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const result = await fetchMessages(thread.id);
    if (!result.ok) {
      // A failed poll is not worth interrupting a conversation over — the
      // history on screen is still what was last true. Only a failed SEND
      // gets an error, because that is the one the user is waiting on.
      setLoaded(true);
      return;
    }
    setMessages(result.messages);
    setLoaded(true);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  usePoll(() => void load(), POLL_MS);

  // Only when the count changes, so a poll returning the same history does not
  // yank the view down while someone is reading back through it.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !authUserId || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessage(thread.id, authUserId, body);
    setSending(false);
    if (!result.ok) {
      // The draft is deliberately kept. Losing what someone typed because the
      // network blinked is worse than the failure itself.
      setError(result.message);
      return;
    }
    // Appending the returned ROW, not the draft — the id and timestamp are the
    // database's, so the next poll recognises it instead of duplicating it.
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
    setDraft("");
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="font-semibold text-charcoal truncate">{thread.participantName}</p>
      </div>

      <div className="flex-1 space-y-2 mb-3">
        {loaded && messages.length === 0 && (
          <p className="text-sm text-charcoal-faint text-center py-8">
            No messages yet — say hello to {thread.participantName}.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === authUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                  mine ? "bg-primary text-white dark:text-[#0D0B1A]" : "bg-cream-soft text-charcoal"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 sticky bottom-0 bg-cream pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Message…"
          className="flex-1 rounded-full bg-cream-soft border border-charcoal/10 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="tap w-10 h-10 rounded-full bg-primary text-white dark:text-[#0D0B1A] flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
