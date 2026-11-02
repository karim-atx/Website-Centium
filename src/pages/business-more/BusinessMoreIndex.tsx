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
  SHOW_ON_EXPLORE_ITEM,
  type ChecklistItem,
} from "../../services/business-more";
import { returnsSummary } from "./storePolicyText";
import { formatShortDate } from "../../utils/date";
import { t, tn } from "../../i18n/core";
import { fetchJoinRequests } from "../../services/business-team/team";
import { fetchBookingPolicies } from "../../services/business-classes/schedule";
import { effectiveRules, policyFor, type BookingPolicy } from "../../services/business-classes/scheduleRules";

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

const fmtRenew = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

export default function BusinessMoreIndex() {
  const navigate = useNavigate();
  const { authUserId, user } = useApp();
  const unread = useUnread();
  const { business, kind, kindKnown } = useBusiness();
  const { plan } = useBusinessPlan();
  const [referralOpen, setReferralOpen] = useState(false);

  const [team, setTeam] = useState<{ accepted: number; total: number } | null>(null);
  const [venueHours, setVenueHours] = useState<number | null | undefined>(undefined);
  // B9 (CL-05) business_booking_policies: the business default row outranks the venue's window.
  const [policies, setPolicies] = useState<BookingPolicy[] | null | undefined>(undefined);
  const [returnsLine, setReturnsLine] = useState<string | null | undefined>(undefined);
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);
  const [renews, setRenews] = useState<string | null>(null);
  const [joinCount, setJoinCount] = useState(0);

  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchTeamRows(bizId).then((r) => {
      if (!cancelled && r.ok) setTeam({ accepted: r.value.filter((t) => t.acceptedAt).length, total: r.value.length });
    });
    void fetchLocations(bizId).then((r) => {
      if (!cancelled) setVenueHours(r.ok && r.value.length > 0 ? r.value[0].cancellationHours : null);
    });
    void fetchBookingPolicies(bizId).then((r) => {
      if (!cancelled) setPolicies(r.ok ? r.value : null);
    });
    void fetchStoreSettings(bizId).then((r) => {
      if (!cancelled) setReturnsLine(r.ok ? returnsSummary(r.value) : null);
    });
    // B6 business_join_requests (members permission): the waiting count for the badge.
    void fetchJoinRequests(bizId).then((r) => {
      if (!cancelled && r.ok) setJoinCount(r.value.length);
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

  // The values the Booking policies screen (PoliciesPages) edits; undefined while loading.
  const rules = policies === undefined || venueHours === undefined ? undefined : effectiveRules(policies ?? [], null, venueHours);
  const cancelHours = rules === undefined ? undefined : (policies ? policyFor(policies, null)?.cancellationHours : null) ?? venueHours;
  const windowLine = rules === undefined ? PLACEHOLDER : tn(rules.bookingWindowDays, "Up to {n} day ahead", "Up to {n} days ahead");
  const waitlistLine = rules === undefined ? PLACEHOLDER : rules.waitlistCap > 0 ? tn(rules.waitlistCap, "On · up to {n} person", "On · up to {n} people") : t("Off");

  const go = (to: string) => () => navigate(to);
  const sub = (p: string) => go(`/app/business/more/${p}`);

  // D3 · Setup checklist: shown while the Dashboard's Get set up is dismissed
  // and not every item is done; hidden once complete. B7: Show on Explore is
  // an item (new businesses start hidden), and while the listing is off the
  // row shows whatever was dismissed, saying so.
  const done = checklist?.filter((c) => c.done).length ?? 0;
  const totalItems = checklist?.length ?? 0;
  const hidden = !!checklist?.some((c) => c.item === SHOW_ON_EXPLORE_ITEM && !c.done);
  const showChecklist = !!checklist && totalItems > 0 && done < totalItems && (hidden || checklist.some((c) => c.dismissed));

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
          title={t("Setup checklist")}
          desc={hidden ? t("{done} of {total} done · Show on Explore is off", { done, total: totalItems }) : t("{done} of {total} done", { done, total: totalItems })}
          onClick={go(hidden ? "/app/business/profile" : "/app")}
          extra={
            <span aria-hidden className="block bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16] overflow-hidden" style={{ height: 4, borderRadius: 999, marginTop: 6 }}>
              <span className="block h-full bg-th-8e7fd0" style={{ width: `${Math.round((done / totalItems) * 100)}%`, borderRadius: 999 }} />
            </span>
          }
        />
      )}
      <BizRow well="index" icon={Building2} title={t("Business Profile")} desc={t("Name, photos, locations, ID & listing")} onClick={go("/app/business/profile")} />
      <BizRow
        well="index"
        icon={MessageCircle}
        title={t("Messages")}
        desc={t("Your conversations")}
        onClick={go("/app/messages")}
        trailing={<UnreadBadge count={unread.total} />}
        chevron
      />
      <BizRow
        well="index"
        icon={CalendarDays}
        title={t("Calendar")}
        desc={kind === "store" && kindKnown ? t("Your events and pop-ups") : t("Schedule clients to professionals & classes")}
        onClick={go("/app/business/calendar")}
      />
      <BizRow well="index" icon={ReferralLeafIcon} title={t("Referral")} desc={t("Share your code, earn rewards")} onClick={() => setReferralOpen(true)} />
    </>
  );

  return (
    <div>
      <p className="text-[19px] font-bold tracking-[-0.03em] leading-[28.5px] text-charcoal" style={{ marginBottom: 13 }}>
        {t("More")}
      </p>

      <BizLabel>{t("Business")}</BizLabel>
      <BizCard>{businessRows}</BizCard>

      {/* The per-type sections wait for the lane, so a gym never flashes the store rows. */}
      {!kindKnown && <RowsSkeleton rows={4} label={t("Loading")} />}
      {kindKnown && (
      <>

      {showTeam && (
        <>
          <BizLabel>{kind === "store" ? t("Staff") : t("Team and access")}</BizLabel>
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
                <BizRow well="index" icon={ShieldCheck} title={t("Roles and permissions")} desc={t("Who can see and change what")} onClick={sub("roles")} />
                <BizRow well="index" icon={UserPlus} title={t("Join requests")} desc={t("Professionals who used your ID")} badge={joinCount > 0 ? joinCount : undefined} onClick={sub("join-requests")} />
              </>
            )}
            <BizRow
              well="index"
              icon={Armchair}
              title={t("Seats")}
              desc={plan && team ? (totalSeats > 0 ? t("{used} of {total} used · add seats", { used, total: totalSeats }) : t("No seats yet · add seats")) : PLACEHOLDER}
              onClick={sub("seats")}
            />
          </BizCard>
        </>
      )}

      {kind === "classes" && (
        <>
          <BizLabel>{t("Booking policies")}</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={CalendarX}
              title={t("Cancellations")}
              desc={cancelHours === undefined ? PLACEHOLDER : cancelHours === null ? t("Set when you add a location") : tn(cancelHours, "Free until {n} hour before", "Free until {n} hours before")}
              onClick={sub("policies/edit?section=cancellations")}
            />
            <BizRow well="index" icon={CalendarRange} title={t("Booking window")} desc={windowLine} onClick={sub("policies/edit?section=window")} />
            <BizRow well="index" icon={ListOrdered} title={t("Waitlist")} desc={waitlistLine} onClick={sub("policies/edit?section=waitlist")} />
            <BizRow well="index" icon={BellRing} title={t("Class reminders")} desc={t("Coming soon")} onClick={sub("policies/edit?section=reminders")} />
            <BizRow well="index" icon={FileCheck} title={t("Terms and waivers")} desc={t("Clients accept when booking")} onClick={sub("policies")} />
          </BizCard>
        </>
      )}
      {kind === "gym" && (
        <>
          <BizLabel>{t("Entry rules")}</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={CalendarX}
              title={t("Cancellations")}
              desc={cancelHours === undefined ? PLACEHOLDER : cancelHours === null ? t("Set when you add a location") : tn(cancelHours, "Free until {n} hour before", "Free until {n} hours before")}
              onClick={sub("policies/edit?section=cancellations")}
            />
            <BizRow well="index" icon={FileCheck} title={t("Liability waiver")} desc={t("Accepted once, before the first visit")} onClick={sub("policy/waiver")} />
            <BizRow well="index" icon={FileText} title={t("House rules")} desc={t("Optional")} onClick={sub("policy/house_rules")} />
          </BizCard>
        </>
      )}
      {kind === "store" && (
        <>
          <BizLabel>{t("Orders and policies")}</BizLabel>
          <BizCard>
            <BizRow
              well="index"
              icon={RotateCcw}
              title={t("Returns and refunds")}
              desc={returnsLine === undefined ? PLACEHOLDER : returnsLine ?? t("Not set yet")}
              onClick={sub("store-policies")}
            />
            <BizRow well="index" icon={FileCheck} title={t("Terms clients accept")} desc={t("Shown before checkout")} onClick={sub("store-policies")} />
            {wellness && <BizRow well="index" icon={FileCheck} title={t("Terms and waivers")} desc={t("For appointments")} onClick={sub("policy/appointment_waiver")} />}
            {/* v6 Batch 4 (V6-158): services and free slots are set up here. */}
            {wellness && <BizRow well="index" icon={CalendarClock} title={t("Services and free slots")} desc={t("What clients can book, and when")} onClick={go("/app/business/services")} />}
          </BizCard>
        </>
      )}

      </>
      )}

      <BizLabel>{t("Payments and billing")}</BizLabel>
      <BizCard>
        <BizRow well="index" icon={Wallet} title={t("Payment methods")} desc={t("Cash · Whish soon")} onClick={sub("payment-methods")} />
        <BizRow well="index" icon={Landmark} title={t("Payouts")} desc={t("Whish payouts are coming")} onClick={sub("payouts")} />
        <BizRow well="index" icon={Receipt} title={t("Invoices and receipts")} desc={t("Coming soon")} onClick={sub("invoices")} />
        <BizRow well="index" icon={Percent} title={t("Taxes")} desc={t("Coming soon")} onClick={sub("taxes")} />
      </BizCard>

      <BizLabel>{t("App")}</BizLabel>
      <BizCard>
        <BizRow well="index" icon={Bell} title={t("Notifications")} desc={t("Bookings, payments, reviews & more")} onClick={sub("notifications")} />
        <BizRow well="index" icon={Download} title={t("Export reports")} desc={kind === "store" && kindKnown ? t("Orders, customers, transactions") : t("Bookings, members, transactions")} onClick={sub("export")} />
        <BizRow well="index" icon={Settings} title={t("Settings")} desc={t("Appearance, security, help & legal")} onClick={go("/app/settings")} />
      </BizCard>

      {/* MO1B-007 row 13: Centium Business, the paid business plan (BU6-18). */}
      <button
        type="button"
        onClick={sub("subscription")}
        className="tap w-full flex items-center justify-between text-start"
        // Literal #241F1B in both modes, as the client Premium card.
        style={{ gap: 14, borderRadius: 15, padding: "13px 15px", background: "#241F1B", marginBottom: 16 }}
      >
        <span className="flex items-center" style={{ gap: 12 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 11, background: "rgb(var(--th-aea1dc) / .26)" }}>
            <PremiumLeafIcon size={15} style={{ color: "rgb(var(--thi-c8bfe9))" }} />
          </span>
          <span>
            <span className="block text-[12.5px] font-extrabold leading-[18.75px] text-white">{"Centium Business"}</span>
            <span className="block text-[10px] leading-[15px] text-white/60">
              {plan?.active
                ? [
                    plan.base?.name ? t("{plan} plan", { plan: plan.base.name }) : t("Business plan"),
                    tn(plan.totalSeats, "{n} seat", "{n} seats"),
                    renews ? t("renews {date}", { date: fmtRenew(renews) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : t("See your plan and seats")}
            </span>
          </span>
        </span>
        <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" style={{ color: "rgb(var(--thi-c8bfe9))" }} />
      </button>

      <ReferralPopup open={referralOpen} onClose={() => setReferralOpen(false)} />
    </div>
  );
}
