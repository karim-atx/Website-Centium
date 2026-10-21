import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, DoorClosed, EyeOff, Eye, FileCheck, FileText, KeyRound, Laptop, LifeBuoy, LogOut, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import { BizButton, BizConfirm, BizLabel, BizNote, BizPage, BizRow, BizSection, LoadError, RowsSkeleton } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { useBusiness } from "../../components/business-more/useBusiness";
import { ChangePasswordSheet } from "../../components/profile/ChangePasswordSheet";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";
import { getMfaStatus } from "../../services/mfa";
import { getRecoveryStatus } from "../../services/recoveryCodes";
import { PAUSE_OWNER_ONLY, setBusinessPaused, signOutOtherSessions } from "../../services/business-more";
import { CLOSE_OWNER_ONLY } from "../../services/business-closure";
import { CloseBusinessSheet } from "./CloseBusinessSheet";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { formatShortDate } from "../../utils/date";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { fetchBusinessFamilies, setBusinessFamily, type BusinessFamily, type BusinessFamilyPrefs } from "../../services/business-more/notifications";
import { CustomRangeSheet } from "../business-analytics/CustomRangeSheet";
import { dayMonth, isoOf } from "../business-analytics/analyticsRange";
import { buildExport, exportFileName, presetExportRange, saveCsv, type ExportKind, type ExportRange } from "./exportReports";

// OURS-MO1B-notifications, -export, -security, -deactivate, -business-terms
// (BizMoreV8 screen="notifications" / "export" / "security" / "account").

// ---------------------------------------------------------------------------
// Notifications: the six business families (Database B4, app_preferences
// notification_business_*). The server reads them by family, not by kind, so
// each section is one switch for its family (the source's per-event switches
// would each have to share one column). Flagged reviews stay always on for
// safety. How you're told, and quiet hours, stay the live Notifications page
// (KEEP-RESTYLE).

