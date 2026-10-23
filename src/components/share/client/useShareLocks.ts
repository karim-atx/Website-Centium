import { useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { forumAccess } from "../../../services/forum/rules";
import { shareLocks, type ShareLocks } from "../shareLocks";

/**
 * D-28 for the signed-in client: recovery = recoverySensitive or
 * recoveryModePending (pending fails closed, as the app's other recovery
 * gates do); age = forumAccess(dateOfBirth) (no date of birth fails closed).
 */
export function useShareLocks(): ShareLocks {
  const { recoverySensitive, recoveryModePending, user } = useApp();
  const recovery = recoverySensitive || recoveryModePending;
  const age = forumAccess(user.dateOfBirth);
  return useMemo(() => shareLocks({ recovery, age }), [recovery, age]);
}
