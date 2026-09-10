import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImageIcon, Paperclip, Send, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { usePoll } from "../../hooks/usePoll";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { acceptFor } from "../../services/storage";
import {
  fetchMessages,
  sendImageAttachment,
  sendMessage,
  threadAllowsAttachments,
  type Message,
  type MessageThread,
} from "../../services/messaging";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // Whether these two may exchange files at all. Asked once, when the thread
  // opens, via the same database function both server-side guards use.
  //
  // NOT RE-ASKED WHILE OPEN, deliberately. If the relationship ends
  // mid-conversation the button lingers until the thread is reopened — and
  // that is harmless, because this is not the enforcement. The Storage policy
  // and the messages trigger both refuse independently, so a stale button
  // produces a clear refusal rather than an attachment that should not exist.
  // Re-checking on every 8s poll would spend a round trip to tidy up a
  // cosmetic edge nobody is standing on.
  const [canAttach, setCanAttach] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setCanAttach(false);
    void threadAllowsAttachments(thread.id).then((allowed) => {
      if (!cancelled) setCanAttach(allowed);
    });
    return () => {
      cancelled = true;
    };
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

  const attach = async (file: File) => {
    if (!authUserId || sending) return;
    setSending(true);
    setError(null);
    const result = await sendImageAttachment(thread.id, authUserId, file);
    setSending(false);
    if (!result.ok) {
      // Covers a refusal from either door and an ordinary upload failure
      // alike. What matters is that nothing is appended: an image that did not
      // send must not appear to have sent, even when the file did reach the
      // bucket. See sendImageAttachment on why that object cannot be reclaimed.
      setError(result.message);
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
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
                {/* Purged first: both content columns are null, so testing
                    attachmentPath alone would render nothing at all and the
                    message would look like an empty bubble rather than one
                    whose file was deliberately removed. */}
                {m.attachmentPurgedAt ? (
                  <span className="flex items-center gap-1.5 opacity-70 italic">
                    <Trash2 size={13} className="shrink-0" /> Attachment removed
                  </span>
                ) : (
                  m.attachmentPath && (
                    // A TILE, NOT A THUMBNAIL. Rendering the image inline needs
                    // a signed URL per attachment at list render, and
                    // signedUrlFor caps its TTL at ten minutes — so an open
                    // thread would fill with broken images, and the 8s poll
                    // would re-sign every one of them on every tick. Signing on
                    // tap is what FileViewerSheet already does everywhere else.
                    <button
                      onClick={() => setViewing(m.attachmentPath)}
                      className={`tap flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-left ${
                        m.text ? "mt-1.5" : ""
                      }`}
                    >
                      <ImageIcon size={15} className="shrink-0" />
                      <span className="text-[12.5px] font-semibold">Photo</span>
                    </button>
                  )
                )}
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
        {/* Shown only for a live relationship. This is convenience, not
            security — the server refuses independently at both doors, so
            hiding the button spares someone an upload that was always going to
            be rejected rather than being the thing that stops them. */}
        {canAttach && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              // Images only. The bucket also accepts audio so a recorded voice
              // note can go up (6c), but nothing picks audio off disk and
              // acceptFor excludes it on every bucket.
              accept={acceptFor("message-attachments", true)}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset first: picking the same file twice in a row fires no
                // change event otherwise, so a failed send could not be retried
                // with the same image.
                e.target.value = "";
                if (file) void attach(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach a photo"
              className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft shrink-0 hover:bg-cream-soft disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
          </>
        )}
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

      <FileViewerSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        path={viewing}
        bucket="message-attachments"
        label="Photo"
      />
    </div>
  );
};
