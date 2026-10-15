import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, KeyRound } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { useApp } from "../../../context/AppContext";
import { useEffectiveProfessionalTier } from "../../../hooks/useEffectiveProfessionalTier";
import { useMyProfessionalPlan } from "../../../hooks/useMyProfessionalPlan";
import { capLabel, effectiveTierLabel } from "../../../services/subscription-tiers";
import { planLabel } from "../../../services/subscription-tiers/pricing";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../../services/subscription-tiers/upgrade";
import { freePeriodBlocksConnecting } from "../../../services/subscription-tiers/freePeriodCopy";
import { FreePeriodEnded, FreePeriodNotice } from "../../professionals/FreePeriodNotice";

/**
 * Release 3 · HO1 "Client code" row (FINAL_PLAN Q-B1 and 2.4: client codes
 * are kept beside the invite link). Moved here from the Release 2
 * AddClientSheet, unchanged in behaviour: a real single-use client_codes row
 * (generateClientCode), which the client enters when signing up as a client
 * of a professional. Generating one creates no relationship.
 *
 * The same gates as before: once the free month is over nothing is issued
 * (ATX49), and at the effective plan's client cap the sheet says so with the
 * mailto way out (there is nothing to buy in the app). An unknown tier blocks
 * nothing; the database still enforces the cap at redemption.
 */
export const ClientCodeSheet: React.FC<{ open: boolean; onClose: () => void; onBack?: () => void }> = ({ open, onClose, onBack }) => {
  const { generateClientCode, professionalClients } = useApp();
  const navigate = useNavigate();
  const { effective } = useEffectiveProfessionalTier();
  const tier = effective?.tier;
  const { plan } = useMyProfessionalPlan();
  const capReached = tier && tier.maxClients !== null && professionalClients.length >= tier.maxClients ? tier : null;
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setCode(null);
    setError(null);
    setBusy(false);
    setCopied(false);
    onClose();
  };

  const create = async () => {
    setError(null);
    setBusy(true);
    const result = await generateClientCode();
    setBusy(false);
    if (!result.ok || !result.code) {
      setError(result.message ?? "Could not generate a code. Try again.");
      return;
    }
    setCode(result.code);
  };

  const copy = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BottomSheet open={open} onClose={close} onBack={onBack} title="Client code">
      {freePeriodBlocksConnecting(plan) ? (
        <div className="animate-fade-slide-up py-2">
          <FreePeriodEnded onContact={close} />
        </div>
      ) : capReached ? (
        <div className="text-center animate-fade-slide-up py-4">
          <p className="text-sm font-bold text-charcoal mb-1.5">
            You've reached the client limit on your {effective ? effectiveTierLabel(effective) : planLabel(capReached.name)} plan.
          </p>
          <p className="text-sm text-charcoal-soft mb-4">
            {capLabel(capReached, professionalClients.length)}. Disconnect a client to free a place, or ask us to move you to a bigger plan.
          </p>
          <a href={upgradeMailto()} className="tap w-full flex items-center justify-center rounded-2xl bg-primary-fill text-on-primary-fill text-sm font-semibold h-12 mb-2.5">
            {UPGRADE_ACTION_LABEL}
          </a>
          <button
            type="button"
            onClick={() => {
              close();
              navigate("/app/subscription");
            }}
            className="tap w-full text-center text-sm font-semibold text-charcoal-soft"
          >
            See the plans
          </button>
        </div>
      ) : !code ? (
        <div className="animate-fade-slide-up py-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center mx-auto mb-4">
            <KeyRound size={24} className="text-primary-dark" aria-hidden />
          </div>
          <p className="text-sm text-charcoal-soft text-center mb-6">
            Generate a code and share it with your client. They enter it when signing up as a Client of Professional, and their own profile details come across with them.
          </p>
          <FreePeriodNotice plan={plan} className="justify-center mb-4" />
          {error && <p className="text-xs font-semibold text-status-high text-center mb-3">{error}</p>}
          <Button fullWidth size="lg" onClick={create} disabled={busy}>
            {busy ? "Generating…" : "Generate unique client code"}
          </Button>
        </div>
      ) : (
        <div className="text-center animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">Code generated. Share it with your client. They'll appear on your roster once they join.</p>
          <div className="bg-primary-pale rounded-2xl py-5 mb-4">
            <p className="text-2xl font-bold tracking-widest text-primary-dark">{code}</p>
          </div>
          <Button fullWidth onClick={copy} variant="outline">
            {copied ? (
              <>
                <Check size={15} /> Copied
              </>
            ) : (
              <>
                <Copy size={15} /> Copy code
              </>
            )}
          </Button>
          <Button fullWidth size="lg" className="mt-2.5" onClick={close}>
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
