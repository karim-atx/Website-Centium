import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Minus, MoreVertical, Plus } from "lucide-react";
import { PopupMenu } from "../ui/PopupMenu";
import { useWebLayout } from "../web/useWebLayout";
import { t } from "../../i18n/core";
import type { ViewerMenuItem } from "./FileViewerSheet";

// Website viewport v1 · WC-HE.9.2 viewer (WC-HE Records Web v3, screen
// "viewer"): the record's file as a page beside the sidebar, over the
// content area only.
// - Header 64, dark #15171E, 1px #241F1B@6% under it, padding 0 32 (24 at
//   the rail), gap 12: back 36 r999 (m-start -8, chevron 20 #B8B3C7); the
//   title 24/30 700 ls -0.5 #FFFFFF (ellipsis) over the sub 13/18 600
//   #B8B3C7; ⋮ 36 r999 (m-end -8, 20 #B8B3C7), #FFFFFF@12% while its menu is
//   open (Share / Edit / Delete).
// - Body: max 1280 centred, padding 24 32 (24 at the rail); the viewer panel
//   fills it, r20 #15171E, the file centred: a page width min(56%, 520px),
//   3:4, at most 92% of the panel's height, r12, ring 1px #FFFFFF@8%.
// - Zoom pill 16 above the panel's bottom, centred: 40 tall, pad 0 14, r999,
//   #FFFFFF@12%, 15 600 white, gap 6, − and + 16 (buttons), the percentage
//   between; 50% to 400%. The page scrolls in the panel when zoomed past it.
// Esc closes; focus starts on Back and returns to what opened the viewer.
// The fetch, the error and the retry are FileViewerScreen's own (signed at
// open, never stored).

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const FileViewerWeb: React.FC<{
  onClose: () => void;
  title: string;
  subtitle?: string;
  menu?: ViewerMenuItem[];
  loading: boolean;
  error: string | null;
  /** Only for a stored file: the record-is-still-here line under the error. */
  stored: boolean;
  onRetry: () => void;
  url: string | null;
  kind: "image" | "pdf" | "unsupported";
}> = ({ onClose, title, subtitle, menu, loading, error, stored, onRetry, url, kind }) => {
  const { rail, sidebarW } = useWebLayout();
  const margin = rail ? 24 : 32;
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(STEPS.indexOf(1));
  const [menuEl, setMenuEl] = useState<HTMLButtonElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const scale = STEPS[step];

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    backRef.current?.focus();
    return () => prev?.focus?.();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !menuOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, menuOpen]);

  const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 999 };
  const pageW = `calc(min(56%, 520px) * ${scale})`;
  const shown = !loading && !error && url && kind !== "unsupported";

  return (
    <div className="fixed top-0 bottom-0 z-[46] flex flex-col bg-cream" style={{ insetInlineStart: sidebarW, insetInlineEnd: 0 }} role="dialog" aria-modal="true" aria-label={title} data-web-viewer>
      <header className="shrink-0 flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)", background: "#15171E" }}>
        <button
          ref={backRef}
          type="button"
          onClick={onClose}
          aria-label={t("Back")}
          className="shrink-0 grid place-items-center hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ ...iconBtn, marginInlineStart: -8 }}
        >
          <ChevronLeft size={20} color="#B8B3C7" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate" style={{ margin: 0, fontSize: 24, lineHeight: "30px", fontWeight: 700, letterSpacing: -0.5, color: "#FFFFFF" }}>
            {title}
          </h1>
          {subtitle && <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: "#B8B3C7" }}>{subtitle}</p>}
        </div>
        {menu && menu.length > 0 && (
          <button
            ref={setMenuEl}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("More options")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="shrink-0 grid place-items-center hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ ...iconBtn, marginInlineEnd: -8, background: menuOpen ? "rgba(255,255,255,0.12)" : undefined }}
          >
            <MoreVertical size={20} color="#B8B3C7" aria-hidden />
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 w-full max-w-[1280px] mx-auto flex flex-col" style={{ padding: `24px ${margin}px`, boxSizing: "border-box" }}>
        <div className="relative flex-1 min-h-0" style={{ borderRadius: 20, background: "#15171E" }} data-web-viewer-panel>
          <div className="absolute inset-0 overflow-auto grid place-items-center" style={{ borderRadius: 20 }}>
            {loading && <Loader2 size={24} className="animate-spin" color="#FFFFFF" aria-label={t("Opening")} />}
            {!loading && error && (
              <div className="flex flex-col items-center text-center" style={{ gap: 6, maxWidth: 320 }} role="alert">
                <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#FFFFFF" }}>{error}</p>
                {stored && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#B8B3C7" }}>{t("The record is still here. Only the attached file couldn’t be loaded.")}</p>}
                <button type="button" onClick={onRetry} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ minHeight: 40, padding: "0 16px", fontSize: 15, fontWeight: 700, color: "#B8ABEA" }}>
                  {t("Retry")}
                </button>
              </div>
            )}
            {shown && kind === "image" && (
              <img
                src={url}
                alt={title}
                className="block object-contain"
                style={{ width: pageW, maxWidth: "none", maxHeight: scale <= 1 ? "92%" : "none", margin: "24px 0", borderRadius: 12, boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
                data-web-viewer-page
              />
            )}
            {shown && kind === "pdf" && (
              <iframe
                title={title}
                src={url}
                style={{ width: pageW, aspectRatio: "3 / 4", maxHeight: scale <= 1 ? "92%" : "none", margin: "24px 0", border: 0, borderRadius: 12, background: "#FBFAF8", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
                data-web-viewer-page
              />
            )}
          </div>
          {shown && (
            <div className="absolute flex" style={{ bottom: 16, left: "50%", transform: "translateX(-50%)", gap: 8 }}>
              <span className="flex items-center" style={{ height: 40, padding: "0 14px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#FFFFFF", gap: 6, fontSize: 15, fontWeight: 600 }} data-web-zoom>
                <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} aria-label={t("Zoom out")} className="grid place-items-center disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ width: 20, height: 20, borderRadius: 999 }}>
                  <Minus size={16} color="#FFFFFF" aria-hidden />
                </button>
                <span aria-live="polite" style={{ minWidth: 44, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  disabled={step === STEPS.length - 1}
                  aria-label={t("Zoom in")}
                  className="grid place-items-center disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ width: 20, height: 20, borderRadius: 999 }}
                >
                  <Plus size={16} color="#FFFFFF" aria-hidden />
                </button>
              </span>
            </div>
          )}
        </div>
      </div>
      {menu && menu.length > 0 && (
        <PopupMenu
          open={menuOpen}
          onClose={() => {
            setMenuOpen(false);
            menuEl?.focus();
          }}
          anchor={menuEl}
          options={menu.map((m) => ({ value: m.key, label: m.label, icon: m.icon, destructive: m.destructive }))}
          onSelect={(v) => menu.find((m) => m.key === v)?.onSelect()}
          width={200}
          align="right"
          variant="health"
        />
      )}
    </div>
  );
};
