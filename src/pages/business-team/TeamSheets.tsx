import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import type { BizKind } from "../../components/business-more/kind";
import { fetchSeatBlockPrice, inviteEmployee, roleUsesSeat, type BusinessRole } from "../../services/business-team/team";
import { fetchPlanSummary, missingPriceText, perPeriod, type SubscriptionPeriod } from "../../services/centium-billing";
import { SeatPurchaseSheet } from "../business-analytics/team/SeatPurchaseSheet";
import { roleOptions, type SeatCounts } from "./teamLogic";
import { isOfflineNow } from "./parts";

// The OpsTabsV4 sheets (template 341-371): Invite an employee (OP1-066 / 067)
// and All seats in use (OP1-070 / 127). BottomSheet tone "business" draws the
// band, the #7248F8 / #9976F7 outline and the 62 header; the body is 18 18 30.

const SHEET = { tone: "business" as const, headerHeight: 62 as const, bodyPadding: { top: 18, right: 18, bottom: 30, left: 18 } };

const SeatTop = ({ title, sub }: { title: string; sub: string }) => (
  <div className="tm-sh-top">
    <span aria-hidden />
    <div>
      <p className="tm-sh-top-t">{title}</p>
      <p className="tm-sh-top-s">{sub}</p>
    </div>
  </div>
);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invite an employee (OP1-066). Sends invite_employee; the row starts
 * unaccepted (B0) so no seat is used until they accept.
 */
