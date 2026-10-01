import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { signedUrlFor } from "../../services/storage";
import { mayOpenAttachment } from "../../services/messaging";
import { AttachmentGone } from "./AttachmentGone";

/** mm:ss, because a voice note is read as a length before it is played. */
function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Bars drawn in the bubble, whatever resolution the waveform was stored at. */
const BARS = 28;
const SPEEDS = [1, 1.5, 2] as const;

/**
 * The stored levels (0..100, Database 20261002030000) resampled to BARS by
 * taking each span's peak, so a short loud word is not averaged away. A note
 * with no stored waveform (sent before it was recorded, or from a browser that
 * could not decode its own recording) gets a flat line rather than invented
 * shape.
 */
function barsFor(levels: number[] | null): number[] {
  if (!levels || levels.length === 0) return Array(BARS).fill(12);
  return Array.from({ length: BARS }, (_, i) => {
    const a = Math.floor((i * levels.length) / BARS);
    const b = Math.max(a + 1, Math.floor(((i + 1) * levels.length) / BARS));
    return Math.max(...levels.slice(a, b));
  });
}

/**
 * A voice note in a message bubble (phase 2A, screen 2): play, waveform that
 * fills as it plays, duration, and a 1× / 1.5× / 2× speed toggle.
 *
 * SIGNS ON THE FIRST PLAY, NOT AT RENDER. `signedUrlFor` caps its TTL at ten
 * minutes and the thread re-renders on every poll, so an `<audio src>` minted
 * at render would spend a signing round trip per note per refresh. The
 * duration and waveform come from the row, so the whole control is drawn
 * before anything is fetched.
 *
 * PLAYBACK IS FORMAT-AGNOSTIC: Storage serves the object with the content type
 * it was uploaded under (AAC-in-MP4 where available, WebM/Opus on Firefox).
 *
 * The speed is kept while the bubble is mounted and applied to whatever plays
 * next, so choosing 1.5× before pressing play works.
 */
export const VoiceNoteBubble: React.FC<{
  path: string;
  seconds: number | null;
  /** Tints the control for the sender's own side of the thread. */
  mine: boolean;
  waveform?: number[] | null;
}> = ({ path, seconds, mine, waveform }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // The file's own length once loaded, for older rows without a stored one.
  const [loadedLength, setLoadedLength] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  const total = seconds ?? loadedLength ?? 0;

  const ensureAudio = async (): Promise<HTMLAudioElement | null> => {
    if (audio.current) return audio.current;
    setLoading(true);
    setFailed(false);
    const result = await signedUrlFor("message-attachments", path);
    if (!result.ok || !result.url) {
      setLoading(false);
      // Refused, or just failed? Only the storage rule can say.
      if ((await mayOpenAttachment(path)) === false) setGone(true);
      else setFailed(true);
      return null;
    }
    const el = new Audio(result.url);
    el.playbackRate = speed;
    el.addEventListener("timeupdate", () => setPosition(el.currentTime));
    el.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(el.duration)) setLoadedLength(el.duration);
    });
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    el.addEventListener("ended", () => {
      setPlaying(false);
      setPosition(0);
    });
    el.addEventListener("error", () => {
      setPlaying(false);
      setFailed(true);
    });
    audio.current = el;
    setLoading(false);
    return el;
  };

  const toggle = async () => {
    const el = await ensureAudio();
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch {
        setFailed(true);
      }
    } else {
      el.pause();
    }
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  /** Tapping the waveform jumps there, once the note has been loaded. */
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !total) return;
    const box = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    el.currentTime = f * total;
    setPosition(el.currentTime);
  };

  if (gone) return <AttachmentGone kind="voice" />;

  const bars = barsFor(waveform ?? null);
  const played = total ? position / total : 0;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={loading}
          aria-label={
            playing ? "Pause voice note" : seconds ? `Play voice note, ${formatDuration(seconds)}` : "Play voice note"
          }
          className={`tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            mine ? "bg-white/25 text-white dark:bg-black/15 dark:text-[#0D0B1A]" : "bg-primary text-white dark:text-[#0D0B1A]"
          }`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : playing ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <Play size={14} className="fill-current ml-0.5" />
          )}
        </button>
        <div
          onClick={seek}
          aria-hidden
          className="flex-1 flex items-center gap-[2px] h-7 min-w-0 overflow-hidden cursor-pointer"
        >
          {bars.map((level, i) => (
            <span
              key={i}
              className={`w-[3px] min-w-[1.5px] rounded-[2px] shrink ${
                (i + 0.5) / BARS <= played
                  ? mine
                    ? "bg-white dark:bg-[#0D0B1A]"
                    : "bg-primary"
                  : mine
                    ? "bg-white/40 dark:bg-black/25"
                    : "bg-primary/35"
              }`}
              style={{ height: Math.max(4, Math.round((level / 100) * 24)) }}
            />
          ))}
        </div>
        <span className={`text-xs tabular-nums shrink-0 ${mine ? "opacity-90" : "text-charcoal-soft"}`}>
          {/* A null duration is possible on older rows, so it says nothing
              rather than printing 0:00, a measurement nobody took. */}
          {playing || position > 0 ? formatDuration(position) : seconds ? formatDuration(seconds) : ""}
        </span>
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}×`}
          className={`tap h-[26px] rounded-full px-2 text-[11px] font-extrabold shrink-0 ${
            mine ? "bg-white/20 text-white dark:bg-black/15 dark:text-[#0D0B1A]" : "bg-primary-pale text-primary-deep-text"
          }`}
        >
          {speed}×
        </button>
      </div>
      {failed && <p className="text-[11px] opacity-80 mt-1">Couldn't play this voice note.</p>}
    </div>
  );
};
