import React, { useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, Check, HeartPulse, Loader2, MessageCircle, Store, Users, Utensils, Wallet, type LucideIcon } from "lucide-react";
import type { OnboardingDraft } from "./Onboarding";
import type { AccountType, CustomerSubtype, ProfessionalSubtype } from "../../types";
import { previewClientCode, type ClientCodePreview } from "../../services/redemption";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ObFooter, ObHeader, ObPage, ObProgress, ObTitle } from "./shell/ObShell";
import { ObSelectCard } from "./shell/ObBlocks";
import { Composed, OB, type Composition } from "./shell/visuals";
import { useOnboardingFlow } from "./shell/flow";
import { t, tk } from "../../i18n/core";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// v6 (OB-013…032, 084…086): SharedOnboardingV4 screen "accountType" — three
// rich cards, Personal's General user / Client of a professional pair, the
// confirmation sheet ("Continue as …") and the account-type-continue motion.
// Kept (V6-70, OURS-client-code): the professional's code entry, preview and
// redemption at finish. Changing the type clears the old type's answers.

const CARDS: {
  type: AccountType;
  comp: Composition;
  title: string;
  desc: string;
  points: string[];
  tile: "pale" | "teal";
  dot: string;
}[] = [
  { type: "customer", comp: "personal", title: tk("Personal"), desc: tk("Look after your own health."), points: [tk("Log food, training and sleep"), tk("Work with your professional")], tile: "teal", dot: OB.leaf },
  { type: "professional", comp: "professional", title: tk("Professional"), desc: tk("Coach, treat or advise clients."), points: [tk("Plans and check-ins for each client"), tk("Get found on Explore")], tile: "pale", dot: OB.brand },
  { type: "business", comp: "business", title: tk("Business"), desc: tk("Run a gym, studio or store."), points: [tk("Classes, members, payments and team"), tk("Sell products or services")], tile: "pale", dot: OB.brand },
];

/** The confirmation sheet's contents (SharedOnboardingV4 CC). */
const CONFIRM: Record<AccountType, { title: string; lead: string; rows: [LucideIcon, string][]; note: string; button: string; tile: "pale" | "teal"; comp: Composition }> = {
  customer: {
    title: tk("Personal account"),
    lead: tk("For looking after your own health, your way."),
    rows: [
      [Utensils, tk("Log food, workouts and sleep")],
      [HeartPulse, tk("See trends in your health metrics")],
      [Users, tk("Work with a professional if you have one")],
    ],
    note: tk("Free to start. Premium adds AI logging and deeper insights."),
    button: tk("Continue as personal"),
    tile: "teal",
    comp: "personal",
  },
  professional: {
    title: tk("Professional account"),
    lead: tk("For coaching, treating or advising clients."),
    rows: [
      [Users, tk("Your clients, plans and check-ins")],
      [MessageCircle, tk("Messages and progress in one place")],
      [BadgeCheck, tk("A public profile clients can find")],
    ],
    // User decision 14 Oct 2026: every lane is listed only once verified.
    note: tk("We check each professional's licence or certificate before their profile goes live."),
    button: tk("Continue as professional"),
    tile: "pale",
    comp: "professional",
  },
  business: {
    title: tk("Business account"),
    lead: tk("For gyms, studios and stores."),
    rows: [
      [CalendarDays, tk("Classes, members and bookings")],
      [Wallet, tk("Payments, team and your listing")],
      [Store, tk("Sell products or services on Explore")],
    ],
    note: tk("We review every business before it goes live."),
    button: tk("Continue as business"),
    tile: "pale",
    comp: "business",
  },
};

const SUBS: { value: CustomerSubtype; label: string }[] = [
  { value: "general", label: tk("General user") },
  { value: "client", label: tk("Client of a professional") },
];

type CodeCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; data: ClientCodePreview }
  | { status: "not_found" }
  | { status: "unusable"; message: string }
  | { status: "error"; message: string };

const subtypeLabel: Record<ProfessionalSubtype, string> = {
  trainer: tk("Personal trainer"),
  physiotherapist: tk("Physiotherapist"),
  dietitian: tk("Dietitian"),
  doctor: tk("Doctor"),
  nutritionist: tk("Nutritionist"),
  coach_instructor: tk("Coach or instructor"),
  other: tk("Health professional"),
};

