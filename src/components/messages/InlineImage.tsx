import React, { useEffect, useRef, useState } from "react";
import { ImageOff, RotateCw } from "lucide-react";
import { attachmentUrl, knownRatio, rememberRatio } from "../../services/messaging/attachmentUrls";

// A photo in the chat log, shown as itself.
//
// SIGNED WHEN IT NEARS THE SCREEN, not when the thread renders: a long thread
// would otherwise mint a URL for every photo in its history at once. The URL
// comes from a cache that re-signs before expiry (attachmentUrls), so the
// thread's poll does not re-sign anything.
//
// THE BOX IS RESERVED BEFORE THE PIXELS ARRIVE: the remembered ratio if this
// device has seen the photo, else a neutral 4:3, corrected on load. A photo
// that will not load gets a fallback with a retry rather than a broken icon.

const MAX_W = 240;
const MAX_H = 300;
const MIN_W = 120;

function boxFor(ratio: number) {
  // Wide photos take the full width; tall ones are capped by height.
  const width = ratio >= MAX_W / MAX_H ? MAX_W : Math.max(MIN_W, MAX_H * ratio);
  return { width, ratio };
}

export const InlineImage: React.FC<{
  path: string;
  onOpen: (url: string) => void;
  className?: string;
}> = ({ path, onOpen, className }) => {
  const holder = useRef<HTMLButtonElement>(null);
  // Without IntersectionObserver there is nothing to wait for: sign at once.
  const [near, setNear] = useState(() => !("IntersectionObserver" in window));
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const [ratio, setRatio] = useState<number>(() => knownRatio(path) ?? 4 / 3);
  const retried = useRef(false);

  // Sign only once the photo is within a screen of the viewport.
  useEffect(() => {
    const el = holder.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    void attachmentUrl(path).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u);
      else setState("failed");
    });
    return () => {
      cancelled = true;
    };
  }, [near, path]);

  const retry = async (force: boolean) => {
    setState("loading");
    const u = await attachmentUrl(path, force);
    if (u) setUrl(u);
    else setState("failed");
  };

  const { width } = boxFor(ratio);

  return (
    <button
      ref={holder}
      type="button"
      onClick={() => {
        if (state === "loaded" && url) onOpen(url);
        else if (state === "failed") {
          retried.current = false;
          void retry(true);
        }
      }}
      aria-label={state === "failed" ? "Photo couldn't be loaded. Tap to try again" : "Photo. Tap to view full screen"}
      className={`tap relative block overflow-hidden rounded-xl bg-black/10 max-w-full ${className ?? ""}`}
      style={{ width, aspectRatio: String(ratio) }}
    >
      {state === "loading" && <span aria-hidden className="absolute inset-0 animate-pulse bg-black/10" />}
      {url && state !== "failed" && (
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            rememberRatio(path, img.naturalWidth, img.naturalHeight);
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
            setState("loaded");
          }}
          onError={() => {
            // Most often an expired or revoked URL: re-sign once, then give up.
            if (!retried.current) {
              retried.current = true;
              void retry(true);
            } else setState("failed");
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {state === "failed" && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center text-[12px] font-semibold opacity-80">
          <ImageOff size={18} aria-hidden />
          Photo couldn't be loaded
          <span className="inline-flex items-center gap-1 text-[11px] font-medium">
            <RotateCw size={11} aria-hidden /> Tap to try again
          </span>
        </span>
      )}
    </button>
  );
};
