import { createContext, useContext, useEffect, useState } from "react";

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
export const OB_STRINGS = {
  saveError: "Couldn't save this step. Check your connection and try again.",
  tryAgain: "Try again",
  offlineStep: "You're offline. Your answers are saved on this device and will sync when you're back.",
  offlineSubmit: "Connect to the internet to submit.",
  backOnline: "Back online. Your answers are saved.",
  uploading: "Uploading…",
  uploadFailed: "Upload failed. Check your connection and try again.",
  submitting: "Submitting…",
  statusLoadError: "Couldn't load your review status. Try again.",
  finishLaterTitle: "Finish later?",
  finishLaterBody: "Everything so far is saved. Sign in again to pick up on this step.",
  finishLaterOffline: "You're offline. Your answers are saved on this device.",
  finishLaterError: "Couldn't save. Your answers are still on this device.",
  saveAndExit: "Save and exit",
  keepGoing: "Keep going",
} as const;
