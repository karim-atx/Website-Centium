import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { forumAccess } from "../../services/forum/rules";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { FOCUS_CSS, usePress } from "../market/usePress";
import { PaymentMethods, SheetBox, confirmLabel } from "../../pages/marketplace/PurchaseSheet";
import { EmptyBlock } from "../../pages/professionals/profile/parts";
import {
  describeHireError,
  fetchMyHires,
  fetchPlansFor,
  hireProfessional,
  planPriceLabel,
  priceShort,
  type HirePaymentMethod,
  type MyHire,
  type Plan,
} from "../../services/hires";
import type { HireRequestExtras } from "../../services/hire-request";
import { REQUEST_MESSAGE_MAX } from "../../services/public-pro/logic";

// Market + Share 3.0 · W5 · the hire sheet, restyled as the handover purchase
// sheet (HANDOVER §4 "Purchase / booking sheets"; C-MO.4.9 Services › Hire,
// Client Professional Screens lines 216–252): MasterBottomSheet chrome (the
// app BottomSheet defaults, as PurchaseSheet), a column (gap 12) of --sgrey
// boxes (radius 14, padding 12 14, the label 13 / 500 --slabel 8 above), the
// plan ticket with the 72 price stub (1.5px dashed --fill on --pale, 18 / 800
// --pdark, the two 14 notches), the payment box (Cash selected, "Pay {first}
// at the start of the session"; App Store / Google Play and Whish Money greyed
// "Coming soon"), the pinned CTA 50 radius 16 --fill 15 / 700 "Confirm · $X"
// (W2 lead decision). The confirmed step is gone: a hire closes the sheet and
// the profile shows the strip ("Hired {first} · Pending payment") and the
// hire's card on Services.
//
// KEPT LIVE FEATURES (PLAN §3.2), every rule as before: plans from
// professional_plans_for with "Already hired"; under-18 "Not available under
// 18" (ATXA2); "Not taking new clients" (ATXA0, a normal answer); "No plans
// yet" with Send a request (pending_client_requests, optional plan and
// message) and Message; the ?hire=<planId> deep link (straight to that plan's
// checkout, or a note); ATX98 (gone since loading: back to the list with a
// note); hire_professional(plan, 'cash').

export interface HirePro {
  id: string;
  name: string;
  first: string;
  /** "Personal Trainer", as the profile's role line. */
  role: string;
  avatarUrl: string | null;
}

type Step = "plans" | "checkout" | "request";

/** The 44-tall buttons inside the sheet's states (primary --fill, secondary outline). */
const SheetButton: React.FC<{ children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; ariaLabel?: string }> = ({ children, onClick, disabled, primary, ariaLabel }) => {
  const m = marketPalette(useIsDark());
  const press = usePress();
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className="market-focus"
      {...press.handlers}
      style={{
        height: 44,
        padding: "0 16px",
        borderRadius: 14,
        font: "inherit",
        fontSize: textPx(14),
        fontWeight: 800,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...(primary ? { background: m.fill, color: m.onfill, border: 0 } : { background: "transparent", color: m.pdark, border: `1px solid ${m.border}` }),
        ...(disabled ? {} : press.style),
      }}
    >
      {children}
    </button>
  );
};

