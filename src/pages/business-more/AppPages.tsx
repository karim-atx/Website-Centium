import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, EyeOff, Eye, FileCheck, FileText, KeyRound, Laptop, LifeBuoy, LogOut, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import { BizButton, BizConfirm, BizLabel, BizNote, BizPage, BizRow, BizSection, LoadError, RowsSkeleton } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { useBusiness } from "../../components/business-more/useBusiness";
import { ChangePasswordSheet } from "../../components/profile/ChangePasswordSheet";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";
import { getMfaStatus } from "../../services/mfa";
import { getRecoveryStatus } from "../../services/recoveryCodes";
import { setBusinessPaused, signOutOtherSessions } from "../../services/business-more";
import { formatShortDate } from "../../utils/date";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { fetchBusinessFamilies, setBusinessFamily, type BusinessFamily, type BusinessFamilyPrefs } from "../../services/business-more/notifications";

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
// Export reports (BACKEND BU6-21: no export readers yet)

export function ExportPage() {
  const { kind, laneSettled } = useBusiness();
  const store = kind === "store";
  const reports = store
    ? [
        ["Orders", "Every order with products, date and status"],
        ["Customers", "Join dates and order counts"],
        ["Transactions", "Payments, refunds and methods"],
      ]
    : [
        ["Bookings", "Every booking with class, date and status"],
        ["Members", "Plans, join dates and status"],
        ["Transactions", "Payments, refunds and methods"],
      ];
  const [report, setReport] = useState(0);
  const [range, setRange] = useState(0);
  const [format, setFormat] = useState(0);
  return (
    <BizPage title="Export reports" sub="Download a spreadsheet of your data.">
      {laneSettled ? (
        <BizSection label="Report">
          {reports.map(([t, d], i) => (
            <BizRow key={t} title={t} desc={d} radio={{ selected: report === i }} onClick={() => setReport(i)} />
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
          <BizRow key={t} title={t} radio={{ selected: range === i }} onClick={() => setRange(i)} />
        ))}
      </BizSection>
      <BizSection label="Format">
        {["CSV (Excel, Google Sheets)", "PDF summary"].map((t, i) => (
          <BizRow key={t} title={t} radio={{ selected: format === i }} onClick={() => setFormat(i)} />
        ))}
      </BizSection>
      <BizButton label="Download report" disabled />
      <p className="text-center text-[11px] leading-[16px] text-charcoal-faint" style={{ marginTop: 8 }}>
        Downloads are coming soon.
      </p>
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
// Deactivate or delete (V6-35: Deactivate + the reversible 30-day deletion;
// no typed-DELETE immediate deletion)

const fmtDate = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

export function DeactivatePage() {
  const { business, setBusiness, error, reload } = useBusiness();
  const [toast, showToast] = useBizToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const paused = !!business?.deactivatedAt;

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
      <BizSection label="Deactivate">
        {paused ? (
          <BizRow
            icon={Eye}
            title="Reactivate business"
            desc={`Deactivated ${fmtDate(business!.deactivatedAt!)}. Bookings resume; turn Show on Explore back on to be listed.`}
            value="Reactivate"
            onClick={() => setAsk(true)}
            disabled={!business}
          />
        ) : (
          <BizRow
            icon={EyeOff}
            title="Deactivate business"
            desc="Hide your listing and pause bookings. Your data stays."
            value="Deactivate"
            onClick={() => setAsk(true)}
            disabled={!business}
          />
        )}
      </BizSection>
      <BizSection label="Delete">
        <BizRow
          icon={Trash2}
          danger
          title="Delete business account"
          desc="Removes the business, its listing and team access. Members keep their personal accounts."
          onClick={() => setDeleteOpen(true)}
        />
      </BizSection>
      <BizConfirm
        open={ask}
        icon={paused ? Eye : EyeOff}
        title={paused ? `Reactivate ${business?.name ?? "your business"}?` : `Deactivate ${business?.name ?? "your business"}?`}
        body={paused ? "Bookings open again. Your listing stays hidden until you turn Show on Explore back on." : "Your listing is hidden and new bookings pause. You can reactivate at any time."}
        action={paused ? "Reactivate" : "Deactivate"}
        cancel="Cancel"
        busy={busy}
        onAction={() => void apply()}
        onCancel={() => setAsk(false)}
      />
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} business />
      {toast}
    </BizPage>
  );
}

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
