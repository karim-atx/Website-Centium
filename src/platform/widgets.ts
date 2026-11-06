// Home-screen widgets on the phone (App-Centium ROUND_J.md §5.1): steps,
// water, today's habits and today's workout, read-only (D8).
//
// The website writes a small snapshot whenever these values load or change;
// the phone keeps it on the device and draws the widgets from it. Nothing is
// sent anywhere. While recovery-sensitive mode is on or unknown
// (`hideNumbers`), the widgets show no figure at all; the phone enforces that
// too, so a snapshot may carry the figures either way.
//
// Shown only where all three agree: the app, the "home_widgets" switch
// (app_config), and a build that has the feature. Switched off, the widgets
// are cleared and say to open Centium.
import { registerPlugin } from "@capacitor/core";
import { nativeFeatureOn, onAppConfig } from "./appConfig";
import type { WidgetKind, WidgetSnapshot, WidgetsModule } from "./contracts";
import { featureAvailable } from "./features";
import { isNative } from "./index";

interface CentiumWidgetsPlugin {
  update(options: { snapshot: WidgetSnapshot }): Promise<void>;
  clear(): Promise<void>;
  setShortcuts(options: { on: boolean }): Promise<void>;
  pin(options: { kind: WidgetKind }): Promise<{ ok: boolean }>;
}

export const CentiumWidgets = registerPlugin<CentiumWidgetsPlugin>("CentiumWidgets");

let watching = false;

/** The server switching widgets off clears them, once per switch-off. */
function watchSwitch(): void {
  if (watching || !isNative()) return;
  watching = true;
  let wasOn = nativeFeatureOn("home_widgets");
  onAppConfig(() => {
    const on = nativeFeatureOn("home_widgets");
    if (wasOn && !on) void CentiumWidgets.clear().catch(() => undefined);
    wasOn = on;
  });
}

export const widgets: WidgetsModule = {
  async available() {
    const a = await featureAvailable("widgets");
    if (a.ok) watchSwitch();
    return { ok: a.ok && nativeFeatureOn("home_widgets") };
  },
  async update(snapshot) {
    if (!(await widgets.available()).ok) return;
    await CentiumWidgets.update({ snapshot });
  },
  async clear() {
    if (!(await featureAvailable("widgets")).ok) return;
    await CentiumWidgets.clear();
  },
  async pin(kind) {
    if (!(await widgets.available()).ok) return { ok: false };
    return CentiumWidgets.pin({ kind }).catch(() => ({ ok: false }));
  },
};
