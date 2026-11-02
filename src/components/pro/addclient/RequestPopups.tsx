import React, { useState } from "react";
import { ChevronDown, ChevronUp, UserCheck, UserX } from "lucide-react";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { DECLINE_MESSAGE_MAX, DECLINE_REASONS, type DeclineReason } from "../../../services/pro/requests";
import { ProField } from "./fields";
import { t } from "../../../i18n/core";

/**
 * Release 3 · HO11 "Accept request" (CentredPopup). Accepting is
 * accept_client_request: the client starts in Onboarding and the database
 * asks them for the professional's default data (practice_settings). The body
 * leads with the plan they chose, as HO11 draws it ("Monthly coaching · $120 a
 * month."); intake forms on accept stay for a later release.
 */
export const AcceptRequestPopup: React.FC<{ name: string | null; plan?: string | null; busy: boolean; error: string | null; onAccept: () => void; onClose: () => void }> = ({
  name,
  plan,
  busy,
  error,
  onAccept,
  onClose,
}) => (
  <CentredPopup
    open={!!name}
    onClose={onClose}
    title={t("Accept {name}?", { name: name ?? "" })}
    icon={<UserCheck size={22} strokeWidth={2} aria-hidden />}
    body={plan ? t("{plan}. They move to Onboarding.", { plan }) : t("They move to Onboarding.")}
  >
    {error && (
      <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 4 }}>
        {error}
      </p>
    )}
    <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
      <CtaButton size="page" label={t("Accept")} loading={busy} onClick={onAccept} />
      <CtaButton size="page" variant="secondary" label={t("Not now")} onClick={onClose} disabled={busy} />
    </div>
  </CentredPopup>
);

/**
 * Release 3 · HO13, HO18, HO19 "Decline request": a reason dropdown
 * (PopupMenu: Fully booked, Outside my specialty, Location doesn't suit,
 * Other) and, for Other, a short message the client sees (at most 280).
 * reject_client_request_with_reason / decline_hire need a message with Other,
 * so Decline waits for one there. With no reason, the plain decline runs.
 */
export const DeclineRequestPopup: React.FC<{
  name: string | null;
  busy: boolean;
  error: string | null;
  onDecline: (reason: DeclineReason | null, message: string) => void;
  onClose: () => void;
}> = ({ name, busy, error, onDecline, onClose }) => {
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const first = (name ?? "").split(" ")[0];
  const close = () => {
    setReason(null);
    setMessage("");
    setMenu(false);
    onClose();
  };
  const needsMessage = reason === "other" && !message.trim();
  return (
    <CentredPopup
      open={!!name}
      onClose={close}
      title={t("Decline {name}'s request?", { name: name ?? "" })}
      icon={<UserX size={22} strokeWidth={2} aria-hidden />}
      body={t("{first} sees the reason you choose with the decline.", { first })}
    >
      <div className="text-start">
        <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>{t("Reason (optional)")}</span>
        <button
          ref={setTrigger}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="tap w-full flex items-center justify-between"
          style={{
            height: 40,
            borderRadius: 12,
            background: INK.soft,
            border: `1px solid ${menu ? INK.pr : INK.b10}`,
            padding: "0 12px",
            gap: 8,
            fontSize: textPx(14),
            color: reason ? INK.ch : INK.chF,
          }}
        >
          <span>{reason ? t(DECLINE_REASONS.find((r) => r.value === reason)?.label ?? "") : t("Choose a reason")}</span>
          {menu ? <ChevronUp size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} /> : <ChevronDown size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />}
        </button>
        <PopupMenu
          open={menu}
          onClose={() => setMenu(false)}
          anchor={trigger}
          matchWidth={trigger}
          heading={t("Reason")}
          options={DECLINE_REASONS.map((r) => ({ ...r, label: t(r.label) }))}
          selected={reason}
          onSelect={(v) => {
            setReason(v);
            setMenu(false);
          }}
        />
        {reason === "other" && (
          <div style={{ marginTop: 12 }}>
            <ProField
              label={t("Tell {first} why", { first })}
              value={message}
              onChange={setMessage}
              maxLength={DECLINE_MESSAGE_MAX}
              note={t("Short and kind. {first} sees this with the decline.", { first })}
              autoFocus
            />
          </div>
        )}
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: 8, marginTop: 20 }}>
        <CtaButton size="page" label={t("Decline request")} loading={busy} disabled={needsMessage} onClick={() => onDecline(reason, message)} />
        <CtaButton size="page" variant="secondary" label={t("Keep request")} onClick={close} disabled={busy} />
      </div>
    </CentredPopup>
  );
};
