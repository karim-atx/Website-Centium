import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { useBackCloses } from "../../hooks/useBackCloses";

// A photo from a conversation, full screen: pinch or wheel to zoom, drag to
// pan while zoomed, double-tap to zoom in or out, and close with the button,
// Escape, or a tap on the background. Download saves the file itself.
//
// The URL handed in is a short-lived signed one. `refresh` mints a new one
// when a download finds the old one expired, so a viewer left open for ten
// minutes still saves the photo rather than failing.

const MAX_SCALE = 5;

export const ImageLightbox: React.FC<{
  url: string;
  /** Used to name the downloaded file. */
  path: string;
  onClose: () => void;
  refresh: () => Promise<string | null>;
}> = ({ url, path, onClose, refresh }) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(true, onClose);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // True while a finger or the mouse is down: gestures track 1:1, releases ease.
  const [gesturing, setGesturing] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; midX: number; midY: number; x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(1, s));
  const settle = (v: { scale: number; x: number; y: number }) => (v.scale <= 1.01 ? { scale: 1, x: 0, y: 0 } : v);

  const onPointerDown = (e: React.PointerEvent) => {
    // Capture keeps a drag tracking outside the image; it can throw for a
    // pointer the browser no longer considers active, which must not lose the
    // gesture.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* tracked without capture */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: view.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        x: view.x,
        y: view.y,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const scale = clampScale((g.scale * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist);
      setView({ scale, x: g.x + ((a.x + b.x) / 2 - g.midX), y: g.y + ((a.y + b.y) / 2 - g.midY) });
    } else if (pointers.current.size === 1 && view.scale > 1) {
      setView((v) => ({ ...v, x: v.x + (e.clientX - prev.x), y: v.y + (e.clientY - prev.y) }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) {
      setGesturing(false);
      setView((v) => settle(v));
    }
  };

  const zoomAt = (clientX: number, clientY: number) => {
    setView((v) => {
      if (v.scale > 1) return { scale: 1, x: 0, y: 0 };
      const s = 2.5;
      return { scale: s, x: (window.innerWidth / 2 - clientX) * (s - 1), y: (window.innerHeight / 2 - clientY) * (s - 1) };
    });
  };

  const onImageClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) zoomAt(e.clientX, e.clientY);
    lastTap.current = now;
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setNote(null);
    const tryFetch = async (u: string) => {
      const res = await fetch(u);
      if (!res.ok) throw new Error(String(res.status));
      return res.blob();
    };
    try {
      let blob: Blob;
      try {
        blob = await tryFetch(url);
      } catch {
        const fresh = await refresh();
        if (!fresh) throw new Error("unsigned");
        blob = await tryFetch(fresh);
      }
      const ext = path.split(".").pop() ?? "jpg";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `centium-photo-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      setNote("That photo couldn't be downloaded. Try again.");
    }
    setDownloading(false);
  };

  const control =
    "tap w-11 h-11 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 disabled:opacity-50";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={control}>
          <X size={20} />
        </button>
        <button type="button" onClick={() => void download()} disabled={downloading} aria-label="Download photo" className={control}>
          <Download size={19} />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setView((v) => settle({ ...v, scale: clampScale(v.scale * Math.exp(-e.deltaY * 0.002)) }))}
        onClick={(e) => {
          // A tap on the background closes; a tap on the photo does not.
          if (e.target === e.currentTarget && view.scale === 1) onClose();
        }}
      >
        <img
          src={url}
          alt="Photo from this conversation"
          draggable={false}
          onClick={onImageClick}
          className="max-w-full max-h-full object-contain will-change-transform"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transition: gesturing ? "none" : "transform 160ms ease-out",
          }}
        />
      </div>

      {note && (
        <p
          role="status"
          className="absolute inset-x-4 text-center text-[13px] font-semibold text-white bg-black/60 rounded-xl px-3 py-2"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        >
          {note}
        </p>
      )}
    </div>,
    document.body
  );
};
