import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Clock, Copy, CornerUpLeft, EyeOff, Forward, ImageIcon, Mic, Paperclip, Pin, PinOff, Send, Star, Trash2, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { usePoll } from "../../hooks/usePoll";
import { usePinRealtime } from "../../hooks/usePinRealtime";
import { useThreadRealtime } from "../../hooks/useThreadRealtime";
import { useVoiceRecorder, MAX_SECONDS } from "../../hooks/useVoiceRecorder";
import { BottomSheet } from "../ui/BottomSheet";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { ForwardSheet } from "./ForwardSheet";
import { QuotedMessage } from "./QuotedMessage";
import { VoiceNoteBubble } from "./VoiceNoteBubble";
import { acceptFor } from "../../services/storage";
import {
  clearPin,
  describeMessage,
  fetchMessages,
  fetchPin,
  fetchStarred,
  hideMessage,
  markThreadRead,
  sendImageAttachment,
  sendMessage,
  sendVoiceNote,
  setPin,
  setStarred,
  threadAllowsAttachments,
  type Message,
  type MessageThread,
  type Pin as ThreadPin,
} from "../../services/messaging";

/** How far the finger must travel from the mic before a release cancels. */
const CANCEL_DISTANCE = 60;

/** Rightward travel that counts as swipe-to-reply. Matches Food and JournalTab. */
const SWIPE_THRESHOLD = 60;

/**
 * How often an open conversation re-reads WHEN REALTIME IS NOT DELIVERING.
 *
 * This is the fallback interval, not the normal one. It runs only while the
 * subscription is not live — a failed handshake, a dropped socket, a browser
 * that will not open one — and is the value the thread used to poll at
 * unconditionally.
 */
const FALLBACK_POLL_MS = 8000;

/**
 * A slow re-read that runs EVEN WHILE REALTIME IS LIVE, and it is deliberate
 * belt-and-braces rather than distrust of the subscription.
 *
 * The failure this covers is specific and has already happened once on this
 * project: a socket that reports SUBSCRIBED and then delivers nothing. From the
 * client that is indistinguishable from a quiet conversation, so a fallback
 * keyed on subscription STATUS cannot catch it — the status says everything is
 * fine. One request a minute bounds how long a conversation can be silently
 * stale, and costs less than the 8s poll it replaces by a factor of seven.
 *
 * Worth removing once Realtime has a track record here. Not before.
 */
const SAFETY_POLL_MS = 60000;

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
 * LIVE OVER REALTIME, WITH POLLING AS THE FALLBACK. Message changes arrive on
 * a postgres_changes subscription scoped to this thread; the 8s poll now runs
 * only when that subscription is not delivering, plus a slow 60s safety re-read
 * that runs regardless. See useThreadRealtime for why the event is treated as a
 * trigger to re-read rather than as data — the short version is that the app
 * reads through messages_visible and Realtime publishes the raw table, so
 * applying a payload directly would walk round this viewer's hidden messages.
 *
 * EITHER WAY IT RUNS ONLY WHILE THIS IS MOUNTED, so it stops when the thread
 * closes — the list does not poll and does not subscribe. An open conversation
 * is the one place latency is felt; an inbox refreshing on its own is requests
 * spent on something nobody is reading.
 */
