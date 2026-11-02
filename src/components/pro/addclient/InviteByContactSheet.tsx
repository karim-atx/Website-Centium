import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { CtaButton } from "../../ui/PinnedCta";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { defaultInviteMessage, fetchCurrentInviteLink, inviteByContact, smsHref, type ContactChannel } from "../../../services/pro/invites";
import { INVITE_MESSAGE_MAX, INVITE_NAME_MAX } from "../../../services/pro/inviteErrors";
import { ProField, ProTextArea } from "./fields";
import { t } from "../../../i18n/core";

/**
 * Release 3 · HO3 "Invite by email or phone" (DB-2 invite_client; DECISIONS:
 * phone invites are never sent by the server).
 * - Email (the frame: First name, Email, Message): invite_client('email',
 *   address, first_name, message) queues it and the send-client-invite Edge
 *   Function sends it, with the name (at most 40) and message (at most 500)
 *   in the email beside the professional's invite link.
 * - Phone: invite_client('phone', number, first_name) records it (rate
 *   limit, sent list), then the device's messages app opens with the message
 *   and the link. That message is editable and goes only into that text.
 */
export const InviteByContactSheet: React.FC<{ open: boolean; onClose: () => void; onBack?: () => void; locked: boolean }> = ({ open, onClose, onBack, locked }) => {
  const { user } = useApp();
  const [tab, setTab] = useState<ContactChannel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!open || locked) return;
    let live = true;
    void fetchCurrentInviteLink().then((r) => {
      if (live && r.ok && r.data) setCode(r.data.code);
    });
    return () => {
      live = false;
    };
  }, [open, locked]);

  const close = () => {
    setEmail("");
    setPhone("");
    setName("");
    setEmailMessage("");
    setMessage(null);
    setError(null);
    setSent(null);
    setBusy(false);
    onClose();
  };

  const first = user.firstName || t("your professional");
  const text = message ?? (code ? defaultInviteMessage(first, code) : "");
  const address = tab === "email" ? email : phone;

  const send = async () => {
    if (busy || !address.trim()) return;
    setBusy(true);
    setError(null);
    const r = await inviteByContact(tab, address, tab === "email" ? { firstName: name, message: emailMessage } : { firstName: name });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (tab === "email") {
      setSent(t("Invite sent to {email}.", { email: email.trim() }));
      return;
    }
    const link = r.data.code ?? code;
    const body = message ?? (link ? defaultInviteMessage(first, link) : "");
    window.location.href = smsHref(phone, body);
    setSent(t("Your messages app opened with the invite. Send it from there."));
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      onBack={onBack}
      title={t("Invite by email or phone")}
      footer={
        !locked && !sent ? (
          <CtaButton label={t("Send invite")} icon={<Send size={15} aria-hidden />} loading={busy} disabled={!address.trim()} onClick={() => void send()} />
        ) : sent ? (
          <CtaButton label={t("Done")} onClick={close} />
        ) : undefined
      }
    >
      {locked ? (
        <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.55 }}>{t("Invite links open once your licence is verified.")}</p>
      ) : sent ? (
        <p role="status" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch, lineHeight: 1.55 }}>
          {sent}
        </p>
      ) : (
        <>
          <SegmentedTabs
            items={[
              { key: "email", label: t("Email") },
              { key: "phone", label: t("Phone") },
            ]}
            activeKey={tab}
            onChange={(k) => {
              setTab(k as ContactChannel);
              setError(null);
            }}
            className="mb-4"
          />
          <div className="flex flex-col" style={{ gap: 14 }}>
            <ProField label={t("First name")} value={name} onChange={setName} autoComplete="off" maxLength={INVITE_NAME_MAX} />
            {tab === "email" ? (
              <>
                <ProField label={t("Email")} type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} placeholder={t("name@example.com")} />
                <ProTextArea label={t("Message")} value={emailMessage} onChange={setEmailMessage} maxLength={INVITE_MESSAGE_MAX} placeholder={t("Add a short message")} />
              </>
            ) : (
              <>
                <ProField label={t("Phone")} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={setPhone} placeholder={t("Add a number")} />
                <ProTextArea label={t("Message")} value={text} onChange={setMessage} />
              </>
            )}
            {error && (
              <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
};
