import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { useApp } from "../../context/AppContext";
import { previewClientCode, redeemClientCode, type ClientCodePreview } from "../../services/redemption";
import type { ProfessionalSubtype } from "../../types";

// MO1.5 "Professionals" card (R15, batch C, C7): connect with a professional
// by the client code they generated, from Profile. Until now that was only
// possible during onboarding, while the professional's own profile page
// already told clients to "redeem it from your profile".
//
// THE SAME TWO STEPS AS ONBOARDING: preview_client_code shows who the code
// belongs to (and refuses a used or expired one), then the person confirms
// and redeem_client_code makes the relationship. Connecting shares nothing:
// every data-sharing switch starts off.
export const ProfessionalCodeCard: React.FC<{ onConnected: () => void; className?: string }> = ({
  onConnected,
  className,
}) => {
  const { user, updateProfile } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<ClientCodePreview | null>(null);
  const [note, setNote] = useState<{ text: string; ok?: boolean } | null>(null);

  const check = async () => {
    const entered = code.trim();
    if (!entered || busy) return;
    setBusy(true);
    setNote(null);
    const result = await previewClientCode(entered);
    setBusy(false);
    if (result.status === "error") return setNote({ text: result.message });
    if (result.status === "not_found") return setNote({ text: "Code not found. Check it and try again." });
    if (result.data.redeemed) return setNote({ text: "That code has already been used." });
    if (result.data.expiresAt && new Date(result.data.expiresAt).getTime() < Date.now()) {
      return setNote({ text: "That code has expired. Ask for a new one." });
    }
    setFound(result.data);
  };

  const connect = async () => {
    if (!found || busy) return;
    setBusy(true);
    const result = await redeemClientCode(code);
    setBusy(false);
    if (result.status !== "success") {
      setFound(null);
      return setNote({ text: result.message });
    }
    // The display copy onboarding writes for the "Your professional" card,
    // only when there is no linked professional yet.
    if (!user.linkedProfessionalName) {
      updateProfile({
        linkedProfessionalCode: code.trim().toUpperCase(),
        linkedProfessionalName: found.professionalFirstName,
        linkedProfessionalSubtype: found.professionalSubtype as ProfessionalSubtype,
      });
    }
    setNote({ text: `You're connected with ${found.professionalFirstName}. Nothing is shared until you turn it on.`, ok: true });
    setFound(null);
    setCode("");
    onConnected();
  };

  return (
    <div className={className}>
      {/* Decision 23 (items 88, 104): the "Connect with {name}?" preview is a
          Foundations centred popup, like End membership, over the code box,
          which stays where it is. Tapping outside cancels. */}
      <CentredPopup
        open={!!found}
        onClose={() => !busy && setFound(null)}
        title={`Connect with ${found?.professionalFirstName ?? "this professional"}?`}
        icon={<UserPlus size={22} />}
        body="They'll see that you're their client. Nothing else is shared until you turn it on."
      >
        <CtaButton size="page" label={busy ? "Connecting…" : "Connect"} disabled={busy} onClick={() => void connect()} />
        <button
          type="button"
          onClick={() => setFound(null)}
          disabled={busy}
          className="tap mt-3 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft"
        >
          Cancel
        </button>
      </CentredPopup>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setNote(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void check()}
          placeholder="Professional code"
          aria-label="Professional code"
          // Foundations Inputs (MO1.5 row 4, as the member code field):
          // height 44, radius 12, padding 0 14, value 14/600.
          className="flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal placeholder:font-normal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={() => void check()} disabled={!code.trim() || busy}>
          {busy ? "…" : "Connect"}
        </Button>
      </div>
      {note ? (
        <p role="status" className={`mt-2 text-xs font-semibold ${note.ok ? "text-charcoal-soft" : "text-status-high"}`}>
          {note.text}
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-charcoal-faint">
          Got a code from a trainer, dietitian or doctor? Enter it here to connect and start sharing data.
        </p>
      )}
    </div>
  );
};
