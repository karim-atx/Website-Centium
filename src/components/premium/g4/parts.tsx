import React from "react";
import { Navigate } from "react-router-dom";
import { useG4Probe } from "./useG4";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · the route guard every G4 page shares, in the style of G3's.

/**
 * A G4 route: while the switch (and the Database's G4) loads, a loading
 * line; with the switch off, a Database without G4, or unknown, the route
 * doesn't exist and sends the member back. `blocked` sends them back too
 * (progress photos in recovery-sensitive mode).
 */
export function G4Route({ fallback, blocked = false, children }: { fallback: string; blocked?: boolean; children: React.ReactNode }) {
  const probe = useG4Probe();
  if (blocked) return <Navigate to={fallback} replace />;
  if (probe === "loading") return <p className="py-10 text-center text-[13px] text-charcoal-faint">{t("Loading…")}</p>;
  if (probe === "no") return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
