import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Batch E (E5): ONE BACK FOR EVERY IN-APP BACK BUTTON.
//
// Every back button was a plain history pop (navigate(-1)), and a few pushed
// their parent instead (Mind's sub-pages, a forum post). Two bugs followed:
// - a page opened directly (a link, a notification, a refresh) has no in-app
//   history, so the pop left the app;
// - a push one way and a pop the other made loops (Journal -> Back -> Mind ->
//   Back -> Journal again).
// So: pop when there is in-app history to pop (React Router numbers its
// entries in history.state.idx), otherwise REPLACE the current entry with the
// page's parent, so back never leaves the app and never adds an entry.

/** Pages whose parent is not simply the path with its last segment removed. */
const PARENTS: [RegExp, string][] = [
  [/^\/app\/forum\/courses\/mine\/[^/]+$/, "/app/forum/courses/mine"],
  [/^\/app\/forum\/courses\/(mine|[^/]+)$/, "/app/forum?tab=courses"],
  [/^\/app\/forum\/courses\/[^/]+\/lessons\/[^/]+$/, "__drop2"],
  [/^\/app\/forum\/(post\/[^/]+|new|nickname)$/, "/app/forum"],
  [/^\/app\/(cycle|contraception)$/, "/app/profile"],
];

/** The page a back button leads to when there is nothing to pop. */
export function parentOf(pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  for (const [re, to] of PARENTS) {
    if (re.test(path)) return to === "__drop2" ? path.split("/").slice(0, -2).join("/") : to;
  }
  const up = path.split("/").slice(0, -1).join("/");
  // A page directly under /app (Settings, Profile, Mind, Messages, ...) is
  // reached from More; /app itself is Home.
  return up === "/app" || up === "" ? "/app/more" : up;
}

/** True when the router has an earlier in-app entry to go back to. */
export const hasInAppHistory = (): boolean =>
  ((globalThis as { history?: { state?: { idx?: number } | null } }).history?.state?.idx ?? 0) > 0;

/** A back action: pop the in-app history, or replace with `parent` (default: parentOf the current path). */
export function useBack(parent?: string): () => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => {
    if (hasInAppHistory()) navigate(-1);
    else navigate(parent ?? parentOf(pathname), { replace: true });
  }, [navigate, parent, pathname]);
}
