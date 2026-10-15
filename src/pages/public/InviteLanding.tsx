import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link2, UserPlus, UserRound } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/pro/profile/kit";
import { inviteView, previewInviteLink, type InvitePreview } from "../../services/public-pro";
import { redeemClientCode } from "../../services/redemption";
import { isActiveClientOf } from "../../services/connected-professional";
import { textPx } from "../../theme/textSize";
import type { ProfessionalSubtype } from "../../types";
import { ProHero, PublicCard, PublicFrame, PublicMessage, PublicSkeleton, SignInButtons } from "./publicKit";

/**
 * Release 3 · W7 a professional's invite link, centium.app/i/{code}
 * (DB-2 invite links; J13; CU27; Karim's answer 1).
 *
 * preview_invite_link(code) works signed out and returns the professional
 * (first name, photo, type), licence_verified ("Licence not verified yet" when
 * false) and whether the link can still be used (usable / usable_message: the
 * database's own words for turned off, expired, full, or waiting for a
 * regulated licence).
 *
 * - Signed out: Create an account / Sign in, remembering this page so they
 *   land back on it (services/public-pro rememberPublicReturn).
 * - Signed in as a client: "Ask to work with {first}" redeems the invite with
 *   redeem_client_code after the same "Connect with {first}?" confirmation the
 *   Profile code box uses (connecting shares nothing), then opens their
 *   profile; "See {first}'s profile" opens it as CU27 draws it, with the
 *   "{first} invited you." line (J13: even before they're listed).
 * - Signed in as a professional or a business: the link is for clients.
 *
 * The invite line is CU27's (r27: 16 radius, primary.pale, 10 12 padding,
 * Link 15 primary.deep, 12.5 / 1.45 with the name in bold).
 */
export default function InviteLanding() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { authReady, authUserId, user, profileReady, updateProfile } = useApp();
  type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "found"; preview: InvitePreview };
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void previewInviteLink(code).then((r) => {
      if (!live) return;
      if (!r.ok) setState({ status: "error", message: r.message });
      else if (!r.data) setState({ status: "missing" });
      else setState({ status: "found", preview: r.data });
    });
    return () => {
      live = false;
    };
  }, [code, reload]);

  // A client who already works with this professional is told so, rather
  // than offered to connect again.
  const proId = state.status === "found" ? state.preview.professionalId : null;
  const [connected, setConnected] = useState<{ id: string; yes: boolean } | null>(null);
  useEffect(() => {
    if (!proId || !authUserId) return;
    let live = true;
    void isActiveClientOf(proId).then((yes) => live && setConnected({ id: proId, yes }));
    return () => {
      live = false;
    };
  }, [proId, authUserId]);
  const alreadyClient = !!proId && connected?.id === proId && connected.yes;

  useEffect(() => {
    document.title = state.status === "found" ? `${state.preview.firstName} invited you · Centium` : "Invite · Centium";
  }, [state]);

  if (state.status === "loading" || !authReady || (authUserId && !profileReady) || (authUserId && proId && connected?.id !== proId)) {
    return (
      <PublicFrame>
        <PublicSkeleton />
      </PublicFrame>
    );
  }
  if (state.status === "error") {
    return (
      <PublicFrame>
        <PublicMessage title="Couldn't open this invite" line={state.message} onRetry={() => setReload((n) => n + 1)} />
      </PublicFrame>
    );
  }
  if (state.status === "missing") {
    return (
      <PublicFrame>
        <PublicMessage title="We couldn't find that invite" line="Check the link, or ask for a new one." />
      </PublicFrame>
    );
  }

  const p = state.preview;
  const first = p.firstName.split(" ")[0] || "A professional";
  const view = inviteView(p, { userId: authUserId, accountType: authUserId ? user.accountType ?? null : null });
  const profilePath = `/app/professionals/${p.professionalId}?invite=${encodeURIComponent(p.code)}`;

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const r = await redeemClientCode(p.code);
    setBusy(false);
    setConfirming(false);
    if (r.status !== "success") return setNote(r.message);
    // The "Your professional" display copy, as the Profile code box writes it.
    if (!user.linkedProfessionalName) {
      updateProfile({
        linkedProfessionalCode: p.code,
        linkedProfessionalName: first,
        linkedProfessionalSubtype: (p.subtype ?? undefined) as ProfessionalSubtype | undefined,
      });
    }
    navigate(`/app/professionals/${p.professionalId}`, { replace: true });
  };

  return (
    <PublicFrame label={`${first} invited you`}>
      {view.kind !== "unusable" && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-primary-pale px-3 py-2.5" role="note">
          <Link2 size={15} strokeWidth={2} aria-hidden className="shrink-0 text-primary-deep-text" />
          <p className="flex-1 text-charcoal leading-[1.45]" style={{ fontSize: textPx(12.5) }}>
            <b>{first} invited you.</b> Hire a plan below or send a message first.
          </p>
        </div>
      )}

      <ProHero name={p.firstName} avatarUrl={p.avatarUrl} subtype={p.subtype} licenceVerified={p.licenceVerified} />

      <PublicCard className="flex flex-col gap-2">
        {view.kind === "unusable" && (
          <>
            <p className="font-bold text-charcoal" style={{ fontSize: textPx(15) }}>
              This invite can't be used
            </p>
            <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
              {view.message}
            </p>
            {p.handle && (
              <button type="button" onClick={() => navigate(`/p/${p.handle}`)} className="tap self-start min-h-11 font-bold text-primary-accent" style={{ fontSize: textPx(13) }}>
                See {first}'s profile
              </button>
            )}
          </>
        )}

        {view.kind === "signed_out" && (
          <SignInButtons returnPath={`/i/${p.code}`} line={`Create an account or sign in to work with ${first} on Centium. Nothing is shared until you choose to share it.`} />
        )}

        {view.kind === "client" && alreadyClient && (
          <>
            <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
              You already work with {first}.
            </p>
            <CtaButton full icon={UserRound} label={`Open ${first}'s profile`} onClick={() => navigate(`/app/professionals/${p.professionalId}`)} />
          </>
        )}

        {view.kind === "client" && !alreadyClient && (
          <>
            <CtaButton full icon={UserPlus} label={`Ask to work with ${first}`} onClick={() => setConfirming(true)} />
            <CtaButton full variant="secondary" icon={UserRound} label={`See ${first}'s profile`} onClick={() => navigate(profilePath)} />
          </>
        )}

        {view.kind === "own" && (
          <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
            This is your invite link. Clients who open it see this page.
          </p>
        )}

        {view.kind === "not_client" && (
          <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
            Invite links are for clients. Sign in with a client account to work with {first}.
          </p>
        )}

        {note && (
          <p role="alert" className="font-semibold text-status-high" style={{ fontSize: textPx(12.5) }}>
            {note}
          </p>
        )}
      </PublicCard>

      <CentredPopup
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={`Connect with ${first}?`}
        icon={<UserPlus size={22} />}
        body="They'll see that you're their client. Nothing else is shared until you turn it on."
        cta={{ label: "Connect", loading: busy, onClick: () => void connect() }}
      >
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="tap mt-2 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft"
        >
          Cancel
        </button>
      </CentredPopup>
    </PublicFrame>
  );
}
