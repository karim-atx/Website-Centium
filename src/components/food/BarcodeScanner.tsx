import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { normalizeGtin } from "../../utils/gtin";
import { useIsDark } from "../../hooks/useIsDark";
import { FOOD_DARK } from "./foodDark";
import { textPx } from "../../theme/textSize";
import { useCameraCodeReader } from "./useCameraCodeReader";
import { t } from "../../i18n/core";
import { useIsWeb } from "../web/useWebLayout";
import { camera as phoneCamera, useNativeCamera } from "../../platform/camera";

/**
 * The camera barcode scanner (FO3.2, reused by HO2.1's Barcode button): the
 * back camera in a framed viewport, read by BarcodeDetector or the ZXing WASM
 * fallback, with the typed field kept underneath for a code the camera can't
 * read or a browser that has no camera. Hands back a normalised 13-digit GTIN;
 * what that code IS (catalogue, Open Food Facts, nothing) is the caller's
 * business — see services/barcode/lookup.
 *
 * IN THE APP (App-Centium ROUND_J.md §4.1) the phone's own full-screen
 * scanner opens with the sheet instead (ML Kit, on the phone); closing it
 * closes the sheet, "Type it instead" leaves the typed field here, and
 * "Scan with camera" opens it again.
 */
export const BarcodeScanner: React.FC<{
  open: boolean;
  onClose: () => void;
  onCode: (gtin: string) => void;
  title?: string;
}> = ({ open, onClose, onCode, title }) => {
  const dark = useIsDark();
  // Website viewport v1 (WC-FO.1.2.2 to .6, FO Barcode Web): the web sizes from 1024px wide.
  const web = useIsWeb();
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);
  const onCodeRef = useRef(onCode);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCodeRef.current = onCode;
    onCloseRef.current = onClose;
  }, [onCode, onClose]);
  // In the app: null while the phone answers, so the website's camera doesn't start meanwhile.
  const phone = useNativeCamera();
  const native = phone?.scan === true;
  const [nativeNote, setNativeNote] = useState<"denied" | "unavailable" | "invalid" | null>(null);
  const launched = useRef(false);
  const scanOnPhone = useCallback(async () => {
    setNativeNote(null);
    const r = await phoneCamera.scan({ kind: "food", prompt: t("Point the camera at the barcode"), alt: t("Type it instead") }).catch(() => null);
    if (!r) return setNativeNote("unavailable");
    if ("cancelled" in r) {
      if (r.reason === "closed") onCloseRef.current();
      else if (r.reason === "denied") setNativeNote("denied");
      else if (r.reason !== "alt") setNativeNote("unavailable");
      return;
    }
    const gtin = normalizeGtin(r.code);
    if (!gtin) return setNativeNote("invalid");
    onCodeRef.current(gtin);
  }, []);
  useEffect(() => {
    if (!open) {
      // The next opening scans again (which clears any note).
      launched.current = false;
      return;
    }
    if (native && !launched.current) {
      launched.current = true;
      void scanOnPhone();
    }
  }, [open, native, scanOnPhone]);
  const { video, camera, stop } = useCameraCodeReader({
    active: open && phone !== null && !native,
    kind: "retail",
    accept: (raw) => {
      const gtin = normalizeGtin(raw);
      if (!gtin) return false;
      onCodeRef.current(gtin);
      return true;
    },
  });

  const submitTyped = () => {
    const gtin = normalizeGtin(typed);
    if (!gtin) {
      setTypedError(t("That isn't a valid barcode. Check the digits under the bars."));
      return;
    }
    stop();
    onCode(gtin);
  };

  const showCamera = !native && (camera === "starting" || camera === "scanning");

  return (
    <BottomSheet open={open} onClose={onClose} title={title ?? t("Scan barcode")}>
      <div className="animate-fade-slide-up">
        {native ? (
          <>
            {nativeNote && (
              <p role="alert" style={web ? { margin: "0 0 10px", fontSize: 13, lineHeight: "20px", color: "rgb(var(--c-charcoal-soft))" } : { margin: "0 0 10px", fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal-soft))" }}>
                {nativeNote === "denied"
                  ? t("Camera access is off for Centium. Allow it in your phone's settings, or type the number below.")
                  : nativeNote === "invalid"
                    ? t("That isn't a valid barcode. Check the digits under the bars.")
                    : t("The camera couldn't start. Type the number under the barcode instead.")}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (nativeNote !== "denied") return void scanOnPhone();
                // Back from the settings, the button scans again.
                setNativeNote(null);
                void phoneCamera.openSettings();
              }}
              className="tap w-full flex items-center justify-center"
              style={{ gap: 8, height: web ? 44 : 46, borderRadius: 12, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: web ? 15 : textPx(14), fontWeight: 700 }}
            >
              <Camera size={17} aria-hidden />
              {nativeNote === "denied" ? t("Open phone settings") : t("Scan with camera")}
            </button>
          </>
        ) : showCamera ? (
          <div className="relative overflow-hidden" style={{ borderRadius: 18, background: "rgb(var(--th-1e1834))", aspectRatio: "4 / 3" }}>
            <video ref={video} playsInline muted className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
            {/* The frame to aim with. */}
            <div
              aria-hidden
              className="absolute"
              style={{ insetInlineStart: "12%", insetInlineEnd: "12%", top: "30%", bottom: "30%", border: "2px solid rgba(255,255,255,0.85)", borderRadius: 14 }}
            />
            <p
              className="absolute inset-x-0 text-center"
              style={web ? { bottom: 10, color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: "20px", fontWeight: 600 } : { bottom: 10, color: "rgba(255,255,255,0.85)", fontSize: textPx(12), fontWeight: 600 }}
            >
              {camera === "starting" ? t("Starting the camera…") : t("Point the camera at the barcode")}
            </p>
          </div>
        ) : (
          <div className="flex items-start" style={{ gap: 10, padding: "12px 14px", borderRadius: 14, background: dark ? FOOD_DARK.box : "#F4F4F6" }}>
            <ScanLine size={18} className="flex-none" style={{ color: dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))", marginTop: 1 }} />
            <p style={web ? { margin: 0, fontSize: 13, color: "rgb(var(--c-charcoal-soft))", lineHeight: "20px" } : { margin: 0, fontSize: textPx(12.5), color: "rgb(var(--c-charcoal-soft))", lineHeight: 1.45 }}>
              {camera === "denied"
                ? t("Camera access is off for this site. Allow it in your browser settings, or type the number below.")
                : t("This browser can't use the camera for scanning. Type the number under the barcode instead.")}
            </p>
          </div>
        )}

        <p style={web ? { margin: "16px 0 8px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" } : { margin: "16px 0 6px", fontSize: textPx(12), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{t("Or type the number")}</p>
        <div className="flex" style={{ gap: 8 }}>
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value.replace(/[^\d\s-]/g, ""));
              setTypedError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitTyped()}
            inputMode="numeric"
            placeholder={t("Enter number manually")}
            aria-label={t("Barcode number")}
            className="flex-1 min-w-0 focus:outline-none"
            style={{ height: web ? 44 : 46, padding: "0 14px", borderRadius: 12, border: `1px solid ${dark ? FOOD_DARK.outline : "#E7E7EC"}`, background: "rgb(var(--c-cream-card))", fontSize: web ? 15 : textPx(14), color: "rgb(var(--c-charcoal))" }}
          />
          <button
            onClick={submitTyped}
            disabled={!typed.trim()}
            className="tap flex-none disabled:opacity-50"
            style={{ height: web ? 44 : 46, padding: "0 16px", borderRadius: 12, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: web ? 15 : textPx(14), fontWeight: 700 }}
          >
            {t("Use")}
          </button>
        </div>
        {typedError && (
          <p className="text-xs font-semibold text-status-high" style={web ? { marginTop: 8, fontSize: 13, lineHeight: "20px" } : { marginTop: 8 }}>
            {typedError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
