import React, { useLayoutEffect } from "react";
import { useApp } from "../../context/AppContext";
import { loadLanguage } from "../../i18n/load";
import type { Language } from "../../i18n/core";
import { arabicFontTask } from "../landing/loading/loader";
import { ANCHOR_OFFSET } from "../landing/navigation";

// FT1 / NV1 v3 (landing update C5, centium/FT1-footer.md and LANGUAGE.md):
// the AR / ENG toggle, the site's only language control, in the footer. It
// sets the same language setting as Settings › Language (the app root's
// persisted `language`, shared with the web app), so a visitor who signs up
// keeps it. Always laid out left to right: AR, then ENG.
//
// Switching in place: the Arabic strings and IBM Plex Sans Arabic are loaded
// first (the font for at most 1.5 s), so no English or fallback frame shows;
// the app then re-renders in the new language. The section in view keeps its
// place: its id and offset are recorded before the switch and restored once
// the page has re-rendered (Arabic text is a little taller).

const LANGS: { code: Language; label: string; name: string }[] = [
  // i18n-ignore: language codes and names, the same on both pages
  { code: "ar", label: "AR", name: "العربية" },
  // i18n-ignore
  { code: "en", label: "ENG", name: "English" },
];

/** The section in view when the language was switched, restored after the re-render. */
let pendingAnchor: { id: string; off: number; at: number } | null = null;

function recordAnchor() {
  const els = document.querySelectorAll<HTMLElement>("main [id][data-screen-label], main article[id], main section[id], #site-footer");
  for (const el of Array.from(els)) {
    const top = el.getBoundingClientRect().top;
    if (top >= ANCHOR_OFFSET) {
      pendingAnchor = { id: el.id, off: top, at: performance.now() };
      return;
    }
  }
  pendingAnchor = null;
}

/** Puts the recorded section back at its offset, re-aimed for a moment while
 *  the page settles, until the visitor scrolls or presses a key. */
function restoreAnchor() {
  const a = pendingAnchor;
  pendingAnchor = null;
  if (!a || performance.now() - a.at > 5000) return;
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  inputs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }));
  const t0 = performance.now();
  const aim = () => {
    const el = document.getElementById(a.id);
    if (stopped || !el) return;
    const d = el.getBoundingClientRect().top - a.off;
    if (Math.abs(d) > 1) window.scrollTo(0, window.scrollY + d);
    if (performance.now() - t0 < 600) requestAnimationFrame(aim);
    else inputs.forEach((ev) => window.removeEventListener(ev, stop));
  };
  aim();
}

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useApp();

  // After a switch, this toggle is a new instance in the re-rendered page.
  useLayoutEffect(() => {
    restoreAnchor();
  }, []);

  const choose = async (code: Language) => {
    if (code === language) return;
    recordAnchor();
    if (code === "ar") {
      try {
        await Promise.all([loadLanguage("ar"), arabicFontTask()]);
      } catch {
        /* the app root loads it again, and falls back to English if it fails */
      }
    }
    setLanguage(code);
  };

  return (
    <div
      role="group"
      // i18n-ok: "Language" in both languages, so the control is findable from either (D8)
      aria-label="Language"
      dir="ltr"
      className="cl-lang"
      style={{ display: "inline-flex", padding: "2px", gap: "0", borderRadius: "999px", background: "#F4F1FC", border: "1px solid rgba(125,103,217,.18)" }}
    >
      {LANGS.map((l) => {
        const on = language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-label={l.name}
            aria-pressed={on}
            onClick={() => void choose(l.code)}
            style={{
              position: "relative",
              minWidth: "34px",
              height: "26px",
              padding: "0 8px",
              border: 0,
              borderRadius: "999px",
              background: on ? "#775FD7" : "transparent",
              color: on ? "#FFFFFF" : "#5B5349",
              fontFamily: 'Manrope, "IBM Plex Sans Arabic", ui-sans-serif, system-ui, sans-serif',
              fontSize: "10.5px",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: ".05em",
              cursor: "pointer",
              transition: "background .2s ease, color .2s ease",
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};