export const AccountTypeStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const needsCode = draft.accountType === "customer" && draft.customerSubtype === "client";
  const enteredCode = draft.professionalUserIdCode.trim().toUpperCase();
  const [check, setCheck] = useState<CodeCheck>({ status: "idle" });
  const [sheet, setSheet] = useState(false);
  /** account-type-continue: unselected cards fade (180 ms), the title dims, the picked card lifts. */
  const [leaving, setLeaving] = useState(false);

  // V6 (QA 6.0): the code must match one a professional generated:
  // preview_client_code() debounced 450 ms, showing who it belongs to before
  // anything is redeemed (it is spent at the end of onboarding).
  useEffect(() => {
    if (!needsCode || enteredCode.length === 0) {
      setCheck({ status: "idle" });
      setDraft((d) => (d.clientCodeProfessional ? { ...d, clientCodeProfessional: null } : d));
      return;
    }
    let cancelled = false;
    setCheck({ status: "checking" });
    const timer = setTimeout(async () => {
      const result = await previewClientCode(enteredCode);
      if (cancelled) return;
      if (result.status === "error") {
        setCheck({ status: "error", message: result.message });
        return;
      }
      if (result.status === "not_found") {
        setCheck({ status: "not_found" });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      if (result.data.redeemed) {
        setCheck({ status: "unusable", message: tk("That code has already been used.") });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      if (result.data.expiresAt && new Date(result.data.expiresAt).getTime() < Date.now()) {
        setCheck({ status: "unusable", message: tk("That code has expired. Ask for a new one.") });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      setCheck({ status: "found", data: result.data });
      setDraft((d) => ({
        ...d,
        clientCodeProfessional: {
          id: result.data.professionalId,
          firstName: result.data.professionalFirstName,
          avatarUrl: result.data.professionalAvatarUrl,
          subtype: result.data.professionalSubtype as ProfessionalSubtype,
        },
      }));
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enteredCode, needsCode, setDraft]);

  const codeIsValid = check.status === "found";
  const canContinue =
    draft.accountType === "customer"
      ? !!draft.customerSubtype && (!needsCode || codeIsValid)
      : draft.accountType === "professional" || draft.accountType === "business";

  /**
   * CHANGING THE ACCOUNT TYPE CLEARS THE OLD ONE'S ANSWERS (a specialty never
   * rides into a business, a client code never into a professional). Picking
   * the same type again keeps them. Personal starts on General user, as drawn.
   */
  const chooseType = (value: AccountType) =>
    setDraft((d) =>
      d.accountType === value
        ? d
        : {
            ...d,
            accountType: value,
            professionalSubtype: null,
            businessType: null,
            customerSubtype: value === "customer" ? "general" : null,
            professionalUserIdCode: "",
            clientCodeProfessional: null,
          }
    );

  const confirm = () => {
    setSheet(false);
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      onNext();
    }, 180);
  };

  const sel = draft.accountType;
  const codeError = check.status === "not_found" ? t("Code not found. Check it and try again.") : check.status === "unusable" || check.status === "error" ? t(check.message) : null;
  const conf = sel ? CONFIRM[sel] : null;

  return (
    <ObPage backdrop>
      <div className={`ob-body ${flow?.leaving ? "ob-step-out" : "ob-step-in"}`}>
        <ObProgress count={12} index={2} variant="intro" />
        <ObHeader margin="intro" onBack={onBack} />
        <ObTitle
          variant="intro"
          eyebrow={t("Your account")}
          title={t("What brings you to Centium?")}
          subtitle={t("This shapes your experience. You can adjust it later.")}
          fade={leaving ? 0.25 : 1}
        />
        <div className="ob-cards" role="radiogroup" aria-label={t("Account type")}>
          {CARDS.map((c) => {
            const on = sel === c.type;
            const recede = !!sel && !on;
            return (
              <ObSelectCard
                key={c.type}
                title={t(c.title)}
                desc={t(c.desc)}
                points={c.points.map((p) => t(p))}
                dot={c.dot}
                tile={c.tile}
                on={on}
                recede={recede}
                leaving={leaving}
                visual={({ recede: r }) => <Composed comp={c.comp} w={r ? 34 : 40} />}
                onSelect={() => chooseType(c.type)}
                subs={
                  c.type === "customer"
                    ? SUBS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className="ob-card-sub tap"
                          aria-pressed={draft.customerSubtype === s.value}
                          onClick={() => setDraft((d) => ({ ...d, customerSubtype: s.value }))}
                        >
                          {t(s.label)}
                        </button>
                      ))
                    : undefined
                }
                extra={c.type === "customer" && needsCode ? <ClientCodeField draft={draft} setDraft={setDraft} check={check} error={codeError} /> : undefined}
              />
            );
          })}
        </div>
        <p className="ob-cards-note" style={{ opacity: leaving ? 0.25 : 1 }}>
          {/* V6-69: no multi-account backend, so the second line. */}
          {t("You can change this later in Settings.")}
        </p>
      </div>
      <ObFooter primary={{ label: t("Continue"), disabled: !canContinue || leaving, onClick: () => setSheet(true) }} />
      {conf && (
        <BottomSheet
          open={sheet}
          onClose={() => setSheet(false)}
          title={t(conf.title)}
          bodyPadding={{ top: 20, right: 20, bottom: 12, left: 20 }}
          footer={
            <div className="ob-vars" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" className="ob-btn ob-btn-primary tap" style={{ background: "var(--ob-fill)", color: "var(--ob-on-fill)", boxShadow: "none" }} onClick={confirm}>
                {t(conf.button)}
              </button>
              <button type="button" className="ob-btn ob-btn-secondary tap" style={{ border: "1px solid var(--ob-border)", background: "var(--ob-card)", color: "var(--ob-ink)" }} onClick={() => setSheet(false)}>
                {t("Choose another")}
              </button>
            </div>
          }
        >
          <div className="ob-vars" style={{ color: "var(--ob-ink)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <span
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  background: conf.tile === "teal" ? "var(--ob-teal-pale)" : "var(--ob-pale)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Composed comp={conf.comp} w={42} />
              </span>
              <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--ob-ink-soft)", textWrap: "pretty" }}>{t(conf.lead)}</p>
            </div>
            <div style={{ background: "var(--ob-list)", borderRadius: 18, padding: "4px 0" }}>
              {conf.rows.map(([Icon, row], k) => (
                <div key={row} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "8px 14px" }}>
                  {k > 0 && <span style={{ position: "absolute", top: 0, insetInlineStart: 62, insetInlineEnd: 14, height: 1, background: "var(--ob-ring)" }} />}
                  <span className="ob-sq-ic">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: "18px" }}>{t(row)}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, lineHeight: "17px", color: "var(--ob-faint)", marginTop: 12, textAlign: "center" }}>{t(conf.note)}</p>
          </div>
        </BottomSheet>
      )}
    </ObPage>
  );
};

