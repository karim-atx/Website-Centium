import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Clock, ImageIcon, Mic, Paperclip, Send, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { usePoll } from "../../hooks/usePoll";
import { useVoiceRecorder, MAX_SECONDS } from "../../hooks/useVoiceRecorder";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { VoiceNoteBubble } from "./VoiceNoteBubble";
import { acceptFor } from "../../services/storage";
import {
  fetchMessages,
  markThreadRead,
  sendImageAttachment,
  sendMessage,
  sendVoiceNote,
  threadAllowsAttachments,
  type Message,
  type MessageThread,
} from "../../services/messaging";

/** How far the finger must travel from the mic before a release cancels. */
const CANCEL_DISTANCE = 60;

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
  const unread = useUnread();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  /**
   * The message currently in flight, as a rendering concern only.
   *
   * NO ID, AND NEVER IN `messages`. An optimistic entry with a fabricated id
   * is the dual-id-space problem this messaging work has avoided since the
   * first commit — the next poll either duplicates it or cannot recognise it.
   * This is a separate value rendered after the list and discarded either way,
   * so there is nothing to reconcile.
   *
   * It matters most for attachments and voice notes, where an upload can take
   * seconds and the composer would otherwise sit silent.
   */
  const [pending, setPending] = useState<{ kind: "text" | "photo" | "voice"; text?: string } | null>(
    null
  );

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
  const recorder = useVoiceRecorder();

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

    // MARKED AFTER EVERY LOAD, NOT JUST ON OPEN. A message arriving while the
    // thread is already open is just as read as one that was here when it
    // opened, and marking only on mount would leave it unread forever.
    //
    // Guarded on there being something to mark, so an idle open conversation
    // does not spend a write every eight seconds saying nothing changed. The
    // check is client-side on rows already fetched, so it costs no round trip.
    const hasUnreadFromThem = result.messages.some(
      (m) => m.senderId !== authUserId && !m.readAt
    );
    if (!hasUnreadFromThem) return;

    const marked = await markThreadRead(thread.id);
    // Re-read rather than patching local state: the timestamp is the server's,
    // and inventing one here to avoid a round trip would put a value on screen
    // that never existed in the database.
    if (marked > 0) {
      const after = await fetchMessages(thread.id);
      if (after.ok) setMessages(after.messages);
      // The badge polls every thirty seconds, which is fine for noticing a new
      // message and far too slow for clearing one you are looking at. Nudged
      // only when something was actually marked, so this stays off the poll
      // path that changes nothing.
      unread.refresh();
    }
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
  // yank the view down while someone is reading back through it. `pending` is
  // in here as a boolean rather than the object: it flips exactly twice per
  // send, so the in-flight bubble scrolls into view when it appears, and a
  // poll returning identical history still moves nothing.
  const isSending = !!pending;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isSending]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !authUserId || sending) return;
    setSending(true);
    setError(null);
    // Optimistic, and deliberately NOT a message. `pending` is a rendering
    // state with no id: it never enters `messages`, so it cannot collide with
    // a real row, cannot be matched by a poll, and cannot survive a failure as
    // a phantom. The composer is freed immediately because that is what makes
    // the send feel finished, and the draft is put back if it was not.
    setPending({ kind: "text", text: body });
    setDraft("");
    const result = await sendMessage(thread.id, authUserId, body);
    setSending(false);
    setPending(null);
    if (!result.ok) {
      // The draft is deliberately restored. Losing what someone typed because
      // the network blinked is worse than the failure itself — clearing it
      // above is an optimism this has to pay back when the optimism was wrong.
      setDraft(body);
      setError(result.message);
      return;
    }
    // Appending the returned ROW, not the draft — the id and timestamp are the
    // database's, so the next poll recognises it instead of duplicating it.
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
  };

  const attach = async (file: File) => {
    if (!authUserId || sending) return;
    setSending(true);
    setError(null);
    setPending({ kind: "photo" });
    const result = await sendImageAttachment(thread.id, authUserId, file);
    setSending(false);
    setPending(null);
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

  /**
   * PRESS AND HOLD, with slide-away to cancel.
   *
   * Pointer events rather than touch, so one code path covers finger, mouse
   * and stylus. `setPointerCapture` is what makes the release reliable: without
   * it, lifting a finger outside the button fires pointerup somewhere else and
   * the recorder keeps running with the microphone live.
   *
   * A press shorter than a second is discarded as a mis-tap rather than sent —
   * see MIN_SECONDS — and so is a release past CANCEL_DISTANCE.
   */
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const [willCancel, setWillCancel] = useState(false);

  const onRecordDown = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (sending) return;
    // Capture is an optimisation, not a requirement: it throws if the pointer
    // is already gone, and letting that propagate would abort the handler
    // before recording starts — turning a rare race into a dead button.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* fall through — release is still handled by pointerup/pointercancel */
    }
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    setWillCancel(false);
    await recorder.start();
  };

  const onRecordMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!recorder.recording || !pressOrigin.current) return;
    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    setWillCancel(Math.hypot(dx, dy) > CANCEL_DISTANCE);
  };

  const onRecordUp = async () => {
    if (!recorder.recording) {
      pressOrigin.current = null;
      return;
    }
    const discard = willCancel;
    pressOrigin.current = null;
    setWillCancel(false);
    const capture = await recorder.stop({ discard });
    if (!capture || !authUserId) return;

    setSending(true);
    setError(null);
    setPending({ kind: "voice" });
    const result = await sendVoiceNote(thread.id, authUserId, capture.file, capture.seconds);
    setSending(false);
    setPending(null);
    if (!result.ok) {
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
                ) : m.attachmentPath && m.voiceNoteSeconds ? (
                  // Voice note before photo: both are attachment_url, and the
                  // duration column is the only thing distinguishing them.
                  <VoiceNoteBubble
                    path={m.attachmentPath}
                    seconds={m.voiceNoteSeconds}
                    mine={mine}
                  />
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
                {/* ON EVERY BUBBLE, NOT ONLY YOUR OWN — a deliberate departure
                    from the usual convention, which puts ticks sender-side
                    because "did it reach them" is the sender's question. Here
                    each message reports its OWN state to whoever is looking, so
                    one you received shows as read the moment opening the thread
                    marks it. That is the honest reading of the data rather than
                    a glitch: mark-as-read runs on load, so by the time the tick
                    is on screen it is telling the truth.

                    THE COLOURS ONLY SURVIVE THIS MOVE BECAUSE THE SENT TICK
                    SETS NO COLOUR OF ITS OWN. It inherits currentColor — white
                    inside your `primary` bubble, charcoal inside a received
                    `cream-soft` one — measuring 1.72:1 and 4.20:1. Hard-coding
                    it white to "match the design" would drop the received side
                    to 1.05:1 and make it disappear. The read green is explicit
                    and works on both grounds: 4.02:1 and 8.67:1.

                    SENT AND READ, WITH NO "DELIVERED" BETWEEN THEM. A delivered
                    state was scoped and deliberately dropped: the only place a
                    recipient's client reliably touches the server on every page
                    is the 30s unread poll, so "delivered" would mean "their
                    client fetched this row within the last half minute" — not
                    that their device received it, and not that anyone was
                    there. RLS would at least keep the sender from stamping
                    their own message, so it would not be a lie about WHO, but
                    it would be a weak claim wearing a confident icon. It is
                    worth building on real Realtime events and not before.

                    NOT BLUE, AND THE COLOUR WAS MEASURED RATHER THAN CHOSEN. A
                    blue read-tick belongs to apps whose sent bubble is white or
                    pale green; this one is `primary`, a mid-toned lavender, and
                    every accent in this palette was designed for light grounds
                    and therefore vanishes on it — sky 1.45:1, teal 1.30, gold
                    1.05, and status-good, the app's OWN confirmation colour,
                    only 1.64. None clear the 3:1 WCAG asks of a graphical
                    object, and most are fainter than the body text beside them.

                    So `status-good-deep` exists: the same hue as status-good,
                    darkened until it works on a saturated ground. 4.02:1 in
                    light and 3.67:1 in dark, which is why it needs no per-theme
                    variant. It keeps the confirmation meaning the palette
                    already assigns to that green instead of inventing a
                    signal.

                    SHAPE CARRIES IT ANYWAY — one tick against two — so the
                    state survives greyscale, colour blindness, and a 13px
                    icon where hue is barely perceptible. The colour is
                    reinforcement, not the message. */}
                <span
                  className={`flex items-center justify-end gap-1 mt-1 ${
                    m.readAt ? "text-status-good-deep" : "opacity-60"
                  }`}
                  title={m.readAt ? "Read" : "Sent"}
                >
                  {m.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                </span>
              </div>
            </div>
          );
        })}
        {/* The in-flight message, rendered after the real ones and outside the
            list. Dimmed and clock-ticked so it reads as not-yet-landed rather
            than as a message that arrived looking odd. */}
        {pending && (
          <div className="flex justify-end">
            <div className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-primary text-white dark:text-[#0D0B1A] opacity-60">
              {pending.kind === "text" ? (
                pending.text
              ) : (
                <span className="flex items-center gap-2">
                  {pending.kind === "photo" ? <ImageIcon size={15} /> : <Mic size={15} />}
                  {pending.kind === "photo" ? "Photo" : "Voice note"}
                </span>
              )}
              <span className="flex items-center justify-end gap-1 mt-1 opacity-70" title="Sending">
                <Clock size={13} />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* A recorder failure gets the same treatment as a send failure, because
          from the user's side they are the same event: the voice note they
          tried to make did not happen. A denied microphone in particular must
          say so — a hold that silently does nothing reads as a broken app. */}
      {(error || recorder.error) && (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-2">
          {error ?? recorder.error?.message}
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
        {recorder.recording ? (
          // Replaces the text field while recording, so the elapsed count and
          // the cancel hint occupy the space the user is already looking at.
          <div
            className={`flex-1 flex items-center gap-2 rounded-full px-4 py-2.5 ${
              willCancel ? "bg-status-high-bg" : "bg-cream-soft"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-status-high animate-pulse shrink-0" />
            <span className="text-sm font-semibold tabular-nums text-charcoal">
              {Math.floor(recorder.seconds / 60)}:{String(recorder.seconds % 60).padStart(2, "0")}
            </span>
            <span className="text-[11px] text-charcoal-faint truncate">
              {willCancel ? "Release to cancel" : `Slide away to cancel · max ${MAX_SECONDS / 60} min`}
            </span>
          </div>
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Message…"
            className="flex-1 rounded-full bg-cream-soft border border-charcoal/10 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}

        {/* Same gate as the paperclip: thread_allows_attachments covers
            voice_note_seconds at both server doors, so one check governs both.
            Shown only when the draft is empty — a typed message wants Send,
            and putting the two side by side makes the primary action ambiguous. */}
        {canAttach && recorder.supported && !draft.trim() && (
          <button
            onPointerDown={(e) => void onRecordDown(e)}
            onPointerMove={onRecordMove}
            onPointerUp={() => void onRecordUp()}
            onPointerCancel={() => void onRecordUp()}
            disabled={sending}
            aria-label="Hold to record a voice note"
            className={`tap w-10 h-10 rounded-full flex items-center justify-center shrink-0 touch-none disabled:opacity-40 ${
              recorder.recording
                ? "bg-status-high text-white scale-110"
                : "text-charcoal-soft hover:bg-cream-soft"
            } transition-transform`}
          >
            <Mic size={17} />
          </button>
        )}
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
