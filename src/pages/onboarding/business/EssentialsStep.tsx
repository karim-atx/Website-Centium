import React, { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Clock,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  ScanLine,
  Sparkles,
  Store,
  Tags,
  Ticket,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { BizFrame } from "./BizFrame";
import { BizChips, BizCollapsible, BizField, BizLink, BizNums, BizPlanCard, BizRows } from "./ui";
import { ObMenu, ObSectionLabel, ObTip } from "../shell";
import {
  AMENITIES,
  AMENITIES_MORE,
  areaOf,
  CANCEL_OPTIONS,
  categoryOptions,
  CLASS_TYPES,
  CLASS_TYPES_MORE,
  essentialsErrors,
  essentialsSummaries,
  fixCountLine,
  MAX_CATEGORIES,
  PLAN_INCLUDES,
  PLAN_TYPES,
  RETURNS_OPTIONS,
  visibleCategoryChips,
  type Essentials,
  type StarterPlan,
} from "./lanes";
import type { LaneStepProps } from "./laneTypes";

// OB-224…227 (Classes), 257…261 (Gym), 287…290 (Store) + OURS-essentials-
// additions: Step 3 · {Type} essentials. Collapsibles, one open at a time,
// the first open on arrival (the frames, BU1 §6.10).

const BOOK_AHEAD = [7, 14, 30]; // OURS options (14 drawn)
const CLOSES_BEFORE = [15, 30, 60]; // OURS options (30 drawn)

const PriceInput: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <span className="flex items-center gap-[2px] text-[12px] font-bold text-primary-dark">
    $
    <input
      aria-label={label}
      inputMode="decimal"
      value={value}
      placeholder="0"
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))}
      className="w-[56px] bg-transparent outline-none text-right tabular-nums placeholder:text-charcoal-faint"
    />
  </span>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder: string }> = ({ label, value, onChange, placeholder }) => (
  <input
    aria-label={label}
    value={value}
    placeholder={placeholder}
    maxLength={60}
    onChange={(e) => onChange(e.target.value)}
    className="w-[110px] bg-transparent outline-none text-right text-[12px] font-bold text-primary-dark placeholder:text-charcoal-faint"
  />
);

