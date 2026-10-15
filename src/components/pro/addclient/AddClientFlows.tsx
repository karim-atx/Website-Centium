import React, { useState } from "react";
import { Inbox, KeyRound, Mail, QrCode, UserPen } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { SettingsRow } from "../../ui/SettingsRows";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { useMyProfessionalPlan } from "../../../hooks/useMyProfessionalPlan";
import { freePeriodBlocksConnecting } from "../../../services/subscription-tiers/freePeriodCopy";
import { FreePeriodEnded, FreePeriodNotice } from "../../professionals/FreePeriodNotice";
import { INVITE_LOCKED_MESSAGE } from "../../../services/pro/invites";
import { ClientCodeSheet } from "./ClientCodeSheet";
import { InviteByContactSheet } from "./InviteByContactSheet";
import { OfflineClientSheet } from "./OfflineClientSheet";

/**
 * Release 3 · HO1 v6 "Add client" sheet and the flows it opens (HO2 to HO6).
 * Rows (gen/hub.js addClientSheet, renamed by r18): Invite clients, Invite by
 * email or phone, Pending requests (count), Add someone offline, then the
 * Release 2 Client code row (FINAL_PLAN Q-B1), and the footer line.
 * The Free plan's month gates adding clients here (FINAL_PLAN 2.4
 * FreePeriodNotice: HO1). Invite links and invites are off for a doctor,
 * physiotherapist or dietitian until verified (Karim's answer 1).
 */
export type AddStep = "menu" | "contact" | "offline" | "code";
type Step = AddStep | null;

export const AddClientFlows: React.FC<{
  open: boolean;
  onClose: () => void;
  invitesAllowed: boolean;
  pendingCount: number;
  onInviteClients: () => void;
  onPendingRequests: () => void;
  onOfflineAdded: (name: string, note: string | null) => void;
  /** Open straight on one flow (Home "Ways to add"). */
  start?: AddStep;
}> = ({ start, open, onClose, invitesAllowed, pendingCount, onInviteClients, onPendingRequests, onOfflineAdded }) => {
  const [step, setStep] = useState<Step>(null);
  const { plan } = useMyProfessionalPlan();
  const blocked = freePeriodBlocksConnecting(plan);
  // The menu is open while `open` and no sub-step is showing.
  const current: Step = open ? step ?? start ?? "menu" : null;
  const closeAll = () => {
    setStep(null);
    onClose();
  };
  const back = () => setStep("menu");
  const lockedNote = invitesAllowed ? undefined : INVITE_LOCKED_MESSAGE;

  return (
    <>
      <BottomSheet open={current === "menu"} onClose={closeAll} title="Add client">
        <div style={{ marginTop: -8 }}>
          {blocked ? (
            <div className="py-2">
              <FreePeriodEnded onContact={closeAll} />
            </div>
          ) : (
            <>
              <FreePeriodNotice plan={plan} className="mb-2" />
              <GatedRow icon={QrCode} title="Invite clients" subtitle={lockedNote ?? "They join from the link or by scanning"} onOpen={invitesAllowed ? () => { closeAll(); onInviteClients(); } : undefined} />
              <GatedRow icon={Mail} title="Invite by email or phone" subtitle={lockedNote ?? "We send the invite for you"} onOpen={invitesAllowed ? () => setStep("contact") : undefined} />
              <SettingsRow
                icon={Inbox}
                title="Pending requests"
                subtitle="People who asked to work with you"
                value={pendingCount > 0 ? String(pendingCount) : undefined}
                onClick={() => {
                  closeAll();
                  onPendingRequests();
                }}
              />
              <SettingsRow icon={UserPen} title="Add someone offline" subtitle="Start their record, invite them later" onClick={() => setStep("offline")} />
              <SettingsRow icon={KeyRound} title="Client code" subtitle="A one-time code they enter when they sign up" onClick={() => setStep("code")} />
            </>
          )}
        </div>
        <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 12, lineHeight: 1.5 }}>New clients start in Onboarding until their intake form is done.</p>
      </BottomSheet>
      <InviteByContactSheet open={current === "contact"} onClose={closeAll} onBack={back} locked={!invitesAllowed} />
      <OfflineClientSheet
        open={current === "offline"}
        onClose={closeAll}
        onBack={back}
        invitesAllowed={invitesAllowed}
        onAdded={(name, note) => {
          closeAll();
          onOfflineAdded(name, note);
        }}
      />
      <ClientCodeSheet open={current === "code"} onClose={closeAll} onBack={back} />
    </>
  );
};

/** A row that opens only when `onOpen` is given; otherwise dimmed, with its reason as the subtitle. */
export const GatedRow: React.FC<{ icon: React.ComponentProps<typeof SettingsRow>["icon"]; title: string; subtitle: string; onOpen?: () => void }> = ({ icon, title, subtitle, onOpen }) =>
  onOpen ? <SettingsRow icon={icon} title={title} subtitle={subtitle} onClick={onOpen} /> : <SettingsRow icon={icon} title={title} subtitle={subtitle} dimmed />;
