import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Check, ChevronDown, Mic, Plus, Sparkles, MicOff, Square, ShieldCheck, UtensilsCrossed, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { logFoodEntry, manualFood, type FoodSearchResult } from "../../services/food";
import { getFoodNutrients } from "../../services/food-nutrients";
import {
  servingMultiplier,
  targetsFromGoal,
  mealForHour,
  mealOrder,
  mealLabels,
} from "../../services/nutrition";
import { NutrientDetailSections } from "./NutrientSections";
import { CustomFoodForm } from "./CustomFoodForm";
import { sheetChipStyle, sheetGreyStyle, sheetLabelStyle } from "../ui/sheetChip";
import {
  AUDIO_BITS_PER_SECOND,
  MAX_RECORDING_SECONDS,
  pickRecordingMimeType,
  transcribeAndParse,
  type VoiceFoodItem,
} from "../../services/ai/voiceFood";
import { foodCategoryIcon } from "../../utils/icons";
import type { MealType } from "../../types";

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
//
// Master handover, the "After · reference style" listening frame (p8b) and
// its Waveform component in CentiumFrame.dc.html — which differ from item
// 13's prose (64px, 4px bars, 58ms, 250ms hold) and are followed here: 53
// levels, one shifted in every 55ms; 3px bars 3px apart in a row 315px wide,
// centred in a 96px-tall box; max(3px, level x 96px) tall with round caps;
// coloured by recency i/(n-1): above 0.82 #6F9993, above 0.5 #83AAA4, else
// #A2C8C2. The last frame holds 450ms on stop.
const WAVE_BAR_WIDTH = 3;
const WAVE_BAR_GAP = 3;
const WAVE_BAR_PITCH = WAVE_BAR_WIDTH + WAVE_BAR_GAP; // px between bar starts
const WAVE_BUFFER_LENGTH = 53;
const WAVE_ROW_WIDTH = WAVE_BUFFER_LENGTH * WAVE_BAR_PITCH - WAVE_BAR_GAP;
const WAVE_STEP_MS = 55; // ms between new levels entering the buffer
const WAVE_HEIGHT = 96;
const WAVE_FLOOR = 0.055; // silence still shows a low, visibly-alive row
const WAVE_MIN_PAINT_WIDTH = 140; // narrower than this: pause and release audio
const WAVE_STOP_HOLD_MS = 450; // the last frame holds this long on stop
const waveColor = (i: number, n: number) => {
  const recency = i / (n - 1); // 0 = oldest (leftmost), 1 = newest
  return recency > 0.82 ? "#6F9993" : recency > 0.5 ? "#83AAA4" : "#A2C8C2";
};

/** The frame's seed row, so the wave is never an empty box before levels arrive. */
function seededLevel(i: number, level: number): number {
  const a = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9 + 1.3) * 0.28 + Math.sin(i * 0.31) * 0.22;
  const env = 0.62 + 0.38 * Math.sin(i * 0.11 + 0.6);
  return Math.max(WAVE_FLOOR, Math.min(1, Math.abs(a) * env * level));
}

/** The no-live-levels wave, `t` in seconds, `scale` 0.34 under reduced motion. */
function syntheticLevel(t: number, scale: number): number {
  const s = 0.5 * Math.sin(2.1 * t) + 0.3 * Math.sin(3.7 * t + 1.1) + 0.2 * Math.sin(0.9 * t);
  return Math.max(WAVE_FLOOR, Math.min(1, (0.34 + Math.abs(s) * 0.3) * scale));
}

/** RMS of a time-domain byte buffer, mapped to a 0..1 bar-height fraction. */
function amplitudeFromTimeDomain(data: Uint8Array<ArrayBuffer>, scale: number): number {
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / data.length);
  return Math.max(WAVE_FLOOR, Math.min(1, Math.pow(rms * 3.4, 0.82) * scale));
}

/**
 * One draw pass for the whole rolling buffer: bar i (0 = oldest) in slot i
 * of a canvas exactly WAVE_ROW_WIDTH wide, newest at the right. Bars are
 * centred on the midline and clamped to the 96px canvas. The continuous
 * scroll between steps is a single translateX on the canvas element (set by
 * the loop), never a style per bar.
 */
