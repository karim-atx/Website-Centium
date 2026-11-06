// The camera on the phone (App-Centium ROUND_J.md §4): a full-screen barcode
// scanner, a report's text read on the phone, and a photo taken inside
// Centium that never reaches the gallery.
//
// NOTHING NEW LEAVES THE PHONE. A barcode's number still goes where it went
// (the food lookup, the pass check-in); a photo or a report goes up only
// where the website already uploads one, by the website's own code. Report
// text never leaves.
//
// Shown only where all three agree: the app, the "native_camera" switch
// (app_config), and a build that has the feature. Everywhere else the
// website's own camera code (getUserMedia, tesseract.js) carries on.
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useEffect, useState } from "react";
import { nativeFeatureOn } from "./appConfig";
import type { CameraCancel, CameraModule, ScanFeedback, ScanResult } from "./contracts";
import { featureAvailable } from "./features";
import { isNative } from "./index";

type Parts = { scan: boolean; readText: boolean; capture: boolean };

interface CentiumCameraPlugin {
  available(): Promise<Parts>;
  scan(opts: { kind: "food" | "pass"; prompt: string; alt?: string }): Promise<ScanResult>;
  scanContinuous(opts: { kind: "pass"; prompt: string; alt?: string }): Promise<CameraCancel>;
  scanFeedback(opts: ScanFeedback): Promise<{ shown: boolean }>;
  stopScan(): Promise<void>;
  capturePhoto(opts: { purpose: "progress" | "report" }): Promise<{ data: string; mimeType: string } | CameraCancel>;
  readText(opts: { data: string; mimeType: string; pages?: number[] }): Promise<{ pages: string[] }>;
  prepareReader(): Promise<{ ready: boolean; reason?: "offline" | "failed" }>;
  protectScreen(opts: { on: boolean }): Promise<void>;
  openSettings(): Promise<void>;
  addListener(eventName: "scan", listener: (r: { code: string; format: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "readerProgress", listener: (r: { fraction: number }) => void): Promise<PluginListenerHandle>;
}

const CentiumCamera = registerPlugin<CentiumCameraPlugin>("CentiumCamera");

const NONE: Parts = { scan: false, readText: false, capture: false };
let parts: Promise<Parts> | null = null;

/** Base64 of a file, for the bridge (which carries strings). */
function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fromBase64(data: string, type: string): Blob {
  const bytes = atob(data);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
  return new Blob([out], { type });
}

const stamp = () => new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export const camera: CameraModule = {
  available() {
    if (!parts) {
      parts = featureAvailable("camera").then(async (a) => {
        if (!a.ok) return NONE;
        return CentiumCamera.available().catch(() => NONE);
      });
    }
    // The switch is read each time: the server can turn it off while the app runs.
    return parts.then((p) => (nativeFeatureOn("native_camera") ? p : NONE));
  },
  scan: ({ kind, prompt, alt }) => CentiumCamera.scan({ kind, prompt, ...(alt ? { alt } : {}) }),
  async scanContinuous({ prompt, alt, onCode, onClosed }) {
    const handle = await CentiumCamera.addListener("scan", (r) => {
      void onCode(r).then(
        (feedback) => CentiumCamera.scanFeedback(feedback),
        // No answer: the scanner moves on by itself after a few seconds.
        () => undefined,
      );
    });
    void CentiumCamera.scanContinuous({ kind: "pass", prompt, ...(alt ? { alt } : {}) })
      .then(
        (r) => r.reason,
        () => "failed" as const,
      )
      .then((reason) => {
        void handle.remove();
        onClosed(reason);
      });
    return { stop: () => CentiumCamera.stopScan() };
  },
  async readText(file, opts) {
    const data = await toBase64(file);
    return CentiumCamera.readText({ data, mimeType: file.type, ...(opts?.pages ? { pages: opts.pages } : {}) });
  },
  async prepareReader(onDownload) {
    const handle = onDownload ? await CentiumCamera.addListener("readerProgress", (r) => onDownload(r.fraction)) : null;
    try {
      return await CentiumCamera.prepareReader().catch(() => ({ ready: false, reason: "failed" as const }));
    } finally {
      void handle?.remove();
    }
  },
  async capturePhoto({ purpose }) {
    const r = await CentiumCamera.capturePhoto({ purpose });
    if ("cancelled" in r) return r;
    const file = new File([fromBase64(r.data, r.mimeType)], `${purpose === "progress" ? "progress" : "report"}-${stamp()}.jpg`, { type: r.mimeType });
    return { file };
  },
  protectScreen: (on) => CentiumCamera.protectScreen({ on }),
  openSettings: () => CentiumCamera.openSettings(),
};

/**
 * What the phone's camera can do here: all false in a browser, and null in
 * the app until it has answered (so a screen doesn't start the website's own
 * camera meanwhile).
 */
export function useNativeCamera(): Parts | null {
  const [p, setP] = useState<Parts | null>(() => (isNative() ? null : NONE));
  useEffect(() => {
    let live = true;
    void camera.available().then((a) => live && setP(a));
    return () => {
      live = false;
    };
  }, []);
  return p;
}

/**
 * Blocks screenshots and the Recents preview while the calling screen is
 * shown (progress photos, Karim D14). Nothing in a browser. Not tied to the
 * native_camera switch: it is privacy, not the camera.
 */
export function useProtectedScreen(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    let live = true;
    let protectedNow = false;
    void featureAvailable("camera").then((a) => {
      if (!a.ok || !live) return;
      protectedNow = true;
      void camera.protectScreen(true).catch(() => undefined);
    });
    return () => {
      live = false;
      if (protectedNow) void camera.protectScreen(false).catch(() => undefined);
    };
  }, [on]);
}
