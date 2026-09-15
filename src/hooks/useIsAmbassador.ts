import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { isAmbassadorAccount } from "../services/ambassador";

/**
 * Whether the signed-in account is a Centium Ambassador.
 *
 * A HOOK RATHER THAN CONTEXT, unlike isAdmin. That one lives in AppContext
 * because the route guards read it before anything renders and several places
 * depend on it; this answers one badge on one screen, and putting it in
 * context would make every screen in the app pay for a round trip only the
 * profile header uses. If the badge ever appears somewhere else, this is
 * already the shared thing to import.
 *
 * FALSE UNTIL CONFIRMED, and never a badge it has not confirmed: an
 * unanswered check and a "no" should look the same, because the honest
 * default for an unverified status is not having it.
 *
 * KEYED ON THE ACCOUNT IT ASKED ABOUT, the way AppContext keys adminFor, and
 * for the same reason: a bare boolean stays true for one render after the
 * account changes. Deriving it by comparing ids means the answer simply does
 * not apply to a user it was not asked about, so a signed-out render needs no
 * clearing step and one account's badge can never appear on another's.
 */
export function useIsAmbassador(): boolean {
  const { authUserId } = useApp();
  const [checked, setChecked] = useState<{ userId: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void isAmbassadorAccount(authUserId).then((result) => {
      if (cancelled) return;
      setChecked({ userId: authUserId, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  return checked?.userId === authUserId && checked.value;
}
