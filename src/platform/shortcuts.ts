// App shortcuts on the phone (App-Centium ROUND_J.md §5.2): long-press the
// icon for "Log water", "Start a workout", "Start a meditation" and "Show my
// gym pass". Each opens its page through the same path as a widget or a
// notification (NativeOpenPath).
//
// On for a signed-in, onboarded member; off otherwise (a sign-out removes
// them on the phone's side too). The phone labels them in the app's language
// and relabels them when it changes. The "siri" switch (app_config) covers
// them, as it will iOS's App Shortcuts.
import { nativeFeatureOn, onAppConfig } from "./appConfig";
import { featureAvailable } from "./features";
import { isNative } from "./index";
import { CentiumWidgets } from "./widgets";

let wanted = false;
let applied: boolean | null = null;
let watching = false;

function apply(): void {
  const on = wanted && nativeFeatureOn("siri");
  if (on === applied) return;
  applied = on;
  void featureAvailable("shortcuts").then((a) => {
    if (!a.ok) return;
    CentiumWidgets.setShortcuts({ on }).catch(() => {
      applied = null;
    });
  });
}

/** Whether the shortcuts should be there: a signed-in, onboarded member. */
export function syncShortcuts(on: boolean): void {
  if (!isNative()) return;
  wanted = on;
  if (!watching) {
    watching = true;
    onAppConfig(apply);
  }
  apply();
}
