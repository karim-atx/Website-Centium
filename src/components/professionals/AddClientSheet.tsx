import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { useEffectiveProfessionalTier } from "../../hooks/useEffectiveProfessionalTier";
import { capLabel, effectiveTierLabel } from "../../services/subscription-tiers";
import { planLabel } from "../../services/subscription-tiers/pricing";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { Check, Copy, UserPlus } from "lucide-react";

// Invite-a-client. This used to collect the client's name, prefix, age, sex,
// height and weight, and stash them on a locally-generated code.
//
// None of that survives contact with the real schema: `client_codes` stores
// provenance only (code, professional, expiry, redemption) and has no
// client-profile columns, and the client's own details come from their
// `profiles` row when they redeem. Rather than keep collecting five fields
// that would be silently discarded, the sheet now does the one thing it can
// honestly do — issue a real code.
//
// It also no longer pretends a client exists. Generating a code creates no
// relationship; the client appears on the roster only once they redeem.
export const AddClientSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { generateClientCode, professionalClients } = useApp();
  const navigate = useNavigate();
  // THE PLAN THE ACCOUNT ACTUALLY HOLDS, which for almost everyone today is
  // the free default. This used to read a localStorage string written by the
  // subscription screen's own demo purchase, so the cap shown here and the cap
  // the database enforces were two unrelated values.
  // THE EFFECTIVE PLAN, not the account's own subscription. A professional
  // seated in a business holds no subscription_states row of their own, so
  // useMySubscriptionTier answered Free — one client — while the cap trigger
  // consulted the effective tier and allowed five. The sheet would
  // have refused a client the database was ready to accept.
  const { effective } = useEffectiveProfessionalTier();
  const tier = effective?.tier;
  /**
   * The tier whose cap has been reached, or null — one value rather than a
   * boolean plus a separately-nullable tier, so the panel below cannot render
   * a cap it does not have.
   *
   * UNKNOWN NO LONGER MEANS STARTER. This used to fall back to
   * `professionalTiers[0]` when the id did not match, which was harmless
   * while the list was a literal that always contained it. Now the list is a
   * fetch, and that fallback would have told an Unlimited professional they
   * had hit five clients every time the read was slow or failed — blocking a
   * real action on a guess.
   *
   * So a missing tier blocks nothing. The cap is not advisory in the end:
   * professional_clients_enforce_tier_cap rejects the relationship at
   * redemption, so the worst case is a refusal with a reason rather than a
   * silent overrun.
   */
  const capReached =
    tier && tier.maxClients !== null && professionalClients.length >= tier.maxClients ? tier : null;
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setGeneratedCode(null);
    setError(null);
    setBusy(false);
    setCopied(false);
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
    setGeneratedCode(result.code);
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard?.writeText(generatedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add Client"
    >
      {capReached ? (
        <div className="text-center animate-fade-slide-up py-4">
          <p className="text-sm font-bold text-charcoal mb-1.5">
            You've reached the client limit on your{" "}
            {effective ? effectiveTierLabel(effective) : planLabel(capReached.name)} plan.
          </p>
          <p className="text-sm text-charcoal-soft mb-4">
            {capLabel(capReached, professionalClients.length)}. Disconnect a client to free a
            place, or ask us to move you to a bigger plan.
          </p>
          {/* A MAILTO, NOT A CHECKOUT. There is nothing to buy: subscription_states
              is read-only to every client role and is written by a payment process
              that does not exist yet, so a payment sheet here would take a card for
              a change nothing can apply. */}
          <a
            href={upgradeMailto()}
            className="tap w-full flex items-center justify-center rounded-2xl bg-primary text-white text-sm font-semibold h-12 mb-2.5"
          >
            {UPGRADE_ACTION_LABEL}
          </a>
          <button
            onClick={() => {
              onClose();
              navigate("/app/subscription");
            }}
            className="tap w-full text-center text-sm font-semibold text-charcoal-soft"
          >
            See the plans
          </button>
        </div>
      ) : !generatedCode ? (
        <div className="animate-fade-slide-up py-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} className="text-primary-dark" />
          </div>
          <p className="text-sm text-charcoal-soft text-center mb-6">
            Generate a code and share it with your client. They enter it when signing up as a Client
            of Professional, and their own profile details come across with them.
          </p>
          {error && (
            <p className="text-xs font-semibold text-status-high text-center mb-3">{error}</p>
          )}
          <Button fullWidth size="lg" onClick={create} disabled={busy}>
            {busy ? "Generating…" : "Generate unique client code"}
          </Button>
        </div>
      ) : (
        <div className="text-center animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">
            Code generated. Share it with your client — they'll appear on your roster once they join.
          </p>
          <div className="bg-primary-pale rounded-2xl py-5 mb-4">
            <p className="text-2xl font-bold tracking-widest text-primary-dark">{generatedCode}</p>
          </div>
          <Button fullWidth onClick={copyCode} variant="outline">
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
          <Button
            fullWidth
            size="lg"
            className="mt-2.5"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
