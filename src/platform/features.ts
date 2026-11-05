// Whether this app build has a Round J feature (App-Centium ROUND_J.md §1.1).
//
// A control that only works in the app shows when three things are true:
// isNative(), the server's kill switch (nativeFeatureOn, app_config) and this
// answer. The last is false in a browser, false on a platform whose native
// half isn't built yet (iOS until Apple enrollment), and false on an older
// app build that doesn't know the feature: there the call rejects as
// unimplemented, which counts as no.
//
// The answer is asked once per feature and kept for the page's life; a
// `reason` (e.g. Health Connect needs installing) is passed on so the screen
// can say what to do.
import { isNative } from "./index";
import { CentiumNative, type RoundJFeature } from "./native";

export type { RoundJFeature };

export type FeatureAvailability = { ok: boolean; reason?: string };

const NO: FeatureAvailability = { ok: false, reason: "not_native" };
const asked = new Map<RoundJFeature, Promise<FeatureAvailability>>();

export function featureAvailable(feature: RoundJFeature): Promise<FeatureAvailability> {
  if (!isNative()) return Promise.resolve(NO);
  let answer = asked.get(feature);
  if (!answer) {
    answer = CentiumNative.available({ feature }).then(
      (a) => ({ ok: a.ok === true, ...(a.reason ? { reason: a.reason } : {}) }),
      () => ({ ok: false, reason: "unsupported" }),
    );
    asked.set(feature, answer);
  }
  return answer;
}

/** Ask again (Health Connect may have been installed meanwhile). */
export function forgetFeatureAnswer(feature: RoundJFeature): void {
  asked.delete(feature);
}
