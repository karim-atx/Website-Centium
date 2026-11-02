import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnline } from "../../../../hooks/useOnline";
import { acceptExistingTeamInvite } from "../../../../services/team-hiring";
import type { ExistingTeamInvite } from "../../../../services/hiring/model";
import { CentredDialog, SoonNote } from "../../../business-market/listingParts";
import { DialogRows } from "./parts";
import { expiredBody, expiredRows, inviteBody, inviteExpired, inviteRows, inviteTitle } from "./opportunitiesModel";
import { t } from "../../../../i18n/core";

// Market + Share 3.0 · W4 · P-MA.5.4 Existing-team invite (Professional
// Marketplace Screens `dlg` for etInvite / etInviteExpired, lines 600–617 and
// 866–867; frame-check P-MA.5.4). A CentredDialog (the P-MA width 330, the
// confirm tone #AEA1DC):
// - "Join {business}'s team?", the body, rows Gym · Hiring fee "None" ·
//   Invited · Accept by, Not now / Accept → accept_existing_team_invite
//   (Database Release 2). "Not now" only closes (the invite stays open until its
//   accept-by date; decline_existing_team_invite has no drawn control);
// - Expired (the server's invite_expired, or the accept-by date has passed):
//   "This invite has expired", the body naming the close date, rows Gym ·
//   Expired, Close / Browse openings (→ the Opportunities tab).
// The P-MA.7 notifications row opens it (the lead, via inviteFromNotification);
// Opportunities opens it too when an invite reaches the professional there.

export const OPPORTUNITIES_PATH = "/app/pro/marketplace/opportunities";

export function ExistingTeamInviteDialog({ invite, onClose, onDone }: { invite: ExistingTeamInvite; onClose: () => void; onDone: (invite: ExistingTeamInvite) => void }) {
  const navigate = useNavigate();
  const online = useOnline();
  const startsExpired = useMemo(() => inviteExpired(invite, new Date()), [invite]);
  const [expired, setExpired] = useState(startsExpired);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);

  if (expired) {
    return (
      <CentredDialog
        open
        width={330}
        tone="primary"
        title={t("This invite has expired")}
        body={expiredBody(invite)}
        cancel={t("Close")}
        action={t("Browse openings")}
        onCancel={onClose}
        onAction={() => {
          onClose();
          navigate(OPPORTUNITIES_PATH);
        }}
      >
        <DialogRows rows={expiredRows(invite)} />
      </CentredDialog>
    );
  }

  const accept = async () => {
    if (busy) return;
    if (!online) return setError(t("You're offline. Try again when you're connected."));
    setBusy(true);
    setError(null);
    setSoon(false);
    const r = await acceptExistingTeamInvite(invite.id);
    setBusy(false);
    // accept_existing_team_invite (Database Release 2): ATXH21 → the expired dialog; ATX08 shows its words; ATXC0
    // (the business's seats are full; an existing-team addition takes a seat, Database #38) shows NO_SEAT_FOR_YOU.
    if (r.ok) return onDone(invite);
    if (r.pending) return setSoon(true);
    if (r.error === "invite_expired") return setExpired(true);
    setError(t(r.message));
  };

  return (
    <CentredDialog
      open
      width={330}
      tone="primary"
      title={inviteTitle(invite.businessName)}
      body={inviteBody(invite.businessName)}
      cancel={t("Not now")}
      action={t("Accept")}
      busy={busy}
      error={error}
      onCancel={onClose}
      onAction={() => void accept()}
    >
      <DialogRows rows={inviteRows(invite)} />
      {soon ? <SoonNote style={{ marginTop: 12 }}>{t("Hiring is coming soon.")}</SoonNote> : null}
    </CentredDialog>
  );
}
