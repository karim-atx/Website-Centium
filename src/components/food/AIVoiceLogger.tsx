import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Mic, Sparkles, Pencil, MicOff } from "lucide-react";
import { parseFoodInput, type ParsedFoodResult } from "../../services/ai/parseFoodInput";
import { useApp } from "../../context/AppContext";

type Stage = "idle" | "requesting" | "denied" | "recording" | "processing" | "result";

export const AIVoiceLogger: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ParsedFoodResult | null>(null);
  const { addFoodEntry } = useApp();
  const [added, setAdded] = useState(false);

  const reset = () => {
    setStage("idle");
    setResult(null);
    setAdded(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const beginRecording = () => {
    setStage("recording");
    // Simulate a short recording window, then move to AI processing.
    setTimeout(() => setStage("processing"), 1800);
  };

  const requestMicAndStart = async () => {
    setStage("requesting");
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We don't process real audio in this prototype — just needed the
        // permission grant. Release the mic immediately.
        stream.getTracks().forEach((t) => t.stop());
      }
      beginRecording();
    } catch {
      setStage("denied");
    }
  };

  React.useEffect(() => {
    if (stage === "processing") {
      parseFoodInput("").then((res) => {
        setResult(res);
        setStage("result");
      });
    }
  }, [stage]);

  const handleAddAll = () => {
    if (!result) return;
    result.items.forEach((item) => {
      addFoodEntry({
        foodId: item.food.id,
        food: item.food,
        quantity: item.food.name === "Toum" ? item.quantity : 1,
        meal: "lunch",
        loggedVia: "ai",
      });
    });
    setAdded(true);
    setTimeout(handleClose, 900);
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Tell Sohati what you ate">
      <div className="min-h-[280px] flex flex-col items-center justify-center text-center py-4">
        {stage === "idle" && (
          <>
            <button
              onClick={requestMicAndStart}
              className="tap relative w-24 h-24 rounded-full bg-ember flex items-center justify-center shadow-lift mb-6"
            >
              <Mic size={32} className="text-white" />
            </button>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              What did you eat?
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Tap the mic and describe your meal naturally — Sohati's AI will find the foods and estimate the nutrition for you to confirm.
            </p>
          </>
        )}

        {stage === "requesting" && (
          <>
            <div className="w-24 h-24 rounded-full bg-ember/20 flex items-center justify-center mb-6 animate-pulse">
              <Mic size={32} className="text-ember" />
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Requesting microphone access…
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Sohati needs your mic to hear what you ate.
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
            <p className="text-sm text-charcoal-soft max-w-xs mb-6">
              Enable microphone access in your browser/device settings to use voice logging. You
              can still see how it works with a sample below.
            </p>
            <Button onClick={beginRecording}>Try a sample instead</Button>
          </>
        )}

        {stage === "recording" && (
          <>
            <div className="relative w-24 h-24 mb-6">
              <span className="absolute inset-0 rounded-full bg-ember/40 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-ember/40 animate-pulse-ring [animation-delay:0.4s]" />
              <div className="relative w-24 h-24 rounded-full bg-ember flex items-center justify-center shadow-lift">
                <Mic size={32} className="text-white" />
              </div>
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">Listening…</p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              "I had a chicken shawarma with extra toum, some fries and a Diet Pepsi."
            </p>
          </>
        )}

        {stage === "processing" && (
          <>
            <div className="w-16 h-16 rounded-full bg-sohati-pale flex items-center justify-center mb-6 animate-pop">
              <Sparkles size={26} className="text-sohati animate-pulse" />
            </div>
            <p className="font-display text-xl font-semibold text-charcoal mb-2">
              Sohati is processing…
            </p>
            <p className="text-sm text-charcoal-soft max-w-xs">
              Matching what you said against the Lebanese food database.
            </p>
          </>
        )}

        {stage === "result" && result && (
          <div className="w-full text-left animate-fade-slide-up">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              We found
            </p>
            <div className="space-y-2 mb-4">
              {result.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.food.emoji}</span>
                    <span className="text-sm font-semibold text-charcoal">{item.food.name}</span>
                  </div>
                  <span className="text-xs text-charcoal-soft">{item.quantityLabel}</span>
                </div>
              ))}
            </div>

            <div className="bg-sohati-pale rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-sohati-dark uppercase tracking-wide mb-2">
                Estimated nutrition
              </p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-bold text-sohati-dark">
                  {result.totals.calories.toLocaleString()}
                </span>
                <span className="text-sm text-sohati-dark/70">kcal</span>
              </div>
              <div className="flex gap-4 text-xs text-sohati-dark/80 font-medium">
                <span>Protein: {result.totals.protein}g</span>
                <span>Carbs: {result.totals.carbs}g</span>
                <span>Fat: {result.totals.fat}g</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Button variant="outline" size="md" className="!px-4" onClick={reset}>
                <Pencil size={14} /> Edit
              </Button>
              <Button fullWidth size="md" onClick={handleAddAll} disabled={added}>
                {added ? "Added ✓" : "Add to Diary"}
              </Button>
            </div>
            <p className="text-[11px] text-charcoal-faint mt-4 text-center">
              AI-identified from your description — review before adding. Prototype estimate, not medical-grade data.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