function renderWave(canvas: HTMLCanvasElement, buffer: number[], dpr: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, WAVE_ROW_WIDTH, WAVE_HEIGHT);

  const n = buffer.length;
  const midY = WAVE_HEIGHT / 2;
  for (let i = 0; i < n; i++) {
    const h = Math.min(WAVE_HEIGHT, Math.max(WAVE_BAR_WIDTH, buffer[i] * WAVE_HEIGHT));
    const x = i * WAVE_BAR_PITCH;
    ctx.fillStyle = waveColor(i, n);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, midY - h / 2, WAVE_BAR_WIDTH, h, WAVE_BAR_WIDTH / 2);
    else ctx.rect(x, midY - h / 2, WAVE_BAR_WIDTH, h);
    ctx.fill();
  }
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
    nutritionGoal,
  } = useApp();

  const [stage, setStage] = useState<Stage>("idle");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [transcript, setTranscript] = useState("");
  // Seeded from the clock when the review opens, then the user's to change.
  const [meal, setMeal] = useState<MealType>(() => mealForHour(new Date().getHours()));
  // Per-food nutrient maps, fetched ONCE for every matched catalog id on the
  // screen rather than per card. A four-item meal was four round trips when
  // each card asked for its own.
  const [nutrientsByFoodId, setNutrientsByFoodId] = useState<Record<string, Record<string, number>>>({});
  // Which card has "More nutrients" open, by index. One at a time: these are
  // long lists and several open at once turns the review into a scroll.
  const [expanded, setExpanded] = useState<number | null>(null);
  // The item whose food is being created, or null. Swaps this sheet's body
  // for the shared Create Custom Food form and comes back with a real food.
  const [creatingFor, setCreatingFor] = useState<number | null>(null);
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
  const waveWrapRef = useRef<HTMLDivElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Set when the recording stops: the last frame holds and nothing restarts
  // the loop (or re-taps audio) during the hold.
  const waveFrozenRef = useRef(false);
  const waveHoldTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const waveTimeDomainRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveRafRef = useRef<number | null>(null);
  const waveBufferRef = useRef<number[]>([]);
  const waveModeRef = useRef<"live" | "synthetic">("live");
  const waveScrollRef = useRef(0);
  const waveLastFrameTimeRef = useRef<number | null>(null);

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
    // A stop's 450ms hold must not fire an upload behind a closing sheet.
    if (waveHoldTimerRef.current !== null) { clearTimeout(waveHoldTimerRef.current); waveHoldTimerRef.current = null; }
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
    const wrap = waveWrapRef.current;
    const canvas = waveCanvasRef.current;
    if (!wrap || !canvas || !streamRef.current) return;

    // Reduced motion: lower (x0.34) and slower (1.7 x the step).
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const amplitudeScale = reducedMotion ? 0.34 : 1;
    const stepMs = reducedMotion ? WAVE_STEP_MS * 1.7 : WAVE_STEP_MS;

    // Backing store at min(2, devicePixelRatio). The canvas is exactly the
    // row's width, centred in the 96px box.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = `${WAVE_ROW_WIDTH}px`;
    canvas.style.height = `${WAVE_HEIGHT}px`;
    canvas.width = Math.round(WAVE_ROW_WIDTH * dpr);
    canvas.height = Math.round(WAVE_HEIGHT * dpr);

    waveFrozenRef.current = false;
    // Seeded and painted once up front, so the box shows a wave rather than
    // an empty row while the first levels arrive.
    waveBufferRef.current = Array.from({ length: WAVE_BUFFER_LENGTH }, (_, i) => seededLevel(i, 0.5));
    waveScrollRef.current = 0;
    renderWave(canvas, waveBufferRef.current, dpr);

    const readLevel = (): number => {
      if (waveModeRef.current === "live" && analyserRef.current && waveTimeDomainRef.current) {
        analyserRef.current.getByteTimeDomainData(waveTimeDomainRef.current);
        return amplitudeFromTimeDomain(waveTimeDomainRef.current, amplitudeScale);
      }
      // No live levels (no AudioContext, an insecure context, or the
      // analyser failed to construct): the MediaRecorder above is still
      // recording undisturbed, and the wave is never an empty component.
      return syntheticLevel(performance.now() / 1000, amplitudeScale);
    };

    const draw = (time: number) => {
      if (waveLastFrameTimeRef.current === null) waveLastFrameTimeRef.current = time;
      const dt = time - waveLastFrameTimeRef.current;

      // Each full step shifts one level in at the right and drops the oldest
      // off the left (at most 4 per frame, as the frame's own loop does);
      // between steps the whole row slides left by the fraction of a step
      // elapsed, so the motion is continuous.
      if (dt >= stepMs) {
        const steps = Math.min(4, Math.floor(dt / stepMs));
        const buf = waveBufferRef.current;
        for (let k = 0; k < steps; k++) {
          buf.shift();
          buf.push(readLevel());
        }
        waveLastFrameTimeRef.current = time - (dt % stepMs);
      }
      waveScrollRef.current = Math.min(1, (time - waveLastFrameTimeRef.current) / stepMs) * WAVE_BAR_PITCH;

      renderWave(canvas, waveBufferRef.current, dpr);
      canvas.style.transform = `translateX(${(-waveScrollRef.current).toFixed(2)}px)`;
      waveRafRef.current = requestAnimationFrame(draw);
    };

    // Paint only while on screen and at least 140px wide; otherwise pause
    // the loop and release the audio graph (the recording itself goes on).
    let onScreen = true;
    let wideEnough = wrap.getBoundingClientRect().width >= WAVE_MIN_PAINT_WIDTH;
    const running = () => waveRafRef.current !== null;
    const update = () => {
      const shouldPaint = onScreen && wideEnough && !waveFrozenRef.current;
      if (shouldPaint && !running()) {
        const stream = streamRef.current;
        if (!stream) return;
        if (!analyserRef.current) waveModeRef.current = setupAnalyser(stream) ? "live" : "synthetic";
        waveLastFrameTimeRef.current = null;
        waveRafRef.current = requestAnimationFrame(draw);
      } else if (!shouldPaint && running() && !waveFrozenRef.current) {
        teardownWave();
      }
    };
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      update();
    });
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      wideEnough = wrap.getBoundingClientRect().width >= WAVE_MIN_PAINT_WIDTH;
      update();
    });
    ro.observe(wrap);
    update();

    return () => {
      io.disconnect();
      ro.disconnect();
      teardownWave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /**
   * Per-nutrient data for every matched CATALOG food on the review, in ONE
   * request.
   *
   * getFoodNutrients takes a list precisely so this can be one round trip;
   * asking per card would be a request per item for a screen that renders
   * them all at once. Custom foods carry their own map inline (whatever the
   * user typed into Create Custom Food) and are not part of this fetch —
   * there is no food_nutrients row for them to have.
   */
  useEffect(() => {
    const ids = items
      .map((i) => i.food)
      .filter((f): f is FoodSearchResult => !!f && f.source === "catalog")
      .map((f) => f.id);
    if (ids.length === 0) return;
    let cancelled = false;
    void getFoodNutrients(ids).then((result) => {
      if (cancelled || !result.ok) return;
      setNutrientsByFoodId(result.byFoodId);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const reset = () => {
    teardown();
    setStage("idle");
    setItems([]);
    setTranscript("");
    setAdded(false);
    setSaveError(null);
    setElapsed(0);
    setNutrientsByFoodId({});
    setExpanded(null);
    setCreatingFor(null);
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
      // Seeded HERE rather than at mount: this sheet can sit open for a long
      // time, and the meal that matters is the one at the moment they spoke.
      setMeal(mealForHour(new Date().getHours()));
      setExpanded(null);
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
      waveFrozenRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      teardownWave();

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      // Master handover (p8b frame): the wave's last frame holds for 450ms, then
      // the sheet moves on as before. The mic and audio graph are already
      // released above, so the recording indicator is off during the hold.
      waveHoldTimerRef.current = window.setTimeout(() => {
        waveHoldTimerRef.current = null;
        if (blob.size === 0) {
          setStage("idle");
          setNotice({ tone: "error", text: "That recording didn't capture any audio. Try again." });
          return;
        }
        void finish(blob);
      }, WAVE_STOP_HOLD_MS);
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
   * Attaches a freshly-created food to the row it was created for.
   *
   * The row stops being "new food" and becomes an ordinary matched row —
   * ticked, priced in the preview, and counted by the Add button — which is
   * the whole point of offering Create food rather than a second logging
   * path with no nutrition behind it.
   */
  const attachCreatedFood = (index: number, food: FoodSearchResult) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, food, selected: true } : it)));
    setCreatingFor(null);
  };

  /**
   * Logs the selected items.
   *
   * An unmatched item still logs, as a manual entry with no provenance — the
   * user said they ate it, and the food list not knowing the name is not a
   * reason to drop it. That is the secondary path now: the row's primary
   * action is Create food, which gives it real macros instead.
   *
   * THE UNIT IS THE ONE THE PREVIEW USED. `item.unit` is null unless the
   * spoken word was something servingMultiplier can convert, and null means
   * servings — exactly what the card says it means. Passing the raw spoken
   * word would be a unit the type does not have and the arithmetic cannot
   * use.
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
          serving: item.spokenUnit ?? "1 serving",
          calories: 0, protein: 0, carbs: 0, fat: 0,
        });

      const written = await logFoodEntry({
        userId: authUserId,
        food,
        quantity: item.quantity,
        unit: item.unit ?? "serving",
        meal,
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
  const targets = targetsFromGoal(nutritionGoal);

  /**
   * What one matched row will actually log, at the quantity currently typed.
   *
   * THE SAME ARITHMETIC AS THE WRITE, deliberately: servingMultiplier is what
   * logFoodEntry calls on its way to food_log_entries, so a preview built any
   * other way would be a second definition of a serving and the two would
   * drift. Null for an unmatched row, which has no serving to scale.
   *
   * THE UNIT IS EITHER CONVERTIBLE OR IT IS SERVINGS, and the row says which.
   * "two cups of rice" scales by cups because servingMultiplier can do that;
   * "two plates of rice" cannot be converted by anything, so it logs as two
   * servings and the row states it rather than letting a plate quietly mean a
   * serving.
   */
  const previewFor = (item: ReviewItem) => {
    const food = item.food;
    if (!food) return null;
    const unit = item.unit ?? "serving";
    const multiplier = servingMultiplier(food.servingLabel, item.quantity, unit);
    const round = (n: number) => Math.round(n * multiplier);

    // Catalog foods carry their nutrients in food_nutrients, fetched in one
    // batch above; a custom food carries whatever was typed into Create Custom
    // Food inline. Absent in both cases means no data, never zero.
    const perServing =
      food.source === "catalog" ? nutrientsByFoodId[food.id] : food.nutrients ?? undefined;
    const nutrients = perServing
      ? Object.fromEntries(Object.entries(perServing).map(([key, amount]) => [key, amount * multiplier]))
      : null;

    const plural = item.quantity === 1 ? "" : "s";
    return {
      multiplier,
      calories: round(food.calories),
      protein: round(food.protein),
      carbs: round(food.carbs),
      fat: round(food.fat),
      nutrients,
      // Shown beside the serving label only when the spoken word was dropped.
      unitNote:
        item.spokenUnit && !item.unit
          ? `Logged as ${item.quantity} serving${plural} — “${item.spokenUnit}” is not a unit this can convert`
          : null,
      quantityLabel: item.unit && item.unit !== "serving" ? item.unit : `serving${plural}`,
    };
  };

  // CREATING A FOOD SWAPS THIS SHEET'S BODY rather than opening another one
  // over it. The review is already two sheets deep (Add Food -> this), and a
  // third would bury the list the user is halfway through confirming. Back
  // returns to that list with every other row untouched.
  if (creatingFor !== null) {
    const pending = items[creatingFor];
    return (
      <BottomSheet
        open={open}
        onClose={handleClose}
        title="Create food"
        onBack={() => setCreatingFor(null)}
      >
        <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3.5 py-2.5 mb-4">
          Heard “{pending?.spokenName}”. Fill in what it is and it joins this recording with
          its nutrition.
        </p>
        <CustomFoodForm
          initialName={pending?.spokenName}
          onSaved={(food) => attachCreatedFood(creatingFor, food)}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Tell Centium what you ate"
      // Mobile handoff item 1: the mic-denied screen's old in-content "Back"
      // button becomes the header chevron, back to the idle mic prompt. The
      // handover's frame (CentiumFrame sheetCanBack) shows it on the review
      // screen too, stepping back to idle the same way.
      onBack={stage === "denied" || stage === "result" ? reset : undefined}
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
            <div
              className="w-24 h-24 rounded-full bg-teal/20 flex items-center justify-center mb-6"
              style={{ animation: "fade-in 1.5s ease-in-out infinite alternate" }}
            >
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
            {/* A live waveform off the mic's actual input level, replacing
                the old pulse rings and mic circle (the handover's listening
                frame shows the wave alone). See the AnalyserNode setup/render
                loop above. Full content width, 96px tall, 18px above
                "Listening…"; the canvas inside is the row's exact width,
                centred, and slides left by a single translateX between steps. */}
            <div
              ref={waveWrapRef}
              className="w-full flex items-center justify-center overflow-hidden"
              style={{ height: 96, marginBottom: 18 }}
              aria-hidden="true"
            >
              <canvas ref={waveCanvasRef} className="block shrink-0" style={{ willChange: "transform" }} />
            </div>
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
              <Sparkles size={26} className="text-primary" />
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

            {/* WHERE THE MEAL IS DECIDED. It used to be decided nowhere: every
                voice item was logged to lunch whatever the clock said. Seeded
                from the hour and shown, so a breakfast recorded at 8am is
                already right and a shift worker can change it in one tap. */}
            <div style={{ ...sheetGreyStyle, marginBottom: 12 }}>
              <p style={sheetLabelStyle}>Meal</p>
              <div className="flex" style={{ gap: 6, marginTop: 9 }}>
                {mealOrder.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    aria-pressed={meal === m}
                    className="tap transition-colors"
                    style={{ ...sheetChipStyle(meal === m), flex: 1, minWidth: 0, padding: "8px 4px" }}
                  >
                    {mealLabels[m]}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              We found — select what to add
            </p>
            <div className="space-y-2 mb-4">
              {items.map((item, i) => {
                const Icon = item.food
                  ? foodCategoryIcon[item.food.category] ?? UtensilsCrossed
                  : UtensilsCrossed;
                const preview = previewFor(item);
                const isOpen = expanded === i;
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
                          {/* NAMED AS A NEW FOOD, not as a failure. The row has a
                              primary action now — Create food, below — so this
                              says what it is rather than what it lacks. */}
                          {!item.food && (
                            <p className="text-[11px] text-charcoal-faint">
                              New food: not in your food list yet
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

                    {/* THE NUMBERS THAT WILL BE LOGGED, not an approximation of
                        them. The multiplier is servingMultiplier's, the same
                        function logFoodEntry uses on its way to the database,
                        so this panel and the diary row cannot disagree. */}
                    {preview && (
                      <div className="mt-2.5 pl-11">
                        <p className="text-[11px] text-charcoal-faint mb-1.5">
                          {item.food!.servingLabel}
                          {preview.unitNote ? ` · ${preview.unitNote}` : ""}
                        </p>
                        <div
                          className="grid grid-cols-4"
                          style={{ ...sheetGreyStyle, padding: "9px 0", borderRadius: 12 }}
                        >
                          {[
                            { value: `${preview.calories}`, color: "#241F1B", caption: "kcal" },
                            { value: `${preview.protein}g`, color: "#7D6BB5", caption: "protein" },
                            { value: `${preview.carbs}g`, color: "#8175C2", caption: "carbs" },
                            { value: `${preview.fat}g`, color: "#4274D7", caption: "fat" },
                          ].map((cell, ci) => (
                            <div
                              key={cell.caption}
                              className="text-center"
                              style={ci > 0 ? { borderLeft: "1px solid #E2E3E7" } : undefined}
                            >
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: cell.color }}>
                                {cell.value}
                              </p>
                              <p style={{ margin: "1px 0 0", fontSize: 10, color: "#8C8378" }}>{cell.caption}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EDITING, WHICH IS WHAT "EDIT" NOW MEANS HERE. The button
                        that used to carry that name threw the recording away
                        and started over; that action still exists below, under
                        a name that says so. */}
                    <div className="flex items-center justify-between gap-3 mt-2.5 pl-11">
                      <span className="text-[11px] text-charcoal-faint">
                        {preview ? preview.quantityLabel : item.spokenUnit ? `per ${item.spokenUnit}` : "servings"}
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

                    {/* A NEW FOOD'S PRIMARY ACTION. Logging it with no nutrition
                        is still offered and still honest, but it is the lesser
                        of the two and now looks like it: creating the food once
                        fixes every future recording that names it. */}
                    {!item.food && (
                      <div className="mt-2.5 pl-11 flex items-center gap-3">
                        <Button size="sm" className="!px-3" onClick={() => setCreatingFor(i)}>
                          <Plus size={13} /> Create food
                        </Button>
                        <button
                          onClick={() => toggleItem(i)}
                          className="tap text-[11px] font-semibold text-charcoal-faint underline"
                        >
                          {item.selected ? "Don't log this" : "Log without nutrition"}
                        </button>
                      </div>
                    )}

                    {/* The same sourced nutrient set the Nutrient Summary and
                        Add Food's Advanced view read, scaled by the same
                        multiplier as the macros above. A key with no data is
                        rendered as "No data" by NutrientDetailSections, never
                        as a zero. */}
                    {preview && (
                      <div className="mt-2 pl-11">
                        <button
                          onClick={() => setExpanded(isOpen ? null : i)}
                          aria-expanded={isOpen}
                          className="tap flex items-center gap-1 text-[11px] font-semibold text-primary-dark"
                        >
                          <ChevronDown
                            size={13}
                            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
                          />
                          {isOpen ? "Hide nutrients" : "More nutrients"}
                        </button>
                        {isOpen && (
                          <div className="mt-2 animate-fade-slide-up">
                            {preview.nutrients ? (
                              <NutrientDetailSections
                                totals={preview.nutrients}
                                calorieTarget={targets.calories}
                                proteinTarget={targets.protein}
                                carbTarget={targets.carbs}
                                fatTarget={targets.fat}
                              />
                            ) : (
                              <p className="text-[11px] text-charcoal-faint">
                                No per-nutrient data for this food yet — the calories and macros
                                above are all there is.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
