import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { professionalTiers } from "../../data/professionalTiers";
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
  const { generateClientCode, professionalClients, professionalTier } = useApp();
  const navigate = useNavigate();
  const tier = professionalTiers.find((t) => t.id === professionalTier) ?? professionalTiers[0];
  const atCap = tier.maxClients !== null && professionalClients.length >= tier.maxClients;
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
      {atCap ? (
        <div className="text-center animate-fade-slide-up py-4">
          <p className="text-sm text-charcoal-soft mb-4">
            Your {tier.name} tier allows up to {tier.maxClients} clients, and you're already there.
            Upgrade to add more.
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onClose();
              navigate("/app/subscription");
            }}
          >
            View subscription tiers
          </Button>
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