export const ThreadView: React.FC<{
  thread: MessageThread;
  onBack: () => void;
}> = ({ thread, onBack }) => {
  const { authUserId } = useApp();
  const unread = useUnread();
  /**
   * The other participant has deleted their account.
   *
   * DERIVED FROM THE NULL RATHER THAN FROM THE LABEL. Testing
   * `participantName === "Deleted account"` would work today and break the
   * moment that string is reworded or translated — the identity is the fact,
   * and the name is a rendering of it.
   *
   * The null is unambiguous in both halves: in SQL because the view LEFT JOINs
   * profiles and the foreign key admits no other cause, and in this client
   * because a thread object only exists after fetchThreads has fully resolved.
   * See the note in fetchThreads.
   */
  const departed = thread.participantId === null;
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

  /** The message being replied to, if any. Cleared on send and on cancel. */
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  /** The message whose action sheet is open. */
  const [actionsFor, setActionsFor] = useState<Message | null>(null);
  /** The message being forwarded, once a destination is being chosen. */
  const [forwarding, setForwarding] = useState<Message | null>(null);
  /**
   * The message awaiting a hide confirmation.
   *
   * CONFIRMED RATHER THAN INSTANT, because there is no un-hide surface to find
   * afterwards. The row can be deleted and the message would come back, but
   * nothing in the app offers that today, so from where the user stands the
   * action does not come back — and an action that does not come back gets
   * asked about first.
   */
  const [hiding, setHiding] = useState<Message | null>(null);
  /**
   * Ids this viewer has starred. A set rather than a field on Message, because
   * stars live in their own table and are fetched separately — folding them
   * into the message rows would mean re-fetching the conversation to toggle one.
   */
  const [starred, setStarredIds] = useState<Set<string>>(new Set());
  /** The thread's one pin, shared with the other participant. */
  const [pin, setPinState] = useState<ThreadPin | null>(null);
  /** Briefly outlined after a jump, so the eye lands somewhere. */
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    // THE IDS COME FROM WHAT WAS JUST RENDERED, which is what makes hiding and
    // reading independent decisions. `result.messages` came through
    // messages_visible, so a message this viewer hid is not in the list and is
    // therefore never marked read — hiding is not a read action, and marking by
    // thread_id would have quietly made it one.
    const unreadFromThem = result.messages
      .filter((m) => m.senderId !== authUserId && !m.readAt)
      .map((m) => m.id);
    if (unreadFromThem.length === 0) return;

    const marked = await markThreadRead(unreadFromThem);
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

  // Stars and the pin, read once when the thread opens.
  //
  // A STAR STAYS OFF EVERY LIVE PATH, deliberately. It is this viewer's own
  // action and cannot change behind their back, so there is nothing to be
  // notified about: message_flags is not in the realtime publication, and the
  // toggle already updates state itself. Re-reading it on a timer would spend
  // requests confirming what the last tap established.
  //
  // THE PIN IS THE OPPOSITE CASE, because the other participant can move it.
  // This fetch is now the ON-OPEN read only; usePinRealtime below keeps it
  // current while the thread stays open. It used to be the only read, which is
  // why a pin moved mid-conversation did not appear until the thread was
  // reopened.
  const refreshPin = async () => setPinState(await fetchPin(thread.id));
  useEffect(() => {
    let cancelled = false;
    setStarredIds(new Set());
    setPinState(null);
    void fetchStarred().then((s) => {
      if (!cancelled) setStarredIds(s);
    });
    void fetchPin(thread.id).then((p) => {
      if (!cancelled) setPinState(p);
    });
    return () => {
      cancelled = true;
    };
  }, [thread.id]);

  // The subscription re-reads through load(), so everything downstream of it —
  // read receipts, the unread badge nudge, the hidden-message filter — behaves
  // identically whether a change arrived live or on a poll. There is no second
  // code path to keep in step.
  const realtime = useThreadRealtime(thread.id, () => void load());

  // Mutually exclusive with the line below: the fast poll exists only to cover
  // a subscription that is not delivering.
  usePoll(() => void load(), FALLBACK_POLL_MS, realtime !== "live");
  usePoll(() => void load(), SAFETY_POLL_MS, realtime === "live");

  // The pin, live. Its own subscription rather than a second table on the one
  // above, because the two have different failure budgets: messages fall back
  // to polling when the socket is quiet, and a pin deliberately does not — see
  // usePinRealtime. Re-reads through the same refreshPin the viewer's own
  // pin/unpin uses, so a change arriving from the other participant and one
  // made here take the identical path.
  usePinRealtime(thread.id, () => void refreshPin());

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
    // Captured before the await: the reply banner is cleared optimistically
    // alongside the draft, so the target has to be held rather than read back
    // from state that may already be gone.
    const target = replyTo;
    setReplyTo(null);
    const result = await sendMessage(thread.id, authUserId, body, target?.id ?? null);
    setSending(false);
    setPending(null);
    if (!result.ok) {
      // The draft is deliberately restored. Losing what someone typed because
      // the network blinked is worse than the failure itself — clearing it
      // above is an optimism this has to pay back when the optimism was wrong.
      setDraft(body);
      // The reply target comes back too. A restored draft that has lost what
      // it was answering would be re-sent as an ordinary message without the
      // user noticing the quote had gone.
      setReplyTo(target);
      setError(result.message);
      return;
    }
    // Appending the returned ROW, not the draft — the id and timestamp are the
    // database's, so the next poll recognises it instead of duplicating it.
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
  };

  /**
   * One gesture handler for both long-press and swipe-right, because they
   * start identically and only diverge on what the finger does next.
   *
   * Pointer events rather than touch, so a mouse gets the same behaviour — a
   * right-click opens the same sheet via onContextMenu, which is the desktop
   * equivalent of a long press.
   *
   * MOVEMENT CANCELS THE LONG PRESS. Without that, a swipe would fire the
   * sheet halfway through and the two gestures would fight; 10px is enough to
   * distinguish a deliberate drag from the wobble of holding still.
   *
   * ACCESSIBILITY GAP, STATED RATHER THAN HIDDEN: a long press has no keyboard
   * or screen-reader equivalent, and neither does a swipe. Every action here is
   * reachable another way today — copy from the OS, reply by typing — so
   * nothing is exclusively behind a gesture, but a visible per-message control
   * is the honest fix and is not in this change.
   */
  const pressTimer = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onBubbleDown = (e: React.PointerEvent, m: Message) => {
    pressOriginRef.current = { x: e.clientX, y: e.clientY };
    clearPress();
    pressTimer.current = window.setTimeout(() => setActionsFor(m), 500);
  };

  const onBubbleMove = (e: React.PointerEvent) => {
    const origin = pressOriginRef.current;
    if (!origin) return;
    if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) clearPress();
  };

  const onBubbleUp = (e: React.PointerEvent, m: Message) => {
    clearPress();
    const origin = pressOriginRef.current;
    pressOriginRef.current = null;
    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    // Same shape as the swipe already used in Food and JournalTab: rightward
    // past the threshold, and near-horizontal so a scroll is never mistaken
    // for it.
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < 40) setReplyTo(m);
  };

  /** Scrolls to a quoted message and marks it, so the jump is visible. */
  const jumpTo = (id: string) => {
    const el = bubbleRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(id);
    window.setTimeout(() => setHighlighted((cur) => (cur === id ? null : cur)), 1600);
  };

  const toggleStar = async (m: Message) => {
    if (!authUserId) return;
    const on = !starred.has(m.id);
    // Optimistic, and safe to be: the only writer of this row is this user, so
    // there is no other party whose action could contradict it. On failure it
    // is put back rather than left showing a mark the database refused.
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(m.id);
      else next.delete(m.id);
      return next;
    });
    const ok = await setStarred(m.id, authUserId, on);
    if (!ok) {
      setStarredIds((prev) => {
        const next = new Set(prev);
        if (on) next.delete(m.id);
        else next.add(m.id);
        return next;
      });
    }
  };

  const pinMessage = async (m: Message) => {
    if (!authUserId) return;
    // NOT OPTIMISTIC, unlike the star. This row is shared — the other
    // participant can move or clear it — so the truth is whatever the database
    // holds after the write, and re-reading is one request to avoid showing a
    // pin that lost a race.
    const ok = await setPin(thread.id, m.id, authUserId);
    if (ok) await refreshPin();
  };

  const unpinMessage = async () => {
    const ok = await clearPin(thread.id);
    if (ok) await refreshPin();
  };

  const confirmHide = async () => {
    if (!hiding || !authUserId) return;
    const ok = await hideMessage(hiding.id, authUserId);
    setHiding(null);
    if (!ok) return;
    // Re-read rather than splicing it out locally: messages_visible is what
    // decides, and the unread badge is counted from the same view, so one
    // reload keeps the list and the count telling the same story.
    await load();
    unread.refresh();
  };

  const copyMessage = async (m: Message) => {
    const body = m.text?.trim();
    if (!body) return;
    try {
      await navigator.clipboard?.writeText(body);
    } catch {
      /* Clipboard can be refused by permissions policy; nothing to recover. */
    }
    setActionsFor(null);
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

      {/* THE PINNED BANNER, and it renders only when the pinned message is one
          this viewer can actually see. A pin is shared, but hiding is not: if
          they hid the message someone pinned, the banner would otherwise be a
          reference to something absent from their conversation — so it is
          suppressed rather than shown as unavailable, which would state that a
          message is gone when it is merely hidden by choice.

          Tapping reuses jumpTo, the same scroll-and-highlight the reply quote
          uses, so the two behave identically rather than similarly. */}
      {pin &&
        (() => {
          const target = messages.find((m) => m.id === pin.messageId);
          if (!target) return null;
          return (
            <div className="flex items-center gap-2 rounded-xl bg-primary-pale px-3 py-2 mb-2">
              <Pin size={13} className="text-primary-dark shrink-0" />
              <button
                onClick={() => jumpTo(pin.messageId)}
                className="tap flex-1 min-w-0 text-left"
              >
                <p className="text-[11px] font-semibold text-primary-dark">Pinned</p>
                <p className="text-xs text-charcoal truncate">{describeMessage(target)}</p>
              </button>
              <button
                onClick={() => void unpinMessage()}
                aria-label="Unpin message"
                className="tap w-7 h-7 rounded-full flex items-center justify-center text-charcoal-faint shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })()}

      <div className="flex-1 space-y-2 mb-3">
        {loaded && messages.length === 0 && (
          <p className="text-sm text-charcoal-faint text-center py-8">
            {/* "Say hello to Deleted account" invites something impossible.
                An empty thread whose other side has gone is simply empty. */}
            {departed
              ? "This conversation is empty."
              : `No messages yet — say hello to ${thread.participantName}.`}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === authUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                ref={(el) => {
                  bubbleRefs.current[m.id] = el;
                }}
                onPointerDown={(e) => onBubbleDown(e, m)}
                onPointerMove={onBubbleMove}
                onPointerUp={(e) => onBubbleUp(e, m)}
                onPointerCancel={clearPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActionsFor(m);
                }}
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words select-none transition-shadow ${
                  mine ? "bg-bubble-sent text-white dark:text-[#0D0B1A]" : "bg-cream-soft text-charcoal"
                } ${highlighted === m.id ? "ring-2 ring-primary-dark" : ""}`}
              >
                {/* The quote sits above the message body, as it reads: what
                    is being answered, then the answer. The parent is looked up
                    among the loaded messages rather than stored, so a reply to
                    something scrolled out of the window renders as unavailable
                    instead of a stale copy. */}
                {m.replyToId && (
                  <QuotedMessage
                    inBubble
                    message={messages.find((x) => x.id === m.replyToId) ?? null}
                    authorLabel={
                      messages.find((x) => x.id === m.replyToId)?.senderId === authUserId
                        ? "You"
                        : thread.participantName
                    }
                    onJump={() => m.replyToId && jumpTo(m.replyToId)}
                  />
                )}
                {/* A star is the viewer's own mark, so it sits with the tick
                    rather than above the text: it says something about their
                    relationship to the message, not about the message. Filled
                    rather than outlined, because an outline at this size reads
                    as a tappable affordance and this is a state. */}
                {/* 80% stays: on the darkened sent ground it now measures
                    4.32-4.40:1 across the four themes, well past the 3:1 a
                    non-text indicator needs, while still reading as quieter
                    than the message itself. */}
                {starred.has(m.id) && (
                  <Star
                    size={11}
                    aria-label="Starred"
                    className="float-right ml-1.5 mt-1 shrink-0 fill-current opacity-80"
                  />
                )}
                {/* Above the text, because it qualifies everything below it.
                    A reader who sees the words first and the provenance second
                    has already taken them as the sender's own. */}
                {/* 85%, not 70%. At 11px this is NORMAL text by WCAG's
                    measure — "large" starts at 18.66px bold or 24px — so it
                    needs 4.5:1, not 3:1. 85% is the most de-emphasis the
                    darkened ground affords while clearing it: 4.65-4.72:1
                    across the four themes, against 1.87:1 before. */}
                {m.forwarded && (
                  <span className="flex items-center gap-1 text-[11px] italic opacity-85 mb-0.5">
                    <Forward size={11} className="shrink-0" /> Forwarded
                  </span>
                )}
                {m.text}
                {/* Purged first: both content columns are null, so testing
                    attachmentPath alone would render nothing at all and the
                    message would look like an empty bubble rather than one
                    whose file was deliberately removed. */}
                {m.attachmentPurgedAt ? (
                  <span className="flex items-center gap-1.5 opacity-85 italic">
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

                    THE UNSENT TICK SETS NO COLOUR OF ITS OWN, which is what
                    lets one element serve both bubbles. It inherits
                    currentColor — white inside your own bubble, charcoal
                    inside a received `cream-soft` one. Hard-coding it white to
                    "match the design" would drop the received side to 1.05:1
                    and make it disappear. At 75% it now measures 4.02-4.09:1
                    sent and 6.80:1 received; it was 60%, and 1.72:1 sent.

                    THE READ TICK HAS TO BRANCH, THOUGH, and that is new. A
                    fixed colour cannot serve both grounds once the sent bubble
                    is dark: `status-good-deep` is a DARK green, so it reads
                    8.67:1 on the pale received bubble and 1.62-1.64:1 on the
                    new sent ones, while `bubble-read` is a LIGHT green and
                    inverts exactly — 3.69-3.74:1 sent, 1.43:1 received. So
                    each side takes the one built for its ground.

                    The old comment here claimed one green covered both at
                    4.02:1 and 8.67:1. That was measured on the default accent
                    in light mode only; on a sent bubble it was already 2.77:1
                    on ocean and 1.72:1 on berry. Four themes, two modes — the
                    numbers above are the worst case across all of them.

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
                    m.readAt
                      ? mine
                        ? "text-bubble-read"
                        : "text-status-good-deep"
                      : "opacity-75"
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
            {/* 90%, NOT 60%. A parent opacity fades the whole subtree toward
                the page behind it, so the ink and the ground converge: at 60%
                over a white page this bubble's own text measured 1.62:1, worse
                than the un-faded bubble it imitates. 90% keeps it at 4.62:1
                and still reads as tentative, and the clock below — which this
                bubble has always carried — is what actually says "not yet". */}
            <div className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-bubble-sent text-white dark:text-[#0D0B1A] opacity-90">
              {pending.kind === "text" ? (
                pending.text
              ) : (
                <span className="flex items-center gap-2">
                  {pending.kind === "photo" ? <ImageIcon size={15} /> : <Mic size={15} />}
                  {pending.kind === "photo" ? "Photo" : "Voice note"}
                </span>
              )}
              {/* Compounds with the 90% above, so this is 0.8 x 0.9 in
                  practice: 3.59-3.66:1, past the 3:1 an icon needs. */}
              <span className="flex items-center justify-end gap-1 mt-1 opacity-80" title="Sending">
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

      {/* Above the composer, inside the sticky footer, so it travels with the
          input rather than scrolling away from what it belongs to. */}
      {replyTo && (
        <div className="sticky bottom-0 bg-cream">
          <QuotedMessage
            message={replyTo}
            authorLabel={replyTo.senderId === authUserId ? "You" : thread.participantName}
            onCancel={() => setReplyTo(null)}
          />
        </div>
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

      {/* A sheet rather than a floating menu, matching every other choice in
          this app. Only the actions that exist are listed: forward, star, pin
          and delete are separate tasks, and stubbing them here as disabled
          rows would advertise features that do nothing. */}
      <BottomSheet open={!!actionsFor} onClose={() => setActionsFor(null)} title="Message">
        <div className="space-y-1 animate-fade-slide-up">
          <button
            onClick={() => {
              if (actionsFor) setReplyTo(actionsFor);
              setActionsFor(null);
            }}
            className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
          >
            <CornerUpLeft size={17} className="text-charcoal-soft shrink-0" />
            <span className="text-sm font-medium text-charcoal">Reply</span>
          </button>
          {/* Only for a message with words. Copying an image or a voice note
              would put an empty string on the clipboard and look like it
              worked. */}
          {actionsFor?.text?.trim() && (
            <button
              onClick={() => void copyMessage(actionsFor)}
              className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
            >
              <Copy size={17} className="text-charcoal-soft shrink-0" />
              <span className="text-sm font-medium text-charcoal">Copy</span>
            </button>
          )}
          {/* Same text-present condition as Copy. Attachments and voice notes
              are not forwardable yet: the copy would point at the original
              object path, which the destination thread's participants have no
              Storage grant to read. */}
          {actionsFor?.text?.trim() && (
            <button
              onClick={() => {
                // The action sheet closes first — two BottomSheets open at
                // once would stack overlays and fight over the backdrop.
                setForwarding(actionsFor);
                setActionsFor(null);
              }}
              className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
            >
              <Forward size={17} className="text-charcoal-soft shrink-0" />
              <span className="text-sm font-medium text-charcoal">Forward</span>
            </button>
          )}
          {/* Star works on any message, unlike Copy and Forward — there is
              nothing text-specific about keeping a voice note for later. */}
          <button
            onClick={() => {
              if (actionsFor) void toggleStar(actionsFor);
              setActionsFor(null);
            }}
            className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
          >
            <Star
              size={17}
              className={`shrink-0 ${
                actionsFor && starred.has(actionsFor.id)
                  ? "text-primary-dark fill-current"
                  : "text-charcoal-soft"
              }`}
            />
            <span className="text-sm font-medium text-charcoal">
              {actionsFor && starred.has(actionsFor.id) ? "Unstar" : "Star"}
            </span>
          </button>
          {/* One entry that reads the current state rather than two that both
              always show: pinning the already-pinned message is a no-op worth
              not offering. */}
          <button
            onClick={() => {
              if (!actionsFor) return;
              if (pin?.messageId === actionsFor.id) void unpinMessage();
              else void pinMessage(actionsFor);
              setActionsFor(null);
            }}
            className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
          >
            {pin && actionsFor && pin.messageId === actionsFor.id ? (
              <PinOff size={17} className="text-charcoal-soft shrink-0" />
            ) : (
              <Pin size={17} className="text-charcoal-soft shrink-0" />
            )}
            <span className="text-sm font-medium text-charcoal">
              {pin && actionsFor && pin.messageId === actionsFor.id ? "Unpin" : "Pin"}
            </span>
          </button>
          {/* Last, and the only one that leads to a confirmation. It is styled
              as a caution rather than a destruction: nothing is destroyed, and
              colouring it like a delete would claim otherwise. */}
          <button
            onClick={() => {
              setHiding(actionsFor);
              setActionsFor(null);
            }}
            className="tap w-full flex items-center gap-3 px-1 py-3 text-left"
          >
            <EyeOff size={17} className="text-charcoal-soft shrink-0" />
            <span className="text-sm font-medium text-charcoal">Delete for me</span>
          </button>
        </div>
      </BottomSheet>

      {/* A SEPARATE SHEET, opened after the action sheet closes, matching how
          Forward already works — two BottomSheets alive at once would stack
          overlays and fight over the same dismiss. */}
      <BottomSheet open={!!hiding} onClose={() => setHiding(null)} title="Delete for me">
        <div className="animate-fade-slide-up">
          {hiding && (
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2 mb-3 truncate">
              {describeMessage(hiding)}
            </p>
          )}
          {/* SAYS WHAT IT ACTUALLY DOES. "Delete" is the word people look for,
              so it is the label — but the message is not deleted, and the one
              sentence that matters is that the other person still has it. */}
          <p className="text-sm text-charcoal-soft mb-1">
            This removes the message from your view of the conversation.
          </p>
          {/* THE FALSE VERSION OF THIS WAS A REAL BUG, not just clumsy copy.
              "Deleted account will still see it" asserts that a person who no
              longer exists retains a view of the conversation — reassurance
              about someone who cannot be reassured. What stays true either way
              is that hiding is not deleting, so that is what is said when
              there is nobody left to name. */}
          <p className="text-xs text-charcoal-faint mb-4">
            {departed
              ? "The message isn't deleted — it stays part of the conversation. You won't be able to undo this here."
              : `${thread.participantName} will still see it, and it stays part of the conversation for them. You won't be able to undo this here.`}
          </p>
          <button
            onClick={() => void confirmHide()}
            className="tap w-full rounded-xl bg-primary text-white dark:text-[#0D0B1A] font-semibold text-sm py-3"
          >
            Delete for me
          </button>
          <button
            onClick={() => setHiding(null)}
            className="tap w-full text-sm font-medium text-charcoal-soft py-3"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      <ForwardSheet
        open={!!forwarding}
        onClose={() => setForwarding(null)}
        message={forwarding}
        currentThreadId={thread.id}
        senderId={authUserId}
      />
    </div>
  );
};
