import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import type { ProfileLoadErrorReason } from "../../services/profile/profileGate";
import { t } from "../../i18n/core";

/**
 * "Couldn't load your account" (Karim, 2026-11-09): what the route guards show
 * a signed-in account whose profile could not be read, IN PLACE OF onboarding.
 *
 * Onboarding is only for an account confirmed to have no profile yet. Shown
 * it after a failed read, an onboarded member was walked through the whole
 * flow again and then refused at the end (the iPhone report this exists for);
 * shown a permanent "Loading…", they would have had no way on at all. This is
 * neither: one sentence on what went wrong, Try again (the read, again), and
 * Sign out as the way out when trying again cannot help (a session the client
 * no longer holds).
 *
 * Laid out like the administrator notice beside these guards in App.tsx: the
 * same full-page cream, the same chip, heading, primary action and the
 * sign-out link under it. The Try again button takes focus, so a keyboard or
 * screen reader lands on the one useful action; the block is an alert, so the
 * reason is announced.
 */
export const AccountLoadError: React.FC<{ reason: ProfileLoadErrorReason }> = ({ reason }) => {
  const { retryProfile, profileRetrying, signOut } = useApp();
  const [signingOut, setSigningOut] = useState(false);

  const line =
    reason === "offline"
      ? t(OFFLINE_MESSAGE)
      : reason === "session"
        ? t("We couldn't confirm you're signed in. Try again, or sign out and sign in again.")
        : t("Check your connection and try again.");

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-cream px-6">
      <div role="alert" aria-live="assertive" className="w-full max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-pale flex items-center justify-center mx-auto">
          <AlertCircle size={22} className="text-primary-dark" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-charcoal">{t("Couldn't load your account")}</h1>
        <p className="text-[13px] text-charcoal-soft leading-relaxed">{line}</p>
        {/* aria-disabled, not disabled, while busy: a disabled button drops
            focus, and a failed retry should leave it where it was. */}
        <Button
          fullWidth
          autoFocus
          disabled={signingOut}
          aria-disabled={profileRetrying}
          aria-busy={profileRetrying}
          className={profileRetrying ? "opacity-60" : undefined}
          onClick={() => {
            if (!profileRetrying) void retryProfile();
          }}
        >
          {profileRetrying ? t("Trying again…") : t("Try again")}
        </Button>
        {/* The app's own signOut: it clears this device's cache and drafts
            first, whatever the server says, so it works with no session. */}
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut();
          }}
          className="tap w-full text-center text-sm font-semibold text-primary disabled:opacity-40"
        >
          {t("Sign out")}
        </button>
      </div>
    </div>
  );
};
