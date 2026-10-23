import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  Banknote,
  Bell,
  CalendarRange,
  CalendarX,
  ClipboardList,
  Clock,
  Dumbbell,
  FlaskConical,
  Globe2,
  HeartPulse,
  Ruler,
  Scale,
  Timer,
  UserX,
  Users,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../../components/ui/SettingsRows";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { useApp } from "../../../context/AppContext";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { AUDIENCE, BookingSheet, windowLabel, type BookingSheetKind } from "../../../components/pro/calendar/BookingSheets";
import { remindersLabel, type AlertValue } from "../../../components/pro/calendar/calendarModel";
import {
  DEFAULT_POLICY,
  fetchBookingPolicy,
  fetchMyHandle,
  fetchReminderDefaults,
  saveBookingPolicy,
  type BookingPolicy,
} from "../../../services/pro/calendar";
import {
  fetchPracticeSettings,
  saveDataRequests,
  saveInvoiceDetails,
  type AccessCategory,
  type InvoiceDetails,
} from "../../../services/pro/practice";
import { DobInline } from "../../../components/profile/DobInline";
import { fetchMyProfile, listingNeedsDateOfBirth, NEEDS_DOB, setPublicListing, type ProfessionalProfile } from "../../../services/professional-profile";
import { fetchGoLiveStatus } from "../../../services/professional-onboarding";
import { isRegulated, proKindOf } from "../../onboarding/pro/proModel";
import type { LicenceStatus } from "../../../services/professional-cv";
import { textPx } from "../../../theme/textSize";

/**
 * Release 3 W6 · Settings › Practice (/app/more/practice/*), MO23 v3
 * (source/gen r16.js bookingDefaults16, dataRequests16) and the two rows the
 * frames don't open (Invoice details; Public listing, moved here from
 * the old listing sheet by FINAL_PLAN W6).
 */
export default function PracticeSettings() {
  return (
    <Routes>
      <Route path="booking-defaults" element={<BookingDefaults />} />
      <Route path="data-requests" element={<DataRequests />} />
      <Route path="invoice" element={<InvoicePage />} />
      <Route path="listing" element={<ListingPage />} />
      <Route path="*" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 12 }}>{children}</p>
);

// ---------------------------------------------------------------------------
// Booking defaults (MO23 v3): the practice-wide booking policy
// (professional_booking_policies) and the two default reminders
// (practice_settings), the same rows W4's Calendar › Availability writes, in
// the frame's three groups. Each row opens W4's sheet for that policy.
// ---------------------------------------------------------------------------

const hours = (h: number) => (h === 0 ? "No notice" : h % 24 === 0 && h >= 48 ? `${h / 24} days` : `${h} hour${h === 1 ? "" : "s"}`);
const charge = (p: number) => (p === 0 ? "No charge" : p === 50 ? "Half the session price" : p === 100 ? "Full session price" : `${p}% of the session price`);

