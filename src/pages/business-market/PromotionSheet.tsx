import React, { useMemo, useState } from "react";
import { Calendar, ChevronDown, Lock, Trash2, CalendarX2 } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { useMarket } from "./MarketContext";
import { lh, MFieldLabel, MPopup, MPrimary, MSheet, MSoonNote, px } from "./kit";
import { RangeCalendar } from "./RangeCalendar";
import { dayMonth, isoOf } from "./model";
import { promoText, promoTypes, validatePromo, type PromoDraft, type PromoErrors, type Promotable } from "./promoModel";

// MA1-099 / 101 / 102 / 103 / 104 / 106 (Create promotion), MA1-137 / 139 /
// 141 / 142 / 144 / 146 / 149 (Edit, active, ended) and
// OURS-MA1-promotion-type-menu. The form works in full (listboxes, type
// value, inline range calendar, audience, the Explore preview, validation on
// Save, discard confirm). Writing a promotion is B13 (MK-05, not on the local
// stack): a valid Save says so under the button and nothing is stored.

/** B13 MK-05 promotion writes are wired (flip when the stage lands and HANDOVER_API.md names them). */
export const PROMO_WRITES = false;

export interface PromoEdit {
  status: "scheduled" | "active" | "ended";
  name: string;
  draft: PromoDraft;
}

export function PromotionSheet({
  open,
  onClose,
  items,
  initialWhat,
  edit,
  onDuplicate,
}: {
  open: boolean;
  onClose: () => void;
  items: Promotable[];
  initialWhat?: string | null;
  edit?: PromoEdit | null;
  onDuplicate?: (d: PromoDraft) => void;
}) {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const today = isoOf(new Date());
  const blank: PromoDraft = useMemo(() => edit?.draft ?? { what: initialWhat ?? null, type: null, value: null, from: today, to: null, audience: "new" }, [edit, initialWhat, today]);
  const [d, setD] = useState<PromoDraft>(blank);
  const [errors, setErrors] = useState<PromoErrors>({});
  const [menu, setMenu] = useState<"what" | "type" | null>(null);
  const [cal, setCal] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "end" | null>(null);
  const [soon, setSoon] = useState(false);
  const [whatEl, setWhatEl] = useState<HTMLButtonElement | null>(null);
  const [typeEl, setTypeEl] = useState<HTMLButtonElement | null>(null);

  const ro = edit?.status === "ended";
  const whatLocked = !!edit && edit.status !== "scheduled";
  const changed = JSON.stringify(d) !== JSON.stringify(blank);
  const touched = edit ? changed : !!(d.what || d.type || d.to);
  const item = items.find((i) => i.id === d.what) ?? null;
  const text = promoText(kind, d.type, d.value);
  const types = promoTypes(kind);

  const close = () => (touched && !ro ? setConfirm("discard") : onClose());
  const save = () => {
    const e = validatePromo(d, v.whatError);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!PROMO_WRITES) setSoon(true);
  };
  const set = (patch: Partial<PromoDraft>) => {
    setSoon(false);
    setD((x) => ({ ...x, ...patch }));
  };

  const title = ro ? "Promotion details" : edit ? "Edit promotion" : "Create promotion";
  const footer = ro ? (
    <MPrimary c={c} onClick={() => onDuplicate?.({ ...d, from: today, to: null })}>
      Duplicate as new promotion
    </MPrimary>
  ) : (
    <>
      <MPrimary c={c} onClick={save} disabled={!!edit && !changed}>
        {edit ? "Save changes" : "Save promotion"}
      </MPrimary>
      {soon && <MSoonNote c={c}>Saving promotions is coming soon. Nothing was saved.</MSoonNote>}
      {edit?.status === "active" && (
        <MPrimary c={c} tone="destructive" style={{ marginTop: 14 }} onClick={() => setConfirm("end")}>
          End promotion
        </MPrimary>
      )}
    </>
  );

  return (
    <>
      <MSheet open={open} onClose={close} title={title} footer={footer}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(whatLocked || ro) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 12, background: c.soft, color: c.inkSoft }}>
              <Lock size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: px(12), lineHeight: lh(17) }}>
                {ro
                  ? "This promotion has ended, so it can't be changed. Duplicate it to run it again."
                  : "What's being promoted can't change once a promotion is live, because clients may already have claimed it. You can change the dates, who sees it and the offer."}
              </p>
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
              locked={whatLocked || ro}
              icon={whatLocked || ro ? <Lock size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
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
              value={d.type ? promoText(kind, d.type, null).field : "Choose a type"}
              placeholder={!d.type}
              error={!!errors.type}
              focused={menu === "type"}
              locked={ro}
              icon={<ChevronDown size={16} strokeWidth={2.2} />}
              onClick={() => setMenu("type")}
              haspopup
            />
            {errors.type && <ErrorLine c={c}>{errors.type}</ErrorLine>}
            {d.type === "percent_off" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, height: 46, borderRadius: 14, background: c.soft, border: `1.5px solid ${errors.value ? c.high : c.border}`, padding: "0 12px", boxSizing: "border-box" }}>
                <input
                  aria-label="Percent off"
                  inputMode="numeric"
                  readOnly={ro}
                  value={d.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 2), 10);
                    set({ value: Number.isFinite(n) ? n : null });
                  }}
                  placeholder="25"
                  style={{ width: 40, background: "transparent", border: 0, outline: "none", fontSize: px(13.5), fontWeight: 700, color: c.ink }}
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
                locked={ro || (!!edit && edit.status === "active")}
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
              onCancel={() => setCal(false)}
              onDone={(from, to) => {
                set({ from, to });
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
                    disabled={ro}
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
        options={items.map((i) => ({ value: i.id, label: i.title, note: i.sub }))}
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
          set({ type: t, value: t === "percent_off" ? d.value ?? 25 : null });
          setErrors((e) => ({ ...e, type: undefined, value: undefined }));
          setMenu(null);
        }}
      />
      <MPopup
        open={confirm === "discard"}
        icon={Trash2}
        disc={{ bg: c.soft, ink: c.inkSoft }}
        title={edit ? "Discard your changes?" : "Discard this promotion?"}
        body={edit ? `${edit.name} will keep its current details.` : "You'll lose what you've entered."}
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
        body={`${edit?.name ?? "This promotion"} will stop showing on Explore today instead of ${d.to ? dayMonth(d.to) : "its end date"}. People who already claimed it keep it.`}
        action="End promotion"
        keep="Keep it running"
        extra={!PROMO_WRITES ? <MSoonNote c={c}>Ending promotions is coming soon.</MSoonNote> : undefined}
        onAction={() => setConfirm(null)}
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
