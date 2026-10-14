import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Armchair,
  Bell,
  BellRing,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  ChevronRight,
  Download,
  FileCheck,
  FileText,
  Landmark,
  ListChecks,
  ListOrdered,
  MessageCircle,
  Percent,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { ReferralPopup } from "../../components/profile/ReferralPopup";
import { ReferralLeafIcon, PremiumLeafIcon } from "../../components/icons/MoreLeafIcons";
import { UnreadBadge } from "../../components/messages/UnreadBadge";
import { BizLabel, BizCard, BizRow, RowsSkeleton } from "../../components/business-more/kit";
import { useBusiness } from "../../components/business-more/useBusiness";
import { STAFF_LABEL } from "../../components/business-more/kind";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import {
  fetchLocations,
  fetchPlanRenewal,
  fetchSetupChecklist,
  fetchStoreSettings,
  fetchTeamRows,
  type ChecklistItem,
} from "../../services/business-more";
import { returnsSummary } from "./storePolicyText";

// MO1B-007 / -009 / -010 · the business More (BizMoreV8 screen="index",
// template lines 24 to 26, rows 168 to 175). The client More format with
// section titles and the line (HANDOVER 3.5): Business, Team and access
// (stores: Staff, only with staff), Booking policies (gym: Entry rules;
// store: Orders and policies), Payments and billing, App; then the Centium
// Business card. Rows are 56.6 tall with the 30 r10 #8E7FD0 well and a 14 /
// 1.25 glyph (source icG "14" on the index).
//
// KEPT (MO1B-007 K1–K3): the Messages unread badge, Referral, Settings. The
// venue console is reached from Business Profile › Locations and hours for an
// owner (V6-54); More › Venues stays for staff (professional accounts).
// HIDDEN: "Switch to personal account" until a security review (V6-33).
//
// NOTHING HERE SHOWS A NUMBER THAT ISN'T RECORDED. Counts come from the
// database (team, seats, cancellation window, returns policy); rows whose
// data has no backend yet say "Coming soon" instead of the source's samples.

const PLACEHOLDER = (
  <span aria-hidden className="inline-block align-middle bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16]" style={{ width: 40, height: 10, borderRadius: 5 }} />
);

