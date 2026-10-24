// Centium landing v29: the phone layer (the main phone and the desktop Food
// and Workout side phones), the prototype markup with exact inline styles.
// The screens are the real app images (assets/dashboard). Loading: 01 and 02
// (intro and hero) eager, the side phones eager on desktop only (they are
// display:none below 1024px, where a lazy image never loads); 03 to 06 and the
// dimmed backdrops are section 01's, so they get their source only after
// loading has ended and the browser is idle (they sit in the fixed phone,
// always "in view", where loading="lazy" would fetch them at once). The
// motion (buildPhone, patchSet, phonePhase, ...) is in motion/phone.ts.

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { SCREENS, screenBackground, type ScreenImage } from "../assets/dashboard";
import { landingState } from "../state";
import type { IntroVals } from "../sections/introVals";

const PHONE_SHELL: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "290px",
  height: "662px",
  marginLeft: "-145px",
  marginTop: "-331px",
  padding: "9px",
  borderRadius: "48px",
  background: "#FFFFFF",
  border: "1px solid rgba(125,103,217,.2)",
  boxShadow: "0 1px 1px rgba(72,58,130,.06),0 10px 24px rgba(72,58,130,.08),0 40px 80px rgba(92,72,168,.14)",
  transformOrigin: "50% 50%",
  opacity: 0,
};
const SCREEN: React.CSSProperties = {
  position: "relative",
  height: "100%",
  borderRadius: "40px",
  background: "#FFFFFF",
  overflow: "hidden",
  border: "1px solid rgba(125,103,217,.08)",
};
const FILL: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" };

/** A screen as AVIF with a WebP fallback; no source at all until `on`. */
const Screen: React.FC<{ img: ScreenImage; on?: boolean; alt: string; style: React.CSSProperties; eager?: boolean } & Record<`data-${string}`, string>> = ({
  img,
  on = true,
  alt,
  style,
  eager,
  ...data
}) => (
  <picture>
    {on && <source type="image/avif" srcSet={img.avif} />}
    <img {...data} src={on ? img.webp : undefined} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" style={style} />
  </picture>
);

const subscribeState = landingState.subscribe;
const getLoaded = () => landingState.get().loaded;

export const PhoneStage: React.FC<{ r: IntroVals }> = ({ r }) => {
  const loaded = useSyncExternalStore(subscribeState, getLoaded, getLoaded);
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!loaded || late) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(() => setLate(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(() => setLate(true), 300);
    return () => window.clearTimeout(t);
  }, [loaded, late]);

  return (
    <div id="phone-layer" style={{ position: r.phoneLayerPos, left: 0, top: 0, width: "100%", height: r.VH, zIndex: 4, pointerEvents: "none" }}>
      <div id="phone-food" aria-hidden="true" style={{ ...PHONE_SHELL, display: r.sideDisp, willChange: "transform,opacity" }}>
        <div style={SCREEN}>
          <Screen img={SCREENS.food07} on={r.lg || late} eager={r.lg} alt="Centium Food screen" style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      </div>
      <div id="phone-work" aria-hidden="true" style={{ ...PHONE_SHELL, display: r.sideDisp, willChange: "transform,opacity" }}>
        <div style={SCREEN}>
          <Screen img={SCREENS.workout08} on={r.lg || late} eager={r.lg} alt="Centium Workout screen" style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      </div>
      <div id="phone" style={PHONE_SHELL}>
        <div style={SCREEN}>
          <div id="dash-view" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div id="dash-in" style={{ position: "absolute", left: 0, top: 0, width: "100%", aspectRatio: "473 / 1600", willChange: "transform" }}>
              <Screen data-base="0" data-eager="" img={SCREENS.empty01} eager alt="Centium client dashboard" style={{ ...FILL, opacity: 1 }} />
              <Screen data-base="1" data-eager="" img={SCREENS.morning02} eager alt="" style={{ ...FILL, opacity: 0 }} />
              <Screen data-base="2" img={SCREENS.afternoon03} on={late} alt="" style={{ ...FILL, opacity: 0 }} />
              <Screen data-base="3" img={SCREENS.full04} on={late} alt="" style={{ ...FILL, height: "auto", opacity: 0 }} />
              <div id="ph-patches" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
              <div id="ph-morph" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "none", background: "#FFFFFF" }} />
              <Screen data-dim="0" img={SCREENS.backdrop05} on={late} alt="" style={{ ...FILL, opacity: 0 }} />
              <Screen data-dim="1" img={SCREENS.backdrop06} on={late} alt="" style={{ ...FILL, opacity: 0 }} />
              <div
                data-card="0"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "6.131%",
                  top: "39.750%",
                  width: "87.738%",
                  height: "20.563%",
                  borderRadius: "4.82% / 6.08%",
                  backgroundImage: late ? screenBackground(SCREENS.classPopup05) : undefined,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "113.976% 486.322%",
                  backgroundPosition: "50.000% 50.039%",
                  opacity: 0,
                  transformOrigin: "50% 100%",
                  willChange: "transform,opacity",
                }}
              />
              <div
                data-card="1"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "5.285%",
                  top: "28.938%",
                  width: "89.429%",
                  height: "42.250%",
                  borderRadius: "4.73% / 2.96%",
                  backgroundImage: late ? screenBackground(SCREENS.coachPopup06) : undefined,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "111.820% 236.686%",
                  backgroundPosition: "50.000% 50.108%",
                  opacity: 0,
                  transformOrigin: "50% 100%",
                  willChange: "transform,opacity",
                }}
              />
              <span data-slot="0" style={{ position: "absolute", left: "4.017%", top: "73.438%", width: "91.966%", height: "11.375%", pointerEvents: "none" }} />
              <span data-slot="1" style={{ position: "absolute", left: "4.440%", top: "61.500%", width: "91.121%", height: "11.375%", pointerEvents: "none" }} />
              <span data-slot="2" style={{ position: "absolute", left: "4.228%", top: "43.125%", width: "45.032%", height: "8.688%", pointerEvents: "none" }} />
              <span data-slot="3" style={{ position: "absolute", left: "4.228%", top: "9.625%", width: "91.543%", height: "7.750%", pointerEvents: "none" }} />
              <span data-slot="4" style={{ position: "absolute", left: "4.228%", top: "9.625%", width: "91.543%", height: "7.750%", pointerEvents: "none" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
