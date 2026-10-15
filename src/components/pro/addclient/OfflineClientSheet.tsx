import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { Toggle } from "../../ui/Toggle";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { addOfflineClient, defaultInviteMessage, inviteByContact, smsHref } from "../../../services/pro/invites";
import { ProField } from "./fields";

/**
 * Release 3 · HO5 "Add someone offline" (DB-2 offline_clients: a name and
 * contact details only, no health data, until the person joins). With
 * "Invite them to connect" on, an email address gets the email invite
 * (invite_client) and a phone number opens the device's messages app.
 * Not carried: the frame's Goal field (offline_clients has no goal).
 */
export const OfflineClientSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  invitesAllowed: boolean;
  onAdded: (name: string, note: string | null) => void;
}> = ({ open, onClose, onBack, invitesAllowed, onAdded }) => {
  const { authUserId, user } = useApp();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [invite, setInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFirst("");
    setLast("");
    setEmail("");
    setPhone("");
    setInvite(true);
    setError(null);
    setBusy(false);
  };

  const name = `${first.trim()} ${last.trim()}`.trim();

  const submit = async () => {
    if (!authUserId || !first.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await addOfflineClient(authUserId, { name, email, phone });
    if (!r.ok) {
      setBusy(false);
      setError(r.message);
      return;
    }
    let note: string | null = null;
    if (invite && invitesAllowed && (email.trim() || phone.trim())) {
      const channel = email.trim() ? "email" : "phone";
      const sent = await inviteByContact(channel, channel === "email" ? email : phone);
      if (!sent.ok) note = sent.message;
      else if (channel === "phone" && sent.data.code) window.location.href = smsHref(phone, defaultInviteMessage(user.firstName || "your professional", sent.data.code));
    }
    reset();
    onAdded(name, note);
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      onBack={onBack}
      title="Add someone offline"
      footer={<CtaButton label="Add client" icon={<UserPlus size={15} aria-hidden />} loading={busy} disabled={!first.trim()} onClick={() => void submit()} />}
    >
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <ProField label="First name" value={first} onChange={setFirst} autoComplete="off" maxLength={60} />
          <ProField label="Last name" value={last} onChange={setLast} autoComplete="off" maxLength={60} />
        </div>
        <ProField label="Email (optional)" type="email" inputMode="email" value={email} onChange={setEmail} />
        <ProField label="Phone (optional)" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="Add a number" />
        {invitesAllowed && (
          <div className="flex items-center justify-between" style={{ minHeight: 52, borderRadius: 12, background: INK.soft, padding: "6px 12px", gap: 12 }}>
            <span className="min-w-0">
              <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                Invite them to connect
              </span>
              <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                Their data stays private until they accept
              </span>
            </span>
            <Toggle checked={invite} onChange={setInvite} label="Invite them to connect" />
          </div>
        )}
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
