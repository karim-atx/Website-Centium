import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link2, UserPlus, UserRound } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/pro/profile/kit";
import { inviteView, previewInviteLink, recordInviteOpen, type InvitePreview } from "../../services/public-pro";
import { redeemClientCode } from "../../services/redemption";
import { isActiveClientOf } from "../../services/connected-professional";
import { textPx } from "../../theme/textSize";
import type { ProfessionalSubtype } from "../../types";
import { ProHero, PublicCard, PublicFrame, PublicMessage, PublicSkeleton, SignInButtons } from "./publicKit";
import { t } from "../../i18n/core";

/**
 * Release 3 · W7 a professional's invite link, {site}/i/{code}
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

  // W2-5c: the first open of the link marks the invite "Opened" for the
  // professional. Once per page, after the preview found the invite, and not
  // when the professional opens their own link to check it.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!proId || !authReady || authUserId === proId || openedFor.current === code) return;
    openedFor.current = code;
    void recordInviteOpen(code);
  }, [proId, authReady, authUserId, code]);

  useEffect(() => {
    document.title = state.status === "found" ? t("{name} invited you · Centium", { name: state.preview.firstName }) : t("Invite · Centium");
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
        <PublicMessage title={t("Couldn't open this invite")} line={t(state.message)} onRetry={() => setReload((n) => n + 1)} />
      </PublicFrame>
    );
  }
  if (state.status === "missing") {
    return (
      <PublicFrame>
        <PublicMessage title={t("We couldn't find that invite")} line={t("Check the link, or ask for a new one.")} />
      </PublicFrame>
    );
  }

  const p = state.preview;
  const first = p.firstName.split(" ")[0] || "A professional";
  // Shown on the page (the English fallback above is what the profile stores).
  const shown = p.firstName.split(" ")[0] || t("A professional");
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
    <PublicFrame label={t("{name} invited you", { name: shown })}>
      {view.kind !== "unusable" && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-primary-pale px-3 py-2.5" role="note">
          <Link2 size={15} strokeWidth={2} aria-hidden className="shrink-0 text-primary-deep-text" />
          <p className="flex-1 text-charcoal leading-[1.45]" style={{ fontSize: textPx(12.5) }}>
            {view.kind === "signed_out" ? (
              // Signed out nothing is below yet (plans show after sign-in),
              // so this is the CU11 invite line (r18 cuInvite18) instead.
              <>
                <b>{t("{name} invited you", { name: shown })}</b> {t("to work together on Centium.")}
              </>
            ) : (
              <>
                <b>{t("{name} invited you.", { name: shown })}</b> {t("Hire a plan below or send a message first.")}
              </>
            )}
          </p>
        </div>
      )}

      <ProHero name={p.firstName} avatarUrl={p.avatarUrl} subtype={p.subtype} licenceVerified={p.licenceVerified} />

      <PublicCard className="flex flex-col gap-2">
        {view.kind === "unusable" && (
          <>
            <p className="font-bold text-charcoal" style={{ fontSize: textPx(15) }}>
              {t("This invite can't be used")}
            </p>
            <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
              {t(view.message)}
            </p>
            {p.handle && (
              <button type="button" onClick={() => navigate(`/p/${p.handle}`)} className="tap self-start min-h-11 font-bold text-primary-accent" style={{ fontSize: textPx(13) }}>
                {t("See {name}'s profile", { name: shown })}
              </button>
            )}
          </>
        )}

        {view.kind === "signed_out" && (
          <SignInButtons returnPath={`/i/${p.code}`} line={t("Create an account or sign in to work with {name} on Centium. Nothing is shared until you choose to share it.", { name: shown })} />
        )}

        {view.kind === "client" && alreadyClient && (
          <>
            <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
              {t("You already work with {name}.", { name: shown })}
            </p>
            <CtaButton full icon={UserRound} label={t("Open {name}'s profile", { name: shown })} onClick={() => navigate(`/app/professionals/${p.professionalId}`)} />
          </>
        )}

        {view.kind === "client" && !alreadyClient && (
          <>
            <CtaButton full icon={UserPlus} label={t("Ask to work with {name}", { name: shown })} onClick={() => setConfirming(true)} />
            <CtaButton full variant="secondary" icon={UserRound} label={t("See {name}'s profile", { name: shown })} onClick={() => navigate(profilePath)} />
          </>
        )}

        {view.kind === "own" && (
          <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
            {t("This is your invite link. Clients who open it see this page.")}
          </p>
        )}

        {view.kind === "not_client" && (
          <p className="text-charcoal-soft leading-[1.5]" style={{ fontSize: textPx(13) }}>
            {t("Invite links are for clients. Sign in with a client account to work with {name}.", { name: shown })}
          </p>
        )}

        {note && (
          <p role="alert" className="font-semibold text-status-high" style={{ fontSize: textPx(12.5) }}>
            {t(note)}
          </p>
        )}
      </PublicCard>

      <CentredPopup
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={t("Connect with {name}?", { name: shown })}
        icon={<UserPlus size={22} />}
        body={t("They'll see that you're their client. Nothing else is shared until you turn it on.")}
        cta={{ label: t("Connect"), loading: busy, onClick: () => void connect() }}
      >
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="tap mt-2 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft"
        >
          {t("Cancel")}
        </button>
      </CentredPopup>
    </PublicFrame>
  );
}
