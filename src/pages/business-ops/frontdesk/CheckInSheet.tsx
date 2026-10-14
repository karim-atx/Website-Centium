import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { CHECK_INS_LIVE, deskFindMember } from "../../../services/front-desk";
import type { DeskMember, FrontDeskMember } from "../../../services/front-desk/frontDeskLogic";
import { memberNumberLabel } from "../../../services/business-members";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { textPx } from "../../../theme/textSize";

// OP1-015 · Check someone in (BizTypeKit sheet: 53 header, body padding
// 18 20 12, pinned footer 12 20 34, 46 r14 fields, 52 r16 Check in 14/700).
// Writing the check-in is B10 (BU2-07): the sheet finds the member and their
// pass now (venue_members), and the button stays unavailable with a note
// until the stage lands. The search is the server's desk_find_member (Q-05,
// Database 0587c8a): checking somebody in is where a first name is shown, so
// it matches a first name or the member number ("42", "0042", "#42"), valid
// passes first; the members list itself is masked. The result line leads
// with "Member #0042" so the desk can confirm the number it typed.
// Footer link (OURS-OP1-member-codes D9): a walk-in who is not a member yet
// gets a member code from Analytics › Members › Member codes.

const FIELD = "w-full flex items-center bg-cream-soft border-[1.5px] border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08]";

export const CheckInSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** The business's venues; the search runs at each (desk_find_member is per venue). */
  gymIds: string[];
  /** The masked list, only to preselect a membership from a scan or a row. */
  members: FrontDeskMember[];
  online: boolean;
  onScanInstead: () => void;
  /** Preselect (Sell a day pass from a scan result, a denied row). */
  initialMembershipId?: string | null;
}> = ({ open, onClose, gymIds, members, online, onScanInstead, initialMembershipId }) => {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Pick<DeskMember, "membershipId" | "planName" | "expiresOn" | "passState" | "memberNumber"> & { name: string } | null>(null);
  const [results, setResults] = useState<{ q: string; rows: DeskMember[] } | null>(null);
  const [pass, setPass] = useState<string | null>(null);
  const [passMenu, setPassMenu] = useState(false);
  const [passEl, setPassEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const m = initialMembershipId ? members.find((x) => x.membershipId === initialMembershipId) ?? null : null;
    setPicked(m ? { membershipId: m.membershipId, planName: m.planName, expiresOn: m.expiresOn, passState: m.passState, memberNumber: m.memberNumber, name: m.label } : null);
    setQuery(m ? m.label : "");
    setPass(m ? m.membershipId : null);
    setPassMenu(false);
    // Opening resets the form (a later members reload does not).
  }, [open, initialMembershipId]);

  // Search as the desk types (a short pause first), the server deciding who matches.
  const q = query.trim();
  useEffect(() => {
    if (!open || gymIds.length === 0 || !q || picked) return;
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
  }, [open, gymIds, q, picked]);
  const shown = results && results.q === q ? results.rows : null;

  const passValid = picked?.passState === "valid";
  const passLabel = (m: { planName: string; expiresOn: string | null }) => (m.expiresOn ? `${m.planName || "Membership"} · until ${dayMonthYear(m.expiresOn)}` : m.planName || "Membership");
  /** Search result sub: "Member #0042", then the pass (desk_find_member carries no paid date). */
  const resultSub = (m: DeskMember) => [m.memberNumber !== null ? memberNumberLabel(m.memberNumber) : null, passLabel(m)].filter(Boolean).join(" · ");
  const refused = !!picked && !!pass && !passValid;

  const disabled = !CHECK_INS_LIVE || !online || !picked || !pass || !passValid;
  const label = !online ? "You're offline" : "Check in";

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
          {!CHECK_INS_LIVE && online && (
            <p role="note" className="text-center text-[11.5px] font-semibold leading-[16px] text-charcoal-faint" style={{ marginBottom: 8 }}>
              Saving desk check-ins is coming soon. Scanning a pass works now.
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
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
        <div className={FIELD} style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8, marginBottom: query && !picked ? 6 : 12 }}>
          <input
            id="fd-member"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
              setPass(null);
            }}
            placeholder="Search name or member code"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent focus:outline-none text-[13.5px] font-bold text-charcoal placeholder:font-medium placeholder:text-charcoal-faint [html.high-contrast_&]:placeholder:text-charcoal-soft"
          />
          <Search size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />
        </div>
        {query.trim() && !picked && (
          <div role="listbox" aria-label="Members" className="bg-cream-card border border-solid border-th-aea1dc/50 shadow-menu" style={{ borderRadius: 14, padding: 8, marginBottom: 12 }}>
            {shown === null ? (
              <p className="text-[11px] leading-[15px] text-charcoal-faint" style={{ padding: "8px 10px" }}>
                Searching…
              </p>
            ) : shown.length === 0 ? (
              <div style={{ padding: "8px 10px" }}>
                <p className="text-[13px] font-bold leading-[18px] text-charcoal">No member found</p>
                <p className="text-[11px] leading-[15px] text-charcoal-faint">Check the spelling or the member code.</p>
              </div>
            ) : (
              shown.map((m) => (
                <button
                  key={m.membershipId}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setPicked({ ...m, name: m.firstName });
                    setQuery(m.firstName);
                    setPass(m.membershipId);
                  }}
                  className="tap w-full text-start rounded-lg hover:bg-primary-pale"
                  style={{ minHeight: 44, padding: "6px 10px" }}
                >
                  <span className="block text-[13px] font-bold leading-[18px] text-charcoal">{m.firstName}</span>
                  <span className="block text-[11px] leading-[15px] text-charcoal-faint">{resultSub(m)}</span>
                </button>
              ))
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
          disabled={!picked}
          onClick={() => setPassMenu(true)}
          className={clsx(FIELD, "text-start disabled:opacity-60")}
          style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}
        >
          <span className={clsx("flex-1 min-w-0 truncate text-[13.5px]", picked && pass ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>
            {picked && pass ? passLabel(picked) : "Choose a member first"}
          </span>
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />
        </button>
        {refused && (
          <p role="alert" className="text-[11.5px] font-bold leading-[16px] text-status-high" style={{ marginTop: 5 }}>
            No valid pass. Sell a day pass or mark the membership paid.
          </p>
        )}
        <button type="button" onClick={onScanInstead} className="tap text-[12.5px] font-bold text-primary-dark" style={{ minHeight: 44, marginTop: 4 }}>
          Scan a pass instead
        </button>
      </div>
      {picked && (
        <PopupMenu
          open={passMenu}
          anchor={passEl}
          onClose={() => setPassMenu(false)}
          variant="field"
          matchWidth={passEl}
          selected={pass}
          options={[
            { value: picked.membershipId, label: passLabel(picked) },
            // BU2-10: day passes sold at the door are not recorded yet.
            { value: "day-pass", label: "Day pass", disabled: true, note: "Coming soon" },
          ]}
          onSelect={(v) => {
            if (v !== "day-pass") setPass(v);
            setPassMenu(false);
          }}
        />
      )}
    </BottomSheet>
  );
};
