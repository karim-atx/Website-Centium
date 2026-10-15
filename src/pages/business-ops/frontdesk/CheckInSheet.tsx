import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { checkInGuest, checkInMember, deskFindMember, sellDayPass } from "../../../services/front-desk";
import { ALREADY_IN_HOURS, deniedLine, deskMoney, GUEST_LABEL_MAX, type DayPassPlan, type DeskMember, type FrontDeskMember } from "../../../services/front-desk/frontDeskLogic";
import { memberNumberLabel } from "../../../services/business-members";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { textPx } from "../../../theme/textSize";
import type { CheckInPreset } from "./ScanSheet";

// OP1-015 · Check someone in (BizTypeKit sheet: 53 header, body padding
// 18 20 12, pinned footer 12 20 34, 46 r14 fields, 52 r16 Check in 14/700).
// The search is the server's desk_find_member (Q-05, Database 0587c8a):
// checking somebody in is where a first name is shown, so it matches a first
// name or the member number ("42", "0042", "#42"), valid passes first; the
// members list itself is masked. The result line leads with "Member #0042"
// so the desk can confirm the number it typed.
//
// B10 writes (OURS where the frame draws only "Check in", each string flagged):
// - the member's pass → check_in_member(desk venue, membership, 'manual'): the
//   server decides and records, denials included; a refusal shows its reason
//   in the O4 slot, "Already checked in" when they came in in the last 4 hours;
// - "Day pass" (row 9, BU2-10) → sell_day_pass(..., cash, paid now / pay
//   later): the sale is the entry; pay later lands in Money owed;
// - "Guest of {name}" → check_in_guest(desk venue, host, label);
// - a walk-in the search can't find → a day pass sold to a named guest.
// THE PENDING RULE: without B10 the button stays unavailable with its note.
// Footer link (OURS-OP1-member-codes D9): a walk-in who is not a member yet
// gets a member code from Analytics › Members › Member codes.

const FIELD = "w-full flex items-center bg-cream-soft border-[1.5px] border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08]";

type Picked = Pick<DeskMember, "membershipId" | "personId" | "planName" | "expiresOn" | "passState" | "memberNumber"> & { name: string };

