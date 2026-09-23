import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Check, Mic, Sparkles, MicOff, Square, ShieldCheck, UtensilsCrossed, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { logFoodEntry, manualFood } from "../../services/food";
import {
  AUDIO_BITS_PER_SECOND,
  MAX_RECORDING_SECONDS,
  pickRecordingMimeType,
  transcribeAndParse,
  type VoiceFoodItem,
} from "../../services/ai/voiceFood";
import { foodCategoryIcon } from "../../utils/icons";

// Voice logging, end to end: record, transcribe, parse, confirm, log.
//
// WHAT THIS REPLACED. Until now none of the middle existed. getUserMedia was
// called for the permission grant and the stream stopped immediately;
// "Listening…" was a 1800ms timer under a hardcoded sentence the user was shown
// as though it were their own words; and the parser was a canned response that
// ignored its input. Only the logging was real, which is the worst half to have
// working — it put four specific foods in the diary no matter what was said.
//
// THE REVIEW STEP IS NOT OPTIONAL. Nothing reaches the diary without the user
// seeing it and pressing Add; parse-voice-food cannot write even if it wanted
// to. The per-item editing controls are Phase C — this pass shows what was
// heard, marks what did not match, and keeps the confirm.

type Stage = "idle" | "requesting" | "denied" | "recording" | "processing" | "result";

/**
 * A parsed item plus the two things the user controls before anything is
 * logged: whether to keep it, and how much.
 *
 * SELECTION DEFAULTS TO WHETHER IT MATCHED, and that is the one judgement call
 * on this screen. A matched item has a catalog row behind it, so logging it
 * records real nutrition and ticking it by default saves a tap on the common
 * path. An unmatched one has no macros at all -- logging it would put
 * "0 kcal" beside a real meal and quietly under-count the day, which is worse
 * than not logging it. So it arrives off, stays visible, and says what will
 * happen if it is turned on. Neither silently vanishing nor silently lying.
 */
interface ReviewItem extends VoiceFoodItem {
  selected: boolean;
}

/** Everything that can come back other than items, shown on the idle screen. */
interface Notice {
  tone: "info" | "error";
  text: string;
}

// --- Recording-stage waveform -----------------------------------------
//
// Item 13: the old pulse rings were pure CSS decoration with no relation to
// what the mic was actually hearing. This replaces them with a live
// waveform driven by an AnalyserNode tapped off the same MediaStream the
// MediaRecorder already uses (in parallel, not instead of it). Drawn as one
// canvas pass per frame rather than N styled DOM bars, so a page with
// several of these mounted doesn't force a style recalc every frame.
const WAVE_BAR_PITCH = 6; // px between bar starts (bar width + gap)
const WAVE_BAR_WIDTH = 3;
const WAVE_STEP_MS = 60; // ms between new samples entering the buffer
const WAVE_FLOOR = 0.06; // silence still shows a low, visibly-alive row
// Newest -> oldest, a 3-step gradient across the buffer's age.
const WAVE_COLORS = ["#6F9993", "#83AAA4", "#A2C8C2"] as const;

/** RMS of a time-domain byte buffer, mapped to a 0..1 bar-height fraction. */
function amplitudeFromTimeDomain(data: Uint8Array<ArrayBuffer>): number {
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / data.length);
  return Math.max(WAVE_FLOOR, Math.min(1, Math.pow(rms * 3.4, 0.82)));
}

/**
 * Draws every bar in the rolling buffer in one pass. `scrollOffset` is a
 * sub-bar-pitch pixel amount (0..WAVE_BAR_PITCH) applied as a single
 * translate so the scroll reads as continuous motion instead of a bar
 * appearing in discrete jumps once per step.
 */
