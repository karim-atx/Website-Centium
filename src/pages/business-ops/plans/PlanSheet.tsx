import React, { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { MenuStepper, PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { useOnline } from "../../../hooks/useOnline";
import { classTypesProblem, paymentLabel, type MembershipPlanRow, type PlanDraft, type PlanKind, type PlanPayment } from "../../../services/membership-plans";
import {
  BILLING_CHOICES,
  billingForKind,
  choiceLabel,
  choiceOfBilling,
  choicePhrase,
  classesLabel,
  classTypeOptions,
  COMMITMENTS,
  commitmentLabel,
  daysLabel,
  KIND_LABEL,
  LENGTHS,
  limitLabel,
  billingOfChoice,
  namePlaceholder,
  NOTICES,
  payWith,
  PREVIEW_ICON,
  previewLines,
  previewPrice,
  priceLabel,
  switchNote,
  VALID_FOR,
  type BillingChoice,
} from "./planModel";
import { BORDER, ICONS, SoonTag, useTones } from "./ui";
import type { WriteOutcome } from "./usePlans";

// v6 Batch 4 · the New Plan / Edit Plan sheet (OP1-041…047, 101…111,
// 157…178; OpsTabsV4 template 339-371, logic 553-605). BottomSheet
// tone="business" (outline #7248F8 / #9976F7), header 62, body 18 18 30,
// closes by the X only; the Add plan button is the pinned footer (D2).
//
// B7 MB-03: every field the source draws saves. Field sets per type (logic
// 585-589): Membership price + billing, includes + limit (when the business
// runs classes), commitment; Day pass price per day + covers; Class pack
// sessions + price, valid for + covers; Intro offer price + length, who can
// buy + converts to; Drop-in price per class + which classes; every type the
// payment type. Plan types follow the business type
// (plan_types_for_business_type, V6-47). Payment: Cash is the only method a
// business can choose until Whish is live (X-29); a stored Whish is read.

type MenuKey = "type" | "bill" | "classes" | "lim" | "com" | "valid" | "length" | "conv" | "pay";

/** Field shell (OP1-041 rows 6-8): label 12/700 inkSoft mb 6; box min-h 48 r14, input fill, 1px border, padding 0 14, gap 8, 14 / 20. */
const Field: React.FC<{
  label: string;
  labelId?: string;
  error?: string;
  errorId?: string;
  ring?: string | null;
  fixed?: boolean;
  dim?: boolean;
  children: React.ReactNode;
  wrapRef?: React.Ref<HTMLDivElement>;
  boxStyle?: React.CSSProperties;
}> = ({ label, labelId, error, errorId, ring, fixed, dim, children, wrapRef, boxStyle }) => (
  <div ref={wrapRef} className="min-w-0">
    <p id={labelId} className="text-[12px] font-bold text-charcoal-soft whitespace-nowrap [html.larger-text_&]:whitespace-normal" style={{ marginBottom: 6 }}>
      {label}
    </p>
    <div
      className={clsx(
        "flex items-center text-[14px] leading-[20px] box-border",
        fixed ? clsx("border border-dashed", BORDER) : !error && clsx("border", BORDER),
        fixed ? "bg-transparent" : "bg-cream-soft",
        dim && "opacity-60"
      )}
      style={{
        minHeight: 48,
        borderRadius: 14,
        padding: "0 14px",
        gap: 8,
        boxShadow: ring ?? undefined,
        // OP1-045 rows 1 / 3: 1.5px high (#C0392B / #F09A8E).
        ...(error && !fixed ? { border: "1.5px solid rgb(var(--c-status-high))" } : null),
        ...boxStyle,
      }}
    >
      {children}
    </div>
    {error && (
      <p id={errorId} className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 5 }}>
        {error}
      </p>
    )}
  </div>
);

