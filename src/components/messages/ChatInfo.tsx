import { useEffect, useState } from "react";
import { BellOff, ChevronLeft, Pin, PinOff, Search } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { PERSON_ICON } from "../../utils/icons";
import { InlineImage } from "./InlineImage";
import { FileCard } from "./FileCard";
import { VoiceNoteBubble } from "./VoiceNoteBubble";
import { clockTime, listTime } from "./chatTime";
import { describeMessage, type MessageThread } from "../../services/messaging";
import {
  fetchGallery,
  fetchStarredMessages,
  isMuted,
  MUTE_CHOICES,
  mutePatch,
  NO_SETTINGS,
  saveThreadSettings,
  type GalleryItem,
  type GalleryKind,
  type MuteChoice,
  type StarredMessage,
  type ThreadSettings,
} from "../../services/messaging/chatFeatures";
import { fetchHideReadReceipts, setHideReadReceipts } from "../../services/preferences";
import { fetchSharesPresence, setSharesPresence } from "../../services/messaging/chatFeatures";
import { useThreadLive } from "../../context/threadLive";

type Tab = GalleryKind | "starred";

const TABS: { value: Tab; label: string }[] = [
  { value: "media", label: "Media" },
  { value: "files", label: "Files" },
  { value: "voice", label: "Voice" },
  { value: "starred", label: "Starred" },
];

/**
 * Chat info (phase 2A, screen 6), opened from the conversation header.
 *
 * MUTE, PIN AND ARCHIVE ARE THE READER'S OWN (thread_user_settings); nothing
 * changes for the other person. The gallery reads through messages_visible, so
 * what the reader hid is not in it.
 *
 * "Show when I'm online" and read receipts are account-wide: neither is a
 * per-chat setting in the database. The read receipts switch is the
 * account-wide one that Profile → Privacy already has, since receipts are not
 * set per chat.
 */