function renderWave(canvas: HTMLCanvasElement, buffer: number[], scrollOffset: number, dpr: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const midY = cssHeight / 2;
  // Clamped so a loud input can never draw past the canvas's own bounds.
  const maxBarHalf = Math.max(2, cssHeight / 2 - WAVE_BAR_WIDTH / 2 - 1);
  const n = buffer.length;

  ctx.save();
  ctx.translate(-scrollOffset, 0);
  ctx.lineCap = "round";
  ctx.lineWidth = WAVE_BAR_WIDTH;

  for (let i = 0; i < n; i++) {
    const ageFromNewest = n - 1 - i; // 0 = newest (rightmost)
    const x = cssWidth - ageFromNewest * WAVE_BAR_PITCH;
    if (x < -WAVE_BAR_PITCH || x > cssWidth + scrollOffset + WAVE_BAR_PITCH) continue;

    const half = Math.min(maxBarHalf, Math.max(1, buffer[i] * maxBarHalf));
    const ageFrac = ageFromNewest / Math.max(1, n - 1);
    ctx.strokeStyle = ageFrac < 1 / 3 ? WAVE_COLORS[0] : ageFrac < 2 / 3 ? WAVE_COLORS[1] : WAVE_COLORS[2];
    ctx.beginPath();
    ctx.moveTo(x, midY - half);
    ctx.lineTo(x, midY + half);
    ctx.stroke();
  }
  ctx.restore();
}

