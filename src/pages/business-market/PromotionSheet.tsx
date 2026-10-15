import React, { useMemo, useState } from "react";
import { Calendar, ChevronDown, Lock, Trash2, CalendarX2 } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { useOnline } from "../../hooks/useOnline";
import { createPromotion, endPromotion, offerLocked, updatePromotion, type PromoStatus, type Promotion } from "../../services/business-market/promotions";
import { useMarket } from "./MarketContext";
import { lh, MFieldLabel, MPopup, MPrimary, MSaveError, MSheet, MSoonNote, px } from "./kit";
import { RangeCalendar } from "./RangeCalendar";
import { dayMonth, isoOf } from "./model";
import { draftOf, editPatch, editStatusOf, promoName, promoTarget, promoText, promoTypes, validatePromo, valueFor, type PromoDraft, type PromoErrors, type Promotable } from "./promoModel";

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
  const m = useMarket();
  const { c, v, kind, business } = m;
  const online = useOnline();
  const today = isoOf(new Date());
  const pending = m.backend.promotions === "pending";
  const blank: PromoDraft = useMemo(
    () => (edit ? draftOf(edit.promo, edit.item) : prefill ?? { what: initialWhat ?? null, type: null, value: null, from: today, to: null, audience: "new" }),
    [edit, prefill, initialWhat, today]
  );
  const [d, setD] = useState<PromoDraft>(blank);
  const [errors, setErrors] = useState<PromoErrors>({});
  const [menu, setMenu] = useState<"what" | "type" | null>(null);
  const [cal, setCal] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "end" | null>(null);
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
  const canWrite = online && m.can("marketing") && !!business;

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
    <MPrimary c={c} onClick={() => onDuplicate?.({ ...d, from: today, to: null })} disabled={!canWrite}>
      Duplicate as new promotion
    </MPrimary>
  ) : (
    <>
      <MPrimary c={c} onClick={() => void save()} disabled={(!!edit && !changed) || busy || !canWrite}>
        {edit ? "Save changes" : "Save promotion"}
      </MPrimary>
      {soon && <MSoonNote c={c}>Saving promotions is coming soon. Nothing was saved.</MSoonNote>}
      {saveError && <MSaveError c={c}>{saveError}</MSaveError>}
      {(status === "active" || status === "paused") && (
        <MPrimary c={c} tone="destructive" style={{ marginTop: 14 }} onClick={() => setConfirm("end")} disabled={busy || !canWrite}>
          End promotion
        </MPrimary>
      )}
    </>
  );

  return (
    <>
      <MSheet open={open} onClose={close} title={title} footer={footer}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(locked || ro) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 12, background: c.soft, color: c.inkSoft }}>
              <Lock size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: px(12), lineHeight: lh(17) }}>{ro ? ENDED_NOTE : LOCK_NOTE}</p>
            </div>
          )}
          <div>
            <MFieldLabel c={c} id="pc-what">What to promote</MFieldLabel>
            <Field
              refEl={setWhatEl}
              labelledBy="pc-what"
              value={item?.field ?? "Choose what to promote"}
              placeholder={!item}
              error={!!errors.what}
              focused={menu === "what"}
              locked={locked}
              icon={locked ? <Lock size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
              onClick={() => setMenu("what")}
              haspopup
            />
            {errors.what && <ErrorLine c={c}>{errors.what}</ErrorLine>}
          </div>
          <div>
            <MFieldLabel c={c} id="pc-type">Promotion type</MFieldLabel>
            <Field
              refEl={setTypeEl}
              labelledBy="pc-type"
              value={d.type ? promoText(kind, d.type, d.type === "first_n_free" ? d.value : null).field : "Choose a type"}
              placeholder={!d.type}
              error={!!errors.type}
              focused={menu === "type"}
              locked={locked}
              icon={locked ? <Lock size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
              onClick={() => setMenu("type")}
              haspopup
            />
            {errors.type && <ErrorLine c={c}>{errors.type}</ErrorLine>}
            {d.type === "percent_off" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, height: 46, borderRadius: 14, background: c.soft, border: `1.5px solid ${errors.value ? c.high : c.border}`, padding: "0 12px", boxSizing: "border-box" }}>
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
                  style={{ width: 40, background: "transparent", border: 0, outline: "none", fontSize: px(13.5), fontWeight: 700, color: locked ? c.faint : c.ink }}
                />
                <span style={{ fontSize: px(13.5), fontWeight: 700, color: c.faint }}>% off</span>
              </label>
            )}
            {errors.value && <ErrorLine c={c}>{errors.value}</ErrorLine>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <div>
              <MFieldLabel c={c} id="pc-from">Starts</MFieldLabel>
              <Field
                labelledBy="pc-from"
                value={d.from ? (d.from === today ? "Today" : dayMonth(d.from)) : "Today"}
                focused={cal}
                locked={locked}
                icon={<Calendar size={16} strokeWidth={2.2} />}
                onClick={() => setCal(true)}
              />
            </div>
            <div>
              <MFieldLabel c={c} id="pc-to">Ends</MFieldLabel>
              <Field
                labelledBy="pc-to"
                value={d.to ? dayMonth(d.to) : "Choose"}
                placeholder={!d.to}
                error={!!errors.to}
                focused={cal || (!!edit && d.to !== blank.to)}
                locked={ro}
                icon={<Calendar size={16} strokeWidth={2.2} />}
                onClick={() => setCal(true)}
              />
              {errors.to && <ErrorLine c={c}>{errors.to}</ErrorLine>}
            </div>
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
          <div>
            <MFieldLabel c={c} id="pc-aud">Who sees it</MFieldLabel>
            <div role="radiogroup" aria-labelledby="pc-aud" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 6, padding: 4, borderRadius: 14, background: c.soft }}>
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
                    style={{ minHeight: 38, borderRadius: 10, background: on ? c.card : "transparent", color: on ? c.ink : c.faint, border: 0, fontSize: px(12.5), fontWeight: 800, boxShadow: on ? "0 1px 3px rgba(36,31,27,0.1)" : "none" }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <MFieldLabel c={c}>How it appears on Explore</MFieldLabel>
            <div style={{ borderRadius: 16, border: `1px solid ${c.border}`, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: px(14) }}>{initialsOf(business?.name ?? "")}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13.5), fontWeight: 800, color: c.ink }}>{item ? item.field : "Your promotion"}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{ro && d.to ? `Ended on ${dayMonth(d.to)}` : edit && d.to ? `Until ${dayMonth(d.to)}` : item ? item.preview : "Choose what to promote to see a preview"}</span>
              </span>
              <span style={{ fontSize: px(11), fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: c.goodBg, color: c.good, whiteSpace: "nowrap" }}>{text.chip}</span>
            </div>
          </div>
        </div>
      </MSheet>
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
      <MPopup
        open={confirm === "discard"}
        icon={Trash2}
        disc={{ bg: c.soft, ink: c.inkSoft }}
        title={edit ? "Discard your changes?" : "Discard this promotion?"}
        body={edit ? `${edit.promo.name} will keep its current details.` : "You'll lose what you've entered."}
        action={edit ? "Discard changes" : "Discard"}
        keep="Keep editing"
        onAction={() => {
          setConfirm(null);
          setD(blank);
          setErrors({});
          onClose();
        }}
        onCancel={() => setConfirm(null)}
      />
      <MPopup
        open={confirm === "end"}
        icon={CalendarX2}
        title="End this promotion now?"
        body={`${edit?.promo.name ?? "This promotion"} will stop showing on Explore today instead of ${d.to ? dayMonth(d.to) : "its end date"}. People who already claimed it keep it.`}
        action="End promotion"
        keep="Keep it running"
        busy={busy}
        onAction={() => void doEnd()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function Field({
  value,
  placeholder,
  error,
  focused,
  locked,
  icon,
  onClick,
  labelledBy,
  refEl,
  haspopup,
}: {
  value: string;
  placeholder?: boolean;
  error?: boolean;
  focused?: boolean;
  locked?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  labelledBy: string;
  refEl?: (el: HTMLButtonElement | null) => void;
  haspopup?: boolean;
}) {
  const { c } = useMarket();
  return (
    <button
      ref={refEl}
      type="button"
      aria-labelledby={labelledBy}
      aria-haspopup={haspopup ? "listbox" : undefined}
      aria-expanded={haspopup ? !!focused : undefined}
      aria-disabled={locked}
      aria-invalid={error || undefined}
      onClick={() => !locked && onClick()}
      style={{
        height: 46,
        width: "100%",
        borderRadius: 14,
        background: c.soft,
        border: `1.5px solid ${error ? c.high : focused ? c.primary : c.border}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        boxSizing: "border-box",
        fontSize: px(13.5),
        fontWeight: 700,
        color: placeholder || locked ? c.faint : c.ink,
        textAlign: "left",
        cursor: locked ? "default" : "pointer",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      <span style={{ display: "flex", color: c.faint }} aria-hidden>
        {icon}
      </span>
    </button>
  );
}

function ErrorLine({ c, children }: { c: ReturnType<typeof useMarket>["c"]; children: React.ReactNode }) {
  return (
    <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: c.high, marginTop: 5, lineHeight: lh(16) }}>
      {children}
    </p>
  );
}