/** Picker field: a button showing the value 14/700 with chevron-down 16 faint. */
const Picker: React.FC<{
  label: string;
  value: string;
  open: boolean;
  ring?: string | null;
  onOpen: (el: HTMLDivElement) => void;
  error?: string;
}> = ({ label, value, open, ring, onOpen, error }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useId();
  return (
    <Field label={label} labelId={id} ring={open ? "0 0 0 2px rgb(var(--c-primary))" : ring} wrapRef={ref} boxStyle={{ padding: 0 }} error={error} errorId={`${id}-e`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={id}
        aria-describedby={`${id}-v`}
        aria-invalid={!!error || undefined}
        onClick={() => ref.current && onOpen(ref.current)}
        className="tap flex-1 min-w-0 flex items-center text-left self-stretch"
        style={{ gap: 8, padding: "0 14px", minHeight: 46 }}
      >
        <span id={`${id}-v`} className="flex-1 min-w-0 truncate font-bold text-charcoal">
          {value}
        </span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-charcoal-faint" />
      </button>
    </Field>
  );
};

/** Fixed text field (OP1-170 row 1): dashed border, no fill, value 14/700, role text. */
const Fixed: React.FC<{ label: string; value: string; ring?: string | null; dim?: boolean }> = ({ label, value, ring, dim }) => (
  <Field label={label} fixed ring={ring} dim={dim}>
    <span role="text" className="flex-1 min-w-0 truncate font-bold text-charcoal">
      {value}
    </span>
  </Field>
);

const Row: React.FC<{ two?: boolean; children: React.ReactNode }> = ({ two, children }) => (
  <div className="grid" style={{ gridTemplateColumns: two ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 10, marginBottom: 14 }}>
    {children}
  </div>
);

const Note: React.FC<{ children: React.ReactNode; live?: boolean; className?: string }> = ({ children, live, className }) => (
  <p
    className={clsx("text-[12px] leading-[17px] text-charcoal-soft", className)}
    style={{ marginBottom: 14, textWrap: "pretty" } as React.CSSProperties}
    aria-live={live ? "polite" : undefined}
  >
    {children}
  </p>
);

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
  /** Active members of the plan being edited (edit notes), or null when unknown. */
  memberCount: number | null;
  save: (draft: PlanDraft) => Promise<WriteOutcome>;
  onSaved: (plan: MembershipPlanRow, isNew: boolean) => void;
}

export const PlanSheet: React.FC<PlanSheetProps> = (props) => {
  // A fresh form per opening: the sheet's state resets on every open.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((s) => s + 1);
  }
  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={props.editing ? "Edit Plan" : "New Plan"}
      tone="business"
      headerHeight={62}
      closeOnScrim={false}
      bodyPadding={{ top: 18, right: 18, bottom: 4, left: 18 }}
      footerPadX={18}
      footerBottom={30}
      footer={<div id="plan-sheet-footer" />}
    >
      <PlanForm key={session} {...props} />
    </BottomSheet>
  );
};

/** The class-based types (Class pack, Drop-in) are only offered to a business that runs classes (V6-47). */
const CLASS_BASED: PlanKind[] = ["class_pack", "drop_in"];
const ALL_KINDS: PlanKind[] = ["membership", "day_pass", "class_pack", "intro_offer", "drop_in"];
const DEFAULT_VALID: Partial<Record<PlanKind, number>> = { class_pack: 60, intro_offer: 7 };