export const AIVoiceLogger: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const {
    addFoodEntryRecord,
    authUserId,
    selectedDate,
    voiceDisclosureSeen,
    setVoiceDisclosureSeen,
  } = useApp();

  const [stage, setStage] = useState<Stage>("idle");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Held across renders because stopping has to reach the same objects that
  // starting created, and neither belongs in render output.
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const capTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // The waveform: an AnalyserNode tapped off the same stream as the
  // MediaRecorder above, running in parallel with it, plus everything the
  // canvas render loop needs across frames without triggering re-renders.
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const waveTimeDomainRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveRafRef = useRef<number | null>(null);
  const waveBufferRef = useRef<number[]>([]);
  const waveModeRef = useRef<"live" | "synthetic">("live");
  const waveScrollRef = useRef(0);
  const waveLastFrameTimeRef = useRef<number | null>(null);
  const waveSyntheticPhaseRef = useRef(0);

  /**
   * Tries to tap an AnalyserNode off the recording stream, in parallel with
   * the MediaRecorder already reading it -- this only listens, it never
   * touches the stream's tracks, so it can't interfere with the recording
   * itself. Returns false (never throws) on anything that means there is no
   * live level to show: unsupported API, an insecure context, or the
   * AudioContext refusing to construct -- the caller falls back to a
   * synthetic wave in that case.
   */
  const setupAnalyser = (stream: MediaStream): boolean => {
    try {
      if (!window.isSecureContext) return false;
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;

      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      // Listen only -- never connected to ctx.destination, so this can't
      // introduce feedback or echo the user's own mic back to them.
      source.connect(analyser);
      void ctx.resume().catch(() => {});

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      analyserSourceRef.current = source;
      waveTimeDomainRef.current = new Uint8Array(analyser.fftSize);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Releases the analyser and its AudioContext. Lives next to `teardown`
   * below and is called from there plus from the recorder's own `onstop` --
   * one shared function, not a second cleanup path, so the stream and the
   * audio graph tapped off it are always released together.
   */
  const teardownWave = () => {
    if (waveRafRef.current !== null) { cancelAnimationFrame(waveRafRef.current); waveRafRef.current = null; }
    analyserSourceRef.current?.disconnect();
    analyserSourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {});
    }
    waveTimeDomainRef.current = null;
  };

  /**
   * Releases the microphone and every timer, whatever state we were in.
   *
   * THE STREAM IS THE PART THAT MATTERS. A live MediaStream keeps the browser's
   * recording indicator lit and the mic held open; leaving one behind after the
   * sheet closes is the kind of thing users notice and do not forgive.
   */
  const teardown = () => {
    if (capTimerRef.current !== null) { clearTimeout(capTimerRef.current); capTimerRef.current = null; }
    if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null; }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // onstop is cleared first: this is an abandonment, not a finished
      // recording, and the upload must not fire behind a closing sheet.
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already stopping */ }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    teardownWave();
  };

  // Covers every way this component can go away: the sheet closing, a route
  // change, a hot reload. Without it an unmounted recorder keeps the mic.
  useEffect(() => teardown, []);
  useEffect(() => {
    if (!open) teardown();
  }, [open]);

  // The waveform's own render loop. Scoped tightly to the recording stage
  // being on screen -- there can be more than one of these loggers mounted
  // at once, and a rAF loop that keeps running after the stage moves on
  // would stall the whole page, not just this sheet.
  useEffect(() => {
    if (stage !== "recording") return;
    const canvas = waveCanvasRef.current;
    const stream = streamRef.current;
    if (!canvas || !stream) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const amplitudeScale = reducedMotion ? 0.34 : 1;
    const stepMs = reducedMotion ? WAVE_STEP_MS * 1.7 : WAVE_STEP_MS;

    waveModeRef.current = setupAnalyser(stream) ? "live" : "synthetic";

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();

    const barCount = Math.max(8, Math.ceil(canvas.getBoundingClientRect().width / WAVE_BAR_PITCH) + 2);
    waveBufferRef.current = new Array(barCount).fill(WAVE_FLOOR * amplitudeScale);
    waveScrollRef.current = 0;
    waveLastFrameTimeRef.current = null;
    waveSyntheticPhaseRef.current = 0;

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const readAmplitude = (): number => {
      if (waveModeRef.current === "live" && analyserRef.current && waveTimeDomainRef.current) {
        analyserRef.current.getByteTimeDomainData(waveTimeDomainRef.current);
        return amplitudeFromTimeDomain(waveTimeDomainRef.current);
      }
      // Gentle synthetic wave: no live levels available (unsupported API,
      // insecure context, or the AudioContext failed to construct), but the
      // MediaRecorder above is still recording completely undisturbed.
      waveSyntheticPhaseRef.current += 0.12;
      const slow = (Math.sin(waveSyntheticPhaseRef.current) + 1) / 2;
      const wobble = (Math.sin(waveSyntheticPhaseRef.current * 2.7) + 1) / 2;
      return Math.max(WAVE_FLOOR, Math.min(1, WAVE_FLOOR + (0.3 + 0.15 * wobble) * slow));
    };

    const draw = (time: number) => {
      if (waveLastFrameTimeRef.current === null) waveLastFrameTimeRef.current = time;
      const dt = Math.min(250, time - waveLastFrameTimeRef.current);
      waveLastFrameTimeRef.current = time;

      waveScrollRef.current += (dt / stepMs) * WAVE_BAR_PITCH;
      while (waveScrollRef.current >= WAVE_BAR_PITCH) {
        waveScrollRef.current -= WAVE_BAR_PITCH;
        const buf = waveBufferRef.current;
        buf.shift();
        buf.push(readAmplitude() * amplitudeScale);
      }

      renderWave(canvas, waveBufferRef.current, waveScrollRef.current, dpr);
      waveRafRef.current = requestAnimationFrame(draw);
    };
    waveRafRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      teardownWave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const reset = () => {
    teardown();
    setStage("idle");
    setItems([]);
    setTranscript("");
    setAdded(false);
    setSaveError(null);
    setElapsed(0);
  };

  const handleClose = () => {
    reset();
    setNotice(null);
    onClose();
  };

  /** Uploads what was recorded and routes every outcome the function can send. */
  const finish = async (blob: Blob) => {
    setStage("processing");
    const outcome = await transcribeAndParse(blob);

    if (outcome.ok) {
      setTranscript(outcome.transcript);
      setItems(outcome.items.map((i) => ({ ...i, selected: i.food !== null })));
      setStage("result");
      return;
    }

    // Everything else lands back on idle with a reason, so the mic is one tap
    // away and the user is never left on a dead screen.
    setStage("idle");
    switch (outcome.kind) {
      case "no_speech":
        setNotice({ tone: "info", text: "Didn't catch anything. Try again a bit closer to the mic." });
        break;
      case "no_items":
        setNotice({
          tone: "info",
          text: outcome.transcript
            ? `Heard "${outcome.transcript}" — but no food in it. Try again, or add it manually.`
            : "No food in that one. Try again, or add it manually.",
        });
        break;
      case "rate_limited":
        setNotice({
          tone: "error",
          text: outcome.retryAfterSeconds
            ? `Voice logging is busy. Try again in about ${outcome.retryAfterSeconds}s, or add the food manually.`
            : outcome.message,
        });
        break;
      default:
        setNotice({ tone: "error", text: outcome.message });
    }
  };

  /** Ends the recording. The upload happens in onstop, once chunks are flushed. */
  const stopRecording = () => {
    if (capTimerRef.current !== null) { clearTimeout(capTimerRef.current); capTimerRef.current = null; }
    if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null; }
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  };

  const beginRecording = (stream: MediaStream) => {
    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      setStage("idle");
      setNotice({ tone: "error", text: "This browser can't record audio. Add the food manually for now." });
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      // The mic is released the moment recording ends, not when the upload
      // finishes: there is nothing left to capture and the indicator should go
      // out immediately. The analyser/AudioContext tapped off the same stream
      // are released right here too -- this also stops the wave's rAF loop,
      // which is what makes it "freeze" on its last frame: the canvas node
      // itself isn't removed until the stage change below unmounts it.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      teardownWave();

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setStage("idle");
        setNotice({ tone: "error", text: "That recording didn't capture any audio. Try again." });
        return;
      }
      void finish(blob);
    };

    setElapsed(0);
    setStage("recording");
    recorder.start();

    tickRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    // THE CAP IS ENFORCED HERE, where the clock is. The function also refuses
    // oversized audio, but only after it has been uploaded — on a phone that is
    // the user's data spent to be told no.
    capTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1000);
  };

  const requestMicAndStart = async () => {
    setNotice(null);
    setStage("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // KEPT OPEN, which is the whole difference from before. The old code
      // stopped every track here and recorded nothing.
      streamRef.current = stream;
      beginRecording(stream);
    } catch {
      setStage("denied");
    }
  };

  // Keyed by index, not name: the same food can legitimately appear twice --
   // "a coffee now and another coffee later" -- and keying by name would tie
   // the two rows together so toggling one toggled both.
  const toggleItem = (index: number) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, selected: !it.selected } : it)));

  /**
   * Types one item's quantity (mobile handoff item 1: typed, never stepped).
   *
   * The draft holds the raw text while the field is being edited, so an empty
   * or half-typed value ("", "0.") doesn't overwrite the quantity; only a
   * positive number is committed. A parsed fraction is kept as it came --
   * "half a cup" is a real thing to have said. Blur drops the draft and the
   * field shows the committed quantity again.
   */
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const typeQuantity = (index: number, raw: string) => {
    const v = raw.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");
    setQuantityDrafts((prev) => ({ ...prev, [index]: v }));
    const n = Number(v);
    if (v && !Number.isNaN(n) && n > 0) {
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: n } : it)));
    }
  };
  const commitQuantity = (index: number) =>
    setQuantityDrafts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

  /**
   * Logs the matched items.
   *
   * An unmatched item still logs, as a manual entry with no provenance — the
   * user said they ate it, and the catalog not knowing the name is not a reason
   * to drop it. Its macros are unknown, which is exactly what Phase C's editing
   * step exists to let them fix.
   */
  const handleAddAll = async () => {
    const chosen = items.filter((i) => i.selected);
    if (!authUserId || saving || chosen.length === 0) return;
    setSaving(true);
    setSaveError(null);

    let failed = 0;
    for (const item of chosen) {
      const food =
        item.food ??
        manualFood({
          id: item.spokenName,
          name: item.spokenName,
          category: "homemade",
          serving: item.unit ?? "1 serving",
          calories: 0, protein: 0, carbs: 0, fat: 0,
        });

      const written = await logFoodEntry({
        userId: authUserId,
        food,
        quantity: item.quantity,
        unit: "serving",
        meal: "lunch",
        date: selectedDate,
        loggedVia: "ai",
      });
      if (written.ok && written.entry) addFoodEntryRecord(written.entry);
      else failed += 1;
    }

    setSaving(false);
    if (failed > 0) {
      setSaveError(
        failed === chosen.length
          ? "Couldn't save those items. Please try again."
          : `Saved, but ${failed} item${failed === 1 ? "" : "s"} couldn't be added.`
      );
      if (failed === chosen.length) return;
    }
    setAdded(true);
    setTimeout(handleClose, 900);
  };

  const remaining = Math.max(0, MAX_RECORDING_SECONDS - elapsed);
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Tell Centium what you ate"
      // Mobile handoff item 1: the mic-denied screen's old in-content "Back"
      // button becomes the header chevron, back to the idle mic prompt.
      onBack={stage === "denied" ? reset : undefined}
    >
      <div className="min-h-[280px] flex flex-col items-center justify-center text-center py-4">
        {stage === "idle" && (
          <>
            {/* SAID ONCE, BEFORE THE FIRST RECORDING. The mic prompt asks to
                listen; it does not say the audio leaves for another company,
                and that is the part worth knowing in advance. Dismissible
                rather than blocking — the same shape as the recovery-sensitive
                intro on Home. */}
            {!voiceDisclosureSeen && (
              <div className="w-full flex items-start gap-3 bg-teal-pale rounded-2xl px-4 py-3.5 mb-5 text-left animate-fade-slide-up">
                <ShieldCheck size={17} className="text-charcoal-soft dark:text-teal-deep-text shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-charcoal-soft dark:text-teal-deep-text mb-0.5">
                    Your recording is sent for transcription
                  </p>
                  <p className="text-xs text-charcoal-soft leading-relaxed">
                    Centium sends voice recordings to Groq, a third-party service, to turn them into
                    text and find the foods. Nothing is logged until you confirm it.
                  </p>
                </div>
                <button
                  onClick={() => setVoiceDisclosureSeen(true)}
                  aria-label="Dismiss"
                  className="tap text-charcoal-faint shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {notice && (
              <p
                className={`w-full text-xs rounded-xl px-3.5 py-2.5 mb-5 ${
                  notice.tone === "error"
                    ? "text-status-high bg-status-high-bg"
                    : "text-charcoal-soft bg-cream-soft"
                }`}
              >
                {notice.text}
              </p>
            )}

            <button
              onClick={() => void requestMicAndStart()}
              className="tap relative w-24 h-24 rounded-full bg-teal flex items-center justify-center shadow-lift mb-6"
            >
              <Mic size={32} className="text-white" />
            </button>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">What did you eat?</p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Tap the mic and describe your meal naturally — Centium will find the foods for you to
              confirm.
            </p>
          </>
        )}

        {stage === "requesting" && (
          <>
            <div className="w-24 h-24 rounded-full bg-teal/20 flex items-center justify-center mb-6 animate-pulse">
              <Mic size={32} className="text-teal" />
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Requesting microphone access…
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Centium needs your mic to hear what you ate.
            </p>
          </>
        )}

        {stage === "denied" && (
          <>
            <div className="w-24 h-24 rounded-full bg-charcoal/10 flex items-center justify-center mb-6">
              <MicOff size={32} className="text-charcoal-faint" />
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Microphone access denied
            </p>
            {/* The "Try a sample instead" button that used to sit here replayed
                the canned response. With real transcription it would be the one
                remaining way to put four foods nobody mentioned into a diary. */}
            <p className="text-sm text-charcoal-soft max-w-xs mb-6">
              Enable microphone access in your browser or device settings to use voice logging. You
              can still add foods manually from the search tab.
            </p>
          </>
        )}

        {stage === "recording" && (
          <>
            <div className="relative w-24 h-24 mb-6">
              <div className="relative w-24 h-24 rounded-full bg-teal flex items-center justify-center shadow-lift">
                <Mic size={32} className="text-white" />
              </div>
            </div>
            {/* Item 13: a live waveform off the mic's actual input level,
                replacing the old decorative pulse rings. See the
                AnalyserNode setup/render loop above. */}
            <canvas ref={waveCanvasRef} className="w-full h-16 mb-6 block" aria-hidden="true" />
            <p className="font-display text-xl font-semibold text-charcoal mb-1">Listening…</p>
            <p className="text-sm text-charcoal-soft mb-6 tabular-nums">
              {elapsed}s · {remaining}s left
            </p>
            {/* THE CONTROL THE MOCK NEVER NEEDED. A fixed 1800ms timer ended
                the old "recording"; a real one ends when the speaker decides. */}
            <Button size="lg" onClick={stopRecording}>
              <Square size={14} /> Stop & process
            </Button>
          </>
        )}

        {stage === "processing" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center mb-6 animate-pop">
              <Sparkles size={26} className="text-primary animate-pulse" />
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Centium is processing…
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Transcribing what you said and matching it against the food database.
            </p>
          </>
        )}

        {stage === "result" && (
          <div className="w-full text-left animate-fade-slide-up">
            {/* WHAT WAS ACTUALLY HEARD, not a script. Shown because a wrong
                match usually has an obvious cause once you can see the words
                the transcriber produced. */}
            {transcript && (
              <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3.5 py-2.5 mb-4 italic">
                "{transcript}"
              </p>
            )}

            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              We found — select what to add
            </p>
            <div className="space-y-2 mb-4">
              {items.map((item, i) => {
                const Icon = item.food
                  ? foodCategoryIcon[item.food.category] ?? UtensilsCrossed
                  : UtensilsCrossed;
                return (
                  <div
                    key={`${item.spokenName}-${i}`}
                    className={`rounded-2xl px-4 py-3 border transition-colors ${
                      item.selected ? "bg-primary-pale border-primary" : "bg-cream-soft border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* The row toggles, the way a scanned blood panel is
                          confirmed. The quantity field below stops its own clicks, so
                          changing an amount is not also a deselect. */}
                      <button
                        onClick={() => toggleItem(i)}
                        className="tap flex items-center gap-3 min-w-0 flex-1 text-left"
                        aria-pressed={item.selected}
                      >
                        <span className="w-8 h-8 rounded-lg bg-cream-card flex items-center justify-center shrink-0">
                          <Icon size={15} className="text-primary-dark" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-charcoal truncate">
                            {item.food?.name ?? item.spokenName}
                          </p>
                          {/* WHAT WAS HEARD, when it differs from what matched.
                              A wrong match is usually obvious the moment the
                              spoken words sit next to it. */}
                          {item.food &&
                            item.food.name.toLowerCase() !== item.spokenName.toLowerCase() && (
                              <p className="text-[11px] text-charcoal-faint truncate">
                                heard “{item.spokenName}”
                              </p>
                            )}
                          {/* NEITHER DROPPED NOR PRETENDED OTHERWISE. An
                              unmatched name has no macros behind it, so the row
                              says what logging it would actually record. */}
                          {!item.food && (
                            <p className="text-[11px] text-charcoal-faint">
                              {item.selected
                                ? "Not in the food database — logs with no nutrition"
                                : "Not in the food database"}
                            </p>
                          )}
                        </div>
                      </button>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
                          item.selected ? "bg-primary border-primary" : "border-charcoal/20"
                        }`}
                      >
                        {item.selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* EDITING, WHICH IS WHAT "EDIT" NOW MEANS HERE. The button
                        that used to carry that name threw the recording away
                        and started over; that action still exists below, under
                        a name that says so. */}
                    <div className="flex items-center justify-between gap-3 mt-2.5 pl-11">
                      <span className="text-[11px] text-charcoal-faint">
                        {item.unit ? `per ${item.unit}` : "servings"}
                      </span>
                      <div
                        className="shrink-0"
                        style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}
                      >
                        <input
                          value={quantityDrafts[i] ?? String(item.quantity)}
                          onChange={(e) => typeQuantity(i, e.target.value)}
                          onBlur={() => commitQuantity(i)}
                          onClick={(e) => e.stopPropagation()}
                          inputMode="decimal"
                          aria-label={`${item.food?.name ?? item.spokenName} quantity`}
                          className="w-14 text-center tabular-nums focus:outline-none"
                          style={{ background: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, color: "#241F1B" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {saveError && (
              <p className="text-xs font-semibold text-status-high text-center mb-3">{saveError}</p>
            )}

            <div className="flex gap-2.5">
              {/* Deliberately distinct from editing. This throws the recording
                  away and listens again, which is a different intent from
                  changing an amount on something already heard — and it used to
                  be the ONLY thing the button called "Edit" did. */}
              <Button variant="outline" size="md" className="!px-4" onClick={reset}>
                <Mic size={14} /> Record again
              </Button>
              <Button
                fullWidth
                size="md"
                onClick={() => void handleAddAll()}
                disabled={added || saving || selectedCount === 0}
              >
                {added
                  ? "Added ✓"
                  : saving
                    ? "Saving…"
                    : selectedCount === 0
                      ? "Select something to add"
                      : `Add ${selectedCount} to diary`}
              </Button>
            </div>
            <p className="text-[11px] text-charcoal-faint mt-4 text-center">
              AI-identified from your description — review before adding. Estimates, not
              medical-grade data.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
