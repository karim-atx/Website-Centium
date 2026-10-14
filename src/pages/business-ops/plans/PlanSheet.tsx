import React, { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { MenuStepper, PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { useOnline } from "../../../hooks/useOnline";
import type { MembershipPlanRow, PlanDraft, PlanKind } from "../../../services/membership-plans";
import {
  BILLING_CHOICES,
  billingOfChoice,
  choiceLabel,
  choiceOfBilling,
  KIND_LABEL,
  namePlaceholder,
  payWith,
  PREVIEW_ICON,
  previewLine1,
  previewPrice,
  priceLabel,
  switchNote,
  type BillingChoice,
} from "./planModel";
import { BORDER, ICONS, SoonTag, useTones } from "./ui";
import type { WriteOutcome } from "./usePlans";

// v6 Batch 4 · the New Plan / Edit Plan sheet (OP1-041…047, 101…111,
// 157…178; OpsTabsV4 template 339-371, logic 553-605). BottomSheet
// tone="business" (outline #7248F8 / #9976F7), header 62, body 18 18 30,
// closes by the X only; the Add plan button is the pinned footer (D2).
//
// What saves today: name, price, billing (daily for a Day pass; monthly or
// annually for a Membership) and payment type, the four columns the UPDATE
// grant covers. Everything else the sheet draws is B7 (plan types, billing
// every 3 / 6 months and weekly, includes, limit, commitment, who can buy):
// those menus open with today's value as the only choice and the rest marked
// "Soon". Payment type is the fixed Cash text (OP1-170): Cash is the only
// method a business accepts until Whish is live (X-29).

type MenuKey = "type" | "bill" | "inc" | "lim" | "com" | "cov";

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
  disabled?: boolean;
}> = ({ label, value, open, ring, onOpen, disabled }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useId();
  return (
    <Field label={label} labelId={id} ring={open ? "0 0 0 2px rgb(var(--c-primary))" : ring} wrapRef={ref} dim={disabled} boxStyle={{ padding: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={id}
        aria-describedby={`${id}-v`}
        disabled={disabled}
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

const Row: React.FC<{ two?: boolean; children: React.ReactNode; rowRef?: React.Ref<HTMLDivElement> }> = ({ two, children, rowRef }) => (
  <div ref={rowRef} className="grid" style={{ gridTemplateColumns: two ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 10, marginBottom: 14 }}>
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

const PlanForm: React.FC<PlanSheetProps> = ({ editing, runsClasses, classTypes, memberCount, save, onSaved, onClose }) => {
  const t = useTones();
  const online = useOnline();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const ids = { name: useId(), nameErr: useId(), price: useId(), priceErr: useId() };

  const initialKind: PlanKind = editing?.kind ?? "membership";
  const initialName = editing?.name ?? "";
  const initialPrice = editing ? String(editing.priceValue) : "";
  const initialPeriod: BillingChoice = editing ? choiceOfBilling(editing.billing) : "monthly";

  const [kind, setKind] = useState<PlanKind>(initialKind);
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState(initialPrice);
  const [period, setPeriod] = useState<BillingChoice>(initialPeriod);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
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

  const changed = !editing || kind !== initialKind || name.trim() !== initialName || price.trim() !== initialPrice || period !== initialPeriod;
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
    // Every field but name, price and payment type resets to the new type's defaults.
    setPeriod("monthly");
  };

  const submit = async () => {
    if (saving) return;
    if (editing && !changed) return;
    const next: { name?: string; price?: string } = {};
    if (!name.trim()) next.name = "Give the plan a name.";
    if (!price.trim()) next.price = "Enter a price.";
    else if (!shownPrice) next.price = "Enter the price as a number, for example 45 or $45.";
    setErrors(next);
    if (next.name) {
      nameRef.current?.focus();
      return;
    }
    if (next.price) {
      priceRef.current?.focus();
      return;
    }
    if (!online) return;
    setSaving(true);
    setSaveError(null);
    const r = await save({
      name: name.trim(),
      price: price.trim(),
      billing: kind === "day_pass" ? "daily" : billingOfChoice(period),
      paymentType: "Cash",
    });
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
  const allTypes = classTypes.length;
  const typeOptions: PopupMenuOption<PlanKind>[] = [
    { value: "membership", label: "Membership", note: "Billed on a repeating period" },
    { value: "day_pass", label: "Day pass", note: runsClasses ? "One day of classes" : "One day at the gym" },
    ...(runsClasses ? [{ value: "class_pack" as const, label: "Class pack", note: "A set number of classes", disabled: true, trailing: soon }] : []),
    { value: "intro_offer", label: "Intro offer", note: "For first-time clients", disabled: true, trailing: soon },
    ...(runsClasses ? [{ value: "drop_in" as const, label: "Drop-in", note: "Pay per class", disabled: true, trailing: soon }] : []),
  ];
  const billOptions: PopupMenuOption<BillingChoice>[] = BILLING_CHOICES.map((b) => ({
    value: b.value,
    label: b.label,
    disabled: !b.live,
    trailing: b.live ? undefined : soon,
  }));
  const classOptions: PopupMenuOption<string>[] = [
    { value: "__all", label: "All classes", note: "Every class type, now and future" },
    ...classTypes.map((c) => ({ value: `t:${c}`, label: c, disabled: true, trailing: soon })),
  ];
  const limitOptions: PopupMenuOption<string>[] = [
    { value: "unlimited", label: "Unlimited", note: "Book as many classes as they like" },
    {
      value: "upto",
      label: "Up to",
      note: "classes",
      disabled: true,
      trailing: <MenuStepper value={12} onChange={() => undefined} disabled label="Classes" />,
    },
    { value: "week", label: "Per week", group: "Applies", disabled: true, trailing: soon },
    { value: "month", label: "Per month", group: "Applies", disabled: true, trailing: soon },
  ];
  const comOptions: PopupMenuOption<string>[] = [
    { value: "min:none", label: "None", group: "Minimum commitment" },
    { value: "min:3", label: "3 months", group: "Minimum commitment", disabled: true, trailing: soon },
    { value: "min:6", label: "6 months", group: "Minimum commitment", disabled: true, trailing: soon },
    { value: "min:12", label: "12 months", group: "Minimum commitment", disabled: true, trailing: soon },
    { value: "notice:any", label: "Cancel anytime", group: "Cancellation" },
    { value: "notice:14", label: "14 days' notice", group: "Cancellation", disabled: true, trailing: soon },
    { value: "notice:30", label: "30 days' notice", group: "Cancellation", disabled: true, trailing: soon },
  ];

  const membership = kind === "membership";
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
          opacity: saving ? 0.6 : !online ? 0.45 : editing ? (changed ? 1 : 0.45) : filled || errors.name || errors.price ? 1 : 0.45,
        }}
      >
        {saving ? "Saving…" : editing ? "Save changes" : "Add plan"}
      </button>
    </>
  );

  return (
    <div ref={rootRef} className="animate-fade-slide-up">
      <Row>
        <Picker label="Plan type" value={KIND_LABEL[kind]} open={menu?.key === "type"} onOpen={openMenu("type")} />
      </Row>
      {editing && hasMembers && kind !== initialKind && <Note>Current members keep what they bought.</Note>}
      <Row>
        <Field label="Plan name" labelId={ids.name} error={errors.name} errorId={ids.nameErr} ring={keptRing}>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
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
      <Row two>
        <Field label={priceLabel(kind)} labelId={ids.price} error={errors.price} errorId={ids.priceErr} ring={keptRing}>
          <span aria-hidden className="font-extrabold text-charcoal-faint">
            $
          </span>
          <input
            ref={priceRef}
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
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
        {membership ? (
          <Picker label="Billing period" value={choiceLabel(period)} open={menu?.key === "bill"} onOpen={openMenu("bill")} />
        ) : runsClasses ? (
          <Picker label="Covers" value="All classes" open={menu?.key === "cov"} onOpen={openMenu("cov")} />
        ) : (
          <Field label="Covers" fixed>
            <span className="flex-1 min-w-0 truncate font-bold text-charcoal">Gym entry</span>
          </Field>
        )}
      </Row>
      {editing && hasMembers && price.trim() !== initialPrice && <Note>New price applies to new members. Current members keep their price.</Note>}
      {membership && runsClasses && (
        <Row two>
          <Picker label="Includes" value="All classes" open={menu?.key === "inc"} onOpen={openMenu("inc")} />
          <Picker label="Limit" value="Unlimited" open={menu?.key === "lim"} onOpen={openMenu("lim")} />
        </Row>
      )}
      {membership && (
        <Row>
          <Picker label="Commitment" value="None, cancel anytime" open={menu?.key === "com"} onOpen={openMenu("com")} />
        </Row>
      )}
      {membership && (
        <>
          {/* V6-156: student-only plans are unspecified; the field is built disabled with a note. */}
          <div style={{ marginBottom: 6 }}>
            <Field label="Who can buy" dim>
              <span className="flex-1 min-w-0 truncate font-bold text-charcoal">Anyone</span>
            </Field>
          </div>
          <Note>Student-only plans are coming soon.</Note>
        </>
      )}
      <Row>
        <Field label="Payment type" fixed ring={keptRing}>
          <span role="text" className="flex-1 min-w-0 truncate font-bold text-charcoal">
            Cash
          </span>
        </Field>
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
              <p className="text-[12px] text-charcoal-soft">{previewLine1(kind, shownPrice!, period, runsClasses)}</p>
              <p className="text-[11px] text-charcoal-faint">{payWith("Cash")}</p>
            </div>
            <span aria-hidden className="shrink-0 flex items-center bg-primary-fill text-on-primary-fill text-[12px] font-extrabold" style={{ minHeight: 34, padding: "0 12px", borderRadius: 10 }}>
              Buy
            </span>
          </div>
        </>
      )}
      {switched && <Note live>{switchNote(switched.from, switched.to)}</Note>}
      <Note>
        Cash is the only payment method you accept, so it’s set for you. Add more in{" "}
        <Link to="/app/business/more/payment-methods" className="font-bold text-primary-dark underline-offset-2 hover:underline">
          Settings › Payments
        </Link>
        .
      </Note>

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
      {(["inc", "cov"] as const).map((k) => (
        <PopupMenu
          key={k}
          variant="field"
          open={menu?.key === k}
          onClose={() => setMenu(null)}
          anchor={menu?.key === k ? menu.anchor : null}
          matchWidth={menu?.row}
          clampTo={frame.body}
          heading={`${k === "inc" ? "Includes" : "Covers"} · ${allTypes} of ${allTypes} class types`}
          options={classOptions}
          selected={["__all"]}
          multiSelect
          onSelect={() => undefined}
          onDone={() => undefined}
        />
      ))}
      <PopupMenu
        variant="field"
        open={menu?.key === "lim"}
        onClose={() => setMenu(null)}
        anchor={menu?.key === "lim" ? menu.anchor : null}
        matchWidth={menu?.row}
        clampTo={frame.body}
        heading="Limit"
        options={limitOptions}
        selected={["unlimited"]}
        keepOpen
        onSelect={() => undefined}
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
        selected={["min:none", "notice:any"]}
        keepOpen
        onSelect={() => undefined}
        onDone={() => undefined}
      />
    </div>
  );
};

