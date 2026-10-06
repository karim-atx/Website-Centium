import React, { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { canUseBarcodeScanner, createFrameReader } from "../../services/barcode/scanner";
import { normalizeGtin } from "../../utils/gtin";
import { useIsDark } from "../../hooks/useIsDark";
import { FOOD_DARK } from "./foodDark";
import { textPx } from "../../theme/textSize";

type CameraState = "starting" | "scanning" | "denied" | "unavailable";

const READ_EVERY_MS = 250;

/**
 * The camera barcode scanner (FO3.2, reused by HO2.1's Barcode button): the
 * back camera in a framed viewport, read by BarcodeDetector or the ZXing WASM
 * fallback, with the typed field kept underneath for a code the camera can't
 * read or a browser that has no camera. Hands back a normalised 13-digit GTIN;
 * what that code IS (catalogue, Open Food Facts, nothing) is the caller's
 * business — see services/barcode/lookup.
 */
export const BarcodeScanner: React.FC<{
  open: boolean;
  onClose: () => void;
  onCode: (gtin: string) => void;
  title?: string;
}> = ({ open, onClose, onCode, title = "Scan barcode" }) => {
  const dark = useIsDark();
  const video = useRef<HTMLVideoElement | null>(null);
  const [camera, setCamera] = useState<CameraState>(() => (canUseBarcodeScanner() ? "starting" : "unavailable"));
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);
  const done = useRef(false);
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!open || !canUseBarcodeScanner()) return;
    done.current = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (!cancelled) setCamera((err as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
        return;
      }
      if (cancelled || !video.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);
      const reader = await createFrameReader().catch(() => null);
      if (cancelled) return;
      if (!reader) {
        setCamera("unavailable");
        return;
      }
      setCamera("scanning");
      const tick = async () => {
        if (cancelled || done.current || !video.current) return;
        const raw = await reader.read(video.current).catch(() => null);
        const gtin = raw ? normalizeGtin(raw) : null;
        if (gtin && !done.current) {
          done.current = true;
          navigator.vibrate?.(40);
          onCodeRef.current(gtin);
          return;
        }
        timer = window.setTimeout(() => void tick(), READ_EVERY_MS);
      };
      void tick();
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  const submitTyped = () => {
    const gtin = normalizeGtin(typed);
    if (!gtin) {
      setTypedError("That isn't a valid barcode. Check the digits under the bars.");
      return;
    }
    done.current = true;
    onCode(gtin);
  };

  const showCamera = camera === "starting" || camera === "scanning";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="animate-fade-slide-up">
        {showCamera ? (
          <div className="relative overflow-hidden" style={{ borderRadius: 18, background: "rgb(var(--th-1e1834))", aspectRatio: "4 / 3" }}>
            <video ref={video} playsInline muted className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
            {/* The frame to aim with. */}
            <div
              aria-hidden
              className="absolute"
              style={{ left: "12%", right: "12%", top: "30%", bottom: "30%", border: "2px solid rgba(255,255,255,0.85)", borderRadius: 14 }}
            />
            <p
              className="absolute inset-x-0 text-center"
              style={{ bottom: 10, color: "rgba(255,255,255,0.85)", fontSize: textPx(12), fontWeight: 600 }}
            >
              {camera === "starting" ? "Starting the camera…" : "Point the camera at the barcode"}
            </p>
          </div>
        ) : (
          <div className="flex items-start" style={{ gap: 10, padding: "12px 14px", borderRadius: 14, background: dark ? FOOD_DARK.box : "#F4F4F6" }}>
            <ScanLine size={18} className="flex-none" style={{ color: dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))", marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: textPx(12.5), color: "rgb(var(--c-charcoal-soft))", lineHeight: 1.45 }}>
              {camera === "denied"
                ? "Camera access is off for this site. Allow it in your browser settings, or type the number below."
                : "This browser can't use the camera for scanning. Type the number under the barcode instead."}
            </p>
          </div>
        )}

        <p style={{ margin: "16px 0 6px", fontSize: textPx(12), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Or type the number</p>
        <div className="flex" style={{ gap: 8 }}>
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value.replace(/[^\d\s-]/g, ""));
              setTypedError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitTyped()}
            inputMode="numeric"
            placeholder="Enter number manually"
            aria-label="Barcode number"
            className="flex-1 min-w-0 focus:outline-none"
            style={{ height: 46, padding: "0 14px", borderRadius: 12, border: `1px solid ${dark ? FOOD_DARK.outline : "#E7E7EC"}`, background: "rgb(var(--c-cream-card))", fontSize: textPx(14), color: "rgb(var(--c-charcoal))" }}
          />
          <button
            onClick={submitTyped}
            disabled={!typed.trim()}
            className="tap flex-none disabled:opacity-50"
            style={{ height: 46, padding: "0 16px", borderRadius: 12, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(14), fontWeight: 700 }}
          >
            Use
          </button>
        </div>
        {typedError && (
          <p className="text-xs font-semibold text-status-high" style={{ marginTop: 8 }}>
            {typedError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
