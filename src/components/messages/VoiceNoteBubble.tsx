import { useState } from "react";
import { Loader2, Mic, Play } from "lucide-react";
import { signedUrlFor } from "../../services/storage";

/** mm:ss, because a voice note is read as a length before it is played. */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A voice note in a message bubble.
 *
 * SIGNS ON TAP, NOT AT RENDER, for the same reason the image tile does.
 * `signedUrlFor` caps its TTL at ten minutes, and the thread re-renders every
 * eight seconds while open — so an `<audio src>` minted at render would spend
 * a signing round trip per note per poll, and still go stale in a conversation
 * left open. The duration is known from the row, so the control can be fully
 * labelled before anything is fetched.
 *
 * PLAYBACK IS FORMAT-AGNOSTIC. Storage serves the object with the content type
 * it was uploaded under, so `<audio>` selects a decoder from the response
 * header rather than from the path — the element never sees the extension.
 * That matters because what gets recorded varies by engine: AAC-in-MP4 where
 * it is available, WebM/Opus on Firefox.
 *
 * NATIVE CONTROLS, DELIBERATELY. No waveform and no custom scrubber: those
 * need decoded audio and a lot of surface for a first pass, and the native
 * element already gives keyboard access, seeking and platform-correct
 * behaviour for free.
 */
export const VoiceNoteBubble: React.FC<{
  path: string;
  seconds: number | null;
  /** Tints the control for the sender's own side of the thread. */
  mine: boolean;
}> = ({ path, seconds, mine }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    if (url || loading) return;
    setLoading(true);
    setFailed(false);
    const result = await signedUrlFor("message-attachments", path);
    setLoading(false);
    if (!result.ok || !result.url) {
      setFailed(true);
      return;
    }
    setUrl(result.url);
  };

  if (url) {
    return (
      // autoPlay because the click that produced this WAS the play instruction;
      // making someone press play twice for the same intent reads as a bug.
      <audio src={url} controls autoPlay className={mine ? "max-w-full" : "max-w-full"} />
    );
  }

  return (
    <div>
      <button
        onClick={() => void load()}
        disabled={loading}
        aria-label={seconds ? `Play voice note, ${formatDuration(seconds)}` : "Play voice note"}
        className={`tap flex items-center gap-2 rounded-xl px-3 py-2 text-left ${
          mine ? "bg-black/10" : "bg-charcoal/[0.06]"
        }`}
      >
        {loading ? <Loader2 size={15} className="shrink-0 animate-spin" /> : <Play size={15} className="shrink-0" />}
        <Mic size={13} className="shrink-0 opacity-70" />
        <span className="text-[12.5px] font-semibold tabular-nums">
          {/* A null duration is possible — the column is nullable and an older
              row may predate this feature — so it says "Voice note" rather
              than printing 0:00, which would be a measurement nobody took. */}
          {seconds ? formatDuration(seconds) : "Voice note"}
        </span>
      </button>
      {failed && (
        <p className="text-[11px] opacity-80 mt-1">Couldn't load this voice note.</p>
      )}
    </div>
  );
};