const PlanForm: React.FC<PlanSheetProps> = ({ editing, runsClasses, classTypes, plans, offered, memberCount, save, onSaved, onClose }) => {
  const t = useTones();
  const online = useOnline();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const sessRef = useRef<HTMLInputElement | null>(null);
  const ids = { name: useId(), nameErr: useId(), price: useId(), priceErr: useId(), sess: useId(), sessErr: useId() };

  const e = editing;
  const init = {
    kind: (e?.kind ?? "membership") as PlanKind,
    name: e?.name ?? "",
    price: e ? String(e.priceValue) : "",
    period: (e ? choiceOfBilling(e.billing) : "monthly") as BillingChoice,
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
  const [period, setPeriod] = useState<BillingChoice>(init.period);
  const [classes, setClasses] = useState<string[] | null>(init.classes);
  const [limit, setLimit] = useState<number | null>(init.limit);
  const [limitN, setLimitN] = useState<number>(init.limit ?? 8);
  const [commit, setCommit] = useState<number>(init.commit);
  const [notice, setNotice] = useState<number>(init.notice);
  const [sessions, setSessions] = useState(init.sessions);
  const [validFor, setValidFor] = useState<number | null>(init.validFor);
  const [convertsTo, setConvertsTo] = useState<string | null>(init.convertsTo);
  const [payments, setPayments] = useState<PlanPayment[]>(init.payments);
  const [errors, setErrors] = useState<{ name?: string; price?: string; sessions?: string; classes?: string }>({});
  const [switched, setSwitched] = useState<{ from: PlanKind; to: PlanKind } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ key: MenuKey; anchor: HTMLElement; row: HTMLElement } | null>(null);
  // The pinned footer lives outside the form (BottomSheet's footer slot): the
  // button is portalled into it so it shares this form's state. The sheet body
  // (the form's parent) is what the field menus are kept inside.
  const [frame, setFrame] = useState<{ footer: HTMLElement | null; body: HTMLElement | null }>({ footer: null, body: null });
  const rootRef = (el: HTMLDivElement | null) => {
    if (el && !frame.body) setFrame({ footer: document.getElementById("plan-sheet-footer"), body: el.parentElement });
  };

  const membership = kind === "membership";
  const pack = kind === "class_pack";
  const intro = kind === "intro_offer";
  const usesClasses = (membership && runsClasses) || ((kind === "day_pass" || pack || kind === "drop_in") && runsClasses);

  /** What would be written, kind by kind (fields a type does not have are cleared). */
  const draftOf = (): PlanDraft => ({
    name: name.trim(),
    price: price.trim(),
    billing: billingForKind(kind, period, validFor),
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
  });
  const [initialDraft] = useState(() => JSON.stringify(draftOf()));
  const changed = !editing || JSON.stringify(draftOf()) !== initialDraft;
  const shownPrice = previewPrice(price);
  const filled = !!name.trim() && !!shownPrice;
  const hasMembers = (memberCount ?? 0) > 0;
  const keptRing = switched ? `0 0 0 2px ${t.teal}` : null;

  const edited = () => {
    // The kept-field rings and the switch note clear on the next edit (OP1-107 row 3).
    if (switched) setSwitched(null);
    if (saveError) setSaveError(null);
  };

  const openMenu = (key: MenuKey) => (el: HTMLDivElement) => {
    const row = el.parentElement as HTMLElement;
    setMenu({ key, anchor: el, row });
  };

  const pickKind = (k: PlanKind) => {
    if (k === kind) return;
    if (name.trim() || price.trim()) setSwitched({ from: kind, to: k });
    else setSwitched(null);
    setKind(k);
    // Every field but name, price and payment type resets to the new type's defaults (OP1-107).
    setPeriod("monthly");
    setClasses(null);
    setLimit(null);
    setCommit(0);
    setNotice(0);
    setSessions("");
    setValidFor(DEFAULT_VALID[k] ?? null);
    setConvertsTo(null);
    setErrors({});
  };

  const submit = async () => {
    if (saving) return;
    if (editing && !changed) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Give the plan a name.";
    if (!price.trim()) next.price = "Enter a price.";
    else if (!shownPrice) next.price = "Enter the price as a number, for example 45 or $45.";
    if (pack) {
      const n = Number(sessions);
      if (!sessions.trim() || !Number.isInteger(n) || n < 1 || n > 100) next.sessions = "Enter how many classes.";
    }
    const classProblem = usesClasses ? classTypesProblem(classes) : null;
    if (classProblem) next.classes = classProblem;
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.sessions) return sessRef.current?.focus();
    if (next.price) return priceRef.current?.focus();
    if (next.classes) return;
    if (!online) return;
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

  // ---- menus (PopupMenu variant "field", OP1-158 reference table)
  const soon = <SoonTag />;
  const typeOptions: PopupMenuOption<PlanKind>[] = ALL_KINDS.filter(
    (k) => k === kind || ((!offered || offered.includes(k)) && (runsClasses || !CLASS_BASED.includes(k)))
  ).map((k) => ({
    value: k,
    label: KIND_LABEL[k],
    note:
      k === "membership"
        ? "Billed on a repeating period"
        : k === "day_pass"
          ? runsClasses
            ? "One day of classes"
            : "One day at the gym"
          : k === "class_pack"
            ? "A set number of classes"
            : k === "intro_offer"
              ? "For first-time clients"
              : "Pay per class",
  }));
  const billOptions: PopupMenuOption<BillingChoice>[] = BILLING_CHOICES.map((b) => ({
    value: b.value,
    label: b.label,
    disabled: !b.live,
    trailing: b.live ? undefined : soon,
  }));
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
  const perLabel = membership ? `Per ${choicePhrase(period).replace(/^(a|every) /, "")}` : "Per period";
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
    { value: "per", label: perLabel, group: "Applies" },
  ];
  const comOptions: PopupMenuOption<string>[] = [
    ...COMMITMENTS.map((m) => ({ value: `min:${m}`, label: m ? `${m} months` : "None", group: "Minimum commitment" })),
    ...NOTICES.map((d) => ({ value: `notice:${d}`, label: d ? `${d} days' notice` : "Cancel anytime", group: "Cancellation" })),
  ];
  const validOptions: PopupMenuOption<string>[] = VALID_FOR.map((d) => ({ value: String(d), label: daysLabel(d) }));
  const lengthOptions: PopupMenuOption<string>[] = LENGTHS.map((d) => ({ value: String(d), label: daysLabel(d) }));
  // Converts to (V6-47: a suggestion only): another live Membership of this business, never itself.
  const targets = plans.filter((p) => p.kind === "membership" && p.dbStatus !== "archived" && p.id !== editing?.id);
  const convOptions: PopupMenuOption<string>[] = [
    { value: "__none", label: "Nothing", note: "The offer just ends" },
    ...targets.map((p) => ({ value: p.id, label: p.name, note: `${p.price} ${choicePhrase(choiceOfBilling(p.billing))}` })),
  ];
  const convName = convertsTo ? (plans.find((p) => p.id === convertsTo)?.name ?? "Nothing") : "Nothing";
  // Payment (X-29): only Cash can be chosen until Whish is live; a stored Whish set is read and kept.
  const storedWhish = payments.includes("whish");
  const payOptions: PopupMenuOption<string>[] = [
    { value: "cash", label: "Cash", note: "Paid at the desk" },
    { value: "whish", label: "Whish Money", note: "Paid in the app", disabled: true, trailing: soon },
    { value: "both", label: "Cash or Whish Money", note: "Members choose", disabled: true, trailing: soon },
  ];
  const paySelected = payments.includes("cash") && payments.includes("whish") ? "both" : payments.includes("whish") ? "whish" : "cash";

  const [line1, line2] = previewLines({
    kind,
    price: shownPrice ?? "",
    period,
    runsClasses,
    classes: usesClasses ? classes : null,
    limit: membership && runsClasses ? limit : null,
    sessions: pack ? Number(sessions) || null : null,
    validForDays: pack || intro ? validFor : null,
    commitMonths: membership ? commit : null,
    noticeDays: membership ? notice : null,
  });
  const PreviewIcon = ICONS[PREVIEW_ICON[kind]];

  const button = (
    <>
      {!online && (
        <p className="text-[11.5px] font-bold text-charcoal-soft" style={{ marginBottom: 8 }} role="status">
          You're offline. Plans can't be saved right now.
        </p>
      )}
      {saveError && (
        <p className="text-[11.5px] font-bold text-status-high" style={{ marginBottom: 8 }} role="alert">
          {saveError}
        </p>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!online || saving}
        aria-disabled={editing ? !changed : undefined}
        className="tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill text-[14.5px] font-extrabold disabled:cursor-not-allowed"
        style={{
          minHeight: 52,
          borderRadius: 16,
          gap: 8,
          opacity: saving ? 0.6 : !online ? 0.45 : editing ? (changed ? 1 : 0.45) : filled || Object.keys(errors).length ? 1 : 0.45,
        }}
      >
        {saving ? "Saving…" : editing ? "Save changes" : "Add plan"}
      </button>
    </>
  );

  const priceField = (
    <Field label={priceLabel(kind)} labelId={ids.price} error={errors.price} errorId={ids.priceErr} ring={keptRing}>
      <span aria-hidden className="font-extrabold text-charcoal-faint">
        $
      </span>
      <input
        ref={priceRef}
        value={price}
        onChange={(ev) => {
          setPrice(ev.target.value);
          if (errors.price) setErrors((x) => ({ ...x, price: undefined }));
          edited();
        }}
        inputMode="decimal"
        placeholder={errors.price ? "" : "45"}
        aria-labelledby={ids.price}
        aria-invalid={!!errors.price}
        aria-describedby={errors.price ? ids.priceErr : undefined}
        readOnly={saving}
        className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-charcoal placeholder:text-charcoal-faint placeholder:font-medium"
      />
    </Field>
  );
  const classesField = usesClasses ? (
    <Picker label={classTitle} value={classesLabel(classes)} open={menu?.key === "classes"} onOpen={openMenu("classes")} error={errors.classes} />
  ) : (
    <Fixed label={kind === "drop_in" ? "Which classes" : "Covers"} value={runsClasses ? "All classes" : "Gym entry"} />
  );

  return (
    <div ref={rootRef} className="animate-fade-slide-up">
      <Row>
        <Picker label="Plan type" value={KIND_LABEL[kind]} open={menu?.key === "type"} onOpen={openMenu("type")} />
      </Row>
      {editing && hasMembers && kind !== init.kind && <Note>Current members keep what they bought.</Note>}
      <Row>
        <Field label="Plan name" labelId={ids.name} error={errors.name} errorId={ids.nameErr} ring={keptRing}>
          <input
            ref={nameRef}
            value={name}
            onChange={(ev) => {
              setName(ev.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
              edited();
            }}
            placeholder={errors.name ? "" : namePlaceholder(kind)}
            aria-labelledby={ids.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? ids.nameErr : undefined}
            maxLength={80}
            readOnly={saving}
            className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-charcoal placeholder:text-charcoal-faint placeholder:font-medium"
          />
        </Field>
      </Row>

      {pack ? (
        <Row two>
          <Field label="Sessions" labelId={ids.sess} error={errors.sessions} errorId={ids.sessErr}>
            <input
              ref={sessRef}
              value={sessions}
              onChange={(ev) => {
                setSessions(ev.target.value.replace(/[^\d]/g, "").slice(0, 3));
                if (errors.sessions) setErrors((x) => ({ ...x, sessions: undefined }));
                edited();
              }}
              inputMode="numeric"
              placeholder={errors.sessions ? "" : "10"}
              aria-labelledby={ids.sess}
              aria-invalid={!!errors.sessions}
              aria-describedby={errors.sessions ? ids.sessErr : undefined}
              readOnly={saving}
              className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-charcoal placeholder:text-charcoal-faint placeholder:font-medium"
            />
          </Field>
          {priceField}
        </Row>
      ) : (
        <Row two>
          {priceField}
          {membership ? (
            <Picker label="Billing period" value={choiceLabel(period)} open={menu?.key === "bill"} onOpen={openMenu("bill")} />
          ) : intro ? (
            <Picker label="Length" value={daysLabel(validFor) || "7 days"} open={menu?.key === "length"} onOpen={openMenu("length")} />
          ) : (
            classesField
          )}
        </Row>
      )}
      {editing && hasMembers && price.trim() !== init.price && <Note>New price applies to new members. Current members keep their price.</Note>}

      {membership && runsClasses && (
        <Row two>
          {classesField}
          <Picker label="Limit" value={limitLabel(limit, billingOfChoice(period))} open={menu?.key === "lim"} onOpen={openMenu("lim")} />
        </Row>
      )}
      {membership && (
        <Row>
          <Picker label="Commitment" value={commitmentLabel(commit, notice)} open={menu?.key === "com"} onOpen={openMenu("com")} />
        </Row>
      )}
      {pack && (
        <Row two>
          <Picker label="Valid for" value={daysLabel(validFor) || "2 months"} open={menu?.key === "valid"} onOpen={openMenu("valid")} />
          {classesField}
        </Row>
      )}
      {intro && (
        <>
          <Row two>
            <Fixed label="Who can buy" value="Anyone" dim />
            <Picker label="Converts to" value={convName} open={menu?.key === "conv"} onOpen={openMenu("conv")} />
          </Row>
          <Note>First-time-only offers are coming soon. Converts to only suggests the plan when the offer ends; nothing is charged.</Note>
        </>
      )}
      {membership && (
        <>
          {/* V6-156: student-only plans are unspecified; the field is built disabled with a note. */}
          <div style={{ marginBottom: 6 }}>
            <Fixed label="Who can buy" value="Anyone" dim />
          </div>
          <Note>Student-only plans are coming soon.</Note>
        </>
      )}
      <Row>
        {storedWhish ? (
          <Picker label="Payment type" value={paymentLabel(payments)} open={menu?.key === "pay"} onOpen={openMenu("pay")} ring={keptRing} />
        ) : (
          <Fixed label="Payment type" value="Cash" ring={keptRing} />
        )}
      </Row>

      {filled && (
        <>
          <p className="text-[12px] font-bold text-charcoal-soft" style={{ margin: "4px 0 6px" }}>
            How clients see it on Explore
          </p>
          <div
            role="group"
            aria-label="Preview: how clients see it on Explore"
            className={clsx("flex items-center border", BORDER)}
            style={{ borderRadius: 18, padding: 14, gap: 12, marginBottom: 16 }}
          >
            <span className="shrink-0 flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 48, height: 48, borderRadius: 12 }}>
              <PreviewIcon size={22} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold text-charcoal break-words">{name.trim()}</p>
              <p className="text-[12px] text-charcoal-soft">{line1}</p>
              {line2 && <p className="text-[11px] text-charcoal-faint">{line2}</p>}
              <p className="text-[11px] text-charcoal-faint">{payWith(paymentLabel(payments))}</p>
            </div>
            <span aria-hidden className="shrink-0 flex items-center bg-primary-fill text-on-primary-fill text-[12px] font-extrabold" style={{ minHeight: 34, padding: "0 12px", borderRadius: 10 }}>
              Buy
            </span>
          </div>
        </>
      )}
      {switched && <Note live>{switchNote(switched.from, switched.to)}</Note>}
      {storedWhish ? (
        <Note>Whish Money is coming soon. This plan keeps the methods it has; you can switch it to Cash.</Note>
      ) : (
        <Note>
          Cash is the only payment method you accept, so it’s set for you. Add more in{" "}
          <Link to="/app/business/more/payment-methods" className="font-bold text-primary-dark underline-offset-2 hover:underline">
            Settings › Payments
          </Link>
          .
        </Note>
      )}

      {frame.footer && createPortal(button, frame.footer)}

      <PopupMenu
        variant="field"
        open={menu?.key === "type"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "type" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Plan type"
        options={typeOptions}
        selected={kind}
        onSelect={pickKind}
      />
      <PopupMenu
        variant="field"
        open={menu?.key === "bill"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "bill" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Billing period"
        options={billOptions}
        selected={period}
        onSelect={(v) => {
          setPeriod(v);
          edited();
        }}
      />
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
          // All classes and the class types exclude each other (OP1-161 row 3, OURS).
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
