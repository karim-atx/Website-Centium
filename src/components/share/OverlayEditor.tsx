import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { marketPalette, SHARE_TOKENS } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../pro/proInk";
import {
  DEFAULT_CROP,
  EDITOR_W,
  clampCrop,
  clampPosition,
  defaultTransform,
  dragTo,
  editorHeight,
  halfExtents,
  panCrop,
  pinchTo,
  readout,
  sameCrop,
  sameTransform,
  type OverlayTransform,
  type PhotoCrop,
  type Size,
} from "./overlayModel";

// Market + Share 3.0 · OverlayEditor, shared by C-SH.5, P-SH.3 (ADDED) and
// B-SH.5. Literal values from the screen files (Client Sharing lines 252 to
// 277, Professional Sharing 136 to 160, Business Sharing 150 to 189):
// - a #F5F5F6 r20 well, padding 10, centring the 220-wide frame (391 Story,
//   275 Post, 220 Square), r10, overflow hidden, shadow 0 1px 2px
//   rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10), touch-action none;
// - the user's photo, cover-fit (crop zoom >= 100%, dragged within bounds);
// - the layer at { x, y, scale, rotation } (translate(-50%,-50%) scale()
//   rotate(), origin 50% 50%), 0.45 opaque while the photo is the target;
// - while moving: the 10 px dashed safe margin (rgba(174,161,220,0.7), r6),
//   the #AEA1DC centre guides when snapped (within 5 px), the selection
//   outline and four corner handles;
// - rotating: the "0° · snapped" pill 34 above the layer (#AEA1DC, 22 tall,
//   10.5 / 800); the crop: a 1.5 #AEA1DC border and the thirds grid;
// - the one-time hint "Pinch to resize · drag to move" and, after Reset, the
//   toast "Back to default size and position";
// - below: the Stats · Photo target switch (#F4F3F9 track r12 padding 4,
//   30-tall r9 items, active #9A8CD6 white 700, idle #5B5349 600), the size
//   readout and Reset (0.4 while at the default).
// `chrome="business"` is B-SH.5's variant: the layer fills the frame by
// default, a 1px solid r4 selection, 8 px shadowed handles, the hint as a
// dark pill 14 from the top, a 12 / 700 readout and a 30-tall Reset.
//
// Behaviour (HANDOVER §4 C-SH.5 and §12, ed.down / move / up ported):
// one finger drags (clamped, then snapped), two fingers pinch 50 to 200% and
// rotate (snapping to 0°); a wheel or trackpad pinch scales; the keyboard
// moves (arrows, Shift for 10), scales (+ / -) and rotates ([ / ]). On the
// Photo target the same gestures pan and zoom the crop. A layer whose size
// changes (a stat toggled off) re-clamps, so it reflows in place.

export interface OverlayState {
  transform: OverlayTransform;
  crop: PhotoCrop;
}

export interface OverlayEditorProps {
  format: "story" | "post" | "square";
  photoUrl: string;
  /** The transparent layer, drawn at scale 1 and `layerWidth` wide. */
  layer: React.ReactNode;
  layerWidth: number;
  /** "corner": bottom-left on the margin (client, professional); "fill": centred at 100% (business). */
  anchor: "corner" | "fill";
  chrome?: "client" | "business";
  /** Called on every change, with the layer's measured size (for the export). */
  onChange?: (state: OverlayState & { layer: Size; frame: Size }) => void;
  /** localStorage key for the one-time hint (per user). Null: no hint. */
  hintKey: string | null;
  /** Styles on the layer's wrapper (the client layer's white text and shadow). */
  layerStyle?: React.CSSProperties;
  /** The target switch's labels. */
  targets?: [string, string];
  /** What the layer is, for screen readers ("Your workout stats"). */
  layerLabel: string;
}

const readSeen = (key: string | null): boolean => {
  if (!key) return true;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const writeSeen = (key: string | null) => {
  if (!key) return;
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode: the hint shows again next time */
  }
};

const HAND = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

type Gesture =
  | { kind: "drag"; sx: number; sy: number; t: OverlayTransform; c: PhotoCrop }
  | { kind: "pinch"; d0: number; a0: number; t: OverlayTransform; c: PhotoCrop }
  | null;