export const ChatInfo: React.FC<{
  thread: MessageThread;
  authUserId: string;
  settings: ThreadSettings | undefined;
  onSettingsChanged: () => void;
  onBack: () => void;
  /** Block/report live in the conversation; these open them. Null hides them. */
  safety: null | {
    iBlocked: boolean;
    onBlock: () => void;
    onUnblock: () => void;
    onReport: (() => void) | null;
  };
  onOpenPhoto: (path: string, url: string) => void;
  onOpenFile: (path: string) => void;
  onJumpTo: (messageId: string) => void;
  /** Opens search inside this chat. */
  onSearch: () => void;
}> = ({ thread, authUserId, settings, onSettingsChanged, onBack, safety, onOpenPhoto, onOpenFile, onJumpTo, onSearch }) => {
  const s = settings ?? NO_SETTINGS;
  const [tab, setTab] = useState<Tab>("media");
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [galleryMore, setGalleryMore] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [starred, setStarred] = useState<StarredMessage[] | null>(null);
  const [muteOpen, setMuteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<boolean | null>(null);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (tab === "starred") {
      void fetchStarredMessages().then((all) => {
        if (!cancelled) setStarred((all ?? []).filter((m) => m.threadId === thread.id));
      });
    } else {
      void fetchGallery(thread.id, tab).then((r) => {
        if (cancelled) return;
        setItems(r?.items ?? []);
        setGalleryMore(r?.hasMore ?? false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [tab, thread.id]);

  useEffect(() => {
    void fetchHideReadReceipts().then((r) => {
      if (r.status === "ok") setReceipts(!r.hideReadReceipts);
      else setReceiptsError(r.message);
    });
  }, []);

  // "SHOW WHEN I'M ONLINE": one setting for every chat, off by default, and
  // mutual -- the database shows nothing unless both people have it on. The
  // live channels are rejoined after a change, because the server decides at
  // join time.
  const live = useThreadLive();
  const [presence, setPresence] = useState<boolean | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  useEffect(() => {
    void fetchSharesPresence(authUserId).then(setPresence);
  }, [authUserId]);
  const togglePresence = async (on: boolean) => {
    const previous = presence;
    setPresence(on);
    setPresenceError(null);
    const r = await setSharesPresence(authUserId, on);
    if (!r.ok) {
      setPresence(previous);
      setPresenceError(r.message);
      return;
    }
    live.reconnect();
  };

  const moreGallery = async () => {
    const last = items?.[items.length - 1];
    if (!last || tab === "starred") return;
    setGalleryBusy(true);
    const r = await fetchGallery(thread.id, tab, last);
    setGalleryBusy(false);
    if (!r) return;
    setItems((prev) => [...(prev ?? []), ...r.items]);
    setGalleryMore(r.hasMore);
  };

  const save = async (patch: Parameters<typeof saveThreadSettings>[2]) => {
    setBusy(true);
    setError(null);
    const r = await saveThreadSettings(thread.id, authUserId, patch);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    onSettingsChanged();
    return true;
  };

  const chooseMute = async (choice: MuteChoice) => {
    if (await save(mutePatch(choice))) setMuteOpen(false);
  };

  const toggleReceipts = async (on: boolean) => {
    const previous = receipts;
    setReceipts(on);
    setReceiptsError(null);
    const r = await setHideReadReceipts(authUserId, !on);
    if (r.status === "ok") setReceipts(!r.hideReadReceipts);
    else {
      setReceipts(previous);
      setReceiptsError(r.message);
    }
  };

  const muted = isMuted(s);
  const muteLabel = s.mutedAlways
    ? "Muted"
    : s.mutedUntil && muted
      ? `Muted until ${listTime(s.mutedUntil) === clockTime(s.mutedUntil) ? clockTime(s.mutedUntil) : `${listTime(s.mutedUntil)} ${clockTime(s.mutedUntil)}`}`
      : "Mute";

  const tile =
    "tap min-h-[64px] rounded-[14px] border border-charcoal/10 bg-cream-card text-[12.5px] font-bold text-primary-deep-text flex flex-col items-center justify-center gap-1 px-2 disabled:opacity-50";
  const row = "tap w-full min-h-[52px] text-left text-sm font-semibold border-b border-charcoal/[0.06] last:border-b-0";

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tap w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-charcoal"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-charcoal">Chat info</h1>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <span className="w-[72px] h-[72px] rounded-full bg-primary-pale flex items-center justify-center overflow-hidden text-[26px] font-extrabold text-primary-deep-text">
          {thread.participantAvatarUrl ? (
            <img src={thread.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : thread.participantName ? (
            thread.participantName.trim().charAt(0).toUpperCase()
          ) : (
            <PERSON_ICON size={26} />
          )}
        </span>
        <p className="text-lg font-extrabold text-charcoal text-center">{thread.participantName}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onSearch} className={tile}>
          <Search size={16} aria-hidden />
          Search chat
        </button>
        <button type="button" disabled={busy} onClick={() => setMuteOpen(true)} className={tile}>
          <BellOff size={16} aria-hidden />
          {muteLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ pinned_at: s.pinnedAt ? null : new Date().toISOString() })}
          className={tile}
        >
          {s.pinnedAt ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
          {s.pinnedAt ? "Unpin chat" : "Pin chat"}
        </button>
      </div>

      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>}

      <section className="rounded-2xl bg-cream-card border border-charcoal/[0.08] p-3 flex flex-col gap-3">
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Shared in this chat">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => {
                if (t.value === tab) return;
                setItems(null);
                setStarred(null);
                setTab(t.value);
              }}
              className={`tap h-[34px] rounded-full px-3 text-[13px] ${
                tab === t.value
                  ? "bg-primary text-white dark:text-[#0D0B1A] font-bold"
                  : "border border-charcoal/10 bg-cream-card text-charcoal font-semibold"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "media" && items && items.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {items.map((it) => (
              <GalleryPhoto key={it.id} item={it} onOpen={(url) => onOpenPhoto(it.path, url)} />
            ))}
          </div>
        )}
        {tab === "files" && items && items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <FileCard
                key={it.id}
                name={it.name}
                bytes={it.bytes}
                mime={it.mime}
                time={listTime(it.createdAt)}
                onOpen={() => onOpenFile(it.path)}
              />
            ))}
          </div>
        )}
        {tab === "voice" && items && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((it) => (
              <div key={it.id} className="flex flex-col gap-1">
                <span className="text-[11px] text-charcoal-soft">{listTime(it.createdAt)}</span>
                <VoiceNoteBubble path={it.path} seconds={it.voiceNoteSeconds} mine={false} waveform={it.waveform} />
              </div>
            ))}
          </div>
        )}
        {tab === "starred" && starred && starred.length > 0 && (
          <div className="flex flex-col">
            {starred.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onJumpTo(m.id)}
                className="tap text-left py-2.5 border-b border-charcoal/[0.06] last:border-b-0"
              >
                <span className="block text-xs font-bold text-primary-deep-text">
                  {m.senderId === authUserId ? "You" : thread.participantName} · {listTime(m.createdAt)}
                </span>
                <span className="block text-[13px] text-charcoal line-clamp-2">
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
        )}
        {((tab === "starred" ? starred : items)?.length ?? -1) === 0 && (
          <p className="text-[13px] text-charcoal-faint text-center py-4">
            {tab === "media"
              ? "No photos yet."
              : tab === "files"
                ? "No files yet."
                : tab === "voice"
                  ? "No voice notes yet."
                  : "No starred messages in this chat."}
          </p>
        )}
        {tab !== "starred" && galleryMore && (
          <button
            type="button"
            onClick={() => void moreGallery()}
            disabled={galleryBusy}
            className="tap min-h-[44px] text-[13px] font-semibold text-primary-deep-text disabled:opacity-50"
          >
            {galleryBusy ? "Loading…" : "Show more"}
          </button>
        )}
        <p className="text-xs text-charcoal-soft">
          {tab === "media" ? "Photos are private to this chat." : tab === "starred" ? "Only you can see your stars." : "Files are private to this chat."}
        </p>
      </section>

      <section className="rounded-2xl bg-cream-card border border-charcoal/[0.08] px-3.5 py-1 flex flex-col">
        <div className="flex items-center justify-between gap-3 min-h-[56px] border-b border-charcoal/[0.06]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-charcoal">Show when I'm online</span>
            <span className="text-xs text-charcoal-soft">
              Off by default. If off, you won't see theirs either. Applies to all your chats.
            </span>
            {presenceError && <span className="text-[11.5px] text-status-high">{presenceError}</span>}
          </div>
          <Toggle
            checked={presence ?? false}
            disabled={presence === null}
            onChange={(v) => void togglePresence(v)}
            label="Show when I'm online"
          />
        </div>
        <div className="flex items-center justify-between gap-3 min-h-[56px] border-b border-charcoal/[0.06]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-charcoal">Read receipts</span>
            <span className="text-xs text-charcoal-soft">If off, you won't see theirs either. Applies to all your chats.</span>
            {receiptsError && <span className="text-[11.5px] text-status-high">{receiptsError}</span>}
          </div>
          <Toggle
            checked={receipts ?? true}
            disabled={receipts === null}
            onChange={(v) => void toggleReceipts(v)}
            label="Read receipts"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ archived_at: s.archivedAt ? null : new Date().toISOString() }).then((ok) => ok && !s.archivedAt && onBack())}
          className={`${row} text-charcoal`}
        >
          {s.archivedAt ? "Unarchive chat" : "Archive chat"}
        </button>
        {safety && (
          <button
            type="button"
            onClick={safety.iBlocked ? safety.onUnblock : safety.onBlock}
            className={`${row} text-status-high`}
          >
            {safety.iBlocked ? `Unblock ${thread.participantName}` : `Block ${thread.participantName}`}
          </button>
        )}
        {safety?.onReport && (
          <button type="button" onClick={safety.onReport} className={`${row} text-status-high`}>
            Report
          </button>
        )}
      </section>

      <BottomSheet open={muteOpen} onClose={() => setMuteOpen(false)} title="Mute notifications">
        <div className="flex flex-col animate-fade-slide-up">
          <p className="text-xs text-charcoal-soft mb-2">
            You won't be notified of new messages. {thread.participantName} isn't told.
          </p>
          {MUTE_CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={busy}
              onClick={() => void chooseMute(c.value)}
              className="tap w-full min-h-[48px] text-left text-sm font-semibold text-charcoal border-b border-charcoal/[0.06] disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
          {muted && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void chooseMute("off")}
              className="tap w-full min-h-[48px] text-left text-sm font-semibold text-primary-deep-text disabled:opacity-50"
            >
              Unmute
            </button>
          )}
          {error && <p className="text-xs text-status-high mt-2">{error}</p>}
        </div>
      </BottomSheet>
    </div>
  );
};

/** A square photo tile; InlineImage signs it as it nears the screen. */
const GalleryPhoto: React.FC<{ item: GalleryItem; onOpen: (url: string) => void }> = ({ item, onOpen }) => (
  <div className="aspect-square rounded-lg overflow-hidden bg-primary-pale [&>button]:!w-full [&>button]:!h-full [&>button]:!aspect-auto [&>button]:!rounded-none">
    <InlineImage path={item.path} width={item.width} height={item.height} onOpen={onOpen} />
  </div>
);
