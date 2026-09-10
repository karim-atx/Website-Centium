import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone capture for voice notes. No dependency — MediaRecorder is native.
 *
 * FORMAT IS NEGOTIATED, NOT ASSUMED, and the first entry is the whole point.
 * Asking for a bare "audio/mp4" in Chromium yields `audio/mp4;codecs=opus` —
 * an MP4 container holding Opus, which Safari cannot decode. Only the explicit
 * RFC 6381 string produces AAC, which every engine can play. Verified by
 * recording in each format and reading back `recorder.mimeType`, because the
 * documented advice ("prefer mp4") turned out to be wrong in exactly this way.
 *
 * The remaining gap, stated rather than hidden: Firefox supports neither MP4
 * entry and lands on WebM/Opus, which Safari cannot play. Closing that needs
 * transcoding. Preferring AAC narrows it to that one sender/recipient pairing.
 */
const MIME_PREFERENCE = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
];

/** Well clear of the bucket's 10 MB ceiling — roughly 907 KB/min measured. */
export const MAX_SECONDS = 180;
/** Below this a press reads as a mis-tap rather than a message. */
export const MIN_SECONDS = 1;

export type RecorderError =
  | { kind: "denied"; message: string }
  | { kind: "no-device"; message: string }
  | { kind: "unsupported"; message: string }
  | { kind: "failed"; message: string };

export interface VoiceCapture {
  file: File;
  seconds: number;
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_PREFERENCE.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/**
 * Turns a getUserMedia rejection into a sentence worth showing.
 *
 * The names are the spec's, and they mean genuinely different things: a denial
 * is a decision the user can revisit in settings, a missing device is not.
 * `AIVoiceLogger` collapses every failure into one "denied" screen, which
 * tells someone with no microphone to go and grant a permission that was never
 * the problem.
 */
function describeMediaError(err: unknown): RecorderError {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      kind: "denied",
      message: "Microphone access is blocked. Allow it in your browser settings to record.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { kind: "no-device", message: "No microphone found on this device." };
  }
  return { kind: "failed", message: "Couldn't start recording. Try again." };
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  // Set when a press is abandoned, so the stop handler knows to throw the
  // audio away instead of returning it.
  const discardRef = useRef(false);

  /**
   * Releases the microphone. Called on every exit — sent, cancelled, failed or
   * unmounted — because a live track leaves the browser's recording indicator
   * on, which is alarming and looks exactly like an app still listening.
   */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => releaseStream, [releaseStream]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (recorderRef.current) return false;

    const mimeType = pickMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "unsupported",
        message: "This browser can't record audio. Try a different one.",
      });
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(describeMediaError(err));
      return false;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    discardRef.current = false;

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start();
    setRecording(true);
    setSeconds(0);

    tickRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(elapsed);
      // Stopping itself rather than letting a forgotten press run to the
      // bucket limit and fail at the end of a long recording.
      if (elapsed >= MAX_SECONDS) recorderRef.current?.stop();
    }, 250);

    return true;
  }, []);

  /**
   * Ends the recording and hands back the audio, or null if there is nothing
   * worth sending.
   *
   * DURATION IS WALL-CLOCK, not read back from the blob. Container metadata
   * under-reports — a five-second capture measured 4.67s, because the AAC
   * encoder's priming samples are not counted — and `voice_note_seconds` is an
   * integer with a `> 0` CHECK, so it is clamped to at least one. Wall clock is
   * also the number the UI has been counting up in front of the user, and those
   * two disagreeing would be its own small lie.
   */
  const stop = useCallback(
    (options?: { discard?: boolean }): Promise<VoiceCapture | null> => {
      const recorder = recorderRef.current;
      if (!recorder) return Promise.resolve(null);
      if (options?.discard) discardRef.current = true;

      return new Promise((resolve) => {
        recorder.onstop = () => {
          const elapsedMs = Date.now() - startedAtRef.current;
          const mimeType = recorder.mimeType || "audio/webm";
          // BASE TYPE, codecs stripped. The bucket allowlist and the extension
          // map are both keyed on `audio/mp4`, never `audio/mp4;codecs=...`,
          // so keeping the parameter would fail validation and then name the
          // object `.bin`. The extension itself is derived from this by
          // uploadPrivateFile, which is what keeps it truthful to the bytes.
          const baseType = mimeType.split(";")[0];
          const blob = new Blob(chunksRef.current, { type: baseType });
          const seconds = Math.max(MIN_SECONDS, Math.round(elapsedMs / 1000));

          recorderRef.current = null;
          chunksRef.current = [];
          releaseStream();
          setRecording(false);
          setSeconds(0);

          const tooShort = elapsedMs < MIN_SECONDS * 1000;
          if (discardRef.current || tooShort || blob.size === 0) {
            resolve(null);
            return;
          }
          resolve({ file: new File([blob], `voice-note`, { type: baseType }), seconds });
        };
        recorder.stop();
      });
    },
    [releaseStream]
  );

  return { recording, seconds, error, setError, start, stop, supported: pickMimeType() !== null };
}
