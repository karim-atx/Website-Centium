// Centium landing v29: the real app screens in the phone (handover
// 05_dashboard), as AVIF with a WebP fallback, Vite-imported so the URLs are
// hashed. Encoded from Karim's 1170px originals (dashboard-captures/output and
// output-food-workout; same framing as 05_dashboard/screens, checked by a
// per-pixel comparison: mean absolute difference 0.5 to 1.6 of 255) at 2x the
// largest displayed width: 720px for the phone screens (268px screen at the
// hero's 1.33 scale on a 430px phone), 460px for the desktop side phones
// (at most 0.85 x 268px). The two dimmed backdrops have no higher-resolution
// source and keep their native 473px.

import empty01Avif from "./01-empty.avif";
import empty01Webp from "./01-empty.webp";
import morning02Avif from "./02-morning.avif";
import morning02Webp from "./02-morning.webp";
import afternoon03Avif from "./03-afternoon.avif";
import afternoon03Webp from "./03-afternoon.webp";
import full04Avif from "./04-full.avif";
import full04Webp from "./04-full.webp";
import classPopup05Avif from "./05-class-popup.avif";
import classPopup05Webp from "./05-class-popup.webp";
import coachPopup06Avif from "./06-coach-popup.avif";
import coachPopup06Webp from "./06-coach-popup.webp";
import food07Avif from "./07-food.avif";
import food07Webp from "./07-food.webp";
import workout08Avif from "./08-workout.avif";
import workout08Webp from "./08-workout.webp";
import backdrop05Avif from "./05-backdrop.avif";
import backdrop05Webp from "./05-backdrop.webp";
import backdrop06Avif from "./06-backdrop.avif";
import backdrop06Webp from "./06-backdrop.webp";

export interface ScreenImage {
  avif: string;
  webp: string;
}

export const SCREENS = {
  empty01: { avif: empty01Avif, webp: empty01Webp },
  morning02: { avif: morning02Avif, webp: morning02Webp },
  afternoon03: { avif: afternoon03Avif, webp: afternoon03Webp },
  full04: { avif: full04Avif, webp: full04Webp },
  classPopup05: { avif: classPopup05Avif, webp: classPopup05Webp },
  coachPopup06: { avif: coachPopup06Avif, webp: coachPopup06Webp },
  food07: { avif: food07Avif, webp: food07Webp },
  workout08: { avif: workout08Avif, webp: workout08Webp },
  backdrop05: { avif: backdrop05Avif, webp: backdrop05Webp },
  backdrop06: { avif: backdrop06Avif, webp: backdrop06Webp },
} satisfies Record<string, ScreenImage>;

/** The phone's four base screens in prototype order (SRC 0..3: dash15-01..04). */
export const BASE_SCREENS: ScreenImage[] = [SCREENS.empty01, SCREENS.morning02, SCREENS.afternoon03, SCREENS.full04];

let imageSetOk: boolean | null = null;

/** A CSS background-image value for a screen: image-set() with AVIF first
 *  where the browser takes it, else the WebP alone. */
export function screenBackground(img: ScreenImage): string {
  if (imageSetOk == null) {
    try {
      imageSetOk = typeof CSS !== "undefined" && CSS.supports("background-image", 'image-set(url("a.avif") type("image/avif") 1x)');
    } catch {
      imageSetOk = false;
    }
  }
  return imageSetOk ? `image-set(url("${img.avif}") type("image/avif") 1x, url("${img.webp}") type("image/webp") 1x)` : `url("${img.webp}")`;
}
