import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Check, Mic, Minus, Plus, Sparkles, MicOff, Square, ShieldCheck, UtensilsCrossed, X } from "lucide-react";
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
  };

  // Covers every way this component can go away: the sheet closing, a route
  // change, a hot reload. Without it an unmounted recorder keeps the mic.
  useEffect(() => teardown, []);
  useEffect(() => {
    if (!open) teardown();
  }, [open]);

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
      // out immediately.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

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
   * Adjusts one item's quantity.
   *
   * Steps of one, floored at one. A parsed fraction is kept as it came -- "half
   * a cup" is a real thing to have said -- so decrementing at or below 1 does
   * nothing rather than rounding it away. toFixed(2) exists because 0.5 + 1 in
   * binary floating point is not always what it looks like.
   */
  const stepQuantity = (index: number, delta: number) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (delta < 0 && it.quantity <= 1) return it;
        return { ...it, quantity: Math.max(1, +(it.quantity + delta).toFixed(2)) };
      })
    );

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
    <BottomSheet open={open} onClose={handleClose} title="Tell Centium what you ate">
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
            <Button variant="outline" onClick={reset}>
              Back
            </Button>
          </>
        )}

        {stage === "recording" && (
          <>
            <div className="relative w-24 h-24 mb-6">
              <span className="absolute inset-0 rounded-full bg-teal/40 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-teal/40 animate-pulse-ring [animation-delay:0.4s]" />
              <div className="relative w-24 h-24 rounded-full bg-teal flex items-center justify-center shadow-lift">
                <Mic size={32} className="text-white" />
              </div>
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
                          confirmed. The stepper below stops its own clicks, so
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stepQuantity(i, -1);
                          }}
                          disabled={item.quantity <= 1}
                          aria-label={`Less ${item.food?.name ?? item.spokenName}`}
                          className="tap w-7 h-7 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft disabled:opacity-40"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="text-sm font-bold text-charcoal tabular-nums min-w-[2ch] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stepQuantity(i, 1);
                          }}
                          aria-label={`More ${item.food?.name ?? item.spokenName}`}
                          className="tap w-7 h-7 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft"
                        >
                          <Plus size={13} />
                        </button>
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
