import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { clientSessionVerdict } from "../../services/profile";
import { ACCOUNT_TYPE_SET, type FinishRefusal } from "../../services/profile/finishErrors";
import { t } from "../../i18n/core";

/**
 * The end of onboarding, for the two refusals that are not "try again"
 * (services/profile/finishErrors; Karim, 2026-11-09). Shared by the three
 * finishes: the client's (Onboarding), the professional's (ProLane) and the
 * business's (BusinessLane, whose submit ends in Onboarding's finish).
 *
 * NOT SIGNED IN AS THIS ACCOUNT. The iPhone report's finish failed at its
 * first write, the legal_acceptances insert, which only fails that way: a
 * member may insert their own row, anon has no grant. "Couldn't finish
 * setting up your account. Try again." was the wrong thing to say, because
 * trying again could not work. The flow gives way to the account-load screen
 * instead ("Couldn't load your account", Try again, Sign out) through
 * reportAccountLoadProblem: the guard around onboarding shows it, and Try
 * again brings the flow back (its draft is kept) once the account reads as
 * itself. Checked BEFORE the first write as well (`sessionReady`), so a
 * missing or foreign client session never gets as far as a refused insert.
 *
 * ATXG1. The Database refuses an onboarded account's update that would
 * change its account type or un-onboard it. That account is already set up,
 * so the profile is read again and, if it says onboarded, the member goes
 * into the app (/app, where the professional and business landings already
 * branch, as RedirectIfOnboarded does). Only a re-read that says otherwise
 * shows "Your account type is set when you sign up."
 */
export function useFinishRefusal() {
  const { authUserId, reportAccountLoadProblem, retryProfile } = useApp();
  const navigate = useNavigate();

  /** False (and the account-load screen shown) when the client is not signed in as this account. */
  const sessionReady = useCallback(async (): Promise<boolean> => {
    if (!authUserId) return true; // the callers' own "You're signed out" line covers it
    // "offline" goes on: the write fails as offline and says so.
    if ((await clientSessionVerdict(authUserId)) !== "mismatch") return true;
    reportAccountLoadProblem("session");
    return false;
  }, [authUserId, reportAccountLoadProblem]);

  /**
   * Acts on a refused finish write. Null when it was neither refusal (the
   * caller shows its own line). Otherwise the finish's outcome: `message` is
   * the line to show, or absent when the screen already moved on.
   */
  const takeOver = useCallback(
    async (refusal: FinishRefusal | null | undefined): Promise<{ ok: boolean; message?: string } | null> => {
      if (refusal === "session") {
        reportAccountLoadProblem("session");
        return { ok: false };
      }
      if (refusal !== "accountTypeSet") return null;
      const read = await retryProfile();
      if (read.status === "ok" && read.onboarded) {
        navigate("/app", { replace: true });
        return { ok: true };
      }
      // A read that failed is the account-load screen already (retryProfile).
      if (read.status === "error") return { ok: false };
      return { ok: false, message: t(ACCOUNT_TYPE_SET) };
    },
    [navigate, reportAccountLoadProblem, retryProfile]
  );

  return useMemo(() => ({ sessionReady, takeOver }), [sessionReady, takeOver]);
}
