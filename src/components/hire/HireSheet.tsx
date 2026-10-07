import { useEffect, useState } from "react";
import { Banknote, Check, Handshake, Lock, MessageCircle, Wallet } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { MemberTag } from "../marketplace/MemberTag";
import { initials, type TypeColours } from "../professionals/typeColour";
import { HireConfirmedMark } from "./HireConfirmedMark";
import { useApp } from "../../context/AppContext";
import { forumAccess } from "../../services/forum/rules";
import { textPx } from "../../theme/textSize";
import {
  describeHireError,
  fetchMyHires,
  fetchPlansFor,
  hireProfessional,
  hireStatusLabel,
  planPriceLabel,
  priceExact,
  priceShort,
  type HirePaymentMethod,
  type MyHire,
  type Plan,
} from "../../services/hires";

// A3-client: MO1.2.1.5 (hire sheet) → MO1.2.1.5.1 (checkout) → MO1.2.1.5.2
// (confirmed), one Lavender-header sheet whose content changes step, as the
// three frames draw the same sheet over the same profile.
//
//   plans      professional_plans_for(id): name 15/700 type deep, price 14/700
//              #241F1B, bullets in the type main, Choose 40 / r12 on the type
//              CTA fill; "Already hired" for is_hired. Empty, minor and ATXA0
//              ("not taking new clients right now", a normal answer) are
//              Foundations › Empty state blocks.
//   checkout   professional row, plan line, included lines, Payment method
//              (Whish Money drawn but not choosable, exactly as stage 5's gym
//              checkout; Cash chosen), Order total, "Pay $400" (Lock) →
//              hire_professional(plan, 'cash').
//   confirmed  my_hires() row: v7 mark, "You've hired {first}", "{plan} ·
//              {price}", Pending payment while payment_status = pending.
//
// REMOVED FROM THE FRAMES BY DECISION: the App Store / Google Play payment row
// (decision 8 / C-10 / decision 23), the "Hired" sheet title (C-08 / D26), the
// v8 snake-crawl animation (do not build).
//
// NOT BUILT, AND WHY: the "Popular" tag and "save 8%" (professional_plans has
// no popular flag and no comparison price); the copy line "By paying you
// agree to the terms. Cancel within 24 hours for a full refund." (Centium
// makes no refunds and cancellation is free until the professional confirms
// receipt, per the contract) is replaced with a line that says exactly that.

export interface HirePro {
  id: string;
  name: string;
  first: string;
  /** "Personal Trainer", as the profile's role line. */
  role: string;
  avatarUrl: string | null;
}

type Step = "plans" | "checkout" | "confirmed";

/** MO1.2.1.5 › Empty state (Foundations): 56 tile, 26 icon, 15/700, 12.5/500 muted, max 260. */
function StateBlock({ t, icon, title, line, children }: { t: TypeColours; icon: React.ReactNode; title: string; line: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 px-6 py-8" role="status">
      <span className="w-14 h-14 rounded-[18px] flex items-center justify-center" style={{ background: t.pill, color: t.main }} aria-hidden>
        {icon}
      </span>
      <p className="m-0 text-[15px] font-bold text-charcoal">{title}</p>
      <p className="m-0 text-[12.5px] font-medium text-charcoal-faint leading-[1.55] max-w-[260px]">{line}</p>
      {children}
    </div>
  );
}

