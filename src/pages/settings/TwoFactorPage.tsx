import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { BellRing, CircleCheck, ShieldCheck, Smartphone } from "lucide-react";
import type { Factor } from "@supabase/supabase-js";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/ui/PinnedCta";
import { CodeBoxes, CODE_LENGTH } from "../../components/ui/CodeBoxes";
import { useApp } from "../../context/AppContext";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { getMfaStatus, unenrollFactor, verifyTotp } from "../../services/mfa";

// MO1.8.4 / MO1.8.4.3 Two-factor authentication, as a page (R18; it was a
// sheet). A toggle row, then the Authenticator app widget: greyed with
// dashes while off, tinted with "Connected", the date it was added and
// Change app while on.
//
// THE RECOVERY CODES WIDGET IS NOT DRAWN (C21). Supabase issues no recovery
// codes and the backend for them does not exist yet (backlog), so a card of
// placeholders that could never work is left out until it does.
//
// TURNING IT OFF ASKS FOR A CODE (C20, BR-13): verifyTotp, then unenroll. It
// used to be a confirm panel that relied on GoTrue refusing a non-aal2
// session; asking for a current code as well is strictly stronger. GoTrue
// still refuses to remove a verified factor below aal2 on its own.
//
// TURNING IT ON OPENS THE SET-UP PAGE; backing out of it leaves this off.

const addedLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function TwoFactorPage() {
  const { refreshMfaState, user, twoFactorNudgeDismissed, setTwoFactorNudgeDismissed } = useApp();
  const navigate = useNavigate();
  const singleFlight = useSingleFlight();

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getMfaStatus();
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    setLoadError(null);
    setFactors(result.data.factors);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setFactors(result.data.factors);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const factor = factors[0] ?? null;
  const enabled = !!factor;

  // --- turning off: a code first ---------------------------------------------
  const [offOpen, setOffOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);

  const closeOff = () => {
    if (busy) return;
    setOffOpen(false);
    setCode("");
    setOffError(null);
  };

  const turnOff = async () => {
    if (!factor || code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setOffError(null);
    // Proves the person holds the authenticator now, not just a session.
    const verified = await verifyTotp(factor.id, code);
    if (!verified.ok) {
      setBusy(false);
      setCode("");
      setOffError(verified.message);
      return;
    }
    const removed = await unenrollFactor(factor.id);
    setBusy(false);
    if (!removed.ok) {
      setOffError(removed.message);
      return;
    }
    setOffOpen(false);
    setCode("");
    await refreshMfaState();
    await load();
  };

  return (
    <div>
      <PageHeader title="Two-factor authentication" showBack sub />

      <SettingsSection label="Protection">
        <SettingsRow
          icon={ShieldCheck}
          title="Two-factor authentication"
          toggle={{
            checked: enabled,
            disabled: loading,
            onChange: (next) => {
              if (next) navigate("/app/settings/two-factor/setup");
              else setOffOpen(true);
            },
          }}
        />
        {/* THE WAY BACK FROM A DISMISSAL (moved here from Settings, C13): the
            professional dashboard's nudge hides once dismissed, so turning it
            back on sits next to the thing it reminds you about. Only for those
            who can see the nudge, have turned it off, and have no factor. */}
        {user.accountType === "professional" && twoFactorNudgeDismissed && !loading && !enabled && (
          <SettingsRow
            icon={BellRing}
            title="Remind me about two-factor"
            subtitle="You dismissed the reminder on your dashboard."
            toggle={{ checked: !twoFactorNudgeDismissed, onChange: () => setTwoFactorNudgeDismissed(false) }}
          />
        )}
      </SettingsSection>

      {loadError && <p className="mt-3 text-xs font-semibold text-status-high">{loadError}</p>}

      {/* One short note keeps what the old sheet explained (C23). */}
      <p className="mt-3 text-[12px] leading-relaxed text-charcoal-faint">
        {enabled
          ? "Signing in asks for a code from your authenticator app as well as your password. On a device where you chose “Remember me”, you're only asked again when that session ends. If you lose your phone, contact support: Centium doesn't issue backup codes yet."
          : "A 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy or any other), as well as your password. Turning it off means your password alone gets into your account."}
      </p>

      {/* The Authenticator app widget (Foundations 2.5 Widgets): primary-pale
          while on, greyed at 40% with dashes while off. */}
      <section
        aria-label="Authenticator app"
        className={clsx("mt-6 rounded-2xl px-4 py-4", enabled ? "bg-primary-pale" : "bg-cream-soft")}
      >
        <p className={clsx("text-xs font-semibold uppercase tracking-wide", enabled ? "text-primary-deep-text" : "text-charcoal-faint")}>
          Authenticator app
        </p>
        <div className={clsx("mt-3 flex gap-3.5", !enabled && "opacity-40")}>
          <span className="w-10 h-10 rounded-2xl bg-cream-card flex items-center justify-center shrink-0" aria-hidden>
            <Smartphone size={18} className={enabled ? "text-primary-dark" : "text-charcoal-faint"} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-charcoal">Authenticator app</p>
            {enabled ? (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-charcoal">
                  <CircleCheck size={16} className="text-primary-dark shrink-0" aria-hidden />
                  Connected
                </p>
                <p className="mt-0.5 text-[12px] text-charcoal-faint">Added {addedLabel(factor.created_at)}</p>
                <button
                  type="button"
                  onClick={() => navigate("/app/settings/two-factor/setup?change=1")}
                  className="tap mt-3 h-9 px-4 rounded-xl border border-primary/40 bg-cream-card text-[13px] font-semibold text-primary-deep-text"
                >
                  Change app
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-[14px] font-semibold text-charcoal-faint">Status: –</p>
                <p className="mt-0.5 text-[12px] text-charcoal-faint">Added –</p>
                <span className="mt-3 inline-flex h-9 px-4 items-center rounded-xl border border-charcoal/10 text-[13px] font-semibold text-charcoal-faint">
                  Change app
                </span>
              </>
            )}
          </div>
        </div>
        {!enabled && <p className="mt-3 text-[12px] text-charcoal-soft">Turn on two-factor to use this.</p>}
      </section>

      <CentredPopup
        open={offOpen}
        onClose={closeOff}
        title="Turn off two-factor?"
        icon={<ShieldCheck size={22} />}
        body="Enter the 6-digit code from your authenticator app. Without two-factor, your password alone gets into your account, including your health data."
      >
        <CodeBoxes
          value={code}
          onChange={(v) => {
            setCode(v);
            if (offError) setOffError(null);
          }}
          error={!!offError}
          disabled={busy}
          autoFocus
          label="Six-digit authentication code"
        />
        {offError && (
          <p role="alert" className="mt-3 text-center text-xs font-semibold text-status-high">
            {offError}
          </p>
        )}
        <CtaButton
          size="page"
          className="mt-5"
          label={busy ? "Turning off…" : "Turn off"}
          disabled={busy || code.length !== CODE_LENGTH}
          onClick={() => void singleFlight(turnOff)}
        />
        <button type="button" onClick={closeOff} disabled={busy} className="tap mt-3 w-full text-center text-sm font-semibold text-charcoal-soft">
          Keep it on
        </button>
      </CentredPopup>
    </div>
  );
}
