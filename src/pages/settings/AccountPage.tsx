import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Mail, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsSection } from "../../components/ui/SettingsRows";
import { Button } from "../../components/ui/Button";
import { CodeBoxes } from "../../components/ui/CodeBoxes";
import { useCooldown } from "../../components/security/useCooldown";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { formatCountdown } from "../../services/auth/cooldown";
import { verifyTotp } from "../../services/mfa";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { setMyFirstName } from "../../services/profile/firstName";
import { checkFirstName } from "../../services/profile/nameRules";
import { readAccountAuth, refreshAfterLink, requestEmailChange, resendEmailChange, type AccountAuth } from "../../services/account/emailChange";
import { checkNewEmail, emailStage, readEmailReturn, RETURN_KEYS, type EmailReturn, type EmailStage } from "../../services/account/emailChangeLogic";
import { t } from "../../i18n/core";

// Round J · FI: Settings › Data & account › Account (/app/settings/account).
// The first name, and the email through Supabase's confirm flow with double
// confirmation (links to the new and the current address; the change happens
// once both are opened). Google-only accounts see the email read-only. With
// two-factor on, a fresh code comes first. Decisions: design-handover/round-j.
//
// No frame draws this page: it is built in the Settings pages' own language
// (LanguagePage, HelpPage; the field and card styles of ChangePasswordSheet).

const inputClass =
  "w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-[15px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

type EmailStep = "show" | "form" | "code";