export const OverlayEditor: React.FC<OverlayEditorProps> = ({
  format,
  photoUrl,
  layer,
  layerWidth,
  anchor,
  chrome = "client",
  onChange,
  hintKey,
  layerStyle,
  targets = ["Stats", "Photo"],
  layerLabel,
}) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const biz = chrome === "business";
  const frame = useMemo<Size>(() => ({ w: EDITOR_W, h: editorHeight(format) }), [format]);
  const frameRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerH, setLayerH] = useState(0);
  const layerSize = useMemo<Size>(() => ({ w: layerWidth, h: layerH }), [layerWidth, layerH]);
  const [target, setTarget] = useState<0 | 1>(0);
  const [t, setT] = useState<OverlayTransform>(() => defaultTransform(frame, { w: layerWidth, h: 0 }, anchor));
  const [crop, setCrop] = useState<PhotoCrop>(DEFAULT_CROP);
  const [touched, setTouched] = useState(false);
  const [moving, setMoving] = useState(false);
  const [rotating, setRotating] = useState<null | { snapped: boolean }>(null);
  const [snap, setSnap] = useState({ v: false, h: false });
  const [hint, setHint] = useState(() => !readSeen(hintKey));
  const [toast, setToast] = useState(false);
  const [img, setImg] = useState<Size>({ w: 1, h: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>(null);

  // The layer's natural height (transforms don't change offsetHeight).
  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const read = () => setLayerH(el.offsetHeight);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new frame or layer size: an untouched layer takes its default place;
  // a moved one is re-clamped where it is (the layer reflows).
  useEffect(() => {
    if (!layerH) return;
    setT((cur) => (touched ? clampPosition(cur, frame, layerSize) : defaultTransform(frame, layerSize, anchor)));
  }, [frame, layerSize, layerH, touched, anchor]);

  const def = useMemo(() => defaultTransform(frame, layerSize, anchor), [frame, layerSize, anchor]);
  const atDefault = sameTransform(t, def) && sameCrop(crop, DEFAULT_CROP);

  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (layerH) onChangeRef.current?.({ transform: t, crop, layer: layerSize, frame });
  }, [t, crop, layerSize, frame, layerH]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(false), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const dismissHint = useCallback(() => {
    if (!hint) return;
    setHint(false);
    writeSeen(hintKey);
  }, [hint, hintKey]);

  const toFrame = () => {
    const r = frameRef.current?.getBoundingClientRect();
    return r && r.width ? r.width / frame.w : 1;
  };

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = { kind: "pinch", d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), t, c: crop };
    } else if (pts.length === 1) {
      gesture.current = { kind: "drag", sx: pts[0].x, sy: pts[0].y, t, c: crop };
    } else gesture.current = null;
  };

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events */
    }
    dismissHint();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
    setMoving(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const k = toFrame();
    if (g.kind === "drag") {
      const dx = (e.clientX - g.sx) / k;
      const dy = (e.clientY - g.sy) / k;
      if (target === 1) setCrop(panCrop(g.c, dx, dy, frame, img));
      else {
        const r = dragTo(g.t, dx, dy, frame, layerSize);
        setT(r.t);
        setSnap({ v: r.v, h: r.h });
      }
    } else {
      const [a, b] = [...pointers.current.values()];
      const by = Math.hypot(b.x - a.x, b.y - a.y) / g.d0;
      const rot = ((Math.atan2(b.y - a.y, b.x - a.x) - g.a0) * 180) / Math.PI;
      if (target === 1) setCrop(clampCrop({ ...g.c, zoom: g.c.zoom * by }));
      else {
        const r = pinchTo(g.t, by, rot, frame, layerSize);
        setT(r.t);
        setRotating({ snapped: r.snapped });
      }
    }
    if (target === 0) setTouched(true); // a crop leaves an unmoved layer anchored to its default
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    startGesture();
    if (pointers.current.size === 0) {
      setMoving(false);
      setRotating(null);
      setSnap({ v: false, h: false });
    }
  };

  // Wheel / trackpad pinch: scale (or zoom the crop). Non-passive, so the page doesn't scroll.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const by = Math.exp(-ev.deltaY * 0.002);
      dismissHint();
      if (target === 0) setTouched(true);
      if (target === 1) setCrop((c) => clampCrop({ ...c, zoom: c.zoom * by }));
      else setT((cur) => pinchTo(cur, by, 0, frame, layerSize).t);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [target, frame, layerSize, dismissHint]);

  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    let handled = true;
    if (moves[e.key]) {
      const [dx, dy] = moves[e.key];
      if (target === 1) setCrop((c) => panCrop(c, dx, dy, frame, img));
      else setT((cur) => dragTo(cur, dx, dy, frame, layerSize).t);
    } else if (e.key === "+" || e.key === "=") {
      if (target === 1) setCrop((c) => clampCrop({ ...c, zoom: c.zoom + 0.05 }));
      else setT((cur) => pinchTo(cur, (cur.scale + 0.05) / cur.scale, 0, frame, layerSize).t);
    } else if (e.key === "-" || e.key === "_") {
      if (target === 1) setCrop((c) => clampCrop({ ...c, zoom: c.zoom - 0.05 }));
      else setT((cur) => pinchTo(cur, (cur.scale - 0.05) / cur.scale, 0, frame, layerSize).t);
    } else if ((e.key === "[" || e.key === "]") && target === 0) {
      setT((cur) => pinchTo(cur, 1, e.key === "[" ? -15 : 15, frame, layerSize).t);
    } else handled = false;
    if (handled) {
      e.preventDefault();
      dismissHint();
      if (target === 0) setTouched(true);
    }
  };

  const reset = () => {
    if (atDefault) return;
    setT(def);
    setCrop(DEFAULT_CROP);
    setTouched(false);
    setToast(true);
  };

  const photoOn = target === 1;
  const active = moving || !!rotating;
  const halfH = halfExtents(layerSize, t.scale, 0).hh;
  const value = photoOn ? readout(crop.zoom) : readout(t.scale);
  const SEL = "#AEA1DC";

  return (
    <div>
      <div className="flex justify-center" style={{ borderRadius: 20, background: m.soft, padding: 10 }}>
        <div
          ref={frameRef}
          role="application"
          tabIndex={0}
          aria-label={`${layerLabel} on your photo. ${photoOn ? "Drag to move the photo, pinch to zoom it." : "Drag to move, pinch to resize, two fingers to rotate."} Arrow keys move, plus and minus resize${photoOn ? "" : ", brackets rotate"}.`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            position: "relative",
            width: frame.w,
            height: frame.h,
            flex: "none",
            borderRadius: 10,
            overflow: "hidden",
            touchAction: "none",
            cursor: moving ? "grabbing" : "grab",
            background: "#2A2B31",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)",
            outlineColor: SEL,
          }}
        >
          <img
            src={photoUrl}
            alt=""
            draggable={false}
            onLoad={(e) => setImg({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${crop.fx}% ${crop.fy}%`,
              transform: `scale(${crop.zoom})`,
              transformOrigin: `${crop.fx}% ${crop.fy}%`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          {photoOn && (
            <>
              <span aria-hidden style={{ position: "absolute", inset: 0, border: `1.5px solid ${SEL}`, borderRadius: 10, boxSizing: "border-box" }} />
              {["33.33%", "66.66%"].map((p) => (
                <React.Fragment key={p}>
                  <span aria-hidden style={{ position: "absolute", left: p, top: 0, bottom: 0, borderLeft: "1px solid rgba(255,255,255,0.55)" }} />
                  <span aria-hidden style={{ position: "absolute", top: p, left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.55)" }} />
                </React.Fragment>
              ))}
            </>
          )}
          {moving && !photoOn && <span aria-hidden style={{ position: "absolute", inset: SHARE_TOKENS.safeMargin, border: "1px dashed rgba(174,161,220,0.7)", borderRadius: 6 }} />}
          {moving && snap.v && <span aria-hidden style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: `1px solid ${SEL}` }} />}
          {moving && snap.h && <span aria-hidden style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: `1px solid ${SEL}` }} />}

          <div
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: layerWidth,
              transform: `translate(-50%,-50%) scale(${t.scale}) rotate(${t.rotation}deg)`,
              transformOrigin: "50% 50%",
              opacity: photoOn ? 0.45 : 1,
              pointerEvents: "none",
              ...(biz ? null : { color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.42)" }),
              ...layerStyle,
            }}
          >
            <div ref={layerRef}>{layer}</div>
            {biz ? (
              <span aria-hidden style={{ position: "absolute", inset: 0, border: `1px solid ${active ? "rgba(255,255,255,0.85)" : "transparent"}`, borderRadius: 4 }} />
            ) : (
              <span aria-hidden style={{ position: "absolute", inset: -6, border: `1px dashed ${active ? "rgba(255,255,255,0.85)" : "transparent"}`, borderRadius: 6 }} />
            )}
            {active &&
              (["l t", "r t", "l b", "r b"] as const).map((pos) => {
                const [hx, vy] = pos.split(" ");
                const o = biz ? -4 : -9;
                return (
                  <span
                    key={pos}
                    aria-hidden
                    style={{
                      position: "absolute",
                      [hx === "l" ? "left" : "right"]: o,
                      [vy === "t" ? "top" : "bottom"]: o,
                      width: biz ? 8 : 7,
                      height: biz ? 8 : 7,
                      borderRadius: 999,
                      background: "#FFFFFF",
                      boxShadow: biz ? "0 1px 3px rgba(0,0,0,0.35)" : `0 0 0 1px ${SEL}`,
                    }}
                  />
                );
              })}
          </div>

          {rotating && (
            <span
              aria-live="polite"
              style={{ position: "absolute", left: "50%", top: t.y - halfH - 34, transform: "translateX(-50%)", height: 22, padding: "0 9px", borderRadius: 999, background: SEL, color: "#FFFFFF", fontSize: textPx(10.5), fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}
            >
              {rotating.snapped || t.rotation === 0 ? "0° · snapped" : `${Math.round(t.rotation)}°`}
            </span>
          )}
          {hint &&
            (biz ? (
              <span style={{ position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", whiteSpace: "nowrap", borderRadius: 999, background: "rgba(36,31,27,0.72)", color: "#FFFFFF", fontSize: textPx(10.5), fontWeight: 700, padding: "5px 10px", pointerEvents: "none" }}>
                Pinch to resize · drag to move
              </span>
            ) : (
              <span
                style={{ position: "absolute", left: "50%", top: "44%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 999, background: "#FFFFFF", color: "#5F5093", fontSize: textPx(11), fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(36,31,27,0.22)", pointerEvents: "none" }}
              >
                {HAND}
                Pinch to resize · drag to move
              </span>
            ))}
          {toast && (
            <span
              role="status"
              style={{ position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)", height: 26, padding: "0 10px", borderRadius: 999, background: "#FFFFFF", color: "#2F5F58", fontSize: textPx(10.5), fontWeight: 800, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(36,31,27,0.18)", pointerEvents: "none" }}
            >
              Back to default size and position
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center" style={{ marginTop: 10, gap: 8 }}>
        <div role="radiogroup" aria-label="What to edit" className="flex" style={{ flex: 1, gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
          {targets.map((label, i) => {
            const on = target === i;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTarget(i as 0 | 1)}
                className="tap relative flex items-center justify-center before:absolute before:-inset-y-[7px] before:inset-x-0 before:content-['']"
                style={{ flex: 1, height: 30, borderRadius: 9, fontSize: textPx(12), fontWeight: on ? 700 : 600, background: on ? m.subactive : "transparent", color: on ? "#FFFFFF" : m.ink2 }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span aria-live="polite" style={{ fontSize: textPx(biz ? 12 : 11.5), fontWeight: 700, color: m.ink2, minWidth: biz ? 36 : 40, textAlign: "right", fontVariantNumeric: biz ? undefined : "tabular-nums" }}>
          {value}
        </span>
        <button
          type="button"
          aria-label="Reset"
          aria-disabled={atDefault}
          onClick={reset}
          className="tap relative inline-flex items-center before:absolute before:-inset-y-[7px] before:inset-x-0 before:content-['']"
          style={{
            height: biz ? 30 : 36,
            boxSizing: "content-box",
            padding: biz ? "0 10px" : "0 12px",
            borderRadius: biz ? 9 : 11,
            border: `1px solid ${m.border}`,
            gap: biz ? 5 : 6,
            fontSize: textPx(12),
            fontWeight: biz ? 700 : 800,
            color: biz ? m.cancelink : m.pdark,
            opacity: atDefault ? 0.4 : 1,
            cursor: atDefault ? "default" : "pointer",
          }}
        >
          <svg width={biz ? 12 : 13} height={biz ? 12 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
            <path d={biz ? "M3 12a9 9 0 1 0 3-6.7L3 8" : "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"} />
            <path d="M3 3v5h5" />
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
};
