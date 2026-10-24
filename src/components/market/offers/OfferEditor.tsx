import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { OfferCard } from "../OfferCard";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../MarketStates";
import { FOCUS_CSS } from "../usePress";
import {
  HEADLINE_MAX,
  TERMS_MAX,
  TYPE_OPTIONS,
  WHERE_OPTIONS,
  createOffer,
  dayLabel,
  draftCost,
  draftOf,
  emptyDraft,
  fetchMyOffer,
  offerStatus,
  previewRows,
  updateOffer,
  validateDraft,
  type DraftErrors,
  type DraftField,
  type ManagedOffer,
  type OfferDraft,
  type OfferOwner,
  type OfferType,
  type OfferWhere,
} from "../../../services/offers/manage";
import { BackHeader, BoxInput, Caps, FieldError, FieldLabel, FundingCheck, PrimaryButton, SubSegment } from "./parts";

// Market + Share 3.0 · W3 · Create offer → Preview and publish, and the same
// editor for an existing offer (B-MA.3 `offerCreate` / `offerPreview`,
// Business Marketplace Screens lines 176–247; P-MA.3 `ofCreate` / `ofPreview`,
// Professional Marketplace Screens lines 254–327). Literal values:
// - labels 12 / 700 --ink2, 6 above; boxes 48 + 1px --border, radius 14,
//   padding 0 14, 14 (Points cost 1.5px --fill, 700, "pts" 500 --faint);
// - Type and Where: the --subtrack sub-segmented control (Free item or
//   service flex 1.3 on the business board);
// - the Pricing guide (--pale, radius 16, padding 12 14): title 12.5 / 800
//   --pdark, the line 12 / 17 --ink2, three rows 12 (label --ink2, range
//   800), "Guidance only. You set the cost." 11 --faint;
// - Terms: min-height 72 (business) / 52 (professional), padding 12 14,
//   13 / 19;
// - the funding checkbox (required; Publish stays disabled, opacity 0.4,
//   until it is ticked) and "Preview offer" (52, radius 16, 15 / 800);
// - Preview: caps "How members see it" / "How clients see it", the --soft
//   panel (radius 24, padding 14) with the client OfferCard (the full teal
//   line, "You can redeem") and its note 11 --faint centred; the summary
//   (radius 24, 1px --border, padding 4 16; rows padding 10 0, 12.5, 0.5px
//   --div between); the acknowledgement on --pale; Publish; "Edit offer"
//   (44, 14 / 700 --ink2).
// Ours: the Headline field at the top. The board's form draws none, but its
// OfferCard (B-MA.3 preview "15% off outerwear", C-MO.4.4 rows) and the
// Offer detail title (C-MO.4.4.2 "15% off full-price items", 24 / 800) draw a
// separate headline line that no drawn field (Type, Value, Terms) can
// produce, and types.ts / PLAN §2.2 carry `headline`; so it stays (the W3
// lead decision's condition, checked in the R1 polish pass). Also ours: the
// unticked checkbox, field errors, the date boxes (the app's
// date input, shown month first), the read-only view of an expired offer.

export interface AppliesToOption {
  id: string;
  label: string;
}

export interface OfferEditorProps {
  variant: "business" | "professional";
  /** Null while the business is loading. */
  owner: OfferOwner | null;
  /** Null for a new offer. */
  offerId: string | null;
  /** The client card's owner: the business, or "{Name} · {specialty}". */
  previewOwner: { name: string; initials: string; logoUrl: string | null } | null;
  /** Professional: the services an offer can apply to (null while loading). */
  appliesTo?: { options: AppliesToOption[] | null; failed: boolean; emptyHint: React.ReactNode };
  /** Back to the Offers list. */
  onClose: () => void;
  /** Published or saved: back to the list with this strip. */
  onDone: (flash: string) => void;
}

type Step = "form" | "preview";

