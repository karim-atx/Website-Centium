import React, { useMemo, useState } from "react";
import { Calendar, ChevronDown, Lock } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useOnline } from "../../hooks/useOnline";
import { createPromotion, endPromotion, offerLocked, updatePromotion, type PromoStatus, type Promotion } from "../../services/business-market/promotions";
import { useMarket } from "./MarketContext";
import { CentredDialog, fieldStyle, lh, MasterSheet, PrimaryButton, px, SaveError, SheetBox, SoonNote, useMarketColors } from "./listingParts";
import { RangeCalendar } from "./RangeCalendar";
import { dayMonth, isoOf } from "./model";
import { draftOf, editPatch, editStatusOf, promoName, promoTarget, promoText, promoTypes, validatePromo, valueFor, type PromoDraft, type PromoErrors, type Promotable } from "./promoModel";

// Market + Share 3.0 · W3 (D-13): Create / Edit promotion KEPT and restyled in
// the handover chrome: MasterBottomSheet (MasterSheet) with the grey SheetBox
// fields (--sgrey r14, the 13 / 500 --slabel label 8 above a --card r10
// field), the pinned PrimaryButton footer, the destructive "End promotion"
// as the board's --highbg / --high 48 button, and CentredDialogs (End is the
// two-step destructive dialog; Discard one step).
//
// MA1-099 / 101 / 102 / 103 / 104 / 106 (Create promotion), MA1-137 / 139 /
// 141 / 142 / 144 / 146 / 149 (Edit, active, ended) and
// OURS-MA1-promotion-type-menu. B13 MK-05 (live): Save inserts or updates the
// promotions row; End sets ended_at. ATX10: once a promotion has started its
// offer (what, type, value, who sees it) and its start are locked here and on
// the server; the end date can still change. When the probe answers that the
// table is absent (pending), a valid Save says so and nothing is stored.

export interface PromoEdit {
  promo: Promotion;
  status: PromoStatus;
  item: Promotable;
}

/** MA1-139 R0, rewritten for ATX10 (the drawn copy said the offer and who sees it could change). */
const LOCK_NOTE = "The offer can't change once a promotion has started, because people may already have used it. You can still change the end date. To change the offer, end it and create another.";
const ENDED_NOTE = "This promotion has ended, so it can't be changed. Duplicate it to run it again.";

