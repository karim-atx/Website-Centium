import React, { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { forumAccess } from "../../services/forum/rules";
import { supportOpen, usePremium } from "../../services/premium/hooks";
import type { PremiumFeature } from "../../services/premium/features";
import { localDay, mayPrompt, promptAllowed, promptStorageKey } from "../../services/premium/model";
import { PremiumPromptSheet } from "./PremiumPrompt";

// Round G1 · the upgrade prompt's rules on screen (decision G6, the pure
// rules in services/premium/model): never while the switch is off or
// loading, with Premium, in recovery-sensitive mode (may_prompt_upgrade false
// or still loading), on Get support or over its popup, for under-18s (or an
// unknown age), and at most once per feature per day.

function readDay(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeDay(key: string, day: string): void {
  try {
    window.localStorage.setItem(key, day);
  } catch {
    // Blocked storage only loses the once-a-day memory; the other rules still hold.
  }
}

/** The rules' inputs from the app: the member's age band, the route and the account. */
export function usePromptPlace() {
  const { user, authUserId } = useApp();
  const { pathname } = useLocation();
  return { age: forumAccess(user.dateOfBirth), path: pathname, userId: authUserId };
}

/**
 * The prompt for one feature: `prompt()` opens the sheet when every rule
 * allows it (and returns whether it did); `sheet` renders it. A feature
 * screen calls `prompt()` where its free limit is felt (wired with G2).
 */
export function usePremiumPrompt(feature: PremiumFeature): { prompt: () => boolean; allowed: boolean; sheet: React.ReactNode } {
  const { premium } = usePremium();
  const place = usePromptPlace();
  const [open, setOpen] = useState(false);
  const allowed = promptAllowed({ premium, age: place.age, path: place.path, inSupport: supportOpen() });

  const prompt = useCallback(() => {
    if (!place.userId) return false;
    const key = promptStorageKey(place.userId, feature);
    const today = localDay(new Date());
    if (!mayPrompt({ premium, age: place.age, path: place.path, inSupport: supportOpen(), lastShownDay: readDay(key), today })) return false;
    writeDay(key, today);
    setOpen(true);
    return true;
  }, [premium, place.userId, place.age, place.path, feature]);

  return { prompt, allowed, sheet: <PremiumPromptSheet open={open} feature={feature} premium={premium} onClose={() => setOpen(false)} /> };
}
