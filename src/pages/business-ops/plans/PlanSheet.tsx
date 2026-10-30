import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, DoorOpen, GraduationCap, Plus, Sparkles, Sun, Ticket, X, type LucideIcon } from "lucide-react";
import { MenuStepper, PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { sheetChipStyle } from "../../../components/ui/sheetChip";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { linePx, textPx } from "../../../theme/textSize";
import { classTypesProblem, paymentLabel, type MembershipBilling, type MembershipPlanRow, type PlanDraft, type PlanKind, type PlanPayment } from "../../../services/membership-plans";
import { MasterSheet, PrimaryButton, SaveError, SheetSwitch, fieldStyle } from "../../business-market/listingParts";
import {
  BILLING_CHIPS,
  billingChipOf,
  billingForKind,
  classesLabel,
  classTypeOptions,
  cleanIncludes,
  COMMITMENTS,
  commitmentLabel,
  daysLabel,
  includesProblem,
  INCLUDES_MAX,
  KIND_LABEL,
  LENGTHS,
  limitLabel,
  NOTICES,
  oneTimeKind,
  payWith,
  periodPhrase,
  previewLines,
  previewPrice,
  priceProblem,
  switchNote,
  typeChips,
  VALID_FOR,
} from "./planModel";
import { usePlanColors } from "./ui";
import type { WriteOutcome } from "./usePlans";

// Market + Share 3.0 · W3 · B-MA.5 Add plan / B-MA.5.1 Edit plan
// (Business Marketplace Screens lines 337–358, script `plan` / `chipSet`):
// the MasterBottomSheet (listingParts.MasterSheet: the app BottomSheet's
// default chrome, title "Add plan" / "Edit plan"), body a column gap 6 of
// --sgrey boxes (radius 14, padding 12 14; label 13 / 500 --slabel, 8 above
// the field; field --sfield radius 10 padding 11 13, 14 / 19):
// 1. Plan name (placeholder "e.g. Monthly");
// 2. edit only, directly under the name: the Active row ("Active" 14 / 700,
//    "Members can buy this plan" 11.5 --faint, the 42 × 26 switch; off adds
//    "Paused plans are hidden from members." 12 / 17 --ink2, margin-top 8);
// 3. Type chips (radius 8, padding 8 14, 13.5; on --chipon / white 700, off
//    #FAFAFB / 1px #E5E6EB / --ink 500): the drawn Membership · Day pass,
//    then the live types this business may sell (D-15);
// 4. Price: the box carries a 1px border (transparent; --high with the error
//    "Enter a price for this plan." 12 / 600 inside it; --fill once an edit
//    changed it); "$" in --faint, gap 6; edit adds "Price changes apply to
//    new purchases. Current members keep their plan." 11.5 / 16 --faint;
// 5. Billing chips One-time · Monthly · 3 months · 6 months · 12 months in
//    one row (it scrolls sideways, never wraps), on the live enum (D-16):
//    One-time = daily (Day pass / Drop-in, and the one-off Class pack and
//    Intro offer), Monthly = monthly, 3 / 6 / 12 months = quarterly /
//    semiannually / annually. One-time on a Membership turns it into a Day
//    pass (or the first one-time type offered); a period on a one-time type
//    turns it into a Membership;
// 6. What's included: lines (--sfield radius 10 padding 10 13, the 14 X at
//    the right; hidden on the empty placeholder line "e.g. Gym floor
//    access") + "Add a line" 13 / 700 --pdark (membership_plans.includes);
// 7. add only: the Active row at the bottom;
// then, KEPT (D-15, PLAN §3.4), "More options" in the same box style: the
//    type's own fields (Includes / Limit / Commitment / Who can buy for a
//    Membership; Sessions / Valid for / Covers for a Class pack; Covers or
//    Which classes for a Day pass or Drop-in; Length / Who can buy /
//    Converts to for an Intro offer), Payment type, and the Explore preview.
// Footer (padding 8 20 34, 1px --srule above, gap 4): the CTA "Add plan" /
// "Save" (50, radius 16, --fill / --onfill 15 / 700) at 0.4 until something
// is typed (add) or changed (edit), and on edit the "Delete plan" text
// button (40 tall, 14 / 700 --high).

type MenuKey = "classes" | "lim" | "com" | "valid" | "length" | "conv" | "pay";

const PREVIEW_ICON: Record<PlanKind, LucideIcon> = { membership: GraduationCap, class_pack: Ticket, intro_offer: Sparkles, drop_in: DoorOpen, day_pass: Sun };
const DEFAULT_VALID: Partial<Record<PlanKind, number>> = { class_pack: 60, intro_offer: 7 };

export interface PlanSheetProps {
  open: boolean;
  onClose: () => void;
  /** The plan being edited, or null for a new plan. */
  editing: MembershipPlanRow | null;
  runsClasses: boolean;
  classTypes: string[];
  /** Every plan of the business (Converts to). */
  plans: MembershipPlanRow[];
  /** plan_types_for_business_type for this business; null offers every type. */
  offered: PlanKind[] | null;
  /** Active members of the plan being edited, or null when unknown. */
  memberCount: number | null;
  save: (draft: PlanDraft) => Promise<WriteOutcome>;
  onSaved: (plan: MembershipPlanRow, isNew: boolean) => void;
  /** "Delete plan" (edit): opens the two delete dialogs over the sheet. */
  onDelete?: (plan: MembershipPlanRow) => void;
}

export const PlanSheet: React.FC<PlanSheetProps> = (props) => {
  // A fresh form per opening: the sheet's state resets on every open.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((s) => s + 1);
  }
  const footerId = useId();
  return (
    <MasterSheet open={props.open} onClose={props.onClose} title={props.editing ? "Edit plan" : "Add plan"} footer={<div id={footerId} />}>
      <PlanForm key={session} {...props} footerId={footerId} />
    </MasterSheet>
  );
};