export function PromotionSheet({
  open,
  onClose,
  items,
  initialWhat,
  prefill,
  edit,
  onDuplicate,
  onSaved,
  onEnded,
}: {
  open: boolean;
  onClose: () => void;
  items: Promotable[];
  initialWhat?: string | null;
  /** Run again / Duplicate: a new promotion prefilled from an ended one, dates cleared. */
  prefill?: PromoDraft | null;
  edit?: PromoEdit | null;
  onDuplicate?: (d: PromoDraft) => void;
  onSaved: (p: Promotion, toast: string) => void;
  onEnded: (p: Promotion) => void;
}) {
  const mk = useMarket();
  const { v, kind, business } = mk;
  const m = useMarketColors();
  const online = useOnline();
  const today = isoOf(new Date());
  const pending = mk.backend.promotions === "pending";
  const blank: PromoDraft = useMemo(
    () => (edit ? draftOf(edit.promo, edit.item) : prefill ?? { what: initialWhat ?? null, type: null, value: null, from: today, to: null, audience: "new" }),
    [edit, prefill, initialWhat, today]
  );
  const [d, setD] = useState<PromoDraft>(blank);
  const [errors, setErrors] = useState<PromoErrors>({});
  const [menu, setMenu] = useState<"what" | "type" | null>(null);
  const [cal, setCal] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "end" | "end2" | null>(null);
  const [soon, setSoon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [whatEl, setWhatEl] = useState<HTMLButtonElement | null>(null);
  const [typeEl, setTypeEl] = useState<HTMLButtonElement | null>(null);

  const status = edit ? editStatusOf(edit.status) : null;
  const ro = status === "ended";
  const locked = !!edit && offerLocked(edit.status);
  const pool = edit && !items.some((i) => i.id === edit.item.id) ? [edit.item, ...items] : items;
  const changed = JSON.stringify(d) !== JSON.stringify(blank);
  const touched = edit ? changed : !!(d.what || d.type || d.to);
  const item = pool.find((i) => i.id === d.what) ?? null;
  const text = promoText(kind, d.type, d.value);
  const types = promoTypes(kind);
  const canWrite = online && mk.can("marketing") && !!business;

  const close = () => (touched && !ro ? setConfirm("discard") : onClose());
  const save = async () => {
    const e = validatePromo(d, v.whatError);
    setErrors(e);
    setSaveError(null);
    if (Object.keys(e).length || !item || !d.type) return;
    if (pending) return setSoon(true);
    if (!business) return;
    setBusy(true);
    if (edit) {
      const patch = editPatch(edit.promo, edit.status, d, item, kind);
      const r = await updatePromotion(edit.promo.id, patch);
      setBusy(false);
      if (!r.ok) return setSaveError(r.message);
      const runs = patch.ends_on && d.to ? ` It now runs until ${dayMonth(d.to)}.` : "";
      onSaved(r.value, `${r.value.name} updated.${runs}`);
      return;
    }
    const value = valueFor(d.type, d.value);
    const target = promoTarget(item);
    const name = promoName(kind, item.title, d.type, value);
    const from = d.from ?? today;
    const r = await createPromotion(business.id, { name, targetKind: target.kind, targetId: target.id, type: d.type, value, startsOn: from, endsOn: d.to, audience: d.audience });
    setBusy(false);
    if (!r.ok) return setSaveError(r.message);
    onSaved(r.value, from > today ? `${r.value.name} starts on ${dayMonth(from)}.` : `${r.value.name} is live on Explore.`);
  };
  const doEnd = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await endPromotion(edit.promo.id);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) return setSaveError(r.message);
    onEnded(r.value);
  };
  const set = (patch: Partial<PromoDraft>) => {
    setSoon(false);
    setSaveError(null);
    setD((x) => ({ ...x, ...patch }));
  };

  const title = ro ? "Promotion details" : edit ? "Edit promotion" : "Create promotion";
  const footer = ro ? (
    <PrimaryButton onClick={() => onDuplicate?.({ ...d, from: today, to: null })} disabled={!canWrite}>
      Duplicate as new promotion
    </PrimaryButton>
  ) : (
    <>
      <PrimaryButton onClick={() => void save()} disabled={(!!edit && !changed) || !canWrite} busy={busy}>
        {edit ? "Save changes" : "Save promotion"}
      </PrimaryButton>
      {soon && <SoonNote>Saving promotions is coming soon. Nothing was saved.</SoonNote>}
      {saveError && <SaveError>{saveError}</SaveError>}
      {(status === "active" || status === "paused") && (
        <button
          type="button"
          onClick={() => setConfirm("end")}
          disabled={busy || !canWrite}
          className="market-focus"
          style={{ marginTop: 10, width: "100%", height: 48, borderRadius: 14, border: 0, background: m.highbg, color: m.high, fontFamily: "inherit", fontSize: px(14), fontWeight: 800, cursor: busy || !canWrite ? "default" : "pointer", opacity: busy || !canWrite ? 0.4 : 1 }}
        >
          End promotion
        </button>
      )}
    </>
  );

  return (
    <>
      <MasterSheet open={open} onClose={close} title={title} footer={footer}>
        <style>{FOCUS_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(locked || ro) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 14, background: m.sgrey, color: m.ink2 }}>
              <Lock size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: px(12.5), lineHeight: lh(18) }}>{ro ? ENDED_NOTE : LOCK_NOTE}</p>
            </div>
          )}
          <SheetBox label="What to promote" htmlFor="pc-what">
            <Field
              id="pc-what"
              refEl={setWhatEl}
              value={item?.field ?? "Choose what to promote"}
              placeholder={!item}
              error={!!errors.what}
              focused={menu === "what"}
              locked={locked}
              icon={locked ? <Lock size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
              onClick={() => setMenu("what")}
              haspopup
            />
            {errors.what && <ErrorLine>{errors.what}</ErrorLine>}
          </SheetBox>
          <SheetBox label="Promotion type" htmlFor="pc-type">
            <Field
              id="pc-type"
              refEl={setTypeEl}
              value={d.type ? promoText(kind, d.type, d.type === "first_n_free" ? d.value : null).field : "Choose a type"}
              placeholder={!d.type}
              error={!!errors.type}
              focused={menu === "type"}
              locked={locked}
              icon={locked ? <Lock size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
              onClick={() => setMenu("type")}
              haspopup
            />
            {errors.type && <ErrorLine>{errors.type}</ErrorLine>}
            {d.type === "percent_off" && (
              <label style={{ ...fieldStyle(m, !!errors.value), display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                <input
                  aria-label="Percent off"
                  inputMode="numeric"
                  readOnly={locked}
                  value={d.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 2), 10);
                    set({ value: Number.isFinite(n) ? n : null });
                  }}
                  placeholder="25"
                  style={{ width: 40, background: "transparent", border: 0, outline: "none", padding: 0, fontFamily: "inherit", fontSize: px(14), color: locked ? m.faint : m.ink }}
                />
                <span style={{ fontSize: px(14), color: m.faint }}>% off</span>
              </label>
            )}
            {errors.value && <ErrorLine>{errors.value}</ErrorLine>}
          </SheetBox>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <SheetBox label="Starts" htmlFor="pc-from">
              <Field id="pc-from" value={d.from ? (d.from === today ? "Today" : dayMonth(d.from)) : "Today"} focused={cal} locked={locked} icon={<Calendar size={16} strokeWidth={2.2} />} onClick={() => setCal(true)} />
            </SheetBox>
            <SheetBox label="Ends" htmlFor="pc-to">
              <Field
                id="pc-to"
                value={d.to ? dayMonth(d.to) : "Choose"}
                placeholder={!d.to}
                error={!!errors.to}
                focused={cal || (!!edit && d.to !== blank.to)}
                locked={ro}
                icon={<Calendar size={16} strokeWidth={2.2} />}
                onClick={() => setCal(true)}
              />
              {errors.to && <ErrorLine>{errors.to}</ErrorLine>}
            </SheetBox>
          </div>
          {cal && (
            <RangeCalendar
              from={d.from}
              to={d.to}
              fixedStart={locked}
              onCancel={() => setCal(false)}
              onDone={(from, to) => {
                set(locked ? { to } : { from, to });
                setErrors((e) => ({ ...e, to: undefined }));
                setCal(false);
              }}
            />
          )}
          <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
            <p id="pc-aud" style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
              Who sees it
            </p>
            <div role="radiogroup" aria-labelledby="pc-aud" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
              {(
                [
                  ["new", v.audienceNew],
                  ["everyone", "Everyone"],
                ] as const
              ).map(([k, t]) => {
                const on = d.audience === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={locked}
                    onClick={() => set({ audience: k })}
                    className="market-focus"
                    style={{ minHeight: 36, borderRadius: 9, background: on ? m.subactive : "transparent", color: on ? m.onfill : m.subink, border: 0, fontFamily: "inherit", fontSize: px(12.5), fontWeight: on ? 700 : 600, cursor: locked ? "default" : "pointer", opacity: locked && !on ? 0.6 : 1 }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>How it appears on Explore</p>
            <div style={{ borderRadius: 16, border: `1px solid ${m.border}`, background: m.card, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: px(14) }}>{initialsOf(business?.name ?? "")}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: m.ink }}>{item ? item.field : "Your promotion"}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: m.faint }}>{ro && d.to ? `Ended on ${dayMonth(d.to)}` : edit && d.to ? `Until ${dayMonth(d.to)}` : item ? item.preview : "Choose what to promote to see a preview"}</span>
              </span>
              <span style={{ fontSize: px(10.5), fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: m.goodbg, color: m.good, whiteSpace: "nowrap" }}>{text.chip}</span>
            </div>
          </div>
        </div>
      </MasterSheet>
      <PopupMenu
        open={menu === "what"}
        onClose={() => setMenu(null)}
        anchor={whatEl}
        matchWidth={whatEl}
        variant="field"
        heading="Promote"
        options={pool.map((i) => ({ value: i.id, label: i.title, note: i.sub }))}
        selected={d.what}
        onSelect={(id) => {
          set({ what: id });
          setErrors((e) => ({ ...e, what: undefined }));
          setMenu(null);
        }}
      />
      <PopupMenu
        open={menu === "type"}
        onClose={() => setMenu(null)}
        anchor={typeEl}
        matchWidth={typeEl}
        variant="field"
        heading="Promotion type"
        options={types.map((t) => ({ value: t.value, label: t.label, note: t.note }))}
        selected={d.type}
        onSelect={(t) => {
          set({ type: t, value: t === "percent_off" ? (d.type === "percent_off" ? d.value : null) ?? 25 : t === "first_n_free" ? 2 : null });
          setErrors((e) => ({ ...e, type: undefined, value: undefined }));
          setMenu(null);
        }}
      />
      <CentredDialog
        open={confirm === "discard"}
        title={edit ? "Discard your changes?" : "Discard this promotion?"}
        body={edit ? `${edit.promo.name} will keep its current details.` : "You'll lose what you've entered."}
        action={edit ? "Discard changes" : "Discard"}
        cancel="Keep editing"
        onAction={() => {
          setConfirm(null);
          setD(blank);
          setErrors({});
          onClose();
        }}
        onCancel={() => setConfirm(null)}
      />
      <CentredDialog
        open={confirm === "end"}
        title="End this promotion now?"
        body={`${edit?.promo.name ?? "This promotion"} will stop showing on Explore today instead of ${d.to ? dayMonth(d.to) : "its end date"}. People who already claimed it keep it.`}
        action="End promotion"
        cancel="Keep it running"
        onAction={() => setConfirm("end2")}
        onCancel={() => setConfirm(null)}
      />
      <CentredDialog
        open={confirm === "end2"}
        title="Confirm end"
        body="This can't be undone."
        action="End promotion"
        cancel="Keep it running"
        busy={busy}
        onAction={() => void doEnd()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function Field({
  id,
  value,
  placeholder,
  error,
  focused,
  locked,
  icon,
  onClick,
  refEl,
  haspopup,
}: {
  id: string;
  value: string;
  placeholder?: boolean;
  error?: boolean;
  focused?: boolean;
  locked?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  refEl?: (el: HTMLButtonElement | null) => void;
  haspopup?: boolean;
}) {
  const m = useMarketColors();
  return (
    <button
      ref={refEl}
      id={id}
      type="button"
      aria-haspopup={haspopup ? "listbox" : undefined}
      aria-expanded={haspopup ? !!focused : undefined}
      aria-disabled={locked}
      aria-invalid={error || undefined}
      onClick={() => !locked && onClick()}
      className="market-focus"
      style={{
        ...fieldStyle(m, error),
        display: "flex",
        alignItems: "center",
        gap: 8,
        textAlign: "start",
        color: placeholder || locked ? m.faint : m.ink,
        boxShadow: error ? `inset 0 0 0 1px ${m.high}` : focused ? `inset 0 0 0 1.5px ${m.fill}` : undefined,
        cursor: locked ? "default" : "pointer",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      <span style={{ display: "flex", color: m.faint }} aria-hidden>
        {icon}
      </span>
    </button>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  const m = useMarketColors();
  return (
    <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: m.high, marginTop: 6, lineHeight: lh(16) }}>
      {children}
    </p>
  );
}
