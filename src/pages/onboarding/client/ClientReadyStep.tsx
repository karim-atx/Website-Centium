import React, { useEffect, useState } from "react";
import { Check, Info } from "lucide-react";
import type { OnboardingDraft } from "../Onboarding";
import { MARK_LEAF_PATH } from "../../../components/icons/CentiumMark";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { LEGAL_VERSION } from "../../../services/legal/acceptances";
import { ObFooter, ObHeader, ObPage } from "../shell/ObShell";
import { ObChipStatic, ObSectionLabel, ObStatus, ObTerms, ObTip } from "../shell/ObBlocks";
import { OB } from "../shell/visuals";
import { goalAreas, startingPointSummary, trackingToSave } from "./clientModel";
import { t, tk } from "../../../i18n/core";

// v6 (OB-109…111): Client lane · You're all set (BizOnboardingV10 step
// "done", motion/client-complete: a single leaf grows and settles over about
// 900 ms; reduced motion: static, 200 ms fade). Kept: the health disclaimer
// above the footer (KEEP-SAFETY), the finish error with Try again, the client
// code notice with Continue anyway, the busy label. V6-68: no Home "Get
// started" card (skipped, client Home is outside this handover).
// B5 legal_acceptances: Terms and Privacy are accepted on Create your
// account; a Google sign-up never saw that box, so it is asked here.

/** The animation's four states (BizOnboardingV10 `A`, k 1…4). */
const A = [
  { v: 0, gl: 0, ro: 0.3, rs: 0.8, to: 0 },
  { v: 0.4, gl: 0.3, ro: 0.6, rs: 0.9, to: 0 },
  { v: 1, gl: 0.9, ro: 1, rs: 1.15, to: 0.4 },
  { v: 1, gl: 0, ro: 1, rs: 1, to: 1 },
];

export const ClientReadyStep: React.FC<{
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onFinish: () => void;
  /** The client code could not be redeemed: onboarding is saved, the button continues. */
  notice?: string | null;
  /** Task T: the account could not be saved; the button retries. */
  error?: string | null;
  busy?: boolean;
}> = ({ draft, setDraft, onFinish, notice, error, busy }) => {
  const reduced = useReducedMotion();
  const [k, setK] = useState(reduced ? 4 : 1);
  const [termsError, setTermsError] = useState<string | null>(null);
  // Asked only of someone who did not tick the box on Create your account
  // (a Google sign-up): fixed when the screen opens, so ticking it here does
  // not make the box disappear under their finger.
  const [askTerms] = useState(() => !draft.legalAcceptedAt);
  useEffect(() => {
    if (reduced) return;
    const timers = [window.setTimeout(() => setK(2), 300), window.setTimeout(() => setK(3), 600), window.setTimeout(() => setK(4), 900)];
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [reduced]);
  const a = A[k - 1];
  const flags = { rs: draft.recoverySensitive, cy: draft.cycleTracking };
  const areas = goalAreas(flags).filter((x) => draft.goalAreas.includes(x.key));
  const summary = startingPointSummary(trackingToSave(draft.tracking, flags), draft.activityLevel, flags);
  const trans = reduced ? "none" : "transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease";

  const go = () => {
    if (askTerms && !draft.legalAcceptedAt) {
      setTermsError(tk("Accept the Terms of Service and Privacy Policy to continue."));
      return;
    }
    onFinish();
  };

  return (
    <ObPage>
      <div className={`ob-body ${reduced ? "ob-fade-in" : ""}`} style={reduced ? { animationDuration: "200ms" } : undefined}>
        <ObHeader margin="nobar" />
        <ObStatus
          vis={[]}
          visNode={
            k === 1 ? (
              <>
                <circle cx={50} cy={50} r={40} fill="none" stroke={OB.lav} strokeWidth={1.5} opacity={0.6} />
                <path d={MARK_LEAF_PATH} fill={OB.leaf} transform="translate(50 82) scale(0.13) rotate(-45) translate(-566 -884)" />
              </>
            ) : (
              <>
                {[0, -45, -90].map((r, i) => (
                  <g key={r} style={{ transform: `rotate(${r * a.v}deg)`, transformOrigin: "50px 80px", transition: trans }}>
                    <path d={MARK_LEAF_PATH} fill={[OB.leaf, OB.lav, OB.brand][i]} transform="translate(50 80) scale(0.12) translate(-566 -884)" />
                  </g>
                ))}
              </>
            )
          }
          eyebrow={t("Welcome to Centium")}
          eyebrowColor="var(--ob-good)"
          title={t("You're all set, {name}", { name: draft.firstName.trim().split(/\s+/)[0] || t("friend") })}
          body={t("We've built your Home around your goals. Let's take a look.")}
          ringOpacity={a.ro}
          ringScale={a.rs}
          glowOpacity={a.gl}
          glowSize={k === 3 ? 240 : 160}
          textOpacity={a.to}
        />
        {k >= 3 && (
          <div className={reduced ? undefined : "ob-fade-in"}>
            {areas.length > 0 && (
              <>
                <ObSectionLabel title={t("Your starting point")} margin="4px 2px 12px" />
                <div className="ob-chips" style={{ marginBottom: 16 }}>
                  {areas.map((x) => (
                    <ObChipStatic key={x.key} label={t(x.title)} />
                  ))}
                </div>
              </>
            )}
            {summary && (
              <ObTip icon={Check} margin="0">
                {summary}
              </ObTip>
            )}
            {notice && (
              <ObTip icon={Info} tone="warn" margin="12px 0 0" role="alert">
                {notice}
              </ObTip>
            )}
            {askTerms && (
              <div style={{ marginTop: 16 }}>
                <ObTerms
                  on={!!draft.legalAcceptedAt}
                  onChange={(on) => {
                    setTermsError(null);
                    setDraft((d) => ({ ...d, legalAcceptedAt: on ? new Date().toISOString() : null, legalVersion: on ? LEGAL_VERSION : null }));
                  }}
                  error={termsError && t(termsError)}
                  tail="."
                />
              </div>
            )}
          </div>
        )}
      </div>
      <ObFooter
        error={error}
        primary={{
          label: busy ? t("Setting up…") : error ? t("Try again") : notice ? t("Continue anyway") : t("Let's go"),
          onClick: go,
          disabled: busy || k < 3,
          // The settling animation draws the button at 0.3 until C3.
          style: k < 3 ? { opacity: 0.3 } : undefined,
        }}
      >
        {/* KEEP-SAFETY: the health disclaimer, 10.5/1.5 inkSoft centred, max 310, 12 above the button. */}
        <HealthDisclaimer className="mx-auto max-w-[310px] mb-3" />
      </ObFooter>
    </ObPage>
  );
};