/** One grey box (--sgrey, radius 14, padding 12 14), optionally with its 13 / 500 --slabel label. */
const Box: React.FC<{ label?: string; labelId?: string; htmlFor?: string; border?: string; children: React.ReactNode; boxRef?: React.Ref<HTMLDivElement> }> = ({ label, labelId, htmlFor, border, children, boxRef }) => {
  const m = usePlanColors();
  return (
    <div ref={boxRef} style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px", border, lineHeight: "normal", color: m.ink }}>
      {label ? (
        htmlFor ? (
          <label id={labelId} htmlFor={htmlFor} style={{ display: "block", fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
            {label}
          </label>
        ) : (
          <div id={labelId} style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
            {label}
          </div>
        )
      ) : null}
      {children}
    </div>
  );
};

/** A note inside a box: 12 / 17 --ink2, margin-top 8 (the paused note's style). */
const BoxNote: React.FC<{ children: React.ReactNode; id?: string; live?: boolean }> = ({ children, id, live }) => {
  const m = usePlanColors();
  return (
    <div id={id} aria-live={live ? "polite" : undefined} style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
      {children}
    </div>
  );
};

/** A box's error line: 12 / 600 --high, margin-top 8 (the drawn price error). */
const BoxError: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const m = usePlanColors();
  return (
    <div id={id} role="alert" style={{ margin: "8px 0 0", fontSize: textPx(12), fontWeight: 600, color: m.high }}>
      {children}
    </div>
  );
};

/** A chip row: one line, gap 8, sideways scroll instead of a wrap. */
const ChipRow: React.FC<{ labelledBy: string; selected: string | null; children: React.ReactNode }> = ({ labelledBy, selected, children }) => {
  const row = useRef<HTMLDivElement | null>(null);
  // Keep the chosen chip in view (the row scrolls sideways; 12 months sits past the edge at 390).
  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !on) return;
    const left = on.offsetLeft;
    if (left < el.scrollLeft + 14) el.scrollLeft = Math.max(0, left - 14);
    else if (left + on.offsetWidth > el.scrollLeft + el.clientWidth - 14) el.scrollLeft = left + on.offsetWidth - el.clientWidth + 14;
  }, [selected]);
  return (
    <div ref={row} role="radiogroup" aria-labelledby={labelledBy} className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "-2px -14px", padding: "2px 14px", position: "relative" }}>
      {children}
    </div>
  );
};