export default function AccountPage() {
  const { user, authUserId, updateProfile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();
  const singleFlight = useSingleFlight();

  // ---- First name --------------------------------------------------------
  const [name, setName] = useState(user.firstName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const nameChanged = name.trim() !== (user.firstName ?? "").trim();

  const saveName = async () => {
    setNameSaved(false);
    const checked = checkFirstName(name);
    if (!checked.ok) return setNameError(t(checked.message));
    if (!online) return setNameError(t(OFFLINE_MESSAGE));
    if (!authUserId) return setNameError(t("You're signed out. Sign in again."));
    setNameBusy(true);
    setNameError(null);
    const r = await setMyFirstName(checked.name);
    setNameBusy(false);
    if (!r.ok) return setNameError(r.message);
    updateProfile({ firstName: r.name });
    setName(r.name);
    setNameSaved(true);
  };

  // ---- Email ---------------------------------------------------------------
  // This load's return from a link, read once from the address it opened with.
  const [arrived] = useState<EmailReturn>(() => readEmailReturn(location.search, location.hash));
  const [auth, setAuth] = useState<AccountAuth | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<EmailStage>({ stage: "idle" });
  const [step, setStep] = useState<EmailStep>("show");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(arrived.kind === "error" ? t(arrived.message) : null);
  const [notice, setNotice] = useState<string | null>(null);
  const cooldown = useCooldown();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // A finished link changes the email on the server; a fresh token makes
      // this session's own claim match before anything is read.
      if (arrived.kind === "link") await refreshAfterLink();
      const r = await readAccountAuth();
      if (cancelled) return;
      if (!r.ok) return setLoadError(r.message);
      setAuth(r.data);
      setStage(emailStage({ email: r.data.email, new_email: r.data.newEmail }, arrived));
      // The return's own keys leave the address bar, so a reload or a shared
      // link never replays them. `code` is supabase-js's, removed by it.
      if (arrived.kind !== "none") {
        const params = new URLSearchParams(location.search);
        for (const k of RETURN_KEYS) params.delete(k);
        const rest = params.toString();
        navigate({ pathname: location.pathname, search: rest ? `?${rest}` : "" }, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once per page load: `arrived` never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = auth?.email ?? null;

  /** Sends the change once the address (and the code, with two-factor) is in. */
  const send = async (email: string) => {
    const r = await requestEmailChange(email);
    setBusy(false);
    if (!r.ok) {
      if (r.rateLimited) cooldown.start();
      setError(t(r.message));
      return;
    }
    setCode("");
    setStep("show");
    setStage({ stage: "pending", newEmail: email, afterFirst: false });
    setAuth((a) => (a ? { ...a, newEmail: email } : a));
  };

  const submitEmail = async () => {
    setError(null);
    setNotice(null);
    const checked = checkNewEmail(newEmail, current);
    if (!checked.ok) return setError(t(checked.message));
    if (!online) return setError(t(OFFLINE_MESSAGE));
    if (auth?.factorId) {
      setNewEmail(checked.email);
      setStep("code");
      return;
    }
    setBusy(true);
    await send(checked.email);
  };

  const submitCode = async () => {
    if (!auth?.factorId || code.length !== 6) return;
    setError(null);
    if (!online) return setError(t(OFFLINE_MESSAGE));
    setBusy(true);
    const verified = await verifyTotp(auth.factorId, code);
    if (!verified.ok) {
      setBusy(false);
      setCode("");
      setError(t(verified.message));
      return;
    }
    await send(newEmail.trim());
  };

  const resend = async () => {
    if (stage.stage !== "pending") return;
    setError(null);
    setNotice(null);
    if (!online) return setError(t(OFFLINE_MESSAGE));
    setBusy(true);
    const r = await resendEmailChange(stage.newEmail);
    setBusy(false);
    if (!r.ok) {
      if (r.rateLimited) cooldown.start();
      setError(t(r.message));
      return;
    }
    cooldown.start();
    setNotice(t("Sent again. Check your inbox and spam folder."));
  };

  const errorLine = (cooldown.active && !error) || error ? (
    <p className="text-xs font-semibold text-status-high" role="alert">
      {error ?? t("Too many attempts. Try again in {time}.", { time: formatCountdown(cooldown.left) })}
    </p>
  ) : null;

  return (
    <div>
      <PageHeader title={t("Account")} showBack sub tightBack />
      <SettingsBody className="-mt-1">
        <SettingsSection label={t("First name")}>
          <form
            noValidate
            className="space-y-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (nameChanged && !nameBusy) void singleFlight(saveName);
            }}
          >
            <label className="block">
              <span className="sr-only">{t("First name")}</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                  setNameSaved(false);
                }}
                autoComplete="given-name"
                maxLength={120}
                placeholder={t("First name")}
                className={inputClass}
              />
            </label>
            <p className="text-xs text-charcoal-soft leading-relaxed">{t("This is the name Centium uses for you.")}</p>
            {nameError && (
              <p className="text-xs font-semibold text-status-high" role="alert">
                {nameError}
              </p>
            )}
            {nameSaved && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark" role="status">
                <Check size={13} aria-hidden />
                {t("Name saved")}
              </p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={!nameChanged || nameBusy}>
              {nameBusy ? t("Saving…") : t("Save name")}
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection label={t("Email")}>
          <div className="space-y-3 py-3">
            {!auth && !loadError && <p className="text-sm text-charcoal-faint">{t("Checking your account…")}</p>}
            {loadError && (
              <p className="text-xs font-semibold text-status-high" role="alert">
                {t(loadError)}
              </p>
            )}

            {auth && (
              <div>
                <p className="text-xs text-charcoal-soft">{t("Current email")}</p>
                <p className="text-[15px] font-medium text-charcoal break-all">
                  {/* An address reads left to right inside an Arabic line. */}
                  <bdi dir="ltr">{current}</bdi>
                </p>
              </div>
            )}

            {auth?.googleOnly && (
              <div className="rounded-2xl bg-cream-card px-4 py-3.5">
                <p className="text-sm font-semibold text-charcoal">{t("You sign in with Google")}</p>
                <p className="text-xs text-charcoal-soft mt-1 leading-relaxed">
                  {t("Your email comes from your Google account, so it's changed there, not in Centium.")}
                </p>
              </div>
            )}

            {auth && !auth.googleOnly && stage.stage === "done" && step === "show" && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5" role="status">
                <Check size={16} className="shrink-0 mt-0.5 text-primary-dark" aria-hidden />
                <p className="text-sm text-primary-dark leading-relaxed">{t("Your email is now {email}. Use it to sign in from now on.", { email: stage.email })}</p>
              </div>
            )}

            {auth && !auth.googleOnly && stage.stage === "pending" && step === "show" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5" role="status">
                  <Mail size={16} className="shrink-0 mt-0.5 text-primary-dark" aria-hidden />
                  <div className="text-sm text-primary-dark leading-relaxed space-y-1">
                    <p className="font-semibold">{stage.afterFirst ? t("One more link to open") : t("Check your inbox")}</p>
                    <p>
                      {stage.afterFirst
                        ? t("That link worked. Now open the one we sent to the other address to finish changing to {new}.", { new: stage.newEmail })
                        : t("We sent a link to {new} and to {current}. Open both to finish.", { new: stage.newEmail, current: current ?? "" })}
                    </p>
                    <p>{t("Until then, you keep signing in with {current}.", { current: current ?? "" })}</p>
                  </div>
                </div>
                {notice && (
                  <p className="text-xs text-charcoal-soft" role="status">
                    {notice}
                  </p>
                )}
                {errorLine}
                <Button fullWidth size="lg" variant="secondary" disabled={busy || cooldown.active} onClick={() => void singleFlight(resend)}>
                  {cooldown.active ? t("Send again in {time}", { time: formatCountdown(cooldown.left) }) : t("Send the links again")}
                </Button>
                <button
                  type="button"
                  className="tap w-full text-center text-xs font-semibold text-charcoal-soft"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setNewEmail("");
                    setStep("form");
                  }}
                >
                  {t("Use a different address")}
                </button>
              </div>
            )}

            {auth && !auth.googleOnly && stage.stage !== "pending" && step === "show" && (
              <>
                {errorLine}
                <Button
                  fullWidth
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    setError(null);
                    setNewEmail("");
                    setStep("form");
                  }}
                >
                  {t("Change email")}
                </Button>
              </>
            )}

            {auth && !auth.googleOnly && step === "form" && (
              <form
                noValidate
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!busy && !cooldown.active) void singleFlight(submitEmail);
                }}
              >
                <label className="block">
                  <span className="sr-only">{t("New email")}</span>
                  <input
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setError(null);
                    }}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    dir="ltr"
                    placeholder={t("New email")}
                    className={inputClass}
                    style={{ textAlign: "start" }}
                  />
                </label>
                <p className="text-xs text-charcoal-soft leading-relaxed">
                  {t("We'll send a link to the new address and to {current}. Your email changes once you've opened both.", { current: current ?? "" })}
                </p>
                {errorLine}
                <Button type="submit" fullWidth size="lg" disabled={busy || cooldown.active || !newEmail.trim()}>
                  {busy ? t("Sending…") : auth.factorId ? t("Continue") : t("Send the links")}
                </Button>
                <button type="button" className="tap w-full text-center text-xs font-semibold text-charcoal-soft" onClick={() => setStep("show")}>
                  {t("Cancel")}
                </button>
              </form>
            )}

            {auth && !auth.googleOnly && step === "code" && (
              <form
                noValidate
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!busy && code.length === 6) void singleFlight(submitCode);
                }}
              >
                <div className="flex items-start gap-2.5 rounded-2xl bg-cream-card px-4 py-3.5">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-primary-dark" aria-hidden />
                  <p className="text-sm text-charcoal leading-relaxed">{t("Two-factor is on. Enter the code from your authenticator app to change your email.")}</p>
                </div>
                <CodeBoxes
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setError(null);
                  }}
                  error={!!error}
                  disabled={busy}
                  autoFocus
                  label={t("Six-digit code from your authenticator app")}
                />
                {errorLine}
                <Button type="submit" fullWidth size="lg" disabled={busy || code.length !== 6}>
                  {busy ? t("Checking…") : t("Send the links")}
                </Button>
                <button type="button" className="tap w-full text-center text-xs font-semibold text-charcoal-soft" onClick={() => setStep("form")}>
                  {t("Back")}
                </button>
              </form>
            )}
          </div>
        </SettingsSection>
      </SettingsBody>
    </div>
  );
}