export const CheckInSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** The venue this desk checks people in at. */
  gymId: string | null;
  /** The business's venues; the search runs at each (desk_find_member is per venue). */
  gymIds: string[];
  /** The masked list, only to preselect a membership from a scan. */
  members: FrontDeskMember[];
  online: boolean;
  /** B10 answers (false: the pending note; null: not known yet). */
  live: boolean | null;
  dayPasses: DayPassPlan[];
  onScanInstead: () => void;
  /** Preselect (a scan result's "Check someone in" / "Sell a day pass"). */
  preset?: CheckInPreset | null;
  /** A check-in or a sale was recorded: the toast line. */
  onDone: (message: string) => void;
}> = ({ open, onClose, gymId, gymIds, members, online, live, dayPasses, onScanInstead, preset, onDone }) => {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  /** A walk-in sold a day pass as a named guest (no member). */
  const [walkIn, setWalkIn] = useState<string | null>(null);
  const [results, setResults] = useState<{ q: string; rows: DeskMember[] } | null>(null);
  /** The membership id, "day:{plan id}", or "guest". */
  const [pass, setPass] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [paid, setPaid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ text: string; tone: "high" | "soft" } | null>(null);
  const [passMenu, setPassMenu] = useState(false);
  const [passEl, setPassEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const m = preset?.membershipId ? members.find((x) => x.membershipId === preset.membershipId) ?? null : null;
    const name = preset?.firstName ?? m?.label ?? "";
    setPicked(
      m ? { membershipId: m.membershipId, personId: m.personId, planName: m.planName, expiresOn: m.expiresOn, passState: m.passState, memberNumber: m.memberNumber, name } : null
    );
    setWalkIn(null);
    setQuery(m ? name : "");
    setPass(m ? (preset?.dayPass && dayPasses[0] ? `day:${dayPasses[0].id}` : m.membershipId) : null);
    setGuestName("");
    setPaid(true);
    setProblem(null);
    setPassMenu(false);
    // Opening resets the form (a later members reload does not).
  }, [open, preset]);

  // Search as the desk types (a short pause first), the server deciding who matches.
  const q = query.trim();
  useEffect(() => {
    if (!open || gymIds.length === 0 || !q || picked || walkIn !== null) return;
    let alive = true;
    const t = window.setTimeout(() => {
      void Promise.all(gymIds.map((g) => deskFindMember(g, q, 6))).then((rs) => {
        if (!alive) return;
        const rows = rs.flatMap((r) => (r.ok ? r.value : [])).filter((m) => m.status === "active" || m.status === "upcoming");
        // Valid passes first, as each venue's answer already is.
        rows.sort((a, b) => Number(b.passState === "valid") - Number(a.passState === "valid"));
        setResults({ q, rows: rows.slice(0, 6) });
      });
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, gymIds, q, picked, walkIn]);
  const shown = results && results.q === q ? results.rows : null;

  const canSell = live === true && dayPasses.length > 0;
  const plan = pass?.startsWith("day:") ? dayPasses.find((p) => `day:${p.id}` === pass) ?? null : null;
  const isGuest = pass === "guest";
  const passLabel = (m: { planName: string; expiresOn: string | null }) => (m.expiresOn ? `${m.planName || "Membership"} · until ${dayMonthYear(m.expiresOn)}` : m.planName || "Membership");
  const dayLabel = (p: DayPassPlan) => `${p.name} · ${deskMoney(p.price)}`;
  /** Search result sub: "Member #0042", then the pass (desk_find_member carries no paid date). */
  const resultSub = (m: DeskMember) => [m.memberNumber !== null ? memberNumberLabel(m.memberNumber) : null, passLabel(m)].filter(Boolean).join(" · ");
  const ownPass = !!picked && pass === picked.membershipId;
  const refused = ownPass && picked.passState !== "valid";
  const who = picked?.name || walkIn || "";

  const ready = !!gymId && live === true && (ownPass || (!!plan && (!!picked || !!walkIn)) || (isGuest && !!picked && guestName.trim().length > 0));
  const disabled = !online || !ready || busy;
  const label = !online ? "You're offline" : busy ? "Saving…" : plan ? "Sell and check in" : isGuest ? "Check in guest" : "Check in";

  const submit = async () => {
    if (disabled || !gymId) return;
    setBusy(true);
    setProblem(null);
    if (plan) {
      const buyer = picked?.personId ? { personId: picked.personId } : walkIn ? { guestLabel: walkIn } : null;
      if (!buyer) {
        setBusy(false);
        setProblem({ text: "This person isn't one of your members. Sell to them as a guest by name.", tone: "high" });
        return;
      }
      const r = await sellDayPass(gymId, plan.id, buyer, paid);
      setBusy(false);
      if (!r.ok) return setProblem({ text: r.message, tone: "high" });
      onDone(paid ? `${who} is checked in with a day pass.` : `${who} is checked in. The day pass is in Money owed.`);
      return;
    }
    if (isGuest && picked) {
      const label = guestName.trim();
      const r = await checkInGuest(gymId, picked.membershipId, label);
      setBusy(false);
      if (!r.ok) return setProblem({ text: r.message, tone: "high" });
      const g = r.value;
      if (g.result === "in") {
        onDone(`${label} is checked in as ${picked.name}'s guest. ${g.used} of ${g.allowed} guest passes used this month.`);
        return;
      }
      setProblem({
        text:
          g.denyReason === "guest_limit"
            ? `Not checked in: ${picked.name} has used all ${g.allowed} guest passes this month.`
            : `Not checked in: ${picked.name}'s pass isn't valid today, so they can't bring a guest.`,
        tone: "high",
      });
      return;
    }
    if (ownPass && picked) {
      const r = await checkInMember(gymId, picked.membershipId, "manual");
      setBusy(false);
      if (!r.ok) return setProblem({ text: r.message, tone: "high" });
      const c = r.value;
      if (c.alreadyIn) return setProblem({ text: `Already checked in: ${c.firstName ?? picked.name} came in within the last ${ALREADY_IN_HOURS} hours.`, tone: "soft" });
      if (c.result === "in") {
        onDone(`${c.firstName ?? picked.name} is checked in.`);
        return;
      }
      setProblem({ text: deniedLine(c.denyReason ?? "no_pass"), tone: "high" });
      return;
    }
    setBusy(false);
  };

  const pickMember = (m: DeskMember) => {
    setPicked({ ...m, name: m.firstName });
    setWalkIn(null);
    setQuery(m.firstName);
    setPass(m.membershipId);
    setProblem(null);
  };
  const pickWalkIn = () => {
    const name = q.slice(0, GUEST_LABEL_MAX);
    setWalkIn(name);
    setPicked(null);
    setQuery(name);
    setPass(dayPasses[0] ? `day:${dayPasses[0].id}` : null);
    setProblem(null);
  };

  const options = [
    ...(picked ? [{ value: picked.membershipId, label: passLabel(picked) }] : []),
    ...(live === true
      ? dayPasses.map((p) => ({ value: `day:${p.id}`, label: dayLabel(p) }))
      : // The pending rule: day passes sold at the door need B10.
        [{ value: "day-pass", label: "Day pass", disabled: true, note: "Coming soon" }]),
    ...(picked && live === true ? [{ value: "guest", label: `Guest of ${picked.name}` }] : []),
  ];
  const passText = plan ? dayLabel(plan) : isGuest && picked ? `Guest of ${picked.name}` : picked && pass ? passLabel(picked) : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Check someone in"
      tone="business"
      headerHeight={53}
      bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
      footer={
        <div>
          {live === false && online && (
            <p role="note" className="text-center text-[11.5px] font-semibold leading-[16px] text-charcoal-faint" style={{ marginBottom: 8 }}>
              Saving desk check-ins is coming soon. Scanning a pass works now.
            </p>
          )}
          {problem && (
            <p
              role={problem.tone === "high" ? "alert" : "status"}
              className={clsx("text-[11.5px] font-bold leading-[16px]", problem.tone === "high" ? "text-status-high" : "text-primary-dark")}
              style={{ marginBottom: 8 }}
            >
              {problem.text}
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => void submit()}
            className="tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill disabled:opacity-50"
            style={{ height: 52, borderRadius: 16, fontSize: textPx(14), fontWeight: 700 }}
          >
            {label}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/app/business/analytics/members/codes?create=1");
            }}
            className="tap w-full flex items-center justify-center text-center text-[12.5px] font-extrabold text-primary-dark"
            style={{ minHeight: 44, marginTop: 4 }}
          >
            Not a member yet? Create a code
          </button>
        </div>
      }
    >
      <div>
        <label htmlFor="fd-member" className="block text-[12px] font-bold leading-[16px] text-charcoal-soft" style={{ marginBottom: 6 }}>
          Member
        </label>
        <div className={FIELD} style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8, marginBottom: query && !picked && walkIn === null ? 6 : 12 }}>
          <input
            id="fd-member"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
              setWalkIn(null);
              setPass(null);
              setProblem(null);
            }}
            placeholder="Search name or member code"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent focus:outline-none text-[13.5px] font-bold text-charcoal placeholder:font-medium placeholder:text-charcoal-faint [html.high-contrast_&]:placeholder:text-charcoal-soft"
          />
          <Search size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />
        </div>
        {query.trim() && !picked && walkIn === null && (
          <div role="listbox" aria-label="Members" className="bg-cream-card border border-solid border-th-aea1dc/50 shadow-menu" style={{ borderRadius: 14, padding: 8, marginBottom: 12 }}>
            {shown === null ? (
              <p className="text-[11px] leading-[15px] text-charcoal-faint" style={{ padding: "8px 10px" }}>
                Searching…
              </p>
            ) : (
              <>
                {shown.length === 0 && (
                  <div style={{ padding: "8px 10px" }}>
                    <p className="text-[13px] font-bold leading-[18px] text-charcoal">No member found</p>
                    <p className="text-[11px] leading-[15px] text-charcoal-faint">Check the spelling or the member code.</p>
                  </div>
                )}
                {shown.map((m) => (
                  <button
                    key={m.membershipId}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickMember(m)}
                    className="tap w-full text-start rounded-lg hover:bg-primary-pale"
                    style={{ minHeight: 44, padding: "6px 10px" }}
                  >
                    <span className="block text-[13px] font-bold leading-[18px] text-charcoal">{m.firstName}</span>
                    <span className="block text-[11px] leading-[15px] text-charcoal-faint">{resultSub(m)}</span>
                  </button>
                ))}
                {canSell && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={pickWalkIn}
                    className="tap w-full text-start rounded-lg hover:bg-primary-pale"
                    style={{ minHeight: 44, padding: "6px 10px" }}
                  >
                    <span className="block text-[13px] font-bold leading-[18px] text-primary-dark truncate">Sell a day pass to “{q.slice(0, GUEST_LABEL_MAX)}”</span>
                    <span className="block text-[11px] leading-[15px] text-charcoal-faint">Not a member: a guest by name</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <p id="fd-pass-label" className="text-[12px] font-bold leading-[16px] text-charcoal-soft" style={{ marginBottom: 6 }}>
          Pass
        </p>
        <button
          ref={setPassEl}
          type="button"
          aria-labelledby="fd-pass-label"
          aria-haspopup="listbox"
          aria-expanded={passMenu}
          disabled={!picked && walkIn === null}
          onClick={() => setPassMenu(true)}
          className={clsx(FIELD, "text-start disabled:opacity-60")}
          style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}
        >
          <span className={clsx("flex-1 min-w-0 truncate text-[13.5px]", passText ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>
            {passText ?? (walkIn !== null ? "Choose a day pass" : "Choose a member first")}
          </span>
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />
        </button>
        {refused && (
          <p role="note" className="text-[11.5px] font-bold leading-[16px] text-status-high" style={{ marginTop: 5 }}>
            No valid pass. Sell a day pass or mark the membership paid.
          </p>
        )}

        {isGuest && (
          <>
            <label htmlFor="fd-guest" className="block text-[12px] font-bold leading-[16px] text-charcoal-soft" style={{ margin: "12px 0 6px" }}>
              Guest's name
            </label>
            <input
              id="fd-guest"
              value={guestName}
              maxLength={GUEST_LABEL_MAX}
              onChange={(e) => {
                setGuestName(e.target.value);
                setProblem(null);
              }}
              autoComplete="off"
              placeholder="For your entries list"
              className={clsx(FIELD, "focus:outline-none text-[13.5px] font-bold text-charcoal placeholder:font-medium placeholder:text-charcoal-faint")}
              style={{ height: 46, borderRadius: 14, padding: "0 12px" }}
            />
          </>
        )}

        {plan && (
          <div role="radiogroup" aria-label="Payment" style={{ marginTop: 12 }}>
            <p className="text-[12px] font-bold leading-[16px] text-charcoal-soft" style={{ marginBottom: 6 }}>
              Payment
            </p>
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              {[
                { on: paid, label: "Paid now", sub: "Cash", pick: () => setPaid(true) },
                { on: !paid, label: "Pay later", sub: "Goes to Money owed", pick: () => setPaid(false) },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  role="radio"
                  aria-checked={c.on}
                  onClick={c.pick}
                  className={clsx(
                    "tap text-start rounded-[14px] border-[1.5px] border-solid",
                    c.on ? "border-primary bg-primary-pale" : "border-charcoal/[0.11] dark:border-charcoal/[0.08]"
                  )}
                  style={{ padding: "8px 12px", minHeight: 46 }}
                >
                  <span className="block text-[13px] font-extrabold leading-[18px] text-charcoal">{c.label}</span>
                  <span className="block text-[11px] leading-[15px] text-charcoal-soft">{c.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={onScanInstead} className="tap text-[12.5px] font-bold text-primary-dark" style={{ minHeight: 44, marginTop: 4 }}>
          Scan a pass instead
        </button>
      </div>
      {(picked || walkIn !== null) && (
        <PopupMenu
          open={passMenu}
          anchor={passEl}
          onClose={() => setPassMenu(false)}
          variant="field"
          matchWidth={passEl}
          selected={pass}
          options={walkIn !== null ? options.filter((o) => o.value.startsWith("day:")) : options}
          onSelect={(v) => {
            if (v !== "day-pass") {
              setPass(v);
              setProblem(null);
            }
            setPassMenu(false);
          }}
        />
      )}
    </BottomSheet>
  );
};