const fmtRenew = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function BusinessMoreIndex() {
  const navigate = useNavigate();
  const { authUserId, user } = useApp();
  const unread = useUnread();
  const { business, kind, kindKnown } = useBusiness();
  const { plan } = useBusinessPlan();
  const [referralOpen, setReferralOpen] = useState(false);

  const [team, setTeam] = useState<{ accepted: number; total: number } | null>(null);
  const [cancelHours, setCancelHours] = useState<number | null | undefined>(undefined);
  const [returnsLine, setReturnsLine] = useState<string | null | undefined>(undefined);
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);
  const [renews, setRenews] = useState<string | null>(null);

  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchTeamRows(bizId).then((r) => {
      if (!cancelled && r.ok) setTeam({ accepted: r.value.filter((t) => t.acceptedAt).length, total: r.value.length });
    });
    void fetchLocations(bizId).then((r) => {
      if (!cancelled) setCancelHours(r.ok && r.value.length > 0 ? r.value[0].cancellationHours : null);
    });
    void fetchStoreSettings(bizId).then((r) => {
      if (!cancelled) setReturnsLine(r.ok ? returnsSummary(r.value) : null);
    });
    void fetchSetupChecklist(bizId).then((r) => {
      if (!cancelled && r.ok) setChecklist(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId]);

  useEffect(() => {
    if (!authUserId) return;
    void fetchPlanRenewal(authUserId).then((r) => r.ok && setRenews(r.value));
  }, [authUserId]);

  const go = (to: string) => () => navigate(to);
  const sub = (p: string) => go(`/app/business/more/${p}`);

  // D3 · Setup checklist: shown while the Dashboard's Get set up is dismissed
  // and not every item is done; hidden once complete.
  const done = checklist?.filter((c) => c.done).length ?? 0;
  const totalItems = checklist?.length ?? 0;
  const showChecklist = !!checklist && totalItems > 0 && done < totalItems && checklist.some((c) => c.dismissed);

  const hasStaff = (team?.total ?? 0) > 0;
  const showTeam = kind !== "store" || hasStaff;
  const used = team?.accepted ?? 0;
  const totalSeats = plan?.totalSeats ?? 0;

  const wellness = business?.type === "wellness_service" || user.businessType === "wellness_service";

  const businessRows = (
    <>
      {showChecklist && (
        <BizRow
          well="index"
          icon={ListChecks}
          title="Setup checklist"
          desc={`${done} of ${totalItems} done`}
          onClick={go("/app")}
          extra={
            <span aria-hidden className="block bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16] overflow-hidden" style={{ height: 4, borderRadius: 999, marginTop: 6 }}>
              <span className="block h-full bg-th-8e7fd0" style={{ width: `${Math.round((done / totalItems) * 100)}%`, borderRadius: 999 }} />
            </span>
          }
        />
      )}
      <BizRow well="index" icon={Building2} title="Business Profile" desc="Name, photos, locations, ID & listing" onClick={go("/app/business/profile")} />
      <BizRow
        well="index"
        icon={MessageCircle}
        title="Messages"
        desc="Your conversations"
        onClick={go("/app/messages")}
        trailing={<UnreadBadge count={unread.total} />}
        chevron
      />
      <BizRow
        well="index"
        icon={CalendarDays}
        title="Calendar"
        desc={kind === "store" && kindKnown ? "Your events and pop-ups" : "Schedule clients to professionals & classes"}
        onClick={go("/app/business/calendar")}
      />
      <BizRow well="index" icon={ReferralLeafIcon} title="Referral" desc="Share your code, earn rewards" onClick={() => setReferralOpen(true)} />
    </>
  );

  return (
    <div>
      <p className="text-[19px] font-bold tracking-[-0.03em] leading-[28.5px] text-charcoal" style={{ marginBottom: 13 }}>
        More
      </p>

      <BizLabel>Business</BizLabel>
      <BizCard>{businessRows}</BizCard>

      {/* The per-type sections wait for the lane, so a gym never flashes the store rows. */}
      {!kindKnown && <RowsSkeleton rows={4} label="Loading" />}
      {kindKnown && (
      <>

      {showTeam && (
        <>
          <BizLabel>{kind === "store" ? "Staff" : "Team and access"}</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={Users}
              title={STAFF_LABEL[kind]}
              desc={team ? `${used} professional${used === 1 ? "" : "s"}` : PLACEHOLDER}
              onClick={sub("employees")}
            />
            {kind !== "store" && (
              <>
                <BizRow well="index" icon={ShieldCheck} title="Roles and permissions" desc="Who can see and change what" onClick={sub("roles")} />
                <BizRow well="index" icon={UserPlus} title="Join requests" desc="Professionals who used your ID" onClick={sub("join-requests")} />
              </>
            )}
            <BizRow
              well="index"
              icon={Armchair}
              title="Seats"
              desc={plan && team ? (totalSeats > 0 ? `${used} of ${totalSeats} used · add seats` : "No seats yet · add seats") : PLACEHOLDER}
              onClick={sub("seats")}
            />
          </BizCard>
        </>
      )}

      {kind === "classes" && (
        <>
          <BizLabel>Booking policies</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={CalendarX}
              title="Cancellations"
              desc={cancelHours === undefined ? PLACEHOLDER : cancelHours === null ? "Set when you add a location" : `Free until ${cancelHours} hours before`}
              onClick={sub("policies/edit?section=cancellations")}
            />
            <BizRow well="index" icon={CalendarRange} title="Booking window" desc="Coming soon" onClick={sub("policies/edit?section=window")} />
            <BizRow well="index" icon={ListOrdered} title="Waitlist" desc="Coming soon" onClick={sub("policies/edit?section=waitlist")} />
            <BizRow well="index" icon={BellRing} title="Class reminders" desc="Coming soon" onClick={sub("policies/edit?section=reminders")} />
            <BizRow well="index" icon={FileCheck} title="Terms and waivers" desc="Clients accept when booking" onClick={sub("policies")} />
          </BizCard>
        </>
      )}
      {kind === "gym" && (
        <>
          <BizLabel>Entry rules</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={CalendarX}
              title="Cancellations"
              desc={cancelHours === undefined ? PLACEHOLDER : cancelHours === null ? "Set when you add a location" : `Free until ${cancelHours} hours before`}
              onClick={sub("policies/edit?section=cancellations")}
            />
            <BizRow well="index" icon={FileCheck} title="Liability waiver" desc="Accepted once, before the first visit" onClick={sub("policy/waiver")} />
            <BizRow well="index" icon={FileText} title="House rules" desc="Optional" onClick={sub("policy/house_rules")} />
          </BizCard>
        </>
      )}
      {kind === "store" && (
        <>
          <BizLabel>Orders and policies</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={RotateCcw}
              title="Returns and refunds"
              desc={returnsLine === undefined ? PLACEHOLDER : returnsLine ?? "Not set yet"}
              onClick={sub("store-policies")}
            />
            <BizRow well="index" icon={FileCheck} title="Terms clients accept" desc="Shown before checkout" onClick={sub("store-policies")} />
            {wellness && <BizRow well="index" icon={FileCheck} title="Terms and waivers" desc="For appointments" onClick={sub("policy/appointment_waiver")} />}
            {/* v6 Batch 4 (V6-158): services and free slots are set up here. */}
            {wellness && <BizRow well="index" icon={CalendarClock} title="Services and free slots" desc="What clients can book, and when" onClick={go("/app/business/services")} />}
          </BizCard>
        </>
      )}

      </>
      )}

      <BizLabel>Payments and billing</BizLabel>
      <BizCard>
        <BizRow well="index" icon={Wallet} title="Payment methods" desc="Cash · Whish soon" onClick={sub("payment-methods")} />
        <BizRow well="index" icon={Landmark} title="Payouts" desc="Whish payouts are coming" onClick={sub("payouts")} />
        <BizRow well="index" icon={Receipt} title="Invoices and receipts" desc="Coming soon" onClick={sub("invoices")} />
        <BizRow well="index" icon={Percent} title="Taxes" desc="Coming soon" onClick={sub("taxes")} />
      </BizCard>

      <BizLabel>App</BizLabel>
      <BizCard>
        <BizRow well="index" icon={Bell} title="Notifications" desc="Bookings, payments, reviews & more" onClick={sub("notifications")} />
        <BizRow well="index" icon={Download} title="Export reports" desc={kind === "store" && kindKnown ? "Orders, customers, transactions" : "Bookings, members, transactions"} onClick={sub("export")} />
        <BizRow well="index" icon={Settings} title="Settings" desc="Appearance, security, help & legal" onClick={go("/app/settings")} />
      </BizCard>

      {/* MO1B-007 row 13: Centium Business, the paid business plan (BU6-18). */}
      <button
        type="button"
        onClick={sub("subscription")}
        className="tap w-full flex items-center justify-between text-left"
        // Literal #241F1B in both modes, as the client Premium card.
        style={{ gap: 14, borderRadius: 15, padding: "13px 15px", background: "#241F1B", marginBottom: 16 }}
      >
        <span className="flex items-center" style={{ gap: 12 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 11, background: "rgb(var(--th-aea1dc) / .26)" }}>
            <PremiumLeafIcon size={15} style={{ color: "rgb(var(--thi-c8bfe9))" }} />
          </span>
          <span>
            <span className="block text-[12.5px] font-extrabold leading-[18.75px] text-white">Centium Business</span>
            <span className="block text-[10px] leading-[15px] text-white/60">
              {plan?.active
                ? [
                    `${plan.base?.name ?? "Business"} plan`,
                    `${plan.totalSeats} seat${plan.totalSeats === 1 ? "" : "s"}`,
                    renews ? `renews ${fmtRenew(renews)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "See your plan and seats"}
            </span>
          </span>
        </span>
        <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" style={{ color: "rgb(var(--thi-c8bfe9))" }} />
      </button>

      <ReferralPopup open={referralOpen} onClose={() => setReferralOpen(false)} />
    </div>
  );
}
