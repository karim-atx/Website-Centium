// iPhone Dynamic Type (App QA, iPhone Round 1 PR 10). The phone's text size
// (Settings > Display & Brightness > Text Size, and Accessibility > Larger
// Text) reaches the app's WebView as a percent from nativeTextZoom(): 100 at
// the default size, at most `max` (200). iOS doesn't apply it to web content,
// so the website does: text-size-adjust on <html>, which scales every font
// size and fixed line height (inline ones too) without changing the layout's
// width. Android's WebView applies the same percent itself (textZoom), so
// nothing is done there; a browser has nothing to apply.
//
// Where: the app's phone layouts only. index.css sets text-size-adjust from
// --native-text-zoom only on html.native-text-zoom and below 1024px; the web
// layouts (1024px and wider) and the landing pages (.centium-site) keep 100%.
//
// Larger text (the app's own +2px, about x1.2) goes on top, keeping the total
// within `max` (ROUND_K.md D-ET1): with it on, the phone's percent is capped
// at max / 1.2. Form fields never compute under 16px, so iOS never zooms in
// on focus: below 100% their floor is raised to 16px / the percent.
//
// It follows the phone: asked at start, on the "textZoom" event (the phone's
// size changed) and when the app comes back to the front.
import { App } from "@capacitor/app";
import { platform } from "./index";
import { CentiumNative } from "./native";
import { nativeTextZoom } from "./nativeShell";
import { appliedTextZoom, textZoomStyle } from "./textZoomModel";

let larger = false;
let phone: { percent: number; max: number } | null = null;
let started = false;

function apply(): void {
  const root = document.documentElement;
  const s = textZoomStyle(phone ? appliedTextZoom(phone.percent, phone.max, larger) : 100);
  root.classList.toggle("native-text-zoom", s.on);
  if (s.zoom) root.style.setProperty("--native-text-zoom", s.zoom);
  else root.style.removeProperty("--native-text-zoom");
  if (s.fieldMin) root.style.setProperty("--native-field-min", s.fieldMin);
  else root.style.removeProperty("--native-field-min");
}

async function refresh(): Promise<void> {
  phone = await nativeTextZoom();
  apply();
}

/**
 * Called with the Larger text setting whenever it settles or changes
 * (AppContext). The first call on iOS starts following the phone's size.
 */
export function followNativeTextZoom(largerText: boolean): void {
  if (platform() !== "ios") return;
  larger = largerText;
  if (started) return apply();
  started = true;
  void refresh();
  // The phone's size changed while the app was open (App PR 1); builds without the event reject.
  CentiumNative.addListener("textZoom", () => void refresh()).catch(() => {});
  // Changed in Settings while the app was in the background.
  App.addListener("resume", () => void refresh()).catch(() => {});
}
