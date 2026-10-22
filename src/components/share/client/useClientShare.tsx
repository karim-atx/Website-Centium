import { useCallback, useState } from "react";
import { ClientShareSheet } from "./ClientShareSheet";
import { templateAllowed, type ClientCardSpec } from "./clientCardModel";
import { useShareLocks } from "./useShareLocks";

/**
 * The host screens' handle on the client share flow (C-SH.1): `open(spec)`
 * opens the sheet for a card built from the screen's real data, `sheet` is
 * rendered once by the host, `locks` says which entries exist (D-28: the
 * food day and the streak in recovery mode). `onClosed` runs when the flow
 * ends (the sheet closed, or its confirmation strip done). D-30: nothing is
 * logged.
 */
export function useClientShare(onClosed?: () => void) {
  const locks = useShareLocks();
  const [spec, setSpec] = useState<ClientCardSpec | null>(null);
  const open = useCallback(
    (s: ClientCardSpec | null) => {
      if (s && templateAllowed(s.template, locks)) setSpec(s);
    },
    [locks],
  );
  const onClose = useCallback(() => {
    setSpec(null);
    onClosed?.();
  }, [onClosed]);
  const sheet = <ClientShareSheet spec={spec} onClose={onClose} />;
  return { open, sheet, locks, isOpen: !!spec };
}