/** A bullet list: 12.5–13/400 #5B5349 lines, 5 apart, with the type-main dot (5 pt, measured). */
function Bullets({ items, t, size }: { items: string[]; t: TypeColours; size: number }) {
  if (items.length === 0) return null;
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-[5px]">
      {items.map((f, i) => (
        <li key={i} className="flex items-start gap-2 text-charcoal-soft leading-[18px]" style={{ fontSize: textPx(size) }}>
          <span aria-hidden className="mt-[6.5px] w-[5px] h-[5px] rounded-full shrink-0" style={{ background: t.main }} />
          <span className="min-w-0 break-words">{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function HireSheet({
  open,
  onClose,
  pro,
  t,
  initialPlanId,
  onHired,
  onMessage,
  messageBusy,
  request,
}: {
  open: boolean;
  onClose: () => void;
  pro: HirePro;
  t: TypeColours;
  /** The ?hire=<planId> deep link (a chat plans card's Hire): open that plan's checkout. */
  initialPlanId?: string | null;
  /** my_hires() after a hire, so the profile can show its status. */
  onHired: (hires: MyHire[] | null) => void;
  onMessage: () => void;
  messageBusy?: boolean;
  /**
   * The free request to connect (pending_client_requests), kept for a
   * professional with no plans: before A3 it was the only way to ask to work
   * with someone, and it stays reachable where there is nothing to hire.
   */
  request?: {
    state: "none" | "pending" | "cooling_down";
    busy: boolean;
    error: string | null;
    onSend: () => void;
  };
}) {
  const { user } = useApp();
  const minor = forumAccess(user.dateOfBirth) === "minor";

  const [step, setStep] = useState<Step>("plans");
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const method: HirePaymentMethod = "cash";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A note over the plan list (a deep-linked plan that is no longer offered, ATX98). */
  const [note, setNote] = useState<string | null>(null);
  /** ATXA0: a normal answer, rendered as its own state, not as an error. */
  // Stamped with the professional it was said about, so it lasts while this
  // profile is open (reopening the sheet shows it again) and never carries over.
  const [notTakingFor, setNotTakingFor] = useState<string | null>(null);
  const notTaking = notTakingFor === pro.id;
  const [hired, setHired] = useState<MyHire | null>(null);
  const [settled, setSettled] = useState(false);
  const [deepLinkUsed, setDeepLinkUsed] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    const r = await fetchPlansFor(pro.id);
    if (!r.ok) {
      setLoadError(r.message);
      setPlans([]);
      return null;
    }
    setPlans(r.plans);
    return r.plans;
  };

  // Every open starts at the plan list with fresh rows (is_hired can change).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setStep("plans");
      setPlans(null);
      setPlan(null);
      setError(null);
      setNote(null);
      setHired(null);
      setSettled(false);
      const loaded = await load();
      if (cancelled || !loaded) return;
      // The deep link, once per plan id: straight to that plan's checkout
      // while it is still offered; otherwise the sheet, with a note.
      if (initialPlanId && deepLinkUsed !== initialPlanId) {
        setDeepLinkUsed(initialPlanId);
        const found = loaded.find((p) => p.id === initialPlanId);
        if (found && !found.isHired) {
          setPlan(found);
          setStep("checkout");
        } else if (found?.isHired) {
          setNote(`You already have ${found.name} with ${pro.first}.`);
        } else {
          setNote(`That plan isn't on offer any more. Choose from ${pro.first}'s current plans.`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload per open and per professional only
  }, [open, pro.id, initialPlanId]);

  const choose = (p: Plan) => {
    setPlan(p);
    setError(null);
    setStep("checkout");
  };

  const pay = async () => {
    if (!plan || busy) return;
    setBusy(true);
    setError(null);
    const r = await hireProfessional(plan.id, method);
    if (!r.ok) {
      setBusy(false);
      if (r.code === "ATXA0") {
        setNotTakingFor(pro.id);
        setStep("plans");
        return;
      }
      if (r.code === "ATX98") {
        // Gone since the sheet loaded: back to the current list, with a note.
        setNote(describeHireError("ATX98"));
        setPlan(null);
        setStep("plans");
        await load();
        return;
      }
      setError(r.message);
      return;
    }
    const mine = await fetchMyHires();
    const row = mine.ok ? mine.hires.find((h) => h.id === r.hireId) ?? null : null;
    setHired(
      row ?? {
        // my_hires() failed to load: what was just created, as the contract
        // defines it (pending, cash, price copied from the plan).
        id: r.hireId,
        professionalId: pro.id,
        professionalFirstName: pro.first,
        planName: plan.name,
        status: "pending",
        paymentMethod: method,
        paymentStatus: "pending",
        priceAgreed: plan.price,
        startedOn: new Date().toISOString().slice(0, 10),
        expiresOn: null,
        confirmedAt: null,
        cancelledAt: null,
      }
    );
    onHired(mine.ok ? mine.hires : null);
    setBusy(false);
    setStep("confirmed");
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  // ---- the three steps -------------------------------------------------------

  const plansBody = () => {
    if (minor) {
      return <StateBlock t={t} icon={<Handshake size={26} strokeWidth={1.5} />} title="Not available under 18" line={describeHireError("ATXA2")} />;
    }
    if (notTaking) {
      // ATXA0, as the contract writes it, with no reason.
      return (
        <StateBlock t={t} icon={<Handshake size={26} strokeWidth={1.5} />} title="Not taking new clients" line={describeHireError("ATXA0")}>
          <button
            type="button"
            onClick={onMessage}
            disabled={messageBusy}
            className="tap mt-2 h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold disabled:opacity-60"
            style={{ background: t.pill, color: t.deep }}
          >
            <MessageCircle size={14} aria-hidden /> Message {pro.first}
          </button>
        </StateBlock>
      );
    }
    if (plans === null) {
      // States › Loading: skeleton blocks at the card positions (surface.soft).
      return (
        <div aria-busy="true" className="flex flex-col gap-2.5">
          <span className="sr-only">Loading…</span>
          <span aria-hidden className="h-[18px] w-48 rounded-md bg-cream-soft mb-1" />
          <span aria-hidden className="h-[194px] rounded-[18px] bg-cream-soft" />
          <span aria-hidden className="h-[194px] rounded-[18px] bg-cream-soft" />
        </div>
      );
    }
    if (loadError) {
      return (
        <p role="alert" className="m-0 px-1 text-[12.5px] font-medium text-status-high">
          {loadError}
        </p>
      );
    }
    if (plans.length === 0) {
      return (
        <StateBlock
          t={t}
          icon={<Handshake size={26} strokeWidth={1.5} />}
          title="No plans yet"
          line={
            request
              ? `${pro.first} hasn't set up any plans to hire. Send a request to work together, or message them.`
              : `${pro.first} hasn't set up any plans to hire. Message them to ask about working together.`
          }
        >
          {request && (
            <button
              type="button"
              onClick={request.onSend}
              disabled={request.busy || request.state !== "none"}
              className="tap mt-2 h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold disabled:opacity-60"
              style={{ background: t.cta, color: t.onMain }}
            >
              {request.state === "pending"
                ? "Request sent"
                : request.state === "cooling_down"
                ? "Not taking requests right now"
                : request.busy
                ? "Sending…"
                : "Send a request"}
            </button>
          )}
          {request?.error && (
            <p role="alert" className="m-0 mt-1 text-[12px] text-status-high">
              {request.error}
            </p>
          )}
          <button
            type="button"
            onClick={onMessage}
            disabled={messageBusy}
            className="tap mt-2 h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold disabled:opacity-60"
            style={{ background: t.pill, color: t.deep }}
          >
            <MessageCircle size={14} aria-hidden /> Message {pro.first}
          </button>
        </StateBlock>
      );
    }
    return (
      <div className="flex flex-col">
        {/* #10: intro 13/400 #5B5349, 14 above the first card (measured). */}
        <p className="m-0 mb-3.5 text-charcoal-soft" style={{ fontSize: textPx(13) }}>
          Choose a plan {pro.first} offers
        </p>
        {note && (
          <p role="status" className="m-0 mb-3 px-1 text-[12.5px] font-medium text-status-high">
            {note}
          </p>
        )}
        {/* Plan cards: r18, 1 px #E9E8E8 (charcoal 0.10), padding 16 / 12
            bottom, 10 apart (measured on the frame). */}
        <div className="flex flex-col gap-2.5">
          {plans.map((p) => (
            <article key={p.id} className="rounded-[18px] border border-charcoal/[0.10] bg-cream-card px-4 pt-4 pb-3" aria-label={p.name}>
              <h3 className="m-0 font-bold leading-5 break-words" style={{ color: t.deep, fontSize: textPx(15) }}>
                {p.name}
              </h3>
              <p className="m-0 mt-0.5 font-bold text-charcoal leading-5 tabular-nums" style={{ fontSize: textPx(14) }}>
                {planPriceLabel(p.price, p.billing)}
              </p>
              {p.features.length > 0 && (
                <div className="mt-1.5">
                  <Bullets items={p.features} t={t} size={13} />
                </div>
              )}
              {p.isHired ? (
                <div className="mt-3 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-bold" style={{ background: t.pill, color: t.deep }}>
                  <Check size={14} strokeWidth={3} aria-hidden /> Already hired
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => choose(p)}
                  className="tap mt-3 w-full h-10 rounded-xl text-[14px] font-bold transition-[filter] duration-150 active:brightness-[0.92]"
                  style={{ background: t.cta, color: t.onMain }}
                  aria-label={`Choose ${p.name}`}
                >
                  Choose
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    );
  };

  const checkoutBody = () => {
    if (!plan) return null;
    const rows: { key: HirePaymentMethod; Icon: typeof Wallet; name: string; hint: string; off: boolean }[] = [
      // Whish: on the enum since stage 5 but not wired, so drawn, not
      // choosable — exactly as the gym checkout and the class booking popup.
      { key: "whish", Icon: Wallet, name: "Whish Money", hint: "Pay with your Whish wallet", off: true },
      { key: "cash", Icon: Banknote, name: "Cash", hint: `Pay ${pro.first} in person`, off: false },
    ];
    const label = (text: string, className = "") => (
      <p className={`m-0 px-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] ${className}`} style={{ color: t.main }}>
        {text}
      </p>
    );
    return (
      <div className="flex flex-col">
        {/* #11–13: the summary card (r18, 1 px #EEEDED, p16): avatar 40 on
            #E7E2F6, name 14/700 deep, type 11.5/500 main, gap 12; a #F2F2F2
            rule 12 under; plan 15/700 #241F1B with the price 14/700 deep;
            included lines 12.5/400 #5B5349, gap 5. */}
        <div className="rounded-[18px] border border-charcoal/[0.08] bg-cream-card p-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-[14px] font-bold"
              style={{ background: t.pill, color: t.deep }}
              aria-hidden
            >
              {pro.avatarUrl ? <img src={pro.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(pro.name)}
            </span>
            <span className="min-w-0">
              <span className="block font-bold truncate" style={{ color: t.deep, fontSize: textPx(14) }}>
                {pro.name}
              </span>
              {pro.role && (
                <span className="block font-medium" style={{ color: t.main, fontSize: textPx(11.5) }}>
                  {pro.role}
                </span>
              )}
            </span>
          </div>
          <div aria-hidden className="h-px bg-charcoal/[0.06] mt-3" />
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-bold text-charcoal break-words" style={{ fontSize: textPx(15) }}>
              {plan.name}
            </span>
            <span className="shrink-0 font-bold tabular-nums" style={{ color: t.deep, fontSize: textPx(14) }}>
              {planPriceLabel(plan.price, plan.billing)}
            </span>
          </div>
          {plan.features.length > 0 && (
            <div className="mt-2">
              <Bullets items={plan.features} t={t} size={12.5} />
            </div>
          )}
        </div>

        {label("Payment method", "mt-[22px]")}
        {/* Rows: 60 tall, r14, 1 px #E9E8E8, padding 12, 8 apart; tile 34 on
            the type pill with the 16/1.75 icon in the type main; the chosen
            row takes a 1 px main border and a 3 px pill ring; the check is a
            20 circle on the CTA fill with Check 12/3 (measured). */}
        <div className="mt-2.5 flex flex-col gap-2" role="radiogroup" aria-label="Payment method">
          {rows.map((o) => {
            const on = o.key === method;
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={o.off}
                className="w-full min-h-[60px] rounded-[14px] px-3 py-2.5 flex items-center gap-3 text-start bg-cream-card disabled:opacity-40"
                style={
                  on
                    ? { border: `1px solid ${t.main}`, boxShadow: `0 0 0 3px ${t.pill}`, background: `color-mix(in srgb, ${t.pill} 40%, transparent)` }
                    : { border: "1px solid rgb(36 31 27 / 0.10)" }
                }
              >
                <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: t.pill, color: t.main }} aria-hidden>
                  <o.Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-charcoal" style={{ fontSize: textPx(15) }}>
                    {o.name}
                  </span>
                  <span className="block text-charcoal-faint" style={{ fontSize: textPx(13) }}>
                    {o.hint}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on ? "" : "border border-charcoal/[0.18]"}`}
                  style={on ? { background: t.cta, color: t.onMain } : undefined}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {label("Order total", "mt-[22px]")}
        {/* Subtotal / Service fee 14/400 #5B5349, a #F0EFEF rule, Total 15/700. */}
        <div className="mt-2.5 rounded-[18px] border border-charcoal/[0.08] bg-cream-card p-4 flex flex-col gap-2 tabular-nums">
          <span className="flex justify-between gap-3 text-charcoal-soft" style={{ fontSize: textPx(14) }}>
            <span>Subtotal</span>
            <span>{priceExact(plan.price)}</span>
          </span>
          <span className="flex justify-between gap-3 text-charcoal-soft" style={{ fontSize: textPx(14) }}>
            <span>Service fee</span>
            <span>{priceExact(0)}</span>
          </span>
          <span aria-hidden className="h-px bg-charcoal/[0.07]" />
          <span className="flex justify-between gap-3 font-bold text-charcoal" style={{ fontSize: textPx(15) }}>
            <span>Total</span>
            <span>{priceExact(plan.price)}</span>
          </span>
        </div>
        <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-charcoal-faint">
          Centium doesn't take the payment. Your hire stays Pending payment until {pro.first} confirms they've been paid, and you can cancel for
          free until then.
        </p>
        {error && (
          <p role="alert" className="mt-3 mb-0 text-[12.5px] font-medium text-status-high">
            {error}
          </p>
        )}
      </div>
    );
  };

  const confirmedBody = () => {
    if (!hired) return null;
    const pending = hired.paymentStatus !== "paid";
    return (
      <div className="flex flex-col items-center text-center pt-6 pb-4">
        {/* #11: 132 × 132, the v7 mark. */}
        <HireConfirmedMark size={132} onSettled={() => setSettled(true)} />
        <div className={`flex flex-col items-center transition-opacity duration-100 ${settled ? "opacity-100" : "opacity-0"}`}>
          {/* #12: 22/800 #5F5093, 18 under the mark. */}
          <h3 className="m-0 mt-[18px] font-extrabold leading-7" style={{ color: t.deep, fontSize: textPx(22) }}>
            You've hired {pro.first}
          </h3>
          {/* #13: 14/700 #241F1B. */}
          <p className="m-0 mt-1.5 font-bold text-charcoal tabular-nums" style={{ fontSize: textPx(14) }}>
            {hired.planName} · {priceShort(hired.priceAgreed)}
          </p>
          {/* The handover's "Pending payment" state, from my_hires(). */}
          <MemberTag className="mt-2" label={hireStatusLabel(hired)} tone={pending ? "pending" : "member"} />
          {/* #14: 13/400 #5B5349, 270 wide. */}
          <p className="m-0 mt-3 max-w-[270px] text-charcoal-soft leading-[21px]" style={{ fontSize: textPx(13) }}>
            {pro.first} will reach out to schedule your first session.
            {pending && hired.paymentMethod === "cash" ? " Pay them in person; your hire becomes active once they confirm they've been paid." : ""}
          </p>
        </div>
      </div>
    );
  };

  const footer =
    step === "checkout" && plan ? (
      <CtaButton
        size="sheet"
        label={`Pay ${priceShort(plan.price)}`}
        icon={<Lock size={16} strokeWidth={1.75} aria-hidden />}
        loading={busy}
        onClick={() => void pay()}
        style={{ background: t.cta, color: t.onMain }}
      />
    ) : step === "confirmed" ? (
      // #15: Message {first} (the type pill, deep ink, MessageCircle) + Done.
      <div className="flex gap-2.5">
        <CtaButton
          size="sheet"
          variant="secondary"
          label={`Message ${pro.first}`}
          icon={<MessageCircle size={15} aria-hidden />}
          loading={messageBusy}
          onClick={onMessage}
          style={{ background: t.pill, color: t.deep }}
        />
        <CtaButton size="sheet" label="Done" onClick={onClose} style={{ background: t.cta, color: t.onMain }} />
      </div>
    ) : undefined;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      // C-08 / D26: the confirmed step has no title; the content carries it.
      title={step === "plans" ? `Hire ${pro.first}` : step === "checkout" ? "Checkout" : undefined}
      onBack={step === "checkout" && !busy ? () => setStep("plans") : undefined}
      footer={footer}
    >
      {step === "plans" ? plansBody() : step === "checkout" ? checkoutBody() : confirmedBody()}
    </BottomSheet>
  );
}
