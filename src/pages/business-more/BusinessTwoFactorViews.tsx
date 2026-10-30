import { useState } from "react";
import clsx from "clsx";
import { Copy, Download, KeyRound, RefreshCcw, Smartphone } from "lucide-react";
import { BizButton, BizCard, BizConfirm, BizLabel, BizPopup, BizRow, PopButton, SubHeader, BORDER } from "../../components/business-more/kit";
import { CodeBoxes, CODE_LENGTH } from "../../components/ui/CodeBoxes";
import { useIsDark } from "../../hooks/useIsDark";
import { RECOVERY_CODES_FILENAME, recoveryCodesClipboard, recoveryCodesFile } from "../../components/security/recoveryCodesText";
import { formatShortDate } from "../../utils/date";
import { t, tk, tn } from "../../i18n/core";

// MO1B-035 to -044 · the business two-factor screens (BizMoreV8 screen="twofa"
// / "twofaSetup" / "recovery", lines 210 to 223). Presentation only: the
// Supabase MFA flow, recovery-code RPCs and the verify-then-unenroll order
// stay in TwoFactorPage / TwoFactorSetupPage (KEEP-SAFETY), which render
// these for business accounts. Teal per the source: card rgba(111,153,147,0.12)
// / #293339, ink #3E6B67 / #B2D4CF, tile #E4F0EE / rgba(162,200,194,0.1),
// buttons 1px #6F9993 / #4F8F8A with #2F5F58 / #B2D4CF.

const addedLabel = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