/** OURS-client-code: the professional's code inside the Personal card. */
const ClientCodeField: React.FC<{
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  check: CodeCheck;
  error: string | null;
}> = ({ draft, setDraft, check, error }) => (
  <div style={{ marginBlock: "12px 0", marginInline: "70px 0" }}>
    <label className="ob-label" htmlFor="ob-client-code" style={{ display: "block", marginBottom: 6 }}>
      {t("Your professional's code")}
    </label>
    <span className="ob-box" data-err={error ? "true" : undefined}>
      <input
        id="ob-client-code"
        value={draft.professionalUserIdCode}
        onChange={(e) => setDraft((d) => ({ ...d, professionalUserIdCode: e.target.value }))}
        placeholder={t("e.g. SOHA-XXXX")}
        autoCapitalize="characters"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby="ob-client-code-help"
        style={{ textTransform: "uppercase" }}
      />
    </span>
    {check.status === "found" ? (
      // Confirmation before anything is redeemed: the code is only spent at the end.
      <div style={{ marginTop: 6, borderRadius: 16, background: "var(--ob-pale)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }} id="ob-client-code-help">
        {check.data.professionalAvatarUrl ? (
          <img src={check.data.professionalAvatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--ob-tile)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
            {check.data.professionalFirstName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, lineHeight: "19.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t("You'll connect with {name}", { name: check.data.professionalFirstName })}
          </span>
          <span style={{ display: "block", fontSize: 11.5, lineHeight: "17.25px", color: "var(--ob-accent)" }}>
            {t(subtypeLabel[check.data.professionalSubtype] ?? "Health professional")}
          </span>
        </span>
        <Check size={16} style={{ color: "var(--ob-good)", flexShrink: 0 }} />
      </div>
    ) : (
      <div className="ob-help" data-err={error ? "true" : undefined} id="ob-client-code-help">
        <span role={error ? "alert" : undefined} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {check.status === "checking" && <Loader2 size={12} className="ob-spin" />}
          {check.status === "checking" ? t("Checking code…") : error ?? t("Ask your trainer, dietitian or physiotherapist for the code they gave you.")}
        </span>
      </div>
    )}
  </div>
);
