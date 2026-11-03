import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { MARK_LEAF_PATH } from "../../../components/icons/CentiumMark";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { ObWebLogo } from "../shell/ObShell";
import { COMP, OB, type Composition } from "../shell/visuals";
import { t } from "../../../i18n/core";

// Website viewport v1 · WC-OB Onboarding & auth, the parts drawn only from
// 1024px wide (WC-OB Onboarding Web v4.dc.html). The rest of the web layout is
// onboarding.web.css on the mobile screens themselves.

/** A COMP drawing filling its box (the reference's comp(name, "100%", "100%")). */
const Fill: React.FC<{ comp: Composition }> = ({ comp }) => (
  <svg viewBox={COMP[comp].vb} width="100%" height="100%" aria-hidden style={{ overflow: "visible", display: "block", position: "relative" }}>
    {COMP[comp].leaves.map((l, i) => (
      <path key={i} d={MARK_LEAF_PATH} fill={l.f} transform={l.t || undefined} />
    ))}
  </svg>
);

/**
 * WC-OB.1 Welcome on web: the three panels side by side (no carousel), Get
 * started 44 at max 640 and "I already have an account". Get started takes the
 * mobile flow's reduced-motion path (a 200 ms fade into Create your account):
 * the logo animation is drawn for the 390 phone frame and the web reference
 * has none.
 */
export const WelcomeWeb: React.FC<{
  panels: { eb: string; h: string; s: string; comp: Composition }[];
  onGetStarted: () => void;
  onSignIn: () => void;
}> = ({ panels, onGetStarted, onSignIn }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    if (fadeOut) return;
    setFadeOut(true);
    timer.current = window.setTimeout(onGetStarted, 200);
  };
  return (
    <div className="ob" data-web="welcome" style={fadeOut ? { opacity: 0, transition: "opacity 200ms linear" } : undefined}>
      <div style={{ flex: "none", display: "flex", justifyContent: "center" }}>
        <ObWebLogo />
      </div>
      <div className="ob-web-panels">
        {panels.map((p) => (
          <section key={p.eb} className="ob-web-panel-card" aria-label={t(p.eb)}>
            <div style={{ position: "relative", flex: 1, minHeight: 180 }}>
              <div className="ob-web-rings" aria-hidden>
                <span style={{ inset: 0, border: "1px solid var(--ob-ring-outer)" }} />
                <span style={{ inset: "10.7%", border: "1px solid var(--ob-ring)" }} />
                <span style={{ inset: "21.3%", border: "1px solid var(--ob-ring)" }} />
                <span style={{ inset: "13.3%", background: "var(--ob-halo)" }} />
                <span style={{ inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 0 }}>
                  <span style={{ position: "relative", display: "block", width: p.comp === "personal" ? "50%" : "76.7%", height: "50%" }}>
                    <Fill comp={p.comp} />
                  </span>
                </span>
              </div>
            </div>
            <p className="ob-eb" style={{ marginTop: 20 }}>
              {t(p.eb)}
            </p>
            <h2 className="ob-web-panel-h">{t(p.h)}</h2>
            <p className="ob-web-panel-s">{t(p.s)}</p>
          </section>
        ))}
      </div>
      <div style={{ flex: "none", width: "100%", maxWidth: 640, margin: "0 auto" }}>
        <button type="button" className="ob-btn ob-btn-primary ob-web-start" onClick={start}>
          {t("Get started")}
        </button>
        <button type="button" className="ob-web-have hit" onClick={onSignIn}>
          {t("I already have an account")}
        </button>
      </div>
    </div>
  );
};

/** The three-leaf art of You're all set's panel (BizOnboardingV10 `A` v, k 1…4). */
export const ReadyPanel: React.FC<{ k: number; v: number }> = ({ k, v }) => {
  const reduced = useReducedMotion();
  const trans = reduced ? "none" : "transform 300ms cubic-bezier(0.22,1,0.36,1)";
  return (
    <div className="ob-web-panel" data-ob="panel" aria-hidden>
      <div style={{ position: "relative", width: "min(420px, 80%)", aspectRatio: "1 / 1" }}>
        {["0%", "11%", "22%"].map((inset, i) => (
          <span key={inset} style={{ position: "absolute", inset, borderRadius: 999, border: "1px solid var(--ob-ring)", opacity: i === 0 ? 0.6 : 1 }} />
        ))}
        <svg viewBox="0 0 100 100" style={{ position: "absolute", left: "15%", top: "15%", width: "70%", height: "70%", overflow: "visible" }}>
          {(k === 1 ? [0] : [0, -45, -90]).map((r, i) => (
            <g key={r} style={{ transform: `rotate(${r * v}deg)`, transformOrigin: "50px 80px", transition: trans }}>
              <path d={MARK_LEAF_PATH} fill={[OB.leaf, OB.lav, OB.brand][i]} transform="translate(50 80) scale(0.12) translate(-566 -884)" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

/**
 * WC-OB.6 What brings you to Centium? on web: three cards in a row (tile and
 * radio, title and line, the two points at the foot), the Personal pair and
 * the professional's code under the row. Same selection, keyboard and
 * Continue motion as the mobile ObSelectCard.
 */
export const AccountTypeCardsWeb: React.FC<{
  cards: { key: string; comp: Composition; title: string; desc: string; points: string[]; tile: "pale" | "teal"; dot: string }[];
  selected: string | null;
  leaving: boolean;
  onSelect: (key: string) => void;
  label: string;
  below?: React.ReactNode;
}> = ({ cards, selected, leaving, onSelect, label, below }) => (
  <div>
    <div className="ob-web-cards" role="radiogroup" aria-label={label}>
      {cards.map((c) => {
        const on = selected === c.key;
        const recede = !!selected && !on;
        return (
          <div
            key={c.key}
            role="radio"
            aria-checked={on}
            tabIndex={on || !recede ? 0 : -1}
            className="ob-wcard"
            data-recede={recede && !leaving ? "true" : undefined}
            data-gone={leaving && !on ? "true" : undefined}
            data-lift={leaving && on ? "true" : undefined}
            onClick={() => onSelect(c.key)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onSelect(c.key);
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <span className="ob-wcard-tile" style={{ background: c.tile === "teal" ? "var(--ob-teal-pale)" : "var(--ob-pale)" }}>
                <span className="ob-wcard-ring" />
                <span style={{ position: "relative", display: "flex", transform: on ? "rotate(-7.5deg)" : "none", transition: "transform 500ms var(--ob-ease)" }}>
                  <svg viewBox={COMP[c.comp].vb} width={40} height={40} aria-hidden style={{ overflow: "visible", display: "block" }}>
                    {COMP[c.comp].leaves.map((l, i) => (
                      <path key={i} d={MARK_LEAF_PATH} fill={l.f} transform={l.t || undefined} />
                    ))}
                  </svg>
                </span>
              </span>
              <span className="ob-wcard-radio">{on && <Check size={12} strokeWidth={3} />}</span>
            </div>
            <span style={{ minWidth: 0 }}>
              <span className="ob-wcard-t">{c.title}</span>
              <span className="ob-wcard-d">{c.desc}</span>
            </span>
            <div className="ob-wcard-pts">
              {c.points.map((p) => (
                <span key={p} className="ob-wcard-pt">
                  <span style={{ background: c.dot }} />
                  {p}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
    {below}
  </div>
);
