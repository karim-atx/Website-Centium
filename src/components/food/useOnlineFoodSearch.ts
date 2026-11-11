import { useCallback, useRef, useState } from "react";
import { usePremiumOnly } from "../premium/useFreeLimit";
import { searchFoodsOnline } from "../../services/food/onlineSearch";
import type { OnlineFood, OnlineSearchOutcome } from "../../services/food/onlineSearchModel";

// Round D · DP: search online, shared by Add Food's search bar and the AI
// voice logger's unmatched rows (batch B · FO). Moved here out of
// AddFoodSheet as it was, so both screens make the same request and walk the
// same states: one place, not two copies that drift.
//
// Started only by the user's tap (30 an hour), never as they type. The term
// searched opens the online step; `result` is null while it runs; a picked
// result waits on its confirm card until the user saves it.
//
// Round G2: online food search is Premium while the free limits apply. The
// gate travels with the search, so every entry point asks the same way: while
// `locked`, `search` opens the prompt instead and changes nothing.

export interface OnlineFoodSearch {
  /** True while the free limits apply: entry points show the "Premium" label. */
  locked: boolean;
  /** The term searched, or null while the online step is closed. */
  term: string | null;
  /** The outcome, or null while the search runs. */
  result: OnlineSearchOutcome | null;
  /** The result being checked on its confirm card, or null. */
  found: OnlineFood | null;
  setFound: (food: OnlineFood | null) => void;
  /** Searches `term`, or, while locked, opens the Premium prompt. True when a search started. */
  search: (term: string) => boolean;
  /** Closes the online step; an answer still on its way is dropped. */
  close: () => void;
}

export function useOnlineFoodSearch(): OnlineFoodSearch {
  const lock = usePremiumOnly("online_food_search");
  const [term, setTerm] = useState<string | null>(null);
  const [result, setResult] = useState<OnlineSearchOutcome | null>(null);
  const [found, setFound] = useState<OnlineFood | null>(null);
  // Each search and each close bumps the run, so only the latest search's
  // answer is ever shown, and none is shown after the step has closed.
  const run = useRef(0);

  const search = (next: string) => {
    if (lock.locked) {
      lock.ask();
      return false;
    }
    const mine = ++run.current;
    setTerm(next);
    setResult(null);
    setFound(null);
    void searchFoodsOnline(next).then((r) => {
      if (mine === run.current) setResult(r);
    });
    return true;
  };

  // Stable (refs and setters only), so a caller's own useCallback can list it.
  const close = useCallback(() => {
    run.current++;
    setTerm(null);
    setResult(null);
    setFound(null);
  }, []);

  return { locked: lock.locked, term, result, found, setFound, search, close };
}