export function BusinessNotificationsPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const { kind, laneSettled } = useBusiness();
  const online = useOnline();
  const [toast, showToast] = useBizToast();
  const [prefs, setPrefs] = useState<BusinessFamilyPrefs | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<BusinessFamily | null>(null);
  const [tick, setTick] = useState(0);
  const store = kind === "store";

  useEffect(() => {
    let cancelled = false;
    void fetchBusinessFamilies().then((r) => {
      if (cancelled) return;
      if (r.ok) setPrefs(r.value);
      else setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const flip = (family: BusinessFamily) => async (next: boolean) => {
    if (!authUserId || !prefs || saving) return;
    const before = prefs;
    setPrefs({ ...prefs, [family]: next });
    setSaving(family);
    const r = await setBusinessFamily(authUserId, family, next);
    setSaving(null);
    if (r.ok) setPrefs(r.value);
    else {
      setPrefs(before);
      showToast(r.message);
    }
  };
  const sw = (family: BusinessFamily, label: string) =>
    prefs ? { checked: prefs[family], onChange: flip(family), disabled: !online || saving !== null, label } : undefined;

  return (
    <BizPage title="Notifications" sub="Choose what you're told about, and how.">
      {error && (
        <LoadError
          onRetry={() => {
            setError(false);
            setTick((t) => t + 1);
          }}
        />
      )}
      {/* The sections differ per lane: held on the skeleton until it is known. */}
      {!error && (!prefs || !laneSettled) && <RowsSkeleton rows={5} label="Loading notifications" />}
      {prefs && laneSettled && (
        <>
          <BizSection label={store ? "Orders" : "Bookings"}>
            {store ? (
              <BizRow title="Orders" desc="New orders and returns" toggle={sw("orders", "Orders")} />
            ) : (
              <>
                <BizRow title="Bookings" desc="New bookings, cancellations and classes under 40% booked" toggle={sw("bookings", "Bookings")} />
                <BizRow title="Members" desc="New members and renewals" toggle={sw("members", "Members")} />
              </>
            )}
          </BizSection>
          {!store && (
            <BizSection label="Team">
              <BizRow title="Team" desc="Join requests and substitute requests" toggle={sw("team", "Team")} />
            </BizSection>
          )}
          <BizSection label="Payments">
            <BizRow title="Payments" desc="Money owed, weekly summary" toggle={sw("payments", "Payments")} />
          </BizSection>
          <BizSection label="Reputation">
            <BizRow title="New reviews" toggle={sw("reviews", "New reviews")} />
            <BizRow title="Flagged reviews" desc="Always on for safety" toggle={{ checked: true, onChange: () => undefined, disabled: true }} dim />
          </BizSection>
        </>
      )}
      <BizSection label="How you're told">
        <BizRow icon={BellRing} title="Push, email and quiet hours" desc="Allow notifications on this device" onClick={() => navigate("/app/settings/notifications")} />
      </BizSection>
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Export reports (OURS-MO1B-export; DI-06: built in the browser from the
// existing readers, exportReports.ts). Bookings (no bookings list reader) and
// the PDF summary are not offered.

export function ExportPage() {
  const { business, kind, laneSettled } = useBusiness();
  const online = useOnline();
  const [toast, showToast] = useBizToast();
  const store = kind === "store";
  const reports: [ExportKind, string, string][] = store
    ? [
        ["orders", "Orders", "Every order with products, date and status"],
        ["customers", "Customers", "Join dates and order counts"],
        ["transactions", "Transactions", "Payments, refunds and methods"],
      ]
    : [
        ["members", "Members", "Plans, join dates and status"],
        ["transactions", "Transactions", "Payments, refunds and methods"],
      ];
  const [report, setReport] = useState(0);
  const [range, setRange] = useState(0);
  const [custom, setCustom] = useState<ExportRange | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const picked = reports[Math.min(report, reports.length - 1)];
  const chosenRange: ExportRange | null = range === 0 ? presetExportRange("30d") : range === 1 ? presetExportRange("year") : custom;
  const canDownload = laneSettled && !!business && !!chosenRange && online && !busy;

  const download = async () => {
    if (!canDownload || !business || !chosenRange) return;
    setBusy(true);
    setFailed(false);
    const r = await buildExport(business.id, picked[0], chosenRange);
    setBusy(false);
    if (!r.ok) {
      setFailed(true);
      return;
    }
    const file = exportFileName(picked[0], chosenRange);
    saveCsv(file, r.rows);
    showToast(`${file} downloaded.`);
  };

  const today = isoOf(new Date());
  return (
    <BizPage title="Export reports" sub="Download a spreadsheet of your data." offline>
      {laneSettled ? (
        <BizSection label="Report">
          {reports.map(([k, t, d], i) => (
            <BizRow key={k} title={t} desc={d} radio={{ selected: report === i }} onClick={() => setReport(i)} />
          ))}
        </BizSection>
      ) : (
        // The reports differ per lane: held on the skeleton until it is known.
        <>
          <BizLabel>Report</BizLabel>
          <RowsSkeleton rows={3} label="Loading reports" />
        </>
      )}
      <BizSection label="Range">
        {["Last 30 days", "This year", "Custom range"].map((t, i) => (
          <BizRow
            key={t}
            title={t}
            desc={i === 2 && custom ? `${dayMonth(custom.from, today)} to ${dayMonth(custom.to, today)}` : undefined}
            radio={{ selected: range === i }}
            onClick={() => {
              setRange(i);
              // Custom range: the AN1 range sheet.
              if (i === 2) setSheetOpen(true);
            }}
          />
        ))}
      </BizSection>
      <BizSection label="Format">
        <BizRow title="CSV (Excel, Google Sheets)" radio={{ selected: true }} />
      </BizSection>
      {failed && <LoadError onRetry={() => void download()} />}
      <BizButton label="Download report" busy={busy} disabled={!canDownload} onClick={() => void download()} />
      <CustomRangeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={{ key: "custom", ...(custom ?? presetExportRange("30d")), compare: false }}
        onApply={(r) => {
          setCustom({ from: r.from, to: r.to });
          setSheetOpen(false);
        }}
      />
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Security (sessions: BACKEND BU6-16 for the list; sign-out-others is live)

function thisDevice(): { label: string; phone: boolean } {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "this device";
  return { label: `${browser} on ${os}`, phone: /iPhone|Android/.test(ua) };
}

export function SecurityPage() {
  const navigate = useNavigate();
  const [toast, showToast] = useBizToast();
  const [pwOpen, setPwOpen] = useState(false);
  const [twofa, setTwofa] = useState<boolean | null>(null);
  const [codes, setCodes] = useState<{ left: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const device = thisDevice();

  useEffect(() => {
    let cancelled = false;
    void getMfaStatus().then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      const on = r.data.factors.length > 0;
      setTwofa(on);
      if (on) void getRecoveryStatus().then((c) => !cancelled && c.ok && setCodes({ left: c.value.remaining, total: c.value.total }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BizPage title="Security" sub="Keep your business account safe.">
      {error && <LoadError onRetry={() => window.location.reload()} />}
      <BizSection label="Sign in">
        <BizRow icon={KeyRound} title="Password" value="Change" onClick={() => setPwOpen(true)} />
        <BizRow
          title="Two-factor authentication"
          desc="Authenticator app"
          toggle={{ checked: !!twofa, disabled: twofa === null, onChange: () => navigate("/app/settings/two-factor") }}
        />
        {twofa && (
          <BizRow
            icon={LifeBuoy}
            title="Recovery codes"
            desc={codes ? `${codes.left} of ${codes.total} left` : undefined}
            value="View"
            onClick={() => navigate("/app/settings/two-factor")}
          />
        )}
      </BizSection>
      <BizSection label="Active sessions" footer="Your other devices will be listed here soon.">
        <BizRow icon={device.phone ? Smartphone : Laptop} title={`${device.label} · this device`} desc="Now" />
        <BizRow icon={LogOut} title="Sign out everywhere else" desc="Every other device has to sign in again" onClick={() => setAsk(true)} />
      </BizSection>
      <ChangePasswordSheet key={pwOpen ? "pw-open" : "pw-closed"} open={pwOpen} onClose={() => setPwOpen(false)} />
      <BizConfirm
        open={ask}
        icon={LogOut}
        title="Sign out everywhere else?"
        body="Every other phone and browser signed in to this account is signed out. This device stays signed in."
        action="Sign out others"
        cancel="Cancel"
        busy={busy}
        onCancel={() => setAsk(false)}
        onAction={async () => {
          setBusy(true);
          const r = await signOutOtherSessions();
          setBusy(false);
          setAsk(false);
          showToast(r.ok ? "Signed out everywhere else." : r.message);
        }}
      />
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// Deactivate, close or delete (V6-35: Deactivate + the reversible 30-day
// deletion; no typed-DELETE immediate deletion). CP (Database 20261130000000):
// Close is the third, permanent state, owner only. Pausing (deactivate) stops
// NEW business (bookings, sales, code redemptions, join requests) while
// members still check in and staff can still be invited; closing stops
// everything. Neither deletes anything.

const fmtDate = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

export function DeactivatePage() {
  const { business, setBusiness, error, reload } = useBusiness();
  const [toast, showToast] = useBizToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const paused = !!business?.deactivatedAt;
  const closed = !!business?.closedAt;
  // B15: set_business_paused is the owner's only, and so is close_business. Staff see the state, not the control.
  const access = useConsoleAccess();
  const owner = access.isOwner || (!access.isStaff && !!business);

  const apply = async () => {
    if (!business) return;
    setBusy(true);
    const r = await setBusinessPaused(business.id, !paused);
    setBusy(false);
    setAsk(false);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    // Pausing also hides the listing; resuming leaves Show on Explore as it is (B5).
    setBusiness({ ...business, deactivatedAt: r.value, active: paused ? business.active : false });
    showToast(paused ? "Your business is active again." : "Your business is deactivated.");
  };

  return (
    <BizPage title="Deactivate or delete" sub="Choose what happens to your business on Centium.">
      {error && <LoadError onRetry={reload} />}
      {closed ? (
        <BizSection label="Closed" footer={business!.closureReason ? `Reason: ${business!.closureReason}` : undefined}>
          <BizRow
            icon={DoorClosed}
            title="Business closed"
            desc={`Closed ${fmtDate(business!.closedAt!)}. Nothing was deleted: members keep their records, receipts, bookings and reviews. It takes no new bookings, sales, memberships, check-ins, staff invites or join requests, and it isn't on Explore.`}
          />
        </BizSection>
      ) : (
        <>
          <BizSection label="Deactivate">
            {paused ? (
              <BizRow
                icon={Eye}
                title="Reactivate business"
                desc={owner ? `Deactivated ${fmtDate(business!.deactivatedAt!)}. New bookings and sales resume; turn Show on Explore back on to be listed.` : `Deactivated ${fmtDate(business!.deactivatedAt!)}. ${PAUSE_OWNER_ONLY}`}
                value={owner ? "Reactivate" : undefined}
                onClick={() => setAsk(true)}
                disabled={!business || !owner}
              />
            ) : (
              <BizRow
                icon={EyeOff}
                title="Deactivate business"
                desc={owner ? PAUSE_DESC : PAUSE_OWNER_ONLY}
                value={owner ? "Deactivate" : undefined}
                onClick={() => setAsk(true)}
                disabled={!business || !owner}
              />
            )}
          </BizSection>
          <BizSection label="Close">
            <BizRow
              icon={DoorClosed}
              danger={owner}
              title="Close business"
              desc={owner ? "For good: no new activity of any kind, and no reopening. Nothing is deleted." : CLOSE_OWNER_ONLY}
              onClick={() => setCloseOpen(true)}
              disabled={!business || !owner}
            />
          </BizSection>
        </>
      )}
      <BizSection label="Delete">
        <BizRow
          icon={Trash2}
          danger
          title="Delete business account"
          desc="Deletes your account after 30 days. Your business closes then; nothing in it is deleted, and members keep their records."
          onClick={() => setDeleteOpen(true)}
        />
      </BizSection>
      <BizConfirm
        open={ask}
        icon={paused ? Eye : EyeOff}
        title={paused ? `Reactivate ${business?.name ?? "your business"}?` : `Deactivate ${business?.name ?? "your business"}?`}
        body={
          paused
            ? "New bookings and sales open again. Your listing stays hidden until you turn Show on Explore back on."
            : "Your listing is hidden, and new bookings, sales, code redemptions and join requests stop. Members still check in and keep their memberships, and you can still invite staff. You can reactivate at any time."
        }
        action={paused ? "Reactivate" : "Deactivate"}
        cancel="Cancel"
        busy={busy}
        onAction={() => void apply()}
        onCancel={() => setAsk(false)}
      />
      {business && owner && !closed && (
        <CloseBusinessSheet
          open={closeOpen}
          businessId={business.id}
          businessName={business.name}
          onClose={() => setCloseOpen(false)}
          onClosed={(closedAt, reason) => {
            // close_business also takes the listing off Explore (active = false).
            setBusiness({ ...business, closedAt, closureReason: reason, active: false });
            setCloseOpen(false);
            showToast("Your business is closed.");
          }}
        />
      )}
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} business />
      {toast}
    </BizPage>
  );
}

/** What pausing does since CP: new business stops, existing members and hiring carry on. */
const PAUSE_DESC = "Hide your listing and stop new bookings, sales, code redemptions and join requests. Members still check in and keep their memberships, and you can still invite staff.";

// ---------------------------------------------------------------------------
// Business terms and waivers (Settings › General)

export function BusinessTermsPage() {
  const navigate = useNavigate();
  const { kind: lane, kindKnown, business } = useBusiness();
  // Per-type rows only once the lane is known (bizKindOf falls back to "store").
  const kind = kindKnown ? lane : null;
  const wellness = business?.type === "wellness_service";
  return (
    <BizPage title="Business terms and waivers">
      <BizSection>
        <BizRow icon={FileText} title="Centium business terms" desc="The terms for business accounts" onClick={() => navigate("/app/settings/terms#business")} />
        {kind && kind !== "store" && <BizRow icon={FileCheck} title="Your liability waiver" onClick={() => navigate("/app/business/more/policy/waiver")} />}
        {kind === "classes" && <BizRow icon={FileText} title="Your class terms" onClick={() => navigate("/app/business/more/policy/class_terms")} />}
        {kind === "gym" && <BizRow icon={FileText} title="Your house rules" onClick={() => navigate("/app/business/more/policy/house_rules")} />}
        {kind === "store" && <BizRow icon={RotateCcw} title="Your returns policy" onClick={() => navigate("/app/business/more/store-policies")} />}
        {wellness && <BizRow icon={FileCheck} title="Your appointment waiver" onClick={() => navigate("/app/business/more/policy/appointment_waiver")} />}
      </BizSection>
      <BizNote>Your policies and waivers are yours. Centium shows them to clients before they book or buy.</BizNote>
    </BizPage>
  );
}
