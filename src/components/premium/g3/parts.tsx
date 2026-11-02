import React from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import type { G3State } from "../../../services/premium/g3";
import type { PremiumFeature } from "../../../services/premium/features";
import { PremiumLabel } from "../PremiumAskHost";
import { askLocked, useG3Probe } from "./useG3";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · the small parts every G3 screen shares, in the app's existing
// style (cream cards, the soft shadow, the Premium label from Round G2).

/**
 * A G3 route: while the switch (and the Database's G3) loads, a loading
 * line; with the switch off, a Database without G3, or unknown, the route
 * doesn't exist and sends the member back where it came from.
 */
export function G3Route({ fallback, children }: { fallback: string; children: React.ReactNode }) {
  const probe = useG3Probe();
  if (probe === "loading") return <p className="py-10 text-center text-[13px] text-charcoal-faint">{t("Loading…")}</p>;
  if (probe === "no") return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

/** Loading, a calm error with Retry, or the children for a ready state. Hidden and premium render `otherwise` (nothing by default). */
export function G3Body<T>({ state, onRetry, children, otherwise = null }: { state: G3State<T>; onRetry: () => void; children: (v: T) => React.ReactNode; otherwise?: React.ReactNode }) {
  if (state.kind === "loading") return <p className="py-6 text-center text-[12.5px] text-charcoal-faint" role="status">{t("Loading…")}</p>;
  if (state.kind === "error")
    return (
      <p role="alert" className="py-4 text-[12.5px] font-semibold text-status-high">
        {state.message}{" "}
        <button type="button" onClick={onRetry} className="tap underline">
          {t("Retry")}
        </button>
      </p>
    );
  if (state.kind === "ready") return <>{children(state.value)}</>;
  return <>{otherwise}</>;
}

/** A locked row: its title, a lock, the Premium label; a tap opens the prompt. */
export function LockedRow({ feature, title, meta, className = "" }: { feature: PremiumFeature; title: string; meta?: string | null; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => askLocked(feature)}
      data-g3-locked={feature}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <Lock size={14} aria-hidden className="shrink-0 text-charcoal-faint" />
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-semibold text-charcoal-soft [overflow-wrap:anywhere]">{title}</span>
        {meta && <span className="block text-[11.5px] text-charcoal-faint">{meta}</span>}
      </span>
      <PremiumLabel className="shrink-0" />
    </button>
  );
}

/** The caps label above a G3 section, as the Workout and Mind pages draw theirs. */
export function G3Caps({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-2.5 text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] rtl:tracking-normal uppercase text-charcoal-muted ${className}`}>{children}</p>;
}