export function HireSheet({
  open,
  onClose,
  pro,
  initialPlanId,
  onHired,
  onMessage,
  messageBusy,
  request,
}: {
  open: boolean;
  onClose: () => void;
  pro: HirePro;
  /** A plan to open straight on its checkout: the ?hire=<planId> deep link, or the Services tab's Hire. */
  initialPlanId?: string | null;
  /** my_hires() after a hire (null when it failed to load) and the new hire, so the profile can show its strip and card. */
  onHired: (hires: MyHire[] | null, hire: MyHire) => void;
  onMessage: () => void;
  messageBusy?: boolean;
  /** The free request to connect (pending_client_requests), for someone not yet a client. */
  request?: {
    state: "none" | "pending" | "cooling_down";
    busy: boolean;
    error: string | null;
    onSend: (extras?: HireRequestExtras) => void;
  };
}) {
  const { user } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
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
  // ATXA0, stamped with the professional it was said about.
  const [notTakingFor, setNotTakingFor] = useState<string | null>(null);
  const notTaking = notTakingFor === pro.id;
  const [deepLinkUsed, setDeepLinkUsed] = useState<string | null>(null);
  const [requestPlan, setRequestPlan] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");

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
      setRequestPlan(null);
      setRequestMessage("");
      const loaded = await load();
      if (cancelled || !loaded) return;
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

  // The deep link is used once per plan id while the sheet is open; a new
  // open from the Services tab with the same plan should take it again.
  useEffect(() => {
    if (!open) setDeepLinkUsed(null);
  }, [open]);

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
    const hire: MyHire = row ?? {
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
      cancellationReason: null,
      cancellationMessage: null,
    };
    setBusy(false);
    onHired(mine.ok ? mine.hires : null, hire);
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  const body = (text: React.ReactNode, extra?: React.CSSProperties) => (
    <p style={{ margin: 0, fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2, ...extra }}>{text}</p>
  );

  // ---- the plan list -----------------------------------------------------------

  const plansBody = () => {
    if (minor) return <EmptyBlock title="Not available under 18" body={describeHireError("ATXA2")} style={{ paddingTop: 24, paddingBottom: 16 }} />;
    if (notTaking) {
      return (
        <EmptyBlock title="Not taking new clients" body={describeHireError("ATXA0")} style={{ paddingTop: 24, paddingBottom: 16 }}>
          <SheetButton onClick={onMessage} disabled={messageBusy}>
            Message {pro.first}
          </SheetButton>
        </EmptyBlock>
      );
    }
    if (plans === null) {
      return (
        <div aria-busy="true" role="status" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1].map((i) => (
            <span key={i} aria-hidden className="animate-skeleton-pulse" style={{ height: 120, borderRadius: 14, background: m.sgrey }} />
          ))}
        </div>
      );
    }
    if (loadError) {
      return (
        <p role="alert" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
          {loadError}
        </p>
      );
    }
    if (plans.length === 0) {
      return (
        <EmptyBlock
          title="No plans yet"
          body={
            request
              ? `${pro.first} hasn't set up any plans to hire. Send a request to work together, or message them.`
              : `${pro.first} hasn't set up any plans to hire. Message them to ask about working together.`
          }
          style={{ paddingTop: 24, paddingBottom: 16 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 }}>
            {request && (
              <SheetButton primary onClick={() => setStep("request")} disabled={request.busy || request.state !== "none"}>
                {request.state === "pending" ? "Request sent" : request.state === "cooling_down" ? "Not taking requests right now" : request.busy ? "Sending…" : "Send a request"}
              </SheetButton>
            )}
            <SheetButton onClick={onMessage} disabled={messageBusy}>
              Message {pro.first}
            </SheetButton>
          </div>
          {request?.error && (
            <p role="alert" style={{ margin: "4px 0 0", fontSize: textPx(12), color: m.high }}>
              {request.error}
            </p>
          )}
        </EmptyBlock>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {body(`Choose a plan ${pro.first} offers`)}
        {note && (
          <p role="status" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
            {note}
          </p>
        )}
        <SheetBox label="Plans" id="hire-plans">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {plans.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 10, background: m.card, border: `0.5px solid ${m.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: textPx(14), fontWeight: 800, color: m.ink, overflowWrap: "anywhere" }}>{p.name}</div>
                  <div style={{ fontSize: textPx(12), fontWeight: 700, color: m.accent, fontVariantNumeric: "tabular-nums" }}>{planPriceLabel(p.price, p.billing)}</div>
                  {p.features.length > 0 && (
                    <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                      {p.features.map((f, i) => (
                        <li key={i} style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint, overflowWrap: "anywhere" }}>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {p.isHired ? (
                  <span style={{ flexShrink: 0, borderRadius: 999, padding: "4px 10px", background: m.tealbg, color: m.tealink, fontSize: textPx(12), fontWeight: 700, whiteSpace: "nowrap" }}>Already hired</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    aria-label={`Choose ${p.name}`}
                    className="hit market-focus"
                    style={{ flexShrink: 0, height: 32, padding: "0 14px", borderRadius: 10, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(12), fontWeight: 800, cursor: "pointer" }}
                  >
                    Choose
                  </button>
                )}
              </div>
            ))}
          </div>
        </SheetBox>
        {request && request.state === "none" && (
          <button
            type="button"
            onClick={() => setStep("request")}
            className="hit market-focus"
            style={{ alignSelf: "center", minHeight: 44, background: "none", border: 0, padding: "0 8px", font: "inherit", fontSize: textPx(13), fontWeight: 700, color: m.pdark, cursor: "pointer" }}
          >
            Send {pro.first} a request instead
          </button>
        )}
        {request && request.state === "pending" && body(`Your request to ${pro.first} is waiting for an answer.`, { textAlign: "center", fontSize: textPx(12.5), color: m.faint })}
      </div>
    );
  };

  // ---- the request ----------------------------------------------------------------

  const requestBody = () => {
    if (!request) return null;
    if (request.state === "pending") {
      return <EmptyBlock title="Request sent" body={`${pro.first} can accept your request or message you about it.`} style={{ paddingTop: 24, paddingBottom: 16 }} />;
    }
    const options = [
      { id: null as string | null, name: "No particular plan", price: null as string | null },
      ...(plans ?? []).map((p) => ({ id: p.id as string | null, name: p.name, price: planPriceLabel(p.price, p.billing) as string | null })),
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {body(`Ask ${pro.first} to work with you. Nothing is shared until you choose to share it.`)}
        {(plans?.length ?? 0) > 0 && (
          <SheetBox label="Plan (optional)" id="hire-request-plan">
            <div role="radiogroup" aria-labelledby="hire-request-plan" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {options.map((o) => {
                const on = o.id === requestPlan;
                return (
                  <button
                    key={o.id ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRequestPlan(o.id)}
                    className="market-focus"
                    style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "9px 13px", borderRadius: 10, background: m.card, border: on ? `1.5px solid ${m.segactive}` : `0.5px solid ${m.border}`, font: "inherit", textAlign: "left", cursor: "pointer", color: m.ink }}
                  >
                    <span aria-hidden style={{ width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", border: on ? `6px solid ${m.segactive}` : `1.5px solid ${m.border}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 700, overflowWrap: "anywhere" }}>{o.name}</span>
                    {o.price && <span style={{ flexShrink: 0, fontSize: textPx(12), fontWeight: 700, color: m.accent }}>{o.price}</span>}
                  </button>
                );
              })}
            </div>
          </SheetBox>
        )}
        <SheetBox label="Message (optional)" id="hire-request-message">
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value.slice(0, REQUEST_MESSAGE_MAX))}
            maxLength={REQUEST_MESSAGE_MAX}
            rows={4}
            aria-labelledby="hire-request-message"
            placeholder={`What would you like to work on with ${pro.first}?`}
            className="market-focus placeholder:text-charcoal-faint"
            style={{ display: "block", width: "100%", boxSizing: "border-box", resize: "none", borderRadius: 10, border: `0.5px solid ${m.border}`, background: m.card, padding: "11px 13px", font: "inherit", fontSize: textPx(13.5), lineHeight: linePx(19), color: m.ink, outline: "none" }}
          />
          <p aria-live="polite" style={{ margin: "4px 0 0", textAlign: "right", fontSize: textPx(11), color: m.faint, fontVariantNumeric: "tabular-nums" }}>
            {requestMessage.length}/{REQUEST_MESSAGE_MAX}
          </p>
        </SheetBox>
        {request.error && (
          <p role="alert" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
            {request.error}
          </p>
        )}
      </div>
    );
  };

  // ---- checkout ------------------------------------------------------------------------

  const checkoutBody = () => {
    if (!plan) return null;
    const notch: React.CSSProperties = { position: "absolute", right: 65, width: 14, height: 14, borderRadius: 999, background: m.sbody };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="group" aria-label="Plan" style={{ position: "relative", display: "flex", borderRadius: 14, background: m.sgrey, overflow: "hidden", color: m.ink }}>
          <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
            <div style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>Plan</div>
            <div style={{ fontSize: textPx(15), fontWeight: 800, overflowWrap: "anywhere" }}>{plan.name}</div>
            <div style={{ fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{[pro.name, pro.role].filter(Boolean).join(" · ")}</div>
            <div style={{ fontSize: textPx(12), color: m.ink2, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{planPriceLabel(plan.price, plan.billing)}</div>
            {plan.features.map((f, i) => (
              <div key={i} style={{ fontSize: textPx(12), color: m.ink2, overflowWrap: "anywhere" }}>
                {f}
              </div>
            ))}
          </div>
          <div style={{ width: 72, flexShrink: 0, borderLeft: `1.5px dashed ${m.fill}`, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: textPx(18), fontWeight: 800, color: m.pdark, whiteSpace: "nowrap" }}>{priceShort(plan.price)}</span>
          </div>
          <span aria-hidden style={{ ...notch, top: -7 }} />
          <span aria-hidden style={{ ...notch, bottom: -7 }} />
        </div>
        <PaymentMethods cashHint={`Pay ${pro.first} at the start of the session`} />
        {body(`Centium doesn't take the payment. Your hire stays Pending payment until ${pro.first} confirms they've been paid, and you can cancel for free until then.`, { fontSize: textPx(12), lineHeight: linePx(17), color: m.faint })}
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
            {error}
          </p>
        )}
      </div>
    );
  };

  const cta = (label: string, onClick: () => void, isBusy: boolean) => (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={() => !isBusy && onClick()}
        aria-busy={isBusy || undefined}
        className="market-focus"
        {...press.handlers}
        style={{ width: "100%", height: 50, borderRadius: 16, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(15), fontWeight: 700, cursor: isBusy ? "default" : "pointer", ...(isBusy ? {} : press.style) }}
      >
        {isBusy ? "One moment…" : label}
      </button>
    </>
  );

  const footer =
    step === "request" && request && request.state === "none"
      ? cta("Send request", () => request.onSend({ planId: requestPlan, message: requestMessage }), request.busy)
      : step === "checkout" && plan
        ? cta(confirmLabel(priceShort(plan.price)), () => void pay(), busy)
        : undefined;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={step === "request" ? "Send a request" : `Hire ${pro.first}`}
      footerRule={!!footer}
      onBack={(step === "checkout" && !busy) || (step === "request" && !request?.busy) ? () => setStep("plans") : undefined}
      footer={footer}
    >
      <div style={{ lineHeight: "normal" }}>{step === "plans" ? plansBody() : step === "checkout" ? checkoutBody() : requestBody()}</div>
    </BottomSheet>
  );
}