export const EssentialsStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save }) => {
  const lane = biz.lane ?? "gym";
  const e = biz.essentials;
  const wellness = biz.storeType === "wellness_service";
  const [open, setOpen] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [showErrors, setShowErrors] = useState(false);
  const [menu, setMenu] = useState<{ kind: "types" | "amenities" | "cats" | "ahead" | "closes"; anchor: HTMLElement } | null>(null);
  const [sheet, setSheet] = useState<StarterPlan | null>(null);
  const set = (patch: Partial<Essentials>) => setBiz((b) => ({ ...b, essentials: { ...b.essentials, ...patch } }));
  const toggleIn = (list: string[], v: string, max = 99) => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v]);
  const errors = essentialsErrors(lane, e, biz.categories);
  const sums = essentialsSummaries(lane, e, biz.categories, biz.location.address) as Record<string, string>;
  const flip = (i: number) => {
    setOpen((o) => (o === i ? -1 : i));
    setVisited((v) => new Set(v).add(i));
  };
  const tagFor = (i: number, ok: boolean, optional = false): "Required" | "Optional" | "Done" =>
    visited.has(i) && open !== i && ok ? "Done" : optional ? "Optional" : "Required";

  const sections: { icon: LucideIcon; title: string; summary: string; ok: boolean; optional?: boolean; error?: string; body: React.ReactNode }[] = [];

  if (lane === "classes") {
    const typeChips = visibleCategoryChips(CLASS_TYPES, CLASS_TYPES.length, e.classTypes);
    sections.push(
      {
        icon: CalendarDays,
        title: "Class types",
        summary: sums.a,
        ok: e.classTypes.length > 0,
        error: showErrors && e.classTypes.length === 0 ? "Pick at least one class type." : undefined,
        body: (
          <BizChips
            options={typeChips}
            selected={e.classTypes}
            onToggle={(v) => set({ classTypes: toggleIn(e.classTypes, v) })}
            onMore={(anchor) => setMenu({ kind: "types", anchor })}
            error={showErrors && e.classTypes.length === 0 ? "Pick at least one class type." : undefined}
          />
        ),
      },
      {
        icon: CalendarX,
        title: "Booking policies",
        summary: sums.b,
        ok: true,
        body: (
          <>
            <ObSectionLabel title="Cancellation window" margin="4px 2px 10px" />
            <BizRows
              radioGroup
              ariaLabel="Cancellation window"
              rows={CANCEL_OPTIONS.map((h) => ({
                key: String(h),
                title: `Free until ${h} hours before`,
                desc: e.cancelHours === h ? "After that the booking counts as used" : undefined,
                radio: { selected: e.cancelHours === h, onSelect: () => set({ cancelHours: h }) },
              }))}
            />
            <ObSectionLabel title="Booking window" margin="4px 2px 10px" />
            <BizRows
              rows={[
                { key: "ahead", title: "Clients can book up to", value: `${e.bookAheadDays} days ahead`, onClick: () => undefined },
                { key: "closes", title: "Booking closes", value: `${e.closesBeforeMin} min before`, onClick: () => undefined },
              ].map((r) => ({
                ...r,
                onClick: undefined,
                input: (
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-label={`${r.title}, ${r.value}`}
                    onClick={(ev) => setMenu({ kind: r.key as "ahead" | "closes", anchor: ev.currentTarget })}
                    className="tap text-[12px] font-bold text-primary-dark whitespace-nowrap"
                  >
                    {r.value}
                  </button>
                ),
                value: undefined,
              }))}
            />
          </>
        ),
      },
      {
        icon: Users,
        title: "Default class size",
        summary: sums.c,
        ok: true,
        body: (
          <>
            <BizNums
              items={[
                { key: "spots", value: e.spots, label: "Spots per class", min: 1, max: 200, onChange: (v) => set({ spots: v }) },
                { key: "wait", value: e.waitlist, label: "Waitlist size", min: 0, max: 50, onChange: (v) => set({ waitlist: v }) },
              ]}
            />
            <ObTip icon={Info} margin="-6px 0 14px">Most studios start with 12 to 16 spots.</ObTip>
          </>
        ),
      },
      {
        icon: Ticket,
        title: "Intro offer",
        summary: sums.d,
        ok: true,
        optional: true,
        body: (
          <>
            <BizRows rows={[{ key: "intro", title: "Offer an intro deal", toggle: { on: e.introOn, onChange: (v) => set({ introOn: v }) } }]} />
            {e.introOn && (
              <>
                <BizRows
                  radioGroup
                  ariaLabel="Intro offer"
                  rows={[
                    { key: "free", title: "First class free", radio: { selected: e.introKind === "first_free", onSelect: () => set({ introKind: "first_free" }) } },
                    { key: "pack", title: "Intro pack", radio: { selected: e.introKind === "pack", onSelect: () => set({ introKind: "pack" }) } },
                  ]}
                />
                {e.introKind === "pack" && (
                  <BizField label="Price" value={e.introPrice} onChange={(v) => set({ introPrice: v.replace(/[^0-9.]/g, "").slice(0, 8) })} inputMode="decimal" leading={<span className="text-[15px]">$</span>} placeholder="0" />
                )}
              </>
            )}
          </>
        ),
      }
    );
  }

  if (lane === "gym") {
    const amenityChips = visibleCategoryChips(AMENITIES, AMENITIES.length, e.amenities);
    const plan = e.starterPlan;
    sections.push(
      {
        icon: Sparkles,
        title: "Facilities and amenities",
        summary: sums.a,
        ok: e.amenities.length > 0,
        error: showErrors && e.amenities.length === 0 ? "Pick at least one facility." : undefined,
        body: (
          <BizChips
            options={amenityChips}
            selected={e.amenities}
            onToggle={(v) => set({ amenities: toggleIn(e.amenities, v) })}
            onMore={(anchor) => setMenu({ kind: "amenities", anchor })}
            error={showErrors && e.amenities.length === 0 ? "Pick at least one facility." : undefined}
          />
        ),
      },
      {
        icon: ScanLine,
        title: "Entry and check-in",
        summary: sums.b,
        ok: true,
        body: (
          <>
            <BizRows
              rows={[
                { key: "qr", title: "Check in with a QR code", desc: "Shown in the member's app", toggle: { on: e.qrCheckIn, onChange: (v) => set({ qrCheckIn: v }) } },
                { key: "desk", title: "Front desk can check people in", toggle: { on: e.frontDeskCheckIn, onChange: (v) => set({ frontDeskCheckIn: v }) } },
              ]}
            />
            <BizNums
              items={[
                { key: "age", value: e.minAge, label: "Minimum age", min: 16, max: 21, onChange: (v) => set({ minAge: v }) },
                { key: "guests", value: e.guestPasses, label: "Guest passes a month", min: 0, max: 10, onChange: (v) => set({ guestPasses: v }) },
              ]}
            />
          </>
        ),
      },
      {
        icon: BadgeCheck,
        title: "Starter membership plan",
        summary: sums.c,
        ok: !!plan || e.planSkipped,
        optional: true,
        body: (
          <>
            {plan ? (
              <BizPlanCard
                icon={BadgeCheck}
                title={plan.name || "Monthly unlimited"}
                sub={plan.includes.length ? plan.includes.join(", ").replace(/, ([^,]*)$/, " and $1") : "Nothing added yet"}
                price={plan.price ? `$${plan.price}` : "$0"}
                note={plan.type === "Monthly" ? "Billed monthly" : plan.type === "Annual" ? "Billed yearly" : "Paid once"}
                action={{ label: "Edit plan", onClick: () => setSheet(plan) }}
              />
            ) : (
              <BizLink icon={Plus} text="Add a starter plan" onClick={() => setSheet({ type: "Monthly", name: "", price: "", includes: [] })} className="mt-[2px] mx-[2px] mb-3" />
            )}
            <BizLink
              icon={Clock}
              text="Skip for now, add plans after approval"
              onClick={() => {
                set({ planSkipped: true, starterPlan: null });
                setOpen(3);
              }}
              className="mt-[2px] mx-[2px] mb-4"
            />
          </>
        ),
      },
      {
        icon: Ticket,
        title: "Day pass",
        summary: sums.d,
        ok: true,
        optional: true,
        body: (
          <>
            <BizRows rows={[{ key: "day", title: "Sell day passes", toggle: { on: e.dayPassOn, onChange: (v) => set({ dayPassOn: v }) } }]} />
            {e.dayPassOn && (
              <BizField label="Price" value={e.dayPassPrice} onChange={(v) => set({ dayPassPrice: v.replace(/[^0-9.]/g, "").slice(0, 8) })} inputMode="decimal" leading={<span className="text-[15px]">$</span>} placeholder="0" />
            )}
          </>
        ),
      }
    );
  }

  if (lane === "store") {
    const cats = categoryOptions(lane, biz.storeType);
    const catChips = visibleCategoryChips(cats.all, cats.all.length, biz.categories);
    const offerError = !e.sellsProducts && !e.offersAppointments ? "Turn on Sells products or Offers appointments." : e.sellsProducts && !e.pickup && !e.delivery ? "Turn on pickup or delivery." : undefined;
    sections.push(
      {
        icon: Store,
        title: "What you offer",
        summary: sums.o,
        ok: !offerError,
        error: offerError,
        body: (
          <>
            <BizRows
              className="mb-2"
              rows={[
                { key: "sells", title: "Sells products", toggle: { on: e.sellsProducts, onChange: (v) => set({ sellsProducts: v }) } },
                { key: "appts", title: "Offers appointments", toggle: { on: e.offersAppointments, onChange: (v) => set({ offersAppointments: v }) } },
                { key: "delivery", title: "Delivery", desc: areaOf(biz.location.address) ? `${areaOf(biz.location.address)} only` : undefined, toggle: { on: e.delivery, onChange: (v) => set({ delivery: v }) } },
                { key: "pickup", title: "Pickup", desc: biz.location.address || undefined, toggle: { on: e.pickup, onChange: (v) => set({ pickup: v }) } },
              ]}
            />
            {offerError && (
              <p role="alert" className="text-[11.5px] font-semibold text-status-high mb-4 mx-1">
                {offerError}
              </p>
            )}
            {!offerError && <div className="mb-2" />}
          </>
        ),
      },
      {
        icon: Tags,
        title: "What you sell",
        summary: sums.a,
        ok: biz.categories.length > 0,
        error: showErrors && biz.categories.length === 0 ? "Pick at least one thing you sell." : undefined,
        body: (
          <BizChips
            options={catChips}
            selected={biz.categories}
            onToggle={(v) => setBiz((b) => ({ ...b, categories: toggleIn(b.categories, v, MAX_CATEGORIES) }))}
            onMore={(anchor) => setMenu({ kind: "cats", anchor })}
            max={MAX_CATEGORIES}
            error={showErrors && biz.categories.length === 0 ? "Pick at least one thing you sell." : undefined}
          />
        ),
      },
      wellness
        ? {
            icon: CalendarClock,
            title: "Appointments",
            summary: sums.d,
            ok: true,
            body: (
              <>
                <BizRows rows={[{ key: "offer", title: "Offer appointments", toggle: { on: e.offersAppointments, onChange: (v) => set({ offersAppointments: v }) } }]} />
                {e.offersAppointments && (
                  <BizNums items={[{ key: "len", value: e.sessionLength, label: "Session length, min", min: 15, max: 120, step: 15, onChange: (v) => set({ sessionLength: v }) }]} />
                )}
              </>
            ),
          }
        : {
            icon: Truck,
            title: "Delivery and pickup",
            summary: sums.b,
            ok: true,
            body: e.delivery ? (
              <BizRows
                rows={[
                  { key: "fee", title: "Delivery fee", input: <PriceInput label="Delivery fee" value={e.deliveryFee} onChange={(v) => set({ deliveryFee: v })} /> },
                  { key: "free", title: "Free delivery over", input: <PriceInput label="Free delivery over" value={e.freeOver} onChange={(v) => set({ freeOver: v })} /> },
                  { key: "time", title: "Delivery time", input: <TextInput label="Delivery time" value={e.deliveryTime} onChange={(v) => set({ deliveryTime: v })} placeholder="1 to 2 days" /> },
                ]}
              />
            ) : (
              <p className="text-[12px] leading-[17px] text-charcoal-soft mb-4 mx-1">Turn on Delivery above to set a fee and delivery time.</p>
            ),
          },
      {
        icon: RotateCcw,
        title: "Returns and exchanges",
        summary: sums.c,
        ok: true,
        body: (
          <>
            <BizRows
              radioGroup
              ariaLabel="Returns"
              rows={RETURNS_OPTIONS.map((o) => ({ key: o.key, title: o.title, desc: o.desc, radio: { selected: e.returnsRule === o.key, onSelect: () => set({ returnsRule: o.key }) } }))}
            />
            {e.returnsRule !== "no_returns" && (
              <BizRows rows={[{ key: "ex", title: "Allow exchanges", desc: "Within 30 days", toggle: { on: e.allowExchanges, onChange: (v) => set({ allowExchanges: v }) } }]} />
            )}
          </>
        ),
      }
    );
  }

  const menuOptions =
    menu?.kind === "types"
      ? [...CLASS_TYPES, ...CLASS_TYPES_MORE]
      : menu?.kind === "amenities"
      ? [...AMENITIES, ...AMENITIES_MORE]
      : menu?.kind === "cats"
      ? categoryOptions(lane, biz.storeType).all
      : menu?.kind === "ahead"
      ? BOOK_AHEAD.map((d) => `${d} days ahead`)
      : CLOSES_BEFORE.map((m) => `${m} min before`);
  const menuSelected =
    menu?.kind === "types"
      ? e.classTypes
      : menu?.kind === "amenities"
      ? e.amenities
      : menu?.kind === "cats"
      ? biz.categories
      : menu?.kind === "ahead"
      ? `${e.bookAheadDays} days ahead`
      : `${e.closesBeforeMin} min before`;

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title={lane === "gym" ? "Gym essentials" : lane === "classes" ? "Class essentials" : "Store essentials"}
      subtitle={
        lane === "classes"
          ? "Set your defaults once. You can change them on any class later."
          : lane === "gym"
          ? "What members get and how they come in. Plans can grow later."
          : "What you sell and how it reaches people."
      }
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? "Try again" : "Continue",
        onClick: () => {
          if (errors.length) {
            setShowErrors(true);
            const first = sections.findIndex((s) => !s.ok && !s.optional);
            if (first >= 0) setOpen(first);
            return;
          }
          onContinue();
        },
        disabled: showErrors && errors.length > 0,
        busy: save.busy,
        error: showErrors && errors.length ? fixCountLine(errors.length) : save.error ?? undefined,
        errorTone: save.offline ? "info" : "error",
      }}
      overlay={
        <>
          {menu && (menu.kind === "types" || menu.kind === "amenities" || menu.kind === "cats") && (
            <ObMenu
              title={menu.kind === "types" ? "Class types" : menu.kind === "amenities" ? "Facilities and amenities" : "What you sell"}
              anchor={menu.anchor}
              align="left"
              options={menuOptions.map((o) => ({
                key: o,
                label: o,
                on: (menuSelected as string[]).includes(o),
                disabled: menu.kind === "cats" && !biz.categories.includes(o) && biz.categories.length >= MAX_CATEGORIES,
              }))}
              onToggle={(v) => {
                if (menu.kind === "types") set({ classTypes: toggleIn(e.classTypes, v) });
                else if (menu.kind === "amenities") set({ amenities: toggleIn(e.amenities, v) });
                else setBiz((b) => ({ ...b, categories: toggleIn(b.categories, v, MAX_CATEGORIES) }));
              }}
              onClose={() => setMenu(null)}
            />
          )}
          <PopupMenu
            open={menu?.kind === "ahead" || menu?.kind === "closes"}
            onClose={() => setMenu(null)}
            anchor={menu?.anchor ?? null}
            heading={menu?.kind === "ahead" ? "Clients can book up to" : "Booking closes"}
            width={180}
            align="right"
            options={menuOptions.map((o) => ({ value: o, label: o }))}
            selected={typeof menuSelected === "string" ? menuSelected : null}
            onSelect={(v) => {
              if (menu?.kind === "ahead") set({ bookAheadDays: parseInt(v, 10) });
              else if (menu?.kind === "closes") set({ closesBeforeMin: parseInt(v, 10) });
              setMenu(null);
            }}
          />
          <StarterPlanSheet
            plan={sheet}
            onClose={() => setSheet(null)}
            onSave={(p) => {
              set({ starterPlan: p, planSkipped: false });
              setSheet(null);
            }}
          />
        </>
      }
    >
      {sections.map((s, i) => (
        <BizCollapsible
          key={s.title}
          icon={s.icon}
          title={s.title}
          summary={s.summary}
          tag={tagFor(i, s.ok, s.optional)}
          open={open === i}
          onToggle={() => flip(i)}
        >
          {s.body}
        </BizCollapsible>
      ))}
      <ObTip icon={Info} margin="6px 0 0">Tap a section to change it. Everything here can be edited after you&apos;re live.</ObTip>
    </BizFrame>
  );
};

