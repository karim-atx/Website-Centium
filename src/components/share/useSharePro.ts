import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchMyHandle } from "../../services/share";
import type { CardPro } from "./shareCardModel";
import { t } from "../../i18n/core";

/**
 * The professional as a card shows them: the name the public profile shows
 * (profiles.first_name, as /p/{handle} and the directory) and the handle.
 * No handle yet: the card has no handle line, link or QR.
 */
export function useSharePro(): CardPro | null {
  const { authUserId, user } = useApp();
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMyHandle(authUserId).then((h) => live && setHandle(h));
    return () => {
      live = false;
    };
  }, [authUserId]);
  if (!authUserId || handle === undefined) return null;
  return { name: (user.firstName ?? "").trim() || t("Your name"), handle };
}
