import React, { useEffect, useState } from "react";
import { CircleCheck, CircleMinus } from "lucide-react";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useApp } from "../../context/AppContext";
import { todayLocal } from "../../utils/date";
import { ALLERGENS, SEVERITIES } from "../../services/nutrition/clientNutritionModel";
import { dietaryRestrictionOptions } from "../../utils/dietaryRestrictions";
import { confirmProfileProposal, declineProfileProposal, fetchProfileProposals } from "../../services/client-forms";
import { FIELD_LABEL, MEDICATION_ROUTES, draftFrom, offeredProposals, proposalTitle, shapeValue, type ProfileProposal, type ProposalDraft } from "../../services/client-forms/proposals";
import { notifyInjuriesChanged } from "../../services/injuries";
import { t } from "../../i18n/core";

/**
 * Round D · D-S12 "Add these to your profile?" (not drawn; Karim: the client
 * confirms each carried answer on its own). Shown in the sent sheet after a
 * form with "Carry into the profile" questions is sent: one card per answer
 * the Database proposed (my_form_profile_proposals for this response), with
 * the field to check or edit first, "Add to my profile"
 * (confirm_form_profile_proposal with the edited value) and "Not now"
 * (decline_form_profile_proposal). Nothing reaches the profile until the
 * client adds it. Weight is never offered in recovery-sensitive mode
 * (`hideNumbers`), and an ATXL2 refusal (the mode turned on since) takes the
 * card away with a plain line. Closing the sheet leaves the rest undecided:
 * with `responseId` null (Health Records › History) every one still waiting
 * is offered again, and nothing shows when there are none or the read fails.
 */
export const ProfileProposals: React.FC<{ responseId: string | null; hideNumbers: boolean }> = ({ responseId, hideNumbers }) => {
  const [list, setList] = useState<ProfileProposal[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    void fetchProfileProposals(responseId).then((r) => {
      if (!live) return;
      if (!r.ok) return setFailed(true);
      setFailed(false);
      setList(offeredProposals(r.data, hideNumbers));
    });
    return () => {
      live = false;
    };
  }, [responseId, hideNumbers, nonce]);

  if (failed && responseId === null) return null;
  if (failed)
    return (
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5 }}>{t("Couldn't load the answers you can add to your profile.")}</p>
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="tap" style={{ minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
          {t("Try again")}
        </button>
      </div>
    );
  if (!list || list.length === 0) return null;
  return (
    <section aria-labelledby={`pp-${responseId ?? "waiting"}`} style={{ marginTop: responseId === null ? 0 : 18, marginBottom: responseId === null ? 16 : 0 }}>
      <h3 id={`pp-${responseId ?? "waiting"}`} style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
        {t("Add these to your profile?")}
      </h3>
      <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginTop: 4, marginBottom: 10 }}>
        {responseId === null ? t("From your form answers.") : t("From your answers.")} {t("Check each one, change it if you need to, and add only what you want.")}
      </p>
      {list.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
    </section>
  );
};

type CardState = { kind: "open" } | { kind: "added" } | { kind: "skipped" } | { kind: "gone"; message: string };

const ProposalCard: React.FC<{ proposal: ProfileProposal }> = ({ proposal }) => {
  const { reloadHealthRecords } = useApp();
  const [draft, setDraft] = useState<ProposalDraft>(() => draftFrom(proposal));
  const [state, setState] = useState<CardState>({ kind: "open" });
  const [busy, setBusy] = useState<"add" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const today = todayLocal();
  const shaped = shapeValue(draft, today);

  const add = async () => {
    setTried(true);
    if (!shaped.ok || busy) return;
    setBusy("add");
    setError(null);
    const r = await confirmProfileProposal(proposal.id, shaped.value);
    setBusy(null);
    if (!r.ok) return r.gone ? setState({ kind: "gone", message: r.message }) : setError(r.message);
    setState({ kind: "added" });
    if (proposal.field === "medications") void reloadHealthRecords();
    if (proposal.field === "injuries") notifyInjuriesChanged();
  };
  const skip = async () => {
    if (busy) return;
    setBusy("skip");
    setError(null);
    const r = await declineProfileProposal(proposal.id);
    setBusy(null);
    if (!r.ok) return r.gone ? setState({ kind: "gone", message: r.message }) : setError(r.message);
    setState({ kind: "skipped" });
  };

  const card: React.CSSProperties = { background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "12px 12px 12px", marginBottom: 8 };
  const head = (
    <>
      <span className="block" style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK.prDeep }}>
        {t(FIELD_LABEL[proposal.field])}
      </span>
      <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, marginTop: 2, overflowWrap: "anywhere" }}>{proposalTitle(draft)}</p>
      {proposal.prompt && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 2, overflowWrap: "anywhere" }}>{t("Your answer to \"{prompt}\"", { prompt: proposal.prompt })}</p>}
    </>
  );

  if (state.kind !== "open")
    return (
      <div style={card}>
        {head}
        <p className="flex items-center" style={{ gap: 6, marginTop: 8, fontSize: textPx(12.5), fontWeight: 600, color: state.kind === "added" ? INK.ch : INK.chS }}>
          {state.kind === "added" ? <CircleCheck size={14} aria-hidden style={{ color: INK.prDeep }} /> : <CircleMinus size={14} aria-hidden style={{ color: INK.chF }} />}
          {state.kind === "added" ? t("Added to your profile.") : state.kind === "skipped" ? t("Not added.") : t(state.message)}
        </p>
      </div>
    );

  return (
    <div style={card}>
      {head}
      <div style={{ marginTop: 10 }}>
        <Editor draft={draft} today={today} onChange={(d) => setDraft(d)} />
      </div>
      {((tried && !shaped.ok) || error) && (
        <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
          {error ?? (!shaped.ok ? t(shaped.problem) : null)}
        </p>
      )}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 12 }}>
        <CtaButton size="base" variant="secondary" label={t("Not now")} loading={busy === "skip"} onClick={() => void skip()} />
        <CtaButton size="base" label={t("Add to my profile")} loading={busy === "add"} onClick={() => void add()} />
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: textPx(11.5), fontWeight: 600, color: INK.chS, margin: "10px 0 6px" };
const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 44, borderRadius: 12, background: INK.card, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(13), color: INK.ch };

