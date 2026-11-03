import React, { useLayoutEffect, useRef, useState } from "react";
import { t, tk } from "../../../i18n/core";

/**
 * Website viewport v1, WC-HO Quick actions (HO Quick Actions Stack v8, literal
 * geometry): the mic disc (#95C0BB) at the start, its diameter the box height
 * (at least 60, at most 40% of the width), and three stacked #9591DC buttons
 * (gap 8) whose start edges are cut by a concave arc of radius R + 20 around
 * the disc. Icon and label (15/24 600, white) form one group centred in the
 * visible part of the buttons, the icons on one axis. The same artwork as the
 * mobile Quick actions (public/quick-actions/*.png) and the same actions.
 */

const B = [
  { key: "food", label: tk("Log food"), text: tk("Add Food"), aw: 150, ah: 145 },
  { key: "workout", label: tk("Log workout"), text: tk("Add Workout"), aw: 139, ah: 155 },
  { key: "metric", label: tk("Add metric"), text: tk("Add Metric"), aw: 107, ah: 91 },
] as const;

const CSS = `
.qa-web-btn { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.qa-web-btn:hover { transform: scale(0.98); }
.qa-web-btn:active { transform: scale(0.96); }
.qa-web-btn:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
`;

export const QuickActionsStack: React.FC<{
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}> = ({ onLogFood, onLogWorkout, onAddMetric, onVoiceLog }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [{ w, h }, setBox] = useState({ w: 548, h: 129 });
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const read = () => {
      const nw = el.offsetWidth;
      const nh = el.offsetHeight;
      if (nw && nh) setBox((p) => (Math.abs(nw - p.w) > 0.5 || Math.abs(nh - p.h) > 0.5 ? { w: nw, h: nh } : p));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const d = Math.max(60, Math.min(h, w * 0.4));
  const R = d / 2;
  const gap = 8;
  const ring = 20;
  const bh = (h - 2 * gap) / 3;
  const rr = R + ring;
  const cy = h / 2;
  const ys = [0, bh + gap, 2 * (bh + gap)];
  // The arc's start edge at a row's middle (where the visible part begins)...
  const xs = ys.map((y) => R + Math.sqrt(Math.max(0, rr ** 2 - (y + bh / 2 - cy) ** 2)));
  // ...and the button's own start: where the arc leaves the row's far edge.
  const left = (y: number) => {
    const far = Math.max(Math.abs(y - cy), Math.abs(y + bh - cy));
    return far >= rr ? R : R + Math.sqrt(rr * rr - far * far);
  };
  const glyphW = (aw: number, ah: number) => +((28 * aw) / ah).toFixed(1);
  const iconCell = Math.max(...B.map((b) => glyphW(b.aw, b.ah)));
  const groupW = iconCell + 12 + 94;
  const visL = Math.max(...xs);
  const gLeft = Math.max(visL + 8, (visL + w) / 2 - groupW / 2);
  const micH = +(d * (204 / 376)).toFixed(1);
  const micW = +((micH * 161) / 204).toFixed(1);
  const micY = +((10 / 376) * d).toFixed(1);
  const actions = [onLogFood, onLogWorkout, onAddMetric];
  const start = rtl ? "right" : "left";

  return (
    <div className="flex flex-col" style={{ width: "100%", height: "100%", boxSizing: "border-box" }}>
      <style href="home-qa-web" precedence="default">{CSS}</style>
      <p className="uppercase" style={{ margin: "0 0 8px", fontSize: 12, lineHeight: "16px", fontWeight: 600, letterSpacing: ".08em", color: "rgba(36,31,27,0.42)" }}>
        {t("Quick actions")}
      </p>
      <div ref={boxRef} className="relative" style={{ flex: 1, minHeight: 0 }}>
        <button
          type="button"
          onClick={onVoiceLog}
          aria-label={t("Tell Centium what you ate")}
          className="qa-web-btn"
          style={{ position: "absolute", [start]: 0, top: +((h - d) / 2).toFixed(1), width: d, height: d, borderRadius: 999, border: "none", padding: 0, background: "#95C0BB", display: "grid", placeItems: "center", cursor: "pointer" }}
        >
          <img src="/quick-actions/voice.png" alt="" style={{ width: micW, height: micH, display: "block", transform: `translateY(${micY}px)` }} />
        </button>
        {B.map((b, i) => {
          const x = +left(ys[i]).toFixed(1);
          const gw = glyphW(b.aw, b.ah);
          // The mask's circle centre, from the button's own start corner (mirrored in Arabic).
          const mx = (R - x).toFixed(1);
          const my = (cy - ys[i]).toFixed(1);
          const mask = `radial-gradient(circle at ${rtl ? `calc(100% - ${mx}px)` : `${mx}px`} ${my}px, transparent ${rr.toFixed(1)}px, #000 ${(rr + 0.6).toFixed(1)}px)`;
          const r = bh / 2;
          return (
            <button
              key={b.key}
              type="button"
              onClick={actions[i]}
              aria-label={t(b.label)}
              title={t(b.label)}
              className="qa-web-btn"
              style={{
                position: "absolute",
                [start]: x,
                top: +ys[i].toFixed(1),
                width: +(w - x).toFixed(1),
                height: +bh.toFixed(1),
                borderRadius: rtl ? `${r}px 12px 12px ${r}px` : `12px ${r}px ${r}px 12px`,
                WebkitMaskImage: mask,
                maskImage: mask,
                border: "none",
                padding: 0,
                background: "#9591DC",
                display: "block",
                cursor: "pointer",
              }}
            >
              <span className="flex items-center" style={{ position: "absolute", [start]: +(gLeft - x).toFixed(1), top: "50%", transform: "translateY(-50%)", gap: 12, pointerEvents: "none" }}>
                <span className="flex justify-center" style={{ width: iconCell, height: 28, flex: "none" }}>
                  <img src={`/quick-actions/${b.key}.png`} alt="" style={{ width: gw, height: 28, display: "block" }} />
                </span>
                <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap" }}>{t(b.text)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