export function InviteSheet({
  open,
  onClose,
  businessId,
  kind,
  counts,
  onSent,
  onNoSeats,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  kind: BizKind;
  counts: SeatCounts;
  onSent: () => void;
  onNoSeats: () => void;
}) {
  const roles = roleOptions(kind);
  const [identifier, setIdentifier] = useState("");
  const firstRole = (counts.free > 0 ? roles[0] : roles.find((r) => !roleUsesSeat(r.value)) ?? roles[0]).value;
  const [role, setRole] = useState<BusinessRole>(firstRole);
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState(false);
  const [menuTop, setMenuTop] = useState(23);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pickRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      setIdentifier("");
      setMessage("");
      setRole(firstRole);
      setMenu(false);
      setBusy(false);
      setFieldError(null);
      setSendError(null);
    }
  }, [open, kind, firstRole]);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMenu(false);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const opts = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
        const i = opts.indexOf(document.activeElement as HTMLButtonElement);
        opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [menu]);

  const valid = EMAIL.test(identifier.trim());
  const roleLabel = roles.find((r) => r.value === role)?.label ?? roles[0].label;
  const close = () => (identifier.trim() && !busy ? setDiscard(true) : onClose());

  const send = async () => {
    if (!valid || busy) return;
    if (isOfflineNow()) {
      setSendError("Invite didn't send. Check your connection and try again. Nothing was sent.");
      return;
    }
    setBusy(true);
    setFieldError(null);
    setSendError(null);
    const r = await inviteEmployee(businessId, identifier, role, message);
    setBusy(false);
    if (r.ok) return onSent();
    if (r.reason === "no_seats") return onNoSeats();
    if (r.reason === "not_found") return setFieldError(r.message);
    setSendError(r.message);
  };

  const seatSub =
    counts.free === 0
      ? "No seats free. Front desk and managers don't need one."
      : counts.free === 1
        ? "One seat left. It's used once they accept."
        : `${counts.free} seats free. A seat is used once they accept.`;
  const noSeatPicked = counts.free === 0 && roleUsesSeat(role);

  return (
    <>
      <BottomSheet open={open} onClose={close} title="Invite an employee" {...SHEET}>
        <div className="tm-vars">
          <SeatTop title={`${counts.used} of ${counts.total} seats used`} sub={seatSub} />
          <div className="tm-fld">
            <label className="tm-fld-l" htmlFor="tm-invite-id">
              Email
            </label>
            <input
              id="tm-invite-id"
              className={fieldError ? "tm-input err" : "tm-input"}
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={identifier}
              disabled={busy}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "tm-invite-err" : undefined}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setFieldError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
            />
            {fieldError && (
              <p id="tm-invite-err" className="tm-fld-err">
                {fieldError}
              </p>
            )}
          </div>
          <div className="tm-fld">
            <span className="tm-fld-l" id="tm-role-l">
              Role
            </span>
            <button
              type="button"
              ref={pickRef}
              className={menu ? "tm-input pick open" : "tm-input pick"}
              aria-haspopup="listbox"
              aria-expanded={menu}
              aria-labelledby="tm-role-l"
              disabled={busy}
              onClick={() => {
                // OP1-067: the menu card starts 10 above the field (just under the label).
                setMenuTop((pickRef.current?.offsetTop ?? 33) - 10);
                setMenu((m) => !m);
              }}
            >
              <span>{roleLabel}</span>
              <ChevronDown size={16} />
            </button>
            {menu && (
              <div ref={menuRef} className="tm-menu" role="listbox" aria-label="Role" style={{ top: menuTop }}>
                <p className="tm-menu-h">Role</p>
                {roles.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === role}
                    className="tm-opt"
                    onClick={() => {
                      setRole(o.value);
                      setMenu(false);
                    }}
                  >
                    <span>
                      <span className="tm-opt-t">{o.label}</span>
                      <span className="tm-opt-s">{roleUsesSeat(o.value) ? `${o.sub} · uses a seat` : o.sub}</span>
                    </span>
                    {o.value === role && <Check size={16} strokeWidth={2.6} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="tm-fld">
            <label className="tm-fld-l" htmlFor="tm-invite-msg">
              Message (optional)
            </label>
            <textarea
              id="tm-invite-msg"
              className="tm-input tm-textarea"
              rows={3}
              maxLength={300}
              value={message}
              disabled={busy}
              placeholder="Add a note for them"
              aria-describedby={message.length >= 250 ? "tm-invite-count" : undefined}
              onChange={(e) => setMessage(e.target.value)}
            />
            {message.length >= 250 && (
              <p id="tm-invite-count" className="tm-fld-count">{`${message.length} of 300`}</p>
            )}
          </div>
          {noSeatPicked && <p className="tm-sh-note">{`${roleLabel} uses a seat and none are free. Add seats, or pick a role that doesn't need one.`}</p>}
          <button type="button" className={busy ? "tm-sh-btn busy" : "tm-sh-btn"} disabled={!valid || busy || noSeatPicked} onClick={() => void send()}>
            {busy ? "Sending…" : "Send invite"}
          </button>
          {sendError && (
            <p className="tm-sh-err" role="alert">
              {sendError}
            </p>
          )}
        </div>
      </BottomSheet>
      <ConfirmCard
        open={discard}
        layout="stacked"
        tone="destructive"
        destructiveFill="solid"
        cancelVariant="outlined"
        title="Discard this invite?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
      />
    </>
  );
}

/**
 * All seats in use (OP1-070 invite context, OP1-127 approve context). The
 * price is the seat block's for the plan's billing period
 * (business_plan_summary, Batch 2), or, without that reader, the monthly one
 * from subscription_tiers (V6-40). A period with no price says so, never $0.
 * "Add seats" opens the AN5
 * 057-060 Add seats flow (OP1-070 row 5, OP1-127 row 8), which places a B8
 * RV-06 seat order (buy_seat_blocks, owner only) or, on a database without
 * RV-06, keeps the email request.
 */
export function SeatsFullSheet({
  open,
  onClose,
  counts,
  approveName,
  onInviteNoSeat,
  onChanged,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  counts: SeatCounts;
  /** Batch 2: the business, so the seat price is read for its billing period. */
  businessId?: string | null;
  /** Invite a role that needs no seat (front desk, manager) from a full business. */
  onInviteNoSeat?: () => void;
  /** Set when the sheet opened from approving a join request (OP1-127). */
  approveName?: string | null;
  /** A seat order was placed or cancelled in the Add seats flow. */
  onChanged?: () => void;
}) {
  const [price, setPrice] = useState<{ amount: number | null; period: SubscriptionPeriod; seatsPerUnit: number } | null | undefined>(undefined);
  const [priceError, setPriceError] = useState(false);
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const s = businessId ? await fetchPlanSummary(businessId) : null;
      if (cancelled) return;
      if (s?.ok) {
        setPrice({ amount: s.value.seatBlockPrice, period: s.value.period, seatsPerUnit: s.value.seatsPerBlock ?? 5 });
        setPriceError(false);
        return;
      }
      const r = await fetchSeatBlockPrice();
      if (cancelled) return;
      if (r.ok) {
        setPrice(r.value ? { amount: r.value.monthly, period: "monthly", seatsPerUnit: r.value.seatsPerUnit } : null);
        setPriceError(false);
      } else setPriceError(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  const per = price?.seatsPerUnit ?? 5;
  const zero = counts.total === 0;
  const tail = approveName ? ` ${approveName} can join once a seat is free.` : " Send the invite again once a seat is free.";
  const note = !price
    ? `Each seat block adds ${per} seats.${tail}`
    : price.amount === null
      ? `Each seat block adds ${per} seats. ${missingPriceText(price.period)}.${tail}`
      : `Each seat block is $${price.amount.toFixed(2)} ${perPeriod(price.period)} and adds ${per} seats.${tail}`;

  return (
    <>
      <BottomSheet open={open && !buying} onClose={onClose} title="All seats in use" {...SHEET}>
        <div className="tm-vars">
          <SeatTop title={`${counts.used} of ${counts.total} seats used`} sub={zero ? "Add a seat block to start inviting people." : `Add a seat block for ${per} more people.`} />
          {priceError ? <p className="tm-sh-note">Couldn't load the seat price.</p> : <p className="tm-sh-note">{note}</p>}
          <button type="button" className="tm-sh-btn tap" onClick={() => setBuying(true)}>
            Add seats
          </button>
          {onInviteNoSeat && !approveName && (
            <div style={{ textAlign: "center" }}>
              <button type="button" className="tm-link tap" onClick={onInviteNoSeat}>
                Invite someone who doesn't need a seat
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
      {open && buying && (
        <SeatPurchaseSheet
          used={counts.used}
          pending={counts.invited}
          fallback={{ capacity: counts.total, planActive: counts.total > 0, blocks: 0, perBlock: per, blockPrice: price?.amount ?? null, period: price?.period ?? "monthly" }}
          onClose={() => {
            setBuying(false);
            onClose();
          }}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