const Chip: React.FC<{ on: boolean; label: string; disabled?: boolean; onPick: () => void }> = ({ on, label, disabled, onPick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    aria-disabled={disabled || undefined}
    onClick={() => !disabled && onPick()}
    className="market-focus"
    style={{ ...sheetChipStyle(on), fontFamily: "inherit", lineHeight: "normal", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }}
  >
    {label}
  </button>
);

/** A field that opens a menu: --sfield, the value 14 / 19 --ink, the 16 chevron --faint. */
const Picker = React.forwardRef<HTMLButtonElement, { value: string; open: boolean; labelledBy: string; invalid?: boolean; describedBy?: string; onOpen: (el: HTMLButtonElement) => void }>(
  ({ value, open, labelledBy, invalid, describedBy, onOpen }, ref) => {
    const m = usePlanColors();
    const valueId = useId();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={`${labelledBy} ${valueId}`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={(e) => onOpen(e.currentTarget)}
        className="market-focus"
        style={{ ...fieldStyle(m, invalid), display: "flex", alignItems: "center", gap: 8, textAlign: "start", cursor: "pointer", boxShadow: open ? `inset 0 0 0 1px ${m.fill}` : invalid ? `inset 0 0 0 1px ${m.high}` : undefined }}
      >
        <span id={valueId} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </span>
        <ChevronDown size={16} aria-hidden style={{ color: m.faint, flexShrink: 0 }} />
      </button>
    );
  }
);
Picker.displayName = "Picker";

/** A value the business can't change here: the field in --faint. */
const Fixed: React.FC<{ value: string; labelledBy: string }> = ({ value, labelledBy }) => {
  const m = usePlanColors();
  return (
    <div role="text" aria-labelledby={labelledBy} style={{ ...fieldStyle(m), color: m.faint }}>
      {value}
    </div>
  );
};

const PlanForm: React.FC<PlanSheetProps & { footerId: string }> = ({ editing, runsClasses, classTypes, plans, offered, memberCount, save, onSaved, onClose, onDelete, footerId }) => {
  const m = usePlanColors();
  const online = useOnline();
  const reduce = useReducedMotion();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const sessRef = useRef<HTMLInputElement | null>(null);
  const lineRefs = useRef<(HTMLInputElement | null)[]>([]);
  const ids = {
    name: useId(),
    nameErr: useId(),
    type: useId(),
    price: useId(),
    priceErr: useId(),
    priceNote: useId(),
    billing: useId(),
    billingErr: useId(),
    inc: useId(),
    incErr: useId(),
    active: useId(),
    pausedNote: useId(),
    more: useId(),
    classes: useId(),
    classesErr: useId(),
    lim: useId(),
    com: useId(),
    who: useId(),
    sess: useId(),
    sessErr: useId(),
    valid: useId(),
    length: useId(),
    conv: useId(),
    pay: useId(),
  };

  const e = editing;
  const init = {
    kind: (e?.kind ?? "membership") as PlanKind,
    name: e?.name ?? "",
    price: e ? String(e.priceValue) : "",
    billing: (e ? e.billing : null) as MembershipBilling | null,
    lines: e?.includes && e.includes.length ? e.includes : [""],
    active: e ? e.dbStatus !== "paused" : true,
    classes: e?.allowedClassTypes ?? null,
    limit: e?.visitsPerPeriod ?? null,
    commit: e?.minimumTermMonths ?? 0,
    notice: e?.noticeDays ?? 0,
    sessions: e?.sessionsInPack ? String(e.sessionsInPack) : "",
    validFor: e?.validForDays ?? DEFAULT_VALID[e?.kind ?? "membership"] ?? null,
    convertsTo: e?.convertsToPlanId ?? null,
    payments: (e?.paymentMethods ?? ["cash"]) as PlanPayment[],
  };

  const [kind, setKind] = useState<PlanKind>(init.kind);
  const [name, setName] = useState(init.name);
  const [price, setPrice] = useState(init.price);
  const [billing, setBilling] = useState<MembershipBilling | null>(init.billing);
  const [lines, setLines] = useState<string[]>(init.lines);
  const [active, setActive] = useState(init.active);
  const [classes, setClasses] = useState<string[] | null>(init.classes);
  const [limit, setLimit] = useState<number | null>(init.limit);
  const [limitN, setLimitN] = useState<number>(init.limit ?? 8);
  const [commit, setCommit] = useState<number>(init.commit);
  const [notice, setNotice] = useState<number>(init.notice);
  const [sessions, setSessions] = useState(init.sessions);
  const [validFor, setValidFor] = useState<number | null>(init.validFor);
  const [convertsTo, setConvertsTo] = useState<string | null>(init.convertsTo);
  const [payments, setPayments] = useState<PlanPayment[]>(init.payments);
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string; billing?: string; sessions?: string; classes?: string; includes?: string }>({});
  const [switched, setSwitched] = useState<{ from: PlanKind; to: PlanKind } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ key: MenuKey; anchor: HTMLElement; row: HTMLElement } | null>(null);
  const [frame, setFrame] = useState<{ footer: HTMLElement | null; body: HTMLElement | null }>({ footer: null, body: null });
  const rootRef = (el: HTMLDivElement | null) => {
    if (el && !frame.body) {
      setFrame({ footer: document.getElementById(footerId), body: el.parentElement });
      // Keyboard: focus moves into the sheet (its body), so Tab reaches the first field; no field takes focus, so no keyboard pops up.
      el.focus({ preventScroll: true });
    }
  };

  const membership = kind === "membership";
  const pack = kind === "class_pack";
  const intro = kind === "intro_offer";
  const usesClasses = runsClasses && kind !== "intro_offer";
  const kinds = typeChips(offered, runsClasses, kind);
  const oneTime = oneTimeKind(kinds);
  const chip = billingChipOf(kind, billing);

  /** What would be written (fields a type does not have are cleared). */
  const draftOf = (): PlanDraft => ({
    name: name.trim(),
    price: price.trim(),
    billing: billingForKind(kind, billing, validFor),
    paymentType: paymentLabel(payments),
    kind,
    paymentMethods: payments,
    visitsPerPeriod: membership && runsClasses ? limit : null,
    sessionsInPack: pack ? Number(sessions) || null : null,
    validForDays: pack || intro ? validFor : null,
    minimumTermMonths: membership ? commit || null : null,
    noticeDays: membership ? notice || null : null,
    allowedClassTypes: usesClasses ? classes : null,
    convertsToPlanId: intro ? convertsTo : null,
    includes: cleanIncludes(lines),
    // The sheet never archives; an archived plan's status is left alone.
    ...(editing?.dbStatus === "archived" ? {} : { status: active ? ("active" as const) : ("paused" as const) }),
  });
  const [initialDraft] = useState(() => JSON.stringify(draftOf()));
  const changed = !editing || JSON.stringify(draftOf()) !== initialDraft;
  const typed = !!name.trim() || !!price.trim();
  const ready = editing ? changed : typed;
  const shownPrice = previewPrice(price);
  const hasMembers = (memberCount ?? 0) > 0;
  const priceChanged = !!editing && price.trim() !== init.price;

  const edited = () => {
    if (switched) setSwitched(null);
    if (saveError) setSaveError(null);
  };

  const pickKind = (k: PlanKind) => {
    if (k === kind) return;
    if (name.trim() || price.trim()) setSwitched({ from: kind, to: k });
    else setSwitched(null);
    setKind(k);
    // Every field but name, price, included lines and payment type resets to the new type's defaults.
    setBilling(k === "membership" ? (billing && billing !== "daily" ? billing : null) : "daily");
    setClasses(null);
    setLimit(null);
    setCommit(0);
    setNotice(0);
    setSessions("");
    setValidFor(DEFAULT_VALID[k] ?? null);
    setConvertsTo(null);
    setErrors((x) => ({ name: x.name, price: x.price, includes: x.includes }));
    if (saveError) setSaveError(null);
  };

  const pickBilling = (b: MembershipBilling) => {
    edited();
    if (errors.billing) setErrors((x) => ({ ...x, billing: undefined }));
    if (b === "daily") {
      if (!membership) return;
      if (oneTime) pickKind(oneTime);
      return;
    }
    if (!membership) {
      pickKind("membership");
      setSwitched(null);
    }
    setBilling(b);
  };

  const setLine = (i: number, v: string) => {
    edited();
    if (errors.includes) setErrors((x) => ({ ...x, includes: undefined }));
    setLines((ls) => ls.map((x, j) => (j === i ? v : x)));
  };
  const removeLine = (i: number) => {
    edited();
    setLines((ls) => (ls.length === 1 ? [""] : ls.filter((_, j) => j !== i)));
    window.setTimeout(() => lineRefs.current[Math.max(0, i - 1)]?.focus(), 0);
  };
  const addLine = () => {
    if (lines.length >= INCLUDES_MAX) return;
    edited();
    setLines((ls) => [...ls, ""]);
    window.setTimeout(() => lineRefs.current[lines.length]?.focus(), 0);
  };

  const submit = async () => {
    if (saving || !ready || !online) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a name for this plan.";
    const pp = priceProblem(price);
    if (pp) next.price = pp;
    if (membership && !billing) next.billing = "Choose how often it bills.";
    if (pack) {
      const n = Number(sessions);
      if (!sessions.trim() || !Number.isInteger(n) || n < 1 || n > 100) next.sessions = "Enter how many classes.";
    }
    const classProblem = usesClasses ? classTypesProblem(classes) : null;
    if (classProblem) next.classes = classProblem;
    const incProblem = includesProblem(lines);
    if (incProblem) next.includes = incProblem;
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.price) return priceRef.current?.focus();
    if (next.billing) return;
    if (next.includes) return lineRefs.current[0]?.focus();
    if (next.sessions || next.classes) {
      setMore(true);
      if (next.sessions) window.setTimeout(() => sessRef.current?.focus(), 0);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const r = await save(draftOf());
    setSaving(false);
    if (!r.ok) {
      setSaveError(r.message);
      return;
    }
    onSaved(r.plan, !editing);
    onClose();
  };

  const openMenu = (key: MenuKey) => (el: HTMLElement) => setMenu({ key, anchor: el, row: el });

  // ---- kept menus (PopupMenu variant "field")
  const { ok: okTypes, tooLong } = classTypeOptions(classTypes);
  // Keep a stored type the business no longer runs, so an edit never drops it silently.
  const allTypes = [...okTypes, ...(classes ?? []).filter((c) => !okTypes.includes(c))];
  const full = (classes?.length ?? 0) >= 24;
  const classOptions: PopupMenuOption<string>[] = [
    { value: "__all", label: "All classes", note: "Every class type, now and future" },
    ...allTypes.map((c) => ({ value: `t:${c}`, label: c, disabled: full && !classes?.includes(c) })),
    ...tooLong.map((c) => ({ value: `x:${c}`, label: c, disabled: true, note: "Too long to add to a plan (over 60 characters)" })),
  ];
  const classTitle = membership ? "Includes" : kind === "drop_in" ? "Which classes" : "Covers";
  const chosen = classes?.length ?? allTypes.length;
  const period = billingForKind(kind, billing, validFor);
  const limitOptions: PopupMenuOption<string>[] = [
    { value: "unlimited", label: "Unlimited", note: "Book as many classes as they like" },
    {
      value: "upto",
      label: "Up to",
      note: "classes",
      trailing: (
        <MenuStepper
          value={limitN}
          min={1}
          max={99}
          label="Classes"
          onChange={(v) => {
            setLimitN(v);
            setLimit(v);
            edited();
          }}
        />
      ),
    },
    // visits_per_period counts in the plan's billing period, so "Applies" is that one period.
    { value: "per", label: `Per ${periodPhrase(period).replace(/^(a|every) /, "")}`, group: "Applies" },
  ];
  const comOptions: PopupMenuOption<string>[] = [
    ...COMMITMENTS.map((x) => ({ value: `min:${x}`, label: x ? `${x} months` : "None", group: "Minimum commitment" })),
    ...NOTICES.map((d) => ({ value: `notice:${d}`, label: d ? `${d} days' notice` : "Cancel anytime", group: "Cancellation" })),
  ];
  const validOptions: PopupMenuOption<string>[] = VALID_FOR.map((d) => ({ value: String(d), label: daysLabel(d) }));
  const lengthOptions: PopupMenuOption<string>[] = LENGTHS.map((d) => ({ value: String(d), label: daysLabel(d) }));
  // Converts to (a suggestion only): another live Membership of this business, never itself.
  const targets = plans.filter((p) => p.kind === "membership" && p.dbStatus !== "archived" && p.id !== editing?.id);
  const convOptions: PopupMenuOption<string>[] = [
    { value: "__none", label: "Nothing", note: "The offer just ends" },
    ...targets.map((p) => ({ value: p.id, label: p.name, note: `${p.price} ${periodPhrase(p.billing)}` })),
  ];
  const convName = convertsTo ? (plans.find((p) => p.id === convertsTo)?.name ?? "Nothing") : "Nothing";
  // Payment: only Cash can be chosen until Whish is live; a stored Whish set is read and kept.
  const storedWhish = payments.includes("whish");
  const payOptions: PopupMenuOption<string>[] = [
    { value: "cash", label: "Cash", note: "Paid at the desk" },
    { value: "whish", label: "Whish Money", note: "Coming soon", disabled: true },
    { value: "both", label: "Cash or Whish Money", note: "Coming soon", disabled: true },
  ];
  const paySelected = payments.includes("cash") && payments.includes("whish") ? "both" : payments.includes("whish") ? "whish" : "cash";

  const [line1, line2] = previewLines({
    kind,
    price: shownPrice ?? "",
    billing: period,
    runsClasses,
    classes: usesClasses ? classes : null,
    limit: membership && runsClasses ? limit : null,
    sessions: pack ? Number(sessions) || null : null,
    validForDays: pack || intro ? validFor : null,
    commitMonths: membership ? commit : null,
    noticeDays: membership ? notice : null,
  });
  const PreviewIcon = PREVIEW_ICON[kind];

  const activeRow = (
    <Box>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div id={ids.active}>
          <div style={{ fontSize: textPx(14), fontWeight: 700 }}>Active</div>
          <div style={{ fontSize: textPx(11.5), color: m.faint }}>Members can buy this plan</div>
        </div>
        <SheetSwitch
          on={active}
          onChange={(v) => {
            edited();
            setActive(v);
          }}
          label="Active"
          describedBy={active ? ids.active : `${ids.active} ${ids.pausedNote}`}
          disabled={saving}
        />
      </div>
      {!active ? <BoxNote id={ids.pausedNote}>Paused plans are hidden from members.</BoxNote> : null}
    </Box>
  );

  const priceBorder = errors.price ? `1px solid ${m.high}` : priceChanged ? `1px solid ${m.fill}` : "1px solid transparent";

  const footer = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <style>{FOCUS_CSS}</style>
      {!online ? (
        <p role="status" style={{ margin: "0 0 4px", fontSize: textPx(11.5), fontWeight: 700, color: m.ink2, textAlign: "center" }}>
          You're offline. Plans can't be saved right now.
        </p>
      ) : null}
      {saveError ? <SaveError style={{ margin: "0 0 4px" }}>{saveError}</SaveError> : null}
      <PrimaryButton onClick={() => void submit()} disabled={!ready || !online} busy={saving}>
        {editing ? "Save" : "Add plan"}
      </PrimaryButton>
      {editing && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(editing)}
          disabled={saving || !online}
          className="tap market-focus"
          style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(14), fontWeight: 700, color: m.high, background: "transparent", border: 0, fontFamily: "inherit", cursor: "pointer", opacity: !online ? 0.4 : 1 }}
        >
          Delete plan
        </button>
      ) : null}
    </div>
  );

  return (
    <div ref={rootRef} tabIndex={-1} className="plan-sheet" style={{ display: "flex", flexDirection: "column", gap: 6, lineHeight: "normal", color: m.ink, outline: "none" }}>
      {/* 1 · Plan name */}
      <Box label="Plan name" labelId={`${ids.name}-l`} htmlFor={ids.name} border={errors.name ? `1px solid ${m.high}` : undefined}>
        <input
          id={ids.name}
          ref={nameRef}
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
            if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            edited();
          }}
          placeholder="e.g. Monthly"
          aria-invalid={!!errors.name || undefined}
          aria-describedby={errors.name ? ids.nameErr : undefined}
          maxLength={80}
          readOnly={saving}
          className="market-focus plan-field"
          style={fieldStyle(m)}
        />
        {errors.name ? <BoxError id={ids.nameErr}>{errors.name}</BoxError> : null}
      </Box>

      {/* 2 · edit: Active directly under Plan name */}
      {editing && editing.dbStatus !== "archived" ? activeRow : null}

      {/* 3 · Type */}
      <Box label="Type" labelId={ids.type}>
        <ChipRow labelledBy={ids.type} selected={kind}>
          {kinds.map((k) => (
            <Chip key={k} on={k === kind} label={KIND_LABEL[k]} onPick={() => pickKind(k)} />
          ))}
        </ChipRow>
        {editing && hasMembers && kind !== init.kind ? <BoxNote>Current members keep what they bought.</BoxNote> : null}
        {switched ? <BoxNote live>{switchNote(switched.from, switched.to)}</BoxNote> : null}
      </Box>

      {/* 4 · Price, the error and the edit note inside the box */}
      <Box label="Price" labelId={`${ids.price}-l`} htmlFor={ids.price} border={priceBorder}>
        <div className="plan-wrap" style={{ ...fieldStyle(m), display: "flex", gap: 6 }}>
          <span aria-hidden style={{ color: m.faint }}>
            $
          </span>
          <input
            id={ids.price}
            ref={priceRef}
            value={price}
            onChange={(ev) => {
              setPrice(ev.target.value);
              if (errors.price) setErrors((x) => ({ ...x, price: undefined }));
              edited();
            }}
            onBlur={() => {
              // Clearing a price shows the drawn error at once (editError), not only on Save.
              if (!price.trim() && (editing || errors.price !== undefined)) setErrors((x) => ({ ...x, price: priceProblem(price) ?? undefined }));
            }}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.price || undefined}
            aria-describedby={[errors.price ? ids.priceErr : null, editing ? ids.priceNote : null].filter(Boolean).join(" ") || undefined}
            readOnly={saving}
            className="plan-inner"
            style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", padding: 0, font: "inherit", color: m.ink }}
          />
        </div>
        {errors.price ? <BoxError id={ids.priceErr}>{errors.price}</BoxError> : null}
        {editing ? (
          <div id={ids.priceNote} style={{ margin: "8px 0 0", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>
            Price changes apply to new purchases. Current members keep their plan.
          </div>
        ) : null}
      </Box>

      {/* 5 · Billing */}
      <Box label="Billing" labelId={ids.billing}>
        <ChipRow labelledBy={ids.billing} selected={chip}>
          {BILLING_CHIPS.map((b) => (
            <Chip key={b.value} on={chip === b.value} label={b.label} disabled={b.value === "daily" && membership && !oneTime} onPick={() => pickBilling(b.value)} />
          ))}
        </ChipRow>
        {errors.billing ? <BoxError id={ids.billingErr}>{errors.billing}</BoxError> : null}
      </Box>

      {/* 6 · What's included */}
      <Box label="What's included" labelId={ids.inc}>
        <div role="group" aria-labelledby={ids.inc} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lines.map((l, i) => {
            const placeholderOnly = lines.length === 1 && !l;
            return (
              <div key={i} className="plan-wrap" style={{ display: "flex", alignItems: "center", gap: 8, background: m.card, borderRadius: 10, padding: "10px 13px", fontSize: textPx(14), lineHeight: linePx(19) }}>
                <input
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  value={l}
                  onChange={(ev) => setLine(i, ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      addLine();
                    }
                  }}
                  placeholder={i === 0 ? "e.g. Gym floor access" : undefined}
                  aria-label={`Included, line ${i + 1}`}
                  aria-invalid={!!errors.includes || undefined}
                  aria-describedby={errors.includes ? ids.incErr : undefined}
                  maxLength={120}
                  readOnly={saving}
                  className="plan-inner"
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", padding: 0, font: "inherit", color: m.ink }}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  aria-label={`Remove line ${i + 1}`}
                  tabIndex={placeholderOnly ? -1 : 0}
                  aria-hidden={placeholderOnly || undefined}
                  className="tap market-focus"
                  style={{ width: 14, height: 14, padding: 0, border: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", opacity: placeholderOnly ? 0 : 1, cursor: "pointer", flexShrink: 0, pointerEvents: placeholderOnly ? "none" : undefined }}
                >
                  <X size={14} strokeWidth={2.4} aria-hidden style={{ color: m.faint }} />
                </button>
              </div>
            );
          })}
        </div>
        {errors.includes ? <BoxError id={ids.incErr}>{errors.includes}</BoxError> : null}
        <button
          type="button"
          onClick={addLine}
          disabled={lines.length >= INCLUDES_MAX || saving}
          className="tap market-focus"
          style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, fontSize: textPx(13), fontWeight: 700, color: m.pdark, background: "transparent", border: 0, padding: 0, fontFamily: "inherit", cursor: "pointer", opacity: lines.length >= INCLUDES_MAX ? 0.4 : 1 }}
        >
          <Plus size={14} strokeWidth={2.4} aria-hidden />
          Add a line
        </button>
      </Box>

      {/* 7 · add: Active at the bottom */}
      {!editing ? activeRow : null}

      {/* KEPT (D-15): More options */}
      <Box>
        <button
          type="button"
          aria-expanded={more}
          aria-controls={ids.more}
          onClick={() => setMore((x) => !x)}
          className="tap market-focus"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "transparent", border: 0, padding: 0, textAlign: "start", fontFamily: "inherit", color: m.ink, cursor: "pointer" }}
        >
          <span>
            <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>More options</span>
            <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint }}>{moreSummary(kind, runsClasses)}</span>
          </span>
          <ChevronDown size={18} aria-hidden style={{ color: m.faint, flexShrink: 0, transform: more ? "rotate(180deg)" : "none", transition: reduce ? undefined : "transform 220ms cubic-bezier(0.22,1,0.36,1)" }} />
        </button>
      </Box>
      {more ? (
        <div id={ids.more} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pack ? (
            <Box label="Sessions" labelId={`${ids.sess}-l`} htmlFor={ids.sess} border={errors.sessions ? `1px solid ${m.high}` : undefined}>
              <input
                id={ids.sess}
                ref={sessRef}
                value={sessions}
                onChange={(ev) => {
                  setSessions(ev.target.value.replace(/[^\d]/g, "").slice(0, 3));
                  if (errors.sessions) setErrors((x) => ({ ...x, sessions: undefined }));
                  edited();
                }}
                inputMode="numeric"
                placeholder="10"
                aria-invalid={!!errors.sessions || undefined}
                aria-describedby={errors.sessions ? ids.sessErr : undefined}
                readOnly={saving}
                className="market-focus plan-field"
                style={fieldStyle(m)}
              />
              {errors.sessions ? <BoxError id={ids.sessErr}>{errors.sessions}</BoxError> : null}
            </Box>
          ) : null}
          {pack ? (
            <Box label="Valid for" labelId={ids.valid}>
              <Picker labelledBy={ids.valid} value={daysLabel(validFor) || "2 months"} open={menu?.key === "valid"} onOpen={openMenu("valid")} />
            </Box>
          ) : null}
          {intro ? (
            <Box label="Length" labelId={ids.length}>
              <Picker labelledBy={ids.length} value={daysLabel(validFor) || "7 days"} open={menu?.key === "length"} onOpen={openMenu("length")} />
            </Box>
          ) : null}
          {kind !== "intro_offer" ? (
            <Box label={classTitle} labelId={ids.classes}>
              {usesClasses ? (
                <Picker
                  labelledBy={ids.classes}
                  value={classesLabel(classes)}
                  open={menu?.key === "classes"}
                  invalid={!!errors.classes}
                  describedBy={errors.classes ? ids.classesErr : undefined}
                  onOpen={openMenu("classes")}
                />
              ) : (
                <Fixed labelledBy={ids.classes} value="Gym entry" />
              )}
              {errors.classes ? <BoxError id={ids.classesErr}>{errors.classes}</BoxError> : null}
            </Box>
          ) : null}
          {membership && runsClasses ? (
            <Box label="Limit" labelId={ids.lim}>
              <Picker labelledBy={ids.lim} value={limitLabel(limit, period)} open={menu?.key === "lim"} onOpen={openMenu("lim")} />
            </Box>
          ) : null}
          {membership ? (
            <Box label="Commitment" labelId={ids.com}>
              <Picker labelledBy={ids.com} value={commitmentLabel(commit, notice)} open={menu?.key === "com"} onOpen={openMenu("com")} />
            </Box>
          ) : null}
          {membership || intro ? (
            <Box label="Who can buy" labelId={ids.who}>
              <Fixed labelledBy={ids.who} value="Anyone" />
              <BoxNote>{membership ? "Student-only plans are coming soon." : "First-time-only offers are coming soon."}</BoxNote>
            </Box>
          ) : null}
          {intro ? (
            <Box label="Converts to" labelId={ids.conv}>
              <Picker labelledBy={ids.conv} value={convName} open={menu?.key === "conv"} onOpen={openMenu("conv")} />
              <BoxNote>When an offer ends, "Converts to" only suggests the next plan to the member; nothing is charged.</BoxNote>
            </Box>
          ) : null}
          <Box label="Payment type" labelId={ids.pay}>
            {storedWhish ? (
              <Picker labelledBy={ids.pay} value={paymentLabel(payments)} open={menu?.key === "pay"} onOpen={openMenu("pay")} />
            ) : (
              <Fixed labelledBy={ids.pay} value="Cash" />
            )}
            <BoxNote>
              {storedWhish ? (
                "Whish Money is coming soon. This plan keeps the methods it has; you can switch it to Cash."
              ) : (
                <>
                  Cash is the only payment method you accept, so it's set for you. Add more in{" "}
                  <Link to="/app/business/more/payment-methods" className="market-focus" style={{ fontWeight: 700, color: m.pdark }}>
                    Settings › Payments
                  </Link>
                  .
                </>
              )}
            </BoxNote>
          </Box>
          {name.trim() && shownPrice ? (
            <Box label="How clients see it on Explore">
              <div role="group" aria-label="Preview: how clients see it on Explore" style={{ display: "flex", alignItems: "center", gap: 12, background: m.card, borderRadius: 10, padding: "11px 13px" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PreviewIcon size={20} aria-hidden />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: textPx(14), fontWeight: 800, overflowWrap: "anywhere" }}>{name.trim()}</div>
                  <div style={{ fontSize: textPx(12), color: m.ink2 }}>{line1}</div>
                  {line2 ? <div style={{ fontSize: textPx(11), color: m.faint }}>{line2}</div> : null}
                  <div style={{ fontSize: textPx(11), color: m.faint }}>{payWith(paymentLabel(payments))}</div>
                </div>
                <span aria-hidden style={{ minHeight: 34, padding: "0 12px", borderRadius: 10, background: m.fill, color: m.onfill, fontSize: textPx(12), fontWeight: 800, display: "flex", alignItems: "center", flexShrink: 0 }}>
                  Buy
                </span>
              </div>
            </Box>
          ) : null}
        </div>
      ) : null}

      <style>{`.plan-field::placeholder,.plan-inner::placeholder{color:${m.faint};opacity:1}.plan-sheet .market-focus:focus-visible,.plan-sheet .plan-field:focus-visible{outline:2px solid #AEA1DC !important;outline-offset:2px}.plan-sheet .plan-wrap:focus-within{outline:2px solid #AEA1DC !important;outline-offset:2px}`}</style>
      {frame.footer && createPortal(footer, frame.footer)}

      <PopupMenu
        variant="field"
        open={menu?.key === "classes"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "classes" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading={`${classTitle} · ${chosen} of ${allTypes.length} class types`}
        options={classOptions}
        selected={classes ? classes.map((c) => `t:${c}`) : ["__all"]}
        multiSelect
        onSelect={(v) => {
          edited();
          if (errors.classes) setErrors((x) => ({ ...x, classes: undefined }));
          if (v === "__all") return setClasses(null);
          const c = v.slice(2);
          const next = classes?.includes(c) ? classes.filter((x) => x !== c) : [...(classes ?? []), c];
          setClasses(next.length ? next : null);
        }}
        onDone={() => undefined}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "lim"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "lim" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Limit"
        options={limitOptions}
        selected={limit ? ["upto", "per"] : ["unlimited"]}
        keepOpen
        onSelect={(v) => {
          edited();
          if (v === "unlimited") setLimit(null);
          else setLimit(limitN);
        }}
        onDone={() => undefined}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "com"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "com" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Commitment"
        options={comOptions}
        selected={[`min:${commit}`, `notice:${notice}`]}
        keepOpen
        onSelect={(v) => {
          edited();
          const [g, n] = v.split(":");
          if (g === "min") setCommit(Number(n));
          else setNotice(Number(n));
        }}
        onDone={() => undefined}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "valid"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "valid" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Valid for"
        options={validOptions}
        selected={validFor ? String(validFor) : null}
        onSelect={(v) => {
          edited();
          setValidFor(Number(v));
        }}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "length"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "length" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Length"
        options={lengthOptions}
        selected={validFor ? String(validFor) : null}
        onSelect={(v) => {
          edited();
          setValidFor(Number(v));
        }}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "conv"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "conv" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Converts to"
        options={convOptions}
        selected={convertsTo ?? "__none"}
        onSelect={(v) => {
          edited();
          setConvertsTo(v === "__none" ? null : v);
        }}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "pay"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "pay" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Payment type"
        options={payOptions}
        selected={paySelected}
        onSelect={(v) => {
          edited();
          if (v === "cash") setPayments(["cash"]);
        }}
      />
    </div>
  );
};

/** The "More options" sub line (OURS): what sits inside for this type. */
function moreSummary(kind: PlanKind, runsClasses: boolean): string {
  if (kind === "membership") return runsClasses ? "Classes, limit, commitment, payment, preview" : "Commitment, who can buy, payment, preview";
  if (kind === "class_pack") return "Sessions, valid for, classes, payment, preview";
  if (kind === "intro_offer") return "Length, converts to, payment, preview";
  return runsClasses ? "Classes, payment, preview" : "Covers, payment, preview";
}