function TealCard({
  label,
  icon: Icon,
  title,
  s1,
  s2,
  bar,
  buttons,
  off,
  note,
}: {
  label: string;
  icon: typeof Smartphone;
  title: string;
  s1: string;
  s2?: string;
  bar?: number;
  buttons?: { label: string; onClick?: () => void }[];
  off: boolean;
  note?: string;
}) {
  const dark = useIsDark();
  const ink = dark ? "#B2D4CF" : "#3E6B67";
  return (
    <div role="group" aria-label={title} style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: off ? "rgb(var(--c-cream-soft))" : dark ? "#293339" : "rgba(111,153,147,0.12)" }}>
      <p className={clsx("text-[10.5px] font-bold uppercase tracking-[0.05em]", off && "text-charcoal-faint")} style={{ color: off ? undefined : ink, opacity: off ? 0.4 : 1 }}>
        {label}
      </p>
      <div className="flex" style={{ marginTop: 10, gap: 12, opacity: off ? 0.4 : 1 }}>
        <span
          aria-hidden
          className="flex items-center justify-center shrink-0"
          style={{ width: 40, height: 40, borderRadius: 12, background: off ? "rgba(36,31,27,0.05)" : dark ? "rgba(162,200,194,0.1)" : "rgb(var(--th-e4f0ee))", color: off ? "rgb(var(--c-charcoal-faint))" : ink }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-extrabold text-charcoal">{title}</p>
          <p className="text-[13.5px] font-bold text-charcoal" style={{ marginTop: 4 }}>
            {s1}
          </p>
          {s2 && (
            <p className="text-[12px] text-charcoal-faint" style={{ marginTop: 2 }}>
              {s2}
            </p>
          )}
          {bar !== undefined && (
            <div className="bg-cream-card overflow-hidden" style={{ marginTop: 6, height: 4, borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${Math.round(bar * 100)}%`, background: ink, borderRadius: 999 }} />
            </div>
          )}
          {buttons && buttons.length > 0 && (
            <div className="flex flex-wrap" style={{ marginTop: 10, gap: 8 }}>
              {buttons.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={off ? undefined : b.onClick}
                  aria-disabled={off || !b.onClick || undefined}
                  className="tap inline-flex items-center bg-cream-card text-[13px] font-semibold border"
                  style={{ height: 36, padding: "0 16px", borderRadius: 12, borderColor: dark ? "rgb(var(--th-4f8f8a))" : "rgb(var(--th-6f9993))", color: dark ? "#B2D4CF" : "rgb(var(--thi-2f5f58))" }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {note && (
        <p className="text-[12px] text-charcoal-faint" style={{ marginTop: 10 }}>
          {note}
        </p>
      )}
    </div>
  );
}

/** MO1B-042 · Make new recovery codes? (BizMoreV8 hasConfirm, refresh-cw). */
export function BusinessGenerateConfirm({ open, busy, onConfirm, onCancel }: { open: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <BizConfirm
      open={open}
      icon={RefreshCcw}
      title={t("Make new recovery codes?")}
      body={t("Your current codes stop working as soon as the new ones are made, including any you've saved or printed.")}
      action={t("Generate new")}
      cancel={t("Cancel")}
      busy={busy}
      onAction={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function BusinessTwoFactorView(p: {
  loading: boolean;
  enabled: boolean;
  factorCreatedAt: string | null;
  loadError: string | null;
  rc: { left: number; total: number } | null;
  onToggle: (next: boolean) => void;
  onViewCodes?: () => void;
  onGenerate: () => void;
  genOpen: boolean;
  genBusy: boolean;
  genError: string | null;
  onGenConfirm: () => void;
  onGenCancel: () => void;
  offOpen: boolean;
  offBusy: boolean;
  offError: string | null;
  code: string;
  onCode: (v: string) => void;
  onTurnOff: () => void;
  onCloseOff: () => void;
}) {
  const off = !p.enabled;
  return (
    <div>
      <SubHeader title={t("Two-factor authentication")} />
      <BizLabel>{t("Protection")}</BizLabel>
      <BizCard>
        <BizRow title={t("Two-factor authentication")} desc={p.loading ? undefined : p.enabled ? t("On") : t("Off")} toggle={{ checked: p.enabled, disabled: p.loading, onChange: p.onToggle }} />
      </BizCard>
      {p.loadError && (
        <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginBottom: 12 }}>
          {p.loadError}
        </p>
      )}
      {p.genError && !p.genOpen && (
        <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginBottom: 12 }}>
          {p.genError}
        </p>
      )}
      {p.loading ? (
        <div aria-busy="true" aria-label={t("Loading two-factor status")}>
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ height: 126, borderRadius: 20, marginBottom: 12 }} />
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ height: 162, borderRadius: 20 }} />
        </div>
      ) : (
        <>
          <TealCard
            off={off}
            label={t("Sign-in method")}
            icon={Smartphone}
            title={t("Authenticator app")}
            s1={t("Status: {status}", { status: off ? "––" : t("On") })}
            s2={t("Added {date}", { date: off || !p.factorCreatedAt ? "––" : addedLabel(p.factorCreatedAt) })}
          />
          <TealCard
            off={off}
            label={t("Backup")}
            icon={KeyRound}
            title={t("Recovery codes")}
            s1={off || !p.rc ? t("–– codes left") : p.rc.total === 0 ? t("No codes yet") : tn(p.rc.total, "{left} of {n} codes left", "{left} of {n} codes left", { left: p.rc.left })}
            bar={off || !p.rc || p.rc.total === 0 ? 0 : p.rc.left / p.rc.total}
            buttons={[
              { label: t("View codes"), onClick: p.onViewCodes },
              { label: t("Generate new"), onClick: p.onGenerate },
            ]}
            note={off ? t("Turn on two-factor to use this.") : undefined}
          />
        </>
      )}
      <BusinessGenerateConfirm open={p.genOpen} busy={p.genBusy} onConfirm={p.onGenConfirm} onCancel={p.onGenCancel} />
      <BizPopup
        open={p.offOpen}
        onClose={p.onCloseOff}
        title={t("Turn off two-factor?")}
        lead={t("Enter a code from your authenticator app to confirm. Anyone with your password could then sign in to your business.")}
      >
        <p className="text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
          {t("Six-digit authentication code")}
        </p>
        <CodeBoxes className="!gap-2 [&>input]:flex-1" value={p.code} onChange={p.onCode} error={!!p.offError} disabled={p.offBusy} autoFocus label={t("Six-digit authentication code")} />
        {p.offError && (
          <p role="alert" className="text-[12px] font-bold text-status-high" style={{ marginTop: 8 }}>
            {p.offError}
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          <PopButton label={t("Turn off")} onClick={p.onTurnOff} disabled={p.code.length !== CODE_LENGTH} busy={p.offBusy} />
        </div>
      </BizPopup>
    </div>
  );
}

/** MO1B-040: the frame's wording for a wrong code (services/auth's shared sentence elsewhere). */
// The service may hand back the sentence already in the reader's language (Round F), so both forms are matched.
const WRONG_CODE = tk("That code didn't match. Check your authenticator app and try the current code.");
const frameError = (e: string | null) => (e === WRONG_CODE || e === t(WRONG_CODE) ? t("That code didn't work. Check the time on your phone and try the newest code.") : e);

/** "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP". */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

export function BusinessTwoFactorSetupView(p: {
  step: 1 | 2;
  ready: boolean;
  startError: string | null;
  qrCode: string | null;
  secret: string | null;
  copied: boolean;
  onCopy: () => void;
  onNext: () => void;
  code: string;
  onCode: (v: string) => void;
  error: string | null;
  busy: boolean;
  onVerify: () => void;
  onBack?: () => void;
}) {
  return (
    <div>
      <SubHeader title={t("Set up two-factor")} sub={t("Scan the code with your authenticator app, then enter the 6-digit code it shows.")} onBack={p.onBack} />
      {p.startError && (
        <p role="alert" className="text-[12px] font-semibold text-status-high">
          {p.startError}
        </p>
      )}
      {!p.startError && !p.ready && (
        <div aria-busy="true" aria-label={t("Loading two-factor setup")} className="flex flex-col items-center">
          <div className="bg-cream-soft animate-skeleton-pulse" style={{ width: 168, height: 168, borderRadius: 16, marginTop: 40 }} />
        </div>
      )}
      {p.ready && p.step === 1 && (
        <>
          <p className="text-[12px] font-bold leading-[18px] text-primary-dark" style={{ margin: "0 0 10px" }}>
            {t("STEP 1 OF 2")}
          </p>
          <p className="text-[15px] font-extrabold text-charcoal" style={{ margin: "0 0 14px" }}>
            {t("Scan this code with your authenticator app.")}
          </p>
          <div className="flex flex-col items-center" style={{ gap: 10, marginBottom: 14 }}>
            {/* On white in both themes so any camera can read it (MO1B-038 O1). */}
            <div className={clsx("bg-white border", BORDER)} style={{ width: 168, height: 168, borderRadius: 16, padding: 12 }}>
              {p.qrCode && <img src={p.qrCode} alt={t("QR code for two-factor setup")} className="w-full h-full" />}
            </div>
            {p.secret && (
              <button
                type="button"
                onClick={p.onCopy}
                aria-label={t("Copy setup key")}
                className="tap flex items-center justify-center bg-cream-soft text-charcoal text-[12.5px] font-bold tracking-[0.06em] break-all text-center"
                style={{ gap: 8, minHeight: 40, padding: "8px 14px", borderRadius: 12, fontFamily: "ui-monospace, Menlo, monospace" }}
              >
                {grouped(p.secret)}
                <Copy size={14} aria-hidden className="text-primary-dark" />
              </button>
            )}
          </div>
          <p className="text-center text-[13px] font-semibold leading-[19px] text-charcoal-soft" style={{ margin: "-4px 0 14px" }} aria-live="polite">
            {p.copied ? t("Setup key copied") : t("Can't scan? Copy the setup key")}
          </p>
          <BizButton label={t("Next")} onClick={p.onNext} />
        </>
      )}
      {p.ready && p.step === 2 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            p.onVerify();
          }}
        >
          <p className="text-[12px] font-bold leading-[18px] text-primary-dark" style={{ margin: "0 0 10px" }}>
            {t("STEP 2 OF 2")}
          </p>
          <p className="text-[15px] font-extrabold text-charcoal" style={{ margin: "0 0 10px" }}>
            {t("Enter the six-digit code your app shows.")}
          </p>
          <p className="text-[12px] font-bold text-charcoal-soft" style={{ margin: "0 0 4px" }}>
            {t("Six-digit authentication code")}
          </p>
          <div style={{ margin: "4px 0 12px" }}>
            <CodeBoxes className="!gap-2 [&>input]:flex-1" value={p.code} onChange={p.onCode} error={!!p.error} disabled={p.busy} autoFocus label={t("Six-digit authentication code")} />
          </div>
          {p.error && (
            <p role="alert" className="text-[12px] font-bold text-status-high" style={{ margin: "-4px 0 10px" }}>
              {frameError(p.error)}
            </p>
          )}
          <BizButton type="submit" label={t("Verify")} disabled={p.code.length !== CODE_LENGTH} busy={p.busy} />
        </form>
      )}
    </div>
  );
}

export function BusinessRecoveryCodesView({
  codes,
  masked,
  onDone,
  onBack,
}: {
  codes: readonly string[];
  masked?: { left: number; total: number; onGenerate: () => void; generating?: boolean };
  onDone: () => void;
  onBack?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodesClipboard(codes));
      setCopied(true);
    } catch {
      /* the codes are on screen */
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([recoveryCodesFile(codes)], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = RECOVERY_CODES_FILENAME;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div>
      <SubHeader title={t("Recovery codes")} sub={t("Each code works once if you lose your phone. Keep them somewhere safe.")} onBack={onBack} />
      <p className="text-center text-[20px] font-extrabold leading-[30px] text-charcoal" style={{ margin: "0 0 6px" }}>
        {t("Two-factor is on")}
      </p>
      <p className="text-center text-[14px] leading-[21px] text-charcoal-soft" style={{ margin: "0 0 16px" }}>
        {masked
          ? tn(masked.total, "{left} of {n} codes left. Codes are only shown once, when they're made; generate new ones if you've lost them.", "{left} of {n} codes left. Codes are only shown once, when they're made; generate new ones if you've lost them.", { left: masked.left })
          : t("Save these codes. Each one signs you in once if you lose your phone.")}
      </p>
      <ul aria-label={t("Your recovery codes")} className="grid grid-cols-2 bg-primary-pale" style={{ columnGap: 12, rowGap: 10, borderRadius: 16, padding: 14, marginBottom: 12 }}>
        {(masked ? Array.from({ length: masked.total }, () => "••••-••••") : codes).map((c, i) => (
          <li
            key={`${c}-${i}`}
            className={clsx("text-center text-[14px] font-bold tracking-[0.08em]", masked ? "text-charcoal-faint" : "text-charcoal select-all")}
            style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
          >
            {c}
          </li>
        ))}
      </ul>
      {!masked && (
        <BizCard>
          <BizRow icon={Copy} title={copied ? t("Copied") : t("Copy codes")} onClick={() => void copy()} />
          <BizRow icon={Download} title={t("Download codes")} onClick={download} />
        </BizCard>
      )}
      {masked ? <BizButton label={t("Generate new")} onClick={masked.onGenerate} busy={masked.generating} /> : <BizButton label={t("Done")} onClick={onDone} />}
    </div>
  );
}

