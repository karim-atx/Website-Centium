import { createContext, useContext, useEffect, useState } from "react";
import { tk } from "../../../i18n/core";

/**
 * What the onboarding flow (Onboarding.tsx) gives every step frame: "Save and
 * exit" (the Finish later? pop-up's primary), the connection state and the
 * step transition. Owned by the shell; lanes read it through ObStep / ObHeader
 * and never re-implement it.
 */
export interface OnboardingFlowApi {
  /**
   * Saves the draft (server, then device) and leaves: signs out and returns to
   * Welcome. Offline it keeps the device copy and returns to Welcome without
   * signing out (signing out clears this device's drafts). Resolves with an
   * error message when the server refused the save, so the pop-up can offer
   * "Try again".
   */
  saveAndExit: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** navigator.onLine, followed live. */
  online: boolean;
  /** Plays the step transition out (180 ms), then runs `then`. */
  leave: (then: () => void) => void;
  /** True while the out transition plays. */
  leaving: boolean;
}

export const OnboardingFlowContext = createContext<OnboardingFlowApi | null>(null);

export function useOnboardingFlow(): OnboardingFlowApi | null {
  return useContext(OnboardingFlowContext);
}

/** navigator.onLine, live. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// Strings shared by every lane (OURS-step-states, OURS-finish-later-*).
// English keys (tk); every screen shows them through t().
export const OB_STRINGS = {
  saveError: tk("Couldn't save this step. Check your connection and try again."),
  tryAgain: tk("Try again"),
  offlineStep: tk("You're offline. Your answers are saved on this device and will sync when you're back."),
  offlineSubmit: tk("Connect to the internet to submit."),
  backOnline: tk("Back online. Your answers are saved."),
  uploading: tk("Uploading…"),
  uploadFailed: tk("Upload failed. Check your connection and try again."),
  submitting: tk("Submitting…"),
  statusLoadError: tk("Couldn't load your review status. Try again."),
  finishLaterTitle: tk("Finish later?"),
  finishLaterBody: tk("Everything so far is saved. Sign in again to pick up on this step."),
  finishLaterOffline: tk("You're offline. Your answers are saved on this device."),
  finishLaterError: tk("Couldn't save. Your answers are still on this device."),
  saveAndExit: tk("Save and exit"),
  keepGoing: tk("Keep going"),
} as const;