/** OB-261: the Starter plan sheet (plan type, name, price, includes). */
const StarterPlanSheet: React.FC<{ plan: StarterPlan | null; onClose: () => void; onSave: (p: StarterPlan) => void }> = ({ plan, onClose, onSave }) => {
  const [draft, setDraft] = useState<StarterPlan | null>(plan);
  const [prev, setPrev] = useState(plan);
  if (plan !== prev) {
    setPrev(plan);
    setDraft(plan);
  }
  const p = draft ?? { type: "Monthly" as const, name: "", price: "", includes: [] };
  const priceLabel = p.type === "Monthly" ? "Price a month" : p.type === "Annual" ? "Price a year" : "Price";
  const chip = (t: string, on: boolean, onClick: () => void) => (
    <button
      key={t}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        "tap min-h-[36px] py-2 px-3 rounded-[12px] border border-solid flex items-center text-[12.5px] font-semibold leading-4 whitespace-nowrap box-border",
        on ? "bg-primary-fill border-primary-fill text-on-primary-fill" : "bg-cream-card border-hair-11 text-charcoal-soft"
      )}
    >
      {t}
    </button>
  );
  const field = (label: string, value: string, onChange: (v: string) => void, inputMode?: "decimal") => (
    <label className="block mb-3">
      <span className="block text-[12px] font-bold text-charcoal-soft mb-[6px]">{label}</span>
      <span className="h-[46px] rounded-[14px] bg-cream-soft border-[1.5px] border-hair-11 flex items-center gap-2 px-3 box-border text-[13.5px] font-bold focus-within:border-brand-c">
        {inputMode && <span>$</span>}
        <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 bg-transparent outline-none text-charcoal" />
        <Pencil size={16} strokeWidth={2.2} className="text-charcoal-faint shrink-0" aria-hidden />
      </span>
    </label>
  );
  return (
    <BottomSheet
      open={!!plan}
      onClose={onClose}
      title="Starter plan"
      bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
      footer={
        <button
          type="button"
          onClick={() => onSave({ ...p, name: p.name.trim() || (p.type === "Monthly" ? "Monthly unlimited" : p.type) })}
          className="w-full h-[52px] rounded-[16px] bg-primary-fill text-on-primary-fill flex items-center justify-center text-[14px] font-bold"
        >
          Save plan
        </button>
      }
    >
      <div className="mb-3">
        <p className="text-[12px] font-bold text-charcoal-soft mb-[6px]">Plan type</p>
        <div className="flex flex-wrap gap-2">{PLAN_TYPES.map((t) => chip(t, p.type === t, () => setDraft({ ...p, type: t })))}</div>
        {p.type === "Visit pack" && (
          <p className="text-[11.5px] leading-[15px] text-charcoal-faint mt-[6px]">Visit packs go on sale once plan types open. Your answer is kept.</p>
        )}
      </div>
      {field("Plan name", p.name, (v) => setDraft({ ...p, name: v.slice(0, 80) }))}
      {field(priceLabel, p.price, (v) => setDraft({ ...p, price: v.replace(/[^0-9.]/g, "").slice(0, 8) }), "decimal")}
      <div className="mb-3">
        <p className="text-[12px] font-bold text-charcoal-soft mb-[6px]">Includes</p>
        <div className="flex flex-wrap gap-2">
          {PLAN_INCLUDES.map((t) => chip(t, p.includes.includes(t), () => setDraft({ ...p, includes: p.includes.includes(t) ? p.includes.filter((x) => x !== t) : [...p.includes, t] })))}
        </div>
      </div>
    </BottomSheet>
  );
};
