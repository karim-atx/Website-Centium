import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { BellRing, CircleCheck, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import type { Factor } from "@supabase/supabase-js";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/ui/PinnedCta";
import { CodeBoxes, CODE_LENGTH } from "../../components/ui/CodeBoxes";
import { RecoveryCodesCard, type RecoveryCodesStatus } from "../../components/security/RecoveryCodesCard";
import { RecoveryCodesView } from "../../components/security/RecoveryCodesView";
import { generateRecoveryCodes, getRecoveryStatus } from "../../services/recoveryCodes";
import { useApp } from "../../context/AppContext";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { getMfaStatus, unenrollFactor, verifyTotp } from "../../services/mfa";

// MO1.8.4 / MO1.8.4.3 Two-factor authentication, as a page (R18; it was a
// sheet). A toggle row, then two widgets 16 apart: Authenticator app (greyed
// with dashes while off; tinted with "Connected", the date it was added and
// Change app while on) and Recovery codes.
//
// THE RECOVERY CODES WIDGET reads its count from the backend (stage 1,
// two_factor_recovery_status). View codes opens MO1.8.4.2 masked (a sheet is
// only readable when it's made); Generate new asks first, because a new
// sheet stops the old one working at once, then shows the ten fresh codes
// on MO1.8.4.2. Generating needs an aal2 session (ATX75 otherwise).
//
// Handover-complete pass: the explanatory note under the toggle is gone (not
// drawn); its one safety point, contacting support after losing the phone,
// is the Recovery codes card's line until recovery codes exist.
//
// TURNING IT OFF ASKS FOR A CODE (C20, BR-13): verifyTotp, then unenroll. It
// used to be a confirm panel that relied on GoTrue refusing a non-aal2
// session; asking for a current code as well is strictly stronger. GoTrue
// still refuses to remove a verified factor below aal2 on its own.
//
// TURNING IT ON OPENS THE SET-UP PAGE; backing out of it leaves this off.

const addedLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const fade = "transition duration-300 motion-reduce:transition-none";

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

  // --- recovery codes (stage 1) ---------------------------------------------
  const [rcStatus, setRcStatus] = useState<RecoveryCodesStatus | null>(null);
  const [view, setView] = useState<"page" | "masked" | "fresh">("page");
  const [freshCodes, setFreshCodes] = useState<string[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const loadRecovery = useCallback(async () => {
    const result = await getRecoveryStatus();
    setRcStatus(result.ok ? { left: result.value.remaining, total: result.value.total } : null);
  }, []);

  useEffect(() => {
    if (loading || !enabled) return;
    let cancelled = false;
    void getRecoveryStatus().then((result) => {
      if (!cancelled) setRcStatus(result.ok ? { left: result.value.remaining, total: result.value.total } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, enabled]);

  const generate = async () => {
    if (genBusy) return;
    setGenBusy(true);
    setGenError(null);
    const result = await generateRecoveryCodes();
    setGenBusy(false);
    if (!result.ok) {
      setGenError(result.message);
      return;
    }
    setGenOpen(false);
    setFreshCodes(result.value);
    setView("fresh");
    await loadRecovery();
  };

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

  // Exception 1 (safety, no frame): a new sheet replaces the old one
  // outright, so Generate new asks first. Shown over the page and over the
  // masked MO1.8.4.2.
  const genPopup = (
    <CentredPopup
      open={genOpen}
      onClose={() => !genBusy && setGenOpen(false)}
      title="Make new recovery codes?"
      icon={<KeyRound size={22} strokeWidth={1.75} />}
      body="Your current codes stop working as soon as the new ones are made, including any you've saved or printed."
    >
      {genError && (
        <p role="alert" className="text-center text-[12px] font-semibold text-status-high">
          {genError}
        </p>
      )}
      <CtaButton size="page" className="mt-5" label="Generate new" loading={genBusy} onClick={() => void singleFlight(generate)} />
      <button
        type="button"
        onClick={() => setGenOpen(false)}
        disabled={genBusy}
        className="tap mt-3 w-full text-center text-sm font-semibold text-charcoal-soft"
      >
        Keep my codes
      </button>
    </CentredPopup>
  );

  if (view === "fresh") {
    const done = () => {
      setFreshCodes([]);
      setView("page");
    };
    return <RecoveryCodesView codes={freshCodes} onSaved={done} onBack={done} />;
  }
  if (view === "masked" && rcStatus) {
    return (
      <>
      <RecoveryCodesView
        codes={[]}
        onSaved={() => setView("page")}
        onBack={() => setView("page")}
        masked={{
          left: rcStatus.left,
          total: rcStatus.total,
          onGenerate: () => {
            setGenError(null);
            setGenOpen(true);
          },
          generating: genBusy,
        }}
      />
      {genPopup}
      </>
    );
  }

  return (
    <div>
      <PageHeader title="Two-factor authentication" showBack sub tightBack />

      {/* MO1.8.4: 24 pt side insets; the label 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">
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
        {/* KEPT AS A SAFETY FEATURE (no frame; handover-complete pass): the way
            back from dismissing the professional dashboard's two-factor
            reminder (C13). Only for those who can see the nudge, have turned
            it off, and have no factor. */}
        {user.accountType === "professional" && twoFactorNudgeDismissed && !loading && !enabled && (
          <SettingsRow
            icon={BellRing}
            title="Remind me about two-factor"
            subtitle="You dismissed the reminder on your dashboard."
            toggle={{ checked: !twoFactorNudgeDismissed, onChange: () => setTwoFactorNudgeDismissed(false) }}
          />
        )}
      </SettingsSection>

      {/* Foundations error state: an inline line in danger under the
          affected element (the toggle that couldn't read its state). */}
      {loadError && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-status-high">
          {loadError}
        </p>
      )}

      {loading ? (
        // Foundations loading state: skeleton blocks at the widgets' places
        // (surface.soft, radius 20; 200 and 230 tall as MO1.8.4 draws them).
        <div aria-busy="true" aria-label="Loading two-factor status">
          <div className="mt-5 h-[200px] rounded-[20px] bg-cream-soft" />
          <div className="mt-4 h-[230px] rounded-[20px] bg-cream-soft" />
        </div>
      ) : (
        <>
          {/* The Authenticator app widget (Foundations 2.5 Widgets): 20 under
              the toggle row; tinted while on, greyed at 40% with dashes while
              off. MO1.8.4 / MO1.8.4.3 measured: radius 20, padding 16; header
              10.5 / 700, then 10 to a 40 pt tile (radius 12, Smartphone
              19 / 1.75), 12 to the text column: title 16 / 800, status
              13.5 / 700, added 12 / 400. On and off cross-fade their colours
              over 300 ms, none with Reduce motion. */}
          <section
            aria-label="Authenticator app"
            className={clsx(
              "mt-5 rounded-[20px] p-4",
              fade,
              // New since the redesign, so the handover's own light colours
              // (decision 22): on rgba(154,140,214,0.12), measured #F3F1FA.
              enabled ? "bg-th-9a8cd6/[0.12] dark:bg-primary-pale" : "bg-cream-soft"
            )}
          >
            {/* The header dims with the rest of the off card (measured #CBC7C4,
                the muted grey at 40%); on, it is primary.accent #7D67D9. */}
            <p
              className={clsx(
                "text-[10.5px] font-bold uppercase tracking-wide",
                fade,
                enabled ? "text-primary-accent" : "text-charcoal-faint opacity-40"
              )}
            >
              Authenticator app
            </p>
            <div className={clsx("mt-2.5 flex gap-3", fade, !enabled && "opacity-40")}>
              <span
                className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  fade,
                  // On: primary.tint #F0EDF9 with a #7D67D9 glyph (MO1.8.4.3, measured).
                  enabled ? "bg-th-f0edf9 dark:bg-primary/5" : "bg-charcoal/5"
                )}
                aria-hidden
              >
                <Smartphone size={19} strokeWidth={1.75} className={enabled ? "text-primary-accent" : "text-charcoal-faint"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-extrabold text-charcoal">Authenticator app</p>
                {enabled ? (
                  <>
                    <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-bold text-charcoal">
                      {/* MO1.8.4.3: CircleCheck 16 / 2 in the theme secondary (teal-dark follows the colour theme). */}
                      <CircleCheck size={16} strokeWidth={2} className="text-teal-dark shrink-0" aria-hidden />
                      Connected
                    </p>
                    <p className="mt-0.5 text-[12px] text-charcoal-faint">Added {addedLabel(factor.created_at)}</p>
                    <button
                      type="button"
                      onClick={() => navigate("/app/settings/two-factor/setup?change=1")}
                      // MO1.8.4.3 measured: white, 1 px #AEA1DC, #7D67D9 text.
                      // Label size unspecified (13 / 600); the board's
                      // two-line wrap is an artefact.
                      className="tap mt-3 h-9 px-4 rounded-xl border border-th-aea1dc dark:border-primary/40 bg-cream-card text-[13px] font-semibold text-primary-accent"
                    >
                      Change app
                    </button>
                  </>
                ) : (
                  <>
                    {/* MO1.8.4: status 13.5 / 700 in the main ink (at the card's
                        40%), the button white like the on state. */}
                    <p className="mt-1 text-[13.5px] font-bold text-charcoal">Status: ––</p>
                    <p className="mt-0.5 text-[12px] text-charcoal-faint">Added ––</p>
                    <span
                      aria-disabled="true"
                      className="mt-3 inline-flex h-9 px-4 items-center rounded-xl border border-charcoal/10 bg-cream-card text-[13px] font-semibold text-charcoal-faint"
                    >
                      Change app
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Measured full-strength #8C8378 on the off card (MO1.8.4), 10
                under the button. */}
            {!enabled && <p className="mt-2.5 text-[12px] text-charcoal-faint">Turn on two-factor to use this.</p>}
          </section>

          {/* Stage 1: the count, View codes (MO1.8.4.2, masked) and
              Generate new. A 0 / 0 sheet has nothing to view. */}
          <RecoveryCodesCard
            className="mt-4"
            enabled={enabled}
            status={enabled ? rcStatus : null}
            onViewCodes={rcStatus && rcStatus.total > 0 ? () => setView("masked") : undefined}
            onGenerateNew={() => {
              setGenError(null);
              setGenOpen(true);
            }}
          />
        </>
      )}
      </SettingsBody>

      {genPopup}

      {/* Exception 1 (safety, no frame): turning off asks for a current code,
          as a Foundations centred popup. */}
      <CentredPopup
        open={offOpen}
        onClose={closeOff}
        title="Turn off two-factor?"
        icon={<ShieldCheck size={22} strokeWidth={1.75} />}
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
          <p role="alert" className="mt-3 text-center text-[12px] font-semibold text-status-high">
            {offError}
          </p>
        )}
        <CtaButton
          size="page"
          className="mt-5"
          label="Turn off"
          loading={busy}
          disabled={code.length !== CODE_LENGTH}
          onClick={() => void singleFlight(turnOff)}
        />
        <button type="button" onClick={closeOff} disabled={busy} className="tap mt-3 w-full text-center text-sm font-semibold text-charcoal-soft">
          Keep it on
        </button>
      </CentredPopup>
    </div>
  );
}
