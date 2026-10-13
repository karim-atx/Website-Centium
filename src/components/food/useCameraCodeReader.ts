import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { canUseBarcodeScanner, createFrameReader, type CodeKind } from "../../services/barcode/scanner";

export type CameraState = "starting" | "scanning" | "denied" | "unavailable";

const READ_EVERY_MS = 250;

/**
 * The scanner's camera lifecycle, shared by the food barcode sheet and the
 * gym Front desk pass scanner (v6 OURS-OP1-front-desk-scan W1/W2): while
 * `active`, the back camera streams into `video` and every 250 ms a frame is
 * read for `kind` codes; `accept(raw)` decides whether a read counts (true
 * stops reading until `resume()` or the next activation). Tracks stop when
 * inactive or unmounted. Denied and unavailable cameras are reported.
 */
export function useCameraCodeReader({
  active,
  kind,
  accept,
}: {
  active: boolean;
  kind: CodeKind;
  accept: (raw: string) => boolean;
}): { video: React.MutableRefObject<HTMLVideoElement | null>; camera: CameraState; resume: () => void; stop: () => void } {
  const video = useRef<HTMLVideoElement | null>(null);
  const [camera, setCamera] = useState<CameraState>(() => (canUseBarcodeScanner() ? "starting" : "unavailable"));
  const done = useRef(false);
  const acceptRef = useRef(accept);
  const kick = useRef<(() => void) | null>(null);
  useEffect(() => {
    acceptRef.current = accept;
  }, [accept]);

  useEffect(() => {
    if (!active || !canUseBarcodeScanner()) return;
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
      const reader = await createFrameReader(kind).catch(() => null);
      if (cancelled) return;
      if (!reader) {
        setCamera("unavailable");
        return;
      }
      setCamera("scanning");
      const tick = async () => {
        if (cancelled || done.current || !video.current) return;
        const raw = await reader.read(video.current).catch(() => null);
        if (raw && !done.current && acceptRef.current(raw)) {
          done.current = true;
          navigator.vibrate?.(40);
          return;
        }
        timer = window.setTimeout(() => void tick(), READ_EVERY_MS);
      };
      kick.current = () => {
        if (cancelled || !done.current) return;
        done.current = false;
        void tick();
      };
      void tick();
    })();

    return () => {
      cancelled = true;
      kick.current = null;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, kind]);

  const resume = useCallback(() => kick.current?.(), []);
  /** Stop reading (a code arrived some other way, e.g. typed). */
  const stop = useCallback(() => {
    done.current = true;
  }, []);
  return { video, camera, resume, stop };
}
