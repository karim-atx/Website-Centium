// app_config's answer as the app uses it (Database DB-Z1). Pure, so it is
// unit-tested without a phone or a server (appConfigModel.test.ts).

export type NativeFeature =
  | "health_sync"
  | "purchases"
  | "wallet_passes"
  | "nfc_check_in"
  | "live_activities"
  | "siri"
  | "calendar_sync"
  | "voip_calls"
  | "home_widgets"
  | "native_camera"
  // App-Centium Round K (ROUND_K.md D-BK3; Database DB-Z8).
  | "biometric_unlock";

export interface AppConfig {
  /** The app's own version, as sent (package.json's version on both platforms). */
  appVersion: string | null;
  mustUpdate: boolean;
  updateAvailable: boolean;
  latestVersion: string | null;
  storeUrl: string | null;
  noticeKey: string | null;
  /** Only switches the server turned OFF are listed as false; anything else is on. */
  features: Partial<Record<NativeFeature, boolean>>;
}

export const FAIL_OPEN: AppConfig = {
  appVersion: null,
  mustUpdate: false,
  updateAvailable: false,
  latestVersion: null,
  storeUrl: null,
  noticeKey: null,
  features: {},
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** app_config's one row -> AppConfig; anything unreadable falls back to FAIL_OPEN's value. */
export function parseAppConfig(data: unknown, appVersion: string | null): AppConfig {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined;
  if (!row || typeof row !== "object") return { ...FAIL_OPEN, appVersion };
  const features: AppConfig["features"] = {};
  if (row.features && typeof row.features === "object") {
    for (const [k, v] of Object.entries(row.features as Record<string, unknown>)) {
      if (v === false) features[k as NativeFeature] = false;
    }
  }
  // Only an https link is followed (it leaves the app for the store).
  const raw = str(row.store_url);
  const storeUrl = raw && /^https:\/\//.test(raw) ? raw : null;
  return {
    appVersion,
    // Forcing an update with nowhere to send people would be a dead end.
    mustUpdate: row.must_update === true && storeUrl !== null,
    updateAvailable: row.update_available === true && storeUrl !== null,
    latestVersion: str(row.latest_version),
    storeUrl,
    noticeKey: str(row.notice_key),
    features,
  };
}
