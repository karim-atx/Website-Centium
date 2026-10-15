import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { hasPublicReturn, takePublicReturn } from "../../services/public-pro";

/**
 * Release 3 · W7: back to the public page a visitor left to sign in or sign
 * up (an invite link, a profile, a booking page with its chosen time). The
 * page is remembered by rememberPublicReturn for an hour; once the account is
 * signed in and onboarded, the first app screen it lands on hands over to it,
 * once. Mounted once beside the routes (like ReturnedAuthErrorRoute).
 */
export function PublicReturnResume() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { authUserId, profileReady, user } = useApp();
  const ready = !!authUserId && profileReady && user.onboarded && pathname.startsWith("/app") && !pathname.startsWith("/app/onboarding");

  useEffect(() => {
    if (!ready || !hasPublicReturn()) return;
    const path = takePublicReturn();
    if (path) navigate(path, { replace: true });
  }, [ready, navigate]);

  return null;
}