export const OfferEditor: React.FC<OfferEditorProps> = ({ variant, owner, offerId, previewOwner, appliesTo, onClose, onDone }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const online = useOnline();
  const pro = variant === "professional";
  const isNew = !offerId;
  const [draft, setDraft] = useState<OfferDraft>(() => emptyDraft(variant));
  const [step, setStep] = useState<Step>("form");
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveNote, setSaveNote] = useState<{ text: string; quiet: boolean } | null>(null);  // create_offer ⟳: one request id for the life of this open form.
  const [requestId] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [existing, setExisting] = useState<{ kind: "loading" } | { kind: "ready"; offer: ManagedOffer } | { kind: "missing" } | { kind: "error" } | null>(isNew ? null : { kind: "loading" });
  const [tick, setTick] = useState(0);
  const formRef = useRef<HTMLDivElement | null>(null);
  const ownerKey = owner ? (owner.variant === "business" ? owner.businessId : "me") : null;

  useEffect(() => {
    if (isNew || !owner || !offerId) return;
    let alive = true;
    setExisting({ kind: "loading" });
    void fetchMyOffer(owner, offerId).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setExisting({ kind: "error" });
        return;
      }
      if (!r.value) {
        setExisting({ kind: "missing" });
        return;
      }
      setExisting({ kind: "ready", offer: r.value });
      setDraft(draftOf(r.value));
    });
    return () => {
      alive = false;
    };
    // ownerKey stands for owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, ownerKey, offerId, tick]);

  const errors: DraftErrors = useMemo(() => validateDraft(draft, variant, isNew), [draft, variant, isNew]);
  const shown: DraftErrors = showErrors ? errors : {};
  const set = <K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) => {
    setSaveNote(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const appliesLabel = useMemo(() => appliesTo?.options?.find((o) => o.id === draft.appliesTo)?.label ?? null, [appliesTo, draft.appliesTo]);

  const backLabels = "Back to Offers";
  const editWord = isNew ? "New offer" : "Edit offer";

  // ---- states before the form
  if (!isNew && existing && existing.kind !== "ready") {
    return (
      <div style={{ color: m.ink, lineHeight: "normal" }}>
        <BackHeader eyebrow="Offers" title="Edit offer" onBack={onClose} backLabel={backLabels} />
        {existing.kind === "loading" ? <MarketSkeleton radius={20} rows={3} count={3} label="Loading offer" /> : null}
        {existing.kind === "error" ? <MarketError thing="this offer" onRetry={() => setTick((t) => t + 1)} /> : null}
        {existing.kind === "missing" ? <MarketEmptyCard title="This offer isn't available" body="It may have been removed. Go back to see your offers." /> : null}
      </div>
    );
  }

  const expired = existing?.kind === "ready" && offerStatus(existing.offer) === "expired";

  const toPreview = () => {
    setShowErrors(true);
    const first = (["headline", "appliesTo", "value", "pointsCost", "quantityCap", "perMemberLimit", "startsOn", "endsOn"] as DraftField[]).find((k) => errors[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] select`)?.focus();
      return;
    }
    setStep("preview");
  };

  const publish = async () => {
    if (!owner || !draft.fundingAck || busy) return;
    setBusy(true);
    setSaveNote(null);
    const r = isNew ? await createOffer(owner, draft, requestId) : await updateOffer(owner, offerId as string, draft);
    setBusy(false);
    if (r.ok) {
      onDone(isNew ? "Offer published" : "Offer saved");
      return;
    }
    setSaveNote({ text: r.offline ? "You're offline. Try again when you're connected." : r.message, quiet: !!r.offline });
  };

  // ---- Preview and publish (also the read-only view of an expired offer)
  if (step === "preview" || expired) {
    const rows = previewRows(draft, variant, appliesLabel);
    const cost = draftCost(draft);
    return (
      <div style={{ color: m.ink, lineHeight: "normal" }}>
        <style>{FOCUS_CSS}</style>
        <BackHeader
          eyebrow={expired ? "Offers" : editWord}
          title={expired ? "Ended offer" : "Preview"}
          onBack={expired ? onClose : () => setStep("form")}
          backLabel={expired ? backLabels : `Back to ${editWord}`}
        />
        {expired ? <MarketEmptyCard title="This offer has ended" body={`It ran until ${dayLabel(draft.endsOn)}, so it can't be edited.`} style={{ marginBottom: 14 }} /> : null}
        <Caps>{pro ? "How clients see it" : "How members see it"}</Caps>
        <div style={{ marginTop: 8, borderRadius: 24, background: m.soft, padding: 14 }}>
          <OfferCard
            variant="client"
            owner={previewOwner?.name ?? ""}
            ownerInitials={previewOwner?.initials ?? ""}
            ownerLogoUrl={previewOwner?.logoUrl ?? null}
            ownerRound={pro}
            headline={draft.headline.trim()}
            cost={cost}
            balance={cost}
          />
          <div style={{ fontSize: textPx(11), color: m.faint, marginTop: 8, textAlign: "center" }}>
            {pro ? "Shows in Rewards under Professionals, and on your public profile." : 'Members with enough points see "You can redeem". Others see how many points they still need.'}
          </div>
        </div>
        <dl style={{ margin: "14px 0 0", borderRadius: 24, border: `1px solid ${m.border}`, padding: "4px 16px" }}>
          {rows.map((r, i) => (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i === 0 ? undefined : `0.5px solid ${m.div}`, fontSize: textPx(12.5) }}>
              <dt style={{ color: m.faint }}>{r.k}</dt>
              <dd style={{ margin: 0, fontWeight: 700, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{r.v}</dd>
            </div>
          ))}
        </dl>
        {expired ? null : (
          <>
            <FundingCheck look="preview" checked={draft.fundingAck} onChange={(v) => set("fundingAck", v)} style={{ marginTop: 12 }} />
            {!online ? <MarketOffline loaded style={{ marginTop: 12 }} /> : null}
            {saveNote ? (
              <p role={saveNote.quiet ? "status" : "alert"} style={{ margin: "12px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), fontWeight: saveNote.quiet ? 500 : 600, color: saveNote.quiet ? m.ink2 : m.high, textAlign: saveNote.quiet ? "center" : undefined }}>
                {saveNote.text}
              </p>
            ) : null}
            <PrimaryButton label={isNew ? "Publish" : "Save changes"} onPress={() => void publish()} disabled={!draft.fundingAck || !owner} busy={busy} style={{ marginTop: 16 }} />
            <button
              type="button"
              onClick={() => setStep("form")}
              className="market-focus"
              style={{ width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", fontSize: textPx(14), fontWeight: 700, color: m.ink2, background: "transparent", border: 0, cursor: "pointer", borderRadius: 12 }}
            >
              Edit offer
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- Create offer
  const typeOpts = TYPE_OPTIONS(variant);
  const whereOpts = WHERE_OPTIONS(variant);
  const guide = pro
    ? { line: "Clients who log daily earn about 1,000 points a month.", rows: [["Small perk (5–10% off)", "300–600"], ["Mid (15–20% off)", "800–1,500"], ["Large (25%+ or a free session)", "2,000–4,000"]] }
    : { line: "Members who log daily earn about 1,000 points a month.", rows: [["Small perk (sample, 5–10% off)", "300–600"], ["Mid (15–20% off)", "800–1,500"], ["Large (25%+ or a free service)", "2,000–4,000"]] };
  const free = draft.type === "free_item";

  return (
    <div ref={formRef} style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow="Offers" title={editWord} onBack={onClose} backLabel={backLabels} />

      <div data-field="headline">
        <FieldLabel htmlFor="offer-headline">Headline</FieldLabel>
        <BoxInput id="offer-headline" value={draft.headline} onChange={(v) => set("headline", v)} placeholder={pro ? "20% off a 4-session pack" : "15% off outerwear"} maxLength={HEADLINE_MAX} error={shown.headline} />
      </div>

      <FieldLabel id="offer-type-label" style={{ marginTop: 12 }}>
        Type
      </FieldLabel>
      <SubSegment<OfferType> labelId="offer-type-label" options={typeOpts} value={draft.type} onChange={(k) => set("type", k)} grow={pro ? undefined : { free_item: 1.3 }} />

      {pro ? (
        <div data-field="appliesTo">
          <FieldLabel htmlFor="offer-applies" style={{ marginTop: 12 }}>
            Applies to
          </FieldLabel>
          <AppliesSelect value={draft.appliesTo} onChange={(v) => set("appliesTo", v)} state={appliesTo} error={shown.appliesTo} />
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
        <div data-field="value">
          <FieldLabel htmlFor="offer-value">Value</FieldLabel>
          {free ? (
            <div id="offer-value" aria-disabled="true" style={{ height: 48, boxSizing: "content-box", borderRadius: 14, border: `1px solid ${m.border}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: textPx(14), color: m.faint }}>
              Free
            </div>
          ) : (
            <BoxInput id="offer-value" value={draft.value} onChange={(v) => set("value", v.replace(draft.type === "percent_off" ? /[^\d]/g : /[^\d.]/g, ""))} suffix={draft.type === "percent_off" ? "%" : "$"} inputMode={draft.type === "percent_off" ? "numeric" : "decimal"} error={shown.value} />
          )}
        </div>
        <div data-field="pointsCost">
          <FieldLabel htmlFor="offer-cost">Points cost</FieldLabel>
          <BoxInput id="offer-cost" value={draft.pointsCost} onChange={(v) => set("pointsCost", v.replace(/[^\d,]/g, ""))} suffix="pts" strong inputMode="numeric" error={shown.pointsCost} />
        </div>
      </div>

      <section aria-label="Pricing guide" style={{ marginTop: 10, borderRadius: 16, background: m.pale, padding: "12px 14px" }}>
        <div style={{ fontSize: textPx(12.5), fontWeight: 800, color: m.pdark }}>Pricing guide</div>
        <div style={{ fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>{guide.line}</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: textPx(12) }}>
          {guide.rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ color: m.ink2 }}>{k}</span>
              <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: textPx(11), color: m.faint, marginTop: 8 }}>Guidance only. You set the cost.</div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
        <div data-field="quantityCap">
          <FieldLabel htmlFor="offer-cap" optional>
            Quantity cap
          </FieldLabel>
          <BoxInput id="offer-cap" value={draft.quantityCap} onChange={(v) => set("quantityCap", v.replace(/[^\d]/g, ""))} inputMode="numeric" error={shown.quantityCap} />
        </div>
        <div data-field="perMemberLimit">
          <FieldLabel htmlFor="offer-limit">{pro ? "Per-client limit" : "Per-member limit"}</FieldLabel>
          <BoxInput id="offer-limit" value={draft.perMemberLimit} onChange={(v) => set("perMemberLimit", v.replace(/[^\d]/g, ""))} inputMode="numeric" error={shown.perMemberLimit} />
        </div>
        <div data-field="startsOn">
          <FieldLabel htmlFor="offer-starts">Starts</FieldLabel>
          <DateBox id="offer-starts" value={draft.startsOn} onChange={(v) => set("startsOn", v)} error={shown.startsOn} />
        </div>
        <div data-field="endsOn">
          <FieldLabel htmlFor="offer-ends">Ends</FieldLabel>
          <DateBox id="offer-ends" value={draft.endsOn} min={draft.startsOn || undefined} onChange={(v) => set("endsOn", v)} error={shown.endsOn} />
        </div>
      </div>

      <FieldLabel id="offer-where-label" style={{ margin: "12px 0 6px" }}>
        Where it can be used
      </FieldLabel>
      <SubSegment<OfferWhere> labelId="offer-where-label" options={whereOpts} value={draft.where} onChange={(k) => set("where", k)} />

      <FieldLabel htmlFor="offer-terms" style={{ margin: "12px 0 6px" }}>
        Terms
      </FieldLabel>
      <TermsBox id="offer-terms" value={draft.terms} onChange={(v) => set("terms", v)} minHeight={pro ? 52 : 72} />

      <FundingCheck look="form" checked={draft.fundingAck} onChange={(v) => set("fundingAck", v)} style={{ marginTop: 14 }} />
      <PrimaryButton label="Preview offer" onPress={toPreview} style={{ marginTop: 14 }} />
    </div>
  );
};

const FOCUS_WITHIN = ".market-focus-within:focus-within{outline:2px solid #AEA1DC;outline-offset:2px}";

/**
 * A date box in the form's field style showing the date month first ("Nov 1,
 * 2026"); the app's date input (type=date) lies over it, invisible, so a tap
 * or the keyboard opens the system picker.
 */
const DateBox: React.FC<{ id: string; value: string; min?: string; onChange: (v: string) => void; error?: string }> = ({ id, value, min, onChange, error }) => {
  const m = marketPalette(useIsDark());
  const errId = `${id}-err`;
  return (
    <>
      <style>{FOCUS_WITHIN}</style>
      <div
        className="market-focus-within"
        style={{ position: "relative", height: 48, boxSizing: "content-box", borderRadius: 14, border: error ? `1.5px solid ${m.high}` : `1px solid ${m.border}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: textPx(14), color: value ? m.ink : m.faint }}
      >
        <span aria-hidden style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value ? dayLabel(value) : "Choose a date"}
        </span>
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            } catch {
              /* not allowed here: the native control still opens */
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: 0, padding: 0, margin: 0, cursor: "pointer", font: "inherit" }}
        />
      </div>
      <FieldError id={errId} text={error} />
    </>
  );
};

/** Terms: min-height 72 / 52 + padding 12 14 + 1px --border, radius 14, 13 / 19 --ink. */
const TermsBox: React.FC<{ id: string; value: string; onChange: (v: string) => void; minHeight: number }> = ({ id, value, onChange, minHeight }) => {
  const m = marketPalette(useIsDark());
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={TERMS_MAX}
      rows={3}
      className="market-focus"
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        minHeight: minHeight + 24 + 2,
        borderRadius: 14,
        border: `1px solid ${m.border}`,
        padding: "12px 14px",
        fontFamily: "inherit",
        fontSize: textPx(13),
        lineHeight: linePx(19),
        color: m.ink,
        background: "transparent",
        resize: "vertical",
      }}
    />
  );
};

/** Applies to (professional): the 48 box with the 14 chevron (--faint, 2.4) over a native select. */
const AppliesSelect: React.FC<{ value: string | null; onChange: (v: string) => void; state: OfferEditorProps["appliesTo"]; error?: string }> = ({ value, onChange, state, error }) => {
  const m = marketPalette(useIsDark());
  const opts = state?.options ?? null;
  const errId = "offer-applies-err";
  if (opts && opts.length === 0) {
    return <div style={{ borderRadius: 14, border: `1px solid ${m.border}`, padding: "12px 14px", fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>{state?.emptyHint}</div>;
  }
  return (
    <>
      <style>{FOCUS_WITHIN}</style>
      <div className="market-focus-within" style={{ position: "relative", borderRadius: 14 }}>
        <select
          id="offer-applies"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={!opts}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            display: "block",
            width: "100%",
            height: error ? 51 : 50,
            boxSizing: "border-box",
            borderRadius: 14,
            border: error ? `1.5px solid ${m.high}` : `1px solid ${m.border}`,
            padding: "0 40px 0 14px",
            margin: 0,
            fontFamily: "inherit",
            fontSize: textPx(14),
            color: value ? m.ink : m.faint,
            background: "transparent",
            outline: "none",
            cursor: "pointer",
            textOverflow: "ellipsis",
          }}
        >
          <option value="" disabled>
            {opts ? "Choose a service" : state?.failed ? "Couldn't load your services" : "Loading your services…"}
          </option>
          {(opts ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span aria-hidden style={{ position: "absolute", right: 14, top: 0, bottom: 0, display: "flex", alignItems: "center", pointerEvents: "none" }}>
          <ChevronDown size={14} strokeWidth={2.4} color={m.faint} style={NO_ICON_SCALE} />
        </span>
      </div>
      <FieldError id={errId} text={error} />
    </>
  );
};
