import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Footprints, HeartPulse, Moon, X } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { textPx, linePx } from "../../theme/textSize";
import { t } from "../../i18n/core";

// OURS-home-no-device-connected §2 (V6-63 b): the web's answer to "Connect a
// source" on the empty Steps, Sleep and Heart rate widgets. Nothing syncs on
// the web, so it explains where the readings come from and links to Devices
// and sources (V6-63 a). No manual entry for steps, sleep or heart rate on the
// web (V6-20). Built from the HO1.1 popup pattern: backdrop #241F1B@40% blur 3
// (X-07, both modes), popup 358 wide r20, 250 ms scale 0.96 -> 1 + fade.

export type NoDeviceMetric = "steps" | "sleep" | "heart-rate";

const ICON: Record<NoDeviceMetric, typeof Footprints> = { steps: Footprints, sleep: Moon, "heart-rate": HeartPulse };

export const NoDeviceSheet: React.FC<{ open: boolean; metric: NoDeviceMetric; onClose: () => void }> = ({ open, metric, onClose }) => {
  useBackCloses(open, onClose);
  const dark = useIsDark();
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  const Icon = ICON[metric];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="presentation">
      <style href="home-nodevice-motion" precedence="default">{`
@keyframes hw-pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
@keyframes hw-scrim { from { opacity: 0 } to { opacity: 1 } }
.hw-pop { animation: hw-pop 250ms cubic-bezier(0.22, 1, 0.36, 1) both }
.hw-scrim { animation: hw-scrim 250ms cubic-bezier(0.22, 1, 0.36, 1) both }
.reduce-motion .hw-pop, .reduce-motion .hw-scrim { animation: none }
@media (prefers-reduced-motion: reduce) { .hw-pop, .hw-scrim { animation: none } }
`}</style>
      <div className="absolute inset-0 hw-scrim" style={{ background: "rgba(36,31,27,0.4)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-device-title"
        className="relative w-full hw-pop"
        style={{
          maxWidth: 358,
          borderRadius: 20,
          padding: "20px 20px 16px",
          background: dark ? "#1C1F28" : "#FFFFFF",
          border: `0.547723px solid ${dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"}`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close")}
          className="tap absolute grid place-items-center rounded-full"
          style={{ top: 12, insetInlineEnd: 12, width: 26, height: 26, border: `1.09545px solid ${dark ? "#B8B3C7" : "#8C8378"}`, color: dark ? "#B8B3C7" : "#8C8378" }}
        >
          <span aria-hidden className="absolute" style={{ insetInlineStart: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%, -50%)" }} />
          <X size={12} strokeWidth={2} aria-hidden />
        </button>
        <span
          className="mx-auto grid place-items-center rounded-full"
          style={{ width: 44, height: 44, marginBottom: 12, background: `rgb(var(--metric-${metric}-tint))` }}
          aria-hidden
        >
          <Icon size={20} strokeWidth={1.5} style={{ color: dark ? `rgb(var(--metric-${metric}-main))` : `rgb(var(--metric-${metric}-ink))` }} />
        </span>
        <h2
          id="no-device-title"
          className="text-center"
          style={{ margin: "0 0 6px", fontSize: textPx(17), lineHeight: linePx(24), fontWeight: 700, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}
        >
          {t("No device connected")}
        </h2>
        <p className="text-center" style={{ margin: "0 0 16px", fontSize: textPx(12.5), lineHeight: linePx(18), fontWeight: 500, color: "rgb(var(--c-charcoal-soft))" }}>
          {t("Steps, sleep and heart rate come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming.")}
        </p>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/app/settings/devices");
          }}
          className="tap block w-full text-center"
          style={{ marginBottom: 8, minHeight: 44, fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 700, color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))" }}
        >
          {t("See devices and sources")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="tap block w-full"
          style={{
            height: 44,
            borderRadius: 14,
            fontSize: textPx(14),
            fontWeight: 700,
            color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))",
            background: dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f0edf9))",
          }}
        >
          {t("Got it")}
        </button>
      </div>
    </div>,
    document.body
  );
};