function BookingDefaults() {
  const navigate = useNavigate();
  const { authUserId: me } = useApp();
  const [policy, setPolicy] = useState<BookingPolicy | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [reminders, setReminders] = useState<{ alert: AlertValue; alert2: AlertValue }>({ alert: "hour_1", alert2: "none" });
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [sheet, setSheet] = useState<BookingSheetKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const [po, ha, re] = await Promise.all([fetchBookingPolicy(me), fetchMyHandle(me), fetchReminderDefaults(me)]);
    if (po.ok) setPolicy(po.data);
    if (ha.ok) setHandle(ha.data);
    if (re.ok) setReminders({ alert: re.data.alert as AlertValue, alert2: re.data.alert2 as AlertValue });
    setState(po.ok && re.ok ? "ok" : !po.ok && po.offline ? "offline" : "error");
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCharge = async (key: "lateCancelPct" | "noShowPct", on: boolean) => {
    if (!me || !policy) return;
    const next = { ...policy, [key]: on ? (key === "lateCancelPct" ? 50 : 100) : 0 };
    setPolicy(next);
    const r = await saveBookingPolicy(me, next);
    if (!r.ok) {
      setPolicy(policy);
      setToast(r.message);
    }
  };

  const p = policy ?? DEFAULT_POLICY;
  return (
    <div>
      <PageHeader title="Booking defaults" showBack tightBack />
      <SettingsBody className="-mt-3">
        {state === "loading" && !policy ? (
          <ListSkeleton rows={4} />
        ) : state === "error" && !policy ? (
          <ProError onRetry={() => void load()} />
        ) : (
          <>
            {state === "offline" && <OfflineLine />}
            <SettingsSection label="New bookings">
              <SettingsRow icon={Clock} title="Minimum notice" value={hours(p.minNoticeHours)} onClick={() => setSheet("notice")} />
              <SettingsRow icon={CalendarRange} title="How far ahead" value={windowLabel(p.windowDays).replace(" ahead", "")} onClick={() => setSheet("window")} />
              <SettingsRow icon={Timer} title="Buffer between sessions" subtitle="Set on each session type" onClick={() => navigate("/app/pro/calendar/availability")} />
              <SettingsRow icon={Users} title="Who can book" value={AUDIENCE[p.whoCanBook].title} onClick={() => setSheet("who")} />
            </SettingsSection>
            <SettingsSection label="Changes and cancellations">
              <SettingsRow icon={CalendarX} title="Free cancellation" value={p.freeCancelHours === 0 ? "Up to the start" : `${p.freeCancelHours} h before`} onClick={() => setSheet("notice")} />
              <SettingsRow
                icon={Banknote}
                title="Charge late cancellations"
                subtitle={charge(p.lateCancelPct)}
                toggle={{ checked: p.lateCancelPct > 0, onChange: (v) => void setCharge("lateCancelPct", v), disabled: !policy, label: "Charge late cancellations" }}
              />
              <SettingsRow
                icon={UserX}
                title="Charge no-shows"
                subtitle={charge(p.noShowPct)}
                toggle={{ checked: p.noShowPct > 0, onChange: (v) => void setCharge("noShowPct", v), disabled: !policy, label: "Charge no-shows" }}
              />
            </SettingsSection>
            <SettingsSection label="Reminders to clients">
              <SettingsRow icon={Bell} title="Before a session" value={remindersLabel(reminders.alert, reminders.alert2)} onClick={() => setSheet("reminders")} />
            </SettingsSection>
            <Note>These apply to every new session type. You can change them on a single session type in Calendar.</Note>
          </>
        )}
      </SettingsBody>
      {me && (
        <BookingSheet kind={sheet} me={me} policy={p} handle={handle} reminders={reminders} onClose={() => setSheet(null)} onSaved={() => void load()} onToast={setToast} />
      )}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default data requests (MO23 v3, dataRequests16): the nine categories in the
// frame's order; access_category values from Database DB-2.
// ---------------------------------------------------------------------------

const CATS: { key: AccessCategory; icon: LucideIcon; label: string }[] = [
  { key: "workout_activity", icon: Dumbbell, label: "Workout activity" },
  { key: "food_diary", icon: UtensilsCrossed, label: "Food diary" },
  { key: "weight", icon: Scale, label: "Weight" },
  { key: "body_measurements", icon: Ruler, label: "Body measurements" },
  { key: "health_metrics", icon: Activity, label: "Activity & vitals" },
  { key: "blood_pressure", icon: HeartPulse, label: "Blood pressure" },
  { key: "lab_results", icon: FlaskConical, label: "Lab results" },
  { key: "medical_history", icon: ClipboardList, label: "Medical history" },
  { key: "allergies_dietary", icon: Wheat, label: "Allergies and dietary needs" },
];

function DataRequests() {
  const { authUserId: me } = useApp();
  const [cats, setCats] = useState<AccessCategory[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const r = await fetchPracticeSettings(me);
    if (r.ok) {
      setCats(r.data.dataRequests);
      setState("ok");
    } else setState(r.offline ? "offline" : "error");
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  const flip = async (key: AccessCategory, on: boolean) => {
    if (!me || !cats) return;
    const prev = cats;
    // Keeps any category this screen doesn't draw (habits, progress, ...).
    const next = on ? [...cats.filter((c) => c !== key), key] : cats.filter((c) => c !== key);
    setCats(next);
    const r = await saveDataRequests(me, next);
    if (!r.ok) {
      setCats(prev);
      setToast(r.message);
    }
  };

  return (
    <div>
      <PageHeader title="Default data requests" showBack tightBack />
      <SettingsBody className="-mt-3">
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 8 }}>
          Asked of every new client when they hire you. Each client chooses what to share and can change it any time.
        </p>
        {state === "loading" ? (
          <ListSkeleton rows={5} />
        ) : !cats ? (
          state === "offline" ? <OfflineLine /> : <ProError onRetry={() => void load()} />
        ) : (
          <SettingsSection label="Ask new clients for">
            {CATS.map((c) => (
              <SettingsRow key={c.key} icon={c.icon} title={c.label} toggle={{ checked: cats.includes(c.key), onChange: (v) => void flip(c.key, v), label: c.label }} />
            ))}
          </SettingsSection>
        )}
        <Note>Asking only for what you use builds trust. Clients see why you ask for each one.</Note>
      </SettingsBody>
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice details: no frame opens this row; the row's own subtitle names the
// three fields (name on invoices, tax number, numbering). No invoices are
// issued in the app yet (payments are out of scope), so these are kept for
// when they are.
// ---------------------------------------------------------------------------

function InvoicePage() {
  const { authUserId: me } = useApp();
  const [draft, setDraft] = useState<InvoiceDetails | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const r = await fetchPracticeSettings(me);
    if (r.ok) {
      setDraft(r.data.invoice);
      setState("ok");
    } else setState(r.offline ? "offline" : "error");
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!me || !draft) return;
    setSaving(true);
    const r = await saveInvoiceDetails(me, draft);
    setSaving(false);
    setMsg(r.ok ? "Saved" : r.message);
  };

  const field = (key: keyof InvoiceDetails, label: string, placeholder: string, max: number) => (
    <label className="block" key={key}>
      <span className="block mb-1.5 text-charcoal-soft" style={{ fontSize: textPx(12), fontWeight: 600 }}>
        {label}
      </span>
      <input
        value={draft?.[key] ?? ""}
        maxLength={max}
        onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
        placeholder={placeholder}
        className="w-full min-h-[44px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );

  return (
    <div>
      <PageHeader title="Invoice details" showBack tightBack />
      {state === "loading" ? (
        <ListSkeleton rows={3} />
      ) : !draft ? (
        state === "offline" ? <OfflineLine /> : <ProError onRetry={() => void load()} />
      ) : (
        <div className="space-y-4">
          {field("name", "Name on invoices", "Your name or business name", 120)}
          {field("taxNumber", "Tax number", "Optional", 40)}
          {field("prefix", "Invoice numbering", "Prefix, for example INV-", 10)}
          <Note>Shown on invoices and receipts once payments in the app launch.</Note>
          {msg && (
            <p role="status" style={{ fontSize: textPx(12), fontWeight: 600, color: msg === "Saved" ? INK.good : INK.hi }}>
              {msg}
            </p>
          )}
          <Button fullWidth onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public listing: the switch from the old listing sheet, unchanged in
// behaviour (set_public_listing; ATX08 no profile, ATX47, ATX48 date of
// birth, ATXC6 verification). Database #38 retired the affiliation refusal
// (ATX03): every Team professional stays listed and keeps their own switch.
// The profile fields it used to carry are on Edit public profile (MO14); the
// map area is on Where you work.
// ---------------------------------------------------------------------------

function ListingPage() {
  const navigate = useNavigate();
  const { authUserId, user } = useApp();
  const regulated = isRegulated(proKindOf(user.professionalSubtype));
  const docWord = regulated ? "licence" : "certificate";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [check, setCheck] = useState<LicenceStatus | null>(null);
  const [needsDob, setNeedsDob] = useState(false);
  const [dobAsk, setDobAsk] = useState<null | { retry: () => void }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setLoadError(null);
    const result = await fetchMyProfile(authUserId);
    if (!result.ok) {
      setLoadError(result.message);
      setLoading(false);
      return;
    }
    setProfile(result.profile);
    const [goLive, dob] = await Promise.all([fetchGoLiveStatus(authUserId, regulated), listingNeedsDateOfBirth()]);
    setCheck(goLive.ok ? goLive.status : null);
    setNeedsDob(dob);
    setLoading(false);
  }, [authUserId, regulated]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await setPublicListing(next);
    setBusy(false);
    if (r.status === "ok") return setProfile((p) => (p ? { ...p, listedPublicly: r.listed } : p));
    if (r.status === "no_profile") return setError("Fill in your public profile first. There's nothing to list yet.");
    if (r.status === "needs_dob") return setDobAsk({ retry: () => void toggle(true) });
    if (r.status === "needs_verification") return setCheck((c) => (c?.kind === "verified" ? { kind: "none" } : c));
    setError(r.message);
  };

  const listed = profile?.listedPublicly ?? false;
  const verified = check?.kind === "verified";
  const waiting = !listed && !verified;
  const waitingLine =
    check?.kind === "pending"
      ? `We're checking your ${docWord}. You can be listed once it's verified.`
      : check?.kind === "rejected"
        ? `We couldn't verify your ${docWord}. Fix it in Edit public profile to be listed.`
        : `Add your ${docWord} in Edit public profile. You can be listed once we've checked it.`;

  return (
    <div>
      <PageHeader title="Public listing" showBack tightBack />
      <SettingsBody className="-mt-3">
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 8 }}>
          Clients browsing Explore can find you once you're listed. Your public profile is what they see.
        </p>
        {loading ? (
          <ListSkeleton rows={2} />
        ) : loadError ? (
          <ProError onRetry={() => void load()} message={loadError} />
        ) : (
          <SettingsSection label="Explore">
            <SettingsRow
              icon={Globe2}
              title="Show me in Explore"
              subtitle={
                profile
                  ? listed
                    ? "Clients browsing Explore can find you."
                    : waiting
                      ? waitingLine
                      : "You're not listed. Only clients with your code or invite link can connect."
                  : "Fill in your public profile first. There's nothing to list yet."
              }
              toggle={{ checked: listed, onChange: (v) => void toggle(v), disabled: !profile || busy || waiting, label: "Show me in Explore" }}
            />
            <SettingsRow icon={Globe2} title="Edit public profile" onClick={() => navigate("/app/more/edit-profile")} />
          </SettingsSection>
        )}
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
            {error}
          </p>
        )}
        <div className="mt-4">
          {dobAsk ? (
            <DobInline
              title="Add your date of birth"
              body={`${NEEDS_DOB} It's kept private: clients never see it.`}
              onSaved={() => {
                const retry = dobAsk.retry;
                setDobAsk(null);
                setNeedsDob(false);
                retry();
              }}
            />
          ) : (
            needsDob && (
              <DobInline
                title="Add your date of birth to stay fully listed"
                body="You're listed and you stay listed. Until you add your date of birth you can't add a map area, and if you turn your listing off you won't be able to turn it back on. It's kept private: clients never see it."
                onSaved={() => setNeedsDob(false)}
              />
            )
          )}
        </div>
      </SettingsBody>
    </div>
  );
}