function Chips<V extends string>({ label, items, value, onChange }: { label: string; items: { value: V; label: string }[]; value: V | null; onChange: (v: V) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap" style={{ gap: 6 }}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(it.value)}
            className={`tap min-h-[36px] rounded-xl px-3 text-[12px] font-semibold border ${on ? "bg-primary-fill text-on-primary-fill border-primary-fill" : "bg-cream-card text-charcoal border-charcoal/[0.1]"}`}
          >
            {t(it.label)}
          </button>
        );
      })}
    </div>
  );
}

const Editor: React.FC<{ draft: ProposalDraft; today: string; onChange: (d: ProposalDraft) => void }> = ({ draft: d, today, onChange }) => {
  switch (d.field) {
    case "allergies":
      return (
        <>
          <label style={{ ...labelStyle, marginTop: 0 }}>
            {t("Allergen")}
            <select
              value={d.allergen ?? ""}
              onChange={(e) => onChange({ ...d, allergen: (e.target.value || null) as typeof d.allergen })}
              className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ ...fieldStyle, marginTop: 6, fontWeight: 600 }}
            >
              <option value="">{t("Choose…")}</option>
              {ALLERGENS.map((a) => (
                <option key={a.value} value={a.value}>
                  {t(a.label)}
                </option>
              ))}
            </select>
          </label>
          <span style={labelStyle}>{t("How severe")}</span>
          <Chips label={t("How severe")} items={SEVERITIES} value={d.severity} onChange={(v) => onChange({ ...d, severity: v })} />
          <label style={labelStyle}>
            {t("Note (optional)")}
            <input value={d.note} maxLength={200} onChange={(e) => onChange({ ...d, note: e.target.value })} className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
        </>
      );
    case "dietary_restrictions":
      return (
        <>
          <span style={{ ...labelStyle, marginTop: 0 }}>{t("Diet")}</span>
          <Chips label={t("Diet")} items={dietaryRestrictionOptions} value={d.restriction} onChange={(v) => onChange({ ...d, restriction: v })} />
          <span style={labelStyle}>{t("Is it")}</span>
          <Chips
            label={t("Is it")}
            items={[
              { value: "restriction" as const, label: t("Something I must avoid") },
              { value: "preference" as const, label: t("A preference") },
            ]}
            value={d.kind}
            onChange={(v) => onChange({ ...d, kind: v })}
          />
        </>
      );
    case "medications":
      return (
        <>
          <label style={{ ...labelStyle, marginTop: 0 }}>
            {t("Name")}
            <input value={d.name} maxLength={120} onChange={(e) => onChange({ ...d, name: e.target.value })} className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          <label style={labelStyle}>
            {t("Dose (optional)")}
            <input value={d.dose} maxLength={120} placeholder={t("e.g. 500 mg")} onChange={(e) => onChange({ ...d, dose: e.target.value })} className="outline-none placeholder:text-charcoal-tertiary focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          <span style={labelStyle}>{t("How you take it")}</span>
          <Chips label={t("How you take it")} items={MEDICATION_ROUTES} value={d.route} onChange={(v) => onChange({ ...d, route: v })} />
        </>
      );
    case "injuries":
      return (
        <>
          <label style={{ ...labelStyle, marginTop: 0 }}>
            {t("Injury")}
            <input value={d.description} maxLength={300} onChange={(e) => onChange({ ...d, description: e.target.value })} className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          <label style={labelStyle}>
            {t("Body area (optional)")}
            <input value={d.bodyArea} maxLength={60} placeholder={t("e.g. Left knee")} onChange={(e) => onChange({ ...d, bodyArea: e.target.value })} className="outline-none placeholder:text-charcoal-tertiary focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          <label style={labelStyle}>
            {t("Since (optional)")}
            <input type="date" value={d.since} max={today} onChange={(e) => onChange({ ...d, since: e.target.value })} className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
        </>
      );
    case "weight":
      return (
        <label style={{ ...labelStyle, marginTop: 0 }}>
          {t("Weight (kg)")}
          <input inputMode="decimal" value={d.kg} onChange={(e) => onChange({ ...d, kg: e.target.value })} className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40" style={{ ...fieldStyle, marginTop: 6, fontWeight: 600 }} />
        </label>
      );
  }
};
