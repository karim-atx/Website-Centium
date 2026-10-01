import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, Ban, Check, CheckCheck, Clock, FileText, Forward, ImageIcon, Mic, Paperclip, Pencil, Phone, Pin, Search, Send, ShieldCheck, Star, Trash2, Video, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useCall } from "../../context/CallContext";
import { threadAllowsCalls, type CallKind } from "../../services/calling";
import { checkCallMedia } from "../../utils/mediaPermissions";
import { useUnread } from "../../context/UnreadContext";
import { usePoll } from "../../hooks/usePoll";
import { usePinRealtime } from "../../hooks/usePinRealtime";
import { useThreadRealtime } from "../../hooks/useThreadRealtime";
import { useVoiceRecorder, MAX_SECONDS } from "../../hooks/useVoiceRecorder";
import { BottomSheet } from "../ui/BottomSheet";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { InlineImage } from "./InlineImage";
import { BlockSheet, ReportSheet } from "./ConversationSafety";
import { ChatInfo } from "./ChatInfo";
import { FileCard } from "./FileCard";
import { MessageActions, type MessageAction } from "./MessageActions";
import { SearchResults } from "./SearchResults";
import { clockTime } from "./chatTime";
import { useReactionsRealtime } from "../../hooks/useReactionsRealtime";
import { useThreadLive } from "../../context/threadLive";
import { computeWaveform } from "../../services/messaging/waveformDecode";
import {
  fetchReactions,
  searchMessages,
  setReaction,
  type SearchHit,
  type Reaction,
  type ThreadSettings,
} from "../../services/messaging/chatFeatures";
import { AttachmentGone } from "./AttachmentGone";
import { ImageLightbox } from "./ImageLightbox";
import { attachmentUrl, isImagePath } from "../../services/messaging/attachmentUrls";
import { ForwardSheet } from "./ForwardSheet";
import { QuotedMessage } from "./QuotedMessage";
import { VoiceNoteBubble } from "./VoiceNoteBubble";
import { acceptDocumentsFor, acceptFor } from "../../services/storage";
import {
  clearPin,
  describeMessage,
  describeRemoval,
  fetchMessagePage,
  mayOpenAttachment,
  fetchBlockState,
  blockUser,
  unblockUser,
  type BlockState,
  fetchPin,
  fetchStarred,
  hideMessage,
  markThreadRead,
  sendFileAttachment,
  sendImageAttachment,
  sendMessage,
  editMessage,
  deleteForEveryone,
  editTimeLeft,
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
 * A fresh newest page, laid over what is already loaded.
 *
 * Everything older than the page's first message is kept as it was, so older
 * history the reader scrolled back to survives every refresh. Anything the page
 * covers comes from the page, so a message hidden meanwhile disappears.
 *
 * A GAP IS NOT PAPERED OVER: if more than a page arrived since the last read,
 * the page no longer reaches what is loaded, so the list restarts from the page
 * rather than splicing two ranges with an unknown stretch missing between them.
 */
function mergeNewest(prev: Message[], page: Message[], pageHasOlder: boolean): Message[] {
  if (page.length === 0) return pageHasOlder ? prev : [];
  const first = page[0];
  const before = (m: Message) => m.createdAt < first.createdAt || (m.createdAt === first.createdAt && m.id < first.id);
  const older = prev.filter(before);
  if (pageHasOlder && prev.length > 0 && older.length === prev.length) {
    const newestLoaded = prev[prev.length - 1];
    const reaches = page.some((m) => m.id === newestLoaded.id) || !before(newestLoaded);
    if (!reaches) return page;
  }
  return [...older, ...page];
}

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
  /** The reader's own mute/pin/archive for this chat; see Chat info. */
  settings?: ThreadSettings;
  onSettingsChanged: () => void;
  onBack: () => void;
  /** A message to show on opening, e.g. a search result; older pages load until it is there. */
  focusMessageId?: string | null;
}> = ({ thread, settings, onSettingsChanged, onBack, focusMessageId }) => {
  const { authUserId, user } = useApp();
  const unread = useUnread();
  // Typing and online for this chat; the database decides who sees them.
  const live = useThreadLive();
  const theyAreTyping = live.typing.has(thread.id);
  const theyAreOnline = live.online.has(thread.id);
  /**
   * WHERE THE COMPOSER STICKS: just above the bottom bar, not behind it. The
   * client bar floats 18px up and is 58px tall; the professional and business
   * bar is flush and goes away at lg, where the sidebar takes over.
   */
  const footerBottom =
    user.accountType === "professional" || user.accountType === "business"
      ? "bottom-[calc(env(safe-area-inset-bottom)+64px)] lg:bottom-0"
      : "bottom-[calc(env(safe-area-inset-bottom)+84px)]";
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

  // BLOCKING (Database 20261001020000). A block stops messages and calls both
  // ways; the composer and call buttons give way to a plain statement of it.
  // Official support threads cannot be blocked or reported from here.
  const safetyApplies = !departed && thread.kind === "peer";
  const [block, setBlock] = useState<BlockState>({ iBlocked: false, blocked: false });
  const [blockOpen, setBlockOpen] = useState(false);
  /** Chat info (screen 6) replaces the conversation while open. */
  const [infoOpen, setInfoOpen] = useState(false);
  const [reportFor, setReportFor] = useState<Message | null>(null);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const refreshBlock = async () => {
    if (!safetyApplies || !authUserId || !thread.participantId) return;
    setBlock(await fetchBlockState(authUserId, thread.participantId));
  };
  useEffect(() => {
    void refreshBlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, authUserId]);
  const doBlock = async () => {
    if (!authUserId || !thread.participantId) return;
    setSafetyBusy(true);
    setSafetyError(null);
    const r = await blockUser(authUserId, thread.participantId);
    setSafetyBusy(false);
    if (!r.ok) return setSafetyError(r.message);
    setBlockOpen(false);
    setReportFor(null);
    await refreshBlock();
  };
  const doUnblock = async () => {
    if (!authUserId || !thread.participantId) return;
    setSafetyBusy(true);
    setSafetyError(null);
    const r = await unblockUser(authUserId, thread.participantId);
    setSafetyBusy(false);
    if (!r.ok) return setSafetyError(r.message);
    setBlockOpen(false);
    await refreshBlock();
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A non-image file opens in the file viewer; a photo opens full screen.
  const [viewing, setViewing] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  // Files the storage rule refused to this viewer (a former professional).
  const [goneFiles, setGoneFiles] = useState<Set<string>>(new Set());
  const openFile = async (path: string) => {
    if ((await mayOpenAttachment(path)) === false) setGoneFiles((g) => new Set(g).add(path));
    else setViewing(path);
  };
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
  const [pending, setPending] = useState<{ kind: "text" | "photo" | "file" | "voice"; text?: string } | null>(
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
  /** Your own message whose text the composer is editing. */
  const [editing, setEditing] = useState<Message | null>(null);
  /** Your own message awaiting "Delete for everyone" confirmation. */
  const [unsending, setUnsending] = useState<Message | null>(null);
  const [unsendBusy, setUnsendBusy] = useState(false);
  /** Message info (sent, delivered, read) for one of your own messages. */
  const [infoFor, setInfoFor] = useState<Message | null>(null);
  /** Photo or document, chosen from the paperclip. */
  const [attachMenu, setAttachMenu] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  /**
   * Reactions on the loaded messages, keyed by message id. Re-read whenever the
   * loaded set changes and whenever message_reactions changes (realtime).
   */
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  /**
   * WHERE "N NEW MESSAGES" GOES, fixed when the chat opens: the reader's last
   * read time as the list reported it. Marking the chat read on load moves the
   * server's value, so it is captured once rather than read back. Null when
   * nothing was unread; "" when they had never read this chat.
   */
  const [readBefore] = useState<string | null>(() => (thread.unreadCount > 0 ? thread.lastReadAt ?? "" : null));
  const dividerRef = useRef<HTMLDivElement>(null);
  const [dividerAbove, setDividerAbove] = useState(false);
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
  // Same shape and same reasoning as canAttach above, against the call
  // predicate instead. thread_allows_calls delegates the relationship rule to
  // thread_allows_attachments and adds "and the caller is a participant", so
  // these two are asked separately rather than one being derived from the other.
  const [canCall, setCanCall] = useState(false);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const { placeCall: placeCallRemote, busy: callBusy } = useCall();
  const recorder = useVoiceRecorder();

  /**
   * Checks devices, then opens the call.
   *
   * PERMISSION BEFORE THE SERVER, deliberately. Minting a token and writing a
   * ringing row for a caller whose microphone is blocked would ring the other
   * person for a call that cannot carry audio — and end-call would have to
   * clean it up. Asking first costs nothing when permission is already granted,
   * since the browser resolves it without a prompt.
   *
   * A REFUSED CAMERA DOWNGRADES RATHER THAN FAILS: checkCallMedia asks audio
   * and video separately for exactly this, so a blocked camera places a voice
   * call and says so instead of stopping someone who can still talk.
   */
  const placeCall = async (kind: CallKind) => {
    if (!thread.participantId) return;
    setMediaNotice(null);
    const media = await checkCallMedia(kind);
    if (!media.canCall) {
      setMediaNotice(media.message);
      return;
    }
    if (media.message) setMediaNotice(media.message);
    await placeCallRemote(thread.id, thread.participantId, media.degradedToVoice ? "voice" : kind);
  };

  // PAGED. A thread opens on its newest page and older pages load as the
  // reader scrolls up (loadOlder). Every refresh re-reads only the newest page
  // and merges it over what is loaded, so scrolled-back history is kept.
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const firstPageDone = useRef(false);
  // When the caller last marked this thread read (the server's time).
  const lastMarked = useRef<string | null>(thread.lastReadAt);

  const load = async () => {
    const result = await fetchMessagePage(thread.id);
    if (!result.ok) {
      // A failed poll is not worth interrupting a conversation over — the
      // history on screen is still what was last true. Only a failed SEND
      // gets an error, because that is the one the user is waiting on.
      setLoaded(true);
      return;
    }
    setMessages((prev) => mergeNewest(prev, result.messages, result.hasOlder));
    if (!firstPageDone.current) {
      firstPageDone.current = true;
      setHasOlder(result.hasOlder);
    }
    setLoaded(true);

    // MARKED AFTER A LOAD THAT BROUGHT SOMETHING NEWER FROM THEM, not on every
    // poll: the newest message they sent is compared with when this reader
    // last marked the thread. read_at cannot be the test any more — it stays
    // empty for ever in threads where either person turned read receipts off.
    //
    // Hiding is still not a read action: a message hidden with "delete for me"
    // is not in this list, so it never becomes the newest one to mark.
    const newestFromThem = [...result.messages].reverse().find((m) => m.senderId !== authUserId);
    if (!newestFromThem) return;
    if (lastMarked.current && newestFromThem.createdAt <= lastMarked.current) return;

    const at = await markThreadRead(thread.id);
    if (!at) return;
    lastMarked.current = at;
    // Re-read rather than patching local state: the receipt time is the
    // server's, and where receipts are off there is none to show.
    const after = await fetchMessagePage(thread.id);
    if (after.ok) setMessages((prev) => mergeNewest(prev, after.messages, after.hasOlder));
    // The badge polls every thirty seconds, far too slow for clearing one you
    // are looking at.
    unread.refresh();
  };

  // Where to put the reader back after older messages are prepended: the page
  // height and scroll position just before, so the message they were reading
  // stays exactly where it was.
  const keepPlace = useRef<{ height: number; y: number } | null>(null);

  const loadOlder = async () => {
    if (loadingOlder || !hasOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const result = await fetchMessagePage(thread.id, { createdAt: oldest.createdAt, id: oldest.id });
    if (result.ok) {
      keepPlace.current = { height: document.documentElement.scrollHeight, y: window.scrollY };
      setMessages((prev) => [...result.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasOlder(result.hasOlder);
    }
    setLoadingOlder(false);
  };

  useLayoutEffect(() => {
    const place = keepPlace.current;
    if (!place) return;
    keepPlace.current = null;
    window.scrollTo(0, place.y + (document.documentElement.scrollHeight - place.height));
  }, [messages]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  useEffect(() => {
    let cancelled = false;
    setCanAttach(false);
    setCanCall(false);
    setMediaNotice(null);
    void threadAllowsAttachments(thread.id).then((allowed) => {
      if (!cancelled) setCanAttach(allowed);
    });
    if (authUserId) {
      void threadAllowsCalls(thread.id, authUserId).then((allowed) => {
        if (!cancelled) setCanCall(allowed);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [thread.id, authUserId]);

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

  const idsKey = messages.map((m) => m.id).join(",");
  const refreshReactions = async () => {
    const ids = idsKey ? idsKey.split(",") : [];
    setReactions(await fetchReactions(ids));
  };
  useEffect(() => {
    void refreshReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
  useReactionsRealtime(thread.id, () => void refreshReactions());

  const react = async (m: Message, emoji: string | null) => {
    if (!authUserId) return;
    const had = (reactions[m.id] ?? []).some((x) => x.userId === authUserId);
    const result = await setReaction(m.id, authUserId, emoji, had);
    if (!result.ok) setError(result.message);
    await refreshReactions();
  };

  // Only when the NEWEST message changes, so a poll returning the same history
  // does not yank the view down while someone is reading back through it, and
  // loading an older page (which adds messages at the top) does not either.
  // `pending` is in here as a boolean: it flips exactly twice per send, so the
  // in-flight bubble scrolls into view when it appears.
  const isSending = !!pending;
  const newestId = messages[messages.length - 1]?.id;
  const [atBottomOnce, setAtBottomOnce] = useState(false);
  const firstScrollDone = useRef(false);
  useEffect(() => {
    // JUMP TO UNREAD on opening: the first new message sits near the top of
    // the screen instead of the reader landing past everything they missed.
    if (!firstScrollDone.current && newestId && dividerRef.current) {
      dividerRef.current.scrollIntoView({ block: "center" });
    } else {
      endRef.current?.scrollIntoView({ block: "end" });
    }
    if (newestId) {
      firstScrollDone.current = true;
      setAtBottomOnce(true);
    }
  }, [newestId, isSending]);

  // The pill that jumps back to the divider, shown while it is above the screen.
  useEffect(() => {
    const el = dividerRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setDividerAbove(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [newestId, infoOpen]);

  // OLDER MESSAGES LOAD AS THE TOP COMES INTO VIEW, and only once the thread
  // has first been shown at its end — otherwise the top is on screen for the
  // instant before that first scroll, and a second page would load unasked.
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = topRef.current;
    if (!el || !hasOlder || !atBottomOnce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadOlder();
    }, { rootMargin: "300px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // loadOlder reads current state; re-observing on every render would fire it twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOlder, atBottomOnce, messages[0]?.id]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !authUserId || sending) return;
    if (editing) {
      // EDIT, NOT SEND. The database checks the fifteen minutes and that it is
      // yours; the composer keeps the text if it refuses.
      setSending(true);
      setError(null);
      const result = await editMessage(editing.id, body);
      setSending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(null);
      setDraft("");
      await load();
      return;
    }
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
      // A refusal may be a block that just started: show that state rather than a composer that cannot send.
      void refreshBlock();
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
    // Smooth only when it is close: a smooth scroll across hundreds of
    // messages is slow and any re-render on the way can cut it short.
    const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 2;
    el.scrollIntoView({ behavior: far ? "auto" : "smooth", block: "center" });
    setHighlighted(id);
    window.setTimeout(() => setHighlighted((cur) => (cur === id ? null : cur)), 1600);
  };

  /**
   * Shows a message that may not be loaded yet: pages back through older
   * history until it is (up to 40 pages), then scrolls to it and marks it.
   * Used by search results and the Starred tab in Chat info.
   */
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const focusMessage = async (id: string) => {
    if (bubbleRefs.current[id]) return jumpTo(id);
    let list = messagesRef.current;
    let older: Message[] = [];
    let more = true;
    for (let i = 0; i < 40 && more && !list.some((m) => m.id === id); i++) {
      const oldest = list[0];
      if (!oldest) break;
      const result = await fetchMessagePage(thread.id, { createdAt: oldest.createdAt, id: oldest.id });
      if (!result.ok) break;
      older = [...result.messages, ...older];
      list = [...result.messages, ...list];
      more = result.hasOlder;
    }
    if (older.length > 0) {
      setMessages((prev) => [...older.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasOlder(more);
    }
    if (list.some((m) => m.id === id)) setPendingFocus(id);
    else setError("That message isn't in this conversation any more.");
  };
  useEffect(() => {
    if (pendingFocus && bubbleRefs.current[pendingFocus]) {
      jumpTo(pendingFocus);
      setPendingFocus(null);
    }
    // jumpTo reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, pendingFocus]);
  // Opened from a search result: once the first page is in, go to it.
  const focusDone = useRef(false);
  useEffect(() => {
    if (!focusMessageId || !loaded || focusDone.current) return;
    focusDone.current = true;
    window.setTimeout(() => void focusMessage(focusMessageId), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMessageId, loaded]);

  // SEARCH IN THIS CHAT (Database 20261002070000), opened from Chat info.
  // The same database search as the chat list, scoped to this thread, so one
  // character is enough here.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchMore, setSearchMore] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTerm = searchQuery.trim();
  useEffect(() => {
    if (!searchOpen || !searchTerm) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      const result = await searchMessages(searchTerm, { threadId: thread.id });
      if (cancelled) return;
      setSearchBusy(false);
      if (!result.ok) {
        setSearchError(result.message);
        setSearchHits([]);
        setSearchMore(false);
        return;
      }
      setSearchError(null);
      setSearchHits(result.hits);
      setSearchMore(result.hasMore);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchTerm, thread.id]);
  const moreSearch = async () => {
    const last = searchHits[searchHits.length - 1];
    if (!last) return;
    setSearchBusy(true);
    const result = await searchMessages(searchTerm, { threadId: thread.id, after: last });
    setSearchBusy(false);
    if (result.ok) {
      setSearchHits((prev) => [...prev, ...result.hits]);
      setSearchMore(result.hasMore);
    }
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchHits([]);
    setSearchMore(false);
    setSearchError(null);
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
    const isImage = file.type.startsWith("image/");
    setPending({ kind: isImage ? "photo" : "file" });
    const result = isImage
      ? await sendImageAttachment(thread.id, authUserId, file)
      : await sendFileAttachment(thread.id, authUserId, file);
    setSending(false);
    setPending(null);
    if (!result.ok) {
      // Covers a refusal from either door and an ordinary upload failure
      // alike. What matters is that nothing is appended: an image that did not
      // send must not appear to have sent, even when the file did reach the
      // bucket. See sendImageAttachment on why that object cannot be reclaimed.
      setError(result.message);
      // A refusal may be a block that just started: show that state rather than a composer that cannot send.
      void refreshBlock();
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
    // Measured here, from the recording itself; null if this browser cannot
    // decode its own recording, and the note sends without one.
    const waveform = await computeWaveform(capture.file, 48);
    const result = await sendVoiceNote(thread.id, authUserId, capture.file, capture.seconds, waveform);
    setSending(false);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      // A refusal may be a block that just started: show that state rather than a composer that cannot send.
      void refreshBlock();
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
  };

  // "N NEW MESSAGES": before the first message from them newer than the
  // reader's last read when the chat opened.
  const dividerAt =
    readBefore === null
      ? -1
      : messages.findIndex((m) => m.senderId !== authUserId && (readBefore === "" || m.createdAt > readBefore));
  const newCount = dividerAt < 0 ? 0 : messages.slice(dividerAt).filter((m) => m.senderId !== authUserId).length;

  const actionsForMessage = (m: Message): MessageAction[] => {
    const mine = m.senderId === authUserId;
    const close = () => setActionsFor(null);
    // An unsent message has nothing left to reply to, copy, star or react to.
    if (m.deletedAt) {
      return [{ label: "Delete for me", danger: true, onSelect: () => {
        setHiding(m);
        close();
      } }];
    }
    const list: MessageAction[] = [
      { label: "Reply", onSelect: () => {
        setReplyTo(m);
        close();
      } },
    ];
    // Anything with content: the server copies a photo, file or voice note
    // into the destination chat (forward-message).
    if (m.text?.trim() || (m.attachmentPath && !m.attachmentPurgedAt)) list.push({ label: "Forward", onSelect: () => {
      setForwarding(m);
      close();
    } });
    list.push({
      label: starred.has(m.id) ? "Unstar" : "Star",
      onSelect: () => {
        void toggleStar(m);
        close();
      },
    });
    if (m.text?.trim()) list.push({ label: "Copy", onSelect: () => void copyMessage(m) });
    list.push({
      label: pin?.messageId === m.id ? "Unpin" : "Pin",
      onSelect: () => {
        if (pin?.messageId === m.id) void unpinMessage();
        else void pinMessage(m);
        close();
      },
    });
    // EDIT, with the time left, only while the window is open and only for
    // text. The note is the client's estimate; the server decides (ATX40).
    const left = mine ? editTimeLeft(m) : 0;
    if (left > 0 && m.text?.trim()) {
      list.push({
        label: "Edit",
        note: `${Math.max(1, Math.ceil(left / 60_000))} min left`,
        onSelect: () => {
          setReplyTo(null);
          setEditing(m);
          setDraft(m.text ?? "");
          close();
        },
      });
    }
    if (mine) list.push({ label: "Info", onSelect: () => {
      setInfoFor(m);
      close();
    } });
    if (safetyApplies && !mine) {
      list.push({ label: "Report", danger: true, onSelect: () => {
        setReportFor(m);
        close();
      } });
    }
    if (left > 0) {
      list.push({ label: "Delete for everyone", danger: true, onSelect: () => {
        setUnsending(m);
        close();
      } });
    }
    list.push({ label: "Delete for me", danger: true, onSelect: () => {
    setHiding(m);
    close();
  } });
    return list;
  };

  const reportLatest = (() => {
    const theirs = [...messages].reverse().find((m) => m.senderId === thread.participantId);
    return theirs ? () => setReportFor(theirs) : null;
  })();

  return (
    <div className="flex flex-col min-h-[60dvh]">
      {infoOpen && authUserId ? (
        <ChatInfo
          thread={thread}
          authUserId={authUserId}
          settings={settings}
          onSettingsChanged={onSettingsChanged}
          onBack={() => setInfoOpen(false)}
          safety={
            safetyApplies
              ? {
                  iBlocked: block.iBlocked,
                  onBlock: () => {
                    setSafetyError(null);
                    setBlockOpen(true);
                  },
                  onUnblock: () => {
                    setSafetyError(null);
                    setBlockOpen(true);
                  },
                  onReport: reportLatest,
                }
              : null
          }
          onOpenPhoto={(path, url) => setPhoto({ path, url })}
          onOpenFile={(path) => void openFile(path)}
          onJumpTo={(id) => {
            setInfoOpen(false);
            window.setTimeout(() => void focusMessage(id), 50);
          }}
          onSearch={() => {
            setInfoOpen(false);
            setSearchOpen(true);
          }}
        />
      ) : (
      <>
      {searchOpen && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center gap-2 h-11 rounded-[14px] bg-cream-card border border-charcoal/10 px-3">
              <Search size={16} className="text-charcoal-soft shrink-0" aria-hidden />
              <span className="sr-only">Search in this chat</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in chat with ${thread.participantName}`}
                className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={closeSearch}
              className="tap min-h-[44px] px-2 text-sm font-semibold text-primary-deep-text shrink-0"
            >
              Cancel
            </button>
          </div>
          {searchError && <p className="text-xs text-status-high mt-2">{searchError}</p>}
          {searchTerm && !searchBusy && !searchError && searchHits.length === 0 && (
            <p className="text-sm text-charcoal-faint text-center py-8">No messages match "{searchTerm}".</p>
          )}
          {searchTerm && searchHits.length > 0 && (
            <div className="mt-2">
              <SearchResults
                hits={searchHits}
                query={searchTerm}
                titleFor={(h) => (h.senderId === authUserId ? "You" : thread.participantName)}
                onOpen={(h) => {
                  closeSearch();
                  window.setTimeout(() => void focusMessage(h.messageId), 50);
                }}
                hasMore={searchMore}
                loadingMore={searchBusy}
                onMore={() => void moreSearch()}
              />
            </div>
          )}
        </div>
      )}
      {!(searchOpen && searchTerm) && (
      <>
      <div className={`flex items-center gap-2.5 mb-4 ${searchOpen ? "hidden" : ""}`}>
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        {/* THE NAME OPENS CHAT INFO (screen 6): mute, pin, archive, what was
            shared, privacy, block and report. flex-1 min-w-0 so a long name
            ellipses instead of pushing the call buttons off the edge. */}
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={`Chat info for ${thread.participantName}`}
          className="tap flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-primary-deep-text">
            {thread.participantAvatarUrl ? (
              <img src={thread.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              thread.participantName.trim().charAt(0).toUpperCase()
            )}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-charcoal truncate">{thread.participantName}</span>
            {(theyAreTyping || theyAreOnline) && (
              <span className="text-xs font-semibold" style={{ color: "#2E7D57" }}>
                {theyAreTyping ? "typing…" : "Online"}
              </span>
            )}
          </span>
        </button>

        {/* CALL CONTROLS, gated on canCall — asked once on open, failing
            closed, and not the enforcement: mint-call-token re-checks
            thread_allows_calls server-side. */}
        {canCall && thread.participantId && !block.blocked && (
          <>
            <button
              onClick={() => void placeCall("voice")}
              disabled={callBusy}
              aria-label={`Voice call ${thread.participantName}`}
              className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0 disabled:opacity-50"
            >
              <Phone size={15} />
            </button>
            <button
              onClick={() => void placeCall("video")}
              disabled={callBusy}
              aria-label={`Video call ${thread.participantName}`}
              className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0 disabled:opacity-50"
            >
              <Video size={15} />
            </button>
          </>
        )}
      </div>

      {/* WHO THIS IS, stated rather than implied by a name in the header.
          Centium opened this conversation, and a stranger calling themselves
          "Centium Support" is exactly the shape of a phishing message. The
          second sentence is the useful half: it stays true in an email, a DM
          or a phone call, none of which this app can vouch for. */}
      {thread.kind === "official_support" && (
        <div className="flex items-start gap-2 rounded-xl bg-teal-pale text-charcoal-soft dark:text-teal-deep-text px-3 py-2.5 mb-2">
          <ShieldCheck size={15} className="shrink-0 mt-px" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-semibold">You're talking with Centium Support.</span>{" "}
            Centium started this conversation — it is not a message from
            another member. Centium Support will never ask for your password
            or payment details in a message.
          </p>
        </div>
      )}

      {mediaNotice && (
        <p className="text-[11px] text-charcoal-faint bg-cream-soft rounded-xl px-3 py-2 mb-2">
          {mediaNotice}
        </p>
      )}

      {/* THE PINNED BANNER, only when the pinned message is one this viewer
          can see: a pin is shared, hiding is not. */}
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

      <div className="flex-1 flex flex-col gap-2.5 mb-3">
        {/* The top of the loaded history. Scrolling up to it loads the next
            older page; the button is the same action for anyone not scrolling. */}
        <div ref={topRef}>
          {hasOlder && (
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="tap mx-auto flex items-center justify-center min-h-[44px] px-4 text-xs font-semibold text-charcoal-soft disabled:opacity-60"
            >
              {loadingOlder ? "Loading earlier messages…" : "Load earlier messages"}
            </button>
          )}
        </div>
        {loaded && messages.length === 0 && (
          <p className="text-sm text-charcoal-faint text-center py-8">
            {departed
              ? "This conversation is empty."
              : `No messages yet — say hello to ${thread.participantName}.`}
          </p>
        )}
        {messages.map((m, index) => {
          const mine = m.senderId === authUserId;
          // An official thread has exactly two sides, so anything that is not
          // the viewer's own is support.
          const fromSupport = !mine && thread.kind === "official_support";
          // GLOBAL, NOT PER-VIEWER: both participants see the same notice.
          const removal = describeRemoval(m);
          const kind =
            m.attachmentKind ??
            (m.voiceNoteSeconds ? "voice" : m.attachmentPath && isImagePath(m.attachmentPath) ? "image" : "file");
          const mineReactions = reactions[m.id] ?? [];
          const grouped = Object.entries(
            mineReactions.reduce<Record<string, { n: number; me: boolean }>>((acc, x) => {
              const g = (acc[x.emoji] ??= { n: 0, me: false });
              g.n += 1;
              if (x.userId === authUserId) g.me = true;
              return acc;
            }, {})
          );
          const myReaction = mineReactions.find((x) => x.userId === authUserId)?.emoji ?? null;
          const tick = m.readAt ? "read" : m.deliveredAt ? "delivered" : "sent";
          return (
            <div key={m.id} className="flex flex-col gap-1">
              {index === dividerAt && (
                <div ref={dividerRef} className="flex items-center gap-2 my-1" role="separator">
                  <span className="flex-1 h-px bg-primary/40" />
                  <span className="text-xs font-bold text-primary-deep-text">
                    {newCount === 1 ? "1 new message" : `${newCount} new messages`}
                  </span>
                  <span className="flex-1 h-px bg-primary/40" />
                </div>
              )}
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
                className={`max-w-[78%] px-3 py-[9px] text-sm leading-[1.4] whitespace-pre-wrap break-words select-none transition-shadow flex flex-col gap-1 ${
                  mine
                    ? "self-end rounded-[16px_16px_4px_16px] bg-bubble-sent text-white dark:text-[#0D0B1A]"
                    : // Support messages keep the teal the Admin console gives
                      // them. The light text colour is corrected to clear AA on
                      // teal-pale; the dark one already does.
                      `self-start rounded-[16px_16px_16px_4px] ${
                        fromSupport
                          ? "bg-teal-pale text-charcoal-soft dark:text-teal-deep-text"
                          : "bg-cream-soft text-charcoal"
                      }`
                } ${highlighted === m.id ? "ring-2 ring-primary-dark" : ""}`}
              >
                {/* What is being answered, then the answer. The parent is looked
                    up among the loaded messages, so a reply to something not
                    loaded renders as unavailable rather than a stale copy. */}
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
                {/* Above the text: a reader who sees the words first has
                    already taken them as the sender's own. 85% clears 4.5:1 on
                    the sent ground at 11px. */}
                {m.forwarded && (
                  <span className="flex items-center gap-1 text-[11px] italic opacity-85">
                    <Forward size={11} className="shrink-0" /> Forwarded
                  </span>
                )}
                {m.text && <span>{m.text}</span>}
                {/* What was taken off this message, derived from what is
                    actually absent; shared with the list via describeRemoval. */}
                {m.deletedAt ? (
                  // UNSENT: the same words for both people, and nothing else
                  // from the message survives on the row to show.
                  <span className="flex items-center gap-1.5 italic text-[13.5px] opacity-85">
                    <Ban size={14} className="shrink-0" /> This message was deleted
                  </span>
                ) : (
                  removal && (
                    <span className="flex items-center gap-1.5 opacity-85 italic">
                      <Trash2 size={13} className="shrink-0" /> {removal}
                    </span>
                  )
                )}
                {/* Suppressed only when the FILE is gone: a redacted text with a
                    surviving attachment still shows the attachment. */}
                {m.attachmentPurgedAt || !m.attachmentPath ? null : kind === "voice" ? (
                  <VoiceNoteBubble
                    path={m.attachmentPath}
                    seconds={m.voiceNoteSeconds}
                    mine={mine}
                    waveform={m.voiceWaveform}
                  />
                ) : kind === "image" ? (
                  // Signed as it nears the screen and re-signed before expiry
                  // (attachmentUrls); sized from the stored pixels so the box
                  // is right before it loads.
                  <InlineImage
                    path={m.attachmentPath}
                    width={m.imageWidth}
                    height={m.imageHeight}
                    onOpen={(url) => setPhoto({ path: m.attachmentPath!, url })}
                  />
                ) : goneFiles.has(m.attachmentPath) ? (
                  <AttachmentGone kind="file" />
                ) : (
                  <FileCard
                    name={m.attachmentName}
                    bytes={m.attachmentBytes}
                    mime={m.attachmentMime}
                    onOpen={() => void openFile(m.attachmentPath!)}
                  />
                )}
                {/* TIME, THEN — ON YOUR OWN MESSAGES — THE TICK: one for sent,
                    two for delivered, two in the read colour for read. Delivered
                    and read are only stored where both people allow receipts, so
                    with receipts off your messages stay at one tick.

                    The read colour branches by bubble because no single colour
                    clears 3:1 on both grounds in both modes (tick-read-sent /
                    tick-read-received). Shape carries the state anyway, so it
                    survives greyscale and colour blindness. The star is the
                    reader's own mark, so it sits here too. */}
                <span
                  className={`self-end flex items-center gap-1 text-[11px] ${
                    mine ? "opacity-90" : "text-charcoal-soft"
                  }`}
                >
                  {starred.has(m.id) && <Star size={11} aria-label="Starred" className="fill-current opacity-80" />}
                  {clockTime(m.createdAt)}
                  {m.editedAt && !m.deletedAt ? " · edited" : ""}
                  {mine && !m.deletedAt &&
                    (tick === "read" ? (
                      <CheckCheck size={15} aria-label="Read" className="text-tick-read-sent" />
                    ) : tick === "delivered" ? (
                      <CheckCheck size={15} aria-label="Delivered" />
                    ) : (
                      <Check size={15} aria-label="Sent" />
                    ))}
                </span>
              </div>
              {grouped.length > 0 && !m.deletedAt && (
                <div className={`flex gap-1 flex-wrap ${mine ? "self-end mr-2" : "self-start ml-2"}`}>
                  {grouped.map(([emoji, g]) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={block.blocked}
                      onClick={() => void react(m, g.me ? null : emoji)}
                      aria-label={`${emoji} ${g.n}${g.me ? ", including you. Tap to remove yours" : ""}`}
                      aria-pressed={g.me}
                      className={`tap text-xs rounded-full px-2 py-0.5 border ${
                        g.me ? "bg-primary-pale border-primary/40" : "bg-cream-card border-charcoal/10"
                      } text-charcoal`}
                    >
                      {emoji} {g.n}
                    </button>
                  ))}
                </div>
              )}
              {actionsFor?.id === m.id && (
                <MessageActions
                  key={m.id}
                  open
                  onClose={() => setActionsFor(null)}
                  mine={mine}
                  preview={describeMessage(m)}
                  myReaction={myReaction}
                  onReact={block.blocked || departed || m.deletedAt ? null : (emoji) => void react(m, emoji)}
                  actions={actionsForMessage(m)}
                />
              )}
            </div>
          );
        })}
        {/* The in-flight message, rendered after the real ones and outside the
            list. 90%, not lower: a parent opacity fades text toward the page. */}
        {pending && (
          <div className="self-end max-w-[78%] rounded-[16px_16px_4px_16px] px-3 py-[9px] text-sm leading-[1.4] whitespace-pre-wrap break-words bg-bubble-sent text-white dark:text-[#0D0B1A] opacity-90">
            {pending.kind === "text" ? (
              pending.text
            ) : (
              <span className="flex items-center gap-2">
                {pending.kind === "photo" ? (
                  <ImageIcon size={15} />
                ) : pending.kind === "file" ? (
                  <FileText size={15} />
                ) : (
                  <Mic size={15} />
                )}
                {pending.kind === "photo" ? "Photo" : pending.kind === "file" ? "Document" : "Voice note"}
              </span>
            )}
            <span className="flex items-center justify-end gap-1 mt-1 opacity-80" title="Sending">
              <Clock size={13} />
            </span>
          </div>
        )}
        {/* THEY ARE TYPING: three dots where their next message will land. */}
        {theyAreTyping && (
          <div
            role="status"
            aria-label={`${thread.participantName} is typing`}
            className="self-start rounded-2xl bg-cream-soft px-3.5 py-2.5 flex gap-1"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[7px] h-[7px] rounded-full bg-primary/60 animate-pulse"
                style={{ animationDelay: `${i * 180}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* JUMP TO UNREAD, while the divider is above the screen. */}
      {dividerAbove && newCount > 0 && (
        <button
          type="button"
          onClick={() => dividerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="tap fixed left-1/2 -translate-x-1/2 top-20 z-30 rounded-full bg-primary text-white dark:text-[#0D0B1A] text-xs font-bold px-3.5 h-9 flex items-center gap-1.5 shadow-lg"
        >
          <ArrowDown size={14} className="rotate-180" />
          {newCount === 1 ? "1 new message" : `${newCount} new messages`}
        </button>
      )}

      {(error || recorder.error) && (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-2">
          {error ?? recorder.error?.message}
        </p>
      )}

      {/* BLOCKED: the conversation stays readable, and nothing can be sent. The
          other side's block is stated without saying who did it. */}
      {block.blocked ? (
        <div className={`sticky ${footerBottom} bg-cream pt-2`}>
          <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-charcoal">
              {block.iBlocked ? `You blocked ${thread.participantName}` : "You can't message this person"}
            </p>
            <p className="text-xs text-charcoal-soft mt-1 leading-relaxed">
              {block.iBlocked
                ? "Neither of you can message or call the other. They haven't been told."
                : "Messages and calls aren't available in this conversation."}
            </p>
            {block.iBlocked && (
              <button
                type="button"
                onClick={() => void doUnblock()}
                disabled={safetyBusy}
                className="tap mt-2 min-h-[44px] px-4 text-sm font-semibold text-primary-deep-text disabled:opacity-50"
              >
                Unblock
              </button>
            )}
          </div>
        </div>
      ) : (
      <div className={`sticky ${footerBottom} bg-cream pt-2`}>
      {editing && (
        <div className="flex items-center gap-2 rounded-[10px] bg-cream-soft px-2.5 py-1.5 mb-2">
          <Pencil size={14} className="text-primary-deep-text shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-primary-deep-text">Editing message</p>
            <p className="text-[12.5px] text-charcoal-soft truncate">{editing.text}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDraft("");
            }}
            aria-label="Cancel editing"
            className="tap w-11 h-11 flex items-center justify-center text-charcoal-soft shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {replyTo && (
        <QuotedMessage
          message={replyTo}
          authorLabel={replyTo.senderId === authUserId ? "You" : thread.participantName}
          onCancel={() => setReplyTo(null)}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Shown only for a live relationship. Convenience, not security: the
            server refuses independently at both doors. */}
        {canAttach && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptFor("message-attachments", true)}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset first, so picking the same file again after a failure
                // still fires a change.
                e.target.value = "";
                if (file) void attach(file);
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              accept={acceptDocumentsFor("message-attachments")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void attach(file);
              }}
            />
            <button
              onClick={() => setAttachMenu(true)}
              disabled={sending}
              aria-label="Attach a photo or document"
              className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft shrink-0 hover:bg-cream-soft disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
          </>
        )}
        {recorder.recording ? (
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
            onChange={(e) => {
              setDraft(e.target.value);
              // Not while editing: an edit is not a new message on its way.
              if (e.target.value && !editing) live.sendTyping(thread.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Message…"
            className="flex-1 rounded-full bg-cream-soft border border-charcoal/10 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}

        {/* Same gate as the paperclip. Shown only when the draft is empty, so
            Send stays the one primary action while typing. */}
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
                ? "bg-status-high text-white dark:text-[#0D0B1A] scale-110"
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
      </div>
      )}
      </>
      )}
      </>
      )}

      {safetyApplies && authUserId && (
        <>
          <BlockSheet
            open={blockOpen}
            onClose={() => setBlockOpen(false)}
            personName={thread.participantName}
            iBlocked={block.iBlocked}
            busy={safetyBusy}
            error={safetyError}
            onBlock={() => void doBlock()}
            onUnblock={() => void doUnblock()}
          />
          <ReportSheet
            key={reportFor?.id ?? "none"}
            open={!!reportFor}
            onClose={() => setReportFor(null)}
            reporterId={authUserId}
            message={reportFor}
            reportedId={thread.participantId}
            personName={thread.participantName}
            canBlock={!block.iBlocked}
            onBlock={() => void doBlock()}
          />
        </>
      )}

      <FileViewerSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        path={viewing}
        bucket="message-attachments"
        label="File"
      />

      {photo && (
        <ImageLightbox
          url={photo.url}
          path={photo.path}
          onClose={() => setPhoto(null)}
          refresh={() => attachmentUrl(photo.path, true)}
        />
      )}

      <BottomSheet open={attachMenu} onClose={() => setAttachMenu(false)} title="Send">
        <div className="flex flex-col animate-fade-slide-up">
          <button
            type="button"
            onClick={() => {
              setAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="tap w-full flex items-center gap-3 px-1 min-h-[52px] text-left"
          >
            <ImageIcon size={18} className="text-charcoal-soft shrink-0" />
            <span className="text-sm font-semibold text-charcoal">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAttachMenu(false);
              docInputRef.current?.click();
            }}
            className="tap w-full flex items-start gap-3 px-1 py-3 min-h-[52px] text-left"
          >
            <FileText size={18} className="text-charcoal-soft shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-charcoal">Document</span>
              <span className="block text-xs text-charcoal-soft">PDF, Word, Excel, PowerPoint, text or CSV, up to 25 MB</span>
            </span>
          </button>
        </div>
      </BottomSheet>

      {/* MESSAGE INFO, for your own messages. Delivered and read are stored
          only where both people allow read receipts, so a dash can mean
          "not yet" or "not shared" — the note says which is possible. */}
      <BottomSheet open={!!infoFor} onClose={() => setInfoFor(null)} title="Message info">
        {infoFor && (
          <div className="flex flex-col animate-fade-slide-up">
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2 mb-2 truncate">
              {describeMessage(infoFor)}
            </p>
            {(
              [
                ["Sent", infoFor.createdAt],
                ["Delivered", infoFor.deliveredAt],
                ["Read", infoFor.readAt],
              ] as const
            ).map(([label, at]) => (
              <div key={label} className="flex items-center justify-between min-h-[48px] border-b border-charcoal/[0.06] last:border-b-0">
                <span className="text-sm font-semibold text-charcoal">{label}</span>
                <span className="text-sm text-charcoal-soft tabular-nums">
                  {at
                    ? new Date(at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
              </div>
            ))}
            {(!infoFor.deliveredAt || !infoFor.readAt) && (
              <p className="text-xs text-charcoal-soft mt-2 leading-relaxed">
                Delivered and read times aren't shown when either of you has read receipts off.
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* A SEPARATE SHEET, opened after the actions close — two overlays alive
          at once would fight over the same dismiss. */}
      <BottomSheet open={!!unsending} onClose={() => setUnsending(null)} title="Delete for everyone">
        <div className="animate-fade-slide-up">
          {unsending && (
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2 mb-3 truncate">
              {describeMessage(unsending)}
            </p>
          )}
          <p className="text-sm text-charcoal-soft mb-4">
            {departed
              ? "This removes the message from the conversation. You'll see \"This message was deleted\" in its place."
              : `This removes the message for you and ${thread.participantName}. You'll both see "This message was deleted" in its place.`}
          </p>
          <button
            onClick={async () => {
              if (!unsending) return;
              setUnsendBusy(true);
              const result = await deleteForEveryone(unsending.id);
              setUnsendBusy(false);
              setUnsending(null);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              if (editing?.id === unsending.id) {
                setEditing(null);
                setDraft("");
              }
              await load();
            }}
            disabled={unsendBusy}
            className="tap w-full rounded-xl bg-status-high text-white dark:text-[#0D0B1A] font-semibold text-sm py-3 disabled:opacity-50"
          >
            {unsendBusy ? "Deleting…" : "Delete for everyone"}
          </button>
          <button
            onClick={() => setUnsending(null)}
            className="tap w-full text-sm font-medium text-charcoal-soft py-3"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!hiding} onClose={() => setHiding(null)} title="Delete for me">
        <div className="animate-fade-slide-up">
          {hiding && (
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2 mb-3 truncate">
              {describeMessage(hiding)}
            </p>
          )}
          {/* SAYS WHAT IT ACTUALLY DOES: the message is not deleted, and the
              other person still has it. With nobody left to name, it says only
              that hiding is not deleting. */}
          <p className="text-sm text-charcoal-soft mb-1">
            This removes the message from your view of the conversation.
          </p>
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
        key={forwarding?.id ?? "none"}
        open={!!forwarding}
        onClose={() => setForwarding(null)}
        message={forwarding}
        currentThreadId={thread.id}
        senderId={authUserId}
      />
    </div>
  );
};
